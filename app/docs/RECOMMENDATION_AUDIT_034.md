# Recommendation recovery - 0.3.3 to 0.3.4

Observed: HTTP 200, stage rank, two source assessments, keep plus two recommendation items. The local validator rejected the whole reply with ANALYSIS_INVALID. The saved shape establishes the conflict; the rejected raw recommendation text is unavailable.

## D034-01 / HIGH - Conflicting recommendation operations discarded the entire research reply

Cause: The saved HTTP 200 receipt records stage=rank, two assessments and keep with two recommendation items. The old validator threw ANALYSIS_INVALID for this contradictory optional update, losing the whole reply. The prompt did not explicitly spell out the empty-list requirement for keep and clear.

Correction: Use one shared explicit keep/clear/replace contract in both prompt modes. Contain malformed or conflicting recommendation updates as a non-applied partial update. Preserve valid conversation, source assessments and numerical scores without inferring the intended operation.

Code: lib/recommendations.mjs, lib/research.mjs, lib/gemini.mjs.

Evidence: tests/recommendation-recovery.test.mjs, qa/release-0.3.4/observed-failure.json, qa/release-0.3.4/test-results.log, qa/release-0.3.4/browser-review.json, qa/release-0.3.4/portable-verification.json.

## D034-02 / HIGH - Optional recommendation recovery must not erase or falsely reconfirm previous advice

Cause: Simply dropping invalid items or coercing keep/clear into replace could discard earlier candidates or apply unsupported content. The research validator previously marked every ranking reply as recommendationsReviewed even if no optional update was supplied. A normalized absent section could become a false completed review on cache revalidation.

Correction: Keep replacements atomic: if any item fails its source/quote/content checks, apply none of that update. Keep earlier recommendation and emergency state, with the UI retaining stale status after changed context. Compute review flags on the server; preserve omission as omission across cache validation. Non-ranking turns cannot refresh recommendations.

Code: lib/recommendations.mjs, lib/research.mjs.

Evidence: tests/recommendation-recovery.test.mjs, qa/release-0.3.4/observed-failure.json, qa/release-0.3.4/test-results.log, qa/release-0.3.4/browser-review.json, qa/release-0.3.4/portable-verification.json.

## D034-03 / MEDIUM - Partial recommendation validation lacked a visible and durable boundary

Cause: The prior pipeline exposed the failure as a rejected answer and had no isolated recommendation warning. Caching a sanitized recovery could later turn its keep operation into an apparently complete review.

Correction: Show a Recommendation update not applied notice, mark the receipt partial, retain bounded action/count/issue diagnostics in the receipt and history, and exclude recovered replies from the answer cache. Normal complete answers retain caching; no automatic retry is added.

Code: lib/gemini.mjs, public/conversation-panel.mjs.

Evidence: tests/recommendation-recovery.test.mjs, qa/release-0.3.4/observed-failure.json, qa/release-0.3.4/test-results.log, qa/release-0.3.4/browser-review.json, qa/release-0.3.4/portable-verification.json.

## Limits

- The rejected raw response was not retained. The saved response shape proves keep plus two items, but the items and their scientific support cannot be reconstructed. Controlled fixtures reproduce this operation conflict, not the unseen exact response.
- No live Gemini request was made for this release. The prior 0.3.2 language-only trial is not evidence for this research correction. Fresh live research validation and independent semantic review remain open.
- Mandatory research envelope, source, citation, duplicate-source and numeric-rubric checks still reject invalid research. Partial recovery does not invent scores, repair scientific claims or convert keep/clear to replace.
- Source-supported candidates remain research/design aids, not validated emergency instructions. A verified quotation is not proof of a recommendation's semantic correctness.
- No dataset, physical equation, score weight, model or private credential was changed. Node SEA remains the runtime; NASA NPR 7150.2D Class C remains an incomplete engineering target, not certification.
