# Graph generator and reader — 0.3.0

FIF-039 implements source-faithful graph access. Open BASS-II > Open report or Data / conditions > Graph reader. The first registry contains three reviewed figures, not every graph in the corpus.

## Evidence contract

The registry is keyed to the exact BASS-II Summary Report SHA-256 `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`. The local file is the previously recovered NTRS report. Identity with an inaccessible PSI original is not asserted. Original dataset files remain read-only.

| Figure | PDF / printed page | Reproduction |
|---|---|---|
| 6.10 | 84 / 76 | Three printed empirical fits; logarithmic stretch axis; original crop |
| 6.9 | 83 / 75 | Same fits; linear stretch axis; original crop |
| 6.7 | 82 / 74 | Original time-history crop only; no verified raw event table |

The boundary is `X_O2 = 6 exp(-0.5 a) + 0.0167 a + 13.4`. The quenching and blowoff components are respectively `6 exp(-0.5 a) + 13.4` and `0.0167 a + 13.4`. The x-axis is normalized stretch in inverse seconds, `a = (3/2)(U/r) sqrt(r/r0)`, with U in cm/s, r in cm and r0 = 0.318 cm. The y-axis is final oxygen volume percent, not pressure or temperature. The displayed window is 1–150 inverse seconds and 13–19% oxygen, a subset of the original axes.

Calculated coordinates reproduce the printed rounded coefficients; they are not measured data or measured precision. The original experimental markers, error bars and complementary drop-tower regression are deliberately not regenerated. Their complete point/event/calibration mapping remains open (G029-01). The original view preserves these elements.

## Reader and exports

- Move or click on a plotted curve area, or type the stretch value, to evaluate the equation directly. It does not interpolate the screen pixels or sampled CSV.
- Four displayed decimals indicate calculation digits only. A value outside the reviewed window is rejected without changing the last valid readout.
- Colored curve visibility controls change presentation only. Curve minimum evaluates the derivative solution; no new scientific fit is performed.
- CSV contains 301 calculated rows, units, source hash, figure/page, equation and an explicit NOT measured-points label. Log and linear plots sample their own x-axis spacing.
- Original graph mode renders only the reviewed graph object bounding box with one-point padding. The caption is separate; full report pages remain available in a collapsed reader and through a source link.
- PNG export captures the original crop including axes, legend and uncertainty marks. Zoom and panning affect display size; no data are digitized from pixels.

## Source crop verification

`qa/release-0.3.0/verify-figure-source.py` checks the actual PDF SHA, embedded image-object boxes, caption location and neighboring image exclusion. The crops are tied to PDF object positions, not a filename or guessed page position. `figure-source-verification.json` records the source geometry. All three downloaded PNGs were visually checked against source figures: axes and legends are retained, page text/captions and neighboring photo panels are excluded. Rendering to PNG reproduces the original visual, not the embedded JPEG's byte encoding.

## Code boundaries

`public/figure-models.mjs` contains pure math, source registry, axes, crop validation and CSV. `lib/pmma-boundary.mjs` uses the same boundary implementation; this factors existing coefficients without changing results or applicability rules. `public/figure-reader.mjs` owns view events, SVG/canvas rendering and downloads. `public/source-library.mjs` owns the PDF document lifecycle and exposes the graph shortcut in report and data tabs. Server allowlist, SEA assets and portable verification include both new modules.

To add a figure: verify its file hash; inspect axes, units, captions, series and source tables/equations; register reviewed crop coordinates; enable calculated mode only after a full applicable series mapping is proven; add independent expected values/point checks and visual source comparison. Unreviewed PDFs keep the existing full-document viewer. There is no automatic graph discovery, arbitrary-image curve digitization or silent model-generated data.

## Verification and limits

189 automated tests cover the application, including five new numerical/source/export tests. Browser QA uses the real local source PDF and analyzer with explicitly labelled mocked provider responses; no live Gemini call occurs. Final portable verification checks exact embedded modules with an empty PATH. Final ZIP records hold all executed evidence, source snapshots and code indexes. Scientific applicability, complete measured-point reconstruction and formal NPR Class C assurance remain open.
