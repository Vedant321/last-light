import {block,reduce,type State,type Action,type Memory} from '../game/state';
import type {Point} from '../game/world';
export type Speaker='ECHO'|'MARA'|'IMANI'|'SAM';
export type Envelope={runId:string;loopId:string;requestId:string;revision:number};
export type Proposal={name:'request_engineer_bypass'|'request_medical_transfer'|'set_medical_power';action:'bypass'|'transfer'|'power'};
export type DialogueResponse={envelope:Envelope;speaker:Speaker;text:string;mode:'live'|'offline'|'fallback';reason:string|null;proposal:Proposal|null;evidence:string[];speechId:string|null;latencyMs:number};
export type Capabilities={status:string;backend:string;dialogue:'live'|'offline';geminiConfigured:boolean;model:string|null;speech:boolean;transcription:boolean;memory:string};
export const unavailable:Capabilities={status:'unavailable',backend:'unavailable',dialogue:'offline',geminiConfigured:false,model:null,speech:false,transcription:false,memory:'local'};
export function envelope(s:State,requestId=crypto.randomUUID()):Envelope{return {runId:s.runId,loopId:s.loopId,revision:s.revision,requestId}}
export function snapshot(s:State){const {mode,phase,remaining,place,core,inspected,battery,oxygen,bypass,engineerTravel,route,transfer,aboard,events}=s;return {mode,phase,remaining,place,core,inspected,battery,oxygen,bypass,engineerTravel,route,transfer,aboard,events}}
export function payload(s:State,p:Point,e=envelope(s)){return {envelope:e,state:snapshot(s),memory:s.memory,position:p}}
export function sameAttempt(s:State,e:Envelope){return s.runId===e.runId&&s.loopId===e.loopId&&e.revision<=s.revision}
const mutations={request_engineer_bypass:'bypass',request_medical_transfer:'transfer',set_medical_power:'power'} as const;
export function validateProposal(s:State,proposal:Proposal,p:Point):string|null{
 if(mutations[proposal.name]!==proposal.action)return 'Unsupported station tool.';
 if(s.phase!=='playing'||s.remaining<=0)return 'The mission has ended.';
 if(proposal.action==='bypass'&&Math.hypot(p.x-300,p.y-455)>82)return 'Meet Mara inside Engineering first.';
 if(proposal.action==='transfer'&&Math.hypot(p.x-1280,p.y-430)>82)return 'Reach Imani’s bedside control first.';
 return block(proposal.action==='power'?{...s,place:'medical'}:s,proposal.action);
}
export function applyProposal(s:State,proposal:Proposal,p:Point,e:Envelope):{state:State;accepted:boolean;reason:string}{
 if(!sameAttempt(s,e))return {state:s,accepted:false,reason:'This response belongs to a previous mission or loop.'};
 if(s.processed.includes(e.requestId))return {state:s,accepted:false,reason:'This command has already been handled.'};
 const rejection=validateProposal(s,proposal,p);
 if(rejection)return {state:s,accepted:false,reason:rejection};
 const input=proposal.action==='power'?{...s,place:'medical' as const}:s;
 const result=reduce(input,{type:'act',action:proposal.action,id:e.requestId,runId:e.runId,loopId:e.loopId});
 return {state:{...result,place:s.place},accepted:true,reason:'Validated against current mission state.'};
}
export function validMemory(value:unknown):value is Memory{if(!value||typeof value!=='object')return false;const m=value as Memory;return m.schemaVersion===1&&Number.isInteger(m.loopCount)&&m.loopCount>0&&Array.isArray(m.facts)&&m.facts.length<=30&&m.facts.every(x=>typeof x==='string')&&Array.isArray(m.summaries)&&m.summaries.length<=3&&m.summaries.every(x=>typeof x==='string')}
