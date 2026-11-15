# Rubric recovery - 0.3.2 to 0.3.3

Observed: HTTP 200, two source assessments, one recommendation, then RESEARCH_RUBRIC_REASON. The original rejected answer is unavailable, so the precise failing dimension is unknown.

## D033-01 / HIGH - Scoring instructions and validation disagreed

Cause: The prompt required reasons only for intermediate scores and used an ambiguous rubricReasons placeholder; the validator required nonempty explanations for every dimension, including zero and anchor scores.

Correction: List all eight explanation keys explicitly and require 1-600 characters for every dimension. Keep the existing numeric rubric values and 60/40 scoring policy.

Code: lib/research.mjs.

Evidence: tests/rubric-recovery.test.mjs, qa/release-0.3.3/test-results.log, qa/release-0.3.3/browser-review.json, qa/release-0.3.3/portable-verification.json.

## D033-02 / HIGH - One missing scoring explanation discarded the entire reply

Cause: RESEARCH_RUBRIC_REASON threw from inside the per-source loop, losing the conversation and otherwise valid peers after a successful provider response.

Correction: After mandatory source and numeric validation, quarantine only assessments with unexplained positive scores into an unscored list. Preserve source links, verified quotes, dialogue and valid peer scores. Zero-point missing reasons receive an administrative note without changing a number or inventing a scientific rationale.

Code: lib/rubric-review.mjs, lib/research.mjs, lib/research-scoring.mjs, public/environment-panel.mjs.

Evidence: tests/rubric-recovery.test.mjs, qa/release-0.3.3/test-results.log, qa/release-0.3.3/browser-review.json, qa/release-0.3.3/portable-verification.json.

## D033-03 / MEDIUM - Partial scoring needs honest state and durable diagnostic boundaries

Cause: The previous pipeline exposed only all-passed or all-rejected and logged the collection field, without the affected source or dimension. Revalidating sanitized partial responses from cache could lose the scoring warning.

Correction: Return partial validation receipts and per-source/per-dimension bounded diagnostics. Display the scoring limitation in chat and source cards. Preserve stale recommendation state during partial reviews. Do not cache recovered assessments; normal complete replies keep caching. Persist partial responses in chat history.

Code: lib/gemini.mjs, public/conversation-panel.mjs, lib/research.mjs.

Evidence: tests/rubric-recovery.test.mjs, qa/release-0.3.3/test-results.log, qa/release-0.3.3/browser-review.json, qa/release-0.3.3/portable-verification.json.

## Limits

- The original rejected raw answer was not retained. The precise missing/empty/invalid/overlong dimension cannot be reconstructed; code inspection proves the prompt/validator mismatch and whole-response failure behavior.
- No live provider call is authorized for this patch yet. The previous 0.3.2 live test covered only a language request; it is not evidence for this scientific scenario.
- A valid quote and explanation establish traceability, not scientific correctness. Unscored sources receive no numerical total and are not inserted into the sorted scored list.
- Partial scoring keeps previous recommendations unchanged/stale pending a complete review. Other invalid source references, quotes, rubric values, duplicate sources or envelope fields still reject the response; this is a bounded correction, not universal recovery.
- No dataset, formula, weights, private API key or private transcript was changed. Node SEA remains the runtime; NPR 7150.2D Class C remains an incomplete engineering target, not certification.
