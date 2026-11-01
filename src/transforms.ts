// Generated browser output: edit src/transforms.ts, then run `just build`.
// Pure preparation used by GUI changes and imported sessions. No live mutation.
function normalized_transform_stack(stack: unknown, dimensions: number, explicit_stack: boolean): Transform[] {
  if (!Number.isInteger(dimensions) || dimensions < 3) throw new Error('Dimensions must be an integer of at least 3');
  if (!Array.isArray(stack)) throw new Error('Invalid transform stack');
  return stack.map(function(value: unknown): Transform {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid transform type');
    const t = value as Record<string, unknown>;
    const type = t.type;
    if (type !== '0' && type !== '1' && type !== '2' && type !== '3') throw new Error('Invalid transform type');

    function axis(value: unknown): number {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || (explicit_stack && value >= dimensions)) throw new Error('Invalid transform axis');
      return Math.min(value, dimensions - 1);
    }
    function finite(value: unknown): number {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid transform value');
      return value;
    }
    function vector(value: unknown, fallback: number): number[] {
      if (!Array.isArray(value) || !value.every((item: unknown): item is number => typeof item === 'number' && Number.isFinite(item)) || (explicit_stack && value.length !== dimensions)) throw new Error('Invalid transform vector');
      return Array.from({length: dimensions}, (_, i) => i < value.length ? value[i]! : fallback);
    }

    const result: Transform = {
      ...t,
      type,
      axis1: axis(t.axis1), axis2: axis(t.axis2),
      row: axis(t.row), col: axis(t.col),
      degrees: finite(t.degrees), shear: finite(t.shear),
      s: vector(t.s, 1), d: vector(t.d, 0),
    };
    if (result.s.some(x => x === 0)) throw new Error('Scale cannot be zero');
    return result;
  });
}

function invert_order(): void {
  transforms.reverse();
  set_coords_dirty();
  build_right_gui();
}
function push_transform(): void {
  transform_params.push_transform = false;
  transforms.push( plain_transform() );
  build_right_gui();
}
function pop_transform(): void {
  transform_params.pop_transform = false;
  transforms.pop();
  build_right_gui();
  set_coords_dirty();
}
function apply_transforms(): void {
  transform_params.apply_transforms = false;
  base_orientation = numeric.dot(base_orientation, compute_transform());
  if (transform_params.pop_all_on_apply) {
    pop_all_transforms();
  } else {
    // Keep the stack slots, but consume their transforms after baking them.
    for (let k=0; k<transforms.length; k++) transforms[k] = plain_transform();
    build_right_gui();
  }
  set_coords_dirty();
}
function reset_orientation(): void {
  transform_params.reset_orientation = false;
  base_orientation = numeric.identity(n+1);
  set_coords_dirty();
}

function pop_all_transforms(): void {
  transform_params.pop_all_transforms = false;
  transforms = [];
  push_transform();
  set_coords_dirty();
}

function plain_transform(): Transform {
  const out: Transform = {
    type: "0", // 0 rotation, 1 scale, 2 translation, 3 shear

    axis1:  0,
    axis2:  0,
    degrees: 0.0,

    s: new Array<number>(n),

    d: new Array<number>(n), // d for delta translation. t might be used for time in a later version.

    row: 0,
    col: 1,
    shear: 0.0,
  };
  for (let i=0; i<n; i++) {
    out.s[i] = 1.0;
    out.d[i] = 0.0;
  }
  return out;
}

function compute_transform(): Matrix {
  let r = numeric.identity(n+1); // Passive inverse transformation formulation
  for (const t of transforms) {
    // UI/import validation supplies valid axes; identity supplies every row.
    const p = numeric.identity(n+1);
    switch (t.type) {
      case "0":
        if (t.axis1 != t.axis2) {
          const theta = t.degrees * Math.PI / 180;
          const c = Math.cos(theta);
          const s = Math.sin(theta);
          p[t.axis1]![t.axis1] = c;
          p[t.axis2]![t.axis2] = c;
          p[t.axis1]![t.axis2] = s;
          p[t.axis2]![t.axis1] = -s;
        }
      break;
      case "1":
        for (let k=0; k<n; k++) p[k]![k] = 1/t.s[k]!;
      break;
      case "2":
        for (let k=0; k<n; k++) p[k]![n] = -t.d[k]!;
      break;
      case "3":
        p[t.row]![t.col] = t.shear;
      break;
      default:
    }
    r = numeric.dot(r,p);
  }
  return r;
}
function compute_full_transform(): Matrix {
  validate_numeric_settings(shape_params, transform_params, transforms);
  return numeric.mul(1/transform_params.zoom, numeric.dot(base_orientation, compute_transform()));
}
