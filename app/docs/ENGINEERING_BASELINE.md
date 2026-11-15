# Flame in Freefall — engineering baseline 0.0.1 (first shared release)

14 November 2026. Objective: share a source-citing combustion research dashboard as one Windows executable while protecting the user's key on their computer. This document records the initial plan and available evidence for the Class C target. It does not deliver flight software, a fire alarm or an automatic intervention system.

## Classification

At the user's request, NPR 7150.2D was adopted as a **Class C engineering target**. The supplied `NASA NPR 7.pdf` is revision D: effective 2022-03-08, expiration 2027-03-08. The PDF SHA-256 and official source are in `standards/source-record.json`. Appendix D, pages 82–83, defines Class C application areas; this competition demo is not claimed to have been formally assigned that classification. Class C is not a programming-language choice.

All 100 requirement rows in Appendix C were recorded in full; the C column contains 92 X marks. `class-c-matrix.json/csv` preserves every row. A blank column is not an approved exemption; conditional clauses require separate assessment. The 92 marks do not mean 92 completed requirements. No standard requirement has yet been closed as fully compliant. SWE-020/176 classification, SWE-125 matrix, SWE-205 safety-criticality assessment and SWE-022 assurance reviews remain open. NASA/organizational technical-authority approvals are not recorded as granted.

This demo connects no live sensors or actuators and calculates no operational safety boundary. Nevertheless, users mistaking model output for a safety decision is risk H-01. Safety-criticality cannot be closed merely by labelling software a demo; a separate review against NASA-STD-8739.8 and the actual use case is required. If formally classified as critical, additional conditions including SWE-023/134/219/220 apply.

## Architecture

Browser interface → HTTP API on 127.0.0.1 on the same computer → validation/ranking against the versioned Veri_Seti index beside the EXE → Gemini API only when the user requests analysis. Responses are checked against source quotations; inferences and limitations are shown. No external web tool is provided. Users can retrieve JSON analysis output and original PDF documents. Quantitative trial matching is absent in this version.

Code components:
- `lib/dataset.mjs`: resolve the dataset folder from the EXE location; validate version and index SHA; paginated file search; real-path confinement; verify file SHA on access.
- `lib/corpus.mjs`: data-access allowlist, source hash, request bounds, topic ranking and model-response validation.
- `lib/gemini.mjs`: fixed model, prompt, quota limits, cache, timeout and one active request.
- `lib/credentials.mjs`: locally encrypted key through DPAPI CurrentUser. Windows PowerShell/.NET performs protection/unprotection in a hidden child process; no separate user launcher is needed.
- `server.mjs`: static-file allowlist, same-origin and nonce checks, key settings and shutdown.
- `portable.mjs`: embedded assets, dynamic port, repeat launch, browser opening, user profile and shutdown.
- `public/`: numerical conditions, source tabs, file library, supporting documents and API settings.

Acquisition/development decision (SWE-033): use an external model service rather than train a model; implement the application, ranking and evidence checks specifically for this project. Rust is recorded as the user's preference; this urgent demo uses the available Node 25.9 runtime to produce one EXE. Rust conversion is a separate future change preserving the HTTP contract and is not represented as completed.

## Lifecycle

Lifecycle: scope and requirements baseline → data/interface contract → design review → implementation and unit tests → EXE integration → target-platform and user acceptance → release and maintenance. Transition conditions: the requirement output exists; negative/error behavior has been exercised; source/key boundaries are preserved; open issues are documented. Product architecture and sequential development flow are kept distinct.

Acceptance criteria are in `requirements.json`. Each change produces a CHANGELOG entry, requirement/code/test links and QA evidence. Source, tests, package, dependency lock, standards source, matrix and risk register are deliverables. The user's preference for a plan without named people or durations is preserved; however, NPR schedule/cost/training and independent-review evidence remains separately open and is not removed or deemed complete (SWE-015/151/174/017/087–089).

## Security

Threats: accidental key sharing, another website initiating local HTTP calls, unsupported/incorrect model inference, file-path exposure, quota consumption and corrupt cache. Controls: loopback only; Host allowlist; POST nonce + Origin; JSON and 16 KB body limit; security headers/CSP; fixed static files; no key in GET responses; DPAPI; no key in stdout/argv/logs; no model request at startup; one request, 60-second timeout, 3600 output tokens; quotation/ID/field validation; HTML escaping.

The key persists. It is not replaced until saving succeeds; analysis and shutdown are locked during a settings operation. If the file is corrupt or belongs to another Windows account, the portable application starts without a key and requests re-entry. This does not claim absolute protection from malware running under the same account or a hardware vault. The user profile is excluded from backup/sharing scope.

Coding rules: do not concatenate user text into shell commands; place API keys in URLs; expose dynamic file paths; insert unescaped HTML; count failed records as successful; or silently fall back to another model. Distinguish scientific inputs from code instructions. Formal security assessment and deep static analysis remain incomplete (G-03).

## Dependencies

Dependencies: Node.js 25.9.0 SEA runtime, esbuild 0.28.2 development bundler (locked by `package-lock.json`), Windows x64, the user's browser, Windows DPAPI/PowerShell and external provider Gemini 3.1 Flash-Lite. esbuild is build-only; running the EXE requires no npm/esbuild installation. `npm audit` reported zero findings; this is not security approval of Node, the operating system or provider.

AI-written code is preserved as source for human review; passing tests is not tool accreditation or independent review. SEA tooling and the PE GUI-header modification are tracked with hashes and relocation tests; SWE-136 tool validation/accreditation remains open. No expert evaluation set for model semantics exists yet (G-01). The commercial provider can change its model version/service; generated outputs carry model/source hash/date.

## Verification

`npm test`: 16 automated tests passed; no live Gemini call was made. `scripts/verify-portable.mjs` checks the relocated EXE, empty PATH, missing/present dataset folder, PSI+REF sources, CSV access, DPAPI persistence of a dummy key, repeat launch and shutdown. `scripts/verify-full-dataset.mjs` checks the actual 24+11 records, source-file counts, BASS-II CSV preview and PDF hash. Fifteen consecutive full-catalog loads succeeded. BASS-II file selection/CSV preview and the Apollo13 document group were observed in the UI. Evidence: qa/portable-verification.json, qa/full-dataset-verification.json, qa/dataset-ui-verification.json and associated screenshots.

Distribution verification uses scripts/package-dataset.py to check all source-payload SHA values and the decompressed byte counts/SHA values of every ZIP member; completion is recorded in a separate verification.json. ZIP creation alone does not constitute verification.

A quotation matching its source does not prove the scientific correctness of the conclusion. Coverage/quotation tests and scientific validation are separate. A clean second Windows machine, coverage metrics, independent review and verification against every NPR requirement remain unavailable. This is a demo delivery, not a Class C operational acceptance release.

## Configuration

The user named the first shared release 0.0.1. Earlier internal 0.2.0/0.3.0 prototype history is retained. Controlled items: server/lib/public/portable; tests; packaging/audit scripts; dependency lock; 24 PSI metadata records, 11 supporting records, fixed data index and hashes; model/prompt; standards source/matrix; risk/requirements/change records; EXE and release manifest. The user key and personal cache are not controlled distribution items. `.gitignore` excludes them. The release manifest records EXE size/SHA and hashes of every embedded input.

Change process: identify requirement/risk impact → modify source/tests → run relevant tests and integration → record evidence → bind the EXE hash → review → distribute. Defects close only when the relevant verification passes. v0.1 evidence is retained as history; new portable results use separate files. Source-inventoried QA records, Git snapshots and any release archive should be used together; no signed independent acceptance exists.

Maintenance: replacing the EXE preserves the user's LocalAppData profile; settings-format changes first require versioned migration/rollback tests. Rollback uses the earlier verified EXE; this version performs no automatic data conversion. Retirement: the user removes their key through the panel and removes the EXE; personal cache is cleaned only on explicit request. Original NASA sources and dataset-agent manifests are not deleted by distribution cleanup.

## References

- User-supplied PDF: `C:/Users/Ahmet Taha/Desktop/Spaceapps/Documents/NASA NPR 7.pdf`.
- [NPR 7150.2D Appendix C](https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7150_002D_&page_name=AppendixC)
- [Node 25.9 single executable](https://nodejs.org/download/release/v25.9.0/docs/api/single-executable-applications.html)
- [Microsoft DPAPI](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata)

## Versioned documentation and code index

Every release/patch distribution ZIP includes a detailed PDF change report and a code index tied to its source hashes. The report separates previous behavior, defect/feedback, reason, severity, requirement/code/test links and open limitations. Visual-preference changes are low severity; user-designated zoom, physical-calculation, weight/threshold changes are critical. Physical-similarity/zoom calculations were not changed in this version. Data loss and unauthorized file access are high severity. Technical test success is not scientific or organizational acceptance.

Code index: file hash/lines; JavaScript AST functions, callbacks, loops, conditions, statements and calls; Python AST; HTML elements; CSS rules. Parent/function/loop identifiers retain each block's context. Purpose descriptions were reviewed at module level; most lower-level labels are syntax-derived and explicitly require semantic review. Indexing does not automatically redesign the code. Splitting large UI functions into smaller modules requires a separate patch.

The animation/tab patch is not integrated into this release; it is prepared in a separate patch directory with its own PDF and baseline hashes.