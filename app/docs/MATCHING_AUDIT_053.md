# AISTRO 0.5.3 — Matching audit and corrective design

## Scope and evidence

This release investigates the user-reported discrepancy between entered conditions, source selection and displayed scores. The baseline is the sealed 0.5.2 portable source and the running AWS 0.5.2 modules. Before/after executable probes, regression tests and a read-only audit of the deployed scientific dataset are preserved in Developer Patch/Verification. No dataset file, model choice, secret or user conversation is changed. No paid AI request or local application execution was performed.

## Input and ranking pipeline

1. Read only the latest actual user turn. Explicitly attributed/quoted reports do not become user measurements. Merely requesting a study is not source attribution.
2. Normalize explicit units: temperature to K, gravity to m/s2 using 9.80665 for g, pressure to kPa, velocity to cm/s, thickness to mm. Zero remains valid where physically supported by the input contract. No unitless default, air composition or qualitative microgravity acceleration is invented.
3. Associate percentages with the nearest gas label and lengths with thickness rather than width. Do not interpret an explicitly labelled flame/specimen temperature as ambient temperature. Preserve mixed-material qualifiers. Ranges, alternatives and ambiguous values remain unfilled.
4. Apply explicit corrections/unknown clearing before the same provider request and numerical ranking. Receipt quotes, conversion and user/estimate basis remain available. Provider failure does not undo explicit user input.
5. Shortlist indexed same-material candidates using available numerical support before lexical tie breakers. Preserve content-retrieval slots for findings beyond titles and related composites for review. A missing measurement does not remove a useful article from literature discovery.
6. Compare each entered numerical parameter against supported values/spans. Blank user parameters are excluded from the 60-point budget. If n numerical fields are entered, each receives 60/n potential points. Missing source support earns no points but is marked unassessed; it is not a measured mismatch.
7. Point proximity remains 100 * min(input, reference) / max(input, reference); exact zero pairs receive 100 and a zero/nonzero pair 0 under the existing rule. Reported marginal spans receive discovery-coverage credit inside their span, not interpolation or an inferred joint experiment. These heuristics have not been calibrated as physical tolerances.
8. When material is supplied, only the existing same-family gate is credited. When absent, choose one identified source family per article by total supported proximity, coverage then stable name. Never combine different or unidentified materials into a synthetic perfect source. Separate rows of that family remain parameter-wise evidence, not an experimental tuple.
9. Add scenario relevance up to 40 points only when available through the validated analysis path. Total points, assessed denominator and input coverage lead the card; conditional parameter proximity is secondary. Third-party material profiles remain applicability context, not substitute PSI measurements.

## Limitations and honest gaps

The audit exercises all 24 PSI records currently in the running catalogue. Sixteen have a reviewed numeric case: exact source inputs and a 1 percent perturbation are checked, including shortlist inclusion and diagnostic agreement. Four further records have material-only evidence and four lack reviewed numeric/material evidence for this harness. It would be false to label all 24 as successful numeric predictions. The harness is deterministic and does not establish the final ranking from every possible live model answer.

The supplied-value min/max ratio is still not a thermodynamic equivalence law. A 1 percent perturbation is an arithmetic regression case, not an experimental validation of equal burning. Large temperature differences can be materially irrelevant in one regime and critical in another. No new universal tolerance, fire probability, safety threshold or manufacturer-to-PSI transfer was invented.

Source family matching does not verify exact grade, resin, moisture or geometry. Unknown mixed materials should stay unknown or literal. Nominal gravity labels are not residual-gravity measurements. Ambiguous natural language still requires confirmation; the extractor is bounded, not a general physical parser. Missing index coverage remains visible with source references.

## Verification and release identity

The first isolated test pass exposed an old test requiring explicit unknown values to preserve stale inputs. That test was revised to the intended clearing behavior. A second pass exposed an arithmetic-only fixture with its source material accidentally omitted; the fixture now explicitly identifies SIBAL without changing the expected 57/60 arithmetic. A separate regression asserts unidentified source material remains unassessed. Both failing logs are retained. Browser readback then found a stale header version label; title/header now track 0.5.3 and a cross-file identity regression was added. The existing Safety test had hardcoded 0.5.2, so it now checks the exported current version. That intermediate failure is also retained. Final counts and actual deployment/browser/package evidence are stored as separate receipts, not inferred from this design document. Linux mocks do not certify the Windows executable. No remote paid model or microphone trial was performed.

The delivery includes current and previous sources, per-file hashes, unified changes, a symbol/block navigation index, English defects/severity, requirement traceability and the NPR matrix. NPR 7150.2D Class C remains an incomplete engineering target, not certification. Historical documents retain their original version identities. Source, hosted runtime, executable build and public release are checked against the same 0.5.3 baseline; scientific data remain independently versioned.
