# SpaceApps1 0.4.8

Current 0.5.2: AI Astro research chat uses OpenAI GPT-6.1 Sol with medium reasoning. Incident support is a shortcut to the existing Safety panel only. The separate emergency voice/text dialog, microphone capture and incident provider routes have been retired. The fixed source dataset, numerical comparison and source validation remain unchanged. No web search or automatic provider fallback is enabled.

Enter your OpenAI key in Settings on Windows; it is saved separately from the legacy Gemini vault. Hosted installations use private OPENAI_API_KEY and optional OPENAI_MODEL=gpt-6.1-sol. Existing Gemini conversations keep their original provider labels. Shared packages contain no credentials, private history or dataset.

See docs/OPENAI_MIGRATION_048.md and the bundled Developer Patch verification receipts. This provider migration does not establish NASA approval, scientific correctness or emergency-service capability. Live model and voice trials are reported separately from offline tests. Earlier sections below are historical.

# SpaceApps1 0.4.7

Historical 0.4.7 interaction (retired in 0.5.2): Research & learning provided source-grounded explanations and discovery, while Incident support opened a separate voice/text conversation. Current Incident support opens Safety only. Known conditions remain optional; missing information never becomes an invented measurement.

Historical provider implementation: the early voice prototype used Gemini Live and was subsequently replaced by OpenAI Realtime. Both separate incident voice/text modes are inactive in 0.5.2. Historical source and test evidence are retained for traceability. The current application does not request a microphone or offer an emergency voice session. It is not emergency dispatch or an approved emergency operating procedure.

Reports now use continuous original PDF pages in normal webpage flow. The existing dataset, numerical scoring and source-provenance boundaries are retained. The public hosted application and single-executable Windows portable share the implementation. No Rust or Node installation is required to run the Windows package. OpenAI migration has not been performed.

The ZIP contains SpaceApps1/ and Developer Patch/. Read the bundled English transition report and verification receipts for exact test, build and deployment states. Credentials, private conversations and the fixed dataset are excluded. NPR Class C remains an incomplete engineering target. Earlier sections below describe historical releases.

# SpaceApps1 0.4.6

The 0.4.5 research flow now has a separate public-server entry point, `hosted.mjs`. Visitors can open the site without an account or login. Each browser receives an anonymous identity with separate conversation history and analysis state; the shared provider key remains server-side. The Windows portable application continues to use the local encrypted key vault.

Hosted mode uses the fixed, read-only `Veri_Seti` and pinned `Research_Content` index. Original-file downloads support HEAD and single-byte ranges for PDF seeking. Numerical matching, source scope, scientific limits and incident behavior are unchanged; Voice Incident Support remains deferred.

Deployment and final release acceptance are tracked in `qa/release-0.4.6/release-facts.json` and the bundled verification receipts. A health response is not a live Gemini test or proof of complete dataset upload. No new real Gemini test or NASA certification is claimed. Read `docs/HOSTED_DEPLOYMENT_046.md` for configuration, privacy, data verification and the small server's capacity limits.

The release ZIP contains `SpaceApps1/` and `Developer Patch/`; the latter holds the detailed English report, source/code map and checks. Credentials, personal history and the separately distributed dataset are excluded. Earlier release descriptions below remain historical.

# SpaceApps1 0.4.5

This release makes the research assistant more direct: versioned runtime skills guide concise answers, Continue with AI opens a source-focused discussion, and the safety sidebar separates short actions from numbered source details.

The numerical audit distinguishes missing indexed evidence from a measured mismatch. Reviewed SIBAL evidence remains distinct from pure cotton, and explicitly reported nominal gravity settings are labeled rather than treated as residual-acceleration measurements. Third-party material support remains separate from PSI evidence.

Use the existing Veri_Seti and Research_Content/0.4.2 add-on. Voice Incident Support is deferred. No dataset modification, new live Gemini trial, Oracle deployment or Class C certification. See docs/AGENT_SKILLS_EVIDENCE_045.md and the bundled Developer Patch report for exact verification status.

# SpaceApps1 0.4.4

Source findings now lead the conversation and ranked sources. Each brief separates the reported finding or study scope, interpretation for your question and its limitation; original passages and file locations are expandable.

The safety workspace groups prevention, response preparation and critical cautions. Reading markers and source briefs are saved per chat. Incident support is immediately available without an AI response, with applicable-procedure handoff and separately labeled experimental background. No approved firefighting procedure catalog is included.

Use the existing Veri_Seti and Research_Content/0.4.2 add-on. No dataset modification or additional large download. No new live Gemini trial, remote deployment or Class C certification. See docs/SOURCE_BRIEFING_SAFETY_044.md and the bundled Developer Patch report.

# SpaceApps1 0.4.3

Scenario-first research with adaptive optional details and source-based safety preparation steps. Ask a question, review the suggested contextual fields, and provide only what you know. Choices remain editable; blank and unknown answers never block discovery. Old topic details are retained separately and are not silently reused.

Use the existing fixed Veri_Seti and Research_Content/0.4.2 add-on. The user API key stays in the Windows-encrypted local vault and is absent from the ZIP. Production history remains under LocalAppData/FlameInFreefall; the separate 0.4.2-prototype.1 profile is preserved without automatic merging.

See docs/ADAPTIVE_RESEARCH_043.md for the algorithm, source boundaries and limitations. Detailed reports and verification are delivered inside Developer Patch in SpaceApps1-0.4.3.zip. The historical implementation descriptions below retain their original version context.

# Scenario-first prototype - 0.4.2 half-step

Package version 0.4.2-prototype.1. Start by describing what you want to learn. The optional conditions rail opens when useful fields are requested; unknown details may be skipped. This prototype is for comparison with production 0.4.2, not an accepted replacement.

Use the existing fixed Veri_Seti and Research_Content/0.4.2 add-on. No new dataset download is required. Prototype history/cache is isolated under LocalAppData/FlameInFreefall/Prototypes/0.4.2-prototype.1; the Windows-encrypted key vault remains shared. No real provider trials are included in this release's verification.

See docs/SCENARIO_FIRST_PROTOTYPE.md for the flow, contracts, scientific invariants and limitations.

# SpaceApps1 0.4.2

Source references now show the original local file and explicit page, sheet/row or streamed location inside evidence details. Input controls remain hidden while loading; initialization failures leave a persistent notice. Status text distinguishes recovered, partial, unread and excluded source text without presenting it as scientific review.

Mixed-format source reading uses the final pinned 31,881-file index with question/phrase-first retrieval and explicit material context. The default panel retains 20 primary + 3 extra exact anchors; the recorded-condition panel retains 19/20 strict anchors and 20/20 requested facts after a same-original repeated-passage review. Canonical installation is receipt-confirmed. Use only the matching versioned Research_Content add-on inside Veri_Seti; keep the original sources. The add-on is not a full dataset or a fire-safety approval. Details: docs/SOURCE_CONTENT_042.md. See release verification and publication receipts inside Developer Patch. The release owner completes archive and index checks before delivery; the pre-seal record snapshot may retain packaging as pending while later package-manifest/readback receipts complete it.

## Historical 0.4.1 baseline

Research can retrieve literal passages inside the installed PDF/XLSX content index before narrowing studies. To install the separate source-content add-on, put its Research_Content folder inside Veri_Seti and restart; keep the original dataset files. The add-on is not the full dataset. Missing/invalid content support preserves existing reviewed-source research. Scope and skipped/empty source text remain explicit.

Research/design cards now show a concrete action, why it matters, the material/condition limit and source basis; supplied original-file anchors open the source. Review priority is not fire severity. Reviewed normalization adds narrow source-pinned fields and quarantines ambiguity without treating pure Cotton as SIBAL or raw text as numerical evidence. The independent known-passage benchmark retains 20/20 candidate sources and 18/20 final exact anchors; incomplete retrieval, semantic support and scientific validation remain open. No new provider call was made.

Details: docs/SOURCE_CONTENT_041.md and docs/CODE_FRAME_GUIDE_041.md. See release verification and publication receipts inside Developer Patch; the release owner completes browser/PDF/EXE/archive/index checks before delivery. NPR 7150.2D Class C remains an incomplete engineering target.

## Historical 0.4.0 baseline

Open “Compare my inputs” on a research source to see each entered value, its closest usable indexed reference and source location, or why it is unassessed. Reported spans and other-material/raw instrument examples stay distinct from comparable measurements. Blank inputs are excluded; missing evidence is not zero similarity. Narrow comparisons use readable stacked cards. Valid proximity scores and weights are unchanged.

This update adds explanations, not new source extraction, scientific validation or emergency procedures. The original recorded 0.3.8 cohort is replayed offline; no new provider call was made. Relevant unindexed report/section/table findings and recommendation quality remain open in the separate 0.4.1 work. See docs/PARAMETER_COMPARISON_040.md and docs/CODE_FRAME_GUIDE_040.md. The exact rebuilt EXE is verified: SHA256 b87a34b5aca083a38250af4eab267ca1015871db8b37bafbaae0c7758011e54d, 102982144 bytes. The actual-dataset sidecar check also passed (11 profiles, 22 verified dependencies, no external research IDs or score adjustment); both receipts report zero provider calls. See release verification and publication receipts inside Developer Patch; the release owner completes archive/index checks before delivery; NPR Class C remains an incomplete target.

## Historical 0.3.9 baseline

Optional material applicability data are separate from PSI research. Place Material_Sensitivity inside Veri_Seti and retain its referenced Third_Party/sources originals. Restart the app to load it. Settings reports status; each source has a separate applicability disclosure. No third-party profile changes matching scores, tolerances or PSI evidence. Missing supplementary data leave PSI research available. See docs/MATERIAL_APPLICABILITY_039.md.

## Historical 0.3.8 baseline

Gravity input: bare numbers use m/s²; add g or G for standard-Earth-gravity multiples. Example: 1.96 = 1.96 m/s²; 1.96G = 19.221034 m/s². The converted value is shown before submission. This is a same-version amendment requested by the user.

Same-material parameter evidence can come from separate reviewed source rows, graph headers and marginal study spans. Percentages show supported parameter proximity with explicit coverage; they are not burning equivalence or fire probability. Different materials receive no requested-material numeric credit. The closest individual run remains a separate check.

The fixed60/40 retrieval budget remains. Explicit indexed material-family presence is a factual criterion; raw model values remain separate. Provider outages retain independent local source matches without an AI scenario score, interpretation or recommendations. No automatic retry or model switch occurs. See docs/DISCOVERY_AUDIT_038.md and docs/CODE_FRAME_GUIDE_038.md.

## Historical 0.3.7 baseline

PSI-26 now has 121 reviewed as-run pressure records. Incomplete comparisons display points over the assessed budget rather than a low full /100 match. Missing numerical gravity/temperature, ambiguous oxygen scale and unverified AIR display are not scored. The 60/40 budget and arithmetic proximity remain retrieval aids, not fire probabilities or a calibrated physical-equivalence model. See docs/PSI26_AUDIT_037.md.

## Historical 0.3.6 baseline

Local file selection updates a stable preview pane. Use File type > Plotted graphics to open reviewed interactive curves directly. Hover a visible curve for its series and calculated x/y values. Two reviewed BASS equation figures are currently available; image-only graphs remain original images. See docs/VIEWER_AUDIT_036.md.

## Historical 0.3.5 baseline

Source usefulness, measured-condition proximity and physical transfer are shown independently. Relevant material series and graphs remain available without an exact condition match. Missing normalized source values do not display as measured zero similarity. Physical tolerances remain source/model/output-specific; paper-specific calibration is not yet established. See docs/CONDITION_AUDIT_035.md.

## Historical 0.3.4 baseline

A conflicting or unverified optional recommendation update no longer discards a valid research reply. The earlier recommendation set stays unchanged pending review; conversation and validated source results remain available. The partial update is visible in chat and saved history. See docs/RECOMMENDATION_AUDIT_034.md.

## Historical 0.3.3 baseline

A missing explanation no longer discards an otherwise valid conversation. Cited sources with unexplained positive scores remain accessible without a total, while valid peer scores are retained. Partial response diagnostics persist in history and old recommendations stay unconfirmed. See docs/RUBRIC_AUDIT_033.md.

## Historical 0.3.2 baseline

Polite language-only messages do not initiate source research. Gemini requests use JSON mode with local scientific validation; the provider-side schema introduced in 0.3.1 is removed as a compatibility mitigation. The observed generic HTTP 400 did not identify its rejected field, and one subsequently authorized language-only request passed live Gemini and local validation. Wider scientific request testing remains open. See docs/PROVIDER_AUDIT_032.md.

## Historical 0.3.1 baseline

Language, greeting and presentation messages no longer become a fire scenario. The chat retains current environment/source focus, reports precise response-validation failures and recovers after errors. New chat and history remain separate from research results. See docs/FLOW_AUDIT_031.md for the complete audit, evidence and limits.

## Historical 0.3.0 baseline

Open BASS-II > Open report or Data / conditions > Graph reader. Read the published empirical curves by clicking the graph or entering a value; download calculated CSV. Switch to Original graph for the source graph crop, caption, zoom and PNG export.

The initial registry covers BASS-II Figures 6.10, 6.9 and 6.7. Only printed, verified fit equations are regenerated; original measured points/error bars are not invented. Other PDFs keep their document viewer. See docs/GRAPH_READER_030.md and FIF-039 for source hashes, limits and extension rules.

## Historical 0.2.9 baseline

New chat and Chat history are available in the header. New chat clears all current inputs and conversation context. New chat with these inputs starts independently with only the current environment values. Chat history restores a saved conversation and its last-saved environment; changing fields saves those edits to the active chat. No conversation or key is included in a shared ZIP.

The server treats the current environment as authoritative over older dialogue. Live Gemini adherence is not validated by controlled-provider tests. See docs/requirements.json FIF-038 and docs/FIGURE_610_REPLOT_REVIEW.md for the separate read-only graph feasibility review.

## 0.2.8 research workspace

Omitted inputs are excluded from the 60-point numeric budget. Partial evidence totals include source coverage, not fire probability. Scenario relevance uses eight continuous criteria. Chat clears the composer immediately and keeps new drafts. Recommendations persist per conversation and use source-validated keep/replace/clear updates. Reports render local PDF pages and text; CSV/TSV tables and common figure images open inline. XLSX and other formats retain original-download links. No external PDF CDN or model web tools are used. See docs/RESEARCH_WORKSPACE_028.md.

## Historical 0.2.4 baseline (specialist comparison)

Windows x64 portable application. Double-click SpaceApps1.exe; no Rust/Node installation or second launcher. Place the fixed Veri_Seti folder beside the EXE. Save your Gemini key in Settings; Windows DPAPI keeps it under your account, outside the ZIP.

Matching: select material/conditions and edit weights. Each parameter is compared with an actual trial row in the same units. Draft weights total50; no overall percentage before100. Missing measurements are not redistributed. Open the source row/contributions for review. Numerical closeness is not fire probability; critical thresholds are uncalibrated.

Data scope:35 sources,51,151 accessible files;1592 partially normalized source rows across10 studies. CSV/PDF can describe the same physical trial. BASS AIR centerline calculations are excluded from specimen-velocity scoring; calibration explanations remain. PMMA, SIBAL and Nomex report rows are source-bound. Preserve67 missing/excluded sources and2269 classification reviews from the fixed dataset. Not every PDF/Excel is automatically interpreted. Normalized numerical gravity/ambient temperature are currently unavailable. Gemini receives only selected local text, verified excerpts and applicable trial rows. No live test in this release.

ZIP roots: SpaceApps1/ and Developer Patch/. Short summary: SpaceApps1/Patches. PDF, defect records, previous/new source, diff, code index and test evidence are in the sibling developer directory. The fixed dataset ZIP is separate.

Checks: npm test; node scripts/build-portable.mjs <destination>; node scripts/verify-portable.mjs <exe>; node scripts/verify-numeric-dataset.mjs <parent-of-Veri_Seti>. NPR7150.2D Class C remains a target; independent scientific/assurance and second-machine validation remain open. This version uses Node SEA; Rust conversion is incomplete.

0.1.3: overall percentages require specimen type as well as material family. Burning-face count is an optional exact-match filter for sheets. Measured outcomes appear separately and are not predictions for user conditions.

0.1.4: select source-equation PMMA rod forced/total stretch in the comparison-method menu. Applicability conditions are mandatory; total mode requires measured flame radius. Local sensitivity shares are not fire-risk weights. See PMMA_ROD_MODEL.md.

0.1.5: optional thermal energy balance in PMMA rod modes. Regression velocity/characteristic length must be measured; ambient temperature and quasi-steady assumption are required. Heat shares/required net flux are not fire risk or extinction decisions. Source assumptions/details: docs/PMMA_THERMAL_MODEL.md.

0.1.6: experimental PMMA rod extinction-boundary method. Requires established flame, N2 diluent and boundary-state oxygen. Shows signed O2 margin and overlap of measurement-error interval with the source curve, without a headline risk percentage. Model error and independent validation remain open. docs/PMMA_BOUNDARY_MODEL.md.

0.1.7: source31-run SIBAL75% cotton/25% glass-fiber composite. Added fabric areal density, exposed unburned length, construction and specimen history. Other trials in the study can be opened. Questionable/missing values are not scored; source observations are not the user's specimen outcome. docs/SIBAL_EVIDENCE.md.

0.1.8: SIBAL quenching/blowoff observation mode. Enter source nominal construction; examine oxygen and gas-velocity differences separately. Pareto layers are not risk classes; the input-error box excludes source error. docs/SIBAL_TRANSITION_REVIEW.md.

0.1.9: Nomex product identity and detailed ignition observations for3 trials. CSV/PDF records of the same run are linked without merging; preserve summary/log differences. AIR/FAN readings cannot substitute for specimen-position velocity. docs/NOMEX_SOURCE_REVIEW.md.

0.1.10: optional absolute input-error bounds for direct numerical comparison. A conditional score interval accompanies nominal percentage when all weighted fields are known. Source error is excluded; this is neither fire risk nor a confidence interval. docs/NUMERIC_INPUT_BOUNDS.md.

0.1.11: add2–6 runs from result cards/subtrials to comparison. A separate tab preserves inputs, source observations and contributions; changing the form leaves the saved comparison unchanged. This is not a controlled experiment or risk prediction. docs/EXPERIMENT_COMPARISON.md.

0.1.12: ±.01–10% parameter-effect analysis in experimental PMMA rod boundary mode. Default±1% is a calculation step, not sensor-error estimation. Shares derive from the source equation/selected condition and do not modify general closeness weights. docs/BOUNDARY_EFFECT_ANALYSIS.md.

0.1.13: CFI-G normal/inverse gas configuration, ambient fuel and burner oxidizer-O2 inputs; no overall percentage without comparing both reactant concentrations at positive weights. Show source hot/cool-flame observations separately. docs/GAS_TRIAL_SEMANTICS.md.

0.1.14: separate gas-stoichiometry method; requires explicit binary N2 mixtures, ethane/propane/butane and normal/inverse configuration. Direct conditions retain user weights. Physical-method shares describe local Zst effects only. docs/GAS_STOICHIOMETRY.md.
