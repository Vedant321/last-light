/** Campaign adapter for Ghost Frame. Rendering never receives the simulator's private reference channel. */
import {PanSimPlant} from '../ghost/pan/simPlant';
import {PanPredictor} from '../ghost/pan/predictor';
import {OnlineServoLearner} from '../ghost/pan/learner';
import {DelayLine} from '../ghost/delay/delayLine';
import {ErrorBandTracker} from '../ghost/pan/errorBand';
import {TrialRunner,type ScoredTrial,pairPlan} from '../ghost/pan/trials';
import {UPLINK_MS,TICK_MS,toCommandAngle} from '../ghost/config';
import type {Command,Observation,Condition} from '../ghost/types';
import type {RenderState} from '../ghost/pan/view';
export {pairPlan};
export class RoverEngine{
 readonly learner=new OnlineServoLearner();
 readonly predictor=new PanPredictor(undefined,this.learner);
 private uplink=new DelayLine<Command>();private downlink=new DelayLine<Observation>();
 private frames=new Map<number,number>();private plant:PanSimPlant;private band=new ErrorBandTracker();
 private observation:Observation|null=null;private runner:TrialRunner;private serial=0;private next=0;private result:ScoredTrial|null=null;private command=0;
 readonly id=crypto.randomUUID();
 constructor(readonly condition:Condition,participant:number,readonly round:number,private readonly watch=false){
  const plan=pairPlan(participant);
  this.runner=new TrialRunner({sessionId:this.id,trialId:`${this.id}-${round}`,participant,practice:false,modelKind:'adaptive',condition,order:plan.order,plant:'SIM',tester:'campaign-player',targetSequence:plan.targets,startedAt:0});
  this.plant=new PanSimPlant(this.id,{seed:42,frames:this.frames,onTruth:(t,angle)=>{if(!this.watch)this.runner.sample(t,angle);}});
  void this.plant.start(o=>this.downlink.schedule(o,o.tDeliver));
 }
 issue(angle:number){if(this.result)return;const c={sessionId:this.id,id:++this.serial,tIssued:this.next,tScheduled:this.next+UPLINK_MS,angleDeg:toCommandAngle(angle)};this.command=c.angleDeg;this.predictor.onIssuedCommand(c);this.band.onCommandIssued(c.tIssued);this.uplink.schedule(c,c.tScheduled);}
 step(now:number){
  while(this.next<=now&&!this.result){const t=this.next;
   this.result=this.watch?null:this.runner.advance(t);
   if(this.result)break;
   for(const c of this.uplink.release(t))void this.plant.applyCommand(c,t);
   this.plant.step(t);
   for(const o of this.downlink.release(t)){this.observation=o;this.predictor.onReleasedObservation(o);this.band.onReleasedObservation(o);if(o.frameId)for(const id of this.frames.keys()){if(id<o.frameId)this.frames.delete(id);}}
   if(t%100===0){this.band.log('NOW',t,t,this.predictor.estimateNow(t));this.band.log('FUTURE',t,t+1700,this.predictor.futureAim(t));}
   this.next+=TICK_MS;
  }
  return this.result;
 }
 interrupt(reason:string){this.result??=this.runner.invalidate(this.next,reason);return this.result;}
 get time(){return Math.max(0,this.next-TICK_MS);}
 get target(){return this.watch?null:this.runner.activeTarget;}
 get received(){return this.observation?{id:this.observation.id,angle:this.observation.angleDeg,sampledAt:this.observation.tSample}:null;}
 get updates(){return this.learner.alphaUpdates+this.learner.speedUpdates;}
 get queued(){return this.uplink.size;}
 render(now:number):RenderState{const o=this.observation;return {mode:this.condition==='PREDICTION'?'predict':'lag',tRender:now,frameAngle:o?.frameId?this.frames.get(o.frameId)??null:null,thetaObs:o?.angleDeg??null,thetaNow:this.predictor.estimateNow(now),thetaAim:this.predictor.futureAim(now),thetaCmd:this.command,frameAgeMs:o?now-o.tSample:null,activeTarget:this.target===null?null:this.target<0?'A':'B',simLabel:'SIM · 1.3 s uplink + 1.3 s downlink',nowBand:this.band.reading('NOW',now,500,o?.tDeliver??null),futureBand:this.band.reading('FUTURE',now,500,o?.tDeliver??null)};}
 dispose(){this.uplink.clear();this.downlink.clear();this.frames.clear();void this.plant.dispose();}
}
