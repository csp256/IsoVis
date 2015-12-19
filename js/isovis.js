function init() {
	this.workerSourceString = gatherWorkerResource('worker');
//	workerSourceString = workerSourceString + gatherWorkerResource('three');
	workerSourceString = workerSourceString + gatherWorkerResource('marchingCubes');

	this.vertexBuffer = new Array(8);
	this.faceBuffer = new Array(8);
	this.normalBuffer = new Array(8);
	for (var i=0;i<8;i++) {
		vertexBuffer[i] = new ArrayBuffer(4);
		faceBuffer[i] = new ArrayBuffer(4);
		normalBuffer[i] = new ArrayBuffer(4);
	}
	this.theBoundingSphere = new THREE.Sphere(); // Only used to suppress irrelevant error messages in handleWorkerMessage().
	this.meshes = new Array(8);
	for (var i=0;i<8;i++) {
		var g = new THREE.BufferGeometry()
		g.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(0,0,0), 3 ) );
		g.setIndex(  new THREE.BufferAttribute( new Float32Array(0,0,0),3));
		g.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(0,0,0), 3 ) );
		meshes[i] = new THREE.Mesh(g);
	}
	updateMaterial();

	initEditor();
	initWorkers();

	if ( Detector.webgl )
		renderer = new THREE.WebGLRenderer( {antialias:true, preserveDrawingBuffer: true} );
	else
		renderer = new THREE.CanvasRenderer();
	renderer.autoClear = false;
	renderer.setSize(window.innerWidth, window.innerHeight);
	this.container = document.getElementById( 'ThreeJS' );
	container.appendChild( renderer.domElement );

	if (!Array.prototype.last) { // Adds the .last() function to arrays!
		Array.prototype.last = function(){
			return this[this.length - 1];
		};
	};
	this.lights = [];
	lights.push(new THREE.PointLight(0xff0000));
	lights.last().position.set(15,0,0);
	lights.push(new THREE.PointLight(0x00ff00));
	lights.last().position.set(0,15,0);
	lights.push(new THREE.PointLight(0x0000ff));
	lights.last().position.set(0,0,15);
	lights.push(new THREE.PointLight(0xff0000));
	lights.last().position.set(-15,0,0);
	lights.push(new THREE.PointLight(0x00ff00));
	lights.last().position.set(0,-15,0);
	lights.push(new THREE.PointLight(0x0000ff));
	lights.last().position.set(0,0,-15);
	lights.push(new THREE.PointLight(0xaaaaaa));
	lights.last().position.set(0,0,0);
	lights.push(new THREE.PointLight(0xaaaaaa));
//	lights.last().position.set(camera.position);
//	lights.push(new THREE.AmbientLight(0x222222));

	var axisMin = -10;
	var axisMax =  10;
	var axisRange = axisMax - axisMin;
	this.scenePositions = [	new THREE.Vector3(  axisMax/2,  axisMax/2,  axisMax/2),
							new THREE.Vector3( -axisMax/2,  axisMax/2,  axisMax/2),
							new THREE.Vector3(  axisMax/2, -axisMax/2,  axisMax/2),
							new THREE.Vector3( -axisMax/2, -axisMax/2,  axisMax/2),
							new THREE.Vector3(  axisMax/2,  axisMax/2, -axisMax/2),
							new THREE.Vector3( -axisMax/2,  axisMax/2, -axisMax/2),
							new THREE.Vector3(  axisMax/2, -axisMax/2, -axisMax/2),
							new THREE.Vector3( -axisMax/2, -axisMax/2, -axisMax/2) ];
	this.quadrances = [0,0,0,0,0,0,0,0,];
	this.rendered = [false,false,false,false,false,false,false,false,];
	this.renderOrder = [0,0,0,0,0,0,0,0,];

	scene = new THREE.Scene();
	scene.add( new THREE.AxisHelper(axisMax) );

	this.transforms = [];
	transforms.push( plainTransform() );
	transforms.last().axis2 = 3;
	transforms.last().degrees = 24;

	this.baseOrientation = numeric.identity(n+1);

	this.sizeDirty = false;
	this.coordsDirty = false;
	this.scalarFieldDirty = false;
	this.meshDirty = false;
	this.setSizeDirty = function(value) { sizeDirty = true; }
	this.setCoordsDirty = function(value) {	coordsDirty = true;  }
	this.setScalarFieldDirty = function(value) { scalarFieldDirty = true; }
	this.setMeshDirty = function(value) { meshDirty = true; };
	this.updateTransformType = function(value) { coordsDirty = true; buildGUI(); }

	resetScenes();
	resetWorker(getURLParameterWithDefault('resolution', shapeParams.resolution));
	//buildGUI();
	updateStats();
	updateBackground();
}

function resetScenes() {
	// I should do this in a smarter way.
	// This function is called for each message from worker...
	this.scenes = [];
	for (var k=0; k<8; k++) {
		scenes.push( new THREE.Scene() );
		for (var i=0; i<lights.length; i++) {
			scenes[k].add(lights[i].clone());
		}
		scenes[k].add(meshes[k]);
	}
}

function updateMaterial() {
	switch (parseInt(materialParams.material)) {
		default:
		case 0:
			myMaterial = new THREE.MeshBasicMaterial();
		break;
		case 1:
			myMaterial = new THREE.MeshDepthMaterial();
		break;
	//	case 2:
	//		myMaterial = new THREE.MeshFaceMaterial();
	//	break;
		case 3:
			myMaterial = new THREE.MeshLambertMaterial();
		break;
		case 4:
			myMaterial = new THREE.MeshNormalMaterial();
		break;
		case 5:
			myMaterial = new THREE.MeshPhongMaterial();
		break;
	}
	myMaterial.transparent = true;
	myMaterial.side = materialParams.side;
	myMaterial.opacity = materialParams.opacity;
	myMaterial.wireframe = materialParams.wireframe;
	myMaterial.blending = parseInt(materialParams.blending);
	myMaterial.blendEquation = parseInt(materialParams.equation);
	myMaterial.depthTest = materialParams.depthTest;
	myMaterial.depthWrite = materialParams.depthWrite;
	for (var i=0; i<8; i++) {
		meshes[i].material = myMaterial;
	}
}

function animate() {
	cameraWobble();
	render();
	cameraUnwobble();
	update();
	requestAnimationFrame( animate );
}

function update() {
	controls.update();
	stats.update();
	if (sizeDirty) {
		sizeDirty = false;
		talkToWorker('init');
	}
	if (coordsDirty) {
		coordsDirty = false;
		talkToWorker('coords');
	}
	if (scalarFieldDirty) {
		scalarFieldDirty = false;
		talkToWorker('scalarField');
	}
	if (meshDirty) {
		meshDirty = false;
		talkToWorker('geometry');
	}
}

function render() {
	renderer.clear();
	for (var i=0;i<8;i++) {
		quadrances[i] = camera.position.distanceToSquared(scenePositions[i]);
		rendered[i] = false;
	}
	for (var i=0;i<8;i++) {
		var maxQuadrance = Number.NEGATIVE_INFINITY;
		var furthestOctant = -1;
		for (var j=0;j<8;j++) { // Find further away unrendered octant.
			if (!rendered[j]) {
				if (quadrances[j] > maxQuadrance) {
					maxQuadrance = quadrances[j];
					furthestOctant = j;
				}
			}
		}
		if (furthestOctant == -1) {
			console.log("ERROR");
		}
		rendered[furthestOctant] = true;
		renderOrder[i] = furthestOctant;
	}
	for (var i=0; i<8; i++) {
		renderer.render(scenes[renderOrder[i]], camera);
	}
	for (var i=0;i<8;i++) {
//		scene.remove(meshes[i]);
	}
	renderer.clearDepth();
	if (cameraParams.axes) {
		renderer.render( scene, camera );
	}
}
