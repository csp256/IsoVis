// Application types, not the historical camelCase JSON wire schema.
type Matrix = number[][];
type TransformType = '0' | '1' | '2' | '3';
type GuiEnum<T extends number> = T | `${T}`;

interface ShapeParams {
  edit_code: boolean;
  editor_width: number;
  resolution: number;
  reset: boolean;
  dimensions: number;
  memory_overuse: number;
  iso: number;
  parameters: number[];
  interpolate: boolean;
  max_coeff_count: number;
  coeff_count: number;
  coeff: number[];
}

interface CameraParams {
  perspective: boolean;
  fov: number;
  scale: number;
  wobble: boolean;
  radius: number;
  speed: number;
  axes: boolean;
  background: string;
  fps: boolean;
}

interface MaterialParams {
  calc_normals: boolean;
  material: GuiEnum<0 | 1 | 3 | 4 | 5>;
  opacity: number;
  side: GuiEnum<0 | 1 | 2>;
  blending: GuiEnum<0 | 1 | 2 | 3 | 4 | 5>;
  // 0 is the legacy default; its custom-blending bug is not changed here.
  equation: GuiEnum<0 | 100 | 101 | 102 | 103 | 104>;
  depth_test: boolean;
  depth_write: boolean;
  wireframe: boolean;
  coordinates: boolean;
  values: boolean;
  geometry: boolean;
}

interface TransformParams {
  zoom: number;
  invert_order: boolean;
  push_transform: boolean;
  pop_transform: boolean;
  apply_transforms: boolean;
  pop_all_on_apply: boolean;
  reset_orientation: boolean;
  pop_all_transforms: boolean;
}

interface Transform {
  type: TransformType;
  axis1: number;
  axis2: number;
  degrees: number;
  s: number[];
  d: number[];
  row: number;
  col: number;
  shear: number;
}
