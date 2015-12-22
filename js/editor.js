function defaultText() {
	return "function field(x, c, size3, n) {\n\
// Use JavaScript to define variables here.\n\
var t, u, v;\n\
\n\
for (var i=0,j=0; i<size3; i++,j+=n) {\n\
// Write your code inside the FOR loop.\n\
// Coefficients are stored in c[].\n\
// Coordinates are stored in x[].\n\
// They are flat, zero-indexed arrays, so\n\
//   x[j+0] is the first dimension, and\n\
//   x[j+3] is the fourth dimension.\n\
\n\
	t = x[j+0] * x[j+0];\n\
	t += x[j+1] * x[j+1];\n\
	t -= c[0];\n\
	t = Math.sqrt(Math.abs( t ));\n\
	t -= c[1];\n\
	t *= t;\n\
\n\
	u = x[j+2] * x[j+2];\n\
	u += x[j+3] * x[j+3];\n\
	u -= c[2];\n\
	u = Math.sqrt(Math.abs( u ));\n\
	u -= c[3];\n\
	u *= u;\n\
\n\
// You will need to push a new transform\n\
// using the fifth dimension before\n\
// this line will do anything...\n\
	v = c[4] * Math.sin(c[5] * x[j+4]);\n\
\n\
// Store output into the global values[]\n\
	values[i] = t + u + v;\n\
} // End for-loop.\n\
} // End function.";
}
/*	return "function field(x, c, size3, n) {\n\
	// Use JavaScript to define variables here.\n\
	var t, u, v;\n\
\n\
	for (var i=0,j=0; i<size3; i++,j+=n) {\n\
		t = x[j+0]*x[j+0] + x[j+1]*x[j+1];\n\
		t -= c[0];\n\
		t = Math.sqrt(Math.abs(t));\n\
		t -= c[1];\n\
\n\
		u = x[j+0]*x[j+0] + x[j+1]*x[j+1];\n\
		u -= c[0];\n\
		u = Math.sqrt(Math.abs(t));\n\
		u -= c[1];\n\
\n\
		v = Math.sin(c[5] * x[j+4]);\n\
		v *= c[4];\n\
		values[i] = t*t + u*u - v;\n\
	}\n\
\n\
}";
*/

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
	myCodeMirror.on("blur", function(){ ; ; ; }); // For future use..?
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

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	var button = document.createElement('button');
	button.className = 'button';
	button.textContent = 'Screenshot';
	button.addEventListener("click", takeScreenshot, false);
	toolbar.appendChild( button );

	var div = document.createElement('div');
	div.className = 'divider';
	toolbar.appendChild( div );

	// var button = document.createElement('button');
	// button.className = 'button';
	// button.textContent = 'GIF';
	// button.addEventListener("click", startGIF, false);
	// toolbar.appendChild( button );
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
	myCodeMirror.setSize(shapeParams.editorWidth, window.innerHeight-30);
	myCodeMirror.refresh();

	adjustRightGUI();

	// I have this same code in like three places... I should clean it up.
	renderer.setSize( window.innerWidth - shapeParams.editorWidth, window.innerHeight );
	camera.aspect	= (window.innerWidth - shapeParams.editorWidth) / (window.innerHeight );
	camera.updateProjectionMatrix();
	container.style.left = shapeParams.editorWidth.toString() + 'px';
}
