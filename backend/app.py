import asyncio
import hashlib
import io
import wave
import time
from contextlib import asynccontextmanager
from pathlib import Path
import httpx
from fastapi import FastAPI, Request, Response, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from .config import Settings, ROOT
from .models import SyncRequest, DialogueRequest, CompleteRequest, SpeechRequest, NarrationRequest, Envelope
from .providers.gemini import Gemini
from .providers.elevenlabs import ElevenLabs
from .dialogue import DialogueService
from .store import Store
from .narration import authored_lines
from .expedition import install_expedition

COOKIE='last_light_session'
MAX_BODY=400_000

def create_app(settings: Settings | None=None, *, store: Store | None=None, transport: httpx.AsyncBaseTransport | None=None):
    config=settings or Settings()
    repository=store or Store(config.database_path)
    @asynccontextmanager
    async def lifespan(app):
        async with httpx.AsyncClient(transport=transport) as client:
            app.state.dialogue=DialogueService(config,repository,Gemini(config,client))
            app.state.voice=ElevenLabs(config,client)
            app.state.voice_limit=asyncio.Semaphore(2)
            app.state.authored=authored_lines()
            yield
        if store is None: repository.close()
    app=FastAPI(title='KESTREL RECALL mission services',version='0.2.0',lifespan=lifespan)
    app.state.store=repository;app.state.settings=config

    @app.middleware('http')
    async def boundaries(request: Request, call_next):
        if request.url.path.startswith('/api/') and request.method not in ('GET','HEAD','OPTIONS'):
            origin=request.headers.get('origin')
            allowed=set(config.allowed_origins.split(','))
            if origin and origin not in allowed:return JSONResponse({'detail':'Unrecognized application origin'},status_code=403)
            try: length=int(request.headers.get('content-length','0'))
            except ValueError:return JSONResponse({'detail':'Invalid content length'},status_code=400)
            if length>MAX_BODY:return JSONResponse({'detail':'Request too large'},status_code=413)
            # Bound chunked as well as ordinary bodies before JSON or multipart parsing.
            chunks=[];size=0
            async for chunk in request.stream():
                size+=len(chunk)
                if size>MAX_BODY:return JSONResponse({'detail':'Request too large'},status_code=413)
                chunks.append(chunk)
            body=b''.join(chunks)
            delivered=False
            async def receive():
                nonlocal delivered
                if not delivered:delivered=True;return {'type':'http.request','body':body,'more_body':False}
                return {'type':'http.disconnect'}
            request._receive=receive
            request._body=body
        response=await call_next(request)
        response.headers['X-Content-Type-Options']='nosniff'
        response.headers['Referrer-Policy']='same-origin'
        if request.url.path.startswith('/api/'):response.headers['Cache-Control']='no-store'
        return response

    def session(request: Request) -> str:
        token=request.cookies.get(COOKIE)
        if not repository.exists(token):raise HTTPException(401,'Start a mission session first')
        return token

    @app.exception_handler(OverflowError)
    async def over_limit(_request,exc):return JSONResponse({'detail':str(exc)},status_code=429)

    @app.get('/api/health')
    async def health():
        return {'status':'ok','backend':'python-fastapi','dialogue':'live' if config.live_dialogue else 'offline',
          'geminiConfigured':config.live_dialogue,'model':config.gemini_model if config.live_dialogue else None,
          'speech':config.speech_available,'transcription':bool(config.elevenlabs_api_key),
          'memory':'sqlite','version':'0.2.0'}

    @app.get('/api/session')
    async def bootstrap(request: Request,response: Response):
        token,created=repository.session(request.cookies.get(COOKIE))
        response.set_cookie(COOKIE,token,max_age=30*86400,httponly=True,secure=config.secure_cookies,samesite='lax',path='/')
        return {'memory':repository.memory(token).model_dump(),'newSession':created}

    @app.post('/api/session/sync')
    async def sync(body: SyncRequest,request: Request):
        try:memory=repository.sync(session(request),body)
        except ValueError as exc:raise HTTPException(409,str(exc)) from None
        return {'memory':memory.model_dump(),'saved':True}

    @app.delete('/api/session/memory')
    async def clear(request: Request):repository.clear(session(request));return {'cleared':True}

    @app.post('/api/dialogue')
    async def dialogue(body: DialogueRequest,request: Request):
        return await request.app.state.dialogue.respond(session(request),body)

    @app.post('/api/dialogue/complete')
    async def complete(body: CompleteRequest,request: Request):
        return await request.app.state.dialogue.complete(session(request),body)

    @app.post('/api/narration')
    async def narration(body: NarrationRequest,request: Request):
        token=session(request)
        if not repository.active(token,body.envelope.runId,body.envelope.loopId):raise HTTPException(409,'Stale mission')
        if request.app.state.authored.get(body.text)!=body.speaker:raise HTTPException(422,'Only approved mission dialogue may be narrated')
        return {'speechId':repository.speech(token,body.envelope.runId,body.envelope.loopId,body.speaker,body.text)}

    @app.post('/api/speech')
    async def speech(body: SpeechRequest,request: Request):
        token=session(request)
        if not config.speech_available:raise HTTPException(503,'ElevenLabs voice is not configured. Subtitles remain available.')
        utterance=repository.get_speech(token,body.speechId)
        if not utterance:raise HTTPException(404,'Unknown or expired speech')
        if not repository.active(token,utterance['run'],utterance['loop']):raise HTTPException(409,'Stale speech')
        key=hashlib.sha256(f"{config.elevenlabs_tts_model}:{config.voice_for(utterance['speaker'])}:{utterance['text']}".encode()).hexdigest()
        audio=repository.cached_audio(key)
        cached=audio is not None
        if audio is None:
            repository.consume(token,config.requests_per_minute,config.session_provider_limit)
            try:
                async with request.app.state.voice_limit:
                    async with asyncio.timeout(12):audio=await request.app.state.voice.speech(utterance['text'],utterance['speaker'])
                repository.cache_audio(key,audio)
            except (TimeoutError,httpx.HTTPError,ValueError):raise HTTPException(502,'Voice unavailable. Continue with subtitles.') from None
        if not repository.active(token,utterance['run'],utterance['loop']):raise HTTPException(409,'Stale speech')
        return Response(audio,media_type='audio/mpeg',headers={'X-Speech-Cache':'hit' if cached else 'miss'})

    @app.post('/api/transcribe')
    async def transcribe(request: Request,file: UploadFile=File(...),durationSeconds:float=Form(...),envelope:str=Form(...)):
        token=session(request)
        try:recording_envelope=Envelope.model_validate_json(envelope)
        except ValueError:raise HTTPException(422,'Invalid recording envelope') from None
        if not repository.active(token,recording_envelope.runId,recording_envelope.loopId):raise HTTPException(409,'Stale recording')
        if not config.elevenlabs_api_key:raise HTTPException(503,'Transcription is not configured. Type your message instead.')
        if not 0.1<=durationSeconds<=10.5:raise HTTPException(422,'Recording must be ten seconds or shorter')
        mime=(file.content_type or '').split(';')[0]
        if mime!='audio/wav':raise HTTPException(415,'Send mono 16 kHz PCM WAV audio')
        audio=await file.read(1_000_001)
        await file.close()
        if len(audio)>1_000_000 or not audio:raise HTTPException(413,'Recording is empty or too large')
        try:
            with wave.open(io.BytesIO(audio),'rb') as wav:
                if wav.getnchannels()!=1 or wav.getsampwidth()!=2 or wav.getframerate()!=16000 or not 1600<=wav.getnframes()<=160000 or len(wav.readframes(wav.getnframes()))!=wav.getnframes()*2:
                    raise ValueError('Invalid recording duration or format')
        except (wave.Error,EOFError,ValueError):raise HTTPException(422,'Recording must be 0.1–10 seconds of mono 16 kHz PCM WAV') from None
        repository.consume(token,config.requests_per_minute,config.session_provider_limit)
        try:
            async with request.app.state.voice_limit:
                async with asyncio.timeout(12):text=await request.app.state.voice.transcribe(audio,mime)
        except (TimeoutError,httpx.HTTPError,ValueError):raise HTTPException(502,'Transcription failed. Type your message instead.') from None
        if not repository.active(token,recording_envelope.runId,recording_envelope.loopId):raise HTTPException(409,'Stale recording')
        return {'text':text,'provider':'elevenlabs','envelope':recording_envelope.model_dump()}

    install_expedition(app,repository,session,config)

    @app.get('/{path:path}')
    async def frontend(path: str):
        if path.startswith('api/'):raise HTTPException(404,'Unknown API route')
        directory=(ROOT/'dist').resolve()
        candidate=(directory/path).resolve()
        if not candidate.is_relative_to(directory):raise HTTPException(404)
        if candidate.is_file():return FileResponse(candidate)
        if path and Path(path).suffix:raise HTTPException(404)
        index=directory/'index.html'
        if not index.exists():raise HTTPException(503,'Build the browser app with npm run build first')
        return FileResponse(index)
    return app
