declare module 'opentype.js' {
  const opentype: {
    parse(buffer: ArrayBuffer): {
      unitsPerEm: number;
      getAdvanceWidth(text: string, size: number): number;
      getPath(text: string, x: number, y: number, size: number): { toPathData(decimals?: number): string };
    };
  };
  export default opentype;
}
