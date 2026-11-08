import script from '../../shared/mission-script.json';
export function missionLine(id:keyof typeof script):string {
 const line=script[id];return `${line.speaker} · ${line.text}`;
}
