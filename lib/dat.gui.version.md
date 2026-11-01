# dat.GUI vendor provenance

- Version: **0.7.9**, upstream release (2022-02-19).
- Project: https://github.com/dataarts/dat.gui
- Exact build: https://raw.githubusercontent.com/dataarts/dat.gui/v0.7.9/build/dat.gui.min.js
- SHA-256: `6e21301e269b7fff15f217c1454b0f614c937d53081e998e8559c26ab0be3944`
- License: Apache-2.0; full text in `dat.gui.LICENSE`.

The minified build is unchanged upstream code. The app uses upstream `destroy()`
and `removeFolder()` rather than patching library internals. App-side teardown
ends active drags and clears listening lists before root destruction. Roots use
`hideable:false` to avoid the upstream global hide registry retaining old roots;
IsoVis does not use that registry. Existing GUI code still accesses documented
and historical private fields, so future updates must include browser checks.

Do not replace Three.js/OrbitControls with an unrelated current version as part
of this update: controls must match the renderer and interaction behavior needs
separate verification.

Upstream 0.7.9 still registers a non-removing anonymous window mouseup handler
inside ColorController's selector mousedown path. IsoVis therefore uses a native
RGB color input backed by a normal string controller for the single background
picker, instead of modifying that upstream code. This also avoids extra global
color-drag handlers. Background values remain hexadecimal strings.
