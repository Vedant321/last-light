import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,freshExpedition,migrateExpedition,type SurveyResult} from '../src/expedition/state';
import {initial} from '../src/game/state';
import {RoverEngine,pairPlan} from '../src/expedition/roverEngine';

test('campaign requires preparation, actual rescue and both confirmed surveys before ending',()=>{
 let s=freshExpedition();s=advance(s,{type:'launch'});s=advance(s,{type:'dock'});
 assert.equal(advance(s,{type:'depart'}),s);
 for(const check of ['power','oxygen','rover'] as const)s=advance(s,{type:'check',check});
 assert.equal(advance(s,{type:'check',check:'power'}),s);
 s=advance(s,{type:'depart'});assert.equal(s.chapter,'kestrel');
 assert.equal(advance(s,{type:'rescued',state:initial()}),s);
 const rescue={...initial(),phase:'won' as const,core:false,aboard:['player','engineer','medic','patient','pilot']};
 s=advance(s,{type:'rescued',state:rescue});assert.equal(s.chapter,'transit');
 s=advance(s,{type:'deploy'});assert.equal(advance(s,{type:'finish'}),s);assert.equal(advance(s,{type:'leave_rover'}),s);assert.equal(advance(s,{type:'dock_home'}),s);
 assert.equal(advance(s,{type:'inspect_site',site:'outpost'}),s);
 s=advance(s,{type:'inspect_site',site:'ridge'});s=advance(s,{type:'inspect_site',site:'outpost'});s=advance(s,{type:'leave_rover'});assert.equal(s.chapter,'return');assert.equal(s.roverDeployed,true);
 s=advance(s,{type:'dock_home'});assert.equal(s.chapter,'monitor');assert.equal(s.returnedToISS,true);
 const r:SurveyResult={condition:'LAG_ONLY',outcome:'SUCCESS',timeMs:10000,overshoots:0,reversals:0,targets:[-20,20],perTargetMs:[4000,4700]};
 s=advance(s,{type:'survey',result:r});assert.equal(advance(s,{type:'finish'}),s);
 s=advance(s,{type:'survey',result:{...r,condition:'PREDICTION'}});s=advance(s,{type:'finish'});assert.equal(s.chapter,'ending');
});
test('rover exposes no camera frame before downlink and no motion before uplink',()=>{
 const e=new RoverEngine('PREDICTION',1,1);e.issue(-20);e.step(1280);
 assert.equal(e.render(1280).frameAngle,null);assert.equal(e.render(1280).thetaNow,null);
 e.step(1300);assert.equal(e.render(1300).frameAngle,0);
 // First released observation is old; the estimate replays only commands scheduled by this instant.
 assert.ok(Math.abs(e.render(1300).thetaNow!)<.01); // Sensor noise is not motor motion.
 e.step(2600);assert.notEqual(e.render(2600).thetaNow,0);e.dispose();
});
test('both views acquire the same seeded targets and notify only after downlink',()=>{
 for(const condition of ['LAG_ONLY','PREDICTION'] as const){
  const e=new RoverEngine(condition,1,1);e.issue(-20);let result=null;
  for(let t=0;t<=60000;t+=20){result=e.step(t);if(e.target===20&&t%100===0)e.issue(20);if(result)break;}
  assert.equal(result?.outcome,'SUCCESS');assert.deepEqual(result?.targetSequence,[-20,20]);assert.equal(result!.acquisitions.length,2);
  for(const a of result!.acquisitions)assert.equal(a.tNotified-a.tAcquired,1300);
  assert.ok(e.updates>0);e.dispose();
 }
});
test('comparison order alternates and interrupted attempts never receive a success time',()=>{
 assert.deepEqual(pairPlan(1).conditions,['LAG_ONLY','PREDICTION']);assert.deepEqual(pairPlan(2).conditions,['PREDICTION','LAG_ONLY']);
 const e=new RoverEngine('LAG_ONLY',1,1);e.step(3000);const result=e.interrupt('hidden');assert.equal(result.outcome,'INVALID');assert.equal(result.timeMs,null);e.dispose();
});

test('old completed exploration checkpoints migrate to the ISS watch without losing measurements',()=>{
 const r:SurveyResult={condition:'LAG_ONLY',outcome:'SUCCESS',timeMs:9000,overshoots:0,reversals:0,targets:[-20,20],perTargetMs:[3000,4700]};
 const old={...freshExpedition(),schemaVersion:1,chapter:'lunar',checks:['power','oxygen','rover'],crew:['player','engineer','medic','patient','pilot'],loops:1,results:[r]};
 delete (old as Partial<typeof old>).surfaceSites;delete (old as Partial<typeof old>).roverDeployed;delete (old as Partial<typeof old>).returnedToISS;
 const migrated=migrateExpedition(old);assert.equal(migrated?.chapter,'monitor');assert.equal(migrated?.schemaVersion,2);assert.equal(migrated?.roverDeployed,true);assert.equal(migrated?.returnedToISS,true);assert.deepEqual(migrated?.results,[r]);
});
test('autonomous orbital watch keeps receiving delayed observations after scored trials would time out',()=>{
 const watch=new RoverEngine('LAG_ONLY',1,0,true);watch.issue(20);watch.step(1280);assert.equal(watch.received,null);watch.step(70000);assert.equal(watch.target,null);assert.ok(watch.received!.sampledAt<=70000-1300);assert.ok(watch.received!.id>1000);assert.equal(watch.step(71000),null);watch.dispose();
});
