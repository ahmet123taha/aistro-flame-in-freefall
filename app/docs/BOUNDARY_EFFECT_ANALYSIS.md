# Finite parameter effects in the PMMA source equation — 0.1.12

FIF-030 / G-25; SWE-050/052/066. `lib/pmma-boundary.mjs` → `tests/boundary-sensitivity.test.mjs`, `scripts/verify-sensitivity-dataset.mjs`, portable and UI evidence.

## Source versus derivation

NASA BASS-II Summary Report, NTRS20210011385, PDF83/printed75 Equation6.1. https://ntrs.nasa.gov/citations/20210011385. Local f24951 SHA256 `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`; byte identity between the NTRS copy and inaccessible PSI binary remains unproved. Source page visually checked; equation/units match PMMA_BOUNDARY_MODEL.md. New effect shares are application-derived calculations, not a published source table.

`a=1.5(U/r)sqrt(r/r0)`; r=D/20cm, U cm/s, r0=.318cm. `B(a)=6exp(-.5a)+.0167a+13.4`. Output `Δ=X-B(a)`; X oxygen volume percentage, Δ percentage points. Not a high/low fire-hazard class.

Source scope: cast PMMA, approximately hemispherical rod tip, concurrent flow, microgravity, established flame, N2 dilution and boundary-state oxygen. D6.35–12.7mm; selected plotting window a1–150s^-1/X13–19. The window is not independent validation. Wrong material/measurement timing or changed source hash blocks calculation.

## Calculation

1. Choose equal relative step p=.01–10%, default1. An analysis setting, not a physical threshold, sensor uncertainty or operational recommendation.
2. For each x_i, h_i=x_i*p/100. Recalculate Δ over[x_i-h_i,x_i+h_i] with the other inputs fixed.
3. Oxygen's effect is linear. For U,D compute monotonic a bounds; evaluate B endpoints and interior minimum `a*=2ln(3/.0167)` where present, rather than endpoints alone.
4. `E_i=max(|Δ_min-Δ_nom|,|Δ_max-Δ_nom|)` in percentage points. If the full interval is valid, show `P_i=100 E_i/sum(E)`. This is deterministic individual-effect share, not a statistical Sobol index or experimental importance.
5. Show local linear approximation `(∂Δ/∂x_i)*(±h_i)` and maximum endpoint deviation. This is not global model error or a confidence bound.
6. Separately calculate the analytical interval for the joint three-input box. `sum(E_i)` is not the full joint effect because interactions are nonlinear.

Do not clip an interval outside the source window. Withhold that row's effect and all shares; other known effects remain visible. Do not renormalize the remaining two to100%. Check the joint box separately. Source measurement/fit errors and input correlations are not quantified.

## Why not fixed weights?

`B'(a)=-3exp(-.5a)+.0167` changes sign. `∂Δ/∂U=-B'(a)a/U`; `∂Δ/∂D=B'(a)a/(2D)`; `∂Δ/∂X=1`. The same velocity change moves Δ in opposite directions on the two branches. At the minimum, zero first derivative does not remove finite-step higher-order effects. Base oxygen and chosen step also change normalized shares. Therefore shares are not automatically copied into general-condition similarity weights.

Temperature, pressure, gravity and material properties are not free variables here. Their omission means the model does not quantify their effects, not that they are irrelevant to fire. Other materials need their own source models. General material-specific flammability and critical-threshold validation remain open.

## Check examples

D9.52mm,X15,p1:
- U.5cm/s→a1.9277212156; effect shares O2=82.07215226,U=11.95119220,D=5.97665554. Increasing velocity changes Δ by+.0216301074pp.
- U10cm/s→a38.55442431; shares93.93656732/4.03212344/2.03130923. Increasing velocity changes Δ by-.0064385844pp.
- a=a*,p10: velocity derivative approximately0 but finite-flow effect magnitude positive. Zero first derivative does not imply no effect.
- D6.35mm,p1: lower diameter endpoint outside scope; no overall shares.

These verify calculations against the source equation, not an independent trial panel.131 tests include10 new cases, independent deterministic-grid comparisons of analytical intervals, source/HTTP contracts and AI context.10 real-data scripts, portable/UI checks passed; no provider calls. Corrected UI wording that could be confused with measurement error and retested the final EXE. Neither the overall project nor NPR Class C certification is complete.