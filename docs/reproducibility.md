# Reproduce and verify version 0.5.3

The public `app/` matches all 568 files in the sealed 0.5.3 source baseline. Hosted runtime hashes are independently checked against the same baseline. The fixed scientific dataset retains its own version and is not included in this application release.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| SpaceApps1-0.5.3.zip | 66345760 | `92f4072469b65f87a96e2d0bdd8982b7eec70c1348804c7249ea060db4fb1f50` |
| SpaceApps1/SpaceApps1.exe | 103548928 | `1ed025c162048ad1d0d971034b28060703907a84f0b68c39cc39b2a69ebdc126` |

Verify with `Get-FileHash -Algorithm SHA256 -LiteralPath '.\SpaceApps1-0.5.3.zip'`.

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

AWS Linux isolated mocked tests: **622 passed, 1 Windows-only skipped, 0 failed (623 total)**. Same-turn HTTP input/ranking, quote guards, material isolation, source identity, shortlist behavior and score rendering are covered. Actual-source deterministic audit: 24 PSI records, 16 numerical cases, 8 explicitly recorded coverage limitations. No paid provider call or local EXE execution was performed.

See [English design/root-cause report](../app/docs/MATCHING_AUDIT_053.md), [per-file baseline](source-manifest-0.5.3.json) and [release evidence](releases/0.5.3/). The detailed English PDF, symbol/block index and previous/current source diff are inside the downloadable ZIP under `Developer Patch/`.

Historical documents preserve their original versions. The retained `scripts/verify-portable.mjs` includes obsolete incident-asset checks and is not a current portable acceptance gate. The executable build/hash checks do not establish Windows runtime acceptance. NPR Class C is an incomplete engineering target, not certification.

Do not commit provider keys, user history, private state or environment files. The source root expects compatible `Veri_Seti/Research_Content/0.4.2` indices; do not rename or mix snapshots.
