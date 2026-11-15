# 0.4.9: structured OpenAI input hotfix

The user reported a production OpenAI HTTP 400. A privacy-safe remote record at 2026-11-15T15:32:35Z identifies invalid_request_error with parameter input and a 267819-byte serialized request. That record does not contain the original provider message/code. The precise provider rejection therefore cannot be reconstructed with certainty.

The strongest identified contract gap is JSON mode: production set text.format.type=json_object and mentioned JSON in top-level instructions, but did not put a server-controlled JSON instruction into the input message. The earlier 0.4.8 connectivity canary requested plain OK and did not exercise the production JSON-object envelope. Its success established basic connectivity only, not production structured-request acceptance. The sealed 0.4.8 artifact and its evidence retain their original identity.

## Change and reason

lib/openai.mjs adds a separate, server-controlled input_text block requiring one JSON object. The existing first input block still serializes the same bounded research context. lib/provider-diagnostics.mjs preflights JSON-mode input before fetch, records privacy-safe input shape/JSON-instruction presence and preserves only allowlisted provider error codes/categories/parameter names. Raw provider messages, request text and credentials are never logged as diagnostics.

This is a request-compatibility correction for FIF-085. It does not change the selected gpt-6.1-sol model, medium reasoning, output budgets, low verbosity, store:false, scientific/source validators, dataset, voice model/pricing or automatic-retry policy. No automatic retry, fallback or billed diagnostic request is added. The explicit JSON instruction addresses the identified guard gap; a successful production-shaped live response remains separate evidence.

## Defects and traceability

D-049-01 (high): production structured requests can be rejected despite a successful plain-text connectivity check. Correct the production input envelope and fail locally when the JSON instruction is absent.
D-049-02 (medium): prior error logging discarded the provider error code, limiting diagnosis. Preserve only reviewed, privacy-safe categories and code values; do not retain raw messages.
G-049-01 (medium, open): the observed 400 root cause remains probable, not fully confirmed, and this hotfix has no newly authorized live-provider verification. Production acceptance, account access and full scientific response quality cannot be inferred from mocks.

FIF-085 links the design to lib/openai.mjs, lib/provider-diagnostics.mjs and tests/openai-provider.test.mjs. The meaningful regressions exercise the actual production payload builder for source-free and source-bearing requests, detect the original missing-input-instruction shape, verify the local preflight prevents a fetch, and check diagnostics contain no private text/key. Existing response parsing, semantic validation and cancellation regressions remain mandatory. NPR SWE-050, SWE-052, SWE-055, SWE-066, SWE-073 and SWE-081 receive 0.4.9 trace links while their incomplete Class C status stays open.

## Verification and limits

Current 0.4.9 results belong under qa/release-0.4.9. Until those receipts exist, full Windows tests, source checks, portable rebuild/readback, Linux checks, browser behavior, public deployment, package sealing and PDF visual QA are pending independently. The historical 0.4.8 totals and plain-OK canary are not reused as current results. No real OpenAI request is authorized or made by this hotfix work.

Delivery keeps exactly SpaceApps1/ and Developer Patch/ as sibling ZIP roots. The detailed transition PDF, code changes/index and verification evidence belong inside Developer Patch/. No loose report is placed in a sharing folder. The fixed dataset remains separately distributed and unchanged; 0.4.8 remains the rollback baseline. Source hashes identify what was tested; the delivered EXE hash must match its final verification.

## Reference

Official JSON mode contract: https://developers.openai.com/api/docs/guides/structured-outputs#json-mode . This hotfix applies the requirement to the actual application input; it does not replace application-owned schema/semantic checks with JSON mode.
