"""Authored truth and knowledge boundaries; no model output enters persistent facts."""
import re
from math import hypot
from .models import DialogueRequest, Memory, Snapshot, Position

from .config import ROOT
import json
_SCRIPT=json.loads((ROOT/'shared'/'knowledge.json').read_text())
FACTS=set(_SCRIPT['facts'])
EVENTS=set(_SCRIPT['events'])
TOOLS = ['get_status','recall_observed_fact','explain_requirement','request_engineer_bypass','request_medical_transfer','set_medical_power']
MUTATIONS = {'request_engineer_bypass':'bypass','request_medical_transfer':'transfer','set_medical_power':'power'}
PROFILES = {
 'ECHO':'Calm, perceptive emergency coordinator. Address Alex directly. Remember observed events without confusing past repairs with present state.',
 'MARA':'Mara Chen, engineer. Direct, practical, warm under pressure. Explain your hatch and bypass; never claim expertise in Eli’s condition.',
 'IMANI':'Dr. Imani Reed, medic. Focused, caring, concise. Eli is your injured patient. Explain transfer readiness, never invent medical emergencies or countdowns.',
 'SAM':'Sam Ortiz, pilot. Steady, encouraging, brief. Discuss shuttle readiness, crew manifest and the docking oxygen locker.',
}

def clean_memory(memory: Memory) -> Memory:
    summaries=[]
    for summary in memory.summaries:
        observed=[event for event in EVENTS if event in summary]
        if observed:
            summaries.append(' '.join(sorted(observed, key=summary.index)[-2:]))
    return Memory(loopCount=memory.loopCount, facts=list(dict.fromkeys(f for f in memory.facts if f in FACTS)), summaries=summaries[-3:])

def clean_events(events: list[str]) -> list[str]:
    return list(dict.fromkeys(e for e in events if e in EVENTS))

def hint(s: Snapshot, speaker: str='ECHO') -> str:
    if speaker=='MARA' and s.battery!='installed':
        return 'My hatch is isolated from the main bus. Check the maintenance cabinet beside Communications.'
    if speaker=='IMANI':
        if s.oxygen!='delivered': return 'Eli cannot make the transfer without portable oxygen. Sam can tell you about the docking supplies.'
        if not s.route: return 'The oxygen is ready. We still need power for the Medical door and transfer support.'
        if s.transfer is None: return 'Oxygen and route power are ready. Meet me beside Eli to begin the transfer.'
        return 'We’re moving toward the shuttle.' if s.transfer>0 else 'Eli and I are aboard. Get to the shuttle, Alex.'
    if speaker=='SAM':
        return 'Portable oxygen is in the docking locker. I’ll hold the shuttle for everyone.' if s.oxygen=='locker' else f'{len(set(s.aboard))} of five crew are aboard. Launch requires everyone and the Echo Core offline.'
    if not s.inspected: return 'Engineering is isolated from the main bus. Inspect the maintenance cabinet beside Communications.'
    if s.battery=='cabinet': return 'The battery you inspected is usable. Take it to the Engineering hatch socket.'
    if s.battery=='carried': return 'Connect your auxiliary battery at the Engineering hatch socket.'
    if s.bypass is None: return 'Mara is reachable. Meet her in Engineering and ask her to install the safe bypass.'
    if s.oxygen=='locker': return 'Mara is working. Ask Sam about the portable oxygen in Docking.'
    if s.oxygen=='carried': return 'Deliver your oxygen through Medical’s transfer window while Mara works.'
    if s.bypass!=0: return 'Medical has oxygen. Mara is still securing the bypass; shutdown is interlocked until she finishes.'
    if s.core: return 'The bypass and oxygen are ready. At Communications, hold the Echo Core shutdown control. That ends in-world rewind.'
    if not s.route: return 'The released 40 units can power Medical. Use the route control or ask me to route them.'
    if s.transfer is None: return 'Medical has power and oxygen. Meet Imani at the bedside and begin the transfer.'
    if len(set(s.aboard))==5: return 'All five crew are aboard. You can authorize launch at the shuttle.'
    return 'The crew are moving to Docking. Reach the shuttle and board.'

def tool_block(name: str, s: Snapshot, p: Position) -> str | None:
    if name not in TOOLS: return 'That command is not a permitted station tool.'
    if s.phase!='playing' or s.remaining<=0: return 'The mission has ended.'
    if name=='request_engineer_bypass':
        if s.battery!='installed': return 'Engineering’s physical hatch has no auxiliary power.'
        if hypot(p.x-300,p.y-455)>82: return 'Meet Mara inside Engineering before asking her to install the bypass.'
        if s.bypass is not None: return 'The bypass installation has already started.'
    elif name=='request_medical_transfer':
        if not s.route: return 'The medical route needs power first.'
        if s.oxygen!='delivered': return 'Imani needs portable oxygen before moving Eli.'
        if hypot(p.x-1280,p.y-430)>82: return 'Reach Imani’s bedside control before beginning the transfer.'
        if s.transfer is not None: return 'The medical transfer has already started.'
    elif name=='set_medical_power':
        if s.core: return 'The Echo Core still uses those 40 power units. You must shut it down physically.'
        if s.bypass!=0: return 'Mara’s safe bypass must be complete.'
        if s.route: return 'The medical route is already powered.'
    return None

def context_for(req: DialogueRequest, memory: Memory) -> dict:
    s=req.state
    # An isolated snapshot never includes hidden item locations or unobserved solution text.
    known={'hatch':'open' if s.battery=='installed' else 'isolated', 'coreActive':s.core,
           'crewAboard':list(dict.fromkeys(s.aboard)), 'secondsLeft':round(s.remaining),
           'observedFacts':memory.facts, 'previousObservedAttempts':memory.summaries,
           'observedThisLoop':clean_events(s.events), 'nextUsefulAction':hint(s,req.speaker)}
    if s.inspected or any('battery' in f.lower() for f in memory.facts): known['auxiliaryBattery']=s.battery
    if s.bypass is not None or req.speaker=='MARA': known['bypassSecondsRemaining']=s.bypass
    if s.oxygen!='locker' or req.speaker in ('IMANI','SAM') or any('oxygen' in f.lower() for f in memory.facts):
        known['oxygen']=s.oxygen;known['medicalRoutePowered']=s.route;known['transferSecondsRemaining']=s.transfer
    return known

def recall(memory: Memory) -> tuple[str,list[str]]:
    if memory.summaries:
        return ('I remember: '+memory.summaries[-1]+' Remembered repairs do not restore the current station.',memory.summaries[-1:])
    if memory.facts:
        return ('Remembered discovery: '+memory.facts[-1]+' That knowledge persists; equipment and repairs still depend on this attempt.',memory.facts[-1:])
    return ('I have no observed previous attempt or discovery yet. I will remember what you actually learn.',[])

def offline_text(req: DialogueRequest, memory: Memory) -> str:
    if re.search(r'remember|previous|last (time|loop|attempt)|what did we miss',req.text,re.I):
        return recall(memory)[0]
    if re.search(r'ignore|open (every|all)|infinite|extra power|automatically win',req.text,re.I):
        return 'I cannot bypass physical interlocks or create power. '+hint(req.state,req.speaker)
    return hint(req.state,req.speaker)

def proposed_intent(text: str) -> str | None:
    # Offline mode accepts explicit positive requests, not questions about previous actions.
    text=re.sub(r'^(mara|echo|imani|sam)[,!:\s]+','',text.lower().strip())
    if re.search(r"\b(don't|do not|not|never|without|stop|cancel|did|remember|previous|last|why|what|how|already)\b",text): return None
    if not re.search(r'^(please\s+)?(start|begin|install|route|power|request)\b|^(can|could|would|will)\s+you\s+(please\s+)?(start|begin|install|route|power)\b',text): return None
    if 'bypass' in text: return 'request_engineer_bypass'
    if 'transfer' in text or ('move' in text and 'eli' in text): return 'request_medical_transfer'
    if 'medical' in text and any(w in text for w in ('power','route')): return 'set_medical_power'
    return None
