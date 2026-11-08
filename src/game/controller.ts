import {reduce,type State,type Command,type Memory} from './state';
import {applyProposal,type Proposal,type Envelope,validMemory} from '../services/contracts';
import type {Point} from './world';
export type MissionCommand=Command|{type:'apply_tool';proposal:Proposal;position:Point;envelope:Envelope}|{type:'hydrate_memory';memory:Memory};
export function missionReducer(s:State,c:MissionCommand):State{
 if(c.type==='apply_tool')return applyProposal(s,c.proposal,c.position,c.envelope).state;
 if(c.type==='hydrate_memory'){
  if(s.mode!=='normal'||!validMemory(c.memory))return s;
  return {...s,memory:{schemaVersion:1,loopCount:Math.max(s.memory.loopCount,c.memory.loopCount),facts:[...new Set([...s.memory.facts,...c.memory.facts])],summaries:[...new Set([...s.memory.summaries,...c.memory.summaries])].slice(-3)}};
 }
 return reduce(s,c);
}
