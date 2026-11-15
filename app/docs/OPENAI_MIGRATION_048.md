# 0.4.7 to 0.4.8: OpenAI provider migration

## Purpose and scope

The user selected OpenAI GPT-6.1 Sol / Medium to replace Gemini for research interpretation. Research discovery, material applicability, numerical scoring, source provenance, optional conditions and existing saved conversations retain their contracts. The provider migration does not certify scientific answers or emergency guidance.

The text workload uses POST https://api.openai.com/v1/responses with gpt-6.1-sol, explicit medium reasoning, low verbosity and store:false. The existing application-owned context is serialized as one bounded user input; instructions are resent each turn. No web tools, provider file uploads, external vector stores, automatic retries or silent provider/model fallback are enabled. Native voice uses a separate gpt-realtime-2.1-mini session because the selected text model does not accept audio.

## Research contract

The server continues to choose local sources and excerpts. The model returns JSON object output, then the application resolves evidence identifiers and validates source quotations, conditions, rubric dimensions, recommendation actions and source briefings. JSON mode is not strict schema enforcement; the existing dynamic schema and local semantic checks remain mandatory. Failed, refused, incomplete and malformed outputs must not become scientific results. The response envelope retains receipt information and backward-compatible token counter aliases while also recording OpenAI-native usage fields.

Provider identity is included in cache identity, preventing old Gemini output from being served as new OpenAI output. Historical Gemini messages and receipts remain labelled Gemini. Retained lib/gemini.mjs is an import compatibility facade with no Google network transport.

## Credentials and configuration

Windows uses a separate %LOCALAPPDATA%/FlameInFreefall/credentials.openai.dpapi record. Existing credentials.dpapi is neither read for OpenAI nor overwritten. Settings saves the entered key persistently with Windows CurrentUser DPAPI. Packages exclude all private profiles and credentials. Hosted mode reads OPENAI_API_KEY and optional OPENAI_MODEL from the existing private service environment; anonymous visitors cannot read or change that key. Only gpt-6.1-sol is currently a reviewed model override.

The user supplied a key for the migration. It must never appear in source, logs, screenshots, reports, manifests, ZIPs or command-line arguments. Credential presence and encrypted readback are not evidence of successful API authentication.

## Incident support

Native WebRTC replaces Gemini WebSocket/PCM transport. The browser requests microphone permission after explicit interaction, sends an SDP offer to the same-origin server and receives an SDP answer. The server uses its private key for OpenAI call negotiation. No standard API key or ephemeral bearer token is returned to the browser. WebRTC still exposes a model session to its owning client; this is not a claim that a hostile client cannot send session updates. Normal application controls keep short protective guidance, no research-form requirement and no research-history transfer.

Closing the dialog, ending the call, cancellation or page exit disposes media tracks, peer/data channels and pending negotiation. Text fallback is explicit. Voice and text are separate model requests; a voice failure never silently buys another model response. Network availability, microphone permission, model access and safe operation require separate evidence.

## Privacy and state

Research histories remain per local profile or per anonymous hosted visitor. Incident history remains memory-only. store:false avoids adding provider-stored Responses state; it does not establish Zero Data Retention. Provider abuse monitoring, prompt caching and account controls are separate. No regional-processing or ZDR entitlement is assumed. No provider-side conversation chain or hidden reasoning history is persisted. Current analysis recomputes from bounded visible application history and selected source evidence.

Stable instructions remain the prompt prefix. Actual cached-token counters are retained; no cache savings are promised. Explicit cache breakpoints are supported but not added in this migration, which preserves the existing privacy and storage policy without new cache-write/retention controls.

## Traceability and verification

FIF-085: OpenAI research migration without weakening source/scientific validation.
FIF-086: Provider-separated persistent credentials and honest historical/current receipts.
FIF-087: OpenAI native incident voice/text with cancellation, isolated context and explicit fallback.

Verification includes mocked provider failures and typed responses, legacy/current receipt preservation, vault separation, full scientific regression suite, browser interaction checks, packaged executable byte checks, Linux tests and public application checks. The current release receipts state which of these completed. No test count, deployment state or live provider success is inferred from earlier releases.

## Limitations and acceptance

The prior output budgets are bounded and include reasoning tokens on OpenAI. Incomplete output is rejected without automatic retry. A real-model trial is necessary to characterize practical latency, budget sufficiency and account/model access; a mocked response is not that evidence. A successful short text trial would not validate the full scientific workflow or native voice.

NPR 7150.2 Class C is an engineering target. Independent classification, safety assurance and expert review remain open. This application is not emergency dispatch or an approved emergency procedure. The fixed Veri_Seti is unchanged and remains separately distributed. The sealed 0.4.7 package is retained as the rollback baseline.

## Official references reviewed on 2026-11-15

- https://developers.openai.com/api/docs/models/gpt-6.1-sol
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/reference/resources/responses/methods/create
- https://developers.openai.com/api/docs/guides/voice-webrtc
- https://developers.openai.com/api/docs/guides/your-data
- https://developers.openai.com/api/docs/guides/prompt-caching

Budget steering: the user reported a $10 balance and selected price/performance for voice. Realtime 2.1 mini replaces the full voice model. A two-minute call limit and thirty-second client idle cutoff reduce unattended use; they do not guarantee an account-wide dollar cap. Text research remains user-approved GPT-6.1 Sol / Medium. No automatic upgrade or model retry.

## Current verification results

Windows: 562/562 tests passed. Linux: 561 passed and one Windows DPAPI test skipped. The exact portable executable and source-backed data access passed. Browser verification used synthetic provider/microphone/peer transports and six reviewed screenshots. One user-authorized server-side Sol/Medium connectivity request returned HTTP200 and exact OK (24 input,5 output tokens, estimated standard cost USD0.000098). No private research conversation, dataset or microphone was sent. No real Realtime voice call was made. See final receipts for deployed/package identity.
