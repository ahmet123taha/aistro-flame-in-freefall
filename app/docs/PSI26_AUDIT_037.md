# PSI-26 source coverage and score presentation - 0.3.7

## D037-01 / HIGH - PSI-26 as-run condition workbook was absent from the numerical index

Cause: The CSV adapter treated a sample/run inventory as an unsupported numerical table. It contains 122 inventory entries but no gravity, temperature, pressure or oxygen columns. The separate as-run workbook was not consumed.

Change: Add 121 row-specific pressure entries from the exact hash-pinned as run matrix sheet. Preserve file/sheet/cell/run/test/sample provenance and convert atm to kPa. Recompute all 67 pressure formula caches. Mark the CSV as an inventory rather than rejected measurements.

Status: resolved_for_reviewed_pressure_columns. Code: lib/bass-asrun.mjs, lib/bass-asrun-data.mjs, scripts/extract-bass-asrun.py, lib/dataset.mjs, lib/experiment-tables.mjs.

## D037-02 / MEDIUM - Incomplete evidence looked like a low complete similarity score

Cause: A scenario-only subtotal such as 33.3 was displayed out of 100 even when all 60 condition points were unassessed. The detailed contribution list also displayed missing values as zero earned points.

Change: Show earned evidence points over the assessed budget, explicitly mark the overall comparison incomplete, exclude unassessed points from the displayed denominator and label missing contributions unassessed. Do not renormalize these points into a full percentage or change ranking weights.

Status: resolved_in_regression. Code: lib/research-scoring.mjs, public/environment-panel.mjs.

## D037-03 / LOW - Patch authoring introduced duplicate CR line endings in the UI module

Cause: A text rewrite during this patch preserved CRLF bytes and added a second CR. The browser still parsed the module, but AST line numbers disagreed with the code-index line count. Package verification rejected the first candidate before distribution.

Change: Normalize the affected module to LF, rerun all 272 tests, rebuild and reverify the exact EXE, then regenerate and validate the source/block index. No scientific coefficients or UI behavior changed.

Status: resolved_before_distribution. Code: public/environment-panel.mjs.

## G037-01 / HIGH - Source oxygen units and missing numerical gravity remain unresolved

Cause: The as-run worksheet oxygen header says percent by volume, while values such as 0.221 use a plain 0.000 display format. No numerical gravity or ambient temperature column exists there; AIR is an instrument display, often staged.

Change: Retain raw oxygen and AIR values without scoring or automatic scaling. Expose these limits in the source details and research context. Never manufacture numeric zero-g or 0.16 m/s2 from the ISS setting. Resolve units or acquire independent source evidence before enabling more fields.

Status: open_source_semantics_and_coverage. Code: lib/bass-asrun.mjs, lib/research-coverage.mjs.

## Limits

- The user confirmed the input unit m/s2 but later said the source 0.16 value may have been read incorrectly. No numerical PSI-26 gravity was verified.
- Pressure proximity is ordinary scalar closeness; it is not a calibrated combustion-transfer model. The 60/40 editorial budget and evidence-point ordering are unchanged.
- Only as run matrix is indexed. The duplicate year sheets and planned workbook are not independent observations.
- Oxygen scale remains open. No automatic fraction-to-percent inference, AIR-to-velocity conversion, trial merging or burn-outcome prediction was added.
- No live Gemini request, key access, private history export or NASA dataset mutation was made. NPR Class C is an incomplete engineering target, not certification.
