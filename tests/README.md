# Regression tests

The app remains plain browser JavaScript, with no build or install step.
Tests need only [Bun](https://bun.sh/); Node is not required. They use Bun's
built-in Node-compatible assertion, file, and VM APIs, with no third-party
packages, package manifest, or lockfile.

From the repository root, run all tests in this checkout sequentially:

```sh
bun tests/run.cjs
```

Individual `tests/audit_<finding>.cjs` files can also be run directly with Bun.
Fixtures are small and there are no parallel test workers. VM tests substitute
browser APIs; they do not claim browser rendering or performance coverage.

The regression workflow runs the same command on pull requests and pushes to
`main`, using pinned Bun 1.4.4 and read-only repository permissions. No browser
benchmark runs in CI. A failing assertion fails the job.

## Optional real-browser migration checks

The Three.js migration adds offline upstream checksum/capability tests and
updates geometry/control fixtures to the actual pinned r187 modules. No browser
or GPU is required for `bun tests/run.cjs`.

For installed desktop Chrome only, optional sequential checks are available:

```sh
bun tests/browser_smoke.mjs
bun tests/browser_smoke.mjs --unsupported
```

These launch a temporary headless Chrome with software SwiftShader and a local
server. Set `--chrome "path/to/chrome"` or `CHROME_PATH` if necessary. They are
not run automatically in CI and are not hardware-GPU benchmarks. See
[the migration notes](../docs/threejs_upgrade.md) for visual/performance reports,
comparison commands, coverage and important support changes.

Naming cleanup fixtures additionally cover pre-rename JSON envelopes/group arrays,
stable external export keys, opaque user field source and duplicate aliases.
`audit_naming.cjs` guards first-party filenames and basic declarations without
adding parser/linter packages. See [naming conventions](../docs/naming.md).
