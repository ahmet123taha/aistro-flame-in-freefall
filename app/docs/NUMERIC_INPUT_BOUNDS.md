# Input-error bounds for numerical closeness — 0.1.10

FIF-028. Previous direct matching used nominal closeness between actual values without measurement-error effects on scores. This release does not complete physical calibration of weights or risk thresholds. Matching-material/specimen and known-source-measurement requirements remain.

## Definition and derivation

Let the source nominal value y be fixed, the user value x, and explicitly supplied absolute error h. Error units equal input units; concentration error is percentage points, not relative percent. Input interval: [x-h,x+h]. Closeness s(x,y)=100 min(x,y)/max(x,y); s(0,0)=100.

For y>0, s increases when x<=y and decreases when x>=y. The minimum is the smaller endpoint value. If the interval includes y, maximum=100; otherwise it is the larger endpoint value. For y=0, s=100 at x=0 and 0 for positive x; this discontinuity is preserved when the interval contains zero. No random sampling or Monte Carlo is used.

Total lower/upper bounds sum each positively weighted parameter's lower/upper closeness × weight/100. Categorical material contribution is fixed with no assigned numerical error. A box allows parameters to vary independently; correlations may make the attainable total narrower. This is not a guaranteed physical confidence interval.

Example: source g=4, user3.9±0.2 → nominal97.5, interval92.5–100. Gravity weight20 and exactly matching O2 weight80 with explicitly zero error → nominal99.5, total98.5–100. These are arithmetic-test weights, not a recommended combustion model. Uniform unit scaling preserves results; offset conversions such as Kelvin/Celsius do not have this property, so temperature remains Kelvin.

## Missing and invalid data

Blank error is unknown; zero counts only when entered explicitly. No total error interval unless every positively weighted numerical parameter has an input, source counterpart and error bound. Nominal score and missing-data score interval remain unchanged. Zero-weight fields do not block this gate. Source measurement error, rounding and model error are unknown; the interval is conditional on fixed source nominal values.

Reject negative/infinite/textual errors, unknown fields and errors without nominal values. Strictly positive quantities cannot have intervals reaching zero; concentrations remain0–100 and gravity/flow nonnegative. Physically invalid intervals are not silently clipped or intersected with physical bounds; the user must correct them. Nominal ranking stays unchanged; interval overlap does not establish a definitive order, critical risk or safe class.

## Implementation and evidence

`lib/numeric-uncertainty.mjs`: field validation, analytic extrema and summation; `lib/numeric-matching.mjs`: contributions; `lib/corpus.mjs`: HTTP request; `public/app.js`: optional input section, method change/reset; `public/numeric-card.mjs`: visible input interval/detail table. JSON exports preserve these fields. `lib/dataset.mjs` and `lib/gemini.mjs` convey fixed-source and unknown-error assumptions into local context; no live model call.

`tests/numeric-uncertainty.test.mjs`: analytical examples, both sides of source value, zero discontinuity, dense deterministic coverage, unit scaling, missing/zero distinction, material/data gates, physical-range rejection, nominal order, HTTP and AI context. `scripts/verify-uncertainty-dataset.mjs`: actual Nomex F1; O2=22.2±0.2 and CO2=.46±.01, test weights80/20; verify source ID/hash and conditional interval in local AI context.

This does not validate a risk model. Independent trials, source uncertainties, correlations and calibration of physical weights by material/combustion mechanism remain open.