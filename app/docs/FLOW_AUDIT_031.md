# Conversation flow audit - 0.3.0 to 0.3.1

Conversation-to-scenario routing, source focus, response validation, in-flight state, history persistence, recommendations, provider/cache errors and portable delivery.

## Evidence and root cause

The reported language command was appended to the scientific scenario; source selection depended on nonempty scenario. Several validation branches shared an inaccurate message.

The old rejected raw JSON was not retained. The exact failed assessments branch cannot be reconstructed from the generic old message. No claim is made that the provider returned one specific malformed field.

The observed provider receipt was HTTP 200 with 35,405 input and 545 output tokens. It proves a provider response was received, not a valid scientific result. No private transcript is copied into this release.

## State flow

1. Preflight current chat capacity and input validity.
2. Separate an unambiguous language/style/greeting command from scientific scenario text.
3. Carry current optional environment and language preference; do not revive cleared historical measurements.
4. Recompute routing on the server. Conversation or empty-scenario clarification sends no source candidates; focused research sends its one validated source; general research can inspect the 35 local source records.
5. Request mode-specific JSON, resolve server evidence IDs and validate citations/rubrics/measurements.
6. Retain response and receipt in history. Apply scientific changes only if environment, application revision and source focus are unchanged.
7. Preserve/review recommendations according to the actual turn type; release UI locks even after failure.

## Findings and changes

### D031-01 / HIGH - Conversation controls polluted the scientific scenario

Cause: The browser appended every message, including the exact language command, to scenario. A nonempty string enabled all local source candidates.

Correction: Shared narrow routing separates language, formatting and greetings from research. Legacy control-only lines are filtered from the bounded scenario without deleting visible transcript. The server recomputes the route and keeps language preference per chat.

Code: public/dialogue-flow.mjs, public/environment-panel.mjs, server.mjs, lib/conversations.mjs.

Evidence: tests/dialogue-flow.test.mjs, qa/release-0.3.1/test-results.log, qa/release-0.3.1/browser-review.json, qa/release-0.3.1/browser-events.json, qa/release-0.3.1/portable-verification.json.

### D031-02 / MEDIUM - One validation error concealed several different failures

Cause: Scenario required before ranking was thrown for missing/non-array/overlong assessments, missing scenario, or clarify with assessments. HTTP 200 was mistaken for an application success expectation.

Correction: Routed JSON Schema plus separate local branch codes. Non-ranking omitted empty collections are normalized only when harmless. Scientific references, rubrics and ranking lists remain fail-closed. Safe diagnostics record shape, counts, field, route and response digest without raw answer text.

Code: lib/research-schema.mjs, lib/research.mjs, lib/research-evidence.mjs, lib/gemini.mjs.

Evidence: tests/dialogue-flow.test.mjs, qa/release-0.3.1/test-results.log, qa/release-0.3.1/browser-review.json, qa/release-0.3.1/browser-events.json, qa/release-0.3.1/portable-verification.json.

### D031-03 / HIGH - Focused-source chat bypassed the environment/scenario workflow

Cause: Continue with AI selected the legacy chat handler instead of the research handler. Scenario, language and environment management consequently diverged.

Correction: Both focused and general research conversations use the same planner and endpoint. A valid focused source restricts candidates to that record. Current optional inputs still supersede conflicting history. Specialist comparison retains its separate explicit mode.

Code: public/environment-panel.mjs, public/app.js, server.mjs.

Evidence: tests/dialogue-flow.test.mjs, qa/release-0.3.1/test-results.log, qa/release-0.3.1/browser-review.json, qa/release-0.3.1/browser-events.json, qa/release-0.3.1/portable-verification.json.

### D031-04 / HIGH - Meta replies could mark old recommendations current

Cause: A keep update cleared the stale flag even when the turn contained no scientific review. A greeting could also clear the active-incident flag.

Correction: The server marks whether a research review occurred. Conversation/clarification replies preserve prior stale state and incident notice; only a validated research review can replace, clear or reconfirm candidates. Changed scientific context invalidates previous recommendations before the request.

Code: lib/research.mjs, public/recommendations-panel.mjs, public/environment-panel.mjs.

Evidence: tests/dialogue-flow.test.mjs, qa/release-0.3.1/test-results.log, qa/release-0.3.1/browser-review.json, qa/release-0.3.1/browser-events.json, qa/release-0.3.1/portable-verification.json.

### D031-05 / HIGH - Response application did not cover source-focus transitions

Cause: Environment revision and app/source revision were separate. A delayed answer could outlive a source change, including changing away and back.

Correction: Response acceptance checks environment revision, app revision and source identity. A stale response is retained in the transcript with its own notice but cannot update current rankings or recommendations. A newly typed draft remains untouched.

Code: public/dialogue-flow.mjs, public/environment-panel.mjs, public/app.js, public/conversation-panel.mjs.

Evidence: tests/dialogue-flow.test.mjs, qa/release-0.3.1/test-results.log, qa/release-0.3.1/browser-review.json, qa/release-0.3.1/browser-events.json, qa/release-0.3.1/portable-verification.json.

### D031-06 / MEDIUM - Conversation capacity could fail after sending the final user message

Cause: At 499 stored messages the user turn occupied the last slot, leaving no room for a provider answer or error notice. An exception outside cleanup could leave UI controls locked.

Correction: A turn preflight reserves two slots before sending. Stale-answer warnings are stored inside the response rather than consuming a third message. Both chat paths unlock in finally and isolate status-refresh errors.

Code: public/dialogue-flow.mjs, public/conversation-panel.mjs, public/environment-panel.mjs, public/app.js.

Evidence: tests/dialogue-flow.test.mjs, qa/release-0.3.1/test-results.log, qa/release-0.3.1/browser-review.json, qa/release-0.3.1/browser-events.json, qa/release-0.3.1/portable-verification.json.

### D031-07 / MEDIUM - Receipt/cache filesystem failure could masquerade as model rejection

Cause: Writing optional logs or cache inside the success path could throw after a valid provider answer. Subsequent logging could hide the original error again.

Correction: Nonessential telemetry/cache failures are contained and counted. A valid answer remains visible with a local-storage warning; history persistence has a separate visible status. There is no silent claim that storage succeeded.

Code: lib/gemini.mjs, public/conversation-panel.mjs.

Evidence: tests/dialogue-flow.test.mjs, qa/release-0.3.1/test-results.log, qa/release-0.3.1/browser-review.json, qa/release-0.3.1/browser-events.json, qa/release-0.3.1/portable-verification.json.

### D031-08 / MEDIUM - Protocol errors were misleading or too generic

Cause: All provider HTTP 400/401/403 responses suggested key/access trouble. Invalid JSON request bodies or non-JSON local responses could produce unrelated exceptions.

Correction: HTTP 400 reports request-format rejection, 401/403 authentication/access. Incomplete output and invalid JSON have distinct codes; malformed local request shapes receive 400. Local transport failures have application-specific messages. No automatic retry or model fallback.

Code: lib/gemini.mjs, server.mjs, public/app.js.

Evidence: tests/dialogue-flow.test.mjs, qa/release-0.3.1/test-results.log, qa/release-0.3.1/browser-review.json, qa/release-0.3.1/browser-events.json, qa/release-0.3.1/portable-verification.json.

### D031-09 / LOW - Generated submission text and unrelated laboratory fields entered dialogue context

Cause: The generated Environment submitted label entered model history; default burner-specific condition keys/units also accompanied environmental research.

Correction: Generated submit labels are excluded from model history. Research payloads include only material and the six supported optional environmental measurements with their units. Specialist mode remains available and unchanged.

Code: public/conversation-panel.mjs, lib/gemini.mjs.

Evidence: tests/dialogue-flow.test.mjs, qa/release-0.3.1/test-results.log, qa/release-0.3.1/browser-review.json, qa/release-0.3.1/browser-events.json, qa/release-0.3.1/portable-verification.json.

### D031-10 / MEDIUM - Control turns discarded visible research results

Cause: Sending any chat message cleared research results before the reply. This made language or formatting changes look like loss of scientific work.

Correction: Non-research controls preserve current matching results and recommendation state. Source-focused conversation retains general matching results unless the environment itself changes.

Code: public/environment-panel.mjs, public/dialogue-flow.mjs.

Evidence: tests/dialogue-flow.test.mjs, qa/release-0.3.1/test-results.log, qa/release-0.3.1/browser-review.json, qa/release-0.3.1/browser-events.json, qa/release-0.3.1/portable-verification.json.

## Verification and limits

208 tests passed. Browser verification covered 13 flow checks with 11 controlled provider replies and zero real provider calls. The exact delivered portable executable is independently verified in an isolated profile, relocated path and empty PATH. Package hashes, syntax and code-index references are checked during packaging.

- Live Gemini acceptance of the updated schema and qualitative answer quality have not been tested in this release. All provider responses in verification are mocked; no user quota was spent.
- The deterministic control recognizer is intentionally narrow. Mixed scientific messages and unknown phrasing remain research; readiness still depends on the model returning clarify or rank.
- Schema, exact quotation and rubric validation establish format/reference traceability, not scientific truth or suitability for an active fire.
- Research discovery still uses bounded indexed local metadata/supporting text, not every PDF/table. Numeric coverage gaps remain visible; no score-weight or physical-equation changes.
- History bounds remain 50 chats, 500 messages/chat and 4 MB; long-term export/archival, formal fault injection across the entire OS and a clean second-machine test remain open.
- The original private profile and fixed dataset are not modified by QA or included in the ZIP. NPR 7150.2D Class C remains an incomplete engineering target, not a certification.

## Primary technical references

- [JSON Schema constrains structure; semantic values still require application validation.](https://ai.google.dev/gemini-api/docs/structured-output)
- [GenerateContent generation configuration and JSON output contract.](https://ai.google.dev/api/generate-content)
- [Official SDK responseJsonSchema field reference.](https://github.com/googleapis/js-genai/blob/main/src/types.ts)
