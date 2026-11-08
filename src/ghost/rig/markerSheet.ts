import aruco from 'js-aruco2';
import './markerSheet.css';
import { MARKER_DICTIONARY, MARKER_LABELS } from './markerTracker';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root missing');
const dictionary = new aruco.AR.Dictionary(MARKER_DICTIONARY);
root.innerHTML = `
  <main class="marker-sheet">
    <nav><a href="/hardware.html">← Back to hardware check</a><button id="print-markers">Print markers</button></nav>
    <h1>Scout camera markers · Ghost Frame</h1>
    <p>Print these three square codes or show them on a second screen. Keep each code flat with a white border. The letters are for people; the camera reads the black-and-white code.</p>
    <div class="marker-grid">${Object.entries(MARKER_LABELS).map(([id, label]) => `
      <article class="marker-card"><h2>${label}</h2><div class="marker-image">${dictionary.generateSVG(Number(id))}</div><p>Marker ID ${id} · ${MARKER_DICTIONARY}</p></article>`).join('')}</div>
    <p>Place the cards at fixed positions facing the camera. Later we must measure each card's actual distance and sideways position; the letters alone cannot tell us the camera angle.</p>
  </main>`;
document.querySelector<HTMLButtonElement>('#print-markers')!.addEventListener('click', () => window.print());
