# Regression tests

The app remains plain browser JavaScript, with no build or install step.
Tests need only [Bun](https://bun.sh/); Node is not required. They use Bun's
built-in Node-compatible assertion, file, and VM APIs, with no third-party
packages, package manifest, or lockfile.

From the repository root, run all tests in this checkout sequentially:

```sh
bun tests/run.cjs
```

Individual `tests/audit-<finding>.cjs` files can also be run directly with Bun.
Fixtures are small and there are no parallel test workers. VM tests substitute
browser APIs; they do not claim browser rendering or performance coverage.
