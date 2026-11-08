from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Speaker = Literal['ECHO', 'MARA', 'IMANI', 'SAM']
ToolName = Literal['get_status', 'recall_observed_fact', 'explain_requirement', 'request_engineer_bypass', 'request_medical_transfer', 'set_medical_power']

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)

class Envelope(StrictModel):
    runId: str = Field(min_length=1, max_length=80, pattern=r'^[a-zA-Z0-9_-]+$')
    loopId: str = Field(min_length=1, max_length=80, pattern=r'^[a-zA-Z0-9_-]+$')
    requestId: str = Field(min_length=1, max_length=80, pattern=r'^[a-zA-Z0-9_-]+$')
    revision: int = Field(ge=0, le=100_000_000)

class Position(StrictModel):
    x: float = Field(ge=0, le=1600)
    y: float = Field(ge=0, le=1200)

class Snapshot(BaseModel):
    model_config = ConfigDict(extra='ignore', allow_inf_nan=False)
    mode: Literal['normal','demo'] = 'normal'
    phase: Literal['playing','won','failed'] = 'playing'
    remaining: float = Field(ge=0, le=480)
    place: Literal['hub','engineering','medical','docking']
    core: bool
    inspected: bool
    battery: Literal['cabinet','carried','installed']
    oxygen: Literal['locker','carried','delivered']
    bypass: float | None = Field(default=None, ge=0, le=25)
    engineerTravel: float | None = Field(default=None, ge=0, le=10)
    route: bool
    transfer: float | None = Field(default=None, ge=0, le=20)
    aboard: list[Literal['player','engineer','medic','patient','pilot']] = Field(max_length=5)
    events: list[str] = Field(default_factory=list, max_length=30)

class Memory(StrictModel):
    schemaVersion: Literal[1] = 1
    loopCount: int = Field(default=1, ge=1, le=100_000)
    facts: list[str] = Field(default_factory=list, max_length=30)
    summaries: list[str] = Field(default_factory=list, max_length=3)

class SyncRequest(StrictModel):
    envelope: Envelope
    state: Snapshot
    memory: Memory
    position: Position

class Turn(StrictModel):
    role: Literal['user','assistant']
    text: str = Field(min_length=1,max_length=600)

class DialogueRequest(SyncRequest):
    text: str = Field(min_length=1, max_length=500)
    speaker: Speaker = 'ECHO'
    history: list[Turn] = Field(default_factory=list,max_length=6)

class Proposal(StrictModel):
    name: ToolName
    action: Literal['bypass','transfer','power']

class DialogueResponse(StrictModel):
    envelope: Envelope
    speaker: Speaker
    text: str
    mode: Literal['live','offline','fallback']
    reason: str | None = None
    proposal: Proposal | None = None
    evidence: list[str] = Field(default_factory=list)
    speechId: str | None = None
    latencyMs: int = 0

class CompleteRequest(SyncRequest):
    accepted: bool
    reason: str = Field(max_length=240)

class SpeechRequest(StrictModel):
    speechId: str = Field(max_length=80)

class NarrationRequest(StrictModel):
    envelope: Envelope
    speaker: Speaker
    text: str = Field(min_length=1, max_length=600)
