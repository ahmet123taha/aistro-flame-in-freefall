# SpaceApps1 0.4.7: equal access, optional details and continuous reading

## Change request and release boundary

This transition starts from the sealed 0.4.6 package. Research/learning and incident support receive equal entry prominence. The application must not make a general knowledge question look like an experimental questionnaire. Known conditions remain optional. Document reading must use a long page-flow reader with continuous PDF pages rather than a short nested box and mandatory Next buttons.

The user also asked whether an OpenAI migration is feasible. That question did not authorize a provider migration. This release retains Gemini. Research, numerical scoring and the canonical dataset remain separate from provider transport so that a future migration can be evaluated without replacing the data or reader.

## Two assistance paths

Research and learning use the existing local-source retrieval, evidence identifiers, source validation, scenario assessment and server-computed numerical comparisons. A general introduction is a valid task without any measurements. The model is instructed to distinguish general information, source discovery, condition comparison and clarification. General information must not produce form-opening requests. The server suppresses optional condition/context requests in that mode while retaining supported answers and citations. An explicit request for information without a form overrides a conflicting form request. Topic names alone, such as ISS, are not a deterministic intent classifier.

Incident support has its own dialog, transcript and transport. Opening it does not change research conditions, ranking, focused paper, saved conversation or checklist. It presents immediate general protective guidance and offers voice or text without waiting for catalog retrieval or a research response. Microphone access occurs only after the user's explicit incident-support action and browser permission. A permission or network failure leaves the protective notice and text entry available. The application never claims dispatch was contacted.

## Conditions panel

All fields can be left blank, including values the user does not know or does not wish to disclose. Missing details can limit specificity and evidence coverage. They do not justify fabricated measurements, automatic ISS defaults, a falsely low match percentage or a promise that AI can fill physical facts. The material control says Material used; a validated contextual fuel label can still apply. Ventilation / air movement includes an explanation of fans and nearby airflow. Labels, units and helper text have separate visual spacing and accessible relationships. Gravity retains both m/s2 and g input; zero airflow remains a valid value.

## Native voice protocol

The voice model is `gemini-3.8-live`, separate from the existing `gemini-3.1-flash-lite` text path. The browser receives a short-lived, single-use token, not the server API key. Token creation uses the documented REST `bidiGenerateContentSetup`, with a server-locked model, system instruction, audio output and empty tool list. The constrained WebSocket endpoint accepts the token and the browser sends setup before audio. Microphone PCM is resampled to mono 16 kHz signed 16-bit samples. Output audio is decoded with its declared rate (normally 24 kHz), bounded and interrupted when the model indicates interruption.

Close, Escape, page exit, failed setup, late permission and interrupted connections must stop tracks, audio contexts, queued playback, pending requests and socket activity. Tokens, audio and incident transcripts are not saved in the application profile. Provider processing is separate from application storage; no claim is made that the provider retains nothing. Text fallback is an explicit user action, not an automatic additional model call. No automatic retry or expensive model fallback is introduced.

The locked setup enables initial-history transfer. After setup completes, a bounded clientContent message supplies up to eight whole finalized turns and 6,000 characters from the current incident only. Because initial history does not trigger generation, a separate realtimeInput text requests the next response. Text-to-voice and reconnect preserve that context without importing private research conversations. Playback retains at most 60 seconds of queued PCM (approximately 5.76 MB float32 at 24 kHz); interruption and stop discard the queue intentionally. The original eight-second cap could reject a valid audio burst and was corrected with explicit burst and teardown regressions. Oversized provider responses are cancelled and aborted before releasing the busy/timeout guards.

## Incident prompt and safety limits

The incident prompt requests one to three short protective actions, then at most one question that changes the next safe action. It follows the user's language, avoids repeating their scene and does not demand measurements, material identification, articles or a similarity score. It distinguishes general protective advice from approved site/vehicle procedures.

The prompt prioritizes safe distance from smoke/flames, alerting actual emergency assistance or crew, and following the applicable procedure. It prohibits approaching a hazard to inspect it or fetch equipment; choosing an unknown extinguisher agent or dosage; improvised suppression; and unvalidated changes to ventilation, oxygen, electrical systems, propulsion, hatches or airlocks. Earth evacuation language must not become an instruction to leave a pressurized habitat. These are software guard instructions, not a certification that a generative model will always comply. Independent emergency-domain review remains required before operational reliance.

## Continuous document reading

PDF pages are rendered from original local bytes with bundled PDF.js, not reconstructed scientific content. Pages flow vertically and load near the viewport. Rendering concurrency and retained canvases are bounded so a long report does not allocate every page at once. Zoom and page navigation preserve reading position; direct page access remains optional. Switching a source file updates its reader without rebuilding the entire document panel or resetting the user's surrounding viewport. The page can become longer than the browser window. Source IDs, original-file links, captions, page provenance, tables and reviewed plotted graphics remain available.

## Verification and evidence ownership

Each new requirement links to implementation and focused tests in requirements.json. Full Windows tests, source syntax, rebuilt portable byte verification, browser screenshots, hosted Linux tests and deployed source hash verification have separate evidence. Mocked provider/voice tests establish wiring, lifecycle and validation behavior only. They do not establish live provider availability, audio quality, scientific accuracy or safe real-world emergency decisions. A new live provider test requires the user's fresh instruction; prior 0.4.6 permission has already been consumed.

The unchanged dataset remains external to the application ZIP. Its earlier complete remote readback is a 0.4.6 baseline, not a new 0.4.7 dataset scan. Runtime files are reverified for this release. Credentials, private history, synthetic browser profiles, logs containing user data and temporary upload archives are excluded from distribution.

## References reviewed 2026-11-15

- Gemini Live model: https://aistudio.google.com/docs/models/gemini-3.8-live
- WebSocket protocol: https://aistudio.google.com/docs/live-api/get-started-websocket
- Ephemeral tokens: https://aistudio.google.com/docs/live-api/ephemeral-tokens
- Normative REST AuthToken setup: https://aistudio.google.com/api-reference/live
- US Fire Administration extinguisher limits: https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/fire-extinguishers/

NPR 7150.2D Class C remains an engineering target with open assurance, review and approval evidence. This release does not claim NASA approval, completed compliance or validated emergency-response capability.
