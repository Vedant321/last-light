import {useSyncExternalStore} from 'react';
export type AudioPreferences={muted:boolean;voice:boolean;voiceVolume:number;musicVolume:number;effectsVolume:number};
const read=(key:string,fallback:unknown)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback;}};
let preferences:AudioPreferences={muted:read('last-light-muted',false),voice:read('last-light-voice',true),voiceVolume:read('last-light-voice-volume',.8),musicVolume:read('kestrel-music-volume',.24),effectsVolume:read('last-light-volume',.45)};
const listeners=new Set<()=>void>();
export function setAudioPreferences(update:Partial<AudioPreferences>){const next={...preferences,...update};if(JSON.stringify(next)===JSON.stringify(preferences))return;preferences=next;try{for(const [key,value] of Object.entries({ 'last-light-muted':next.muted,'last-light-voice':next.voice,'last-light-voice-volume':next.voiceVolume,'kestrel-music-volume':next.musicVolume,'last-light-volume':next.effectsVolume}))localStorage.setItem(key,JSON.stringify(value));}catch{}for(const listener of listeners)listener();}
export function useAudioPreferences(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);}},()=>preferences,()=>preferences);}
