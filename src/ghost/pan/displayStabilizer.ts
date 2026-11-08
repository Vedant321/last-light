/** Presentation only: smooth the image-shift correction, then hold sub-noise changes.
 * Raw observations, predictions and scoring never pass through this class.
 */
export const DISPLAY_SMOOTHING_MS = 60;
/** Hysteresis bounds the extra displayed-angle offset relative to the smoothed correction. */
export const DISPLAY_DEADBAND_DEG = 0.15;
export class DisplayStabilizer {
  private smoothed: number | null = null;
  private displayed: number | null = null;
  private lastTime: number | null = null;
  reset(): void { this.smoothed = null; this.displayed = null; this.lastTime = null; }
  update(correctionDeg: number, t: number): number {
    if (this.smoothed === null || this.displayed === null || this.lastTime === null || t < this.lastTime || t - this.lastTime > 500) {
      this.smoothed = this.displayed = correctionDeg;
    } else {
      const weight = -Math.expm1(-(t - this.lastTime) / DISPLAY_SMOOTHING_MS);
      this.smoothed += weight * (correctionDeg - this.smoothed);
      const delta = this.smoothed - this.displayed;
      // A low-pass filter alone still moves on every noisy sample. This bounded
      // deadband holds tiny corrections and follows sustained movement in either direction.
      // It is centred on the last displayed correction, never on a command or target.
      if (Math.abs(delta) > DISPLAY_DEADBAND_DEG) {
        this.displayed = this.smoothed - Math.sign(delta) * DISPLAY_DEADBAND_DEG;
      }
    }
    this.lastTime = t;
    return this.displayed;
  }
}
