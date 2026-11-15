# Source-trial comparison — 0.1.11

FIF-029 → `public/experiment-comparison.mjs`, `numeric-card.mjs`, `app.js` → `tests/experiment-comparison.test.mjs`, actual-source/portable/UI and JSON-export records. G-24; SWE-050/052/066. Not Class C completion or NASA approval.

## Usage and data contract

1. Match studies using material, specimen, numerical conditions and weights.
2. Add2–6 distinct runs from primary/expanded results; multiple runs from one PSI collection are allowed.
3. Opening comparison deep-copies inputs, method/weights, rows and dataset identity. Form changes clear pending selections without changing open comparisons.
4. Show material/specimen, nominal closeness, compared weight, optional error interval, source observations, individual user/trial values and contributions side by side.
5. Display document ID, page/table/row/run and SHA-256; source documents open directly. JSON includes the snapshot. Persistent session restoration is not added in this release.

Score unchanged: `s(x,y)=100 min(x,y)/max(x,y)`; two zeros give100. Contribution=`w*s/100`. Example3.9 versus4→97.5%;20% weight→19.5 points. Missing fields are not reweighted; no overall percentage without weights totaling100, all positively weighted source/input values and material/specimen gates. User weights are not material-specific physical-risk coefficients.

## Identity and scope

Use source+physicalTrialKey when physical identity is verified; otherwise source+runId+file+page+row. Do not merge unresolved same-name records without evidence. The module does not deduplicate every physical run in the archives. Select only source-identified normalized runs in the current matching response; unreturned rows are not fetched automatically. Aggregate boundary/transition views remain separate.

## Interpreting observations

- SIBAL: separate quenching, blowoff, no-blowoff and no-ignition. Show changing-flow endpoints without inventing an average. Nominal oxygen is not a simultaneous critical-event reading. No-ignition may include brief flashes; no-blowoff is not a threshold.
- PMMA: separate measured/untracked spread velocities and stages. Missing speed is not zero. Initial/final trial oxygen is not distributed across stages.
- Nomex: separate no sustained flame, brief ignition/flash and unknown brief ignition. Do not display disputed final O2 as valid measurement. These are not general nonflammability classifications.
- Unknown when no normalized outcome exists; absence of observation is not absence of burning.

Runs may differ in material, geometry, flow direction, specimen history or measurement timing. Selected outcomes are not a controlled experimental pair or a random statistical sample. Outcome frequencies do not establish fire probability, safe/critical thresholds or causality.

## Actual sources and verification

BASS-II report f24951, PDF104 Table7.1; SHA256 `5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770`. SIBAL GMT175-T18:O2=17.4, flow5→2.6cm/s, quenching. GMT175-T9:O2=16.4, constant10cm/s, table no-ignition. GMT178-T17:O2=16.9, flow6→53cm/s, no-blowoff. With only O2 test-weight100/input17.4, nominal scores100,94.25287356,97.12643678. This test weight is not a physical recommendation.

121 unit tests;9 real-data scripts; portable asset/MIME/hash checks. UI:3 selected runs, separate tab, saved17.4 versus later20, JSON export. Clean second-computer and live-model-response quality were not tested. Source files read-only; no actual provider calls.

EBUSY occurred during build; the failed intermediate file was rejected by the hash gate. Added bounded10-second retry for EBUSY/EPERM only when writing the final PE. The final EXE required0 retries; the retry branch was not separately force-tested. External lock cause remains undetermined.