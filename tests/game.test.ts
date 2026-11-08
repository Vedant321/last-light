import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,reduce,block,reply,type State,type Action,type Place} from '../src/game/state';
function act(s:State,action:Action,id:string=crypto.randomUUID()){return reduce(s,{type:'act',action,id,runId:s.runId,loopId:s.loopId})}
function at(s:State,place:Place){return {...s,place}}
function wait(s:State,seconds:number){for(let i=0;i<seconds;i++)s=reduce(s,{type:'tick',dt:1});return s}
function prepare(){let s=initial('demo');s=act(s,'inspect');s=act(s,'battery');s=at(s,'engineering');s=act(s,'connect');s=act(s,'bypass');s=at(s,'docking');s=act(s,'oxygen');s=at(s,'medical');s=act(s,'deliver');return wait(s,8)}
test('reference route rescues all five without AI',()=>{let s=prepare();s=act(at(s,'hub'),'shutdown');s=act(at(s,'medical'),'power');s=act(s,'transfer');s=wait(s,5);s=act(at(s,'docking'),'board');s=act(s,'launch');assert.equal(s.phase,'won');assert.equal(s.aboard.length,5)});
test('shutdown is interlocked; oxygen and power gate transfer',()=>{let s=initial();assert.match(block(s,'shutdown')!,/bypass/);s=at(s,'medical');assert.match(block(s,'transfer')!,/Power/);s={...s,route:true};assert.match(block(s,'transfer')!,/oxygen/)});
test('launch rejects core, missing people, and expired time',()=>{let s=at(initial(),'docking');assert.match(block(s,'launch')!,/Core/);s.core=false;assert.match(block(s,'launch')!,/five/);s.aboard=['pilot','player','engineer','medic','patient'];s.remaining=0;assert.ok(block(s,'launch'))});
test('reset restores physical state and preserves only observed facts',()=>{const s=prepare();const r=reduce(s,{type:'reset'});assert.equal(r.battery,'cabinet');assert.equal(r.oxygen,'locker');assert.equal(r.bypass,null);assert.deepEqual(r.aboard,['pilot']);assert.deepEqual(r.memory.facts,s.memory.facts);assert.match(reply(r,'remember'),/bypass|oxygen/);assert.equal(r.memory.loopCount,2);assert.notEqual(r.loopId,s.loopId)});
test('fresh context does not leak hidden battery or oxygen knowledge',()=>{const s=initial();assert.deepEqual(s.memory.facts,[]);assert.doesNotMatch(reply(s,'help'),/oxygen|usable|bypass/)});
test('duplicate IDs and stale loop actions have no effect',()=>{let s=initial();s=act(s,'inspect','one');assert.equal(act(s,'battery','one'),s);const old=s;const r=reduce(s,{type:'reset'});assert.equal(reduce(r,{type:'act',action:'inspect',id:'late',loopId:old.loopId,runId:old.runId}),r)});
test('one elapsed clock advances every task and timer together',()=>{let s=prepare();s=act(at(s,'hub'),'shutdown');s=act(at(s,'medical'),'power');s=act(s,'transfer');const remaining=s.remaining;s=wait(s,3);assert.equal(s.remaining,remaining-3);assert.equal(s.transfer,2)});
test('deadline with core rewinds; deadline without core requires explicit retry',()=>{let s=initial();s.remaining=1;s=wait(s,1);assert.equal(s.memory.loopCount,2);assert.equal(s.phase,'playing');s.core=false;s.remaining=1;s=wait(s,1);assert.equal(s.phase,'failed');assert.equal(s.memory.loopCount,2)});
test('normal and demo use identical action guards',()=>{for(const mode of ['normal','demo'] as const){const s=initial(mode);assert.ok(block(s,'battery'));assert.ok(block(s,'shutdown'));assert.equal(block(s,'inspect'),null)}});
test('travel consumes simulation time and blocks interactions',()=>{let s=initial('demo');s=reduce(s,{type:'travel',to:'engineering'});assert.ok(block(s,'inspect'));s=wait(s,2);assert.equal(s.place,'engineering');assert.equal(s.travel,null);assert.equal(s.remaining,178)});

test('a delayed frame preserves elapsed time and timed crew movement',()=>{let s=initial('demo');s=act(s,'inspect');s=act(s,'battery');s=act(at(s,'engineering'),'connect');s=act(s,'bypass');s=reduce(s,{type:'tick',dt:9});assert.equal(s.remaining,171);assert.ok(s.aboard.includes('engineer'))});

test('boarding early cannot softlock the rescue',()=>{let s=act(at(initial(),'docking'),'board');assert.ok(s.aboard.includes('player'));s=reduce(s,{type:'travel',to:'hub'});assert.ok(s.travel);assert.ok(!s.aboard.includes('player'));});

test('a failed attempt records the preparation that was actually missing',()=>{let s=initial();s={...s,battery:'installed',bypass:0,events:['Mara completed the safe bypass.'],remaining:0};const next=reduce(s,{type:'reset'});assert.match(next.memory.summaries.at(-1)!,/Medical had not received portable oxygen/);assert.equal(next.oxygen,'locker');assert.equal(next.bypass,null)});

test('a duplicated manifest entry cannot replace a missing person at launch',()=>{const s={...initial(),place:'docking' as const,core:false,aboard:['pilot','player','engineer','medic','medic']};assert.match(block(s,'launch')!,/all five/);assert.equal(act(s,'launch').phase,'playing')});
