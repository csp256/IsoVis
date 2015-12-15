function cameraWobble() {
  if (cameraParams.wobble) {
    var t = new Date().getTime();
    wobbleTime = wobbleTime + (t - previousTime) * cameraParams.speed / 2000;
    previousTime = t;
    var l = camera.position.length();
    var r = cameraParams.radius * l * 0.05;
    var s = Math.sin(wobbleTime) * r;
    var c = Math.cos(wobbleTime) * r;
    var cameraVersor = camera.position.clone().normalize();
    var quaternion = new THREE.Quaternion().setFromUnitVectors(cameraVersor, previousCameraVersor.normalize() );
    var matrix = new THREE.Matrix4().makeRotationFromQuaternion( quaternion );
    previousCameraNormal.applyMatrix4( matrix );

    this.originalCameraPosition.copy(camera.position.clone());
    var A = previousCameraNormal.clone().sub(cameraVersor.multiplyScalar(previousCameraNormal.dot(cameraVersor) ) ).normalize(); // Gram-Schmidt
    previousCameraNormal = A.clone();
    var B = A.clone();
    B.cross(camera.position).normalize();

    camera.position.addScaledVector(A,s).addScaledVector(B,c).normalize().multiplyScalar(l);
    camera.lookAt(new THREE.Vector3());
  }
}

function cameraUnwobble() {
  if (cameraParams.wobble) {
    camera.position.copy(originalCameraPosition);
  }
  previousCameraVersor.copy(camera.position);
}

function makeCamera() {
	if (typeof camera == 'undefined') {
		var pos = new THREE.Vector3(15, 15, 15);
    this.originalCameraPosition = pos.clone();
		this.previousCameraVersor = pos.clone().normalize();
		this.previousCameraNormal = pos.clone();
		this.previousCameraNormal.y = -this.previousCameraNormal.y;
		this.previousCameraNormal.normalize();
		this.previousTime = new Date().getTime();
		this.wobbleTime = 0;
    this.windowResize = 0;
	} else {
    windowResize.stop();
		var pos = camera.position.clone();
	}
  var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
  if (cameraParams.editCode) {
    SCREEN_WIDTH = SCREEN_WIDTH - parseInt(codeMirrorWidth);
  }
	var ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000000;
  if (cameraParams.perspective) {
	  camera = new THREE.PerspectiveCamera( cameraParams.fov, ASPECT, NEAR, FAR);
	} else {
		var s = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * cameraParams.scale / 10;
    camera = new THREE.OrthographicCamera( SCREEN_WIDTH / - s, SCREEN_WIDTH / s, SCREEN_HEIGHT / s, SCREEN_HEIGHT / - s, - 500, 1000 );
  }
	camera.position.copy(pos);
	camera.lookAt(new THREE.Vector3());

	controls = new THREE.OrbitControls( camera, renderer.domElement );
  windowResize = THREEx.WindowResize(renderer, camera, shapeParams.editorWidth);
}

function changeCamera() {
	makeCamera();
	buildLeftGUI();
  updateEditor();
}

function updateBackground() {
	renderer.setClearColor( cameraParams.background, 1 );
  document.bgcolor = cameraParams.background;
}

function updateStats() {
  if (typeof stats == 'undefined') {
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.bottom = '0px';
    stats.domElement.style.right = '0px';
    stats.domElement.style.zIndex = '0';
    stats.domElement.style.id = "stats";
    container.appendChild( stats.domElement );
  }
  if (cameraParams.fps) {
    stats.domElement.style.zIndex = '0';
  } else {
    stats.domElement.style.zIndex = '-10';
  }
}
