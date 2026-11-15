# PMMA experimental extinction curve — FIF-024 / 0.1.6

Source: NASA/TM-20210011385, PDF83–84 (printed75–76), Equation6.1, Figures6.9–6.10; experimental methods PDF74–76. f24951 SHA `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`. Pages83–84 visually reviewed. The local NTRS copy has not been proved byte-identical to the inaccessible PSI binary. No new source download or fixed-dataset change.

## Calculation

U cm/s, D mm, r=D/20 cm, r0=0.318 cm:

`a=(3/2)(U/r) sqrt(r/r0)`; `Xb=6 exp(-0.5a)+0.0167a+13.4` (%O2 by volume).

The 2021 normalization adjusts across diameters and is distinct from the 2015 unnormalized `af=30U/D`. `Δ=Xinput-Xb` is displayed in percentage points, not a general similarity/risk percentage. Numerical boundary closeness uses min/max in secondary details and is not used for hazard ranking.

The curve empirically fits the source boundary between sustained and extinguished previously established flames. It is not ignition probability. Above/below refers only to that fit. No safe/nonflammable decision is made for the actual user scenario. Raw experimental points have not been invented from the graph.

## Inputs and applicability limits

Cast PMMA rod, hemispherical tip, concurrent flow, microgravity; diameter6.35–12.7mm. Explicit established flame, N2 diluent and boundary-state O2 are required; initial O2 is not accepted. The working window a1–150s⁻¹ and O2 13–19% is a selected view of source plots, not independently validated scope. Intermediate-diameter normalization follows the source formula, not new trial validation. No independent transfer evidence for ambient temperature/pressure or material grade.

## Minimum and sensitivities

`dXb/da=-3exp(-0.5a)+0.0167`. Minimum `a*=2ln(3/0.0167)`; these coefficients give minimum O2 approximately13.607. Coefficients are not adjusted to force the source's approximate13.5 prose value.

`∂Δ/∂X=1`; `∂Δ/∂U=-(dXb/da)a/U`; `∂Δ/∂D=(dXb/da)a/(2D)`.

The flow effect changes sign across the minimum. Display dimensional derivatives and `x∂Δ/∂x`; do not use logarithmic margin elasticity that diverges near Δ=0. These derivatives are not fire-risk weights.

## Uncertainty box

Three user measurement-error bounds: O2±percentage points, U±cm/s, D±mm. Blank is not zero. Evaluate the full rectangular box by interval arithmetic without correlation information; no statistical-independence or probability-distribution claim.

a_min=a(Umin,Dmax); a_max=a(Umax,Dmin). Find Xb extrema at both endpoints and a* when inside. Δ interval: `[Xmin-Xbmax, Xmax-Xbmin]`. If it includes zero, report source-boundary overlap / review required. Unknown model/fit error is excluded; no coefficient confidence interval is invented. If the box leaves scope, do not clip it or assign a position class.

## Verification and open work

`tests/pmma-boundary.test.mjs`: normalization scaling, printed coefficients/minimum, central-difference derivatives, minimum-containing interval and independent441-point scan, missing/out-of-range error box, source/material/state gates, schema and screen labels. `scripts/verify-boundary-dataset.mjs`: actual source hash, result and local AI context.

This verifies implementation of the source fit; checking against the same source is not independent experimental validation. Next: parse independent trials, quantify fit error and validate by material. SIBAL Table7.1 and Nomex no-ignition observations are separate material evidence, not inputs to the PMMA curve.