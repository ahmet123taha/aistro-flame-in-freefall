# SIBAL transition-observation review — 0.1.8

FIF-026. Display physical condition differences from quenching/blowoff observations without turning general similarity into a critical-fire class. Source: BASS-II Summary Report, NASA NTRS20210011385; PDF104 Table7.1 and commentary PDF106,108–109. Hash pinned in `lib/sibal-evidence.mjs`; PDF108–109 visually reviewed in this release.

## Scientific scope and limiting evidence

At low flow the source describes reduced pyrolysis/heat release, growing radiation then conduction losses, and three-dimensional transfer near extinction. These qualitative relations do not supply fixed linear risk weights. PDF108 explicitly says only part of the22mm boundary could be drawn and the12mm extinction boundary was unresolved. Retain the inability of the velocity-changing method to determine the low-oxygen floor accurately. Figure7.7 was not digitized into a new fit.

Among31 rows, the transition group with no stated reuse—but not verified fresh—contains6 quenching,1 blowoff and2 no-blowoff records.22mm:4 quenching,2 no-blowoff;12mm:2 quenching,1 blowoff. Width groups remain separate. Absence of a reuse statement does not establish freshness. The new mode does not apply to a reused user specimen.

Require source nominal SIBAL construction/environment:75% cotton/25% glass fiber, solid fabric, concurrent flow, microgravity, established flame, thickness.32mm, areal density18.2mg/cm², initial exposed length100mm, pressure101.325kPa. Changed nominal values do not transfer the boundary. Equality tolerance1e-9 is floating-point tolerance only, not measurement tolerance. Source thickness is approximate; selecting nominal construction is not material certification. Experimental window U1–55cm/s and O2 16–21% is not a validated prediction domain.

## Calculation

For each event: `deltaOxygenPp=userOxygen-reportedNominalOxygen`; `deltaAirflowCmS=userFlow-finalReportedFlow`. Initial flow is shown separately. Final flow is the reported event condition; endpoints are neither confidence bounds nor two steady stages. Positive differences do not automatically identify a burning/safe side.

Within each mechanism, calculate Pareto layers on the two absolute differences: a point is dominated if another is no worse in both and strictly better in at least one. The first layer shows nearest candidates without an arbitrary combined weight. Positive unit scaling preserves layers. Layer1 is not hazard level1; quenching and blowoff share no common risk ranking. Separate min/max closeness percentages appear in details and are not summed.

With absolute O2/flow error bounds, test whether the user's rectangular measurement box contains the source event point. Blank is not zero; explicit zero is allowed. If any box portion leaves the experiment window, do not clip; review remains uncertain. Source measurement error is unknown, so overlap is not statistical confidence or a calibrated critical class. Distance from a point cannot establish safety.

Final velocities with no blowoff are neither blowoff thresholds nor numerical lower bounds; exclude them from event ranking. With no observed transition, show No transition observed rather than0, which could imply zero risk. The plot contains only points, the user marker and error box; no interpolation line.

## Tests and release provenance

`tests/sibal-transitions.test.mjs`: nominal scope, source changes, width/mechanism separation, Pareto ties/unit invariance, measurement-box limits, unknown error, out-of-window input, explicit zero error, request validation and UI semantics. `scripts/verify-transitions-dataset.mjs`: actual hash-verified report and local AI context. No live model call.

AI context explicitly labels a derived observation review rather than a raw row. Preserve all source/semantic warnings. Earlier PMMA modes and user-weighted direct comparison remain separate.

Independent SIBAL physics, model/measurement-error distributions, general critical classification and physical-run identity resolution remain open. This release does not represent them as complete.