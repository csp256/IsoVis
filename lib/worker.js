/*importScripts('lib/three.min.js');
importScripts('lib/MarchingCubesData.js');

var init = function(dim, s, octant) {
	this.n = 5;
	var axisMin = -10;
	var axisMax =  10;
	var axisRange = axisMax - axisMin;

	this.size = s;
	this.size2 = size*size;
	this.size3 = size*size*size;

	this.points = Array(size3);
	console.time('makeCoord');
	if (typeof this.coords == 'undefined') {
		this.coords = Array(size3);
		for (var i=0; i<size3; i++) {
			coords[i] = new Array(n);
		}
	}
	if (coords.length < size3) {
		var l = coords.length;
		coords.length = size3;
		for (var i=l; i<size3; i++) {
			coords[i] = new Array(n);
		}
	}
	console.timeEnd('makeCoord');

	/*if (typeof this.coords == 'undefined') {
		console.log('!');
		this.coords = Array(size3);
		for (var i=0; i<size3; i++) { // Is there a .fill() method for this?
			coords[i] = Array(n); // Instead of using push, coords[i] = ... is faster on non-chrome browsers!
		}
	} else {
		console.log('?');
		if (coords.length < size3) {
			for (var i=coords.length; i<size3; i++) {
				coords.push(Array(n)); // Instead of using push, coords[i] = ... is faster on non-chrome browsers!
			}
		} // else case: don't worry about it! If they want to reclaim memory, let them reset the worker.
	}*/
/*
	var xOffset = ((octant & 1) > 0) ? axisMin : 0;
	var yOffset = ((octant & 2) > 0) ? axisMin : 0;
	var zOffset = ((octant & 4) > 0) ? axisMin : 0;

	var index = 0;
	var spacing = 0.5 * axisRange / (size - 1);
	for (var k = 0; k < size; k++) {
		var z = zOffset + spacing * k;
		for (var j = 0; j < size; j++) {
			var y = yOffset + spacing * j;
			for (var i = 0; i < size; i++) {
				var x = xOffset + spacing * i;
				points[index] = new THREE.Vector3(x,y,z);
				//coords[index] = Array(n);
				index++;
			}
		}
	}
	this.values = Array(size3);
}
*/
// Depracated.
/*
function rebuildCoordsOriginal(R) {
	var index = 0;
	// This is 50 times faster than the sane way.
	var T = [R[0][5], R[1][5], R[2][5], R[3][5], R[4][5]];
	var a = R[0][0];
	var b = R[1][0];
	var c = R[2][0];
	var d = R[3][0];
	var e = R[4][0];
	var ZT = [0,0,0,0,0];
	var YZT = [0,0,0,0,0];
	for (var k=0; k<size; k++) {
		ZT[0] = R[0][2]*points[index].z + T[0];
		ZT[1] = R[1][2]*points[index].z + T[1];
		ZT[2] = R[2][2]*points[index].z + T[2];
		ZT[3] = R[3][2]*points[index].z + T[3];
		ZT[4] = R[4][2]*points[index].z + T[4];
		for (var j=0; j<size; j++) {
			YZT[0] = R[0][1]*points[index].y + ZT[0];
			YZT[1] = R[1][1]*points[index].y + ZT[1];
			YZT[2] = R[2][1]*points[index].y + ZT[2];
			YZT[3] = R[3][1]*points[index].y + ZT[3];
			YZT[4] = R[4][1]*points[index].y + ZT[4];
			for (var i=0; i<size; i++, index++) {
				coords[index][0] = a*points[index].x + YZT[0];
				coords[index][1] = b*points[index].x + YZT[1];
				coords[index][2] = c*points[index].x + YZT[2];
				coords[index][3] = d*points[index].x + YZT[3];
				coords[index][4] = e*points[index].x + YZT[4];
			}
		}
	}
}
*/ /*

function updateCoordsFunction(n, s) {
	a = '';
	a = a + 'var index = 0;\n';
	a = a + 'var T = [';
	for (var i=0; i<n; i++) {
		a = a + 'R['+i+']['+n+'],'
	}
	a = a + '];\n';

	a = a + 'var c1 = [';
	for (var i=0; i<n; i++) {
		a = a + 'R['+i+'][0],';
	}
	a = a + '];\n';

	a = a + 'var ZT = [';
	for (var i=0; i<n; i++) {
		a = a + '0,'
	}
	a = a + '];\n';

	a = a + 'var YZT = [';
	for (var i=0; i<n; i++) {
		a = a + '0,'
	}
	a = a + '];\n';

	a = a + 'for (var k=0; k<'+s+'; k++) {\n';
	for (var i=0; i<n; i++) {
		a = a + 'ZT['+i+'] = R['+i+'][2]*points[index].z + T['+i+'];\n'
	}

	a = a + 'for (var j=0; j<'+s+'; j++) {\n';
	for (var i=0; i<n; i++) {
		a = a + 'YZT['+i+'] = R['+i+'][1]*points[index].y + ZT['+i+'];\n'
	}

	a = a + 'for (var i=0; i<'+s+'; i++, index++) {\n';
	for (var i=0; i<n; i++) {
		a = a + 'coords[index]['+i+'] = c1['+i+']*points[index].x + YZT['+i+'];\n'
	}

	a = a + '} } }';
	return a;
}

function defaultField() {
	return new Function('x', 'c', '\
		var t = Math.sqrt(Math.abs(x[0]*x[0] + x[1]*x[1] - c[1])) - c[0]; \
		var u = Math.sqrt(Math.abs(x[2]*x[2] + x[3]*x[3] - c[3])) - c[2]; \
		return t*t + u*u - c[4]; \
	');
}

function updateFieldFunction(data) {
	if (data.messageType == 'code') {
		try {
			field = new Function('x', 'c', data.code);
		} catch(err) {
			if (data.num == 0) {
				console.log(err);
				console.log('Could not compile code. Building default field() instead.');
			}
			field = defaultField();
		}
	}
}

function rebuildScalarField(c, num) {
	if (typeof field == 'undefined') {
		this.field = defaultField();
	}
	try {
		if (isNaN( field([0,0,0,0,0], c) )) {
			throw 'NaN Error.';
		}
	} catch (err) {
		if (num == 0) {
			console.log(err);
			console.log('Code compiled, but returned NaN when evaluated at the origin.\nIs coeffCount too low? Are you accessing c[] out of bounds?');
		}
	}
	// Chrome's V8 doesn't optimize functions with try catch blocks, so we bypass that issue by making a new function.
	var applyField = function() {
		for (var i = 0; i < size3; i++) {
			values[i] = field(coords[i], c);
		}
	};
	applyField();
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function rebuildCoordsIndirectly(R) {
	rebuildCoords(R); // This makes it show up nicer in the profiler.
}

onmessage = function(e) {
	//console.time('Worker ' + e.data.num + ' Task');
	switch (e.data.messageType) {
		case 'echo':
			self.postMessage( e.data.num );
		break;
		case  'init':
			init(e.data.n, e.data.params.resolution, e.data.num);
			this.rebuildCoords = new Function('R', updateCoordsFunction(e.data.n, e.data.params.resolution));
		case 'coords':
			rebuildCoordsIndirectly(e.data.R); // rebuildCoords() is an anonymous function and makes profiling weird.
		case 'code':
			updateFieldFunction(e.data);
		case 'scalarField':
			rebuildScalarField(e.data.params.coeff, e.data.num);
		case 'geometry':
			var iso = e.data.params.iso;
			//iso = (iso<0) ? -iso*iso : iso*iso;
			var geom = marchingCubes( points, values, iso );
			reply(e.data.num, geom);
			geom = null;
		break;
		default:
			console.log('ERROR');
		break;
	}
	//console.timeEnd('Worker ' + e.data.num + ' Task');
}

function reply(num, geom) {
	self.postMessage( {num: num, geom: geom} );
}
*/
