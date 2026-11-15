# Dynamic viewer and plotted graphics - 0.3.5 to 0.3.6

## D036-01 / MEDIUM - Replacing a long preview collapsed the scrollable document

Cause: Removing a long table/PDF preview for a short status or native-format message changed document height and allowed the browser to clamp the outer scroll. File lookup and preview also shared one invalidation counter.

Correction: Keep stable independent list and preview panes, a non-collapsing status line and persistent controls. Replace only preview content, preserve pane position where possible, and separate list/preview generations. Ignore stale PDF errors.

Code: public/source-library.mjs, public/styles.css.

## D036-02 / LOW - Reviewed interactive plots were difficult to find among files

Cause: The file-kind filter had only tables, PDFs and images; reviewed regeneratable figures were hidden inside a report and not selectable as separate entries.

Correction: Add Plotted graphics with one entry per reviewed reproducible figure, keyed by exact source hash. Exclude original-only images and unreviewed spreadsheets. Reuse the loaded PDF when switching its reviewed figures.

Code: lib/file-library.mjs, public/source-library.mjs, public/figure-reader.mjs.

## D036-03 / MEDIUM - Graph reading lacked a direct series-specific hover tooltip

Cause: Pointer movement updated the equation table/readout, but the chart did not identify the nearest visible curve at the pointer with a local tooltip.

Correction: Evaluate the reviewed equation at pointer x, hit-test only visible in-window curves, and show series, x, y and calculation provenance. Keep original-only graphs nonnumerical; four decimals are calculation digits, not measurement accuracy.

Code: public/figure-models.mjs, public/figure-reader.mjs, public/styles.css.

## Limits

- No XLSX parser was added; workbook files retain the native-application explanation. CSV/TSV and supported source documents remain inline.
- Only the two previously reviewed BASS equation figures are currently plotted entries; the original-only graph is excluded and no arbitrary plot is digitized.
- Source curves use published rounded coefficients; hover decimals do not imply measurement precision or a fire-risk prediction.
- Preview-internal scrolling can only be retained up to the new content extent. The outer document and file controls remain stable.
- Browser uses the actual application/catalog and two TEST ONLY provider fixtures, not a live Gemini call. Clean second-machine and signing/SmartScreen verification remain open.
- The independent Astra/High third-party collection has its own manifest and is not automatically used as validated production model evidence. NASA core is preserved; NPR Class C remains an incomplete engineering target.
