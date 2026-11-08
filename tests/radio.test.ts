import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {RadioDirector} from '../src/audio/radio';
import {stationAudio} from '../src/audio/stationAudio';
function setup(t:TestContext){
 t.mock.timers.enable({apis:['setTimeout']});const turns:FakeUtterance[]=[];const ducks:boolean[]=[];
 class FakeUtterance {text:string;volume=1;rate=1;pitch=1;onstart:(()=>void)|null=null;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(text:string){this.text=text;}}
 const oldSynth=Object.getOwnPropertyDescriptor(globalThis,'speechSynthesis'),oldUtterance=Object.getOwnPropertyDescriptor(globalThis,'SpeechSynthesisUtterance');const oldDuck=stationAudio.setDucking;
 Object.defineProperty(globalThis,'SpeechSynthesisUtterance',{configurable:true,value:FakeUtterance});Object.defineProperty(globalThis,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],cancel:()=>{},speak:(u:FakeUtterance)=>{turns.push(u);u.onstart?.();}}});stationAudio.setDucking=(value:boolean)=>{ducks.push(value);};
 const director=new RadioDirector();t.after(()=>{director.cancelAll();stationAudio.setDucking=oldDuck;for(const [name,descriptor] of [['speechSynthesis',oldSynth],['SpeechSynthesisUtterance',oldUtterance]] as const){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);}});return {director,turns,ducks};
}
test('radio serializes crew turns with a real gap and ducks only during speech',t=>{
 const {director:d,turns,ducks}=setup(t);d.enqueue({scope:'mission',speaker:'ECHO',text:'First sentence.'});d.enqueue({scope:'mission',speaker:'MARA',text:'Second sentence.'});
 t.mock.timers.tick(350);assert.deepEqual(turns.map(u=>u.text),['First sentence.']);assert.equal(d.getSnapshot().phase,'speaking');assert.equal(ducks.at(-1),true);
 turns[0].onend?.();assert.equal(ducks.at(-1),false);t.mock.timers.tick(649);assert.equal(turns.length,1);t.mock.timers.tick(1);assert.equal(turns.length,2);assert.equal(d.getSnapshot().speaker,'MARA');
});
test('scene cancellation drops old speech and late completion cannot finish a new turn',t=>{
 const {director:d,turns}=setup(t);d.enqueue({scope:'old',speaker:'ECHO',text:'Old chapter.'});t.mock.timers.tick(350);const late=turns[0].onend;d.cancelScope('old');d.enqueue({scope:'new',speaker:'SAM',text:'New chapter.'});t.mock.timers.tick(350);late?.();assert.equal(d.getSnapshot().text,'New chapter.');assert.equal(d.getSnapshot().phase,'speaking');
});
test('muting stops current audio but preserves subtitle-only dialogue',t=>{
 const {director:d,turns,ducks}=setup(t);d.enqueue({scope:'a',speaker:'ECHO',text:'Talking.'});t.mock.timers.tick(350);d.configure(true,true,.8);assert.equal(ducks.at(-1),false);d.enqueue({scope:'a',speaker:'IMANI',text:'Visible without sound.'});t.mock.timers.tick(2000);assert.equal(turns.length,1);assert.equal(d.getSnapshot().text,'Visible without sound.');assert.equal(d.getSnapshot().source,'subtitles');
});
test('unavailable optional generated speech falls back to the device radio voice',async t=>{
 const {director:d,turns}=setup(t);d.enqueue({scope:'fallback',speaker:'ECHO',text:'The crew is safe.',clip:async()=>{throw Error('Provider unavailable');}});t.mock.timers.tick(350);await Promise.resolve();await Promise.resolve();assert.equal(turns.length,1);assert.equal(d.getSnapshot().source,'device');assert.equal(d.getSnapshot().phase,'speaking');
});
test('faster gameplay keeps the current sentence and replaces outdated pending instructions',t=>{
 const {director:d,turns}=setup(t);d.enqueue({scope:'rescue',speaker:'MARA',text:'Working on the bypass.'});t.mock.timers.tick(350);
 d.enqueue({scope:'rescue',speaker:'ECHO',text:'Old instruction.',replacePending:true});d.enqueue({scope:'rescue',speaker:'SAM',text:'Latest instruction.',replacePending:true});
 assert.equal(turns.length,1);turns[0].onend?.();t.mock.timers.tick(650);assert.deepEqual(turns.map(u=>u.text),['Working on the bypass.','Latest instruction.']);
});
