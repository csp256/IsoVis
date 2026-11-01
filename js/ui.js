// dat.GUI mutates before invoking callbacks: restore invalid edits immediately.
function validated_number_control(folder, object, key, validate, changed, finish, bounds) {
  var previous = object[key];
  // Set ranges before callbacks: dat.GUI can replace boxes with sliders when
  // bounds are added later, dropping handlers attached to the original box.
  var control = folder.add.apply(folder, [object, key].concat(bounds || []));
  var accepted = true;
  control.onChange(function(value) {
    try { validate(value); }
    catch (error) {
      accepted = false;
      object[key] = previous;
      control.updateDisplay();
      report_worker_error(error.message);
      return;
    }
    accepted = true;
    previous = value;
    if (!finish) changed();
  });
  if (finish) control.onFinishChange(function() { if (accepted) changed(); });
  return control;
}

// Keep lifecycle adaptation in application code; the vendored build is pristine.
function destroy_gui(gui) {
  function stop_listening(folder) {
    folder.__listening.length = 0;
    Object.keys(folder.__folders).forEach(function(name) { stop_listening(folder.__folders[name]); });
  }
  // End any active numeric/color/panel drag before removing its controls.
  window.dispatchEvent(new MouseEvent('mouseup'));
  stop_listening(gui);
  gui.destroy();

}

function build_left_gui() {
  if (typeof left_gui == 'undefined') {
    // Default state.
    var closed_state = { Shape: false, Camera: true, Material: true };
  } else {
    var closed_state = { Shape: left_gui.__folders.Shape.closed, Camera: left_gui.__folders.Camera.closed, Material: left_gui.__folders.Material.closed };
    destroy_gui(left_gui);
  }
	left_gui = new dat.GUI({hideable:false});
  left_gui.domElement.id = 'left_gui';

  shape_folder(left_gui);
  left_gui.__folders.Shape.closed = closed_state.Shape;

  camera_folder(left_gui);
  left_gui.__folders.Camera.closed = closed_state.Camera;

  material_folder(left_gui)
  left_gui.__folders.Material.closed = closed_state.Material;

  left_gui.__closeButton.style.position = 'fixed';
  left_gui.__closeButton.style.left = -10000;
}

function update_coeff() {
  set_scalar_field_dirty();
  while (shape_params.coeff.length < shape_params.coeff_count) {
    shape_params.coeff.push(cached_coeff[shape_params.coeff.length]);
  }
  while (shape_params.coeff_count < shape_params.coeff.length) {
    cached_coeff[shape_params.coeff.length-1] = shape_params.coeff.pop();
  }

  var c = left_gui.__folders.Shape.__folders.Coefficients.closed;
  left_gui.__folders.Shape.__folders.Coefficients.close();
  left_gui.__folders.Shape.removeFolder(left_gui.__folders.Shape.__folders.Coefficients);
  left_gui.__folders.Shape.onResize();
  var sub_folder = left_gui.__folders.Shape.addFolder('Coefficients');
  for (var i=0; i<shape_params.coeff_count; i++) {
    sub_folder.add(shape_params.coeff, i, shape_params[i]).onChange( set_scalar_field_dirty );
  }
  if (!c || typeof c == 'undefined') {
    sub_folder.open();
  } else {
    sub_folder.close();
  }
}

function dimensions_changed() {
  try {
    var next_stack = normalized_transform_stack(transforms, shape_params.dimensions, false);
  } catch (error) {
    shape_params.dimensions = n;
    report_worker_error(error.message);
    build_left_gui();
    return;
  }
  n = shape_params.dimensions;
  transforms = next_stack;
  reset_orientation();
  reset_worker(shape_params.resolution);
}

function shape_folder(g) {
  var folder = g.addFolder('Shape');
  folder.add(shape_params, 'editor_width').min(0).max(window.innerWidth*0.5 /* - Math.min(245, 2*parseInt(left_gui.domElement.style.width)) */).step(1).onFinishChange( update_editor );
  validated_number_control(folder, shape_params, 'resolution', require_resolution, set_size_dirty, true, [2,65,1]);
  folder.add(shape_params, 'reset').name('Abort').onChange( reset_worker10 );
  folder.add(shape_params, 'memory_overuse').min(0).max(1).step(0.01);
  folder.add(shape_params, 'interpolate').onChange( set_mesh_dirty );
  folder.add(shape_params, 'iso').onChange( set_mesh_dirty );
  folder.add(shape_params, 'dimensions').min(3).step(1).onFinishChange( dimensions_changed );
  folder.add(shape_params, 'coeff_count').min(1).max(shape_params.max_coeff_count).step(1).onChange( update_coeff );
  var sub_folder = folder.addFolder('Coefficients');
  for (var i=0; i<shape_params.coeff_count; i++) {
    sub_folder.add(shape_params.coeff, i, shape_params[i]).onChange( set_scalar_field_dirty );
  }
  sub_folder.open();
}

function camera_folder(g) {
  var folder = g.addFolder('Camera');
  folder.add(camera_params, 'perspective').onChange( change_camera );
  if (camera_params.perspective) {
    folder.add(camera_params, 'fov').min(0.05).max(179.95).onChange( make_camera );
  } else {
    folder.add(camera_params, 'scale').min(0.05).onChange( make_camera );
  }
  folder.add(camera_params, 'radius').min(0).max(10).step(0.01);
  folder.add(camera_params, 'speed').min(0).max(10).step(0.01);
  folder.add(camera_params, 'axes');
  // A native RGB picker avoids the upstream ColorController's retained global
  // mouseup closure while preserving a simple background-color control.
  var background = folder.add(camera_params, 'background').onChange(update_background).listen();
  background.__input.type = 'color';
  background.__input.addEventListener('input', function() { background.setValue(this.value); });
  folder.add(camera_params, 'fps').onChange( update_stats );
}

function toggle_normals() { // This might make the mesh invisible... best to do that when they click it and not when they change the iso next...
  set_mesh_dirty();
  update_material();
}

function material_folder(g) {
  var folder = g.addFolder('Material');
  folder.add(material_params, 'calc_normals').onChange( toggle_normals );
	folder.add(material_params, 'material', {Basic:0, Depth:1, /*Face:2,*/ Lambert:3, Normals:4, Phong:5}).onChange( update_material );
	folder.add(material_params, 'blending', {None:THREE.NoBlending, Standard:THREE.NormalBlending, Additive:THREE.AdditiveBlending, Subtractive:THREE.SubtractiveBlending, Multiplicative:THREE.MultiplyBlending, Custom:THREE.CustomBlending}).onChange( update_material );
	folder.add(material_params, 'side', {Front:THREE.FrontSide, Back:THREE.BackSide, Both:THREE.DoubleSide}).onChange( update_material );
	folder.add(material_params, 'wireframe').onChange( update_material );
  folder.add(material_params, 'opacity').min(0).max(1).step(0.01).onChange( update_material );
	folder.add(material_params, 'depth_test').onChange( update_material );
	folder.add(material_params, 'depth_write').onChange( update_material );
  folder.add(material_params, 'equation', {Add:THREE.AddEquation, Subtract:THREE.SubtractEquation, ReverseSubtract:THREE.ReverseSubtractEquation, Min:THREE.MinEquation, Max:THREE.MaxEquation}).onChange( update_material );

}

// /////////////////////////////

function build_right_gui() {
  if (typeof right_gui == 'undefined') {
    var closed_state = {Transforms: true};
  } else {
    //for (obj in right_gui.__folders) { ... }
    var closed_state = { Transforms: right_gui.__folders.Transforms.closed };
    destroy_gui(right_gui);
  }
  right_gui = new dat.GUI({hideable:false});

  validated_number_control(right_gui, transform_params, 'zoom', require_zoom, set_coords_dirty, false, [0.000001]);

  transforms_folder(right_gui);
  right_gui.__folders.Transforms.closed = closed_state.Transforms;

	for (i=0; i<transforms.length; i++) {
		switch (transforms[i].type) {
			case "0": // EULER ROTATION
				var folder = right_gui.addFolder((i+1)+' Euler Rotation');
				folder.add(transforms[i], 'type', {Rotation:0, Scaling:1, Translation:2, Shear:3}).onChange( update_transform_type );
				folder.add(transforms[i], 'axis1').min(0).max(n-1).step(1).onChange( set_coords_dirty );
				folder.add(transforms[i], 'axis2').min(0).max(n-1).step(1).onChange( set_coords_dirty );
				folder.add(transforms[i], 'degrees').min(-180).max(180).onChange( set_coords_dirty );
			break;
			case "1": // SCALE
				var folder = right_gui.addFolder((i+1)+' Scale');
				folder.add(transforms[i], 'type', {Rotation:0, Scaling:1, Translation:2, Shear:3}).onChange( update_transform_type );
        for (var k=0; k<n; k++) validated_number_control(folder, transforms[i].s, k, require_scale, set_coords_dirty, false, [-Infinity]);
			break;
			case "2": // TRANSLATE
				var folder = right_gui.addFolder((i+1)+' Translation');
				folder.add(transforms[i], 'type', {Rotation:0, Scaling:1, Translation:2, Shear:3}).onChange( update_transform_type );
        for (var k=0; k<n; k++) folder.add(transforms[i].d, k, transforms[i].d[k]).min(-Infinity).name('Dimension '+(k+1).toString()).onChange(set_coords_dirty);
			break;
			case "3": // SHEAR
				var folder = right_gui.addFolder((i+1)+' Shear');
				folder.add(transforms[i], 'type', {Rotation:0, Scaling:1, Translation:2, Shear:3}).onChange( update_transform_type );
				folder.add(transforms[i], 'row').min(0).max(n-1).step(1).onChange( set_coords_dirty );
				folder.add(transforms[i], 'col').min(0).max(n-1).step(1).onChange( set_coords_dirty );
				folder.add(transforms[i], 'shear').onChange( set_coords_dirty );
			break;
			default: // error!
				console.log('error in switch in build_gui()');
		}
		if (i==transforms.length-1) {
			folder.open();
		}
	}

  adjust_right_gui();
}

function transforms_folder(g) {
  var folder = g.addFolder('Transforms');
  folder.add(transform_params, 'invert_order').onChange( invert_order );
  folder.add(transform_params, 'push_transform').onChange( push_transform );
  folder.add(transform_params, 'pop_transform').onChange( pop_transform );
  folder.add(transform_params, 'apply_transforms').onChange( apply_transforms );
  folder.add(transform_params, 'pop_all_on_apply');
  folder.add(transform_params, 'reset_orientation').onChange( reset_orientation );
  folder.add(transform_params, 'pop_all_transforms').onChange( pop_all_transforms );
}

function adjust_right_gui() {
  right_gui.domElement.style.position = 'fixed';
  right_gui.domElement.style.left = (window.innerWidth - parseInt(right_gui.domElement.style.width)).toString() + 'px';
  right_gui.domElement.style.height = (window.innerHeight - 50).toString() + 'px';
}

// /////////////////////////////

function build_gui() {
  build_left_gui();
  build_right_gui();
  update_editor();
}
