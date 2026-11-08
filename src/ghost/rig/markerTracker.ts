import aruco from 'js-aruco2';

/** These IDs and this dictionary must match the printed marker sheet. */
export const MARKER_DICTIONARY = 'ARUCO';
export const MARKER_LABELS: Record<number, string> = { 17: 'CENTRE', 386: 'A', 925: 'B' };
export const MAX_MARKER_SPREAD_DEG = 2;

export interface DetectedMarker {
  id: number;
  x: number;
  y: number;
  corners: { x: number; y: number }[];
  hammingDistance: number;
}

export class MarkerTracker {
  private readonly detector = new aruco.AR.Detector({ dictionaryName: MARKER_DICTIONARY });

  detect(width: number, height: number, pixels: Uint8ClampedArray): DetectedMarker[] {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || pixels.length !== width * height * 4)
      throw new Error('Invalid camera frame');
    return this.detector.detect({ width, height, data: pixels })
      .filter(marker => Object.hasOwn(MARKER_LABELS, marker.id))
      .map(marker => ({
        id: marker.id,
        x: marker.corners.reduce((sum, corner) => sum + corner.x, 0) / marker.corners.length,
        y: marker.corners.reduce((sum, corner) => sum + corner.y, 0) / marker.corners.length,
        corners: marker.corners.map(corner => ({ x: corner.x, y: corner.y })),
        hammingDistance: marker.hammingDistance,
      }));
  }
}

export interface AngleCalibration {
  /** Principal point and focal length, in pixels, for this exact camera resolution. */
  cx: number;
  fx: number;
  /** Independently measured marker bearings in degrees. */
  markerBearingsDeg: Partial<Record<number, number>>;
}

export interface AngleMeasurement { angleDeg: number | null; markerIds: number[]; spreadDeg: number | null }

/** A servo command is never used as a camera-angle measurement. */
export function measureCameraAngle(markers: readonly DetectedMarker[], calibration: AngleCalibration): AngleMeasurement {
  if (!Number.isFinite(calibration.cx) || !Number.isFinite(calibration.fx) || calibration.fx <= 0)
    throw new Error('Camera calibration needs finite cx and positive fx');
  const values = markers.flatMap(marker => {
    const bearing = calibration.markerBearingsDeg[marker.id];
    if (bearing === undefined || !Number.isFinite(bearing)) return [];
    const relativeBearingDeg = Math.atan((marker.x - calibration.cx) / calibration.fx) * 180 / Math.PI;
    return [{ id: marker.id, angle: bearing - relativeBearingDeg }];
  });
  if (!values.length) return { angleDeg: null, markerIds: [], spreadDeg: null };
  values.sort((a, b) => a.angle - b.angle);
  const middle = Math.floor(values.length / 2);
  const angleDeg = values.length % 2 ? values[middle].angle : (values[middle - 1].angle + values[middle].angle) / 2;
  const spreadDeg = values.at(-1)!.angle - values[0].angle;
  return { angleDeg: spreadDeg <= MAX_MARKER_SPREAD_DEG ? angleDeg : null, markerIds: values.map(value => value.id), spreadDeg };
}
