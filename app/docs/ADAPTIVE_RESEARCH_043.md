# SpaceApps1 0.4.3: scenario-first discovery and contextual refinements

## Authorized transition

The user selected 0.4.2-prototype.1 (the 0.4.2 half-step) as the base and authorized applying the previously isolated safety-steps patch together with AI-directed optional fields. Production 0.4.2 and the prototype packages remain historical baselines. This is one integrated 0.4.3 release; the unapplied draft is not a second runtime patch.

## User flow

1. Start with a research question. A profession, sensor reading, selected paper or numerical form is not required.
2. The assistant searches the supplied library once the objective is understandable. It may request common conditions and propose a small set of contextual details in parallel with source results.
3. Newly useful details open the left panel. The user can answer, choose an editable suggestion, write a different description, mark a field unknown, or continue in chat without it.
4. Submit known conditions or continue in chat to refine source discovery. Typing changes local state only; it does not send an API request.
5. A topic change replaces the active contextual fields. Answered old fields are retained under Saved details but excluded from the next search. The user may explicitly restore or remove them.
6. Read source results and source-backed preparation steps. The right panel groups prevention, response preparation and cautions. Exact quotations and limitations remain accessible.

## The adaptive-field algorithm

The model proposes `contextFields` with action `keep` or `replace`. `keep` preserves the current form. `replace` supplies the complete current set (including an explicitly empty set). Proposals are not executable UI specifications.

Each field has a stable lowercase identifier, short label, explanation, type (`text`, editable `choice`, or `number`), optional suggestions and explicit unit for numerical descriptions. At most six contextual fields are active, twelve options appear per choice, and twenty-four answered or active definitions are retained per chat. At capacity, a new schema is refused instead of silently deleting answers. Six is a usability and resource bound, not a scientific rule. The prompt normally asks for two or three high-value details.

Processing sequence:

1. Recompute conversational routing on the server. A client cannot force a scientific mode.
2. Normalize current contextual state with the shared allowlist. Reject reserved/common-condition identifiers, arbitrary types, malformed descriptions and duplicate identifiers or labels.
3. Extract only active, valid user answers into lexical query terms. Unselected options, unknowns, inactive saved values and invalid numeric strings do not become retrieval terms.
4. Search the existing source-content index and choose candidate sources. Selected context also accompanies the current scenario and dialogue in the model payload, clearly separated from source evidence and numerical conditions.
5. Obtain one model response using the existing Gemini transport. No new tool access, browser access, automatic retry or model fallback is added.
6. Validate source IDs, literal source evidence, rubric and recommendation updates as before. Adaptive-form validation is independent: an invalid optional schema becomes `keep`, without discarding an otherwise valid scientific answer.
7. Suppress form changes on conversation-only turns and active incidents. Reject incomplete or oversized replacement sets atomically. Drop defaults, required flags, hidden values, executable rules and other unrecognized properties.
8. Preserve an answered field's definition. The model cannot reinterpret an existing value by changing its label, unit or type under the same identifier. Unanswered definitions can be refined. Answered fields omitted from the new set move to Saved details.
9. Apply a response only if its request revision and source focus still match. Edits during a pending response invalidate its form/results application, while retaining the answer visibly in conversation history.
10. Expand the rail only for a newly requested, unanswered field. Repeated known or unavailable fields do not override a manual collapse. Text entry updates the existing control without rebuilding the form, preserving the caret and scroll position.
11. Persist current and saved fields per chat. A new chat and a new chat with common environment inputs both exclude topic-specific contextual fields. Reloading the same chat restores them.

## Examples and audience adaptation

For an explicitly technical ignition question, suggested refinements may include fuel identity, fuel configuration, flame regime of interest and mixing regime of interest. A droplet specimen must not be mislabeled as an engine architecture. Rocket ignition wording does not establish the user's occupation, training or available instruments. PSI combustion findings can be adjacent research without being rocket-engine or propellant validation.

For material storage, useful descriptions include material composition, form, packing, enclosure and the desired prevention/detection/suppression topic. For a learner, explain terms and request a simple objective. Unknown conditions are always acceptable. Scientific evidence quality and uncertainty boundaries remain identical for an engineer, astronaut, resident, student or general reader.

Common numerical fields remain explicitly normalized (gravity in m/s2 or g, temperature in K, oxygen in percent volume, pressure in kPa, flow in cm/s and thickness in mm). Custom numerical descriptions retain their explicit units without conversion or physical-range interpretation. For example, a custom stored-mass answer assists retrieval; it does not become a seventh numerical similarity axis.

## Interactive field trees and fuel roles

The final 0.4.3 scope also includes the user's later branching example. A model-proposed choice can control dependent children via `showWhen: {fieldId, oneOf}`. Parent choice values are compared after whitespace/case normalization; both the parent and all ancestors must be active. Blank, unknown and unrecognized free text leave children hidden. The dependency graph must be acyclic, reference existing choice parents and use their declared options. A tree may have up to 24 definitions, but its worst simultaneously visible branch must not exceed six contextual fields. This maximum is calculated recursively across the forest, not by accepting unbounded hidden fields.

`material: {role: "fuel", hints: [...]}` changes the common Material control to Fuel material. Conditional hints change its suggestion list for a selected category. They are explicitly labeled suggested search terms, not verified corpus coverage, chemical compatibility or operating instructions. When no contextual hints apply, the existing indexed material catalogue remains available. The user's existing material entry is never automatically replaced. For a hybrid research question, the model can provide an independent oxidizer field, and optionally another relevant ignition-interest field. Fuel, oxidizer and ignition source are not conflated; oxidizer is not assumed to be gaseous. No propellant recipes or operating thresholds are supplied as UI suggestions.

Branch evaluation is immediate and local: changing a category does not send an API call. Answered inactive branches are retained per chat, excluded from model/search values, and restored if the user returns to that branch. They are not shown as already-known facts in another topic. An archived conditional field cannot bypass its dependency using Use again. The renderer reconciles keyed field nodes and retains the parent's focus, caret and sidebar scroll. Trailing spaces remain intact during multiword entry. The common material entry also remains unchanged; the UI asks users to review it when changing categories.

Tests cover solid/liquid/hybrid suggestion changes, dependent oxidizer visibility, nested branch ancestry, inactive-answer exclusion, same-branch restoration, persistence, cycles, missing parents, unknown option values and simultaneous-field limits. Model-written labels and chemical category membership still require human/live evaluation; a valid graph does not establish a scientifically correct suggestion.

## Scientific boundaries

The 60-condition / 40-scenario policy, numerical support rules, material identity checks, reviewed equations and third-party material sidecar are unchanged. Custom answers never create a measurement, source-supported tolerance, safe operating envelope or experimental result. The model's contextual options are search vocabulary, not evidence that the dataset covers every option. Source selection may change with the new terms; scientific scores continue to require the existing evidence.

Recommendation source-quote validation proves traceability, not semantic entailment, procedural authorization or safe operation. No approved spacecraft/site firefighting procedure catalog exists in this distribution. An active-incident flag hides all generated steps and displays a fixed procedure/authority handoff. Detection of that flag still depends on the model; the application is research support, not an emergency controller.

## Verification and release boundaries

See `qa/release-0.4.3-integrated/` for current tests, controlled browser observations, exact portable-executable verification and twenty recorded numerical replays. Mocked Gemini transport checks the protocol and downstream behavior, not live-model response quality. No new real Gemini request was made. Independent human review, second-machine Windows verification and completed NPR 7150.2D Class C assurance remain open.

The canonical Veri_Seti and Research_Content/0.4.2 are reused read-only. Keys are not packaged. Production 0.4.3 uses the normal local profile; the separate prototype profile is preserved and is not silently merged into production history.
