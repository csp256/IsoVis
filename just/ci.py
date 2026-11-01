# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Run CI with pinned native tools; requires only uv/Python, not Bash or Node."""

import hashlib
import io
import os
from pathlib import Path, PurePosixPath
import platform
import subprocess
import tarfile
import urllib.request
import zipfile

bun_version = "1.4.4"
just_version = "1.48.1"
# SHA-256 values of the official GitHub release archives, not downloaded at runtime.
archive_hashes = {
    "darwin-aarch64": (
        "c240d7f0ccb90c263a849fcdb09b7ee62630d921348ed6aafda86b9d577bc510",
        "03a73339ff55bcf7411a3c940cdcb0a726d98134b87203c83a9008575434e2a8",
    ),
    "darwin-x64": (
        "50a3491f73abc2fe81673171a85762d3bc2cc1680ccecadd983de99adf77977e",
        "4c3e9c880b8fc93d7fc24abfde3c36b0cc59f6e9f8b31f7175095700f64125a7",
    ),
    "linux-aarch64": (
        "baa6bb36f51d6e58561e02bbea825038a9df454f673d6d776e8bbf86f8c7850e",
        "3308721b991cf88cf2b9bbb3b31ac40550ec61a0c9b6fc011564e25e87964030",
    ),
    "linux-x64": (
        "bf8ccbfb2b0b80159e0f9a6d15c55317add8077534dbc6130a3edb52fccb395c",
        "9293e553ce401d1b524bf4e104918f72f268e3f9c6827e0055fe98d84a1b2522",
    ),
    "windows-aarch64": (
        "2d57a0eec0cb44d95c918c3f9734f60455a1306ae5085d76fc68f44e3ee30d09",
        "ed9cd54e46d65770bf0b79c051761b29f0b89a88e56e8cae4454ec7246c82160",
    ),
    "windows-x64": (
        "cd2c0fccc78f3ede1f50ca827a15f063eda13d4d150a3d0674f4f6e323d864a5",
        "368cd9ca827cba04d9e6fc00f7ad840773c4605b6f64b9f87bdb00325d351029",
    ),
}


def install_archive(url: str, expected: str, binary: str, destination: Path) -> None:
    print(f"Downloading {url}", flush=True)
    request = urllib.request.Request(url, headers={"User-Agent": "isovis-ci"})
    with urllib.request.urlopen(request, timeout=120) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f"Checksum mismatch: {url}")
    # Read only the binary; never extract archive paths or links to disk.
    if url.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            matches = [item for item in archive.infolist() if PurePosixPath(item.filename).name == binary and not item.is_dir()]
            if len(matches) != 1:
                raise ValueError(f"Missing or ambiguous binary: {binary}")
            payload = archive.read(matches[0])
    else:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
            matches = [item for item in archive.getmembers() if item.isfile() and PurePosixPath(item.name).name == binary]
            if len(matches) != 1:
                raise ValueError(f"Missing or ambiguous binary: {binary}")
            stream = archive.extractfile(matches[0])
            if stream is None:
                raise ValueError(f"Unreadable binary: {binary}")
            with stream:
                payload = stream.read()
    destination.write_bytes(payload)
    destination.chmod(0o755)


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    system = platform.system().lower()
    arch = {"x86_64": "x64", "amd64": "x64", "arm64": "aarch64", "aarch64": "aarch64"}.get(platform.machine().lower())
    key = f"{system}-{arch}"
    if key not in archive_hashes:
        raise ValueError(f"Unsupported tool platform: {key}")
    bun_hash, just_hash = archive_hashes[key]
    tools = root / ".ci_tools"
    tools.mkdir(exist_ok=True)
    executable_suffix = ".exe" if system == "windows" else ""
    bun_binary, just_binary = "bun" + executable_suffix, "just" + executable_suffix
    install_archive(
        f"https://github.com/oven-sh/bun/releases/download/bun-v{bun_version}/bun-{key}.zip",
        bun_hash, bun_binary, tools / bun_binary,
    )
    target = {"linux": "unknown-linux-musl", "darwin": "apple-darwin", "windows": "pc-windows-msvc"}[system]
    target_arch = "x86_64" if arch == "x64" else "aarch64"
    archive_suffix = "zip" if system == "windows" else "tar.gz"
    install_archive(
        f"https://github.com/casey/just/releases/download/{just_version}/just-{just_version}-{target_arch}-{target}.{archive_suffix}",
        just_hash, just_binary, tools / just_binary,
    )
    environment = dict(os.environ, PATH=str(tools) + os.pathsep + os.environ.get("PATH", ""))
    for recipe in ["deps", "check"]:
        subprocess.run([str(tools / just_binary), recipe], cwd=root, env=environment, check=True)


if __name__ == "__main__":
    main()
