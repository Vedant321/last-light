import {useCallback,useEffect,useRef,useState,type Dispatch,type RefObject} from 'react';
import {flushSync} from 'react-dom';
import {reply,type State} from '../game/state';
import type {MissionCommand} from '../game/controller';
import type {Point} from '../game/world';
import {api} from '../services/api';
import {envelope,sameAttempt,applyProposal,unavailable,validMemory,type Speaker,type Capabilities,type DialogueResponse} from '../services/contracts';
import {VoiceChannel,recordingToWav} from '../services/voice';
import {stationAudio} from '../audio/stationAudio';

type Line={speaker:Speaker;text:string;mode:'live'|'offline'|'fallback';reason?:string|null;evidence:string[];latencyMs:number};
export function useMissionComms(s:State,dispatch:Dispatch<MissionCommand>,position:RefObject<Point>,playing:boolean,muted:boolean,voiceEnabled:boolean,voiceVolume:number,menuPaused:boolean){
 const state=useRef(s);state.current=s;
 const [capabilities,setCapabilities]=useState<Capabilities>(unavailable);
 const [ready,setReady]=useState(false);
 const [processing,setProcessing]=useState(false);
 const [recording,setRecording]=useState(false);
 const [microphonePending,setMicrophonePending]=useState(false);
 const [recordedSeconds,setRecordedSeconds]=useState(0);
 const [voiceState,setVoiceState]=useState<'idle'|'loading'|'speaking'|'unavailable'>('idle');
 const [error,setError]=useState('');
 const [line,setLine]=useState<Line|null>(null);const [lastReply,setLastReply]=useState<Line|null>(null);const history=useRef<Partial<Record<Speaker,{role:'user'|'assistant';text:string}[]>>>({});
 const [speaker,setSpeaker]=useState<Speaker>('ECHO');
 const [lastTranscript,setLastTranscript]=useState('');
 const [saved,setSaved]=useState(false);
 const controller=useRef<AbortController|null>(null);
 const syncController=useRef<AbortController|null>(null);
 const voice=useRef(new VoiceChannel());
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const recordTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const clockTimer=useRef<ReturnType<typeof setInterval>|null>(null);
 const generation=useRef(0);const submitting=useRef(false);const alive=useRef(true);
 const lastNarrated=useRef('');const narration=useRef<AbortController|null>(null);
 const liveSettings=useRef({muted,voiceEnabled,voiceVolume,menuPaused,speechAvailable:capabilities.speech});liveSettings.current={muted,voiceEnabled,voiceVolume,menuPaused,speechAvailable:capabilities.speech};
 const stopTracks=useCallback(()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(recordTimer.current)clearTimeout(recordTimer.current);if(clockTimer.current)clearInterval(clockTimer.current)},[]);
 const cancel=useCallback(()=>{generation.current++;controller.current?.abort();controller.current=null;syncController.current?.abort();narration.current?.abort();voice.current.cancel();if(recorder.current){recorder.current.onstop=null;if(recorder.current.state!=='inactive')recorder.current.stop();recorder.current=null}stopTracks();submitting.current=false;setProcessing(false);setRecording(false);setMicrophonePending(false);setVoiceState('idle')},[stopTracks]);
 const refresh=useCallback(async()=>{
  try{const [health,session]=await Promise.all([api.health(),api.session()]);if(!alive.current)return;setCapabilities(health);setReady(true);if(validMemory(session.memory))dispatch({type:'hydrate_memory',memory:session.memory});setError('')}
  catch{if(alive.current){setCapabilities(unavailable);setReady(false);setError('Radio server unavailable. Local authored guidance and mission controls still work.')}}
 },[dispatch]);
 useEffect(()=>{alive.current=true;void refresh();return()=>{alive.current=false;generation.current++;controller.current?.abort();syncController.current?.abort();narration.current?.abort();voice.current.cancel();if(recorder.current){recorder.current.onstop=null;if(recorder.current.state!=='inactive')recorder.current.stop()}stopTracks()}},[refresh,stopTracks]);
 useEffect(()=>{cancel();setLine(null);setLastReply(null);history.current={};setError('');lastNarrated.current=''},[s.runId,s.loopId,cancel]);
 useEffect(()=>{setLine(null)},[s.message]);
 useEffect(()=>{if(menuPaused&&(recording||microphonePending))cancel();if(menuPaused||muted||!voiceEnabled){voice.current.cancel();setVoiceState('idle')}},[menuPaused,muted,voiceEnabled,recording,microphonePending,cancel]);
 const syncKey=JSON.stringify([s.runId,s.loopId,s.events,s.memory,s.core,s.route,s.aboard,s.bypass===0,s.transfer===0,s.phase]);
 useEffect(()=>{if(!playing||!ready||processing)return;const abort=new AbortController();syncController.current=abort;const timer=setTimeout(()=>{const current=state.current;void api.sync(current,position.current,abort.signal).then(result=>{if(!abort.signal.aborted&&alive.current&&sameAttempt(state.current,envelope(current))){setSaved(true);if(validMemory(result.memory)&&JSON.stringify(result.memory)!==JSON.stringify(state.current.memory))dispatch({type:'hydrate_memory',memory:result.memory})}}).catch(()=>{if(!abort.signal.aborted&&alive.current)setSaved(false)})},300);return()=>{clearTimeout(timer);abort.abort()}},[syncKey,playing,ready,processing,position,dispatch]);
 const play=useCallback((speechId:string|null,text:string,speaker:Speaker)=>{const settings=liveSettings.current;if(settings.voiceEnabled&&!settings.muted&&!settings.menuPaused)void voice.current.play(speechId,settings.voiceVolume,setVoiceState,text,speaker,settings.speechAvailable)},[]);
 const deliver=useCallback((result:DialogueResponse)=>{if(!sameAttempt(state.current,result.envelope))return;const received={speaker:result.speaker,text:result.text,mode:result.mode,reason:result.reason,evidence:result.evidence,latencyMs:result.latencyMs};setLine(received);setLastReply(received);play(result.speechId,result.text,result.speaker)},[play]);
 const send=useCallback(async(text:string,selected:Speaker=speaker)=>{
  if(!text.trim()||submitting.current||state.current.phase!=='playing')return;
  submitting.current=true;const current=state.current;const e=envelope(current);const gen=generation.current;const abort=new AbortController();controller.current=abort;
  voice.current.cancel();setVoiceState('idle');setProcessing(true);setError('');syncController.current?.abort();
  const timer=setTimeout(()=>abort.abort(),7500);
  try{
   if(!ready)throw new Error('Radio server is unavailable.');
   let result=await api.dialogue(current,position.current,text.trim().slice(0,500),selected,e,abort.signal,history.current[selected]??[]);
   if(gen!==generation.current||!sameAttempt(state.current,result.envelope))return;
   if(result.proposal){
    const evaluated=applyProposal(state.current,result.proposal,position.current,result.envelope);
    if(evaluated.accepted)flushSync(()=>dispatch({type:'apply_tool',proposal:result.proposal!,position:{...position.current},envelope:result.envelope}));
    const accepted=evaluated.accepted&&state.current.processed.includes(e.requestId);
    const reason=accepted?'Validated against current mission state.':evaluated.reason;
    result=await api.complete(state.current,position.current,e,accepted,reason,abort.signal);
   }
   if(gen===generation.current){history.current[selected]=[...(history.current[selected]??[]),{role:'user',text:text.slice(0,500)},{role:'assistant',text:result.text}].slice(-6) as {role:'user'|'assistant';text:string}[];deliver(result);}
  }catch{
   if(gen!==generation.current)return;
   // Never claim a successful remote command when the completion receipt was lost.
   const applied=state.current.processed.includes(e.requestId);
   const fallback:Line={speaker:selected,text:applied?state.current.message.split(' · ').slice(1).join(' · '):reply(state.current,text),mode:'fallback',reason:applied?'The game applied the command; the radio confirmation was interrupted.':'Live radio unavailable. Authored guidance is active.',evidence:applied?['Verified local reducer result']:[],latencyMs:0};setLine(fallback);setLastReply(fallback);play(null,fallback.text,fallback.speaker);
  }finally{clearTimeout(timer);if(gen===generation.current){submitting.current=false;setProcessing(false);controller.current=null}}
 },[speaker,ready,dispatch,position,deliver,play]);
 const sendRef=useRef(send);sendRef.current=send;
 const startRecording=useCallback(async()=>{
  if(recording||microphonePending||submitting.current)return;
  if(!capabilities.transcription){setError('ElevenLabs transcription is not configured. Type your message instead.');return}
  const gen=generation.current;setMicrophonePending(true);setError('');voice.current.cancel();
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Recording is unavailable in this browser.');
   const capture=await navigator.mediaDevices.getUserMedia({audio:true});
   if(gen!==generation.current||!alive.current){capture.getTracks().forEach(t=>t.stop());return}
   stream.current=capture;const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(m=>MediaRecorder.isTypeSupported(m));const instance=new MediaRecorder(capture,mime?{mimeType:mime}:undefined);recorder.current=instance;const chunks:Blob[]=[];let bytes=0;const started=performance.now();
   instance.ondataavailable=event=>{bytes+=event.data.size;if(bytes>1_000_000){cancel();setError('Recording limit reached. Type your message instead.');return}if(event.data.size)chunks.push(event.data)};
   instance.onstop=async()=>{
    stopTracks();recorder.current=null;setRecording(false);setRecordedSeconds(0);if(gen!==generation.current)return;
    const duration=Math.min(10,(performance.now()-started)/1000);setProcessing(true);submitting.current=true;const abort=new AbortController();controller.current=abort;const timeout=setTimeout(()=>abort.abort(),14000);
    try{const wav=await recordingToWav(new Blob(chunks,{type:instance.mimeType}));if(gen!==generation.current)return;const result=await api.transcribe(wav,duration,envelope(state.current),abort.signal);if(gen!==generation.current)return;setLastTranscript(result.text);submitting.current=false;setProcessing(false);await sendRef.current(result.text)}
    catch{if(gen===generation.current)setError('Could not transcribe that recording. Type your message instead.')}
    finally{clearTimeout(timeout);if(gen===generation.current){submitting.current=false;setProcessing(false)}}
   };
   instance.start(200);setMicrophonePending(false);setRecording(true);setRecordedSeconds(0);clockTimer.current=setInterval(()=>setRecordedSeconds(Math.min(10,Math.floor((performance.now()-started)/1000))),100);recordTimer.current=setTimeout(()=>{if(instance.state==='recording')instance.stop()},10000);
  }catch{stopTracks();if(gen===generation.current){setMicrophonePending(false);setRecording(false);setError('Microphone unavailable or permission denied. Type your message instead.')}}
 },[recording,microphonePending,capabilities.transcription,cancel,stopTracks]);
 const stopRecording=useCallback(()=>{if(recorder.current?.state==='recording')recorder.current.stop()},[]);
 useEffect(()=>{stationAudio.setDucking(recording);return()=>{if(recording)stationAudio.setDucking(false)};},[recording]);
 // Queue authored turns with device speech immediately; ElevenLabs is an optional higher-quality source.
 useEffect(()=>{if(!playing||!voiceEnabled||muted||menuPaused||processing||recording)return;const key=`${s.loopId}:${s.message}`;if(lastNarrated.current===key)return;const [rawSpeaker,...parts]=s.message.split(' · ');if(!['ECHO','MARA','IMANI','SAM'].includes(rawSpeaker))return;lastNarrated.current=key;const text=parts.join(' · ');if(!capabilities.speech||!ready){play(null,text,rawSpeaker as Speaker);return;}const abort=new AbortController();narration.current=abort;void api.sync(state.current,position.current,abort.signal).then(()=>api.narration(envelope(state.current),rawSpeaker as Speaker,text,abort.signal)).then(result=>{if(!abort.signal.aborted)play(result.speechId,text,rawSpeaker as Speaker)}).catch(()=>{if(!abort.signal.aborted)play(null,text,rawSpeaker as Speaker)});return()=>abort.abort()},[s.message,s.loopId,playing,ready,capabilities.speech,voiceEnabled,muted,menuPaused,processing,recording,play,position]);
 const skipVoice=()=>{voice.current.cancel();setVoiceState('idle')};
 return {capabilities,ready,processing,recording,microphonePending,recordedSeconds,voiceState,error,line,lastReply,speaker,setSpeaker,lastTranscript,saved,send,startRecording,stopRecording,skipVoice,cancel,refresh};
}
