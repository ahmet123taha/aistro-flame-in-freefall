# 0.4.3 Safety Steps - unapplied development candidate

## Decision and scope
User request of 15 November 2026: prepare a separate patch while the team compares production 0.4.2 with the scenario-first 0.4.2-half prototype. Do not apply it. Both base-specific candidates are staged and tested; neither published ZIP, active source tree, user profile nor dataset is replaced. This is not a 0.4.3 release, an emergency-response certification or a new operational procedure.

## Intended user flow
1. Start with the user's scenario and known facts. Optional missing measurements do not block literature access.
2. Before a fire: list known materials and missing identities; identify relevant reported conditions and geometry; explain source-supported prevention candidates and their transfer limits. The assistant locates the relevant supplied passage instead of repeatedly assigning a literature search to the user.
3. If a fire could occur: prepare the response by identifying the applicable site/vehicle procedure, relevant equipment and unresolved context. A material name alone cannot establish a safe extinguisher choice.
4. Critical things to avoid: state a concrete source-supported non-action or transfer limitation and the condition that makes it relevant. Do not invent universal prohibitions or numeric safety thresholds.
5. If the existing active-incident flag is true, hide all generated checklist items and display the fixed emergency-procedure handoff. Do not delay applicable emergency procedures to obtain measurements or identify material for this tool.

## Step contract
The legacy title, text, relevance, priority, sourceId, evidenceId and limitation remain. Add step:{phase:prevention|response|avoid, when, ifUnknown, check}. Three branch strings are required for structured steps and limited to 500 characters. The server strips unrecognized step properties. Maximum twelve structured items, four per phase. There is no minimum per category; missing evidence is displayed explicitly. Unknown information is retained, not converted into a safe action. Quotation validation remains exact and local; MAT sidecars cannot become PSI evidence.

## State and compatibility
keep and clear require empty item lists. replace supplies a complete set. Any malformed step/citation preserves the earlier complete set instead of applying a partial deletion. Saved conversations and request summaries retain twelve steps. Existing flat entries remain in an unclassified legacy section and are not silently assigned a phase. A model response that omits the step object may still enter the legacy path; semantic completeness is not guaranteed by these structural checks. Stale context remains visibly marked. The application numbers within each phase but does not mechanically prove that model order is a valid dependency order.

## Implementation
lib/safety-steps.mjs owns the shared prompt and field/count constraints. lib/recommendations.mjs integrates metadata validation with the existing source-evidence checks. lib/research.mjs and lib/gemini.mjs describe the richer output; the prompt cache identity changes. public/safety-steps-panel.mjs owns grouping, safe rendering, empty states and the active-incident handoff. public/recommendations-panel.mjs retains reducer semantics and connects the renderer. lib/conversations.mjs preserves the expanded set. public/safety-steps.css scopes the visual change. Server/build/verification asset allowlists include the new JS and CSS. Numerical ranking, dataset identity, user credentials and main dialogue routing are not modified.

## Verification
Production candidate: 425 tests passed. Scenario-first candidate: 433 tests passed. Twelve new tests include structured/legacy limits, malformed fields, forged citations, source IDs, escaping, incident suppression, saved history and a synthetic provider response resolved through the real analyzer/cache path. Portable checks built both candidates and exercised exact served assets, relocated EXEs, empty PATH, synthetic-profile persistence and shutdown. There were zero real Gemini requests. Browser review uses the actual component with clearly labelled synthetic display text; it is not a live-model evaluation or a complete human usability trial. Detailed logs and exact executable hashes are in Developer Patch/Verification. Test EXEs are not distributed or installed by this patch.

## Approval and remaining work
Select one base after the team discussion. Review the changes in an isolated checkout against the before-file hashes. Authorize any new live API evaluation separately. Evaluate non-expert, engineer, crew and unknown-context cases; reject unsupported operational instructions. A vetted procedure catalog would need authority, revision, vehicle/site/equipment scope and human review before procedure-specific suppression instructions could be offered. That catalog is not implemented here. NPR 7150.2D Class C remains an incomplete engineering target; no standards row is closed by this patch.
