# 0.3.9 code-frame entry points

- lib/material-support-store.mjs / validateMaterialProfile, loadMaterialSupport: role/schema/identity/unit gates, source hash checks and optional-sidecar failure containment.
- lib/material-identity.mjs / canonicalMaterial: unchanged family aliases, no grade equivalence.
- lib/material-applicability.mjs / materialApplicability, materialSupportContext: family selection, separate support summary and bounded model context, no numerical score output.
- lib/dataset.mjs / loadDataset: optional sidecar attached outside records/experiments/files.
- lib/gemini.mjs / payloadFor, createAnalyzer: distinct model context channel and support-hash cache identity.
- lib/research-coverage.mjs / sourceConditionCoverage: separate UI applicability object; the PSI evidence serialization omits it.
- public/material-support-card.mjs / renderMaterialSupport: source-pinned property values and limits. public/environment-panel.mjs / sourceCoverageHtml mounts it inside a distinct disclosure.
- server.mjs / api/material-support: bounded read-only query with no provider call.
- tests/material-support.test.mjs: profile loading, path/hash rejection, identity quarantine, numerical/citation noninterference, bounded context/cache and endpoint checks.

The full code index supplies exact file/hash/line/parent/function/loop links. Syntax-derived block descriptions require semantic review.
