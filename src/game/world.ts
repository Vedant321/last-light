import type {Action, Place, State} from './state';
export type Point={x:number;y:number};
export type Target=Point&{id:string;label:string;place:Place;action:Action;kind:'cabinet'|'socket'|'crew'|'oxygen'|'core'|'medical'|'shuttle'};
export const SPAWN:Point={x:800,y:490};
export function targets(s:State):Target[]{return [
 {id:'cabinet',x:690,y:395,place:'hub',action:s.inspected?'battery':'inspect',label:s.inspected?'Take the battery':'Inspect the cabinet',kind:'cabinet'},
 {id:'socket',x:530,y:400,place:'engineering',action:'connect',label:'Connect hatch battery',kind:'socket'},
 {id:'mara',x:300,y:455,place:'engineering',action:'bypass',label:'Talk to Mara',kind:'crew'},
 {id:'oxygen',x:1090,y:930,place:'docking',action:'oxygen',label:'Collect portable oxygen',kind:'oxygen'},
 {id:'imani',x:1070,y:400,place:'medical',action:'deliver',label:'Give Imani the oxygen',kind:'medical'},
 {id:'core',x:905,y:400,place:'hub',action:'shutdown',label:'Shut down Echo Core',kind:'core'},
 {id:'power',x:1080,y:470,place:'medical',action:'power',label:'Restore Medical power',kind:'socket'},
 {id:'transfer',x:1280,y:430,place:'medical',action:'transfer',label:'Help Imani move Eli',kind:'medical'},
 {id:'shuttle',x:850,y:1000,place:'docking',action:s.aboard.includes('player')?'launch':'board',label:s.aboard.includes('player')?'Launch with everyone':'Board the shuttle',kind:'shuttle'}
 ].filter(t=>!(t.id==='cabinet'&&s.battery!=='cabinet')&&!(t.id==='socket'&&s.battery==='installed')&&!(t.id==='mara'&&s.bypass!==null)&&!(t.id==='oxygen'&&s.oxygen!=='locker')&&!(t.id==='imani'&&s.oxygen==='delivered')&&!(t.id==='core'&&!s.core)&&!(t.id==='power'&&s.route)&&!(t.id==='transfer'&&s.transfer!==null)) as Target[];}
export function nextTarget(s:State):string|null {if(!s.inspected||s.battery==='cabinet')return 'cabinet';if(s.battery==='carried')return 'socket';if(s.bypass===null)return 'mara';if(s.oxygen==='locker')return 'oxygen';if(s.oxygen==='carried')return 'imani';if(s.bypass!==0)return null;if(s.core)return 'core';if(!s.route)return 'power';if(s.transfer===null)return 'transfer';return 'shuttle'}
export function instruction(s:State):{title:string;detail:string}{const id=nextTarget(s);switch(id){
 case'cabinet':return {title:s.inspected?'Take the auxiliary battery':'Find the maintenance cabinet',detail:'The glowing cabinet is beside Communications. Walk over to it.'};
 case'socket':return {title:'Bring power to Engineering',detail:'Carry the battery left to the flashing hatch socket.'};
 case'mara':return {title:'Talk to Mara inside Engineering',detail:'The hatch is open. Ask her to build the safe bypass.'};
 case'oxygen':return {title:'Pick up portable oxygen',detail:'Mara is working. Follow the corridor down to the Docking locker.'};
 case'imani':return {title:'Bring the oxygen to Imani',detail:'Head back up, then right. She can receive it through the Medical window.'};
 case'core':return {title:'Return to the Echo Core',detail:'The bypass is ready. Shutdown releases Medical power and ends rewind.'};
 case'power':return {title:'Switch on the Medical route',detail:'Use the blue power panel outside Medical.'};
 case'transfer':return {title:'Get Imani and Eli moving',detail:'Enter Medical and help at the patient’s bedside.'};
 case'shuttle':return {title:s.aboard.includes('player')?'Bring everyone home':'Make your way to the shuttle',detail:s.aboard.includes('player')?(s.aboard.length===5?'Everyone is aboard. You can launch.':'Your crew are on their way. Wait for everyone to board.'):'Follow the lights down to Docking. Your crew will meet you there.'};
 default:return {title:'Mara is securing the bypass',detail:'You’ve delivered the oxygen. Watch her progress in Engineering.'};}}
export function location(p:Point):Place{return p.y>650?'docking':p.x<600?'engineering':p.x>1010?'medical':'hub'}
const inside=(p:Point,x:number,y:number,w:number,h:number)=>p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h;
export function walkable(p:Point,s:Pick<State,'battery'|'route'>):boolean{return inside(p,620,230,360,350)||inside(p,480,365,640,80)||inside(p,770,570,80,210)||inside(p,620,760,540,290)||(s.battery==='installed'&&inside(p,100,250,390,300))||(s.route&&inside(p,1120,250,360,300))||inside(p,1020,380,80,115)}
export function pathfind(start:Point,end:Point,s:Pick<State,'battery'|'route'>):Point[]{
 const size=20;const key=(x:number,y:number)=>`${x},${y}`;const sx=Math.round(start.x/size),sy=Math.round(start.y/size),ex=Math.round(end.x/size),ey=Math.round(end.y/size);
 const queue:[[number,number]]|[number,number][]=[[sx,sy]];const visited=new Map<string,string|null>([[key(sx,sy),null]]);let found:string|null=null;
 for(let i=0;i<queue.length&&i<6000;i++){const [x,y]=queue[i];if(x===ex&&y===ey){found=key(x,y);break}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(!visited.has(k)&&walkable({x:nx*size,y:ny*size},s)){visited.set(k,key(x,y));queue.push([nx,ny])}}}
 if(!found)return [];const result:Point[]=[];let cur:string|null=found;while(cur){const [x,y]=cur.split(',').map(Number);result.push({x:x*size,y:y*size});cur=visited.get(cur)??null}return result.reverse().slice(1);
}
