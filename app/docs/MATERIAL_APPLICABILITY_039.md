# Material applicability architecture - 0.3.9

## Purpose and dataset boundaries

Original third-party sources remain in Veri_Seti/Third_Party. The new additive Veri_Seti/Material_Sensitivity directory holds MANIFEST.json, profiles.json, PROVENANCE.json, SOURCE_POINTS.csv, COVERAGE.csv, quarantined-profiles.json and README.md. NASA DATASET.json, core file/metadata indexes and previous Third_Party manifests are unchanged. The optional folder is detected beside the fixed dataset when the application starts; restart after installing or changing it. For sharing, retain Material_Sensitivity AND the referenced originals under Third_Party/sources; the application ZIP does not embed the large dataset. Missing or invalid supplementary files never disable PSI research.

## Pipeline

1. Original source bytes, instrument summaries, specimen metadata and methods are reviewed locally by the dataset worker.
2. The source-specific adapter transcribes reported conductivity, converts only Celsius +273.15 to K and preserves separate cycles/replicates. Derivatives are candidates for applicability reasoning, not calibration.
3. material-support-store validates explicit role/schema, a MAT namespace, property units, identity status, bounded points, index hash and confined original instrument, specimen-metadata and method file paths/bytes/SHA256. Cross-family identity conflicts are excluded.
4. material-applicability selects only matching material-family profiles, keeps grade/conditioning limitations and marks specimen temperature as distinct from ambient. It computes no tolerance, interpolation, weights, probability or numeric score.
5. Gemini receives a separate materialApplicability channel, at most4 profile summaries and12000 characters. The channel has no PSI source/evidence IDs. Original PSI evidence IDs and validation remain unchanged. Research candidates, normalized rows, parameter proximity and scenario weights are unchanged. Numerical noninterference is regression-tested.
6. The source card exposes a separate third-party applicability subsection with measured value tables, exact source identity, uncertainty and limitations. It cannot create another research card. A read-only /api/material-support query exposes the same bounded context independently. Settings shows installed/missing status.
7. The sidecar/source identity is included in the model cache key; a changed support index cannot reuse a prior result. No new real Gemini trial or external retrieval occurred.

## Current cohort and exceptions

11 active conductivity profiles /66 summary points/7 material families;22 of29 coverage rows pending. PP/PVC conflict:1 candidate/6 points quarantined. Nylon-family identification remains grade-unverified; PMMA board-versus-instrument thickness and cotton top-sheet/fitted-sheet construction remain unresolved. Dry and Unconditioned are distinct; Wet filenames do not prove saturation. Repeated cycles are not independent specimens. Unknown point uncertainty stays unknown; method repeatability is not used as an uncertainty bar or tolerance. Volumetric Cp is not converted to mass-specific Cp without a verified density and phase basis.

## Extension contract

New adapters must retain property name, phase, independent-variable meaning, units, exact specimen, source location, original file identity, uncertainty and review status. The current v1 adapter supports conductivity and a structurally defined mass-specific Cp property only; the current real cohort contains conductivity only. Pressure/gas/storage/combustion-response axes need a separately reviewed schema/adapter. A future tolerance model requires an explicitly defined outcome, supporting measurements, applicability domain, uncertainty, validation and versioned approval before score adjustment can be enabled; no such approval is present. Dataset metadata cannot enable adjustments in v1.

## Traceability and verification

FIF-049 links requirements, code,14 new tests, dataset worker verification, controlled browser evidence and the exact portable executable. All release reports, source changes, code/block index and receipts are in Developer Patch inside the version ZIP. No private key/history or large original dataset is included. NPR7150.2D Class C remains open and is not certified.
