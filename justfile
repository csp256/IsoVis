# Native tools only; Windows does not need Bash or an extra scripting language.
set windows-shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-Command"]

default:
    @just --list

# Install the pinned development-only compiler. No dependency scripts run.
deps:
    bun install --frozen-lockfile --ignore-scripts

# Regenerate the committed browser JavaScript from src/.
build:
    bun node_modules/typescript/bin/tsc --project tsconfig.json

# Check migrated code and negative type fixtures without emitting anything.
typecheck:
    bun node_modules/typescript/bin/tsc --project tsconfig.check.json

# Compile in a temporary directory and reject stale browser output.
generated_check:
    uv run --no-project just/check_generated.py

# Run small regression fixtures sequentially.
test:
    bun tests/run.cjs

# The complete non-browser check, also used by CI.
check: typecheck generated_check test

# Serve this checkout locally; building is unnecessary for a fresh clone.
serve:
    uv run --no-project --python ">=3.11" python -m http.server 8000 --bind 127.0.0.1

# Optional desktop Chrome/SwiftShader checks, not hardware benchmarks.
browser_test:
    bun tests/browser_smoke.mjs
    bun tests/browser_smoke.mjs --unsupported

# Capture the established visual fixtures for comparison.
visual:
    bun tests/browser_smoke.mjs --visual

# Optional interactive benchmark page on localhost:8080.
bench_serve:
    bun bench/serve.cjs

# Optional sequential Chrome benchmark capture.
benchmark:
    bun tests/browser_smoke.mjs --benchmark

# Write the complete visual fixtures, including PNG data, to a chosen path.
visual_report path:
    bun tests/browser_smoke.mjs --visual --report "{{path}}"

# Write a complete optional benchmark report to a chosen path.
benchmark_report path:
    bun tests/browser_smoke.mjs --benchmark --report "{{path}}"

# Reproduce CI with checksum-pinned native tools, installed only in this checkout.
ci:
    uv run --no-project just/ci.py
