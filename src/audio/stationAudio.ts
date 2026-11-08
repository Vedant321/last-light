/** Original synthesized effects. The context starts only from a player gesture. */
export type Mood='hopeful'|'launch'|'tense'|'critical'|'wonder'|'home';
type Cue='radio'|'impact'|'warning'|'pickup'|'door'|'shutdown'|'rewind'|'success';
class StationAudio {
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private music:GainNode|null=null;private musicVolume=.24;private ducking=false;private musicPaused=false;private mood:Mood='hopeful';private beat=0;private nextBeat=0;private musicTimer:ReturnType<typeof setInterval>|null=null;
 private active=true;
 private muted=false;
 private volume=.45;
 private sources=new Set<AudioScheduledSourceNode>();
 start(){try{if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.connect(this.context.destination);this.master.gain.value=this.muted?0:this.volume;this.music=this.context.createGain();this.music.connect(this.context.destination);this.nextBeat=this.context.currentTime+.1;this.musicTimer=setInterval(()=>this.score(),150);this.updateMusic();}void this.context.resume().catch(()=>{});}catch{/* Text and visual warnings remain available. */}}
 setMuted(muted:boolean){this.muted=muted;this.updateGain();this.updateMusic()}
 setVolume(volume:number){this.volume=Math.max(0,Math.min(1,volume));this.updateGain()}
 setActive(active:boolean){this.active=active;if(!active)this.stop();this.updateGain()}
 setMood(mood:Mood){if(this.mood!==mood){this.mood=mood;this.beat=0;}}
 setMusicVolume(volume:number){this.musicVolume=Math.max(0,Math.min(1,volume));this.updateMusic();}
 setMusicPaused(paused:boolean){this.musicPaused=paused;this.updateMusic();}
 setDucking(speaking:boolean){this.ducking=speaking;this.updateMusic();}
 private updateMusic(){if(this.context&&this.music)this.music.gain.setTargetAtTime(this.muted||this.musicPaused?0:this.musicVolume*(this.ducking?.16:1),this.context.currentTime,this.ducking?.08:.55);}
 private score(){const ctx=this.context,out=this.music;if(!ctx||!out||ctx.state!=='running')return;if(this.nextBeat<ctx.currentTime)this.nextBeat=ctx.currentTime+.04;
  const scale=this.mood==='tense'||this.mood==='critical'?[0,3,7,10,7,3,2,7]:[0,4,7,11,12,7,4,2];const bpm={hopeful:76,launch:112,tense:100,critical:132,wonder:64,home:80}[this.mood];
  while(this.nextBeat<ctx.currentTime+.3){const t=this.nextBeat;const root=(this.mood==='tense'||this.mood==='critical'?45:48)+[0,5,9,7][Math.floor(this.beat/16)%4];const semitone=scale[this.beat%scale.length];if(!this.muted&&!this.musicPaused&&this.musicVolume>0){const note=(midi:number,gain:number,duration:number,type:OscillatorType)=>{const osc=ctx.createOscillator(),g=ctx.createGain();osc.type=type;osc.frequency.value=440*Math.pow(2,(midi-69)/12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.04);g.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(g).connect(out);osc.onended=()=>{osc.disconnect();g.disconnect();};osc.start(t);osc.stop(t+duration+.02);};note(root+12+semitone,.055,1.1,'sine');if(this.beat%4===0){note(root,.045,2.5,'triangle');note(root+7,.025,2.5,'sine');}}this.beat++;this.nextBeat+=60/bpm/2;}
 }
 private updateGain(){if(this.context&&this.master)this.master.gain.setTargetAtTime(this.active&&!this.muted?this.volume:0,this.context.currentTime,.04)}
 stop(){for(const source of this.sources){try{source.stop()}catch{}}this.sources.clear()}
 private track(source:AudioScheduledSourceNode){this.sources.add(source);source.onended=()=>this.sources.delete(source)}
 cue(cue:Cue){const ctx=this.context,master=this.master;if(!ctx||!master||!this.active||this.muted||ctx.state!=='running')return;
  const start=ctx.currentTime;
  if(cue==='radio'){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(1320,start);osc.frequency.exponentialRampToValueAtTime(870,start+.07);gain.gain.setValueAtTime(.025,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.09);osc.connect(gain).connect(master);this.track(osc);osc.start();osc.stop(start+.1);return;}
  if(cue==='impact'){
   const buffer=ctx.createBuffer(1,ctx.sampleRate*.9,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.13));
   const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=600;gain.gain.value=.28;source.connect(filter).connect(gain).connect(master);this.track(source);source.start();return;
  }
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain).connect(master);this.track(osc);osc.type=cue==='warning'?'sine':'triangle';
  const duration=cue==='warning'?3.4:cue==='success'?1.6:.4;
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(cue==='warning'?.105:.07,start+.04);gain.gain.setValueAtTime(cue==='warning'?.105:.07,start+duration-.1);gain.gain.linearRampToValueAtTime(0,start+duration);
  if(cue==='warning'){for(let i=0;i<5;i++){osc.frequency.setValueAtTime(560,start+i*.65);osc.frequency.linearRampToValueAtTime(910,start+i*.65+.3);osc.frequency.linearRampToValueAtTime(560,start+i*.65+.6);}}
  else {const notes=cue==='success'?[392,494,587,784]:cue==='pickup'?[660,880]:cue==='door'?[180,270]:cue==='shutdown'?[380,120]:[260,520];notes.forEach((n,i)=>osc.frequency.setValueAtTime(n,start+i*duration/notes.length));}
  osc.start(start);osc.stop(start+duration);
 }
}
export const stationAudio=new StationAudio();
