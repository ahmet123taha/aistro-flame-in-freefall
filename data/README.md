# AISTRO dataset

Download the scientific dataset from the [dataset release](https://github.com/ahmet123taha/aistro-flame-in-freefall/releases/tag/dataset-2026.11.15). It is separate from the Windows portable application so that source code and application updates stay small.

The release is published as independent `Veri_Seti-public-part-*.tar.gz` archives. **All parts are required.** Each archive extracts into the same `Veri_Seti/` directory. `dataset-release.json` lists the published asset URLs, sizes and SHA-256 checksums; `dataset-files.jsonl.gz` records every included file. Uploads may still be in progress until the release manifest is published.

## Install with limited free space

The downloader requires Python 3 and PowerShell 7. From the repository directory, run:

```powershell
pwsh -File scripts/download-dataset.ps1 -DestinationDirectory 'D:/AISTROData'
```

It downloads one archive at a time, verifies its checksum, safely extracts and verifies its files, and removes only that downloaded archive after success. The installed dataset still requires space for its expanded files; this process avoids keeping a second complete compressed copy. It never deletes your existing dataset. An existing file with different bytes is left untouched and stops extraction.

Put the resulting `Veri_Seti` directory beside `SpaceApps1.exe`, or select that directory using the application's dataset-folder setting. The correct layout is `SpaceApps1/SpaceApps1.exe` and `SpaceApps1/Veri_Seti/DATASET.json`. Do not create an extra `Veri_Seti/Veri_Seti` nesting.

To verify an already installed dataset without changing it:

```powershell
python scripts/verify-dataset.py --root 'D:/AISTROData' --inventory 'dataset-files.jsonl.gz'
```

## What is included

- The selected NASA Physical Sciences Informatics corpus, its metadata and original-source provenance. The core manifest remains `2026.11.14-v1`: 51,151 catalogued files across 24 investigations.
- NASA supporting documents and the active `Research_Content/0.4.2` extraction index, pinned to the original catalogue.
- Prepared graphs, material-applicability metadata and the MaCFP material/combustion sources whose MIT notices are retained.

The local working collection measured about **23.08 GB** before packaging. This public dataset is a **documented subset**, not a claim that every locally collected source has redistribution permission. Old extraction caches and third-party originals with unresolved redistribution terms are excluded. See [sources](SOURCES.md), [licenses](LICENSES.md), [publication policy](publication-policy.json) and the [optional-source manifest](third-party-sources.json). The release manifest gives the actual published size.

## Optional material sources

The FSRI original files and certain manufacturer/laboratory references are linked in the optional-source manifest rather than republished. The material-applicability loader verifies those original files; without them, that panel reports unavailable/invalid material data while PSI research remains available. This is an intentional publication limitation, not a complete-material-database claim.

If you have checked the source terms and are entitled to retrieve the original files for your use, you can run the explicit optional restoration tool:

```powershell
python scripts/restore-optional-sources.py --root 'D:/AISTROData' --source-id ulfsri__fsri_materials_database --acknowledge-source-terms
```

The tool verifies pinned bytes and hashes, refuses changed existing files, and does not grant redistribution rights. Some original links may no longer work.

## Scientific limits

The core manifest retains **67 missing/skipped source records** and **2,269 records needing classification review**. The active text index covers 31,881 selected source files and 61,647 compressed shards; coverage is incomplete. Literal text extraction, graphs, metadata matching and AI explanations are not independent experimental validation, a certified fire-safety assessment or proof of NASA approval. Cite the original investigation and publication when using its evidence.
