/** Original synthesized effects. The context starts only from a player gesture. */
type Cue='impact'|'warning'|'pickup'|'door'|'shutdown'|'rewind'|'success';
class StationAudio {
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private active=true;
 private muted=false;
 private volume=.45;
 private sources=new Set<AudioScheduledSourceNode>();
 start(){try{if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.connect(this.context.destination);this.master.gain.value=this.muted?0:this.volume;}void this.context.resume().catch(()=>{});}catch{/* Text and visual warnings remain available. */}}
 setMuted(muted:boolean){this.muted=muted;this.updateGain()}
 setVolume(volume:number){this.volume=Math.max(0,Math.min(1,volume));this.updateGain()}
 setActive(active:boolean){this.active=active;if(!active)this.stop();this.updateGain()}
 private updateGain(){if(this.context&&this.master)this.master.gain.setTargetAtTime(this.active&&!this.muted?this.volume:0,this.context.currentTime,.04)}
 stop(){for(const source of this.sources){try{source.stop()}catch{}}this.sources.clear()}
 private track(source:AudioScheduledSourceNode){this.sources.add(source);source.onended=()=>this.sources.delete(source)}
 cue(cue:Cue){const ctx=this.context,master=this.master;if(!ctx||!master||!this.active||this.muted||ctx.state!=='running')return;
  const start=ctx.currentTime;
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
