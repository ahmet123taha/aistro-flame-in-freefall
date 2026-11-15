# SIBAL composite fabric — 0.1.7

FIF-025. BASS-II Summary Report, NASA NTRS20210011385, PDF102–104 / printed94–96, Sections7.1.3–4 and Table7.1. Source f24951 is SHA-256-pinned in `lib/sibal-evidence.mjs` and reverified on access. Table images/footnotes reviewed. Fixed Veri_Seti files unchanged.

## Added source information

31 table rows:27 BASS-II,4 BASS. SIBAL is a special75% cotton/25% glass-fiber composite; the section does not specify mass/volume basis. It is not equivalent to pure cotton, another weave or PMMA. The fabric-construction selection gates identity for a full score; it is not a contribution weight.

Nominal initial thickness approximately0.32mm, areal density18.2mg/cm², exposed length10cm, width1.2 or2.2cm. Pressure1atm=101.325kPa. ISS microgravity is not numerical0g; temperature is not invented. New areal-density/unburned-length inputs start at weight0, preserving the user's draft50/100 total. They are not calibrated physical-effect coefficients.

14 rows have constant flow. The other17 list initial/final flow; those values are not averaged, treated as two steady stages or a probability interval. Such rows have no single-flow similarity.

## Quality limitations affecting comparison

- GMT45-T1/T2 footnote b: oxygen may be inaccurate. Preserve18.5 in source observations but exclude it from numerical matching.
- Eight reuse records are explicit. Remaining unburned length and consumed material thickness/areal density are unknown; do not assign original construction as current measurements. No reuse statement in other rows is not verified freshness. A fresh selection blocks a full score for unknown history and excludes known reused specimens.
- No ignition/did not ignite, quenching, blowoff, no blowoff, one-sided flame and ignited are separate labels. Empty comments/BASS-only labels remain unspecified outcomes. No-ignition does not exclude brief flashes; Appendix A sometimes reports brief ignition followed by extinction without spread.
- Section7.1.3 treats oxygen as constant; Appendix A initial/final readings differ. Table values are nominal, not simultaneous stage measurements. Documents are not averaged into one piece of evidence.
- The0.1.6 PMMA extinction equation does not apply to SIBAL.75% cotton does not automatically imply75% combustion contribution; separate reaction/heat-transfer modeling and validation are required.

## Multiple-trial access

A study card starts with the highest selected-criterion score, with up to50 alternative candidate rows available. Total/omitted counts are explicit. Every run retains inputs, contribution table, outcome and file/page/row provenance. CSV/PDF copies are not unique trials or independent validation samples. Similar rows may have opposite outcomes; the highest score is not the whole study's result.

AI context includes the selected row and a compact SIBAL-alternative list after source hash reverification. A changed original file removes those rows from context. No live model test in this release. Overall limits remain12 sources and51 candidates per source; the complete file library is independently accessible.

## Verification and open work

`tests/sibal-evidence.test.mjs`:31 rows/series, footnotes, units, reuse, flow stages, construction/history, multiple rows, request/UI checks. `scripts/verify-sibal-dataset.mjs`: actual report, score change from10→9cm/s, alternative outcome and AI context. Portable/browser evidence is in the release package.

Independent flammability prediction, numerical SIBAL correlations, cross-source identity resolution, calibrated critical boundaries and a second clean Windows machine remain open. No NPR7150.2D Class C certification is claimed.