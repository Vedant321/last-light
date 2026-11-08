// Rendering for the pan-camera app (handbook v2, 5.8 step 4).
// The simulated camera looks at a static lunar panorama. A "frame" is just the camera's
// true angle at capture time (simulated image content); the operator only ever sees frames
// that have been released through the downlink.
//
// Sign convention: positive angle = camera pans RIGHT; screen x increases to the right;
// panning right moves fixed objects LEFT in the image.

import { DisplayStabilizer } from "./displayStabilizer";
import type { BandReading } from "./errorBand";

export const FOV_DEG = 50;
export const PANO_MIN_DEG = -60;
export const PANO_MAX_DEG = 60;
export const TARGETS = [
  { id: "A", bearingDeg: -20, color: "#ffac83" },
  { id: "B", bearingDeg: 20, color: "#9ef1d1" },
] as const;

export type ViewMode = "lag" | "predict";

export interface RenderState {
  mode: ViewMode;
  /** Injected app Clock timestamp for presentation smoothing. */
  tRender: number;
  /** True capture angle of the latest released frame (image content), or null if none yet. */
  frameAngle: number | null;
  /** Measured angle of the latest released observation. */
  thetaObs: number | null;
  thetaNow: number | null;
  thetaAim: number | null;
  thetaCmd: number | null;
  frameAgeMs: number | null;
  activeTarget: "A" | "B" | null;
  simLabel: string;
  /** Recent prediction error for the estimated-now view (handbook 5.9). */
  nowBand?: BandReading;
  /** Recent prediction error for the future aim. */
  futureBand?: BandReading;
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class PanView {
  private pano = document.createElement("canvas");
  private ppd = 1;
  private pixelRatio = 1;
  private builtFor = "";
  private stabilizer = new DisplayStabilizer();
  reset(): void { this.stabilizer.reset(); }

  /** Pixels per degree for the main view. */
  get pixelsPerDegree(): number {
    return this.ppd;
  }

  private ensurePanorama(w: number, h: number): void {
    const key = `${w}x${h}`;
    if (key === this.builtFor) return;
    this.builtFor = key;
    this.ppd = w / FOV_DEG;
    this.pano.width = Math.ceil((PANO_MAX_DEG - PANO_MIN_DEG) * this.ppd);
    this.pano.height = h;
    this.drawPanorama();
  }

  private bx(bearingDeg: number): number {
    return (bearingDeg - PANO_MIN_DEG) * this.ppd;
  }

  private drawPanorama(): void {
    const ctx = this.pano.getContext("2d")!;
    const W = this.pano.width;
    const H = this.pano.height;
    const horizon = H * 0.58;
    const rnd = seeded(7);

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#17102f");
    sky.addColorStop(0.75, "#35245c");
    sky.addColorStop(1, "#82618d");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizon);

    for (let i = 0; i < 520; i++) {
      const x = rnd() * W;
      const y = rnd() * horizon * 0.92;
      const big = rnd() > 0.94;
      ctx.globalAlpha = 0.25 + rnd() * 0.75;
      ctx.fillStyle = "#fff6e8";
      ctx.fillRect(x, y, big ? 2 : 1, big ? 2 : 1);
    }
    ctx.globalAlpha = 1;

    // Earth in the sky (a fixed landmark).
    const ex = this.bx(34);
    const ey = horizon * 0.3;
    const er = this.ppd * 2.6;
    ctx.fillStyle = "#3d7fd1";
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7fc27a";
    ctx.beginPath();
    ctx.ellipse(ex - er * 0.25, ey - er * 0.1, er * 0.35, er * 0.22, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#05061acc";
    ctx.beginPath();
    ctx.arc(ex + er * 0.45, ey, er, 0, Math.PI * 2);
    ctx.fill();

    // Far ridge.
    ctx.fillStyle = "#795a92";
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let x = 0; x <= W; x += 6) {
      const b = PANO_MIN_DEG + x / this.ppd;
      ctx.lineTo(x, horizon - 18 - Math.sin(b / 7) * 22 - Math.sin(b / 2.3) * 7 - Math.max(0, Math.sin(b / 13)) * 30);
    }
    ctx.lineTo(W, horizon);
    ctx.fill();

    // Ground.
    const ground = ctx.createLinearGradient(0, horizon, 0, H);
    ground.addColorStop(0, "#b08cac");
    ground.addColorStop(1, "#534269");
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, W, H - horizon);

    // Craters and rocks.
    for (let i = 0; i < 70; i++) {
      const x = rnd() * W;
      const t = rnd();
      const y = horizon + 10 + t * t * (H - horizon - 20);
      const r = (6 + rnd() * 26) * (0.4 + t);
      ctx.fillStyle = "#907399";
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d6b6d755";
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.08, r * 0.8, r * 0.2, 0, Math.PI, 0);
      ctx.fill();
    }

    // Landmarks: antenna (-45°) and lander (+44°).
    this.drawAntenna(ctx, this.bx(-45), horizon + 6);
    this.drawLander(ctx, this.bx(44), horizon + 10);

    // Targets.
    for (const t of TARGETS) this.drawTarget(ctx, this.bx(t.bearingDeg), horizon + 4, t.id, t.color);
  }

  private drawAntenna(ctx: CanvasRenderingContext2D, x: number, base: number): void {
    ctx.strokeStyle = "#c8c2cf";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, base - 110);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, base - 110, 26, 11, -0.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawLander(ctx: CanvasRenderingContext2D, x: number, base: number): void {
    ctx.fillStyle = "#d9b25a";
    ctx.fillRect(x - 26, base - 52, 52, 30);
    ctx.fillStyle = "#cfd3da";
    ctx.fillRect(x - 18, base - 74, 36, 22);
    ctx.strokeStyle = "#cfd3da";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 26, base - 22);
    ctx.lineTo(x - 40, base);
    ctx.moveTo(x + 26, base - 22);
    ctx.lineTo(x + 40, base);
    ctx.stroke();
  }

  private drawTarget(ctx: CanvasRenderingContext2D, x: number, base: number, id: string, color: string): void {
    const size = Math.max(56 * this.pixelRatio, this.ppd * 2.8);
    const cy = this.pano.height * 0.5;
    ctx.save();
    ctx.strokeStyle = color + '80'; ctx.lineWidth = 3 * this.pixelRatio;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, cy); ctx.stroke();
    ctx.fillStyle = color + '25'; ctx.beginPath(); ctx.ellipse(x, base, size * .55, size * .1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = color; ctx.shadowBlur = 24 * this.pixelRatio;
    ctx.fillStyle = '#36254d'; ctx.strokeStyle = color; ctx.lineWidth = 4 * this.pixelRatio;
    ctx.beginPath(); ctx.roundRect(x - size / 2, cy - size / 2, size, size, size * .25); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x - size * .38, cy - size * .38, size * .76, size * .76, size * .16); ctx.fill();
    ctx.fillStyle = id === 'A' ? '#783d32' : '#285d51';
    ctx.font = `900 ${size * .51}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(id, x, cy + size * .02);
    ctx.fillStyle = color; ctx.font = `800 ${11 * this.pixelRatio}px system-ui`; ctx.fillText('BEACON ' + id, x, cy - size * .74);
    ctx.restore();
  }

  /** Draw the panorama crop centred on `centerDeg` into the destination rectangle. */
  private drawCrop(ctx: CanvasRenderingContext2D, centerDeg: number, dx: number, dy: number, dw: number, dh: number): void {
    const sx = this.bx(centerDeg - FOV_DEG / 2);
    const sw = FOV_DEG * this.ppd;
    ctx.drawImage(this.pano, sx, 0, sw, this.pano.height, dx, dy, dw, dh);
  }

  private hatch(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = "#24283a";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2f3449";
    ctx.lineWidth = 2;
    for (let x = -h; x < w; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h, 0);
      ctx.stroke();
    }
  }

  render(canvas: HTMLCanvasElement, s: RenderState): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    this.pixelRatio = W / Math.max(1, canvas.clientWidth);
    this.ensurePanorama(W, H);
    this.hatch(ctx, W, H);

    if (s.frameAngle === null || s.thetaObs === null) {
      this.reset();
      ctx.fillStyle = "#c9d5d7";
      ctx.font = `600 ${Math.max(12 * this.pixelRatio, Math.round(W * 0.016))}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText("Waiting for the first delayed frame from the camera…", W / 2, H / 2);
      return;
    }

    const predicting = s.mode === "predict" && s.thetaNow !== null;
    // Main view: delayed frame (lag) or delayed frame shifted to the estimated-now angle.
    if (!predicting) this.reset();
    // Smooth and suppress tiny changes in the visual correction. Never feed it back to the predictor,
    // learner, error tracker or evaluator; the delayed source frame remains untouched.
    const shiftPx = predicting ? -this.ppd * this.stabilizer.update(s.thetaNow! - s.thetaObs, s.tRender) : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    this.drawCrop(ctx, s.frameAngle, shiftPx, 0, W, H);
    if (predicting && Math.abs(shiftPx) > 1) {
      // Mark the edge between real (old) pixels and the unknown grey area.
      ctx.strokeStyle = "#9edbcf99";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      const edgeX = shiftPx > 0 ? shiftPx : W + shiftPx;
      ctx.beginPath();
      ctx.moveTo(edgeX, 0);
      ctx.lineTo(edgeX, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#9edbcf";
      ctx.font = `700 ${Math.round(W * 0.01)}px system-ui`;
      ctx.textAlign = "center";
      const unknownCenter = shiftPx > 0 ? shiftPx / 2 : W + shiftPx / 2;
      if (Math.abs(shiftPx) > 90) ctx.fillText("UNKNOWN (not seen yet)", unknownCenter, H * 0.35);
    }
    ctx.restore();

    if (predicting && s.nowBand) this.drawBand(ctx, H, W / 2, s.nowBand, "#ffffff");
    this.drawCrosshair(ctx, W, H);
    if (predicting && s.thetaAim !== null) {
      const gx = W / 2 + this.ppd * (s.thetaAim - s.thetaNow!);
      if (s.futureBand && gx >= 30 && gx <= W - 30) this.drawBand(ctx, H, gx, s.futureBand, "#8ef8e4");
      this.drawGhost(ctx, W, H, gx);
    }
    const compact = canvas.clientWidth < 650;

    if (predicting && !compact) this.drawInset(ctx, W, H, s);
    this.drawLabels(ctx, W, H, s, predicting, compact);
  }

  /**
   * Horizontal error band = ± (2 × recent RMS error) around a marker (handbook 5.9).
   * Labelled "recent prediction error", never a confidence interval. Drawn only when "ok".
   */
  private drawBand(ctx: CanvasRenderingContext2D, H: number, x: number, b: BandReading, color: string): void {
    if (b.state !== "ok" || b.bandDeg === null) return;
    const cy = H * 0.5;
    const half = Math.max(2, b.bandDeg * this.ppd);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = color;
    ctx.fillRect(x - half, cy - 34, half * 2, 68);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - half, cy - 34);
    ctx.lineTo(x - half, cy + 34);
    ctx.moveTo(x + half, cy - 34);
    ctx.lineTo(x + half, cy + 34);
    ctx.stroke();
    ctx.restore();
  }

  /** One status line for both bands: value, "warming up", or "tracking lost / estimate stale". */
  private drawBandStatus(ctx: CanvasRenderingContext2D, W: number, y: number, now?: BandReading, future?: BandReading, compact = false): void {
    if (!now || !future) return;
    const part = (name: string, b: BandReading) =>
      b.state === "ok" && b.bandDeg !== null ? `${name} ±${b.bandDeg.toFixed(1)}°` : b.state === "stale" ? `${name} —` : `${name} warming up (${b.matched}/10)`;
    const stale = now.state === "stale";
    const text = stale
      ? "TRACKING LOST · estimate stale"
      : `RECENT PREDICTION ERROR (2×RMS) · ${part("now", now)} · ${part("future aim", future)}`;
    ctx.save();
    ctx.font = `700 ${Math.max(compact ? 10 * this.pixelRatio : 1, Math.round(W * 0.0082))}px system-ui`;
    ctx.textAlign = "center";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = stale ? "#3a1414dd" : "#0b172bcc";
    ctx.fillRect(W / 2 - tw / 2 - 12, y - 16, tw + 24, 24);
    ctx.fillStyle = stale ? "#ff8f7a" : "#d7e6e6";
    if (compact && !stale) {
      ctx.fillText('RECENT PREDICTION ERROR (2×RMS)', W / 2, y + 1, W - 24);
      ctx.fillText(`${part('now', now)} · ${part('future aim', future)}`, W / 2, y + 19, W - 24);
    } else ctx.fillText(text, W / 2, y + 1, W - 24);
    ctx.restore();
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const cy = H * 0.5;
    ctx.save();
    ctx.strokeStyle = '#fff6e860'; ctx.lineWidth = 2 * this.pixelRatio; ctx.setLineDash([5 * this.pixelRatio, 8 * this.pixelRatio]);
    ctx.beginPath(); ctx.moveTo(W / 2, cy - 85 * this.pixelRatio); ctx.lineTo(W / 2, cy + 85 * this.pixelRatio); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "#ffffffcc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, cy, 12, 0, Math.PI * 2);
    ctx.moveTo(W / 2 - 26, cy);
    ctx.lineTo(W / 2 - 14, cy);
    ctx.moveTo(W / 2 + 14, cy);
    ctx.lineTo(W / 2 + 26, cy);
    ctx.moveTo(W / 2, cy - 26);
    ctx.lineTo(W / 2, cy - 14);
    ctx.moveTo(W / 2, cy + 14);
    ctx.lineTo(W / 2, cy + 26);
    ctx.stroke();
  }

  private drawGhost(ctx: CanvasRenderingContext2D, W: number, H: number, x: number): void {
    const cy = H * 0.5;
    const color = "#8ef8e4";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    if (x < 30 || x > W - 30) {
      const left = x < 30;
      const ax = left ? 34 : W - 34;
      ctx.beginPath();
      ctx.moveTo(ax + (left ? -16 : 16), cy);
      ctx.lineTo(ax + (left ? 10 : -10), cy - 14);
      ctx.lineTo(ax + (left ? 10 : -10), cy + 14);
      ctx.closePath();
      ctx.fill();
      ctx.font = `800 ${Math.max(10 * this.pixelRatio, Math.round(W * 0.009))}px system-ui`;
      ctx.textAlign = left ? "left" : "right";
      ctx.fillText("FUTURE AIM", ax + (left ? 18 : -18), cy + 34);
      return;
    }
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(x, cy, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x - 40, cy);
    ctx.lineTo(x - 30, cy);
    ctx.moveTo(x + 30, cy);
    ctx.lineTo(x + 40, cy);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = `800 ${Math.max(10 * this.pixelRatio, Math.round(W * 0.009))}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("FUTURE AIM", x, cy + 50);
  }

  private drawInset(ctx: CanvasRenderingContext2D, W: number, H: number, s: RenderState): void {
    const iw = Math.min(W * 0.22, 250 * this.pixelRatio);
    const ih = iw * H / W;
    const ix = 24 * this.pixelRatio;
    const iy = H - ih - 150 * this.pixelRatio;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(ix - 3, iy - 3, iw + 6, ih + 6);
    this.drawCrop(ctx, s.frameAngle!, ix, iy, iw, ih);
    ctx.strokeStyle = "#87cab8";
    ctx.lineWidth = 2;
    ctx.strokeRect(ix, iy, iw, ih);
    ctx.fillStyle = "#0b172bdd";
    ctx.fillRect(ix, iy, iw, 22);
    ctx.fillStyle = "#9edbcf";
    ctx.font = `800 ${10 * this.pixelRatio}px system-ui`;
    ctx.textAlign = "left";
    const age = s.frameAgeMs === null ? "—" : `${(s.frameAgeMs / 1000).toFixed(2)} s`;
    ctx.fillText(`DELAYED VIDEO · age ${age}`, ix + 8, iy + 15);
    ctx.restore();
  }

  private drawLabels(ctx: CanvasRenderingContext2D, W: number, H: number, s: RenderState, predicting: boolean, compact: boolean): void {
    // The DOM HUD carries the mission and delay labels; this line describes raw model error.
    if (predicting) this.drawBandStatus(ctx, W, H - (compact ? 205 : 161) * this.pixelRatio, s.nowBand, s.futureBand, compact);
  }
}
