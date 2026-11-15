# Scenario-first research prototype

Friendly version: 0.4.2 half-step (0.4.2½). Package version: 0.4.2-prototype.1.
Baseline: sealed production 0.4.2. This is a separately distributed comparison prototype, not a decision to replace that release.

## Purpose and audience

The product helps people reach useful local research and its supporting sections. It serves a general reader, student, engineer, researcher, astronaut or habitat resident through the same conversation. No occupation selector or assumed professional competence is required. A learning question, fictional setting and real environment are all valid. The user's language and requested detail drive the explanation; source evidence drives factual claims.

The primary entry is a conversation. Optional environmental details refine that conversation. Specialist equations remain implemented and tested, but their method menu and laboratory configuration controls are absent from the primary form. Missing model inputs cannot prohibit literature discovery. This prototype does not automate selection or execution of specialist equations.

## User journey

1. Launch the EXE. The conversation is open, the conditions rail is narrow, and the results area is empty.
2. Describe a question or choose an example to fill the composer. Example selection and manual panel opening make no model call. Enter sends; Ctrl+Enter inserts a new line.
3. Gemini identifies the research objective. A vague greeting may receive a short question. A sufficiently clear topic can return useful sources before any measurements are supplied.
4. If optional known details would improve the search, a validated conditionRequests list opens the left panel. Each field has a short reason. The panel expands within the layout rather than covering the conversation.
5. Fill any known fields, describe them in chat, or choose Continue without these details. Unknown stays unknown. Skipping sends an explicit user-approved continuation message and records the unavailable keys in this chat.
6. Update research with known conditions reuses the scenario. Before any scenario exists, it focuses the conversation instead of spending an API request.
7. Open reports/data in existing tabs, inspect provenance, and review independently validated recommendations. Numerical evidence and literature relevance remain separate.
8. Clear known conditions preserves the conversation. New chat clears scenario, fields, panel requests, results and advice. New chat with these inputs copies only the environment, not previous dialogue or requests.

## Panel contract and state

The server accepts up to four distinct conditionRequests entries, each containing only an allowed key and a 1-400 character reason. Supported keys are material, atmosphere, gravityMs2, temperatureK, oxygen, pressure, airflow and thicknessMm. Values, mandatory flags, arbitrary DOM identifiers and unsupported laboratory parameters are discarded. Known values, previously unavailable fields, conversation-only turns and active emergency requests are excluded from optional field guidance. Malformed optional guidance does not discard an otherwise valid answer.

The client records expanded, seen, unavailable and requests inside that chat's bounded, allowlisted conditionPanel state. A newly requested eligible field can open the rail. Repetition of an already seen field cannot override the user's manual collapse. Only current-response results may change the panel; the existing revision/focus gate rejects late replies after edited inputs or changed source focus. The panel does not assign field values. Quoted conditionSuggestions retain the existing explicit Apply action and refuse to overwrite populated fields.

Reasons are rendered as text, not executable HTML. The collapsed body is inert, hidden from assistive technology and excluded from keyboard navigation. The toggle exposes aria-expanded/aria-controls. Escape in the panel collapses it and restores focus to the toggle. On small displays the rail becomes an in-flow collapsible section with a bounded height. Reduced-motion preference removes the width animation.

## Prompt architecture

lib/scenario-first-prompt.mjs owns audience, discovery sequence and explanation guidance. lib/research.mjs composes it with the unchanged local-source trust boundary, emergency boundary, current-context precedence, rubric, extraction and recommendation contracts. lib/gemini.mjs adds authoritative turn routing and sends the current user question, bounded conversation, scenario, optional conditions, unavailable keys and supplied evidence as data.

Audience rules: start with accessible language, define unfamiliar terms, use engineering depth when useful, never infer qualifications from role/place, and never lower evidential standards for a general reader. Ask no more than two focused groups of questions. Do not demand outcomes the user is trying to learn. Distinguish asking for missing fields from extracting explicitly reported values. Current corrections supersede conflicting history. Do not repeat the whole input form in every answer. Do not invent a matching source when the corpus only offers adjacent evidence.

Prompt directives are not proof of model compliance. The server still verifies identities, literal quotations, rubric bounds, source association and recommendation operations. A new cache namespace prevents reuse of older prompt responses. There is no automatic provider retry, paid fallback or web-search tool. The new audience communication policy has not been tested against a live model in this release.

## Scientific invariants

There is no change to parameter proximity, the supplied-condition 60-point budget, the scenario 40-point budget, physical-model domains, material-family eligibility, source normalization, extraction or original-file hashes. No conditions means no numerical budget, not zero physical similarity. Missing source measurements remain unassessed. The same 20 recorded cases are replayed to check source selection and arithmetic; prerecorded model assessments are not fresh model evaluations. Third-party material properties remain contextual applicability information, never PSI measurements or numerical credit.

The application cannot validate a safe habitat, estimate a calibrated fire probability, or prescribe an emergency suppressant/atmosphere intervention. During an active incident the prompt prioritizes applicable crew/site procedures without delaying for forms. Exact scientific claims continue to require supplied local evidence.

## Distribution and reversibility

The production 0.4.2 ZIP remains sealed and unchanged. The new ZIP contains SpaceApps1 and Developer Patch as sibling folders. The app reuses the fixed dataset and Research_Content/0.4.2 add-on; no new dataset package or extraction is needed. The separate prototype history/cache/instance profile is under LocalAppData/FlameInFreefall/Prototypes/0.4.2-prototype.1. The existing DPAPI key vault remains at LocalAppData/FlameInFreefall and is reused; no key or personal history is packaged. Explicit test profile overrides isolate both the key and history in tests.

The user can run production 0.4.2 again without migrating prototype chats. Settings key changes still affect the shared vault; prototypes do not copy or erase existing keys during packaging. The binary remains Windows x64 Node SEA, not a Rust conversion or NASA-certified software.

## Review gates and limitations

Automated offline tests cover request filtering, unknown fields, manual collapse, chat isolation, server transport, source validation and twenty broad audience prompts with synthetic responses. Browser checks exercise actual data and controlled provider transport. An unchanged twenty-source numerical replay verifies actual-data matching. The delivered EXE must pass portable checks and exact asset/hash checks. A test log, browser observations, numerical receipt, code/block index, source diffs and English report are delivered inside the ZIP.

These do not establish live Gemini audience quality, calibration, professional review, second-machine compatibility or usability across the full audience. The existing bounded verbose-query retrieval limitation G042-04 remains open. Follow-up user testing should compare old/new flows using the same tasks: time to a useful source, unnecessary-question count, successful unknown handling, source location clarity and perceived control. Decide whether to retain, revise or reject the prototype after review; do not equate passing software checks with acceptance of the product direction.
