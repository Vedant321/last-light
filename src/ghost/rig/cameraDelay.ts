import { DOWNLINK_MS } from '../config';
import { DelayLine } from '../delay/delayLine';

interface CapturedFrame {
  bitmap: ImageBitmap;
  tPageCapture: number;
}

/** A browser camera and a 1300 ms software delay for diagnostic use only.
 * tPageCapture is when the browser requested a copy of the video frame. The
 * camera/driver may have captured the optical image earlier; calibrate that
 * separate latency before using frames for RIG measurements or scoring.
 */
export class DelayedCamera {
  private stream: MediaStream | null = null;
  private frames = new DelayLine<CapturedFrame>();
  private captureTimer: number | null = null;
  private animationFrame: number | null = null;
  private generation = 0;
  private captureBusy = false;
  private lastDisplayedCapture: number | null = null;
  private readonly context: CanvasRenderingContext2D;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly onAge: (ageMs: number | null) => void,
    private readonly onEnded: () => void,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Camera canvas unavailable');
    this.context = context;
  }

  get active(): boolean { return this.stream !== null; }

  async start(deviceId?: string): Promise<string> {
    this.stop();
    const generation = this.generation;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs Chrome on localhost or HTTPS.');
    const video: MediaTrackConstraints = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } };
    if (deviceId) video.deviceId = { exact: deviceId };
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
    if (this.generation !== generation) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error('Camera start was cancelled.');
    }
    this.stream = stream;
    this.video.srcObject = stream;
    try { await this.video.play(); } catch (error) {
      this.stop();
      throw error;
    }
    if (this.generation !== generation) throw new Error('Camera start was cancelled.');
    this.canvas.width = this.video.videoWidth || 640;
    this.canvas.height = this.video.videoHeight || 480;
    const track = stream.getVideoTracks()[0];
    if (!track) { this.stop(); throw new Error('The selected device provided no video track.'); }
    track.addEventListener('ended', () => {
      if (this.stream === stream) { this.stop(); this.onEnded(); }
    }, { once: true });
    this.captureTimer = window.setInterval(() => void this.capture(generation), 100);
    this.animationFrame = requestAnimationFrame(() => this.render(generation));
    return track.label || 'Camera';
  }

  stop(): void {
    this.generation++;
    if (this.captureTimer !== null) window.clearInterval(this.captureTimer);
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.captureTimer = this.animationFrame = null;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.captureBusy = false;
    this.lastDisplayedCapture = null;
    this.video.pause();
    this.video.srcObject = null;
    for (const frame of this.frames.release(Infinity)) frame.bitmap.close();
    this.frames = new DelayLine<CapturedFrame>();
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.onAge(null);
  }

  private async capture(generation: number): Promise<void> {
    if (this.captureBusy || !this.stream || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    this.captureBusy = true;
    const tPageCapture = performance.now();
    try {
      const bitmap = await createImageBitmap(this.video);
      if (this.generation !== generation) { bitmap.close(); return; }
      this.frames.schedule({ bitmap, tPageCapture }, tPageCapture + DOWNLINK_MS);
      // Bound memory if rendering pauses (e.g. a hidden tab).
      if (this.frames.size > 30) {
        for (const old of this.frames.release(Infinity)) old.bitmap.close();
      }
    } catch { /* an occasional missing video frame is not a valid observation */ }
    finally { if (this.generation === generation) this.captureBusy = false; }
  }

  private render(generation: number): void {
    if (this.generation !== generation || !this.stream) return;
    const now = performance.now();
    const ready = this.frames.release(now);
    for (const frame of ready) {
      this.context.drawImage(frame.bitmap, 0, 0, this.canvas.width, this.canvas.height);
      this.lastDisplayedCapture = frame.tPageCapture;
      frame.bitmap.close();
    }
    this.onAge(this.lastDisplayedCapture === null ? null : now - this.lastDisplayedCapture);
    this.animationFrame = requestAnimationFrame(() => this.render(generation));
  }
}
