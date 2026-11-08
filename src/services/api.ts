import type {Capabilities,DialogueResponse,Envelope,Speaker} from './contracts';
import {payload} from './contracts';
import type {State,Memory} from '../game/state';
import type {Point} from '../game/world';
async function json<T>(path:string,body?:unknown,signal?:AbortSignal,method=body===undefined?'GET':'POST'):Promise<T>{
 const response=await fetch(path,{method,credentials:'same-origin',signal:signal??AbortSignal.timeout(7000),headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(typeof error.detail==='string'?error.detail:`Radio service returned ${response.status}`)}
 return response.json();
}
let sessionPromise:Promise<{memory:Memory}>|null=null;
export const api={
 health:(signal?:AbortSignal)=>json<Capabilities>('/api/health',undefined,signal),
 session:(_signal?:AbortSignal)=>sessionPromise??(sessionPromise=json<{memory:Memory}>('/api/session').catch(error=>{sessionPromise=null;throw error})),
 sync:(s:State,p:Point,signal?:AbortSignal)=>json<{memory:Memory;saved:boolean}>('/api/session/sync',payload(s,p),signal),
 dialogue:(s:State,p:Point,text:string,speaker:Speaker,e:Envelope,signal:AbortSignal,history:{role:'user'|'assistant';text:string}[]=[])=>json<DialogueResponse>('/api/dialogue',{...payload(s,p,e),text,speaker,history},signal),
 complete:(s:State,p:Point,e:Envelope,accepted:boolean,reason:string,signal:AbortSignal)=>json<DialogueResponse>('/api/dialogue/complete',{...payload(s,p,e),accepted,reason},signal),
 clear:()=>json('/api/session/memory',undefined,undefined,'DELETE').finally(()=>{sessionPromise=null}),
 narration:(e:Envelope,speaker:Speaker,text:string,signal:AbortSignal)=>json<{speechId:string}>('/api/narration',{envelope:e,speaker,text},signal),
 async speech(speechId:string,signal:AbortSignal){const response=await fetch('/api/speech',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({speechId}),signal});if(!response.ok)throw new Error('Voice unavailable; subtitles remain available.');return response.blob()},
 async transcribe(blob:Blob,durationSeconds:number,e:Envelope,signal:AbortSignal){const body=new FormData();body.append('file',blob,'radio.wav');body.append('durationSeconds',String(durationSeconds));body.append('envelope',JSON.stringify(e));const response=await fetch('/api/transcribe',{method:'POST',credentials:'same-origin',body,signal});if(!response.ok)throw new Error('Transcription unavailable. Type your message instead.');return response.json() as Promise<{text:string}>}
};
