# BASS-II Figure 6.10: numeric replot feasibility

Review date: 15 November 2026. Release: 0.2.9. Read-only review; no dataset changes.

## Answer and scope

The empirical boundary can be replotted directly from the published equation. Its exact calculated coordinates can be read without estimating pixels. This is a fitted boundary, not a new experimental measurement or a general fire-probability model.

The individual measured points cannot yet all be reconstructed from a verified, one-row-per-point source table. A relevant Excel test matrix and CSV exist, but they contain run histories, multiple flow settings and pre/post sensor measurements. They are not a complete normalized table of the figure's final event coordinates and uncertainty bars. Repeated tests must not be mistaken for independent plotted points.

## Verified report

- Source: NASA/TM-20210011385, BASS-II Summary Report; official record https://ntrs.nasa.gov/citations/20210011385
- Local relative path: `PSI/PSI-25/Raporlar/Rapor_ve_Makaleler/6924805f7f6aa6a83021067c__PSI-25_Reports_BASS-II Summary Report.pdf`
- SHA-256: `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`
- 144 PDF pages. PDF page 83 / printed page 75 contains Equation 6.1 and Figure 6.9. PDF page 84 / printed page 76 contains Figure 6.10, using the same points on a logarithmic horizontal axis. Both full pages were rendered and inspected.
- The locally available report is the previously recovered NTRS report copy. This review does not assert byte identity with an inaccessible original PSI download.

## Axes and equation

Horizontal: normalized forced-flow stretch `a = (3/2) (U/r) sqrt(r/r0)`, in inverse seconds; `U` is free-stream velocity in cm/s, `r` is rod radius in cm, `r0 = 0.318 cm`.

Vertical: final oxygen concentration in volume percent. This is not a pressure-temperature plot.

Combined empirical boundary: `X_O2 = 6 exp(-0.5 a) + 0.0167 a + 13.4`.

At `a = 10 /s`, the equation gives about `13.6074%` oxygen. The decimal is a calculation from the rounded published coefficients, not experimental accuracy. The existing `lib/pmma-boundary.mjs` already implements this relation with source and applicability checks; this release does not change that model or add measured points.

Figure series include ISS stable flames, ISS quenching and blowoff, and complementary drop-tower results. Report text explains that pre/post-burn oxygen and observed event flow matter; error bars account for oxygen and flow uncertainty.

## Available numerical documents

`PSI/PSI-25/Data/Incelenecek/ffa38469f94b8387609e__PSI-25_Science Documents_BASS-II_Test.Matrices.xlsx`

SHA-256: `1a3b283dd0adec861793bbc4a454aab64d398cd32d6f37d7a1ad0f642879e686`.

The Olson sheet has 28 populated rows including the header and 16 columns. Rows 2–28 include repeat/retest records. Columns C/E identify tests/materials, G/H record multiple fan/air indications, and K/L record calibrated initial/final oxygen. For example, O17 on row 23 has several fan settings and calibrated oxygen 15.1 -> 14.3. It is not a single (flow, oxygen) boundary coordinate. Appendix Table A.5 supplies additional comments about stable flames, flow changes and extinction/blowoff events; for O17 it describes blowoff and subsequent loss of the flame during decreasing flow.

`PSI/PSI-25/Data/Incelenecek/d67804d816f7429c7fc3__PSI-25_Experimental table_BASS-II.csv` contains a header plus 129 records. It likewise is a test matrix, not a verified complete Figure 6.10 point table.

`PSI/PSI-25/Data/Kalibrasyon/ce105c7603ab1cd418fd__PSI-25_Reference Data_Fan calibration data.xlsx` provides calibration material. Fan indication, air display and calibrated free-stream velocity are different quantities; a matching calibration and event setting must be established before calculating `a`.

## Work needed for a faithful measured-data replot

1. Build a row per actual stable/quench/blowoff event, with run/retest and event identification.
2. Resolve rod diameter, calibrated event flow and the applicable final oxygen reading from the test log and calibration.
3. Keep ISS and ground/drop-tower series separate; establish sources for all complementary ground points.
4. Carry measurement uncertainty and original page/sheet/cell provenance, and calculate `a` with documented units.
5. Compare reconstructed point counts, series, coordinates and uncertainty bars with the original figure before claiming reproduction.

If some original coordinates cannot be recovered, image digitization can produce explicitly approximate points with digitization uncertainty. It cannot make original measurements exact. No such digitization was performed here.

Evidence: `qa/release-0.2.9/inspect-figure.py`, `figure-sources.json` and the two rendered report pages, copied into this release's Developer Patch. Workbooks were opened read-only and were not saved or recalculated.
