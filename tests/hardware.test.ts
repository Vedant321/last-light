// Adapted from Ghost Frame's protocol checks for the combined app's Node test runner.
import test from 'node:test';
import assert from 'node:assert/strict';
import {RigLineDecoder,parseRigLine,servoCommand} from '../src/ghost/rig/protocol';
test('hardware lab retains bounded commands and distinguishes target acknowledgement from observation',()=>{
 assert.equal(servoCommand(7,-30),'S,7,-30\n');
 for(const [id,angle] of [[0,0],[1,31],[1,.5]])assert.throws(()=>servoCommand(id,angle));
 assert.deepEqual(parseRigLine('K,1023,1'),{type:'knob',raw:1023,pressed:true});
 assert.deepEqual(parseRigLine('A,12,-20'),{type:'ack',sequence:12,angleDeg:-20});
 for(const bad of ['K,1024,0','K,-1,0','A,0,20','A,1,31','READY,2','noise'])assert.equal(parseRigLine(bad),null);
});
test('serial framing reassembles split reads and recovers after oversized or broken messages',()=>{
 const d=new RigLineDecoder(),bytes=(s:string)=>new TextEncoder().encode(s);
 assert.deepEqual(d.push(bytes('REA')),[]);
 assert.deepEqual(d.push(bytes('DY,1\r\nK,51')),[{type:'ready',version:1}]);
 assert.deepEqual(d.push(bytes('2,0\nA,4,20\n')),[{type:'knob',raw:512,pressed:false},{type:'ack',sequence:4,angleDeg:20}]);
 assert.deepEqual(d.push(bytes(`${'x'.repeat(50)}\nK,0,1\n`)),[{type:'knob',raw:0,pressed:true}]);
});
