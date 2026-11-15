# CFI-G: gas configuration, composition and source observations — 0.1.13

FIF-031. Source scope: PSI-159 normal179-row and inverse154-row tables. Hashes are pinned in `lib/gas-trials.mjs`; dataset files undergo read-only SHA-256 verification. Normalize new semantic fields only when file ID, hash and Flame Type agree. A changed hash requires review; do not silently reuse the interpretation.

## Field dictionary

| Configuration | Source column | Application field | Definition |
|---|---|---|---|
| Normal | XO2 before test | oxygen | Pre-trial ambient oxygen mole percent |
| Normal | Xf | fuelPercent | Fuel mole percent in the burner fuel stream |
| Inverse | Xf  before test | ambientFuelPercent | Pre-trial ambient fuel mole percent |
| Inverse | XO2 | oxidizerOxygenPercent | Oxygen mole percent in the burner oxidizer stream |

Multiply source fractions by100. Do not invent values outside[0,1], ranges/RAMP/text. Post-trial values do not overwrite initial inputs. The general oxygen label is volume percent; CFI-G evidence explicitly retains mole percent. Mole/volume-percent equivalence here assumes ideal mixing, not general high-pressure accuracy. Convert approximate source pressure from bar to kPa and retain the approximate label. Tad/peak burner temperature is not ambient temperature. Mass-flow values are not added to numerical matching in this version.

## Source basis and inference boundary

NASA NTRS20070017909, *Radiative Extinction of Gaseous Spherical Diffusion Flames in Microgravity*, PDF1,3: normal configuration supplies fuel into oxidizer ambient; inverse supplies oxidizer into fuel ambient. https://ntrs.nasa.gov/api/citations/20070017909/downloads/20070017909.pdf. Used to check definitions only;2007 drop-tower results/uncertainties were not transferred to2021 CFI-G rows. Interpret existing CFI-G columns with that definition. The external publication was not automatically added to application AI context.

NASA's CFI-G description supports observations of cool flames after hot flames: https://www.nasa.gov/missions/station/cool-flames-created-during-a-first-for-international-space-station-research/. The page does not replace source-table rows. The live challenge page returned502 during this check; newly added official resources/all requirements cannot be claimed verified.

## Matching

Require matching material, gas specimen and normal/inverse configuration. A CFI-G overall percentage requires both relevant stream concentrations in user/source and positive weights for both. This minimum-comparison gate is not a physical-risk weight or critical threshold. Preserve weights totaling100 and comparability of every positively weighted field. Do not redistribute missing weights.100% pressure closeness alone cannot yield an overall score. Closeness remains100 min(a,b)/max(a,b); contribution w*s/100. No arbitrary scientific minimum positive weight was invented; tiny user weights affect the overall score accordingly. Universal fire-importance ranking is uncalibrated. Other sources with unknown configuration fail an explicit configuration filter to avoid unsupported assumptions.

Butane is now recognized in140 rows. Do not infer isomer/diluent/purity/product grade from its label; family identity does not establish an identical mixture. The0.1.12 PMMA source-equation effect analysis remains unchanged and is not transferred to gas flames.

## Outcomes

Hot ignition: Yes/No/flash distinct. Cool flame?: explicit yes/no distinct, blank unknown. Preserve SE/FT as source termination codes. Duration in seconds; blank=null, explicit0=zero. Do not invent TFP expansion or combustion-end timing outside the source. Show comments and cell/row/file provenance; escape HTML.

Actual data:7 explicit cool-yes,1 cool-no,325 unknown cool cells.21106F2/F5 have Hot ignition=No and blank cool cells but comments 'direct cool - no hot ignition'. Do not silently fill cells from comments; preserve both.21196A1/A2 have100% closeness for selected conditions yet hot ignition No/Yes differs. Do not delete differing outcomes through incorrect deduplication or convert them into risk probability.

## Verification and remaining work

140 tests;11 real-data verifiers; EXE access to35 sources/catalog, PDF/CSV SHA readback, portable/browser checks. Nine new tests cover source gates, measurement location, composition closeness, missing fields, observations and HTML/API. Actual provider calls:0. These are not scientific-model validation or NPR Class C approval. Controlled trial pairs, diluent/purity, ignition conditions, mass flow and full gas kinetics/radiation remain future work.

1592 normalized source rows do not mean every pool file was parsed. The dataset's67 missing files,2269 classification reviews and40 excluded archives are not resolved by this release.