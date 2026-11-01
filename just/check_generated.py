# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Check generated JS without changing the checkout, on Windows/macOS/Linux."""

from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    bun = shutil.which("bun")
    if bun is None:
        print("Bun is required. Install Bun, then run `just deps`.", file=sys.stderr)
        return 1
    with tempfile.TemporaryDirectory(prefix="isovis-generated-") as directory:
        output = Path(directory)
        result = subprocess.run(
            [bun, "node_modules/typescript/bin/tsc", "--project", "tsconfig.json", "--outDir", str(output)],
            cwd=root,
            check=False,
        )
        if result.returncode:
            return result.returncode
        generated = {path.relative_to(output) for path in output.rglob("*.js")}
        committed = {
            path.relative_to(root / "js")
            for path in (root / "js").rglob("*.js")
            if "Generated browser output:" in path.read_text(encoding="utf-8")
        }
        stale = []
        for relative in sorted(generated | committed):
            built = output / relative
            target = root / "js" / relative
            if not built.is_file() or not target.is_file() or built.read_bytes() != target.read_bytes():
                stale.append(f"js/{relative.as_posix()}")
        if stale:
            print("Stale generated output: " + ", ".join(stale), file=sys.stderr)
            print("Run `just build` and commit the generated JavaScript.", file=sys.stderr)
            return 1
    print("Generated JavaScript is current.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
