# Windows portable distribution · 0.5.3

[Download SpaceApps1-0.5.3.zip](https://github.com/ahmet123taha/aistro-flame-in-freefall/releases/download/v0.5.3/SpaceApps1-0.5.3.zip). This is the application and English engineering records, with data-preparation tools. The scientific dataset is distributed separately and has not changed.

## Existing dataset

Extract the ZIP. Put your existing `Veri_Seti` beside `SpaceApps1/SpaceApps1.exe`, then open the EXE. No second application starter, Node.js or Rust is required. Your Windows-account key and conversations remain outside this shared folder.

## First installation

1. Extract the ZIP on a drive with at least 24 GB free for the public data subset.
2. Install Python 3 and PowerShell 7 for dataset preparation only.
3. Open `SpaceApps1/` and double-click `PREPARE_FULL_PORTABLE.cmd`.
4. The tool downloads the existing 57 pinned public data parts, verifies SHA-256, extracts them and removes only verified temporary archives. No GitHub key is required.
5. After preparation, double-click `SpaceApps1.exe`. For AI, enter your own compatible OpenAI key in Settings. No key is bundled.

```text
SpaceApps1/
  SpaceApps1.exe
  PREPARE_FULL_PORTABLE.cmd
  setup/
  Patches/Changes.txt
  Veri_Seti/                 # separately prepared or reused
Developer Patch/
  Reports/Engineering-Transition-0.5.3.pdf
  Source/
  Previous_Source/
  Changes/
  Code_Index/
  Verification/
  Submission_History_0.5.2/
```

## Offline preparation and limits

Use the unchanged [dataset release](https://github.com/ahmet123taha/aistro-flame-in-freefall/releases/tag/dataset-2026.11.15) for all 57 parts and `dataset-files.jsonl.gz`. Place cached parts and inventory under `SpaceApps1/.aistro-download-cache/` before preparation; more disk space is needed to retain compressed archives. The pinned manifest remains in `setup/dataset-release.json`.

The public subset has 114,686 files and 22,509,766,410 expanded bytes. Manufacturer/FSRI originals with unresolved redistribution terms are excluded; optional material profiles may be unavailable. See [data sources and licences](../data/README.md).

The new EXE was built and hash-verified, not executed locally. Linux mocked regression tests passed; no real model trial was made. Numerical similarity is a discovery heuristic, not a calibrated fire-risk prediction or approved emergency procedure.
