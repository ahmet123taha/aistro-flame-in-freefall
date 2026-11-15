# Gas stoichiometry — 0.1.14 / FIF-032

This method compares stoichiometric mixture fraction between two binary streams in CFI-G ethane, propane and butane trials. It is not a general fire-risk model. Direct numerical-condition/user-weight comparison remains separate.

## Source and scope

- Local f800: Flame Design SRD v1.3,1 April2010, PDF8 Equation1.1. SHA256 e783fc0da3d388b567654c109b2595a5a74218de6ccd641241f13b091a5448eb. https://www1.grc.nasa.gov/wp-content/uploads/Flame_Design_SRD_20100401.pdf
- Local f14515: ACME/CFI-G Final Report2022,21 November2022, PDF3,31. SHA256 f6cce7cc08ca69c155994d7a8898e21cd4aba122f4e46d5e00708e4889a1ebab. https://psi.nasa.gov/physci/repo/data/investigations/PSI-159
- Fixed nominal atomic weights, CIAAW abridged2024:C12.011,H1.008,N14.007,O15.999. https://ciaaw.org/abridged-atomic-weights.htm. Isotope-variation uncertainty is not propagated.
- No result before both PDF hashes and CFI-G CSV gates pass. Of179 normal and154 inverse rows,331 have valid composition/Zst;2 zero-fuel rows are outside model scope.
- Users must specify N2 as the remainder in both streams. Unknown/other diluents are rejected. Normal/inverse configuration and fuel family must match. The CFI-G report notes ambient N2 is nominal and products may accumulate; this is a pure binary approximation, not a complete reconstruction of the actual atmosphere.

## Calculation

For fuel CcHh, nuO2=c+h/4; s=nuO2*M(O2)/M(fuel).
For mole fraction x: YF=xf*MF/[xf*MF+(1-xf)*MN2]; YO=xo*MO2/[xo*MO2+(1-xo)*MN2].
Zst=1/(1+s*YF/YO). The equation is sourced; an independent mass-balance test reproduces it.
EF=dln(Zst)/dln(xf)=-(1-Zst)*MN2/[xf*MF+(1-xf)*MN2].
EO=dln(Zst)/dln(xo)=+(1-Zst)*MN2/[xo*MO2+(1-xo)*MN2].
Local effect share=100*abs(Ei)/(abs(EF)+abs(EO)). These are local relative sensitivities of Zst to its two inputs, not general similarity weights, fire risk or large-change predictions. Omission of pressure/temperature/flow does not imply zero physical importance.

Compare source/user Zst computed with the same model using100*min/max. Preserve reported source Zst separately. Show individual composition closeness too; different compositions can yield Zst100. This is not full-condition equality. Do not replace actual stream Xf with the source fuel-cylinder label.

## Example and verification

Normal butane, fuel25%,O2 39.57%→21102A1. Computed Zst0.2262938056; printed source0.226286935. YF0.408845997;YO0.427894829;s3.578332530. Local derivatives−0.609839352,+0.732486041; shares45.43155895%/54.56844105%.
Maximum computed/printed difference across331 rows:0.0000321398954. The0.00004 test limit is a regression bound for current-source consistency, not experimental measurement uncertainty/tolerance.
Eight new tests: independent mass balance, finite-difference derivatives, scope gates, printed/computed distinction, equal Zst/different composition, inverse-field semantics, independence from user weights and UI contract.148 total tests and12 real-data checks passed. Provider calls0. Final EXE/UI and source-hash verification in AI context performed; no claim that the entire dataset is parsed.

## Open engineering work

Mass flow, combustion products, ignition protocol, independent scientific review and general-risk calibration remain open. Rust conversion and NPR7150.2D Class C evidence are incomplete. The package is the current Node SEA executable.