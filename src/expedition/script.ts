import type {Chapter} from './state';
import type {RadioSpeaker} from '../audio/radio';
export const expeditionScript:Record<Chapter,{speaker:RadioSpeaker;text:string}[]>={
 earth:[{speaker:'ECHO',text:'Good morning, Alex. Five crew, one Scout rover, and a mission beyond Earth. Sam is waiting for your launch clearance.'}],
 launch:[{speaker:'SAM',text:'Crew strapped in. Engines ready. First stop, the International Space Station. Let’s go.'}],
 iss:[{speaker:'IMANI',text:'Welcome aboard the ISS. Let’s check life support before we head any farther.'},{speaker:'MARA',text:'I’ll handle flight power. Alex, come meet our smallest crew member at the rover bay.'},{speaker:'ECHO',text:'That’s Scout. Its camera and learning model will be our eyes when we leave it exploring on the Moon.'}],
 kestrel:[],
 transit:[{speaker:'MARA',text:'Five crew recovered. I didn’t rebuild that power bus so we could turn back now.'},{speaker:'IMANI',text:'Eli is recovering. After resupply, we can safely continue to the Moon.'},{speaker:'SAM',text:'Scout is secured in the hold. Next stop, the lunar surface.'}],
 lunar:[{speaker:'SAM',text:'Landed. Scout is rolling out beside you, Alex. Survey the ridge, then set up its research outpost.'},{speaker:'ECHO',text:'We’ll leave Scout here to gather observations. The crew will return to the ISS and operate its camera over the delayed link.'}],
 return:[{speaker:'ECHO',text:'Scout’s outpost is ready. It stays on the Moon, collecting observations after we leave.'},{speaker:'SAM',text:'All five crew aboard. Setting course back to the ISS. Scout, we’ll see you over the radio.'}],
 monitor:[{speaker:'SAM',text:'Docking complete. Welcome back to the ISS.'},{speaker:'ECHO',text:'Scout is still on the Moon. Commands and camera frames arrive late. Let’s compare the delayed view with our predicted camera motion.'},{speaker:'MARA',text:'The model learns from returned observations. It helps us aim now, but can’t remove the signal delay or show us unseen terrain.'}],
 ending:[{speaker:'ELI',text:'Both research beacons confirmed from the ISS. Scout can keep gathering observations while we plan the next expedition.'},{speaker:'IMANI',text:'Five crew safe. One little explorer still working out there.'},{speaker:'ECHO',text:'I remember every attempt. This is the one where we made it. And Scout’s journey is only beginning.'}],
};
