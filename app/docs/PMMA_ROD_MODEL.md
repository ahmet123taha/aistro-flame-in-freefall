# 0.1.4 — PMMA rod feature comparison using a source equation

FIF-022. This mode is not a general flammability or critical-safety classifier. Direct condition comparison from0.1.3 remains; users can separately choose forced stretch or total stretch. Normal-mode user weights do not apply to these modes.

## Source and scope

Olson and Ferkul,2015, *Microgravity Flammability of PMMA Rods in Concurrent Flow*, NASA NTRS20150008961, PDF7, Section3.4 and Table1. https://ntrs.nasa.gov/citations/20150008961 was reverified live on14 November2026. Local f45 SHA-256:8cee8a023d9f0aab214996ebaeefb842080b0c935ba9e01db0096a47379519f7. Formula/table checked against the page image.

Cast PMMA rod with axial concurrent flow, approximately hemispherical tip and microgravity. Tested nominal diameter6.35–12.7mm. Table1 radii0.318,0.476,0.635cm yield diameters6.36,9.52,12.7mm, preserving source rounding. Intermediate diameters lack independent validation. A positive numerical g blocks this microgravity reference because validity at that g is unverified; no numerical threshold is invented. Regime is user-declared, not sensor-verified.

Table1 contains authors' stretch estimates for three representative tests near the Figure2 extinction boundary. It lacks raw flow and O2; these are not reverse-calculated and presented as measurements. Three rows do not replace the full24-test series. The third total8.68 is preserved despite3.31+5.38=8.69, retaining source rounding.

## Equation and units

R = D/2. Sourceta U cm/s, R cm:

- af = (3/2) U/R.
- acurv = (3 U/R) × ((Rf-R)/R).
- a = af + acurv.

Implementation units: U in cm/s, D and Rf in mm:

- af = 30 U/D [s^-1].
- acurv = 2 af (Rf/R - 1).
- a = (30 U/D) × (4 Rf/D - 1).

Total mode requires measured Rf>R. Unknown Rf is not zero curvature. Forced mode shows only af, explaining that curvature is excluded from calculation, not deemed negligible. The source explicitly identifies curvature as significant.

## Parameter effects

Elasticity E_x=∂ln(a)/∂ln(x). Forced mode: E_U=+1, E_D=-1. Total mode: R=D/2 and H=Rf-R/2:

- E_U = 1
- E_D = -2 - R/(2H)
- E_Rf = Rf/H

Relative sensitivity share=|E_x|/Σ|E|×100. Shares describe local change in the calculated feature, not combustion-risk weights or experimental importance. Oxygen's absence from the formula does not imply irrelevance to fire. Large input changes require the full equation, not linearization. Check positive U,D and Rf>R in total mode.

Closeness=100 min(a_user,a_source)/max(...) for the selected stretch feature only. Diameter closeness is separate and not secretly added. Increasing flow and diameter together may preserve af without equal heat loss or combustion. Diameter differences are explicit. No critical threshold or user extinction boundary is generated.

## Verification and traceability

59 tests: U/D unit conversion, scaling, curvature, independent central-log-difference checks of derivatives, wrong material/manufacturing/geometry/direction/gravity gates, source identity, rounding and UI limits. Three references load after actual f45 hash verification. U=.5cm/s,D=6.36mm:af=2.358490566; source2.36→99.9360409%. Rf=5.6mm total mode→99.3012166%. This example is not risk prediction.

Source page, equation, user assumptions, calculation, sensitivities and limitations enter local AI context; tests make no model call. Missing/corrupt source disables physical references. Fixed Veri_Seti is unchanged. Progress links to NPR SWE-050/052/066 evidence, not Class C approval.

## Open work

Broader energy/kinetic models by combustion regime/material, physical material properties, independent trial panels and threshold validation. Local sensitivity shares do not complete these tasks. Multiple representations of the same study are not independent validation samples.