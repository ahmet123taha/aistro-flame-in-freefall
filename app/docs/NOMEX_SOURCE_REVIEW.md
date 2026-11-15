# Nomex observations and calibration scope — 0.1.9

## Evidence

BASS-II Summary Report, NASA/TM-20210011385, PDF54 / printed46, Section3.1.1; PDF113 / printed105, TableA.2. Both pages were visually reviewed. Local NTRS copy `f24951`, SHA-256 `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`.

CSV `f24946`, SHA-256 `71e792bf6b5fb5ea620c5dd70fbbac05515992e12aefcf5dff47312caa48c042`, rows24–26. Run/specimen IDs F1/227, F2/228m, F3/229m and initial O2/CO2 match across sources. F3 final O2 is `none` in CSV; the PDF cell says `0.9`, but its observation says no post-trial sensor readings were taken. `0.9` is not treated as a valid measurement; the disputed printed value remains in the explanation.

## Boundary between observation and material classification

The summary says three specimens did not ignite; the detailed log reports brief ignition/flashes for F1/F3 and unsustained flame for F2. The shared narrow conclusion is no sustained flame in these three tests. F1 also reports no spread and extinction while the igniter was operating. No absent spread information or igniter-off time is invented for F2/F3. No zero flame speed, zero flammability or ignition probability is calculated.

Product name: Nomex III natural; this record lacks fiber proportions, coating, thickness, width, areal density, igniter power and exposure duration. Product-identity selection accesses the named specimen; it is not certified equivalence. Nomex family alone cannot establish an overall closeness percentage.

## Numerical inputs

Calibrated initial O2 [% volume]: 22.2 / 21 / 21.7. Initial CO2 [% volume]: 0.46 / 0.37 / 0.36. These are trial-start values, not simultaneous event readings. Final O2: F1 22.2, F2 21, F3 unknown. Initial CO is a separate observation, not automatically a weighted input. Temperature, thickness, pressure, numerical microgravity and specimen velocity are not invented.

## Calibration correction (high severity)

`f24948`, SHA-256 `bc0dca3efdef44a7774d8dd37aebc0cedae8d67d7bae8c9cbde9590014a3c983`; Fan Calibration data A33: U=1.0066 AIR. A34: SPICE, 56 mm downstream, 36 mm from bottom (centerline). The workbook has columns by date and restrictor count. Formula/location were reread from actual XML cells.

Version0.1.8 and earlier treated file-hash verification as applicability to specimen velocity, although specimen position/flow geometry equality was not verified in the table. Version0.1.9 preserves the centerline calculation as instrument information, excluding it from `values.airflow` and scoring. This affects 24 real-data estimates. AIR and FAN are not interconverted; no interpolation by time or restrictor count. Future independently verified specimen positioning requires a separate source-grounded adapter.

## Two documents for one trial

Only three pairs with verified hash, run/specimen IDs, product name and shared numerical values are linked. All six source records remain; matching shows three physical candidates. The detailed-observation PDF is primary; CSV links/values remain separate. Values are not merged and the higher-scoring document is not cherry-picked. This does not resolve all dataset duplicates. A source mismatch prevents linking.

## Verification

FIF-027; `tests/nomex-evidence.test.mjs`, updated calibration test, `scripts/verify-nomex-dataset.mjs`, `scripts/verify-numeric-dataset.mjs`. Verify actual hashes, context rereading, product identity, unknown measurements, same-trial linking and HTML observations. Scientific flammability prediction, independent validation and critical classification remain open. No live model call.