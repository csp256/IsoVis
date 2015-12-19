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
	if (params.popAllOnApply) { popAllTransforms(); }
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

		axis1: 	1,
		axis2: 	1,
		degrees: 0.0,

		s: new Array(n),

		d: new Array(n), // d for delta translation. t might be used for time in a later version.

		row: 1,
		col: 2,
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
					P[transforms[i].axis1-1][transforms[i].axis1-1] = c;
					P[transforms[i].axis2-1][transforms[i].axis2-1] = c;
					P[transforms[i].axis1-1][transforms[i].axis2-1] = s;
					P[transforms[i].axis2-1][transforms[i].axis1-1] = -s;
				}
			break;
			case "1":
				for (var k=0; k<n; k++) P[k][k] = 1/transforms[i].s[k];
			break;
			case "2":
				for (var k=0; k<n; k++) P[k][n] = -transforms[i].d[k];
			break;
			case "3":
				P[transforms[i].row-1][transforms[i].col-1] = transforms[i].shear;
			break;
			default:
		}
		R = numeric.dot(R,P);
	}
	return R;
}
function computeFullTransform() {
	return numeric.mul(1/transformParams.zoom, numeric.dot(baseOrientation, computeTransform()));
}
