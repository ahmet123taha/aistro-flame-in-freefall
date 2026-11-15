# Reproduce and verify version 0.5.2

This repository publishes the source snapshot associated with the sealed **SpaceApps1-0.5.2.zip** release. `app/` contains 565 files extracted from its `Developer Patch/Source/` directory without changing their bytes. Root documentation and data-distribution instructions are publication additions, not a new application version.

## Identify the artifacts

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `SpaceApps1-0.5.2.zip` | 66,136,392 | `4ac8f90d526d9666e296538a5cdbb7ef6a51b013856e95fdaf0ccb50859b8275` |
| `SpaceApps1/SpaceApps1.exe` | 103,544,320 | `cfc0990ac7e81378ec228aaa57c8dedfdff61b1b9dfd540afe0c9cc3511c4f0a` |

Check a downloaded archive in PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath '.\SpaceApps1-0.5.2.zip'
```

Dataset assets have their own manifest and checksums; follow [data/README.md](../data/README.md). The app expects dataset version `2026.11.14-v1` and the compatible pinned `Research_Content/0.4.2` layout. Do not combine indexes from unrelated snapshots or rename their internal folders.

## Source installation

From the repository's `app/` directory:

```powershell
npm ci
npm test
```

The original package declares Node.js **>=20**, but the locked PDF.js dependency requires **>=22.13.0**. Use Node.js 22.13 or newer for source installation. For full-data execution, use `npm run start:hosted` with these process environment variables:

| Variable | Meaning |
|---|---|
| `SPACEAPPS_DATA_ROOT` | Parent directory containing `Veri_Seti`; not the `Veri_Seti` directory itself |
| `SPACEAPPS_STATE_DIR` | Private, writable history/session directory, outside the published source and dataset |
| `PUBLIC_ORIGIN` | Exact browser origin, such as `http://127.0.0.1:8770` for local use |
| `PORT` | Loopback listening port; default `8770` |
| `OPENAI_API_KEY` | Private provider key, required only for AI requests |
| `OPENAI_MODEL` | Optional research model setting; current configured and reviewed choice is `gpt-6.1-sol` |

Environment variables must be supplied to the process; the app does not automatically load a `.env` file. Public hosting needs a reverse proxy that preserves the configured host and HTTPS origin. A ready `/healthz` response confirms application startup, not model access or scientific correctness.

The legacy `npm start`/`server.mjs` path is metadata-oriented and retains development-path defaults. It is not the full-dataset setup documented here. Internal source README sections and engineering records retain their original version context.

## Windows packaging

The published Windows x64 package embeds **Node.js 25.9.0** using Node SEA. Running the application requires no installed Node runtime. Rebuilding the Windows executable requires the matching Windows toolchain; the dependency runtime minimum is not the portable-build requirement.

On a Windows development machine with that toolchain, from `app/`:

```powershell
npm ci
node scripts/build-portable.mjs C:\AistroBuild\SpaceApps1
```

This generates a new executable and build manifest. It does not by itself recreate the complete sealed release archive or prove byte-identical output. Keep a new build's hashes and verification distinct from the published artifact.

## What was verified

The recorded 0.5.2 Linux/AWS run reports **609 passed, 1 skipped, 0 failed** tests with mocked provider interactions. Syntax checking covered **219 JavaScript files**. These are software checks, not an independent scientific evaluation or a real-model acceptance test.

The exact distributed Windows executable was **not newly launched in the publication workflow**. Archive/hash checks establish artifact identity, not Windows runtime success. The retained `scripts/verify-portable.mjs` still contains checks for retired incident assets, so it is historical tooling that needs version-specific review before being used as a 0.5.2 acceptance gate.

Detailed release records remain inside `Developer Patch/` in the downloadable ZIP. Earlier-version receipts describe earlier versions; they are not promoted to current evidence. No additional paid model request is needed to run the offline test suite.

## Privacy when reproducing

The Windows package saves its OpenAI key under the current Windows account using DPAPI. Conversation history is plain text in the user's local profile. Hosted mode saves anonymous session history in the operator's state directory. Neither credentials nor private histories belong in a public issue, screenshot, release, or source commit.

AI requests transmit the question, bounded visible context, and selected evidence to the configured provider. `store:false` is not a claim of zero data retention; provider account terms and controls apply. See [AI disclosure](ai-disclosure.md).
