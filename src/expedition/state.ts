import {allAboard,type State} from '../game/state';
export type Chapter='earth'|'launch'|'iss'|'kestrel'|'transit'|'lunar'|'ending';
export type Check='power'|'oxygen'|'rover';
export type SurveyResult={condition:'LAG_ONLY'|'PREDICTION';outcome:'SUCCESS'|'TIMEOUT'|'INVALID';timeMs:number|null;overshoots:number;reversals:number;targets:number[];perTargetMs:number[]};
export type Expedition={schemaVersion:1;id:string;revision:number;chapter:Chapter;checks:Check[];crew:string[];loops:number;participant:number;results:SurveyResult[]};
export const chapters:Chapter[]=['earth','launch','iss','kestrel','transit','lunar','ending'];
export const freshExpedition=(participant=1):Expedition=>({schemaVersion:1,id:crypto.randomUUID(),revision:0,chapter:'earth',checks:[],crew:[],loops:0,participant,results:[]});
export type Event={type:'launch'}|{type:'dock'}|{type:'check';check:Check}|{type:'depart'}|{type:'rescued';state:State}|{type:'deploy'}|{type:'survey';result:SurveyResult}|{type:'finish'};
export function advance(s:Expedition,e:Event):Expedition{
 let n={...s,revision:s.revision+1};
 if(e.type==='launch'&&s.chapter==='earth')n.chapter='launch';
 else if(e.type==='dock'&&s.chapter==='launch')n.chapter='iss';
 else if(e.type==='check'&&s.chapter==='iss'&&!s.checks.includes(e.check))n.checks=[...s.checks,e.check];
 else if(e.type==='depart'&&s.chapter==='iss'&&['power','oxygen','rover'].every(x=>s.checks.includes(x as Check)))n.chapter='kestrel';
 else if(e.type==='rescued'&&s.chapter==='kestrel'&&e.state.phase==='won'&&!e.state.core&&allAboard(e.state)){n.chapter='transit';n.crew=[...e.state.aboard];n.loops=e.state.memory.loopCount;}
 else if(e.type==='deploy'&&s.chapter==='transit')n.chapter='lunar';
 else if(e.type==='survey'&&s.chapter==='lunar')n.results=[...s.results,e.result].slice(-12);
 else if(e.type==='finish'&&s.chapter==='lunar'&&['LAG_ONLY','PREDICTION'].every(c=>s.results.some(r=>r.condition===c&&r.outcome==='SUCCESS')))n.chapter='ending';
 else return s;
 return n;
}
export function validExpedition(value:unknown):value is Expedition{
 if(!value||typeof value!=='object')return false;
 const s=value as Expedition;
 if(!(s.schemaVersion===1&&typeof s.id==='string'&&s.id.length>0&&Number.isInteger(s.revision)&&s.revision>=0&&chapters.includes(s.chapter)&&Array.isArray(s.checks)&&s.checks.length<=3&&new Set(s.checks).size===s.checks.length&&s.checks.every(c=>['power','oxygen','rover'].includes(c))&&Array.isArray(s.crew)&&new Set(s.crew).size===s.crew.length&&s.crew.every(x=>['player','engineer','medic','patient','pilot'].includes(x))&&Number.isInteger(s.loops)&&s.loops>=0&&Number.isInteger(s.participant)&&s.participant>0&&Array.isArray(s.results)&&s.results.length<=12))return false;
 if(chapters.indexOf(s.chapter)>=3&&s.checks.length!==3)return false;
 if(chapters.indexOf(s.chapter)>=4&&(s.crew.length!==5||s.loops<1))return false;
 if(!s.results.every(r=>r&&['LAG_ONLY','PREDICTION'].includes(r.condition)&&['SUCCESS','TIMEOUT','INVALID'].includes(r.outcome)&&Number.isInteger(r.overshoots)&&Number.isInteger(r.reversals)&&Array.isArray(r.targets)&&r.targets.length===2&&r.targets[0]===(s.participant%2?-20:20)&&r.targets[1]===-r.targets[0]&&Array.isArray(r.perTargetMs)&&r.perTargetMs.every(x=>Number.isFinite(x)&&x>=0&&x<=60000)&&(r.outcome==='SUCCESS'?r.perTargetMs.length===2&&Number.isFinite(r.timeMs)&&r.timeMs! >= 2000&&r.timeMs! <= 60000:r.timeMs===null)))return false;
 return s.chapter!=='ending'||['LAG_ONLY','PREDICTION'].every(c=>s.results.some(r=>r.condition===c&&r.outcome==='SUCCESS'));
}
export const checkpointKey='kestrel-recall-expedition-v1';
export function loadExpedition():Expedition|null{try{const s=JSON.parse(localStorage.getItem(checkpointKey)||'null');return validExpedition(s)?s:null}catch{return null}}
