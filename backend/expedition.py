"""Campaign checkpoints and grounded, read-only expedition guidance.

This is persistence for a client-run game, not independent hardware verification.
"""
import asyncio
import json
import time
from typing import Literal
import httpx
from fastapi import HTTPException, Request
from pydantic import Field, model_validator
from .models import StrictModel

Chapter=Literal['earth','launch','iss','kestrel','transit','lunar','ending']
CREW={'player','engineer','medic','patient','pilot'}

class SurveyResult(StrictModel):
    condition: Literal['LAG_ONLY','PREDICTION']
    outcome: Literal['SUCCESS','TIMEOUT','INVALID']
    timeMs: float | None = Field(default=None,ge=0,le=60000)
    overshoots: int = Field(ge=0,le=10000)
    reversals: int = Field(ge=0,le=10000)
    targets: list[float] = Field(min_length=2,max_length=2)
    perTargetMs: list[float] = Field(max_length=2)

    @model_validator(mode='after')
    def coherent(self):
        if self.targets not in ([-20,20],[20,-20]):raise ValueError('Use the two lunar beacon bearings')
        if any(not 0<=x<=60000 for x in self.perTargetMs):raise ValueError('Invalid acquisition duration')
        if self.outcome=='SUCCESS' and (self.timeMs is None or self.timeMs<2000 or len(self.perTargetMs)!=2):raise ValueError('Success requires two timed acquisitions')
        if self.outcome!='SUCCESS' and self.timeMs is not None:raise ValueError('Unsuccessful passes have no success time')
        return self

class Expedition(StrictModel):
    schemaVersion: Literal[1]=1
    id: str = Field(min_length=1,max_length=80,pattern=r'^[a-zA-Z0-9_-]+$')
    revision: int = Field(ge=0,le=1000000)
    chapter: Chapter
    checks: list[Literal['power','oxygen','rover']] = Field(max_length=3)
    crew: list[Literal['player','engineer','medic','patient','pilot']] = Field(max_length=5)
    loops: int = Field(ge=0,le=100000)
    participant: int = Field(ge=1,le=100000)
    results: list[SurveyResult] = Field(max_length=12)

    @model_validator(mode='after')
    def coherent(self):
        if len(set(self.checks))!=len(self.checks) or len(set(self.crew))!=len(self.crew):raise ValueError('Duplicate preparation or crew')
        if self.chapter in ('kestrel','transit','lunar','ending') and len(self.checks)!=3:raise ValueError('Complete ISS preparation first')
        if self.chapter in ('transit','lunar','ending') and (set(self.crew)!=CREW or self.loops<1):raise ValueError('Recover all crew before exploration')
        if self.results and self.chapter not in ('lunar','ending'):raise ValueError('Survey belongs to the lunar chapter')
        expected=[-20,20] if self.participant%2 else [20,-20]
        if any(r.targets!=expected for r in self.results):raise ValueError('Keep the paired target sequence fixed')
        if self.chapter=='ending' and not all(any(r.condition==c and r.outcome=='SUCCESS' for r in self.results) for c in ('LAG_ONLY','PREDICTION')):raise ValueError('Confirm both survey passes before ending')
        return self

class AdviceRequest(StrictModel):
    message: str = Field(min_length=1,max_length=500)
    chapter: Chapter
    telemetry: str = Field(default='',max_length=600)

GUIDANCE={
 'earth':'We leave Earth as a team of five, with Scout as our remote camera companion. Start the launch when you are ready.',
 'launch':'Sam has the ascent. Next we dock at the ISS to check power, life support, and Scout before transferring to Kestrel.',
 'iss':'Walk to each highlighted preparation station and confirm its check. Flight power, oxygen, and Scout must all be ready before we leave.',
 'kestrel':'The debris strike has isolated the crew. Use the station radio for current rescue telemetry and guarded repair commands; expedition guidance cannot operate station controls.',
 'transit':'All five crew escaped Kestrel. After recovery and resupply, deploy Scout on the Moon to acquire the two research beacons.',
 'lunar':'Centre the requested beacon with the camera slider and hold within two degrees for one second. Both commands and confirmations arrive late. Prediction estimates motion; it does not supply unseen images or remove transmission delay.',
 'ending':'The crew is safe and both lunar survey passes are confirmed. Review your measured comparison or begin another expedition; Mars is a future chapter.',
}

def install_expedition(app,repository,session,config):
    @app.get('/api/expedition')
    async def checkpoint(request: Request):
        return {'expedition':repository.expedition(session(request))}

    @app.post('/api/expedition')
    async def save(body: Expedition,request: Request):
        try:repository.save_expedition(session(request),body.model_dump())
        except ValueError as exc:raise HTTPException(409,str(exc)) from None
        return {'saved':True,'revision':body.revision,'storage':'sqlite'}

    @app.post('/api/expedition/advice')
    async def advice(body: AdviceRequest,request: Request):
        token=session(request)
        checkpoint=repository.expedition(token)
        chapter=checkpoint['chapter'] if checkpoint else 'earth'
        if chapter!=body.chapter:raise HTTPException(409,'Save the current checkpoint before requesting guidance')
        fallback=GUIDANCE[chapter]
        if not config.live_dialogue:return {'text':fallback,'mode':'offline','latencyMs':0}
        repository.consume(token,config.requests_per_minute,config.session_provider_limit)
        service=request.app.state.dialogue
        context={'checkpoint':checkpoint or {'chapter':'earth'},'operatorReportedTelemetry':body.telemetry,
          'missionGuidance':fallback,'physicalHardware':'not integrated; SIM only','transmissionDelayMs':{'uplink':1300,'downlink':1300},
          'limits':'No hardware control or station mutations. No claimed discovery beyond returned checkpoint results. No claim that prediction eliminates transmission delay.'}
        start=time.monotonic()
        try:
            async with asyncio.timeout(config.provider_timeout_seconds+1):
                async with service.provider_limit:
                    text=await service.gemini.expedition(body.message,context)
            return {'text':text,'mode':'live','latencyMs':round((time.monotonic()-start)*1000)}
        except (TimeoutError,httpx.HTTPError,ValueError,KeyError,TypeError,IndexError,AttributeError):
            return {'text':fallback,'mode':'fallback','latencyMs':round((time.monotonic()-start)*1000)}
