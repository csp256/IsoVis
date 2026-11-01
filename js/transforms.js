// Pure preparation used by GUI changes and imported sessions. No live mutation.
function normalized_transform_stack(stack, dimensions, explicit_stack) {
 if (!Number.isInteger(dimensions) || dimensions < 3) throw new Error('Dimensions must be an integer of at least 3');
 if (!Array.isArray(stack)) throw new Error('Invalid transform stack');
 stack = stack.map(function(t) {
  if (!t || ['0','1','2','3'].indexOf(t.type) < 0) throw new Error('Invalid transform type');
  var result = {};
  Object.keys(t).forEach(function(key) { result[key] = t[key]; });
  ['axis1','axis2','row','col'].forEach(function(key) {
   if (!Number.isInteger(t[key]) || t[key] < 0 || (explicit_stack && t[key] >= dimensions)) throw new Error('Invalid transform axis');
   result[key] = Math.min(t[key], dimensions-1);
  });
  ['degrees','shear'].forEach(function(key) { if (!Number.isFinite(t[key])) throw new Error('Invalid transform value'); });
  ['s','d'].forEach(function(key) {
   if (!Array.isArray(t[key]) || !t[key].every(Number.isFinite) || (explicit_stack && t[key].length !== dimensions)) throw new Error('Invalid transform vector');
   result[key] = Array.from({length:dimensions}, function(_,i) { return i<t[key].length ? t[key][i] : key=='s' ? 1 : 0; });
  });
  if (result.s.some(function(x) {return x===0;})) throw new Error('Scale cannot be zero');
  return result;
 });
 return stack;
}

function invert_order() {
	transforms.reverse();
	set_coords_dirty();
	build_right_gui();
}
function push_transform() {
	transform_params.push_transform = false;
	transforms.push( plain_transform() );
	build_right_gui();
}
function pop_transform() {
	transform_params.pop_transform = false;
	transforms.pop();
	build_right_gui();
	set_coords_dirty();
}
function apply_transforms() {
	transform_params.apply_transforms = false;
	base_orientation = numeric.dot(base_orientation, compute_transform());
	if (transform_params.pop_all_on_apply) {
		pop_all_transforms();
	} else {
		// Keep the stack slots, but consume their transforms after baking them.
		for (var k=0; k<transforms.length; k++) transforms[k] = plain_transform();
		build_right_gui();
	}
	set_coords_dirty();
}
function reset_orientation() {
	transform_params.reset_orientation = false;
	base_orientation = numeric.identity(n+1);
	set_coords_dirty();
}

function pop_all_transforms() {
	transform_params.pop_all_transforms = false;
	transforms = [];
	push_transform();
	set_coords_dirty();
}

function plain_transform() {
  var out = {
		type: "0", // 0 rotation, 1 scale, 2 translation, 3 shear

		axis1: 	0,
		axis2: 	0,
		degrees: 0.0,

		s: new Array(n),

		d: new Array(n), // d for delta translation. t might be used for time in a later version.

		row: 0,
		col: 1,
		shear: 0.0,
	};
	for (var i=0; i<n; i++) {
		out.s[i] = 1.0;
		out.d[i] = 0.0;
	}
	return out;
}

function compute_transform() {
	var r = numeric.identity(n+1); // Passive inverse transformation formulation
	for (i=0; i<transforms.length; i++) {
		var p = numeric.identity(n+1);
		switch (transforms[i].type) {
			case "0":
				if (transforms[i].axis1 != transforms[i].axis2) {
					var theta = transforms[i].degrees * Math.PI / 180;
					var c = Math.cos(theta);
					var s = Math.sin(theta);
					p[transforms[i].axis1][transforms[i].axis1] = c;
					p[transforms[i].axis2][transforms[i].axis2] = c;
					p[transforms[i].axis1][transforms[i].axis2] = s;
					p[transforms[i].axis2][transforms[i].axis1] = -s;
				}
			break;
			case "1":
				for (var k=0; k<n; k++) p[k][k] = 1/transforms[i].s[k];
			break;
			case "2":
				for (var k=0; k<n; k++) p[k][n] = -transforms[i].d[k];
			break;
			case "3":
				p[transforms[i].row][transforms[i].col] = transforms[i].shear;
			break;
			default:
		}
		r = numeric.dot(r,p);
	}
	return r;
}
function compute_full_transform() {
	validate_numeric_settings(shape_params, transform_params, transforms);
	return numeric.mul(1/transform_params.zoom, numeric.dot(base_orientation, compute_transform()));
}
