# Flame in Freefall development contract

The user selected the NPR 7150.2D Class C engineering target. The source PDF and official revision are recorded in `docs/standards/source-record.json`. This instruction does not establish NASA approval or completed compliance.

For every behavior change:
1. Identify the relevant FIF requirement in `docs/requirements.json`; add a requirement if needed. The user's 14 November instruction expanded scope to the fixed Veri_Seti package and official non-PSI supporting documents. AI context covers selected metadata/supporting web text; not all numerical files are parsed.
2. Update requirement → design/code → meaningful test → test-evidence links together. Do not add artificial tests for low-impact wording changes.
3. Record reason, behavior, verification and limitations in `CHANGELOG.md`. Do not attribute old evidence to a new version; retain version/hash/date.
4. Update the relevant NPR row in `docs/standards/class-c-matrix.json` and CSV. Do not close it before all conditions/evidence in the complete text are satisfied; do not invent tailoring/approval.
5. Record new defects/risks/nonconformities in `docs/risks-and-gaps.json`; close resolved items with test evidence. Do not erase previous-version records.
6. Run `npm test`, source syntax checks, `npm run build:portable`, `node scripts/verify-portable.mjs` and browser verification of the changed screen. The last tested EXE hash must match the delivered EXE. Record source inventory and release manifest.
7. Do not put keys in the EXE/source/test fixtures/logs/manifests. The DPAPI-encrypted user record stays in LocalAppData; sharing uses an explicit file allowlist. Packaging does not delete the local user's key.
8. Tests make no real Gemini calls unless the user requests a new live trial. The existing permission covered one 3.1 Flash-Lite trial, already consumed. Do not add automatic retries or expensive fallback on model/quota errors.
9. The dataset-maintenance agent owns `Desktop/Spaceapps/Veri_Seti` and data manifests. The dashboard does not move/delete these data; the user's 0.0.1 packaging instruction authorizes a read-only application index and supporting documents.

Independent human review, formal classification/assurance and missing standards evidence may remain open; do not represent Class C as complete. Rust conversion has not occurred; the current executable uses Node SEA.

## Distribution reports — user instruction of 14 November 2026
Do not leave reports, defect/extraction logs, verification manifests or code indexes as loose files in sharing/delivery folders; deliver them inside the relevant release/patch ZIP. Do not give the user a report-PDF link outside the ZIP. Temporary production files and editable sources may remain in the development workspace; do not delete a loose copy before the shared ZIP copy has been read back and SHA-verified.

Current package structure: `SpaceApps1-<version>.zip` contains exactly two sibling top-level directories: `SpaceApps1/` (working application, usage/license files and a short transition summary in `Patches/Changes.txt`) and `Developer Patch/` (detailed transition PDF reports, added/fixed/open defects with severity, reasons, old/new sources, code diffs, code index, test and package verification records). Do not create a separate reports ZIP or a patch ZIP nested inside the application. Place reports with their target release; explicitly retain the source-package identity of earlier tests and hashes. The fixed dataset remains a separate ZIP. Historical workspace backups are not distribution outputs.