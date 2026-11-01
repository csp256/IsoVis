function default_text() {
	return 'function field(x, c, size3, n) {\n' + default_field_body() + '\n}';
}

function before_change_callback(cm, change) {
	if (change.from.line == 0 || change.to.line == cm.lineCount()-1) {
		change.cancel();
	}
}

function init_editor() {
	this.code_mirror_div = document.getElementById("codemirror");
	this.my_code_mirror = CodeMirror(code_mirror_div, {
		value: default_text(),
		mode:  "javascript",
		lineNumbers: true,
		matchBrackets: true,
		indentWithTabs: true,
		tabSize: 2,
		indentUnit: 2,
		lineWrapping: true,
		viewportMargin: Infinity,
	});
	my_code_mirror.on("beforeChange", before_change_callback );
	my_code_mirror.on("blur", function(){ ; ; ; }); // For future use..?
	my_code_mirror.setOption("theme", 'pastel-on-dark');

	this.toolbar = document.getElementById( 'toolbar' );
	toolbar.className = 'toolbar';

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	var button_run = document.createElement( 'button' );
	button_run.className = 'button';
	button_run.textContent = 'Update';
	button_run.addEventListener( 'click', function ( event ) {
		talk_to_worker('code');
	}, false );
	toolbar.appendChild( button_run );

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	var button_reset = document.createElement( 'button' );
	button_reset.className = 'button';
	button_reset.textContent = 'Reset';
	button_reset.addEventListener( 'click', function ( event ) {
		my_code_mirror.off("beforeChange", before_change_callback );
		my_code_mirror.setValue( default_text() );
		my_code_mirror.refresh();
		talk_to_worker('code');
		my_code_mirror.on("beforeChange", before_change_callback );
	}, false );
	toolbar.appendChild( button_reset );

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	var button_export = document.createElement( 'button' );
	button_export.className = 'button';
	button_export.textContent = 'Export';
	button_export.addEventListener( 'click', export_to_json, false );
	toolbar.appendChild( button_export );

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	var button = document.createElement( 'button' );
	button.className = 'button';
	button.textContent = 'Import';
	button.addEventListener( 'click', import_from_json, false );
	toolbar.appendChild( button );

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	var button = document.createElement('button');
	button.className = 'button';
	button.textContent = 'Screenshot';
	button.addEventListener("click", take_screenshot, false);
	toolbar.appendChild( button );

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	// var button = document.createElement('button');
	// button.className = 'button';
	// button.textContent = 'GIF';
	// button.addEventListener("click", start_gif, false);
	// toolbar.appendChild( button );
}


function update_editor() {
	var width_string = shape_params.editor_width.toString() + 'px';
	toolbar.style.width = width_string;
	code_mirror_div.style.width = width_string;
	code_mirror_div.style.left = '0px';
	code_mirror_div.style.top = ( /*document.getElementById("toolbar").offsetHeight +*/ document.getElementById("toolbar").getBoundingClientRect().bottom).toString() + 'px';
	make_camera();
	container.style.left = width_string;
	left_gui.domElement.style.left = width_string;

	container.children[0].style.width = (window.innerWidth - shape_params.editor_width).toString() + 'px';
	my_code_mirror.setSize(shape_params.editor_width, window.innerHeight-30);
	my_code_mirror.refresh();

	adjust_right_gui();

	// I have this same code in like three places... I should clean it up.
	renderer.setSize( window.innerWidth - shape_params.editor_width, window.innerHeight );
	camera.aspect	= (window.innerWidth - shape_params.editor_width) / (window.innerHeight );
	camera.updateProjectionMatrix();
	container.style.left = shape_params.editor_width.toString() + 'px';
}
