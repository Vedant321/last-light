import {missionLine} from './script';
import {summarizeAttempt} from './memory';
export type Place = 'hub' | 'engineering' | 'medical' | 'docking';
export type Action = 'inspect'|'battery'|'connect'|'bypass'|'oxygen'|'deliver'|'shutdown'|'power'|'transfer'|'board'|'launch';
export type Memory = {schemaVersion:1; loopCount:number; facts:string[]; summaries:string[]};
export type State = {
 runId:string; loopId:string; revision:number; mode:'normal'|'demo'; phase:'playing'|'won'|'failed'; remaining:number;
 place:Place; travel: {to:Place; remaining:number}|null; core:boolean; inspected:boolean; battery:'cabinet'|'carried'|'installed'; oxygen:'locker'|'carried'|'delivered';
 bypass:number|null; engineerTravel:number|null; route:boolean; transfer:number|null; aboard:string[];
 memory:Memory; events:string[]; processed:string[]; message:string;
};
export function allAboard(s:Pick<State,'aboard'>):boolean{return ['player','engineer','medic','patient','pilot'].every(id=>s.aboard.includes(id));}
export const emptyMemory = ():Memory => ({schemaVersion:1,loopCount:1,facts:[],summaries:[]});
export function initial(mode:State['mode']='normal', memory=emptyMemory(), runId:string=crypto.randomUUID()):State {
 return {runId,loopId:crypto.randomUUID(),revision:0,mode,phase:'playing',remaining:mode==='demo'?180:480,place:'hub',travel:null,core:true,inspected:false,battery:'cabinet',oxygen:'locker',bypass:null,engineerTravel:null,route:false,transfer:null,aboard:['pilot'],memory,events:[],processed:[],message:missionLine('line_01')};
}
export const actionInfo:Record<Action,{place:Place; label:string}> = {
 inspect:{place:'hub',label:'Inspect maintenance cabinet'},battery:{place:'hub',label:'Take auxiliary battery'},connect:{place:'engineering',label:'Connect hatch supply'},bypass:{place:'engineering',label:'Ask Mara to install bypass'},oxygen:{place:'docking',label:'Collect portable oxygen'},deliver:{place:'medical',label:'Deliver oxygen through port'},shutdown:{place:'hub',label:'Hold to shut down Echo Core'},power:{place:'medical',label:'Power medical route'},transfer:{place:'medical',label:'Begin patient transfer'},board:{place:'docking',label:'Board shuttle'},launch:{place:'docking',label:'Authorize launch'}
};
export function block(s:State,a:Action):string|null {
 if(s.phase!=='playing'||s.remaining<=0)return 'The mission has ended.';
 if(s.travel)return 'Arrive at the compartment first.';
 if(s.place!==actionInfo[a].place)return `Go to ${actionInfo[a].place} to use this control.`;
 switch(a){
 case'inspect':return s.inspected?'Cabinet inspected. The isolated battery is usable.':null;
 case'battery':return !s.inspected?'Inspect the cabinet first.':s.battery!=='cabinet'?'The battery has already been collected.':null;
 case'connect':return s.battery!=='carried'?(s.battery==='installed'?'The hatch is already powered.':'Collect the auxiliary battery from Communications.'):null;
 case'bypass':return s.battery!=='installed'?'Mara is behind the unpowered hatch.':s.bypass!==null?'Bypass installation has already started.':null;
 case'oxygen':return s.oxygen!=='locker'?'Portable oxygen has already been collected.':null;
 case'deliver':return s.oxygen!=='carried'?(s.oxygen==='delivered'?'Medical has portable oxygen.':'Collect oxygen at the docking locker.'):null;
 case'shutdown':return !s.core?'Echo Core is already offline.':s.bypass!==0?'Shutdown interlocked: Mara must finish the safe bypass.':null;
 case'power':return s.core?'Echo Core still uses the required 40 units.':s.bypass!==0?'The safe bypass is incomplete.':s.route?'The route is already powered.':null;
 case'transfer':return !s.route?'Power the medical route first.':s.oxygen!=='delivered'?'Imani needs portable oxygen before moving Eli.':s.transfer!==null?'Patient transfer has already started.':null;
 case'board':return s.aboard.includes('player')?'You are already aboard.':null;
 case'launch':return s.core?'Echo Core must be shut down before launch.':!allAboard(s)?'Launch blocked: all five crew must be aboard.':null;
 }
}
const facts:Partial<Record<Action,string>> = {inspect:'The maintenance cabinet holds a usable isolated 20-unit hatch battery.',connect:'The auxiliary battery opens Engineering; it cannot power Medical.',bypass:'Mara can install a safe bypass; it must be rebuilt after each reset.',oxygen:'Portable oxygen is in the docking locker.',deliver:'Imani needs portable oxygen before transferring Eli.',shutdown:'Shutting down the Echo Core releases 40 units and ends in-world resets.',power:'The medical route and transfer support require the released 40 units.'};
export type Command = {type:'act';action:Action;id:string;loopId:string;runId:string}|{type:'tick';dt:number}|{type:'travel';to:Place}|{type:'disembark'}|{type:'arrive';place:Place}|{type:'reset'};
export function reset(s:State):State {
 const observation=summarizeAttempt(s);
 const memory={...s.memory,loopCount:s.memory.loopCount+1,summaries:[...s.memory.summaries,observation].slice(-3)};
 const n=initial(s.mode,memory,s.runId); n.message=`ECHO · Previous attempt: ${observation} Physical repairs and equipment have reset.`;return n;
}
export function reduce(s:State,c:Command):State {
 if(c.type==='reset')return reset(s);
 if(s.phase!=='playing')return s;
 if(c.type==='disembark')return {...s,aboard:s.aboard.filter(id=>id!=='player')};
 if(c.type==='arrive'){return {...s,place:c.place,travel:null,aboard:c.place==='docking'?s.aboard:s.aboard.filter(id=>id!=='player')};}
 if(c.type==='travel'){
  if(s.travel||c.to===s.place)return s;
  return {...s,aboard:s.aboard.filter(id=>id!=='player'),travel:{to:c.to,remaining:s.mode==='demo'?2:(s.place==='hub'||c.to==='hub'?8:16)},revision:s.revision+1};
 }
 if(c.type==='tick'){
  if(!Number.isFinite(c.dt)||c.dt<=0)return s;
  if(c.dt>1){let next=s;let remaining=c.dt;while(remaining>0&&next.loopId===s.loopId&&next.phase==='playing'){const step=Math.min(remaining,1);next=reduce(next,{type:'tick',dt:step});remaining-=step;}return next;}
  const dt=c.dt; const n={...s,remaining:Math.max(0,s.remaining-dt),revision:s.revision+1,aboard:[...s.aboard]};
  if(s.travel){n.travel={...s.travel,remaining:Math.max(0,s.travel.remaining-dt)};if(n.travel.remaining===0){n.place=n.travel.to;n.travel=null;}}
  if(s.bypass!==null&&s.bypass>0){n.bypass=Math.max(0,s.bypass-dt);if(n.bypass===0){n.engineerTravel=s.mode==='demo'?3:10;n.events=[...s.events,'Mara completed the safe bypass.'];n.message=missionLine('line_02');}}
  if(s.engineerTravel!==null&&s.engineerTravel>0){n.engineerTravel=Math.max(0,s.engineerTravel-dt);if(n.engineerTravel===0&&!n.aboard.includes('engineer')){n.aboard.push('engineer');n.message=missionLine('line_03');}}
  if(s.transfer!==null&&s.transfer>0){n.transfer=Math.max(0,s.transfer-dt);if(n.transfer===0){n.aboard.push('medic','patient');n.events=[...n.events,'Imani and Eli reached the shuttle.'];n.message=missionLine('line_04');}}
  if(n.remaining===0){if(n.core)return reset({...n,events:[...n.events,'The deadline expired with the Echo Core active.']});n.phase='failed';n.message='The station is lost. Echo Core is offline; no timeline restoration is possible.';}
  return n;
 }
 if(c.loopId!==s.loopId||c.runId!==s.runId||s.processed.includes(c.id))return s;
 const reason=block(s,c.action); if(reason)return {...s,message:`ECHO · ${reason}`,processed:[...s.processed,c.id].slice(-100)};
 const n={...s,revision:s.revision+1,events:[...s.events],aboard:[...s.aboard],processed:[...s.processed,c.id].slice(-100),memory:{...s.memory,facts:[...s.memory.facts]}};
 const fact=facts[c.action];if(fact&&!n.memory.facts.includes(fact))n.memory.facts.push(fact);
 const say=(text:string,event?:string)=>{n.message=text;if(event)n.events.push(event);};
 switch(c.action){
 case'inspect':n.inspected=true;say(missionLine('line_05'),'You inspected the isolated auxiliary battery.');break;
 case'battery':n.battery='carried';say(missionLine('line_06'));break;
 case'connect':n.battery='installed';say(missionLine('line_07'),'You opened Engineering with the auxiliary battery.');break;
 case'bypass':n.bypass=s.mode==='demo'?5:25;say(missionLine('line_08'),'You started Mara’s bypass installation.');break;
 case'oxygen':n.oxygen='carried';say(missionLine('line_09'),'You collected portable oxygen at Docking.');break;
 case'deliver':n.oxygen='delivered';say(missionLine('line_10'),'You delivered oxygen to Imani.');break;
 case'shutdown':n.core=false;say(missionLine('line_11'),'You shut down the Echo Core.');break;
 case'power':n.route=true;say(missionLine('line_12'),'You powered the medical route.');break;
 case'transfer':n.transfer=s.mode==='demo'?5:20;say(missionLine('line_13'),'You began the medical transfer.');break;
 case'board':n.aboard.push('player');say(missionLine('line_14'));break;
 case'launch':n.phase='won';say(missionLine('line_15'),'All five crew escaped Kestrel Station.');break;
 }
 return n;
}
export function objective(s:State):string {
 if(s.battery!=='installed')return 'Reach Engineering';if(s.bypass===null)return 'Coordinate with Mara';if(s.oxygen!=='delivered')return 'Prepare Medical oxygen';if(s.bypass!==0)return 'Wait for the safe bypass';if(s.core)return 'Commit at the Echo Core';if(!s.route)return 'Power the Medical route';if(s.transfer===null)return 'Begin patient transfer';if(!s.aboard.includes('player'))return 'Reach the shuttle';if(!allAboard(s))return 'Await remaining crew';return 'Authorize launch';
}
export function reply(s:State,text:string):string {
 if(/remember|last|previous|miss/i.test(text))return s.memory.summaries.length?`Previous attempt: ${s.memory.summaries.at(-1)} Repairs did not survive the reset.`:s.memory.facts.length?`Remembered discovery: ${s.memory.facts.at(-1)} Equipment and repairs still depend on this attempt.`:'I have no observations from a previous attempt. Your notebook will preserve what you discover.';
 if(/bypass.*still|still.*bypass/i.test(text))return s.bypass===0?'The bypass is complete in this attempt.':'Mara must install the bypass in this attempt. Remembering a repair does not restore it.';
 if(/open every|ignore|infinite|extra power/i.test(text))return 'I cannot override the physical interlocks. '+hint(s);
 return hint(s);
}
export function hint(s:State):string {
 if(!s.inspected)return 'Engineering is isolated from the main bus. Inspect the maintenance cabinet at Communications.';
 if(s.battery==='cabinet')return 'The inspected battery is usable. Collect it from the cabinet.';
 if(s.battery==='carried')return 'Connect the battery to the Engineering hatch socket.';
 if(s.bypass===null)return 'Mara is reachable. Ask her to install the safe bypass at Engineering.';
 if(s.oxygen==='locker')return 'Sam reports portable oxygen in the docking locker. Collect it while Mara works.';
 if(s.oxygen==='carried')return 'Deliver your oxygen tank through the Medical transfer port.';
 if(s.bypass!==0)return 'Medical has oxygen. Mara is still installing the bypass; shutdown remains interlocked.';
 if(s.core)return 'The bypass is ready. At Communications, hold the Echo Core shutdown control. This ends rewind.';
 if(!s.route)return 'The released core power can now supply the Medical route. Use its power control.';
 if(s.transfer===null)return 'Oxygen and power are ready. Begin the transfer at Medical.';
 return allAboard(s)?'All five crew are aboard. Authorize launch at Docking.':'The crew transfer is underway. Reach Docking and board the shuttle.';
}
