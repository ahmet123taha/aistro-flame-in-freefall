# Material-specific source discovery - 0.3.8

## D038-01 / HIGH - Material/condition evidence existed in files but was absent from discovery

Cause: Only11 PSI investigations had partially normalized numerical rows. Several other studies had usable CSV settings, measured curve pressures or a graph header, but these were not available to the research scorer.

Correction: Add81 reviewed fragments from9 exact-hash-pinned local source files:5 investigations add supported environmental fields and4 add material/fuel-stream/curve context. Separate scalar values, discrete sets, marginal spans, experimental curves, instrument capacities and outcomes. Do not pretend every source fragment is an individual trial.

Code: lib/study-evidence.mjs, lib/study-evidence-data.mjs, scripts/prepare-study-evidence.py, lib/dataset.mjs. Status: resolved_for_reviewed_20_source_benchmark.

## D038-02 / HIGH - A different material could win numerical scoring

Cause: Environmental values could be credited across materials and material identity only affected a tie-break or warning. This was inconsistent with the requested material-specific source lookup.

Correction: Require the supplied canonical material family for numerical discovery. Preserve other-material literature as context without requested-material numerical credit. Do not equate SIBAL with fiberglass, n-octane with isooctane, mixtures with pure fuels, or a family match with equal grade.

Code: lib/parameter-support.mjs, lib/research-scoring.mjs, lib/research-coverage.mjs. Status: resolved_in_material_and_negative_controls.

## D038-03 / HIGH - One-row scoring did not represent whole-study parameter evidence

Cause: The research score used one closest normalized row even when another section, graph header or parameter sweep supplied relevant same-material evidence.

Correction: Resolve each parameter against same-material reported values, discrete settings or explicitly reviewed marginal spans. Keep each contribution source/cell/scope. Retain a separate nearest individual row. Expose jointlyTested=false whenever separate fragments support the result; create no combined trial, outcome interpolation or fire probability.

Code: lib/parameter-support.mjs, lib/research-scoring.mjs, public/environment-panel.mjs. Status: resolved_for_parameter_discovery_not_physical_transfer.

## D038-04 / HIGH - Research-mode provider context skipped the local-file context path

Cause: The analyzer called researchContext directly, bypassing the configured dataset context provider. Existing file availability did not mean its contents reached Gemini.

Correction: Run the configured context provider for research too, preserve reviewed local fragments while adding the source coverage index, and protect same-material candidates from generic keyword competition. Preserve exact evidence IDs, source hashes and scope. Unindexed files are still not automatically read.

Code: lib/gemini.mjs, lib/research-candidates.mjs, lib/research-coverage.mjs, lib/dataset.mjs. Status: resolved_in_live_and_context_tests.

## D038-05 / HIGH - The model under-credited an explicit material-family fact

Cause: In live PSI-B20, the model assigned material0.75 while its own explanation said ethane was a primary source fuel. The raw scenario subtotal was22/40, below the predeclared24-point test criterion.

Correction: Compute the material-family relevance criterion from source-index presence when original-file identity is available. Keep its fixed8-point weight, raw model value, source references and an explicit not-grade/not-burning-equivalence limitation. Replaying the same validated response gives24/40. No new model request or change to the raw reply was made.

Code: lib/research-scoring.mjs, public/environment-panel.mjs. Status: resolved_by_source_fact_replay_raw_result_preserved.

## D038-06 / MEDIUM - A Gemini service error hid available local matches

Cause: Live PSI-B12 returned provider HTTP503. The application showed the service error but had no source results even though local PMMA/flow evidence was available.

Correction: For explicit provider unavailability, retain the error/provider receipt and attach independently verified local material/parameter discovery. Assign no AI scenario score, generated interpretation or safety recommendations. Do not retry or switch models. Reject stale local results after input/source-focus changes.

Code: lib/local-discovery.mjs, server.mjs, public/app.js, public/environment-panel.mjs. Status: resolved_in_recorded_503_UI_replay_and_stale_guard.

## Limits and retained evidence

- These20 constructed, known-source cases are a diagnostic retrieval benchmark, not an independently sampled accuracy estimate or combustion validation.
- The real batch made exactly20 Gemini requests:19 successful validated replies and1 upstream503. All19 successful replies returned the intended source;18 ranked it first and1 second. Do not call this20 successful live Gemini replies.
- The final replay reuses original validated model analyses. Material-fact scoring changed after the real batch and was verified by deterministic replay, not another20 live calls. The live-tested source snapshot is preserved.
- The recorded503 was replayed through the final UI with2 mocked503 responses and zero Google calls. The source was found locally; AI scenario assessment remains unavailable in that path.
- Sixteen cases have supported environmental/specimen numeric fields; four concern fuel-stream/source-defined curve parameters that cannot be silently mapped to ambient oxygen or temperature. They deliberately receive no fabricated environmental percentage.
- Point proximity remains arithmetic min/max; reviewed span membership measures discovery coverage. Neither is calibrated physical/thermodynamic burning equivalence. Same material does not guarantee the same ignition, spread, extinction or smoke behavior.
- No universal5C/50C equivalence, gravity tolerance or high-altitude invariance is established. No numerical PSI gravity was fabricated. The0.2g to1.6g unit control is an8-fold difference and remains a low12.5% raw scalar proximity in its synthetic arithmetic test.
- The third-party collection remains separate and is not automatically used to train or calibrate these scores. Grade/composition, oxidizer/diluent, geometry and transport qualifications still matter.
- The largest observed successful provider latency was58.4seconds and successful replies reported930487 input/25014 output tokens. Large context and provider latency remain an open performance concern; a causal latency model was not established.503 token use was not supplied and is not assumed zero.
- Unindexed reports, workbook sections and graph coordinates are not automatically interpreted. This patch adds a reviewed bounded discovery index, not complete parsing of the entire fixed dataset. No source data or encrypted user key was modified. NPR Class C remains an incomplete engineering target.
