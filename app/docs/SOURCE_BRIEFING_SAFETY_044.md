# Source briefing and safety workspace — 0.4.4

## Purpose and authorized scope

The user asked for two connected capabilities: find the right papers and explain their useful findings immediately; turn the right-hand panel into an understandable prevention, response-preparation and critical-cautions workspace. Oracle deployment is being prepared separately. This change does not deploy a public service, alter the fixed dataset or authorize a new paid/live model test.

The official Flame in Freefall description calls for a dashboard that summarizes, ranks and interprets combustion research. An emergency decision aid is our product interpretation, not a claim that NASA requires or approves this implementation.

## Journey

1. Describe a situation or learning question; measurements and a selected paper remain optional.
2. Read a concise answer and normally two to four source-specific briefs before the ranked paper list. Each brief contains what the source says, why it matters to this question, and a concrete limitation.
3. Expand the original passage and file location, or open the report, tables/graphs, or a focused conversation.
4. Review numbered prevention, response-preparation and critical-caution groups. Visible actions stay short; supporting reasons, unknown branches, checks, exact quotations and provenance expand in place.
5. Mark a step as reviewed or copy the review brief. A mark records reading, not successful execution of a safety action. Changing context marks previous candidates stale; new chats isolate them.
6. Incident support can be opened immediately without a model call. It points to applicable approved procedures and emergency authorities, and hides generated action lists. Source findings remain read-only experimental background; their scenario-application text is hidden in this view.

## Evidence-to-answer architecture

Existing bounded local retrieval selects PSI/REF source passages. Stable evidence IDs are supplied to Gemini in the existing request. The server prompt asks for `sourceBriefs` in the same answer; this does not add another provider call. No browsing or external model tools are enabled.

The resolver reconstitutes the quotation and provenance from local evidence. A brief must identify an allowed source, a literal supplied quotation, a bounded finding/application/limitation and one of six topics. The server reconstructs original-file provenance; it never trusts model-supplied page/hash claims. `reported_result` requires a literal `fileText` fragment with original-file provenance. Catalog objectives, hypotheses and future benefits are labeled `study_scope`. This gate is necessary, not sufficient: an exact quote does not prove semantic entailment, a correct interpretation or operational authorization.

At most six briefs survive validation. Invalid optional peers are omitted with a visible notice and partial-validation record. Valid dialogue, source references and research rankings remain available. Partial responses are not cached as fully validated. Older saved responses without the additive field still load. The new prompt/cache version prevents old current-session cache entries from masquerading as current briefing output.

## Safety workspace state

`cleanSafetyWorkspace` normalizes items, stale flag, model incident flag, manual incident latch, source briefs, review marks and timestamp. Review marks bind to source, action, quoted evidence, limitation and conditional step. A changed item cannot inherit an old mark merely because its title is similar. This compact non-security key is not a scientific integrity signature.

The state is stored with the active conversation and migrates old three-field recommendation records by adding empty defaults. New-chat logic does not copy recommendations or findings. The sidebar preserves scroll and expanded groups when its content changes. Manual incident mode survives reload and a delayed normal response; it is also sent as a boolean to the server, which forces the incident flag and prevents replacement action instructions. Returning to planning marks retained candidates stale until reassessed.

## Prompt design

The existing audience-aware, scenario-first instructions are retained. The new guidance asks the model to perform the literature lookup itself, explain unfamiliar terminology, lead with useful findings rather than an input recap, and avoid generic repeated instructions to read papers. Short actions are supported by when/unknown/check fields. Usually three to six useful steps are preferred; categories are not filled to meet a quota.

Material identification alone is insufficient to select an extinguisher. Relevant equipment, atmosphere, energized hazards, tested scope and approved procedure must be established where applicable. Unknowns are not invented. Paper-specific observations do not become guaranteed outcomes for the user's habitat. Extinction of a visible flame is not automatically cessation of combustion. Research on a shared catalog document is not proof that every associated experiment performed the same test.

## Retrieval and scope preservation

Corrected corrupted Turkish lexical aliases for fire, ignition, suppression, fabric, temperature, oxygen, gravity and flow; expanded prevention/detection vocabulary. Original files and quotations remain unchanged. This is a retrieval-language correction, not a new physical law, numerical tolerance or matching weight. Exact aliases do not constitute general Turkish morphology support.

Numerical comparison, scenario budgets, third-party material separation, local file/plot viewers and adaptive optional fields are unchanged. The twenty recorded matching cases verify preservation, not fresh live-model quality.

## Verification and limitations

Evidence is under `qa/release-0.4.4/`. Unit/integration tests cover provenance, invalid optional output, original-result versus catalog scope, manual incident state, persistent review markers, injection escaping, Turkish aliases and controlled analyzer transport. Browser checks use the actual local dataset with explicitly synthetic model responses. Exact portable-EXE checks are separate. No new real Gemini request is authorized or made.

Open: semantic claim/evidence quality; complete corpus extraction; model incident recognition; approved site/vehicle procedure catalog; independent human review; real operator usability; live-model acceptance; remote deployment authentication and multi-user isolation. This release is research assistance, not an emergency control system, fire-probability estimator or certified Class C product.

## Primary design references

- NASA Space Apps, Flame in Freefall: https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/ (official indexed description checked; direct fetch was intermittent).
- NASA Human Integration Design Handbook / hardware and equipment requirements, section 9.8: https://www.nasa.gov/reference/9-0-hardware-and-equipment-vol-2/ (requirements 9059, 9060, 9063 and 9064 checked). Fire equipment selection and emergency accessibility depend on system context. This is design research, not an imported approved procedure.
- Local NPR 7150.2D source identity: `docs/standards/source-record.json`. Existing classification, assurance and approval gaps remain open.

## Code responsibility map

| Component | Responsibility |
|---|---|
| `lib/source-briefing.mjs` | Brief prompt, bounded interpretation schema, local citation/provenance gate |
| `lib/research-evidence.mjs` | Resolve supplied IDs for mandatory assessments and optional summaries |
| `lib/research.mjs`, `lib/gemini.mjs`, `server.mjs` | Integrate prompt, validation, transport, partial diagnostics and manual incident context |
| `public/source-briefing.mjs` | Finding/application/limitation, original passage and file actions |
| `public/environment-panel.mjs`, `public/conversation-panel.mjs` | Summary before ranking, focused discussion, history and copy |
| `public/safety-workspace.mjs` | Canonical per-chat state, bounded review markers and copy text |
| `public/recommendations-panel.mjs` | Live sidebar state, scroll preservation, incident access and persistence |
| `public/safety-steps-panel.mjs`, `public/safety-steps.css` | Readable phase groups and incident view |
| `lib/conversations.mjs` | Backward-compatible saved-state normalization |
| `lib/source-content-terms.mjs` | Correct Turkish retrieval vocabulary |

The generated release code index provides file hashes, symbol/function/loop/block locations and exact source snapshots. Syntax-derived block descriptions are explicitly not a semantic audit of every statement.
