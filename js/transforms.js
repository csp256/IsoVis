// Pure preparation used by GUI changes and imported sessions. No live mutation.
function normalizedTransformStack(stack, dimensions, explicitStack) {
 if (!Number.isInteger(dimensions) || dimensions < 3) throw new Error('Dimensions must be an integer of at least 3');
 if (!Array.isArray(stack)) throw new Error('Invalid transform stack');
 stack = stack.map(function(t) {
  if (!t || ['0','1','2','3'].indexOf(t.type) < 0) throw new Error('Invalid transform type');
  var result = {};
  Object.keys(t).forEach(function(key) { result[key] = t[key]; });
  ['axis1','axis2','row','col'].forEach(function(key) {
   if (!Number.isInteger(t[key]) || t[key] < 0 || (explicitStack && t[key] >= dimensions)) throw new Error('Invalid transform axis');
   result[key] = Math.min(t[key], dimensions-1);
  });
  ['degrees','shear'].forEach(function(key) { if (!Number.isFinite(t[key])) throw new Error('Invalid transform value'); });
  ['s','d'].forEach(function(key) {
   if (!Array.isArray(t[key]) || !t[key].every(Number.isFinite) || (explicitStack && t[key].length !== dimensions)) throw new Error('Invalid transform vector');
   result[key] = Array.from({length:dimensions}, function(_,i) { return i<t[key].length ? t[key][i] : key=='s' ? 1 : 0; });
  });
  if (result.s.some(function(x) {return x===0;})) throw new Error('Scale cannot be zero');
  return result;
 });
 return stack;
}

function invertOrder() {
	transforms.reverse();
	setCoordsDirty();
	buildRightGUI();
}
function pushTransform() {
	transformParams.pushTransform = false;
	transforms.push( plainTransform() );
	buildRightGUI();
}
function popTransform() {
	transformParams.popTransform = false;
	transforms.pop();
	buildRightGUI();
	setCoordsDirty();
}
function applyTransforms() {
	transformParams.applyTransforms = false;
	baseOrientation = numeric.dot(baseOrientation, computeTransform());
	if (transformParams.popAllOnApply) {
		popAllTransforms();
	} else {
		// Keep the stack slots, but consume their transforms after baking them.
		for (var k=0; k<transforms.length; k++) transforms[k] = plainTransform();
		buildRightGUI();
	}
	setCoordsDirty();
}
function resetOrientation() {
	transformParams.resetOrientation = false;
	baseOrientation = numeric.identity(n+1);
	setCoordsDirty();
}

function popAllTransforms() {
	transformParams.popAllTransforms = false;
	transforms = [];
	pushTransform();
	setCoordsDirty();
}

function plainTransform() {
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

function computeTransform() {
	var R = numeric.identity(n+1); // Passive inverse transformation formulation
	for (i=0; i<transforms.length; i++) {
		var P = numeric.identity(n+1);
		switch (transforms[i].type) {
			case "0":
				if (transforms[i].axis1 != transforms[i].axis2) {
					var theta = transforms[i].degrees * Math.PI / 180;
					var c = Math.cos(theta);
					var s = Math.sin(theta);
					P[transforms[i].axis1][transforms[i].axis1] = c;
					P[transforms[i].axis2][transforms[i].axis2] = c;
					P[transforms[i].axis1][transforms[i].axis2] = s;
					P[transforms[i].axis2][transforms[i].axis1] = -s;
				}
			break;
			case "1":
				for (var k=0; k<n; k++) P[k][k] = 1/transforms[i].s[k];
			break;
			case "2":
				for (var k=0; k<n; k++) P[k][n] = -transforms[i].d[k];
			break;
			case "3":
				P[transforms[i].row][transforms[i].col] = transforms[i].shear;
			break;
			default:
		}
		R = numeric.dot(R,P);
	}
	return R;
}
function computeFullTransform() {
	validateNumericSettings(shapeParams, transformParams, transforms);
	return numeric.mul(1/transformParams.zoom, numeric.dot(baseOrientation, computeTransform()));
}
