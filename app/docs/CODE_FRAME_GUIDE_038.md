# 0.3.8 code-frame entry points

The generated Code_Index has file/symbol/block hashes, line spans, parent/function/loop links and copied source. Syntax-derived block descriptions are not a claim of manual semantic review of every block.

- scripts/prepare-study-evidence.py: original-file hash checks and reviewed column/graph-header transcription; no source mutation.
- lib/study-evidence.mjs / reviewedStudyEvidence: enable only exact-source derivatives and retain page/sheet/cell locations.
- lib/parameter-support.mjs / parameterSupport: same-material gate; per-parameter point/set/span selection; missing coverage and non-joint provenance.
- lib/research-candidates.mjs / researchCandidates: protect indexed material candidates before bounded model context; no topic percentage is used as condition similarity.
- lib/research-scoring.mjs / sourceScenarioBreakdown: source-index material-family fact overrides only that criterion; raw model value remains separate. scoreResearch retains60/40 budgets and the separate closest individual row.
- lib/research-coverage.mjs / researchContext: bounded metadata, reviewed local fragments, marginal series and physical-model qualifications.
- lib/gemini.mjs / createAnalyzer.analyze: configured local context provider, exact evidence IDs, fixed model, no automatic retry.
- lib/local-discovery.mjs / localDiscovery: independently verified local matches during provider unavailability; no AI scenario score or recommendation.
- server.mjs / api/research: validated routing, one provider attempt, explicit error plus optional local discovery.
- public/app.js / post: preserve provider/error/local-discovery response fields. public/environment-panel.mjs / send: current-turn guard before applying local recovery. researchCards: proximity, coverage, provenance and AI/local distinction.
- tests/parameter-support.test.mjs and tests/local-discovery.test.mjs: material, source identity, span/point semantics, source-fact and HTTP error-path contracts.

- public/gravity-input.mjs / parseGravityInput, readConditionInput, gravityInputMessage: strict user units, SI conversion and inline validation. public/environment-panel.mjs / syncGravity, conditions, restore: normalized submissions and raw-entry restoration. public/conversation-panel.mjs / newConversationContext and lib/conversations.mjs / validateConversations retain bounded raw gravity text separately from canonical numeric conditions.
