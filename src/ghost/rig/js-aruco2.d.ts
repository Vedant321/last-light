declare module 'js-aruco2' {
  interface Point { x: number; y: number }
  interface Marker { id: number; corners: Point[]; hammingDistance: number }
  class Detector {
    constructor(options?: { dictionaryName?: string; maxHammingDistance?: number });
    detect(image: { width: number; height: number; data: Uint8ClampedArray }): Marker[];
  }
  class Dictionary {
    constructor(name: string);
    readonly codeList: string[];
    generateSVG(id: number): string;
  }
  const aruco: { AR: { Detector: typeof Detector; Dictionary: typeof Dictionary } };
  export default aruco;
}
