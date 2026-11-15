# Engineering development sequence — 0.1.14 checkpoint

This document does not claim completed work. Each release closes with separate tests, source hashes, code index, transition PDF and two-root portable ZIP. Preserve the fixed dataset. Do not package API keys. No live model call without separate authorization.

1. **Numerical matching baseline:** 0.1.2 actual values, units, material, specimen type and contribution table. 0.1.3 calibration source and observed outcomes. Not complete data normalization.
2. **Physically meaningful features:** separate applicability domains for thin/thick PMMA sheets, rods, fabric, droplets and gas burners. First establish material family, grade/coating, geometry, flow direction, gravity regime and stage semantics. Missing required evidence makes a method inapplicable; missing values are not assumed.
3. **Source-bound models:** source page/equation, units, assumptions, test range, required inputs and output definition for every formula. Compute parameter importance only within that scope using local sensitivity/experimental evidence. Arbitrary linear weights on dimensional parameters are not a universal physical model. PMMA forced-stretch and thin-cellulose opposed/concurrent correlations are separate candidates; 0.1.4 implements PMMA rod stretch, not cellulose correlations or a risk model.
4. **Validation and thresholds:** assess errors, coverage, cross-material generalization and boundary behavior on separate physical runs. PDF/CSV copies of the same run cannot be split between training and validation. Similarity, applicability, observed combustion and risk are separate outputs. No unsupported critical/safe threshold.
5. **Evidence-based recommendations:** distinguish experimentally tested actions from suggestions inferred from findings. Every suggestion needs a source and condition differences; the LLM does not calculate numerical results or add scientific facts outside the pool. Evaluate prompts/outputs and test source-boundary violations.
6. **Official requirements audit:** compare live challenge/resources with the current source list. The last challenge request returned 502, so complete current content is not verified. Retain archive dates. A general event page does not replace challenge details. Presentation/submission requirements need a separate matrix.
7. **Product/delivery:** trial selection, numerical comparisons between studies, search/access, error/empty states, mobile/zoom/keyboard checks. Preserve the approved simple three panels and tabs. Clean second-Windows-machine portability and independent human/assurance review remain open.

NPR 7150.2D Class C is an engineering target. Requirement, traceability, test and change evidence is developing; no independent approval, tailoring or full compliance is declared. The current application uses Node SEA; Rust architecture is not implemented. Earlier versions and defect severities are preserved.

0.1.5: developed the source-assumption PMMA thermal balance; 69 tests, real-data and EXE/browser checks passed; package readback is recorded with the release ZIP. Independent experimental heat-flux validation and a general flammability model remain incomplete.

0.1.6: implemented the source PMMA extinction curve and measurement-error box; 78 tests, real-data and EXE/browser checks passed. Source page images 83–84 were verified; the printed-coefficient minimum and approximate prose value remain distinct. SIBAL Table 7.1 (PDF104) and three Nomex no-ignition observations (PDF54) were found but not yet normalized. Independent model-error/validation and multi-trial comparison remain open.

0.1.7: implemented 31 SIBAL rows, material construction/history checks and multiple-row access. Source pages 102–104 were visually verified. Nominal-oxygen/no-ignition wording differences from Appendix A remain explicit. SIBAL physical correlation/independent validation, physical-run identity resolution and Nomex normalization remain open.

0.1.8: developed distance to SIBAL transition events and input-error-box review. PDF108–109 confirmed only partial boundary identification; the 12 mm boundary was unresolved. An official-challenge summary was found in search indexing; the live page returned 502, so full requirements/resources are unverified. General flammability/calibrated critical thresholds remain open.

0.1.8 verification: 93 tests, real data, portable and browser passed. D018-06 UI loading defect was found/fixed; module-serving checks were expanded.

0.1.9: three detailed Nomex observations and three CSV/PDF identity pairs; preserve product identity, F3 disputed final reading and summary/log difference. Corrected scoring of 24 centerline estimates as specimen velocity. Broader material coverage, calibration applicability, independent critical classification and other run identities remain open.

0.1.9 verification: 101 tests, all existing physical-method regressions, actual Nomex records and portable/browser checks passed. Packaging separately checks member SHA/CRC and diff applicability.

0.1.10: analytical input-error bounds for direct closeness. Distinguished unknown error, zero error and missing-source score intervals. Source measurement errors, correlation and independent physical-weight/flammability validation remain open.

0.1.10 verification: 111 tests, real-source and existing physics regressions passed; final portable EXE and 1280×720 interface verified. Critical flammability classification, source uncertainty, Rust conversion and clean second-Windows verification remain open.

0.1.11: compare2–6 actual runs with source observations, contributions and immutable input snapshots;121 tests/9 real-data checks passed. Distinct runs are not treated as a controlled causal experiment. Physical weights, calibrated critical classification, source uncertainty, Rust and clean second-Windows validation remain open.

0.1.12: finite effect shares, derivative comparison and joint changes on the PMMA curve. Tested branch sign reversal, effects despite zero derivative at the minimum and out-of-scope intervals.131 tests/10 real-data checks. Makes conditional physical importance visible, without universal similarity weights, calibrated critical risk or independent validation.

0.1.13: stream/ambient semantics and outcomes for333 CFI-G rows;140 butane records recognized. Next scientific gaps: gas mass flow, diluent/purity and ignition protocol, condition-dependent importance from source physics and independent validation. Identical selected conditions with different outcomes prevent treating closeness as risk probability. Rust, full Class C and official-source access remain open.

0.1.14: completed source-equation CFI-G stoichiometry, explicit N2 applicability gate and local physical derivatives. Vitiation, mass flow, ignition protocol, general physical-importance/risk validation, Rust and independent Class C assurance remain open. Closeness is not risk.