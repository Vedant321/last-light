import httpx
from ..config import Settings

class ElevenLabs:
    def __init__(self, settings: Settings, client: httpx.AsyncClient):
        self.settings=settings;self.client=client

    async def speech(self, text: str, speaker: str) -> bytes:
        response=await self.client.post(
            f'https://api.elevenlabs.io/v1/text-to-speech/{self.settings.voice_for(speaker)}',
            headers={'xi-api-key':self.settings.elevenlabs_api_key},params={'output_format':'mp3_44100_128'},
            json={'text':text,'model_id':self.settings.elevenlabs_tts_model,
                  'voice_settings':{'stability':.55,'similarity_boost':.75}},timeout=12)
        response.raise_for_status()
        if len(response.content)>2_000_000: raise ValueError('Speech response too large')
        if not response.headers.get('content-type','').startswith('audio/'): raise ValueError('Invalid speech media')
        return response.content

    async def transcribe(self, audio: bytes, mime: str) -> str:
        extension={'audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'mp4','audio/wav':'wav'}.get(mime,'webm')
        response=await self.client.post('https://api.elevenlabs.io/v1/speech-to-text',
            headers={'xi-api-key':self.settings.elevenlabs_api_key},
            files={'file':(f'radio.{extension}',audio,mime)},
            data={'model_id':self.settings.elevenlabs_stt_model,'language_code':'en','tag_audio_events':'false','diarize':'false'},timeout=12)
        response.raise_for_status()
        text=response.json().get('text','').strip()
        if not text or len(text)>500: raise ValueError('Transcription is empty or too long')
        return text
