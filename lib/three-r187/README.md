# Upstream Three.js r187

Pinned release: https://github.com/mrdoob/three.js/releases/tag/r187

Commit: `7e89746a687bb88271253698fa108b1dd59825d0`.

The four files listed in `upstream.json` are byte-for-byte upstream files;
that manifest records immutable source URLs and SHA-256 checksums. The release
ships unminified module/core builds; no local build or minification is applied.
OrbitControls is from the same commit. Do not patch these files locally.

Browser imports use the import map in isovis.html. Application compatibility
settings live in js/renderer.js; module startup/namespace bridging lives in
js/bootstrap.js. License: MIT, retained in LICENSE. The unneeded legacy r73
bundle, controls and Detector were removed; use Git history for the baseline.

.gitattributes disables line-ending conversion for the upstream JS/license files
so checksums also hold on Windows. Vendored JS is marked for GitHub folding and
excluded from whitespace lint: upstream core includes one mixed-indent line.
