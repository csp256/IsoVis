# Naming conventions

- First-party variables, functions, object properties, worker protocol fields,
  DOM IDs and filenames use `snake_case`.
- Types/classes use `CamelCase`. There are no new application types introduced
  by the naming cleanup; native/imported types keep their library spellings.
- Existing one-word names and numeric suffixes (`field`, `n`, `size3`, `axis1`)
  need no extra underscores. Acronyms are lowercase (`get_url_resolution`).
- Conventional repository filenames (`README.md`, `LICENSE`, dotfiles and GitHub
  workflow conventions) retain their tooling-recognized names.

## Boundaries

Do not rename browser, JavaScript, Three.js, dat.GUI, CodeMirror, Bun or Node
APIs: `postMessage`, `getElementById`, `setAttribute`, `depthTest`, `onChange`,
`THREE.BufferGeometry`, etc. A first-party field can still be `depth_test` while
the library property it configures remains `my_material.depthTest`.

Copied library code/assets in `lib/` and `css/` are not style-refactored. Their
upstream paths, public exports, licenses and checksums stay intact. Our own
provenance README can be updated when application links change.

Version-1 saved-session JSON retains its historical external camelCase keys.
`session_from_wire` / `session_to_wire` in `js/export_import.js` translate known
structural keys at the boundary; both v1 envelopes and older group arrays remain
supported. Duplicate aliases and unknown fields are rejected, not silently
merged. The internal representation is snake_case. No schema version change is
needed because the external export format has not changed.

User-authored field bodies are opaque strings, never renamed or rewritten. The
public inputs/globals `x`, `c`, `n`, `points`, `coords`, `values`, `size`, `size2`
and `size3` remain unchanged. JSON fixtures deliberately keep historical names
and a user-defined camelCase variable to verify that boundary.

Historical benchmark JSON is also retained verbatim; new benchmark APIs and
reports use snake_case. See `docs/threejs_upgrade.md` for how to reproduce old
measurements with the matching historical driver, rather than current globals.

## Verification

Run `bun tests/run.cjs`. The filename/basic-declaration guard is deliberately
small and dependency-free, not a full JavaScript parser/linter. Tests also cover
legacy JSON, stable export key sets, unchanged user code, duplicate-alias and
prototype-key rejection, and the real worker executing a historical field body.

Optional installed-Chrome checks:

```sh
bun tests/browser_smoke.mjs
bun tests/browser_smoke.mjs --unsupported
bun tests/browser_smoke.mjs --visual --report visual.json
bun tests/browser_smoke.mjs --benchmark --report benchmark.json
```

The new entry point is `isovis.html`, not `IsoVis.html` (case matters on Linux).
No legacy HTML redirect is added. Update local bookmarks to
http://127.0.0.1:8000/isovis.html when serving with the README command.

For this cleanup, all eight controlled r187 visual fixtures matched pre-rename
PNG bytes and sampled RGB arrays exactly, including solid materials, wireframe,
custom blending and orthographic projection. Chrome correctness, legacy import,
PNG export, large-index rendering, controls and listener-lifecycle checks passed.
The small benchmark still runs; no performance change is claimed.
