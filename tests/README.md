# Regression tests

The browser app still needs no install or build step: emitted JavaScript is
committed. Development now uses Just, Bun, and uv, with one pinned development
package (TypeScript). No Node runtime is needed.

From the repository root:

```sh
just deps
just check
```

`just check` runs strict checking for the migrated TypeScript and compile-only
type fixtures, checks generated JS against a fresh temporary compilation, then
runs small regression fixtures sequentially. `just build` regenerates browser
output after editing `src/*.ts`. See [the migration guide](../docs/typescript.md)
for the exact coverage, global/ambient boundaries, and remaining unchecked code.

`just test` runs only the VM/offline tests. Individual `tests/audit_<finding>.cjs`
files can also be run directly with Bun. Tests use Bun's built-in Node-compatible
assertion, file, and VM APIs. There are no parallel test workers. VM tests
substitute browser APIs; they do not claim browser rendering or performance
coverage. The naming guard skips installed third-party dependencies.

GitLab is primary. Its pipeline runs the same `just deps` and `just check`
recipes on Linux, using a digest-pinned uv/Python image and checksum-pinned
Bun/Just archives. The standard-library bootstrap in `just/ci.py` supports
macOS, Linux, and Windows (x64/ARM64), and installs tools only in `.ci_tools/`.
Run `just ci` to reproduce it locally. No global installation or shell installer
is performed.

The retained GitHub workflow additionally checks Linux and Windows when a branch
is pushed there. GitHub is not automatically synchronized by a GitLab push.
A failing compiler, stale output, or failing assertion fails either pipeline.
No browser benchmark runs in CI.

## Optional real-browser checks

The Three.js migration adds offline upstream checksum/capability tests and
updates geometry/control fixtures to the actual pinned r187 modules. No browser
or GPU is required for `just check`.

For installed desktop Chrome only:

```sh
just browser_test
just visual
```

These launch temporary headless Chrome with software SwiftShader and a local
server. Set `CHROME_PATH` if necessary. They are not run automatically in CI and
are not hardware-GPU benchmarks. See [the Three.js migration notes](../docs/threejs_upgrade.md)
for the historical reports, comparison flags, and support changes. `just visual`
emits the established image fixtures for comparison, not a self-validating image
baseline test. Use `just visual_report path/to/visual.json` to retain PNG data,
or `just benchmark_report path/to/benchmark.json` for a full benchmark report.

Naming cleanup fixtures cover pre-rename JSON envelopes/group arrays, stable
external export keys, opaque user field source and duplicate aliases.
`audit_naming.cjs` guards first-party filenames and basic declarations without a
parser/linter dependency. See [naming conventions](../docs/naming.md).
`audit_typescript.cjs` covers generated-script strict mode, explicit settings
initialization, transform loop isolation, and retained runtime input checks.
