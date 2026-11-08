import knowledge from '../../shared/knowledge.json';
import type {State} from './state';
/** Summaries describe the actual ending state of an attempt, never model-inferred discoveries. */
export function summarizeAttempt(s:State):string{
 if(s.phase==='won')return 'All five crew escaped Kestrel Station.';
 const observed=s.events.filter(e=>knowledge.events.includes(e));
 if(!observed.length)return 'No new rescue actions were observed.';
 let conclusion='';
 if(s.bypass===0&&s.oxygen!=='delivered')conclusion='The safe bypass was complete, but Medical had not received portable oxygen.';
 else if(s.oxygen==='delivered'&&s.bypass!==0)conclusion='You delivered oxygen, but the safe bypass was incomplete.';
 else if(s.oxygen==='delivered'&&s.core)conclusion='Medical had oxygen, but the Echo Core was still active.';
 else if(!s.core&&!s.route)conclusion='The Echo Core was off, but the medical route never received power.';
 else if(s.route&&s.oxygen==='delivered'&&s.transfer===null)conclusion='Medical was prepared, but the patient transfer was never started.';
 else if(s.transfer!==null&&s.transfer>0)conclusion='The medical transfer was still underway when the attempt ended.';
 else if(s.transfer===0&&!s.aboard.includes('player'))conclusion='Imani and Eli reached the shuttle, but Alex had not boarded.';
 return conclusion?[observed.at(-1),conclusion].join(' '):observed.slice(-2).join(' ');
}
