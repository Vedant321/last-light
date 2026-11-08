import '../styles.css';
import './diagnostic.css';
import { UPLINK_MS } from '../config';
import { DelayedCamera } from './cameraDelay';
import { MARKER_LABELS, MarkerTracker } from './markerTracker';
import { RigSerial, webSerialAvailable } from './serial';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root missing');
root.innerHTML = `
  <main class="rig-check">
    <a class="back" href="/">← Back to game</a>
    <span class="eyebrow">KESTREL RECALL · SCOUT HARDWARE LAB</span>
    <h1>Check the Arduino connection</h1>
    <p>Ghost Frame connection diagnostics: real knob, button, unloaded servo, and camera. This lab is separate from Scout’s simulated campaign survey and does not run calibrated hardware trials.</p>
    <section class="card" aria-label="Connection">
      <h2>1 · Connect</h2>
      <p>Upload <a href="https://github.com/Vedant321/last-light/blob/main/firmware/light_delay/light_delay.ino" target="_blank" rel="noreferrer">firmware/light_delay/light_delay.ino</a> first. It needs the Seeed Studio Grove LCD RGB Backlight library. Close the Arduino Serial Monitor, then connect the Metro by USB.</p>
      <button id="connect">Connect Arduino</button><button id="disconnect" disabled>Disconnect</button>
      <p id="status" role="status">Waiting to connect</p>
    </section>
    <section class="card" aria-label="Inputs">
      <h2>2 · Try the controls</h2>
      <div class="readouts"><p>Rotary knob <strong id="knob">—</strong></p><p>Button <strong id="button">—</strong></p><p>Last motor command <strong id="ack">—</strong></p></div>
      <p>Turn the knob and press the button. Their values should change here. The knob only displays its value in this check; it does not move the servo.</p>
    </section>
    <section class="card" aria-label="Servo">
      <h2>3 · Move the unloaded servo</h2>
      <p>Keep the horn clear. Click one position at a time. These are absolute targets: clicking the same position twice sends two commands, but the servo has nowhere new to move on the second click. Each acknowledgement means the target was accepted, not that the servo reached it.</p>
      <div class="positions"><button data-angle="-20" disabled>Command −20°</button><button data-angle="0" disabled>Centre 0°</button><button data-angle="20" disabled>Command +20°</button></div>
      <p id="movement" role="status">No command sent</p>
    </section>
    <section class="card" aria-label="Camera">
      <h2>4 · Check the phone camera</h2>
      <p>Connect the phone as a webcam to this laptop first. Keep it off the servo for now. Click Start camera to allow Chrome access, then choose the phone camera from the list and click Switch camera if needed.</p>
      <label for="camera-list">Camera</label>
      <select id="camera-list"><option value="">Default camera</option></select>
      <button id="camera-start">Start camera</button><button id="camera-stop" disabled>Stop camera</button>
      <p id="camera-status" role="status">Camera not started</p>
      <div class="camera-pair">
        <div><h3>Live browser view</h3><video id="camera-live" autoplay muted playsinline></video></div>
        <div><h3>Delayed by 1.3 s</h3><canvas id="camera-delayed" width="640" height="480"></canvas></div>
      </div>
      <p>Wave your hand or show a running stopwatch. The right image should change about 1.3 seconds after the left image. This is added browser delay; the phone camera may have extra delay of its own.</p>
      <p>Delayed image age from browser capture: <strong id="camera-age">—</strong></p>
    </section>
    <section class="card" aria-label="Command delay">
      <h2>5 · Check the command delay</h2>
      <p>Keep the servo unloaded. Click one target below. The browser waits 1.3 seconds before sending it to the Metro. Only one delayed command can be waiting at a time.</p>
      <div class="positions"><button data-delayed-angle="-20" disabled>Delay −20°</button><button data-delayed-angle="0" disabled>Delay 0°</button><button data-delayed-angle="20" disabled>Delay +20°</button></div>
      <p id="delayed-status" role="status">Connect Arduino to test the delay.</p>
      <p>This checks the command path only. The phone camera can stay off the servo; no real camera angle is measured yet.</p>
    </section>
    <section class="card" aria-label="Marker tracking">
      <h2>6 · Check the square markers</h2>
      <p><a href="/markers.html" target="_blank" rel="noopener">Open the printable marker sheet ↗</a>. Show one card to the phone camera while it is off the servo. The box below should name CENTRE, A, or B and outline the code it sees.</p>
      <canvas id="marker-preview" width="640" height="480" aria-label="Live marker tracking preview"></canvas>
      <p id="marker-status" role="status">Start the camera in step 4 to check markers.</p>
      <p>This is detection only. We will measure the cards' real positions and calibrate the lens before reporting a camera angle or scoring a real trial.</p>
    </section>
    <p class="power-note"><strong>Power:</strong> Your USB → Metro 5 V setup passed an unloaded swing test. Before adding a phone or dummy weight, use an appropriate separate servo supply with a shared ground. A reset, flickering LCD, or dropped connection means stop the loaded test.</p>
  </main>`;

const connectButton = document.querySelector<HTMLButtonElement>('#connect')!;
const disconnectButton = document.querySelector<HTMLButtonElement>('#disconnect')!;
const status = document.querySelector<HTMLElement>('#status')!;
const movement = document.querySelector<HTMLElement>('#movement')!;
const cameraSelect = document.querySelector<HTMLSelectElement>('#camera-list')!;
const cameraStart = document.querySelector<HTMLButtonElement>('#camera-start')!;
const cameraStop = document.querySelector<HTMLButtonElement>('#camera-stop')!;
const cameraStatus = document.querySelector<HTMLElement>('#camera-status')!;
const cameraAge = document.querySelector<HTMLElement>('#camera-age')!;
const cameraVideo = document.querySelector<HTMLVideoElement>('#camera-live')!;
const markerPreview = document.querySelector<HTMLCanvasElement>('#marker-preview')!;
const markerContext = markerPreview.getContext('2d')!;
const markerStatus = document.querySelector<HTMLElement>('#marker-status')!;
const markerTracker = new MarkerTracker();
let markerTimer: number | null = null;
let cameraStarting = false;
const camera = new DelayedCamera(
  cameraVideo,
  document.querySelector<HTMLCanvasElement>('#camera-delayed')!,
  age => {
    cameraAge.textContent = age === null ? '—' : `${(age / 1000).toFixed(2)} s`;
    if (age !== null && cameraStatus.textContent?.includes('filling'))
      cameraStatus.textContent = 'Live and delayed camera views are running.';
  },
  () => { stopMarkerCheck(); cameraStart.disabled = false; cameraStart.textContent = 'Start camera'; cameraStop.disabled = true; cameraStatus.textContent = 'Camera disconnected. Reconnect it and click Start camera.'; },
);
function stopMarkerCheck(): void {
  if (markerTimer !== null) window.clearInterval(markerTimer);
  markerTimer = null;
  markerContext.clearRect(0, 0, markerPreview.width, markerPreview.height);
  markerStatus.textContent = 'Start the camera in step 4 to check markers.';
}
function checkMarkers(): void {
  if (!camera.active || cameraVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  const width = cameraVideo.videoWidth, height = cameraVideo.videoHeight;
  if (!width || !height) return;
  if (markerPreview.width !== width || markerPreview.height !== height) {
    markerPreview.width = width;
    markerPreview.height = height;
  }
  markerContext.drawImage(cameraVideo, 0, 0, width, height);
  try {
    const pixels = markerContext.getImageData(0, 0, width, height).data;
    const markers = markerTracker.detect(width, height, pixels);
    for (const marker of markers) {
      markerContext.strokeStyle = '#8cf4de';
      markerContext.lineWidth = 3;
      markerContext.beginPath();
      marker.corners.forEach((corner, index) => index ? markerContext.lineTo(corner.x, corner.y) : markerContext.moveTo(corner.x, corner.y));
      markerContext.closePath(); markerContext.stroke();
      markerContext.fillStyle = '#8cf4de';
      markerContext.font = 'bold 22px sans-serif';
      markerContext.fillText(`${MARKER_LABELS[marker.id]} · ID ${marker.id}`, marker.x + 8, Math.max(24, marker.y - 12));
    }
    markerStatus.textContent = markers.length
      ? `Seen now: ${markers.map(marker => `${MARKER_LABELS[marker.id]} (ID ${marker.id}, x ${marker.x.toFixed(0)} px)`).join(' · ')}`
      : 'No known marker in this frame. Keep the full square flat and visible.';
  } catch (error) {
    markerStatus.textContent = error instanceof Error ? error.message : String(error);
  }
}
function startMarkerCheck(): void {
  stopMarkerCheck();
  markerStatus.textContent = 'Looking for CENTRE, A, or B…';
  markerTimer = window.setInterval(checkMarkers, 250);
}
let acceptedCount = 0;
const angleButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-angle]')];
const delayedButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-delayed-angle]')];
const delayedStatus = document.querySelector<HTMLElement>('#delayed-status')!;
let pendingDelay: { angle: number; tIssued: number; tScheduled: number } | null = null;
let delayedAnimation: number | null = null;
let waitingForDelayedAck = false;
let delayedGeneration = 0;
const showDelayedButtons = (connected: boolean): void => {
  const busy = pendingDelay !== null || waitingForDelayedAck;
  delayedButtons.forEach(button => { button.disabled = !connected || busy; });
  angleButtons.forEach(button => { button.disabled = !connected || busy; });
};
const cancelDelayed = (reason: string): void => {
  const alreadySent = waitingForDelayedAck;
  delayedGeneration++;
  if (delayedAnimation !== null) cancelAnimationFrame(delayedAnimation);
  delayedAnimation = null;
  pendingDelay = null;
  waitingForDelayedAck = false;
  delayedStatus.textContent = `${reason} ${alreadySent ? 'The command was already sent and may still move the servo.' : 'The waiting command was not sent.'}`;
  showDelayedButtons(false);
};
const setConnected = (connected: boolean): void => {
  connectButton.disabled = connected;
  disconnectButton.disabled = !connected;
  showDelayedButtons(connected);
};
const serial = new RigSerial(message => {
  if (message.type === 'ready') {
    if (pendingDelay || waitingForDelayedAck) {
      cancelDelayed('Arduino restarted.');
      showDelayedButtons(serial.connected);
    }
    status.textContent = 'Arduino ready (protocol version 1)';
    document.querySelector<HTMLElement>('#ack')!.textContent = '—';
  } else if (message.type === 'knob') {
    if (status.textContent?.includes('Waiting') || status.textContent?.includes('USB connected'))
      status.textContent = 'Receiving knob and button readings';
    document.querySelector<HTMLElement>('#knob')!.textContent = String(message.raw);
    document.querySelector<HTMLElement>('#button')!.textContent = message.pressed ? 'PRESSED' : 'released';
  } else {
    document.querySelector<HTMLElement>('#ack')!.textContent = `${message.angleDeg > 0 ? '+' : ''}${message.angleDeg}°`;
  }
}, reason => {
  cancelDelayed('Connection ended.');
  setConnected(false);
  status.textContent = reason;
  movement.textContent = 'Connection ended; reconnect before moving.';
});

if (!webSerialAvailable()) {
  connectButton.disabled = true;
  status.textContent = 'Web Serial unavailable. Open this page in desktop Chrome on localhost.';
}
connectButton.addEventListener('click', () => {
  status.textContent = 'Choose your Metro/Arduino port…';
  // connect() invokes requestPort before its first await, in this click gesture.
  void serial.connect().then(() => {
    setConnected(true);
    acceptedCount = 0;
    status.textContent = 'USB connected. Turn the knob to check incoming readings.';
    delayedStatus.textContent = 'Ready. Click one delayed target.';
  }).catch(error => { status.textContent = error instanceof Error ? error.message : String(error); });
});
disconnectButton.addEventListener('click', () => { cancelDelayed('Disconnected.'); void serial.disconnect('Disconnected by user'); });
window.addEventListener('pagehide', () => { cancelDelayed('Page closed.'); void serial.disconnect('Page closed'); stopMarkerCheck(); camera.stop(); });
for (const button of angleButtons) {
  button.addEventListener('click', () => {
    const angle = Number(button.dataset.angle);
    movement.textContent = `Sending ${angle > 0 ? '+' : ''}${angle}°…`;
    void serial.sendAngle(angle).then(() => {
      acceptedCount++;
      movement.textContent = `Command ${acceptedCount} accepted: target ${angle > 0 ? '+' : ''}${angle}°. Repeating the same target will not cause new movement.`;
    }).catch(error => { movement.textContent = error instanceof Error ? error.message : String(error); });
  });
}
function updatePendingDelay(): void {
  const pending = pendingDelay;
  if (!pending) return;
  const now = performance.now();
  const remaining = pending.tScheduled - now;
  if (remaining > 0) {
    delayedStatus.textContent = `Command ${pending.angle > 0 ? '+' : ''}${pending.angle}° waiting: ${(remaining / 1000).toFixed(2)} s left.`;
    delayedAnimation = requestAnimationFrame(updatePendingDelay);
    return;
  }
  pendingDelay = null;
  delayedAnimation = null;
  if (!serial.connected || now - pending.tScheduled > 250) {
    delayedStatus.textContent = 'The page stalled or disconnected. Old command cancelled; nothing was sent.';
    showDelayedButtons(serial.connected);
    return;
  }
  waitingForDelayedAck = true;
  const generation = ++delayedGeneration;
  delayedStatus.textContent = `Sent ${pending.angle > 0 ? '+' : ''}${pending.angle}° after ${((now - pending.tIssued) / 1000).toFixed(2)} s; waiting for Metro acknowledgement…`;
  void serial.sendAngle(pending.angle).then(() => {
    if (generation !== delayedGeneration) return;
    waitingForDelayedAck = false;
    delayedStatus.textContent = `Metro accepted ${pending.angle > 0 ? '+' : ''}${pending.angle}°; sent after ${((now - pending.tIssued) / 1000).toFixed(2)} s.`;
    showDelayedButtons(serial.connected);
  }).catch(error => {
    if (generation !== delayedGeneration) return;
    waitingForDelayedAck = false;
    delayedStatus.textContent = error instanceof Error ? error.message : String(error);
    showDelayedButtons(serial.connected);
  });
}
for (const button of delayedButtons) {
  button.addEventListener('click', () => {
    if (!serial.connected || pendingDelay || waitingForDelayedAck) return;
    const angle = Number(button.dataset.delayedAngle);
    const tIssued = performance.now();
    pendingDelay = { angle, tIssued, tScheduled: tIssued + UPLINK_MS };
    showDelayedButtons(true);
    updatePendingDelay();
  });
}

async function listCameras(): Promise<void> {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  const selected = cameraSelect.value;
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput');
  cameraSelect.replaceChildren(new Option('Default camera', ''));
  devices.forEach((device, index) => cameraSelect.add(new Option(device.label || `Camera ${index + 1}`, device.deviceId)));
  if (devices.some(device => device.deviceId === selected)) cameraSelect.value = selected;
}
if (!navigator.mediaDevices?.getUserMedia) {
  cameraStart.disabled = true;
  cameraStatus.textContent = 'Camera access needs Chrome on localhost or HTTPS.';
} else {
  void listCameras().catch(() => {});
}
cameraStart.addEventListener('click', () => {
  stopMarkerCheck();
  cameraStarting = true;
  cameraStart.disabled = true;
  cameraStatus.textContent = 'Asking for camera permission…';
  void camera.start(cameraSelect.value || undefined).then(label => {
    cameraStarting = false;
    cameraStart.disabled = false;
    cameraStart.textContent = 'Switch camera';
    cameraStop.disabled = false;
    cameraStatus.textContent = `Showing ${label}. The delayed view is filling its 1.3 s buffer…`;
    startMarkerCheck();
    void listCameras().catch(() => {});
  }).catch(error => {
    cameraStarting = false;
    cameraStart.disabled = false;
    cameraStart.textContent = 'Start camera';
    cameraStop.disabled = true;
    cameraStatus.textContent = error instanceof Error ? error.message : String(error);
  });
});
cameraStop.addEventListener('click', () => {
  stopMarkerCheck();
  camera.stop();
  cameraStart.disabled = false;
  cameraStart.textContent = 'Start camera';
  cameraStop.disabled = true;
  cameraStatus.textContent = 'Camera stopped';
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && (pendingDelay || waitingForDelayedAck))
    cancelDelayed('Tab hidden.');
  if (document.visibilityState === 'hidden' && (camera.active || cameraStarting)) {
    stopMarkerCheck();
    camera.stop();
    cameraStart.disabled = false;
    cameraStart.textContent = 'Start camera';
    cameraStop.disabled = true;
    cameraStatus.textContent = 'Camera stopped while tab was hidden. Click Start camera to resume.';
  }
  if (document.visibilityState === 'visible') showDelayedButtons(serial.connected);
});
