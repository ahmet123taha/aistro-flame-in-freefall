# Provider compatibility correction - 0.3.1 to 0.3.2

The observed HTTP 400 message did not identify the rejected argument. A schema regression is plausible, not proven. The exact Turkish language request was independently confirmed to enter research routing and send 35 sources.

## D032-01 / HIGH - Provider rejected a research request after the 0.3.1 schema change

Cause: The actual local provider receipt records HTTP 400 with only Request contains an invalid argument. The 0.3.1 release introduced a nested responseJsonSchema with array/numeric bounds and unions; Google documents that schema complexity can cause 400 INVALID_ARGUMENT. This is a plausible regression source, not a proven rejection field.

Correction: Restore JSON MIME mode without a provider-compiled schema. Preserve authoritative routing, the explicit output contract, local shape/rubric/citation validation, no tools, same model and no automatic retries. Invalidate prior prompt cache with a new contract version.

Status: compatibility_confirmed_for_one_live_conversation_original_cause_unspecified

Code: lib/gemini.mjs, lib/research-schema.mjs.

Evidence: tests/provider-compatibility.test.mjs, tests/dialogue-flow.test.mjs, qa/release-0.3.2/test-results.log, qa/release-0.3.2/browser-review.json, qa/release-0.3.2/browser-events.json, qa/release-0.3.2/portable-verification.json.

## D032-02 / MEDIUM - The exact polite Turkish language request became a research scenario

Cause: The recognizer accepted cevap verebilir misin but not cevap verir misin. The failed receipt confirms research intent with 35 candidate sources. The defect is confirmed independently of the provider rejection.

Correction: Recognize bounded polite language-only forms, including the exact reported sentence. Preserve mixed scientific questions as research. Both browser and server use the shared route; contaminated control-only scenario lines are filtered while transcript and actual scenario remain.

Status: resolved_in_local_regression

Code: public/dialogue-flow.mjs.

Evidence: tests/provider-compatibility.test.mjs, tests/dialogue-flow.test.mjs, qa/release-0.3.2/test-results.log, qa/release-0.3.2/browser-review.json, qa/release-0.3.2/browser-events.json, qa/release-0.3.2/portable-verification.json.

## D032-03 / MEDIUM - Provider failure records omitted request-contract and available field diagnostics

Cause: The recorded message was generic and lacked provider status/field paths or a digest of the sent contract. The precise rejected argument could not be established from that record.

Correction: Record JSON contract, MIME, schema-presence flags, byte count and SHA-256 without storing request content. Preserve allowlisted provider status and sanitized BadRequest field paths if supplied. Never infer a field when none is supplied; do not retain arbitrary provider detail bodies.

Status: resolved_in_local_regression

Code: lib/provider-diagnostics.mjs, lib/gemini.mjs.

Evidence: tests/provider-compatibility.test.mjs, tests/dialogue-flow.test.mjs, qa/release-0.3.2/test-results.log, qa/release-0.3.2/browser-review.json, qa/release-0.3.2/browser-events.json, qa/release-0.3.2/portable-verification.json.

## Remaining limits

- One explicitly authorized live language-only request passed HTTP 200 and local validation. Live research/ranking payloads and broader qualitative behavior were not tested. The old generic HTTP 400 still does not establish the exact rejection field.
- The compatibility change removes provider-constrained JSON structure. Invalid JSON or semantic content is still rejected locally; no results are invented, silently applied or automatically retried.
- Language recognition is intentionally bounded. Mixed scientific requests remain research. No claim is made that all possible language requests are recognized.
- No dataset, score weights, numerical equations, private API key or private conversation history changed. Current runtime remains Node SEA, not Rust.
- The NPR 7150.2D Class C engineering target remains incomplete and is not NASA certification.

## Primary technical references

- [Complex schemas, bounds and branching can exceed grammar limits and cause 400 INVALID_ARGUMENT. Application semantic validation remains required.](https://ai.google.dev/gemini-api/docs/structured-output)
- [application/json MIME output is supported by GenerateContent.](https://ai.google.dev/api/generate-content)


## Authorized live verification

After the initial local package was ready, the user explicitly requested one live trial. The exact delivered EXE sent the reported language-only message with zero sources, no numerical conditions and no private history. Gemini 3.1 Flash-Lite returned HTTP 200 and a Turkish conversation response; local validation passed. The response was not cached. Usage: 1,810 input and 206 output tokens. Exactly one external request was sent and no retry occurred. This verifies that request only; the original rejected argument remains unspecified. Evidence: qa/release-0.3.2/live-verification.json.
