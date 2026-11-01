function init() {
	this.renderer = create_renderer();
	this.worker_source_string = gather_worker_resource('default_field_source') + gather_worker_resource('worker');
//	worker_source_string = worker_source_string + gather_worker_resource('three');
	worker_source_string = worker_source_string + gather_worker_resource('marching_cubes');

	this.vertex_buffer = new Array(8);
	this.face_buffer = new Array(8);
	this.normal_buffer = new Array(8);
	for (var i=0;i<8;i++) {
		vertex_buffer[i] = new ArrayBuffer(4);
		face_buffer[i] = new ArrayBuffer(4);
		normal_buffer[i] = new ArrayBuffer(4);
	}
	this.meshes = new Array(8);
	for (var i=0;i<8;i++) {
		var g = new THREE.BufferGeometry()
		g.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(0,0,0), 3 ) );
		g.setIndex(  new THREE.BufferAttribute( new Uint16Array(0),1));
		g.setAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(0,0,0), 3 ) );
		meshes[i] = new THREE.Mesh(g);
	}
	update_material();

	init_editor();
	init_workers();

	renderer.autoClear = false;
	renderer.setSize(window.innerWidth, window.innerHeight);
	this.container = document.getElementById( 'three_js' );
	container.appendChild( renderer.domElement );
	this.waiting_for_next_frame = false;
	this.making_gif = false;
	this.done_with_gif = true; // Reference making_gif instead; this is just for an edge case
	this.start_frame = 0;

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

  // Match legacy constant-distance lighting and compensate the modern BRDF.
  lights.forEach(function(light) { light.decay = 0; light.intensity = Math.PI; });

	var axis_min = -10;
	var axis_max =  10;
	var axis_range = axis_max - axis_min;
	this.scene_positions = [	new THREE.Vector3(  axis_max/2,  axis_max/2,  axis_max/2),
							new THREE.Vector3( -axis_max/2,  axis_max/2,  axis_max/2),
							new THREE.Vector3(  axis_max/2, -axis_max/2,  axis_max/2),
							new THREE.Vector3( -axis_max/2, -axis_max/2,  axis_max/2),
							new THREE.Vector3(  axis_max/2,  axis_max/2, -axis_max/2),
							new THREE.Vector3( -axis_max/2,  axis_max/2, -axis_max/2),
							new THREE.Vector3(  axis_max/2, -axis_max/2, -axis_max/2),
							new THREE.Vector3( -axis_max/2, -axis_max/2, -axis_max/2) ];
	this.quadrances = [0,0,0,0,0,0,0,0,];
	this.rendered = [false,false,false,false,false,false,false,false,];
	this.render_order = [0,0,0,0,0,0,0,0,];

	scene = new THREE.Scene();
	scene.add( new THREE.AxesHelper(axis_max) );

	this.transforms = [];
	transforms.push( plain_transform() );
	transforms.last().axis2 = 3;
	transforms.last().degrees = 24;

	this.base_orientation = numeric.identity(n+1);

	this.size_dirty = false;
	this.coords_dirty = false;
	this.scalar_field_dirty = false;
	this.mesh_dirty = false;
	this.set_size_dirty = function(value) { size_dirty = true; }
	this.set_coords_dirty = function(value) {	coords_dirty = true;  }
	this.set_scalar_field_dirty = function(value) { scalar_field_dirty = true; }
	this.set_mesh_dirty = function(value) { mesh_dirty = true; };
	this.update_transform_type = function(value) { coords_dirty = true; build_gui(); }

	reset_scenes();
	reset_worker(get_url_resolution(shape_params.resolution));
	//build_gui();
	update_stats();
	update_background();
}

function reset_scenes() {
	if (typeof scenes != 'undefined' && scenes.length == 8) return;
	this.scenes = [];
	for (var k=0; k<8; k++) {
		scenes.push( new THREE.Scene() );
		for (var i=0; i<lights.length; i++) {
			scenes[k].add(lights[i].clone());
		}
		scenes[k].add(meshes[k]);
	}
}

function update_scene_mesh(octant, mesh) {
	var target = scenes[octant];
	// Lights are permanent; only the previous surface belongs to this slot.
	for (var i=target.children.length-1; i>=0; i--) {
		if (target.children[i] instanceof THREE.Mesh) target.remove(target.children[i]);
	}
	target.add(mesh);
}

function update_material() {
	var old_material = typeof my_material == 'undefined' ? null : my_material;
	switch (parseInt(material_params.material)) {
		default:
		case 0:
			my_material = new THREE.MeshBasicMaterial();
		break;
		case 1:
			my_material = create_depth_display_material();
		break;
	//	case 2:
	//		my_material = new THREE.MeshFaceMaterial();
	//	break;
		case 3:
			my_material = new THREE.MeshLambertMaterial();
		break;
		case 4:
			my_material = new THREE.MeshNormalMaterial();
		break;
		case 5:
			my_material = new THREE.MeshPhongMaterial();
		break;
	}
	my_material.transparent = true;
	my_material.side = material_params.side;
	my_material.opacity = material_params.opacity;
	my_material.wireframe = material_params.wireframe;
	my_material.blending = parseInt(material_params.blending);
	my_material.blendEquation = parseInt(material_params.equation);
	my_material.depthTest = material_params.depth_test;
	my_material.depthWrite = material_params.depth_write;
	for (var i=0; i<8; i++) {
		meshes[i].material = my_material;
	}
	if (old_material) old_material.dispose();
}

function animate() {
	camera_wobble();
	render();
	if (making_gif && done_with_gif) stop_gif();
	else if (making_gif && !waiting_for_any_web_worker()) schedule_gif_capture();
	camera_unwobble();
	update();
	requestAnimationFrame( animate );
}

function update() {
	controls.update();
	stats.update();
	if (!making_gif) {
		var request = size_dirty ? 'init' : coords_dirty ? 'coords' : scalar_field_dirty ? 'scalar_field' : mesh_dirty ? 'geometry' : null;
		if (request && talk_to_worker(request)) {
			size_dirty = coords_dirty = scalar_field_dirty = mesh_dirty = false;
		}
	}
}

function render() {
	renderer.clear();
	for (var i=0;i<8;i++) {
		quadrances[i] = camera.position.distanceToSquared(scene_positions[i]);
		rendered[i] = false;
	}
	for (var i=0;i<8;i++) {
		var max_quadrance = Number.NEGATIVE_INFINITY;
		var furthest_octant = -1;
		for (var j=0;j<8;j++) { // Find further away unrendered octant.
			if (!rendered[j]) {
				if (quadrances[j] > max_quadrance) {
					max_quadrance = quadrances[j];
					furthest_octant = j;
				}
			}
		}
		if (furthest_octant == -1) {
			console.log("ERROR");
		}
		rendered[furthest_octant] = true;
		render_order[i] = furthest_octant;
	}
	for (var i=0; i<8; i++) {
		renderer.render(scenes[render_order[i]], camera);
	}
	for (var i=0;i<8;i++) {
//		scene.remove(meshes[i]);
	}
	renderer.clearDepth();
	if (camera_params.axes) {
		renderer.render( scene, camera );
	}
}
