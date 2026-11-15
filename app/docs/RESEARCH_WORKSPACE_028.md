# Research workspace 0.2.8

Transition: 0.2.7 -> 0.2.8. Requirement: FIF-037. Engineering target: NPR 7150.2D Class C, still partial and not certified. This release does not change the fixed dataset or authorize emergency response.

## Why the behavior changed

The previous workspace hid the total when any entered parameter lacked a normalized source measurement. The user also reported text remaining in the composer, repeated environment recaps, shallow follow-up questions, empty report sections, filename-only table references and recommendations that did not follow the conversation.

## Numerical relevance - high-impact analytical change

Only finite measurements explicitly entered by the user participate: gravity, temperature, oxygen concentration, pressure, gas velocity and thickness. A blank field is excluded, including its weight. Explicit zero is not blank. With N entered fields each receives 60/N available points. For a comparable nonnegative pair x and y, closeness is min(x,y)/max(x,y); two zeroes have closeness 1. Points are weight times closeness. Units must already be normalized.

The engine selects one real normalized trial belonging to the assessed source and the same canonical material. It never combines favorable values from different trials or treats an unspecified material as a measured match. Missing measurements in the source receive zero evidence points, with an explicit coverage count and unscored budget. This is lack of evidence, not proof of a physical mismatch. Source-missing weights are not redistributed: doing so could let a single known field masquerade as full support.

The displayed total is earned numerical points plus scenario relevance points. It is not an estimate of fire probability, a safety boundary, or complete physical similarity. With no numerical inputs, the display uses the available 40-point scenario budget, not a fictitious 100-point numeric comparison. Unknown source values remain unknown in the detailed comparison, but the Conditions score itself is numeric. There is no red/green safety claim.

Regression example: user gravity 3.9 versus source 4 and temperature 300 versus source 300, pressure blank. Each entered field has 30 points: 29.25 + 30 = 59.25/60. A scenario score of 32.5/40 produces 91.75/100, displayed as 91.8. This example is a test fixture, not a real experiment. A separate real-table browser test yielded 11.1/60 because only two of four entered fields had comparable source measurements; the other 30 points remained explicitly unsupported.

The ratio metric is simple and provisional. In particular, zero versus a nonzero value scores zero, even near zero; there is no experimentally validated tolerance or measurement-uncertainty calibration here. Do not interpret the numerical score as a predictive model. Older specialist comparison methods retain their own eligibility gates.

## Continuous scenario assessment

Eight dimensions sum to 40: objective 6, material 8, geometry 5, storage 5, atmosphere 5, gravity 4, flow 4 and mechanism 3. Gemini supplies a 0..1 value and a source-specific reason for each. The server calculates points and validates source IDs, evidence IDs and exact local quotations. Unknown source detail must not be assumed a match. The prompt allows intermediate values with reasons instead of coarse five-point steps. Decimal precision expresses an editorial retrieval assessment, not scientific certainty. Legacy four-dimension responses remain readable for compatibility; the new prompt requests all eight dimensions. Changing these weights is an analytical change requiring review and regression checks.

## Conversation and recommendations

Both chat paths store the submitted user turn, clear the composer immediately, and leave a draft typed while the response is pending untouched. Ctrl+Enter adds a newline. Failed requests remain in visible conversation history rather than being silently discarded.

Server instructions ask Gemini to answer the newest question directly, avoid recurring form/scenario recaps, accept unknown answers, and ask at most two groups of related details. Geometry, approximate dimensions, storage/stacking, spacing, container and orientation are requested together when needed. Evidence gaps contain a topic, missing details, why they matter and how to describe them. These prompt changes influence model behavior; local fixture tests do not prove live semantic quality.

The Fire safety recommendations panel receives a keep/replace/clear update with every supported dialogue response. A replacement is a complete set, not an uncontrolled append. Each item requires a selected local source, a resolvable exact evidence reference, review priority and a limitation. Invalid recommendation citations are rejected while preserving previous valid candidates; invalid scientific assessments still fail validation. Only bounded descriptions of previous recommendations enter model context. They are context, never evidence.

Recommendations persist with the conversation. Form edits mark existing candidates as awaiting review. A valid unchanged reply keeps them; explicit validated replacement or clearing updates the sidebar. Candidates are source-supported research/design inferences, not certified fire-response procedures. Active-fire instructions retain the applicable crew/site protocol boundary.

## Actual local documents

Report and Data/conditions tabs contain a source-specific file library with type filters, text search and paging. Report tabs automatically open the preferred local PDF; Data tabs prioritize available CSV/TSV, then suitable text. The source's normalized trial identifier is shown when it was used for ranking. Objectives, approach, hypotheses, reported findings and provenance remain. Empty web-text and local-excerpt placeholder panels have been removed.

PDF.js 6.5.438 is vendored with pinned file hashes and license records in pdfjs-vendor.json. PDFs render as actual pages with page selection and zoom; charts remain original document graphics. The current page's text is extracted for display. A scanned page without extractable text says so and remains viewable; no OCR or graph digitization is claimed. Hash-specific BASS-II figure shortcuts point to pages 83 and 84 only for the verified report. Other PDFs use ordinary page navigation.

CSV/TSV previews show escaped cell data, preserving quoted delimiters, multiline cells and literal inch quotes. They are bounded to 128 KiB and 200 rows and are not a new scientific normalization pipeline. The full original remains available to open/download. Common image formats can be viewed as figures. XLSX, TIFF, EPS and other unsupported inline formats remain original-file downloads; the UI explains that limit. No dataset files are rewritten. Only registered, source-linked files are accessible, with existing path and hash checks.

Local PDF page extraction is for the user's reader. This release does not automatically send every PDF/table to Gemini or turn every source document into normalized numerical evidence. The existing bounded AI context and explicitly normalized trial tables still define analysis coverage.

## Code responsibilities

- lib/research-scoring.mjs: entered-only budget, continuous rubric, trial selection, coverage and final points.
- lib/research.mjs: server/output prompts, response contract, scientific validation.
- lib/recommendations.mjs and lib/research-evidence.mjs: bounded recommendation context and source validation.
- lib/gemini.mjs and lib/conversations.mjs: provider flow and conversation persistence.
- lib/file-library.mjs and lib/dataset.mjs: source-specific file listing and authorized file access.
- public/environment-panel.mjs and public/app.js: chat send lifecycle, ranking cards and source tabs.
- public/recommendations-panel.mjs: recommendation state, persistence restore and sidebar rendering.
- public/source-library.mjs and public/table-preview.mjs: PDF, chart, text and cell previews.
- scripts/vendor-pdf.mjs, lib/pdf-assets.mjs and packaging scripts: pinned offline reader assets and exact portable verification.

The release Code_Index maps every first-party file/function/block/loop to source hashes and lines. Vendor code is identified by pinned version and hashes rather than pretending it received an application-level semantic review.

## Verification and open boundaries

182 automated tests passed. Changed screens were exercised in the in-app browser using the actual application analyzer with explicitly labelled controlled provider responses. Real local BASS-II data and its 144-page PDF were used; the original chart on page 84 rendered. Blank-pressure exclusion, fractional scores, immediate composer clearing, preservation of the next draft, history reload, keep/clear recommendation updates and real CSV cells were observed. No real Gemini request was made.

The final portable verification must pass against the exact delivered executable hash. Release evidence includes the automated log, browser observations/screenshots, source inventory, code index, pinned dependencies, portable results and ZIP member hashes. The developer report stays inside the release ZIP next to the application directory.

Open: live-model answer quality and repeat-question behavior; scientific validation of scenario weights and closeness tolerances; completeness of normalized source measurements; OCR and spreadsheet/graph interpretation; second-machine execution and independent review; full Class C assurance evidence. The dataset remains unchanged. No claim of NASA certification or scientific fire prediction is made.
