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

		axis1: 	0,
		axis2: 	0,
		degrees: 0,

		sx: 1,
		sy: 1,
		sz: 1,
		sa: 1,
		sb: 1,

		dx: 0,
		dy: 0,
		dz: 0,
		da: 0,
		db: 0,

		row: 0,
		col: 1,
		shear: 0,
		};
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
				P[0][0] = 1/transforms[i].sx;
				P[1][1] = 1/transforms[i].sy;
				P[2][2] = 1/transforms[i].sz;
				P[3][3] = 1/transforms[i].sa;
				P[4][4] = 1/transforms[i].sb;
			break;
			case "2":
				P[0][5] = -transforms[i].dx;
				P[1][5] = -transforms[i].dy;
				P[2][5] = -transforms[i].dz;
				P[3][5] = -transforms[i].da;
				P[4][5] = -transforms[i].db;
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
	return numeric.mul(1/transformParams.zoom, numeric.dot(baseOrientation, computeTransform()));
}
