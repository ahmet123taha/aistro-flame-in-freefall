# Gravity input amendment within 0.3.8

The user explicitly requested adding this change to the current release without a new version. The initial 0.3.8 ZIP and EXE identities are retained in Verification/before-gravity-publication-receipt.json; the delivered amended package has its own manifest/hash. Earlier live tests retain their original source identities and are not relabelled as tests of this amendment.

## Behavior and unit authority

- Bare 1.96 means 1.96 m/s².
- 1.96g, 1.96 G and 1,96G mean 19.221034 m/s².
- Standard gravity is exactly 9.80665 m/s², per NIST SP 811 Appendix B.9: https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9 . It is a conventional unit, not a claim about measured gravity at every Earth location.
- Optional explicit m/s², m/s2 and m/s^2 suffixes, zero and scientific notation are accepted. Empty remains unknown. Malformed units, nonfinite values, negatives and values above the existing 1000 m/s² limit are rejected before a request. The limit is checked after conversion.
- The same parser feeds research and specialist numerical request paths. API/model fields stay numeric m/s². No research weights, source data, matching algorithms or model selection changed.
- The original text is saved separately from canonical conditions, restored on chat switching/reload, and copied by New chat with these inputs. New empty chats remain empty. No second conversion occurs on restore.

## Severity, verification and limitations

D038-07 is HIGH because a unit misunderstanding changes scientific inputs by a large factor. Five new meaningful unit/persistence tests bring the full suite to 297 passed tests. The controlled browser test uses synthetic dialogue and no real Google calls; request receipts prove the SI values used by the model-request builder. The release includes its own exact-EXE portable verification and source/block index. Earlier 20-call live source-discovery evidence remains separate. Physical tolerance calibration, broader parsing, clean second-machine review and NPR Class C assurance remain open.
