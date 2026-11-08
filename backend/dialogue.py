import asyncio
import re
import time
import httpx
from fastapi import HTTPException
from .config import Settings
from .knowledge import MUTATIONS, clean_memory, context_for, hint, offline_text, proposed_intent, tool_block, recall
from .models import DialogueRequest, DialogueResponse, Proposal, CompleteRequest
from .providers.gemini import Gemini
from .store import Store

RESULTS={
 'bypass':'Mara’s bypass installation has started. The repair will take a little time; you can prepare oxygen while she works.',
 'transfer':'Imani and Eli have begun the transfer toward the shuttle. Wait for their boarding confirmation before launch.',
 'power':'Medical route lighting and transfer support now receive the released 40 units. The door is open.',
}

class DialogueService:
    def __init__(self, settings: Settings, store: Store, gemini: Gemini):
        self.settings=settings;self.store=store;self.gemini=gemini
        self.locks: dict[str, asyncio.Lock]={}
        self.provider_limit=asyncio.Semaphore(4)

    def _lock(self, session: str):
        if len(self.locks)>1000:
            self.locks={k:v for k,v in self.locks.items() if v.locked()}
        return self.locks.setdefault(session,asyncio.Lock())

    def _response(self, session, req, text, mode, *, reason=None, proposal=None, evidence=None, latency=0):
        return DialogueResponse(envelope=req.envelope,speaker=req.speaker,text=text,mode=mode,reason=reason,
            proposal=proposal,evidence=evidence or [],latencyMs=latency,
            speechId=None if proposal else self.store.speech(session,req.envelope.runId,req.envelope.loopId,req.speaker,text))

    async def respond(self, session: str, req: DialogueRequest) -> DialogueResponse:
        fingerprint=self.store.fingerprint(req.model_dump())
        async with self._lock(session):
            previous=self.store.request(session,req.envelope.requestId)
            if previous:
                if previous['fingerprint']!=fingerprint: raise HTTPException(409,'Request ID was already used with different content')
                return DialogueResponse.model_validate_json(previous['response'])
            try: memory=self.store.sync(session,req)
            except ValueError as exc: raise HTTPException(409,str(exc)) from None
            self.store.consume(session,self.settings.requests_per_minute,self.settings.session_provider_limit)
            started=time.monotonic();mode='offline';reason=None;tool=None;text=''
            if self.settings.live_dialogue:
                try:
                    async with asyncio.timeout(self.settings.provider_timeout_seconds):
                        async with self.provider_limit:
                            text,tool=await self.gemini.respond(req.text,req.speaker,context_for(req,memory),history=[turn.model_dump() for turn in req.history])
                    mode='live'
                except (TimeoutError,httpx.HTTPError,ValueError,KeyError,TypeError):
                    mode='fallback';reason='Gemini is unavailable or timed out. Authored mission guidance is active.'
            elif self.settings.dialogue_mode=='live':
                reason='Gemini credentials/model are not configured; offline guidance is active.'
            if not self.store.active(session,req.envelope.runId,req.envelope.loopId):
                raise HTTPException(409,'This response belongs to a previous attempt')
            if mode!='live': tool=proposed_intent(req.text)
            proposal=None;evidence=[]
            if tool:
                if tool in MUTATIONS:
                    permitted={'ECHO':set(MUTATIONS),'MARA':{'request_engineer_bypass'},'IMANI':{'request_medical_transfer'},'SAM':set()}
                    rejection=tool_block(tool,req.state,req.position)
                    if tool not in permitted[req.speaker]: rejection='Ask ECHO to coordinate that station system, or contact its responsible crewmate.'
                    if rejection: text=rejection;evidence=[f'{tool}: rejected — {rejection}']
                    else:
                        proposal=Proposal(name=tool,action=MUTATIONS[tool])
                        text='Checking the current physical interlocks before carrying out that request.'
                        evidence=[f'{tool}: awaiting game validation']
                elif tool=='recall_observed_fact':
                    text,evidence=recall(memory)
                elif tool=='get_status':
                    s=req.state
                    text=f'{len(set(s.aboard))} of five crew are aboard. Echo Core is {"active" if s.core else "offline; rewind is disabled"}. '+hint(s,req.speaker)
                    evidence=['Current validated mission snapshot']
                else: text=hint(req.state,req.speaker);evidence=['Current prerequisite checks']
            if not text: text=offline_text(req,memory)
            # Reject common false completion claims instead of passing unsupported model prose on to the player.
            if not proposal and mode=='live' and not tool:
                checks=[(r'(bypass|repair) (is |has been )?(complete|finished|ready)',req.state.bypass==0),
                        (r'(everyone|all (five|crew)) (is |are )?(aboard|rescued|saved)',len(set(req.state.aboard))==5),
                        (r'medical (route |door )?(is )?(powered|open)',req.state.route)]
                if any(re.search(pattern,text,re.I) and not allowed for pattern,allowed in checks) and not re.search(r'remember|previous|last attempt',text,re.I):
                    text=hint(req.state,req.speaker);reason='Unsupported completion claim replaced with verified guidance.'
            text=' '.join(text.split())[:600]
            result=self._response(session,req,text,mode,reason=reason,proposal=proposal,evidence=evidence,
                                  latency=round((time.monotonic()-started)*1000))
            pending={'action':proposal.action} if proposal else None
            self.store.put_request(session,req.envelope.requestId,fingerprint,result.model_dump(),pending)
            return result

    async def complete(self, session: str, ack: CompleteRequest) -> DialogueResponse:
        async with self._lock(session):
            cached=self.store.request(session,ack.envelope.requestId)
            if not cached: raise HTTPException(404,'Unknown proposed action')
            result=DialogueResponse.model_validate_json(cached['response'])
            if result.envelope.runId!=ack.envelope.runId or result.envelope.loopId!=ack.envelope.loopId:
                raise HTTPException(409,'Action belongs to a previous attempt')
            if not self.store.active(session,ack.envelope.runId,ack.envelope.loopId): raise HTTPException(409,'Stale attempt')
            if not cached['pending']: return result
            proposal=result.proposal
            if not proposal: raise HTTPException(409,'No action is pending')
            # Even a client acknowledgement must agree with the resulting game state.
            completed={'bypass':ack.state.bypass is not None,'transfer':ack.state.transfer is not None,'power':ack.state.route}[proposal.action]
            accepted=ack.accepted and completed
            try: self.store.sync(session,ack)
            except ValueError as exc: raise HTTPException(409,str(exc)) from None
            confirmed=RESULTS[proposal.action]
            if result.speaker=='MARA' and proposal.action=='bypass':confirmed='I’ve started the bypass. Get oxygen to Imani while I work.'
            if result.speaker=='IMANI' and proposal.action=='transfer':confirmed='We’re moving Eli toward the shuttle. Meet us at Docking, Alex.'
            result.text=confirmed if accepted else 'The game rejected that command. '+ack.reason
            result.evidence=[f'{proposal.name}: {"accepted" if accepted else "rejected"} by the game validator']
            result.proposal=None
            result.speechId=self.store.speech(session,ack.envelope.runId,ack.envelope.loopId,result.speaker,result.text)
            self.store.put_request(session,ack.envelope.requestId,cached['fingerprint'],result.model_dump())
            return result
