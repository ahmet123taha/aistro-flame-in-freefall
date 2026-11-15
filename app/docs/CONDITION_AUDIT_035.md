# Condition comparison and source usefulness - 0.3.4 to 0.3.5

## D035-01 / HIGH - Exact material gate hid existing environmental measurements

Cause: Research scoring required a nonempty exact material name before comparing any condition. A fiberglass form or empty material therefore discarded all available oxygen/pressure/flow rows, including relevant contextual experiments.

Correction: Compare environmental measurements independently, identify source material explicitly, and require same material family for specimen thickness. Keep the existing six-input budget, arithmetic proximity formula and single-row integrity. Cross-material proximity is contextual, not equivalent burning.

Code: lib/research-scoring.mjs, lib/research-coverage.mjs

## D035-02 / HIGH - Missing data appeared as measured zero similarity and study coverage was hidden

Cause: Unavailable normalized source measurements displayed 0/60. Discovery supplied only bounded metadata and no reviewed series/figure index; users could not distinguish a missing point comparison from a useful material study.

Correction: Distinguish not_requested/unavailable/partial/complete conditions. Preserve all assessed sources and display source usefulness independently of point proximity. Add material-separated measured spans with row provenance and reviewed graphs, plus coverage evidence in the model context. Do not infer joint coverage, outcomes or interpolation from marginal ranges.

Code: lib/research-scoring.mjs, lib/research-coverage.mjs, lib/gemini.mjs, public/environment-panel.mjs

## D035-03 / HIGH - Raw proximity could be mistaken for physical or thermodynamic transferability

Cause: Equal parameter weights and min/max ratios are retrieval arithmetic; they do not establish output-specific tolerances, material equivalence or invariance of burning across environment changes.

Correction: Expose independent source usefulness, numeric proximity and reviewed physical-model applicability. Include verified PMMA stretch and energy-balance source definitions/properties without transferring them to other materials. Retrieve by material/mechanism first, then assess transport/regime transfer. Unknown tolerance never excludes a source or becomes an invented 99% score.

Code: lib/research.mjs, lib/research-coverage.mjs, public/environment-panel.mjs

## Limits

- Read-only audit: 1592 normalized source rows from 10 of 35 catalog records. No normalized numerical gravity or ambient-temperature column is currently available. This is a normalization scope limit, not proof that these values do not exist somewhere in the full documents.
- The 60/40 budget and raw proximity formula are editorial retrieval calculations, not physical laws or calibrated combustion similarity. Usefulness is a separate evidence category. A missing temperature model is not converted to either zero physical similarity or an invented 99%.
- A marginal span does not prove joint experimental coverage or an interpolatable surface. No generic flame/ignition interpolation or extrapolation is introduced. Same material family does not certify grade, moisture, geometry or storage equivalence.
- Reviewed quantitative physics is currently limited to the existing hash-pinned cast-PMMA rod sources. Required heat flux and stretch proximity are not ignition/extinction predictions. Paper/cellulose-specific physical tolerance calibration remains open.
- Third-party candidates were researched after explicit user authorization. They are recorded separately with provenance/license status; no external experimental payload was imported into the fixed dataset or production AI context.
- No new live Gemini request was made. Local and browser fixtures verify software behavior, not live scientific answer quality. No private key or transcript was read or packaged. Node SEA remains the runtime. NPR 7150.2D Class C remains an incomplete engineering target.
