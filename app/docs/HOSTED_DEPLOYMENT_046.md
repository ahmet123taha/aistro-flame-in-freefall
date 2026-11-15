# SpaceApps1 0.4.6 — anonymous public deployment

## Scope and version boundary

0.4.6 adapts the verified 0.4.5 research application to a dedicated Linux server. The user requested public access without an account, login, allowlist or invitation. The former Hermes service was removed by the user; this deployment does not install or invoke Hermes. The sealed 0.4.5 ZIP remains unchanged. Windows portable execution remains supported.

The research flow, source-selection skills, incident restrictions, mathematical comparison, material identities and fixed dataset content are unchanged. Voice Incident Support remains deferred. A public URL does not establish live Gemini quality, approved emergency advice or NASA NPR 7150.2D compliance.

D-046-06 removes unnecessary context-index work for research-mode greeting, language-only and clarification turns with no permitted source IDs. These turns still use the normal model/prompt path, while legitimate research continues source retrieval. This is a routing/performance correction, not a change to source eligibility or scientific scoring.

## Architecture

`Browser → HTTPS nginx → loopback Node hosted.mjs → shared read-only dataset`

`Anonymous browser cookie → isolated conversation store / analyzer cache → Gemini API`

`hosted.mjs` loads one verified dataset and dispatches each visitor through a separate `createApp` context. `lib/hosted-sessions.mjs` manages anonymous identities, context lifetime and analyzer isolation. `server.mjs` opts into the exact configured public origin while preserving desktop behavior. `lib/file-response.mjs` serves verified originals with bounded streaming and range support.

There is no user account. An anonymous cookie is nevertheless a credential for that browser's saved conversations; it must not be shared or logged. Another visitor receives a different identity and token. The operator has server-level access to stored conversations; anonymous access is not a promise that no server-side data is retained.

## Runtime configuration

| Variable | Meaning | Deployment intention |
| --- | --- | --- |
| `SPACEAPPS_DATA_ROOT` | Parent directory containing `Veri_Seti`; takes precedence over `APPLICATION_DIRECTORY` | `/srv/spaceapps/data` |
| `APPLICATION_DIRECTORY` | Alternative dataset parent | Omit when the first variable is configured |
| `SPACEAPPS_STATE_DIR` | Private session/cache directory; default is `.hosted-state` under the dataset parent | `/var/lib/spaceapps` |
| `PUBLIC_ORIGIN` | Exact HTTP(S) origin without path, query or user credentials | `https://130.61.191.146` |
| `PORT` | Loopback Node listener; default `8770` | `8787` |
| `GEMINI_API_KEY` | Operator-managed server key, never sent to the browser or included in a release | Private service environment file |
| `GEMINI_MODEL` | Existing provider model configuration | Keep the selected Flash-Lite model; do not silently upgrade |

These values are configuration intentions until the deployment receipt verifies the actual service. Hosted mode binds to `127.0.0.1`; nginx is the public listener. No Windows private history, DPAPI vault, local cache or plaintext credential belongs in the source/ZIP. An environment-only server credential is provisioned privately, outside the web root and release directory.

## Visitor separation and persistence

- HTTPS uses `__Host-spaceapps`, with a 32-byte random identifier and purpose-bound HMAC, `Path=/`, `HttpOnly`, `Secure`, `SameSite=Lax` and a one-year maximum age. Explicit HTTP development mode uses a separate `spaceapps_session` name without `Secure`; this is not the production confidentiality configuration.
- A 32-byte signing secret is created with exclusive creation and mode `0600` under the state directory. Preserving it preserves browser identities across restart. Replacing it invalidates existing identities; it must not be rotated casually.
- Conversation state is under `visitors/<server-issued-id>/conversations.json`; analysis cache and diagnostics are under that visitor's `analysis/`. Only validated server-issued hexadecimal IDs can reach these paths.
- The per-visitor mutation token is derived for a separate purpose from the cookie signature. A token from visitor A must not authorize changes to visitor B. A missing or invalid cookie starts a new anonymous identity rather than loading another user's state.
- The immutable dataset is shared. Mutable analyzer statistics, conversation data and persisted response caches are not shared between visitors.
- Idle app contexts are evicted after 15 minutes or when more than eight idle contexts are cached. Active requests remain alive. This is memory reclamation, not an eight-user access limit; saved state survives context eviction.
- Each hosted analysis creates a short-lived core analyzer and releases its in-memory response map after the turn. A per-visitor busy guard prevents overlapping analysis in one conversation while permitting independent visitors.
- Clearing the cookie, using a different browser, or an expired identity can make previous history inaccessible through the UI. There is no cross-device account recovery. Stored files do not currently have an automatic retention/deletion schedule; disk use requires operator monitoring.

## Public request boundaries

The configured Host and Origin are checked exactly. Forwarded host/origin headers are not trusted as permission. Mutation requests require the visitor token and the established JSON/body-shape guards. HTTPS terminates at nginx; the loopback connection does not relax the public-origin check.

Hosted key-management and shutdown endpoints return not found. The public settings screen cannot replace or clear the shared operator key. Status omits the host application path and does not expose other visitors' request counters. `/healthz` reports application/dataset readiness; it neither calls Gemini nor proves provider quota or answer quality.

No login, invitation or per-user admission quota is added. This public service still depends on finite machine resources and the provider's quota. A busy session, unavailable provider or exhausted memory may fail a request; those are reported conditions, not evidence of unlimited capacity.

## Verified-file delivery

All files continue through `dataset.file()`: indexed identity, dataset path confinement, regular-file/size checks and SHA256 verification precede delivery. HTTP range support is not a bypass around those checks.

Original-file GET supports a single bounded, open-ended or suffix byte range. A matching strong ETag permits `If-Range`; a stale, weak or date validator falls back to the full file. Unknown units and unsupported multiple ranges fall back to full GET. Invalid or unsatisfiable single byte ranges return 416 with total size. HEAD returns metadata without the body and ignores Range.

Original files stream with a 64 KiB high-water mark, backpressure and descriptor cleanup after client disconnect. Text preview remains bounded to 128,000 bytes. Zero-byte files return a legal empty response. Existing original downloads already streamed in 0.4.5; the new behavior adds reliable seek/resume metadata and cleanup, not a claim that whole-file buffering was present before.

SHA verification still reads the complete source on each access. Range reduces transmitted bytes, but does not make disk verification constant-time. Large PDFs with repeated ranges can therefore be I/O-heavy. No unverified file-hash cache is introduced.

## Data placement and release integrity

The fixed dataset remains a separate artifact. The server must receive the same source bytes and pinned derivative indexes; transfer completion, remote hash verification and runtime loading are separate evidence stages. A successfully loaded metadata catalog does not prove every original file has arrived.

The measured target has approximately 498 MB RAM plus 4 GB swap and split storage volumes. Storage may be split with bind mounts under the dataset tree while preserving logical paths; escaping symlinks remain rejected. Do not reformat a system volume merely to combine capacity. Record final mounts, file counts, transferred bytes and remote readback in the deployment receipt. No local canonical source is deleted after upload by this task.

## HTTPS and service lifecycle

Production is intended to use an IP-address certificate for the configured public origin, with automatic renewal and a successful nginx reload after renewal. Issuance, certificate identity/expiry, public HTTPS response and renewal mechanism must each be verified before reporting secure publication. Do not describe an HTTP fallback as confidential HTTPS. The release receipt records the actual certificate method and renewal status rather than this document asserting success in advance.

Run the service as a dedicated unprivileged account under systemd. The application may read its code/dataset and write only its private state. Preserve SSH management and unrelated system services. SIGTERM/SIGINT request a graceful close with a 15-second final deadline. Application restarts must not discard the session secret or visitor history.

## Focused-panel browser correction

Browser review found D-046-04: Continue with AI inserted its focus banner directly under the animated `#ai-panel`, creating a second grid child. With a collapsed `0fr` row, the remaining child could stay visible. The banner is now inserted within `.ai-panel-inner`, preserving one animated grid child. The change does not alter source focus or scientific context. A source-structure regression was added; post-fix collapse/mobile/history and PDF visual checks remain distinct browser evidence.

## Verification and acceptance

FIF-077 covers anonymous public operation and privacy boundaries; FIF-078 covers verified range delivery. Test definitions are `tests/hosted.test.mjs`, `tests/file-response.test.mjs` and the existing `tests/dataset.test.mjs`. The final full suite, deployed browser checks, portable regression, dataset transfer/readback, certificate and package checks belong to `qa/release-0.4.6/` and must retain their own version/hash/time.

Linux compatibility runs use an isolated QA directory and copied, hash-verified public metadata plus the required reviewed originals. `PSI_METADATA_DIR` overrides the legacy test-only Windows metadata path; `NORMALIZATION_DATASET_ROOT` selects isolated normalization fixtures. Provider key/model environment values are unset. The Windows DPAPI test is intentionally skipped on Linux and must remain separately verified on Windows; this is not a missing Linux encryption check.

The focused file tests observed 11 passes including the existing dataset cases. The hosting worker reported ten mocked hosted tests; the release owner must retain the final combined run. These isolated checks do not substitute for public deployment, user acceptance or load testing. Implementation verification is complete against the final UI-source snapshot: Windows 499/499, Linux 498 passed and one Windows-only skip out of 499, verified rebuilt portable EXE, 309 deployed runtime-file hashes, nine reviewed public-browser checks and 17 public API checks. Complete dataset byte readback and ZIP sealing remain separate pending stages. No automated test sends a real Gemini request.

The initial Linux compatibility run finished on 2026-11-15 with 495 passes, zero failures and one Windows-only DPAPI skip out of 496 tests, on Oracle Linux 9 / x86_64 and Node 24.22.3. `linux-initial-tests.json`, `linux-initial-tests.log` and `linux-initial-source-fixture-manifest.json` preserve that exact pre-D-046-06 snapshot and hashes. `linux-tests.json/log` and `linux-source-fixture-manifest.json` are the separate latest run; do not attribute the earlier result to later source edits. The post-retrieval-fix, pre-panel-change Linux run completed at 2026-11-15T13:13:08.496367+00:00 with 496 passed, zero failures and the same one Windows-only skip out of 497 tests. The same-stage Windows suite passed all 497 tests. Its logs are preserved as linux-pre-panel-* and windows-pre-panel-tests.log; final UI regressions use the latest receipts. The final UI-source Linux run completed at 2026-11-15T13:23:24.641655+00:00 with 498 passed, zero failures and one Windows-only DPAPI skip out of 499. The final Windows suite passed 499/499. All Linux stages use isolated public-source fixtures, no provider key and no real Gemini calls.

One explicitly authorized live trial is recorded separately in `qa/release-0.4.6/live-trial.json`: HTTP 200, returned `gemini-3.1-flash-lite`, local validation passed, 48.12 seconds elapsed, no private conversation history and no automatic retry. It was a basic-conversation exchange before D-046-06. The release contains an allowlisted receipt omitting request/response bodies, credentials and private history. This is one observed provider-transport/validation success, not scientific-usefulness evaluation, quota forecasting or load acceptance. No post-optimization live trial was made.

Open items include finite server/provider capacity, public-key quota abuse, cookie/history retention, full-content extraction, material-transfer validity, independent scientific review and formal assurance. All NPR rows remain partial or otherwise unclosed as before. A public operational research demo is not a NASA-certified emergency system.

## Distribution

`SpaceApps1-0.4.6.zip` retains exactly two sibling folders: `SpaceApps1/` and `Developer Patch/`. The application folder contains its small transition summary in `Patches/Changes.txt`. The developer folder contains the detailed English PDF, before/after sources, code index, changes, risks and verification records. The Verification folder retains runtime-manifest.json and dataset-sha256.json with relative paths, sizes and SHA256 hashes, together with remote readback receipts. The deployment script is included as Deployment/finalize-deployment.py. No dataset bytes are embedded in those inventories. No separate report ZIP or loose delivery PDF is created. Server secrets, private conversations, logs containing personal data and the fixed dataset are excluded.

## Small-host startup observation

The actual host has 498 MiB RAM and 4 GiB swap. The first startup completed in about 92 seconds while the dataset was uploading; observed page faults and swap I/O explain the delay better than CPU work alone. Local profiling measured about 617 MB RSS immediately after loading versus about 352 MB after completed asynchronous reads and two collections. Hosted startup optionally collects temporary buffers with --expose-gc; the service uses a 512 MiB old-space budget. This is a one-time startup measure, not a request loop or a capacity guarantee. Public warmed HTTP probes returned in roughly 0.15-0.4 seconds; this does not measure Gemini latency.

The static header and page title were also updated to the current release, preventing a correct 0.4.6 API from appearing as 0.4.5.

## Non-ranking conversation context correction

The 48.12-second live trial contained approximately 28 seconds before provider dispatch. Code inspection confirmed that a research-mode turn with an empty permitted-source list could still invoke dataset context retrieval. `lib/gemini.mjs` now skips that lookup only when `mode==='research'` and `ids.length===0`. Greeting, language-only and clarification regression cases perform zero context lookups; legitimate research still receives its two allowed fixture sources. The focused 34-test run is recorded in `context-retrieval-tests.log`; current full-suite results are separate. This proves removal of unnecessary work. It does not establish that index retrieval caused all observed delay or quantify an improvement.

## Approved Safety panel presentation handoff

The user approved a narrow addition to the still-unsealed 0.4.6 release: adapt only the demo Safety Recommendations panel and the Conditions `sliders-horizontal` icon. The source decision is `../handoff/2026-11-15-space-apps-panel-tasarim-devri.md`, SHA256 `14e900348121e11622b83fa27edf1932c9b32a6ebd28612be954a47959f7932a`. The handoff is a user design decision, not a scientific source or replacement recommendation dataset.

FIF-079 requires a shield/title, concise checklist layout, numbered source markers and expandable evidence using the real application data. The collapsed Safety panel must be a slim rail aligned with the Conditions rail scale; the approved open width remains. Its toggle must remain at the moving upper-left panel edge, travel with that edge, remain keyboard-accessible and expose the correct `aria-expanded` state. The demo's defective fixed-right toggle must not be copied. Conditions changes only its icon. Chat, source cards, documents, comparisons, workspace tabs, header, history, settings and other panel layout remain unchanged.

D-046-07 records the low-severity visual preference. D-046-08 separately records the medium-severity functional toggle/access issue. No demo messages or synthetic recommendations are imported, and no model prompt, scientific score or source eligibility changes are authorized by this handoff. Implementation changes are confined to public/index.html, safety-steps.css, recommendations-panel.mjs, app.js and THIRD_PARTY_NOTICES.txt. setRecommendationsExpanded centralizes manual and incident expansion, hidden/inert state, aria-expanded and focus return; the old duplicate handler is removed. tests/safety-panel-controls.test.mjs adds visibility/focus regressions. The 17-test focused run and 13 controlled browser checks passed. Before/after desktop/mobile images were visually reviewed, and the after-review receipt binds the source hashes. At a 1440 px viewport the rail is 88 px and open width remains 480 px; the control stays 13 px inside the left edge as it moves 392 px. At 390 px the collapsed mobile strip is under 80 px tall. This is mock-provider UI evidence with zero real calls. Final full-suite and rebuilt EXE checks passed; deployed public-browser checks also verified the moving toggle, keyboard collapse and mobile access. Those receipts remain distinct from the controlled UI review. Complete dataset byte readback and ZIP sealing remain pending. Icon source bytes/license hashes are in safety-design/icon-sources.json.

## Final implementation verification snapshot

The final Windows portable EXE SHA256 is `e07e725d940470e4a7f6dc1bb3ea311e0029946191879b8730c9ba5bb4c5177f`; portable and real-content receipts both bind that exact executable. Runtime readback verifies all 309 deployed files against runtime-manifest.json. Public browser review passed nine checks and public API verification passed 17, with no real provider calls. D-046-01 through D-046-08 are marked resolved at the implementation-verification level. G-046-04 remains open until the full dataset remote-byte check completes; final ZIP generation, PDF review and archive readback are not implied by implementation verification. Scientific, capacity and formal-assurance limits remain open.
