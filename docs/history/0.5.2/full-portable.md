# Full portable distribution · 0.5.2

[Download the application and dataset together from this release](https://github.com/ahmet123taha/aistro-flame-in-freefall/releases/tag/dataset-2026.11.15).

This is a **multipart distribution**: `AISTRO-0.5.2-Full-Portable-Launcher.zip` contains the Windows x64 executable, licenses, pinned manifest and preparation tools; the same release contains all 57 `Veri_Seti-public-part-*.tar.gz` data archives and their file inventory. The launcher ZIP alone does not contain 22.51 GB of scientific data. After preparation, the executable and dataset are in one portable folder.

## Automatic preparation

1. Extract the launcher ZIP on a drive with at least **24 GB free**. This is disk space, not a RAM requirement. Do not download the dataset onto an already full drive.
2. Install Python 3 and PowerShell 7 if absent. They are preparation/verification dependencies; the EXE itself requires neither Node.js nor Rust.
3. Double-click `AISTRO-0.5.2/PREPARE_FULL_PORTABLE.cmd`. It downloads each pinned archive from public GitHub, verifies its SHA-256 and extracted files, and deletes only the verified temporary archive. It does not require a GitHub account or API key.
4. After success, double-click `SpaceApps1.exe` in that same folder.
5. Open **Settings → OpenAI API key → Save** and enter your own key. **No API key, credential vault, account profile or conversation history is included.** AI calls need Internet access and a compatible OpenAI account/model; account charges are the user's responsibility.

The initial expanded data uses 22,509,766,410 bytes (114,686 files). Preparation needs Internet access; its total download is the compressed size listed in the release manifest. You can subsequently move the prepared folder to another Windows machine. Credentials and history remain in the Windows user profile, so moving the folder does not transfer them. An existing key previously saved on the same Windows account can be reused by the app; that is not a bundled key. Settings → Remove key clears it.

## Prepare without Internet on the target computer

On another computer download the launcher ZIP, **all 57 data archives**, and `dataset-files.jsonl.gz` from the same release. Extract the launcher ZIP. Put the archives and inventory into `AISTRO-0.5.2/.aistro-download-cache/`, then run the preparation command with Python 3 and PowerShell 7 installed. All correctly cached files are verified and used without downloading. Retaining all compressed archives alongside the extracted data needs additional disk space. The command deletes each cached archive after successful extraction.

Final layout:

```text
AISTRO-0.5.2/
  SpaceApps1.exe
  PREPARE_FULL_PORTABLE.cmd
  setup/
  Veri_Seti/
    DATASET.json
    ... scientific data and indexes
```

## Features and limits

The application provides research conversation, indexed source retrieval, source-document/table viewing, condition-based comparison, supported prepared graphs and a Safety panel. Missing measurements remain unknown. AI interpretation requires the user's configured provider key; source browsing and numerical comparison are local operations. No emergency call or certified risk prediction is provided.

This distribution includes the **published dataset subset**, not all material collected during development. Manufacturer/FSRI originals with unresolved redistribution terms and obsolete caches are excluded. The material-applicability panel may report unavailable/invalid data without optional originals. PSI research remains available. See [data sources and limits](../data/README.md). Do not describe this package as the complete material database.

The EXE is unchanged from 0.5.2: SHA-256 `cfc0990ac7e81378ec228aaa57c8dedfdff61b1b9dfd540afe0c9cc3511c4f0a`. No new EXE execution or live model evaluation is claimed. The key storage and Settings API tests run separately using dummy keys and no provider requests.
