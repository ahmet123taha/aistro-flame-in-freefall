#!/usr/bin/env python3
"""Verify installed dataset files, or safely install one checksum-bound tar part."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import sys
import tarfile
import tempfile


def safe_name(value):
    if not isinstance(value, str) or not value or "\\" in value or ":" in value:
        raise ValueError("Invalid dataset member path")
    parts = value.rstrip("/").split("/")
    if parts[0] != "Veri_Seti" or any(p in ("", ".", "..") for p in parts):
        raise ValueError("Dataset path must stay under Veri_Seti")
    if any(p.endswith((".", " ")) for p in parts):
        raise ValueError("Ambiguous Windows path rejected")
    reserved = {"CON", "PRN", "AUX", "NUL"} | {f"COM{i}" for i in range(1, 10)} | {f"LPT{i}" for i in range(1, 10)}
    if any(p.split(".")[0].upper() in reserved for p in parts):
        raise ValueError("Reserved Windows path rejected")
    return PurePosixPath(*parts).as_posix()


def target_path(root, name):
    name = safe_name(name)
    target = root.joinpath(*name.split("/"))
    relative = target.relative_to(root)
    current = root
    for segment in relative.parts:
        current = current / segment
        try:
            info = current.lstat()
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 1024):
            raise ValueError(f"Links or junctions are not allowed in dataset path: {name}")
    return target


def digest_file(path):
    digest = hashlib.sha256()
    length = 0
    with open(path, "rb") as handle:
        while block := handle.read(1024 * 1024):
            digest.update(block)
            length += len(block)
    return length, digest.hexdigest()


def inventory_rows(path):
    seen = set()
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        for number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            row = json.loads(line)
            name = safe_name(row.get("path"))
            size, sha = row.get("bytes"), row.get("sha256")
            if type(size) is not int or size < 0 or not isinstance(sha, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", sha):
                raise ValueError(f"Invalid inventory record at line {number}")
            key = name.casefold()
            if key in seen:
                raise ValueError(f"Duplicate inventory path: {name}")
            seen.add(key)
            yield {"path": name, "bytes": size, "sha256": sha.lower()}


def matches(path, row):
    return path.is_file() and digest_file(path) == (row["bytes"], row["sha256"])


def verify_all(root, inventory):
    failures, count, total = 0, 0, 0
    for row in inventory_rows(inventory):
        target = target_path(root, row["path"])
        count += 1
        total += row["bytes"]
        if not matches(target, row):
            failures += 1
            print(f"MISSING OR CHANGED: {row['path']}", file=sys.stderr)
        if count % 2000 == 0:
            print(f"Checked {count} files...", flush=True)
    if count == 0:
        raise ValueError("Inventory is empty")
    print(json.dumps({"checked_files": count, "expected_bytes": total, "failed_files": failures}))
    return 0 if failures == 0 else 1


def member_names(archive):
    names = set()
    folded = set()
    with tarfile.open(archive, "r|gz") as bundle:
        for item in bundle:
            name = safe_name(item.name)
            if item.isdir():
                continue
            if not item.isfile() or getattr(item, "sparse", None):
                raise ValueError(f"Only ordinary files are allowed: {name}")
            if name.casefold() in folded:
                raise ValueError(f"Duplicate archive path: {name}")
            names.add(name)
            folded.add(name.casefold())
    if not names:
        raise ValueError("Archive has no files")
    return names


def extract_part(root, inventory, archive, archive_sha256):
    if archive_sha256 and digest_file(archive)[1] != archive_sha256.lower():
        raise ValueError("Archive checksum mismatch")
    names = member_names(archive)
    expected = {row["path"]: row for row in inventory_rows(inventory) if row["path"] in names}
    missing = names - expected.keys()
    if missing:
        raise ValueError(f"Archive contains {len(missing)} files absent from the published inventory")
    # Complete metadata/existing-file preflight before the first filesystem mutation.
    with tarfile.open(archive, "r|gz") as bundle:
        for item in bundle:
            if item.isdir():
                continue
            row = expected[safe_name(item.name)]
            if item.size != row["bytes"]:
                raise ValueError(f"Archive file size mismatch: {row['path']}")
            target = target_path(root, row["path"])
            if target.exists() and not matches(target, row):
                raise ValueError(f"Existing file differs; left unchanged: {row['path']}")
    count = 0
    with tarfile.open(archive, "r|gz") as bundle:
        for item in bundle:
            if item.isdir():
                continue
            row = expected[safe_name(item.name)]
            target = target_path(root, row["path"])
            if target.exists():
                if not matches(target, row):
                    raise ValueError(f"Existing file changed during installation: {row['path']}")
                count += 1
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            target_path(root, row["path"])
            fd, temporary = tempfile.mkstemp(prefix=".aistro-download-", dir=target.parent)
            try:
                digest, size = hashlib.sha256(), 0
                with os.fdopen(fd, "wb") as output, bundle.extractfile(item) as source:
                    while block := source.read(1024 * 1024):
                        size += len(block)
                        if size > row["bytes"]:
                            raise ValueError(f"Expanded file exceeded its declared size: {row['path']}")
                        digest.update(block)
                        output.write(block)
                    output.flush()
                    os.fsync(output.fileno())
                if (size, digest.hexdigest()) != (row["bytes"], row["sha256"]):
                    raise ValueError(f"Extracted file checksum mismatch: {row['path']}")
                # Exclusive installation never replaces an existing file. Prefer a
                # hard link to avoid a second expanded copy on NTFS/ext4.
                try:
                    os.link(temporary, target)
                except OSError:
                    if target.exists():
                        raise
                    with open(temporary, "rb") as source, open(target, "xb") as output:
                        shutil.copyfileobj(source, output, length=1024 * 1024)
                        output.flush()
                        os.fsync(output.fileno())
                if not matches(target, row):
                    raise ValueError(f"Installed-file readback failed: {row['path']}")
                count += 1
            finally:
                Path(temporary).unlink(missing_ok=True)
    print(json.dumps({"verified_part": Path(archive).name, "verified_files": count, "status": "ok"}))
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, help="Directory containing Veri_Seti")
    parser.add_argument("--inventory", required=True, help="Downloaded dataset-files.jsonl.gz")
    parser.add_argument("--extract-part", help="Safely install one published .tar.gz part")
    parser.add_argument("--archive-sha256", help="Expected compressed archive SHA-256")
    args = parser.parse_args()
    root = Path(args.root).expanduser().resolve()
    if args.extract_part:
        root.mkdir(parents=True, exist_ok=True)
        return extract_part(root, args.inventory, args.extract_part, args.archive_sha256)
    return verify_all(root, args.inventory)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, tarfile.TarError) as error:
        print(f"Dataset operation stopped: {error}", file=sys.stderr)
        sys.exit(1)
