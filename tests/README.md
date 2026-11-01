# Regression tests

The application remains plain browser JavaScript; no build or install step is needed.
Tests use Bun and its built-in Node-compatible assertion, file, and VM APIs. No npm
packages or lockfile are required. From the repository root, run:

```sh
bun tests/audit-3.cjs
```

Replace the filename with the relevant test. To run all tests sequentially:

```sh
bun tests/run.cjs
```

Fixtures are deliberately small. VM tests substitute browser APIs and do not
claim browser rendering or performance coverage.
