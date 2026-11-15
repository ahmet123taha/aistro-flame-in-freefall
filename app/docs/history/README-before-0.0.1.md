# Flame in Freefall — portable demo 0.2.0

The dark research dashboard compares four local NASA PSI metadata records. Ten output sections expand/collapse in priority order. Features include comparison, source library, condition entry, Gemini analysis, JSON export and browser PDF printing.

## Startup

Distribution: `C:\Users\Ahmet Taha\Desktop\Spaceapps\Flame_in_Freefall_Portable\Flame-in-Freefall.exe`. Double-click the EXE on Windows x64; the embedded runtime and four metadata sources start a local server and open the default browser. No separate Node installation, terminal, launcher or service startup is required. The port is selected automatically. A second launch opens the existing session. **Quit application** in the panel stops the local process; closing only the browser tab does not stop it.

Users enter their own key in **API settings**. The key is encrypted with Windows DPAPI CurrentUser in `%LOCALAPPDATA%\FlameInFreefall\credentials.dpapi` and loaded on restart. It is not written into the EXE, source, browser storage, logs or analysis cache. **Remove saved key** deletes the user's record. Portable builds include only explicitly listed source/interface files; a key-free shared package is produced without deleting the local key. The EXE or distribution folder can be uploaded to Google Drive; the LocalAppData profile must not be shared. Saving a key makes no Gemini call and does not establish its provider validity.

Developer mode: `npm ci`, then `node server.mjs` (verified with Node 25.9). The old `Baslat.cmd` is a development convenience only. Portable build: `npm run build:portable`, using Windows x64 Node 25.9. Verify with `npm test` and `node scripts/verify-portable.mjs`. Verification on a second clean computer has not yet occurred.

## Restricted source pool

Default source directory: `C:\Users\Ahmet Taha\Desktop\Spaceapps\Inventory_PSI`.

- `PSI-107_investigation_metadata.json` — SPICE
- `PSI-115_investigation_metadata.json` — smoke-particle simulation
- `PSI-117_investigation_metadata.json` — cool-flame CFD
- `PSI-142_investigation_metadata.json` — cool-flame transitions

No other sources or archives are read. `PSI_METADATA_DIR` can specify another directory, but the allowlist remains fixed to those four names. Files are read at startup and retain SHA-256 provenance. Trial-table references are filenames only; table content is not loaded. Publication references are not used as full text. The local source view derives from scientific fields in the original JSON and is not the entire original file.

Only selected records' `objective`, `approach`, `hypothesis`, `researchImpacts`, ID, title, version and table filenames are sent to Gemini. The model has no web tool. Every evidence quotation is checked for an exact match in the correct source/field. This does not guarantee scientific interpretation. The prompt requests separation of hypotheses, objectives, reported content and inference, and the interface displays that distinction. Solution candidates are labelled as inferences within the metadata scope.

## Model and quota

Default: `gemini-3.1-flash-lite`. The cheaper `gemini-2.5-flash-lite` returned HTTP 404 on the first attempt; the user authorized one additional trial with 3.1 Flash-Lite. Google's price list checked on 14 November 2026 listed standard 3.1 Flash-Lite text input/output at $0.25 / $1.50 per million tokens, with eligible free-tier use listed as free. The application does not automatically switch models on access errors.

- API requests occur only when the user presses the analysis button.
- No automatic retry, startup API test, model discovery or web browsing.
- Local cache is used for the same source version, model, conditions and question.
- One API request runs at a time; output is limited to 3600 tokens.
- `.runtime/` in development mode and `%LOCALAPPDATA%\FlameInFreefall\cache` in portable mode hold the analysis cache and a key-free usage counter. The counter applies to this server session, not the remaining Google-account quota.
- Another model may be selected explicitly through `GEMINI_MODEL`; there is no automatic expensive-model fallback.

Official technical sources: [Gemini pricing](https://aistudio.google.com/docs/pricing#gemini-3.1-flash-lite), [2.5 model access](https://aistudio.google.com/docs/models/gemini-2.5-flash-lite), [generateContent API](https://aistudio.google.com/api-reference/generate-content).

## Application structure

This demonstration uses HTML/CSS/JavaScript and a dependency-free local Node.js service. The Rust toolchain was not available on the computer, so this release is not a Rust service. The interface can be retained when `/api/catalog`, `/api/rank` and `/api/analyze` later migrate to Rust.

`lib/corpus.mjs`: read the four files, source provenance, data validation and topic matching. `lib/gemini.mjs`: scoped prompt, server-side API call, quotation validation and cache. `server.mjs`: serve only allowed static files and API routes; bind to 127.0.0.1. `public/`: browser interface.

`node --test tests/*.test.mjs` makes no actual Gemini call. Mock responses test local scope, data validation, source quotations, cache, error handling, concurrency and HTTP boundaries.

Final verification on 14 November 2026: 10/10 local tests passed. The initial 2.5 Flash-Lite analysis returned 404; the user's single authorized additional 3.1 Flash-Lite call succeeded (2798 input and 898 output tokens reported). Subsequent displays of the same question used cache. Browser checks covered 1440 px desktop and 390 px narrow screens, expanding/collapsing all ten sections, source filtering, comparison, source library and JSON export. Evidence: `qa/verification.json`, `qa/dashboard-desktop.jpg`, `qa/dashboard-mobile.jpg`. Quotation matching is not scientific interpretation validation; hypothesis source fields are separately labelled in the UI.

## Known limitations

Portable 0.2.0: 12/12 local tests and a separate EXE relocation/restart check passed. These new checks used zero Gemini requests. Details: `qa/portable-verification.json`; distribution hash: `qa/portable-build.json`; API entry screen: `qa/portable-api-settings.jpg`.

The target engineering framework for NPR 7150.2D Class C is in `docs/ENGINEERING_BASELINE.md`; all 100 Appendix C rows and the 92 requirements marked X in the Class C column are recorded in `docs/standards/class-c-matrix.csv`. These records do not establish full compliance or NASA certification. Missing evidence/reviews are tracked in `docs/risks-and-gaps.json`.

Topic ranking is explainable keyword matching, not physical similarity or a confidence probability. This metadata cannot calculate measurement curves, safe regions at partial gravity or ignition probability. An English delivery, actual trial tables and a Rust backend remain future scope in this historical record. This work runs locally and is not a published project submission.

## Current interface: 0.3.0

The previous ten-section display was replaced with a data workspace based on the user's drawing: numerical inputs on the left, AI above, studies/open file tabs in the center, collapsible recommendations on the right. Gravity m/s², temperature K, oxygen %, pressure kPa, flow cm/s, thickness mm. Material identity is supplied in the AI question; numerical properties do not replace material identity. Tabs persist during the session; no workspace is saved to disk. The SI recommendation filter shows only sources included in an obtained AI response. High/moderate/low thresholds are a future similarity view; current records have no computed score. The large dataset and quantitative weights are not yet integrated.