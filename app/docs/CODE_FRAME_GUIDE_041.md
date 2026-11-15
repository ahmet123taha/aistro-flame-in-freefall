# 0.4.1 code-frame entry points

- lib/source-content-index.mjs:32 / retrieve.
- lib/source-content-index.mjs:73 / retrieveManifest.
- lib/source-content-index.mjs:116 / loadSourceContent.
- lib/source-content-baseline.mjs:2 / SOURCE_CONTENT_BASELINE.
- lib/dataset.mjs:35 / loadDataset / context.
- lib/gemini.mjs:58 / createAnalyzer / analyze before source cut.
- lib/research-source-context.mjs:2 / attachSourceFragments.
- lib/research-source-context.mjs:14 / literalSourceProvenance.
- lib/research-evidence.mjs:6 / researchEvidence / resolveResearchEvidence.
- lib/research-coverage.mjs:41 / researchContext.
- lib/research-candidates.mjs:3 / researchCandidates.
- lib/recommendations.mjs:10 / validateRecommendations.
- public/recommendations-panel.mjs:17 / recommendationHtml / original sourceAnchor.
- public/conversation-panel.mjs:30 / assessmentReviewHtml.
- lib/psi26-report-evidence.mjs:25 / psi26ReportRows / psi26ReportFragments.
- lib/study-evidence-sorting.mjs:4 / prioritizeStudyFragments.
- lib/reviewed-normalization-evidence.mjs:12 / augmentReviewedStudyEvidence.
- lib/experiment-tables.mjs:25 / normalizeTable / source quarantine.
- lib/numeric-matching.mjs:49 / matchExperiments / physical-trial collapse.
- lib/parameter-support.mjs:5 / sourceParameterCandidates / per-field provenance.
- lib/parameter-diagnostics.mjs:5 / parameterDiagnostics / unresolved and quarantined context.

FIF-051 covers the literal content trust/selection pipeline, FIF-052 candidate clarity/review semantics and FIF-053 reviewed numerical adapters. docs/SOURCE_CONTENT_041.json records current source hashes, evidence and explicitly pending stages. Source line numbers are entry points for this snapshot; the release owner freezes/indexes the final source after handoff.

Meaningful tests: tests/source-content-index.test.mjs, source-content-loader.test.mjs, source-content-manifest.test.mjs, research-source-context.test.mjs, recommendation-clarity.test.mjs, recommendation-recovery.test.mjs and reviewed-normalization.test.mjs. The full filenames are under tests/. The independent known-passage panel, raw receipts and two generic-query failures are under qa/release-0.4.1/content-benchmark/. Reviewed original-source audit/field links are under qa/future-0.4.1/normalization/.

This guide is not the complete block/parent/function/loop index. See release verification and publication receipts inside Developer Patch; the release owner completes browser/PDF/EXE/archive/index checks before delivery. No runtime-loaded source identity is inferred from a later reconstructed file, no pending receipt is called passed and no syntax-derived description substitutes for semantic review.
