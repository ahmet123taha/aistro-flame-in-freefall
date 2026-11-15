# Agent skills, focused discussion and numerical evidence - 0.4.5

## Purpose and scope

This transition addresses the user's observed problems in 0.4.4: long repetitive answers, crowded safety cards, an unclear AI summary label, a Continue with AI action that only filled the composer, and unexplained missing numerical condition scores. Voice-based Incident Support is explicitly deferred. Existing incident handoff and intervention boundaries remain in place. No new live Gemini request or remote deployment is authorized for this release.

## Runtime skills are application instructions

Versioned `lib/agent-skills/*/SKILL.md` sources define focused behaviors for concise dialogue, short safety checklists, a selected-source discussion, numerical-evidence interpretation and useful source briefings. A build-time compiler creates a deterministic manifest with source hashes. The runtime selects the relevant skill bodies and includes them in the provider's system instruction. The selected skill identities and hashes are observable in the request diagnostics.

These are application-agent skills, not fine-tuning, a permanent installation into Gemini, or a change to the user's global Codex configuration. The same request still contains the current conversation, bounded local evidence and structured user conditions. No browsing, new external tools or extra model request is introduced by loading a skill. Skill revisions participate in the prompt/cache identity so an older cached reply cannot be presented as a fresh response under changed instructions.

The skills supplement the existing scientific and transport contracts. They cannot override source allowlists, exact quotation checks, incident restrictions, parameter units, missing-data handling or third-party provenance boundaries. Source text and user text remain untrusted data, not instructions to change these rules.

## Conversation: answer with new information

- Answer the latest question directly in the user's language. Match detail to the question; do not infer professional competence or equipment from the scenario.
- Omit paraphrases of the scenario, known form values and generic declarations that the topic is important.
- Prefer a short answer with a small number of useful findings. Give detailed reasoning when requested.
- Ask only questions that materially improve the next research step. Group related gaps and do not repeatedly ask for unknown values.
- Empty optional fields remain unknown and never prevent searching for relevant papers.
- Keep reported observations, model interpretation, applicability and missing evidence distinct.

Shortness is a generation instruction, not post-validation truncation. The application does not cut scientific sentences or remove qualifications to meet a character count. Offline prompt assertions establish that the instructions are sent; they cannot establish how well a live model follows them.

## Focused source discussion

Continue with AI initiates the selected study discussion immediately. The selected source identity is visible. The user's unsent composer draft remains intact. The server validates the focus ID, restricts candidate selection and evidence retrieval to that source, and rejects IDs outside the local catalog. A user can return explicitly to all research; new conversations clear the source focus.

Only supplied excerpts from the focused study can ground the new scientific answer. Earlier conversation may explain the user's intent, but earlier papers do not become evidence for the selected source. The focus request uses the current scenario and conditions. It should explain the study's useful findings, relevant conditions and limitations, then allow follow-up questions. Report/data tabs and the main result list remain available.

Selecting a study does not mean every file in its collection was read. Retrieval remains bounded and may include metadata or reviewed fragments alongside local file excerpts. A source-specific discussion must state an actual gap when the necessary material is absent, rather than imply complete understanding of all source files.

## Checklist presentation and optional fields

The safety sidebar presents short numbered action sentences. Supporting reasons, applicability conditions, unknown branches, checks, limitations and original passages move to the numbered Steps with sources section. Source details remain linked to the corresponding visible step. Reading marks continue to mean reviewed, not that an action was safely performed.

The generation instructions ask for useful follow-up when material identity is uncertain: identify the material when possible, then explain supported next research/preparation steps or the unresolved branch. They do not permit inventing an intervention merely to fill a list. Existing incident mode hides generated action instructions and directs the user to applicable approved procedures. Voice interaction is not part of this change.

AI Summary is the first visible label in a source brief. The atmosphere field asks for known gases besides oxygen, with familiar examples and optional concentrations. Redundant unknown buttons are removed; blank values already carry that meaning. Existing saved unavailable values remain compatible.

## Why numerical comparison could be missing

The numerical audit separates three questions: does the original source contain useful material evidence, has that evidence been indexed with units/provenance, and can it validly be transferred to the entered material? These are not interchangeable.

The reviewed PSI-26 sources contain cotton-fiberglass SIBAL measurements. SIBAL is a composite; its pressure/flow observations cannot silently be scored as pure-cotton observations. Plain fabric, pure cotton, unknown fabric composition and a verified SIBAL construction must remain different identities. Accepted spelling and language aliases can be normalized without erasing those differences.

The audit found an original PSI-26 DOCX figure caption explicitly describing 0-g and 1-g conditions. Those nominal settings can enter a reviewed figure-level evidence fragment with exact file hash and paragraph provenance. They are not a measurement of residual acceleration, and values from different fragments are not assembled into an invented joint experimental row. A source that merely says microgravity still does not establish a numeric zero.

The nearest source measurements and reasons for withholding points should be visible. Composite context may remain useful for literature discovery while uncredited numerically for pure cotton. Missing ambient-temperature data remain missing. Finding no normalized value is not proof that the entire NASA literature contains no relevant value.

Third-party material profiles remain separately identified applicability support. They can explain transfer uncertainty and material sensitivity only within their actual tested scope. They do not supply a fabricated PSI measurement, arbitrary tolerance or automatic numerical score bonus. A high research-usefulness rank is distinct from a high parameter-proximity score or a prediction of identical combustion.

## Verification and release gate

Current evidence belongs under `qa/release-0.4.5/`. The release gate requires the offline test suite, syntax checks, twenty recorded matching cases, the dedicated numerical source audit, controlled browser checks and verification of the exact delivered portable executable. Source/skill hashes and the code index must match the packaged source. All final counts are taken from completed evidence files, not estimated while work is pending.

The numerical replay reuses recorded provider responses and local recovery cases; it is not twenty new live Gemini trials. Legitimate changes caused by newly indexed source evidence must be explained instead of forced back to the old score. Browser responses used for QA are synthetic and must be labeled as such.

New requirements FIF-073 through FIF-076 link this behavior to implementation, tests and release evidence. Related NPR 7150.2D Class C rows remain partial and not formally closed. Independent assurance, semantic claim support, full extraction coverage, live-model usefulness, clean-second-machine acceptance, remote deployment and approved emergency procedures remain open.

## Delivery and source map

`SpaceApps1-0.4.5.zip` contains exactly two sibling directories: `SpaceApps1/` and `Developer Patch/`. The app folder carries the executable and a short transition note. The developer folder contains the detailed English PDF, this design, requirements/risks, exact previous and current sources, per-file hash map, unified diff, code index and verification records. The fixed dataset, API keys and private conversation history are excluded. The previous 0.4.4 ZIP and source baseline are preserved.

| Area | Principal responsibility |
|---|---|
| `lib/agent-skills/*/SKILL.md`, manifest/compiler | Versioned behavior instructions and deterministic source identity |
| `lib/gemini.mjs` | Skill routing/injection, provider diagnostics and cache identity |
| `server.mjs`, `public/app.js`, `public/environment-panel.mjs` | Validated source focus, immediate discussion and visible state |
| `public/safety-steps-panel.mjs`, `public/source-briefing.mjs` | Compact numbered actions, source detail section and unmistakable summary label |
| `public/context-fields-panel.mjs` | Optional fields with blank-as-unknown behavior |
| Numerical identity/support/diagnostic modules | Material normalization, source-backed candidates, nearest-value explanation |
| `qa/release-0.4.5/numeric-audit.*` | Actual source coverage, reviewed values and unresolved numerical limits |

The generated code index supplies exact files, functions, loops, blocks, lines and hashes. Its syntax-derived descriptions are navigation aids, not a semantic review of every statement.
