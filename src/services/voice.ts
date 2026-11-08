import {api} from './api';
import {radio,type RadioSpeaker} from '../audio/radio';
/** All narration shares the same queued radio, including browser voices without an account. */
export class VoiceChannel {
 private readonly scope=crypto.randomUUID();private unsubscribe:(()=>void)|null=null;
 cancel(){this.unsubscribe?.();this.unsubscribe=null;radio.cancelScope(this.scope);}
 async play(speechId:string|null,volume:number,onState:(state:'loading'|'speaking'|'idle'|'unavailable')=>void,text='',speaker:RadioSpeaker='ECHO',providerAvailable=true){
  this.unsubscribe?.();this.unsubscribe=radio.subscribe(()=>{const state=radio.getSnapshot();onState(state.scope!==this.scope||state.phase==='idle'||state.phase==='gap'?'idle':state.phase==='speaking'?'speaking':'loading');});
  radio.enqueue({scope:this.scope,speaker,text,volume,replacePending:true,clip:speechId&&providerAvailable?signal=>api.speech(speechId,signal):undefined});
 }
}
/** Decode a browser recording and bound it to 10 s of mono 16 kHz PCM WAV. */
export async function recordingToWav(blob:Blob):Promise<Blob>{
 const ctx=new AudioContext();try{const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());const frames=Math.min(Math.floor(decoded.duration*16000),160000);if(frames<1600)throw new Error('Hold the radio a little longer.');const offline=new OfflineAudioContext(1,frames,16000);const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const rendered=await offline.startRendering();const samples=rendered.getChannelData(0);const data=new ArrayBuffer(44+frames*2),view=new DataView(data);const text=(offset:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i))};text(0,'RIFF');view.setUint32(4,36+frames*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*2,true);for(let i=0;i<frames;i++)view.setInt16(44+i*2,Math.max(-1,Math.min(1,samples[i]))*32767,true);return new Blob([data],{type:'audio/wav'})}finally{await ctx.close()}
}
