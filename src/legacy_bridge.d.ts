// Narrow declarations for APIs owned by the remaining classic scripts.
// These provide types, not implementations or runtime input validation.
// Remove each bridge declaration when its owner is migrated to TypeScript.
declare var transforms: Transform[];
declare var base_orientation: Matrix;
declare function set_coords_dirty(): void;
declare function build_right_gui(): void;
declare function getURLParameter(name: string): string | null;

// Only the numeric.js matrix operations this slice actually uses. Its library
// source stays untouched; this is deliberately not a declaration of its full API.
declare const numeric: {
  identity(size: number): Matrix;
  dot(left: Matrix, right: Matrix): Matrix;
  mul(scale: number, matrix: Matrix): Matrix;
};
