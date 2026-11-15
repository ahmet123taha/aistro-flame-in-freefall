#!/usr/bin/env python3
"""Retrieve optional originals from their publishers; this grants no reuse rights."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import sys
import tempfile
import urllib.parse
import urllib.request


def validate_url(value):
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("A credential-free HTTPS source URL is required")
    if any(k.lower() in {"token", "api_key", "password", "signature", "x-amz-signature"} for k, _ in urllib.parse.parse_qsl(parsed.query)):
        raise ValueError("Credential-bearing source URL rejected")
    return value


class HttpsRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(request, response, code, message, headers, newurl)


def safe_target(root, relative):
    if not isinstance(relative, str) or "\\" in relative or ":" in relative:
        raise ValueError("Invalid relative source path")
    parts = relative.split("/")
    if parts[:2] != ["Third_Party", "sources"] or any(p in ("", ".", "..") or p.endswith((".", " ")) for p in parts):
        raise ValueError("Optional sources must stay under Third_Party/sources")
    reserved = {"CON", "PRN", "AUX", "NUL"} | {f"COM{i}" for i in range(1, 10)} | {f"LPT{i}" for i in range(1, 10)}
    if any(p.split(".")[0].upper() in reserved for p in parts):
        raise ValueError("Reserved Windows path rejected")
    target = root / "Veri_Seti" / PurePosixPath(relative)
    current = root
    for part in target.relative_to(root).parts:
        current = current / part
        try:
            info = current.lstat()
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 1024):
            raise ValueError("Linked or junction source path rejected")
    return target


def digest_file(path):
    result = hashlib.sha256()
    size = 0
    with open(path, "rb") as handle:
        while block := handle.read(1024 * 1024):
            result.update(block)
            size += len(block)
    return size, result.hexdigest()


def restore(root, row, opener):
    target = safe_target(root, row["dataset_path"])
    size, sha = row["actual_bytes"], row["sha256"]
    if type(size) is not int or size < 0 or not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{64}", sha):
        raise ValueError("Pinned byte count and SHA-256 are required")
    if target.exists():
        if digest_file(target) != (size, sha):
            raise ValueError(f"Existing file differs; left unchanged: {row['dataset_path']}")
        return "already_verified"
    url = validate_url(row["url"])
    target.parent.mkdir(parents=True, exist_ok=True)
    safe_target(root, row["dataset_path"])
    fd, temporary = tempfile.mkstemp(prefix=".aistro-source-", dir=target.parent)
    try:
        digest, received = hashlib.sha256(), 0
        request = urllib.request.Request(url, headers={"User-Agent": "AISTRO-source-restorer/1.0"})
        with os.fdopen(fd, "wb") as output, opener.open(request, timeout=60) as response:
            validate_url(response.geturl())
            while block := response.read(1024 * 1024):
                received += len(block)
                if received > size:
                    raise ValueError("Source exceeded its pinned byte size")
                digest.update(block)
                output.write(block)
            output.flush()
            os.fsync(output.fileno())
        if (received, digest.hexdigest()) != (size, sha):
            raise ValueError("Source bytes changed or download is incomplete; not installed")
        try:
            os.link(temporary, target)
        except OSError:
            if target.exists():
                raise
            with open(temporary, "rb") as source, open(target, "xb") as output:
                shutil.copyfileobj(source, output, length=1024 * 1024)
                output.flush()
                os.fsync(output.fileno())
        if digest_file(target) != (size, sha):
            raise ValueError("Installed source readback failed")
        return "restored"
    finally:
        Path(temporary).unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, help="Directory containing Veri_Seti")
    parser.add_argument("--manifest", default=str(Path(__file__).resolve().parent.parent / "data" / "third-party-sources.json"))
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--source-id", action="append", help="Exact source ID; may be repeated")
    selection.add_argument("--all", action="store_true", help="Retrieve all pinned optional originals")
    parser.add_argument("--acknowledge-source-terms", action="store_true", help="Confirm you reviewed source terms and are entitled to retrieve for your use")
    args = parser.parse_args()
    if not args.acknowledge_source_terms:
        parser.error("Read data/LICENSES.md and the source terms first, then explicitly supply --acknowledge-source-terms")
    root = Path(args.root).expanduser().resolve()
    document = json.loads(Path(args.manifest).read_text(encoding="utf-8-sig"))
    rows = document if isinstance(document, list) else document["sources"]
    source_ids = {row["source_id"] for row in rows}
    if args.source_id and set(args.source_id) - source_ids:
        parser.error("Unknown source ID")
    selected = [row for row in rows if not row.get("include_original") and row.get("status") == "verified" and row.get("dataset_path") and (args.all or row["source_id"] in args.source_id)]
    if not selected:
        parser.error("No verified optional original files match this selection")
    print("Retrieving pinned originals for your use; no redistribution permission is granted.", flush=True)
    opener = urllib.request.build_opener(HttpsRedirects())
    seen, counts = set(), {"restored": 0, "already_verified": 0, "failed": 0}
    for row in selected:
        name = row["dataset_path"]
        if name in seen:
            continue
        seen.add(name)
        try:
            counts[restore(root, row, opener)] += 1
        except (OSError, ValueError, KeyError) as error:
            counts["failed"] += 1
            print(f"FAILED {name}: {error}", file=sys.stderr, flush=True)
        if len(seen) % 50 == 0:
            print(f"Processed {len(seen)} originals...", flush=True)
    print(json.dumps(counts))
    return 1 if counts["failed"] else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError) as error:
        print(f"Optional restoration stopped: {error}", file=sys.stderr)
        sys.exit(1)
