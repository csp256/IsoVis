# Incremental TypeScript migration

The first slice migrates **settings and transforms**, not the entire application.
Browser users still open the static site without installing or compiling anything.
There is no framework, bundler, CDN, or Node runtime requirement.

## Commands

Development tools: Just, Bun (CI pins 1.4.4), and uv. uv manages Python when needed;
Windows needs neither Bash nor a separately managed Python installation.
GitLab is the primary host; the retained GitHub remote is a secondary copy.

```sh
just deps       # Install the exact compiler in bun.lock; no lifecycle scripts.
just build      # Compile src/ to the committed browser files in js/.
just check      # Types + generated-file freshness + sequential regression tests.
```

`just deps` is needed once after cloning, or after a dependency/lockfile update.
`just build` fails without emitting on type errors. Commit both TypeScript changes
and regenerated JavaScript. Do not hand-edit `js/params.js` or `js/transforms.js`.

`just` lists the other commands, including `serve`, `browser_test`, `visual`, and
`benchmark`. Recipes longer than three command lines plus a comment belong in
cross-platform scripts under `just/`. The generated-file check uses a Python
standard-library script via uv; it compiles to a temporary directory and never
rewrites the checkout. It checks for missing, changed, and orphaned generated
files. Generated output has explicit LF attributes for byte checks on Windows.

## What is checked

- `src/params.ts`: explicit settings types and global initialization, numeric
  input validation, and URL resolution handling.
- `src/transforms.ts`: transform construction, stack normalization, operations,
  and matrix calculations. Every function has parameter and return annotations.
- `src/types.d.ts`: settings, transform kinds, GUI enums, vectors, and matrices.
- `src/legacy_bridge.d.ts`: the small API this slice consumes from classic
  scripts, plus the three matrix operations used from pristine numeric.js.
- `tests/type_contracts.ts`: compile-only positive and expected-error cases,
  including wrong settings types, invalid enum values, unchecked array indexing,
  implicit `any`, and accidental global assignments.

The exact TypeScript 5.9.3 compiler is the only development package. `strict`,
`noUncheckedIndexedAccess`, return/fallthrough checks, and unused-variable checks
are enabled. Emission targets ES2020 and is separate from the compile-only
fixture check. No permissive `any` or blanket suppression is used in these sources.

## Boundaries and remaining work

The emitted files deliberately remain classic browser scripts, preserving the
current callers, VM tests, load order, and saved-session schema. Settings are
explicitly initialized on `globalThis`, rather than relying on a plain function's
`this`. This makes their global ownership explicit; it **does not make them
private**. The ambient bridge is a migration boundary, not proof that the remaining
JavaScript is correctly typed. This is not an ES-module migration yet.

Transforms no longer create/overwrite a global loop counter. Other accidental
globals identified in the audit, in the GUI and inline worker, remain outside this
slice. The existing custom-blending default and other audit defects are also not
silently changed as part of the type migration.

Types are erased at compilation. Imported JSON, URL input, and later worker
messages still need runtime validation; untrusted transform input is typed
`unknown` and checked before constructing a `Transform`. Matrix dimensions and
valid axes are runtime invariants, not expressed by `number[][]`; the matrix
index assertions rely on existing import/UI validation and numeric.js identity
matrices. User-authored field code remains opaque, executable JavaScript, not
TypeScript. It is neither rewritten nor trusted merely because the app is typed.

Next slices can give settings/state private ownership, migrate camera/layout,
GUI and worker messages, then replace each ambient bridge with explicit module
imports. Vendored libraries should remain unchanged. In editors, select the
workspace TypeScript version to use the same compiler as CI.

## GitLab CI

`.gitlab-ci.yml` uses an immutable uv/Python image. Its cross-platform
`just/ci.py` entry point downloads official Bun/Just archives, verifies committed
SHA-256 hashes before using their binaries, then invokes `just deps` and
`just check`. Nothing is installed globally. `just ci` reproduces this bootstrap
locally; ordinary development can continue using already installed tools.
Changing a tool version requires updating its archive hashes too.

The GitHub workflow remains as optional Linux/Windows coverage, but GitLab pushes
do not automatically push to GitHub. The CI bootstrap uses standard-library
Python only; the application still needs no Python or tools to run in a browser.
