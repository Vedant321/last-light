import type {State} from './state';
export type Incident={id:string;speaker:string;text:string;alarm:boolean};
export function incidentAt(s:Pick<State,'mode'|'remaining'|'phase'>):Incident|null{
 if(s.phase!=='playing')return null;
 const duration=s.mode==='demo'?180:480,elapsed=duration-s.remaining;
 const opening=[
  {speaker:'ECHO',text:'Debris strike confirmed. Hull integrity falling. Emergency evacuation is in effect.'},
  {speaker:'MARA',text:'Alex! My hatch is dead. I’m trapped in Engineering—can you hear me?'},
  {speaker:'IMANI',text:'Medical here. Eli cannot walk. We need help getting him out.'},
  {speaker:'SAM',text:'Shuttle reserve is intact. I’m holding the ramp. Bring them home.'}
 ];
 if(elapsed<12){const i=Math.max(0,Math.floor(elapsed/3));return {id:`opening-${i}`,...opening[i],alarm:i===0};}
 const warnings=[{fraction:.25,text:'New impact damage. Pressure is falling in the outer sections.'},{fraction:.5,text:'Station integrity is deteriorating. Keep the rescue moving.'},{fraction:.75,text:'Critical structural damage. Evacuation is now the only safe route.'},{fraction:.875,text:'Final evacuation call. Get everyone aboard the shuttle.'}];
 for(let i=warnings.length-1;i>=0;i--){const at=duration*warnings[i].fraction;if(elapsed>=at&&elapsed<at+8)return {id:`warning-${i}`,speaker:'ECHO',text:warnings[i].text,alarm:true};}
 return null;
}
