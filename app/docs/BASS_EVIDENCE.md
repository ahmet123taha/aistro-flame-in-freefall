# Current correction — 0.1.9

The following section describes historical 0.1.3 behavior. Version 0.1.9 excluded AIR centerline estimates from velocity scoring when specimen position was unverified; raw readings and the calculation remain separately explained. This affects 24 actual records. Hash verification does not establish physical applicability. New tests enforce this. See NOMEX_SOURCE_REVIEW.md. Multiple-trial viewing was added in 0.1.7; three Nomex CSV/PDF pairs were linked as single physical runs in 0.1.9 without merging columns. Earlier release ZIPs remain unchanged.

# 0.1.3 — Source-grounded calibration and observed outcomes

FIF-021. The fixed Veri_Seti package is unchanged. The application enables version-controlled derived records only after verifying the full SHA-256 hashes of two documents already in the package. If a file is missing or changed, its transformation is unavailable; source and calibration files are reverified when supplying model context.

## Sources and derivation

- f24948: `Fan Calibration data`, A33:A34: `U = 1.0066(AIR)`. Centerline, 56 mm downstream, 36 mm from the bottom; estimate based on SPICE calibration. SHA `bc0dca3efdef44a7774d8dd37aebc0cedae8d67d7bae8c9cbde9590014a3c983`. Only a single positive AIR reading is converted. FAN readings, comma-separated lists, ambiguous unitless expressions and missing readings are not converted. This is not interpolation of a daily fan curve. Measurement uncertainty is not supplied with the source equation and is not invented.
- f24951: NASA/TM-20210011385, PDF pages 64–65, printed 56–57, Table 5.1. SHA `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`. https://ntrs.nasa.gov/citations/20210011385. The local copy is a NASA NTRS publication; byte identity with the inaccessible PSI file has not been established. Provenance preserves this distinction.
- Section 5.3: PMMA sheet, opposed flow. Table 5.1: M1–M20, thickness mm, width cm→mm, one/two burning faces, flow cm/s, spread mm/s, duration minutes, initial/final O2 volume percentage. The table image was reviewed for all 20 rows; transcription is in lib/bass-evidence.mjs.

## Time and outcome semantics

Initial O2 is the starting condition of the whole trial, not a simultaneous O2 value for each stage. Final O2 is an observation and is not substituted for a matching input. For 15 trials with varying flow, no single velocity, average or artificial trial is created. Five trials have one listed velocity and permit comparison of that value. Stage lists appear in source order in the outcome panel. Untracked spread velocities for M6/M12 remain null, not zero.

These measurements describe flame spread on ignited PMMA specimens. They are not spontaneous-ignition probability, predicted outcomes under user conditions or certified flammability boundaries. Since oxygen also changed during the trial, differences between flow and spread cannot be attributed solely to a causal flow effect.

CSV and PDF may describe the same physical trial. Each source row remains separate evidence; columns are not merged to create another trial. Row count is not unique-trial count. Only the best comparable row per study is displayed in this historical version; browsing all trials is future work.

## Score and compatibility

The 0.1.2 ratio closeness and user weights remain; this release does not scientifically calibrate weights. Overall scores now require the same selected specimen type as well as material family. Burning-face count is an optional exact-match filter; one versus two faces does not produce 50%. It describes a combustion scenario, not whether a material will ignite. Cards show the number of selected weighted criteria: 100% on one criterion does not mean all trial conditions are identical.

## Tests and open work

tests/bass-evidence.test.mjs: calibration authority, varying flow, report identity, missing outcomes, geometry gate, burning-face filter and page provenance. scripts/verify-numeric-dataset.mjs: actual-package B1 5.033 cm/s estimate/calibration context and M1 0.071 mm/s outcome/report context. No live LLM call.

Physics-regime-dependent weights, material grade/coating taxonomy, critical thresholds, measurement uncertainty and independent scientific validation remain open. This change makes no Class C compliance claim.