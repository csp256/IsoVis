function defaultText() {
	return "function field(x, c, size3, n) {\n\
	for (var i=0,j=0; i<size3; i++,j+=n) {\n\
		var t = Math.sqrt(Math.abs(x[j+0]*x[j+0] + x[j+1]*x[j+1] - c[0])) - c[1];\n\
		var u = Math.sqrt(Math.abs(x[j+2]*x[j+2] + x[j+3]*x[j+3] - c[2])) - c[3];\n\
		values[i] = t*t + u*u - c[4]*Math.sin(c[5]*x[j+4]);\n\
	}\n\
}";
}

function beforeChangeCallback(cm, change) {
	if (change.from.line == 0 || change.to.line == cm.lineCount()-1) {
		change.cancel();
	}
}

function initEditor() {
	this.codeMirrorDiv = document.getElementById("codemirror");
	this.myCodeMirror = CodeMirror(codeMirrorDiv, {
		value: defaultText(),
		mode:  "javascript",
		lineNumbers: true,
		matchBrackets: true,
		indentWithTabs: true,
		tabSize: 2,
		indentUnit: 2,
		lineWrapping: true,
		viewportMargin: Infinity,
	});
	myCodeMirror.on("beforeChange", beforeChangeCallback );
	myCodeMirror.on("blur", function(){console.log('ok');});
	myCodeMirror.setOption("theme", 'pastel-on-dark');

	this.toolbar = document.getElementById( 'toolbar' );
	toolbar.className = 'toolbar';

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	var buttonRun = document.createElement( 'button' );
	buttonRun.className = 'button';
	buttonRun.textContent = 'Update';
	buttonRun.addEventListener( 'click', function ( event ) {
		talkToWorker('code');
	}, false );
	toolbar.appendChild( buttonRun );

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	var buttonReset = document.createElement( 'button' );
	buttonReset.className = 'button';
	buttonReset.textContent = 'Reset';
	buttonReset.addEventListener( 'click', function ( event ) {
		myCodeMirror.off("beforeChange", beforeChangeCallback );
		myCodeMirror.setValue( defaultText() );
		myCodeMirror.refresh();
		talkToWorker('code');
		myCodeMirror.on("beforeChange", beforeChangeCallback );
	}, false );
	toolbar.appendChild( buttonReset );

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	var buttonExport = document.createElement( 'button' );
	buttonExport.className = 'button';
	buttonExport.textContent = 'Export';
	buttonExport.addEventListener( 'click', exportToJSON, false );
	toolbar.appendChild( buttonExport );

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	var button = document.createElement( 'button' );
	button.className = 'button';
	button.textContent = 'Import';
	button.addEventListener( 'click', importFromJSON, false );
	toolbar.appendChild( button );

}

function updateEditor() {
	var widthString = shapeParams.editorWidth.toString() + 'px';
	toolbar.style.width = widthString;
	codeMirrorDiv.style.width = widthString;
	codeMirrorDiv.style.left = '0px';
	codeMirrorDiv.style.top = ( /*document.getElementById("toolbar").offsetHeight +*/ document.getElementById("toolbar").getBoundingClientRect().bottom).toString() + 'px';
	makeCamera();
	container.style.left = widthString;
	leftgui.domElement.style.left = widthString;

	container.children[0].style.width = (window.innerWidth - shapeParams.editorWidth).toString() + 'px';
	myCodeMirror.setSize(shapeParams.editorWidth, window.innerHeight);
	myCodeMirror.refresh();

	adjustRightGUI();

	// I have this same code in like three places... I should clean it up.
	renderer.setSize( window.innerWidth - shapeParams.editorWidth, window.innerHeight );
	camera.aspect	= (window.innerWidth - shapeParams.editorWidth) / (window.innerHeight );
	camera.updateProjectionMatrix();
	container.style.left = shapeParams.editorWidth.toString() + 'px';
}
