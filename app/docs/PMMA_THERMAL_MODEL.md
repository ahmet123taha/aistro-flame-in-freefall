# PMMA rod energy balance — 0.1.5 / FIF-023

Source: Olson and Ferkul, NASA NTRS20150008961, PDF4,8–9. Dataset f45 SHA-256 `8cee8a023d9f0aab214996ebaeefb842080b0c935ba9e01db0096a47379519f7`. PDF8–9 visually verified; formulas were not taken from corrupted text extraction. Page4 α=1.2e-3cm²/s agrees with earlier review/current text. The model requires verified f45 references and the PMMA-rod applicability gate.

## Inputs and assumptions

Measured solid-surface regression Vr(mm/s), thermal length L(mm) from hot tip to ambient-temperature boundary, ambient T∞(K), and explicit quasi-steady profile assumption. Vr is not flame-spread velocity; L is not rod diameter or arbitrary specimen length. Source example L=59mm, Ts=300°C=573.15K; λs=.00209W/(cm K), α=.0012cm²/s, ρ=1.19g/cm³, Lvap=1700J/g, ε=.85. Preserve printed σ=5.729e-12W/(cm² K⁴); do not silently replace it with the current SI constant. These are not measured properties of the user's specimen.

## Equations and numerical stability

Convert L and Vr to centimeter units. Pe=L Vr/α.

θ(Y)=[exp(-PeY)-exp(-Pe)]/[1-exp(-Pe)]; θ(0)=1, θ(1)=0. For positive conduction loss, F=|θ'(0)|=Pe/[1-exp(-Pe)].

qc=λs(Ts-T∞)F/L; qr=εσ(Ts⁴-T∞⁴); qv=ρ Vr Lvap; qrequired=qc+qr+qv(W/cm²). Loss fraction=(qc+qr)/qrequired. qrequired is not measured available flame heat flux.

Use exact F=1 at Pe=0; expm1 avoids cancellation for small Pe. dln(F)/dln(Pe)=1-Pe/(exp(Pe)-1); for Pe<1e-4 use Pe/2-Pe²/12. E_Vr(qc)=E_F, E_L(qc)=E_F-1, E_T(qc)=-T/(Ts-T); E_T(qr)=-4T⁴/(Ts⁴-T⁴); E_Vr(qv)=1. Total-flux elasticity is the flux-share-weighted derivative. These are local physical derivatives, not experimental-importance/fire-risk weights. At Vr=0, logarithmic velocity derivative remains undefined.

## Scope and classification

Require0<T∞<Ts, Vr≥0, L>0. Pe>20 lies outside source Figure5's display range and is not calculated;0–20 is not independently validated scope either. The source discusses extinction near70% loss; the application does not use that as a decision threshold, red/green class, safety guarantee or probability. No flammability validity is claimed beyond source geometry/conditions. Zero velocity is labelled a mathematical limit. Thermal calculations do not change stretch-closeness percentages.

## Verification

`tests/pmma-thermal.test.mjs`: independent SI calculation, source ODE derivative, zero/small Pe, central-log-difference derivative checks, monotonic trend, invalid/missing inputs, source gate, separation from similarity and explicit UI limits. `scripts/verify-thermal-dataset.mjs`: actual f45 hash and AI context. Equation checks using source constants do not replace independent physical-model validation.