# AISTRO · Flame in Freefall

Explore NASA combustion research, compare experimental conditions, and trace AI-assisted answers back to their sources.

**[Try the live demo](https://aistro-flame-freefall.duckdns.org)** · **[Download for Windows](https://github.com/ahmet123taha/aistro-flame-in-freefall/releases/download/dataset-2026.11.15/AISTRO-0.5.2-Full-Portable-Launcher.zip)** · **[Installation guide](docs/full-portable.md)**

An independent student project for the **2026 NASA Space Apps Challenge**, by the AISTRO team. [View the Space Apps project](https://www.spaceappschallenge.org/2026/find-a-team/aistro/?tab=project).

![AISTRO: research conversation, source reader, conditions and Safety panel](docs/assets/workspace.png)

## What you can do

- **Ask research questions** with optional material, gravity, oxygen, pressure, temperature and flow conditions.
- **Read the evidence** in original documents and available tables, with indexed source references.
- **Compare experimental conditions** while keeping missing values unknown.
- **Explore supported graphs** from reviewed tables and published equations, with their assumptions.
- **Review safety considerations** linked to sources in the Safety panel.

AI interpretation requires your own compatible OpenAI API account. Source browsing and numerical comparisons work locally after dataset preparation. This research prototype does not predict certified fire risk or provide emergency calls/procedures.

## Run on Windows

1. **[Download the launcher ZIP](https://github.com/ahmet123taha/aistro-flame-in-freefall/releases/download/dataset-2026.11.15/AISTRO-0.5.2-Full-Portable-Launcher.zip)** and extract it on a drive with **at least 24 GB free**.
2. With **PowerShell 7 and Python 3** installed, run **`PREPARE_FULL_PORTABLE.cmd`**. It downloads and verifies the dataset beside the application automatically.
3. Open **`SpaceApps1.exe`**, then **Settings → OpenAI API key → Save** to enter **your own key**.

**No API key is included.** Saved keys are encrypted for your Windows account, outside the portable folder. AI usage is charged to your own provider account. The EXE needs no separate Node.js or Rust installation.

The complete distribution is **application + 22.51 GB of expanded data (114,686 files)**. The small launcher ZIP downloads the 57 data parts during preparation; **you do not need to choose or download those parts manually**. [Offline preparation details](docs/full-portable.md).

## Data and limitations

NASA Physical Sciences Informatics (PSI) records are the main research foundation. The app retrieves selected indexed passages and numerical records; it does not read every raw file into each AI response. Reconstructed graphs are not new experimental measurements, and numerical similarity is not a fire probability.

The public dataset is a documented subset. Manufacturer/FSRI originals with unresolved redistribution terms are excluded. Without those optional originals, the material-applicability panel may report unavailable/invalid data; PSI research remains available. [Sources, coverage and data licenses](data/README.md).

## Documentation and source code

| Folder | Contents |
|---|---|
| [app/](app/) | Application source, version 0.5.2 |
| [data/](data/) | Data sources, licenses and download manifest |
| [docs/](docs/README.md) | Installation, development, architecture and verification |
| [scripts/](scripts/) | Dataset preparation and verification tools |

## Open source and AI disclosure

Original code is licensed under **[Apache 2.0](LICENSE)**. Third-party libraries and data retain their own terms: [notices](THIRD_PARTY_NOTICES.md) · [data licenses](data/LICENSES.md).

**ChatGPT/Codex** assisted development, editing, tests, documentation and translation; **Gemini** was used for earlier technical advice. The bee artwork was generated with ChatGPT. Runtime AI interpretation uses the OpenAI API. [AI disclosure and limits](docs/ai-disclosure.md).

**Independent student hackathon project. Not affiliated with, endorsed by, or certified by NASA or its Space Agency Partners.**
