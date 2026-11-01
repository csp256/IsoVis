// Compile-only fixtures: never emitted or loaded by the browser.
// An @ts-expect-error fails the check if its expected diagnostic disappears.
function assert_type<T>(_value: T): void {}

function type_contracts(shape: ShapeParams, camera: CameraParams, material: MaterialParams, settings: TransformParams, t: Transform): void {
  assert_type<number>(require_resolution(shape.resolution));
  assert_type<Matrix>(compute_full_transform());
  assert_type<Transform>(plain_transform());
  assert_type<Transform[]>(normalized_transform_stack([], 5, true));
  material.material = '5'; // dat.GUI's numeric-string enum values are supported.
  t.type = '3';

  // @ts-expect-error Settings are numbers, not numeric strings.
  shape.resolution = '30';
  // @ts-expect-error Camera settings are checked too.
  camera.radius = false;
  // @ts-expect-error Only supported material enum values are allowed.
  material.material = 2;
  // @ts-expect-error Zoom cannot be null.
  settings.zoom = null;
  // @ts-expect-error Transform vectors contain numbers.
  t.s.push('1');
  // @ts-expect-error Transform kinds are a closed union.
  t.type = '4';
  // @ts-expect-error Function parameters are checked.
  get_url_resolution('30');
  // @ts-expect-error Matrix entry access is possibly undefined until bounded.
  assert_type<number>(compute_transform()[0][0]);
  // @ts-expect-error An undeclared assignment must never create a global.
  accidental_counter = 1;
}

// @ts-expect-error strict checking rejects implicitly-any parameters.
function accidentally_untyped(value): unknown { return value; }
