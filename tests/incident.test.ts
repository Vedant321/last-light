import {test} from 'node:test';
import assert from 'node:assert/strict';
import {incidentAt} from '../src/game/incident';
test('opening emergency changes speakers while sounding only one initial alarm',()=>{const opening=[0,3,6,9].map(elapsed=>incidentAt({mode:'normal',remaining:480-elapsed,phase:'playing'}));assert.deepEqual(opening.map(i=>i?.speaker),['ECHO','MARA','IMANI','SAM']);assert.deepEqual(opening.map(i=>i?.alarm),[true,false,false,false]);assert.equal(incidentAt({mode:'normal',remaining:467,phase:'playing'}),null)});
test('structural alarms follow the same mission fractions in normal and demo',()=>{for(const [mode,duration] of [['normal',480],['demo',180]] as const){for(const fraction of [.25,.5,.75,.875]){const i=incidentAt({mode,remaining:duration*(1-fraction),phase:'playing'});assert.equal(i?.alarm,true);assert.equal(i?.speaker,'ECHO')}}});
test('failure and rescue suppress all incident chatter',()=>{for(const phase of ['won','failed'] as const)assert.equal(incidentAt({mode:'demo',remaining:179,phase}),null)});
