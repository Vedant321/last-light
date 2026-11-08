import {allAboard,type State} from '../game/state';
export type Chapter='earth'|'launch'|'iss'|'kestrel'|'transit'|'lunar'|'return'|'monitor'|'ending';
export type Check='power'|'oxygen'|'rover';
export type SurveyResult={condition:'LAG_ONLY'|'PREDICTION';outcome:'SUCCESS'|'TIMEOUT'|'INVALID';timeMs:number|null;overshoots:number;reversals:number;targets:number[];perTargetMs:number[]};
export type Expedition={schemaVersion:2;id:string;revision:number;chapter:Chapter;checks:Check[];crew:string[];loops:number;participant:number;results:SurveyResult[];surfaceSites:string[];roverDeployed:boolean;returnedToISS:boolean};
export const chapters:Chapter[]=['earth','launch','iss','kestrel','transit','lunar','return','monitor','ending'];
export const freshExpedition=(participant=1):Expedition=>({schemaVersion:2,id:crypto.randomUUID(),revision:0,chapter:'earth',checks:[],crew:[],loops:0,participant,results:[],surfaceSites:[],roverDeployed:false,returnedToISS:false});
export type Event={type:'launch'}|{type:'dock'}|{type:'check';check:Check}|{type:'depart'}|{type:'rescued';state:State}|{type:'deploy'}|{type:'inspect_site';site:'ridge'|'outpost'}|{type:'leave_rover'}|{type:'dock_home'}|{type:'survey';result:SurveyResult}|{type:'finish'};
export function advance(s:Expedition,e:Event):Expedition{
 const n={...s,revision:s.revision+1};
 if(e.type==='launch'&&s.chapter==='earth')n.chapter='launch';
 else if(e.type==='dock'&&s.chapter==='launch')n.chapter='iss';
 else if(e.type==='check'&&s.chapter==='iss'&&!s.checks.includes(e.check))n.checks=[...s.checks,e.check];
 else if(e.type==='depart'&&s.chapter==='iss'&&['power','oxygen','rover'].every(x=>s.checks.includes(x as Check)))n.chapter='kestrel';
 else if(e.type==='rescued'&&s.chapter==='kestrel'&&e.state.phase==='won'&&!e.state.core&&allAboard(e.state)){n.chapter='transit';n.crew=[...e.state.aboard];n.loops=e.state.memory.loopCount;}
 else if(e.type==='deploy'&&s.chapter==='transit')n.chapter='lunar';
 else if(e.type==='inspect_site'&&s.chapter==='lunar'&&!s.surfaceSites.includes(e.site)&&(e.site==='ridge'||s.surfaceSites.includes('ridge')))n.surfaceSites=[...s.surfaceSites,e.site];
 else if(e.type==='leave_rover'&&s.chapter==='lunar'&&s.surfaceSites.includes('ridge')&&s.surfaceSites.includes('outpost')){n.roverDeployed=true;n.chapter='return';}
 else if(e.type==='dock_home'&&s.chapter==='return'&&s.roverDeployed){n.returnedToISS=true;n.chapter='monitor';}
 else if(e.type==='survey'&&s.chapter==='monitor'&&s.returnedToISS)n.results=[...s.results,e.result].slice(-12);
 else if(e.type==='finish'&&s.chapter==='monitor'&&s.roverDeployed&&s.returnedToISS&&['LAG_ONLY','PREDICTION'].every(c=>s.results.some(r=>r.condition===c&&r.outcome==='SUCCESS')))n.chapter='ending';
 else return s;
 return n;
}
export function validExpedition(value:unknown):value is Expedition{
 if(!value||typeof value!=='object')return false;const s=value as Expedition;
 if(!(s.schemaVersion===2&&typeof s.id==='string'&&s.id.length>0&&Number.isInteger(s.revision)&&s.revision>=0&&chapters.includes(s.chapter)&&Array.isArray(s.checks)&&s.checks.length<=3&&new Set(s.checks).size===s.checks.length&&s.checks.every(c=>['power','oxygen','rover'].includes(c))&&Array.isArray(s.crew)&&new Set(s.crew).size===s.crew.length&&s.crew.every(x=>['player','engineer','medic','patient','pilot'].includes(x))&&Number.isInteger(s.loops)&&s.loops>=0&&Number.isInteger(s.participant)&&s.participant>0&&Array.isArray(s.results)&&s.results.length<=12&&Array.isArray(s.surfaceSites)&&s.surfaceSites.length<=2&&new Set(s.surfaceSites).size===s.surfaceSites.length&&s.surfaceSites.every(x=>['ridge','outpost'].includes(x))&&typeof s.roverDeployed==='boolean'&&typeof s.returnedToISS==='boolean'))return false;
 if(chapters.indexOf(s.chapter)>=3&&s.checks.length!==3)return false;
 if(chapters.indexOf(s.chapter)>=4&&(s.crew.length!==5||s.loops<1))return false;
 if(s.returnedToISS&&!s.roverDeployed)return false;
 if(s.roverDeployed&&s.surfaceSites.length!==2)return false;
 if(['return','monitor','ending'].includes(s.chapter)&&!s.roverDeployed)return false;
 if(['monitor','ending'].includes(s.chapter)&&!s.returnedToISS)return false;
 if(s.results.length&&!['monitor','ending'].includes(s.chapter))return false;
 if(!s.results.every(r=>r&&['LAG_ONLY','PREDICTION'].includes(r.condition)&&['SUCCESS','TIMEOUT','INVALID'].includes(r.outcome)&&Number.isInteger(r.overshoots)&&Number.isInteger(r.reversals)&&Array.isArray(r.targets)&&r.targets.length===2&&r.targets[0]===(s.participant%2?-20:20)&&r.targets[1]===-r.targets[0]&&Array.isArray(r.perTargetMs)&&r.perTargetMs.every(x=>Number.isFinite(x)&&x>=0&&x<=60000)&&(r.outcome==='SUCCESS'?r.perTargetMs.length===2&&Number.isFinite(r.timeMs)&&r.timeMs! >= 2000&&r.timeMs! <= 60000:r.timeMs===null)))return false;
 return s.chapter!=='ending'||['LAG_ONLY','PREDICTION'].every(c=>s.results.some(r=>r.condition===c&&r.outcome==='SUCCESS'));
}
/** Preserve earlier campaign saves while moving the camera trials to the ISS watch. */
export function migrateExpedition(value:unknown):Expedition|null{
 if(validExpedition(value))return value;
 if(!value||typeof value!=='object'||(value as {schemaVersion?:number}).schemaVersion!==1)return null;
 const old=value as Omit<Expedition,'schemaVersion'>&{schemaVersion:1};const progressed=old.chapter==='ending'||(old.chapter==='lunar'&&Array.isArray(old.results)&&old.results.length>0);
 const upgraded={...old,schemaVersion:2 as const,revision:old.revision+1,chapter:old.chapter==='lunar'&&progressed?'monitor' as const:old.chapter,surfaceSites:progressed?['ridge','outpost']:[],roverDeployed:progressed,returnedToISS:progressed};return validExpedition(upgraded)?upgraded:null;
}
export const checkpointKey='kestrel-recall-expedition-v2';
export function loadExpedition():Expedition|null{try{return migrateExpedition(JSON.parse(localStorage.getItem(checkpointKey)||localStorage.getItem('kestrel-recall-expedition-v1')||'null'));}catch{return null;}}
