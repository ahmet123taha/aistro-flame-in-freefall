# Per-input parameter comparison — 0.4.0

## Purpose and behavior

FIF-050 makes each entered numerical condition explainable. The comparison lists the user input, the exact indexed reference used by the unchanged scoring rule, its material and source location, absolute difference and awarded condition points. Missing evidence is shown as unassessed with a specific reason. Blank inputs are excluded; a real zero remains a value. A reported marginal span retains its span/coverage meaning; any nearest discrete point is shown separately. Context from another material earns no requested-material credit.

The shared sourceParameterCandidates helper drives both parameterSupport and parameterDiagnostics. Nonfinite/negative candidates and reversed spans cannot be selected. The formula remains 100 × min(input, source) / max(input, source); a source-reported marginal span receives the existing discovery-coverage credit when the input lies inside it. Neither rule is a calibrated physical tolerance or a claim that an intermediate condition was measured. No valid numerical weights, scores or sorting were changed.

## Reported PSI-26 case

The numerical-only reproduction uses pure cotton, gravity 1.96133 m/s² (0.2 g), ambient temperature 300 K, oxygen 30 % vol and gas velocity 15 cm/s. Pressure and thickness are blank. Four inputs are provided and zero can be assessed: numerical gravity and ambient temperature are not indexed, oxygen has an unresolved source scale, and AIR readings are instrument settings rather than verified specimen-local velocity. The output has no parameter percentage; all 60 condition points remain unassessed. This is not 0% similarity. Cotton is not the SIBAL cotton/glass-fiber composite.

The original As Run_Test Matrix.xlsx is f24955, SHA256 850910541fc9c802d00aa9de14758205103642184249b419c09868df2fbea6e8. The raw oxygen examples include AA4 = 0.221 and AA7 = 0.219 under the O2 % by volume heading; their scale is not resolved by this release. AIR examples include “10, 5” and “10, 5, 3”; these are not cm/s measurements. Across indexed source materials, 121 pressure rows span 98.28525–102.20759407894737 kPa, but blank pressure earns no points. A separate SIBAL/99 kPa browser regression exposes the 98.9452 kPa reference at AB41. See qa/release-0.4.0/reported-psi26-case.json and qa/release-0.4.0/browser-review.json.

## Verification and evidence identity

321 local tests passed, with zero failures in the retained log. The 20 offline cases retain 19 actual successful 0.3.8 provider answers plus one recorded upstream 503 recovered through independent local search. These are not 20 new successful model answers. All 20 intended sources remain discoverable; the 16 numerical cases retain their 0.3.9 scores (97.57–99.94% parameter proximity), and the four context-only cases receive no imaginary percentage. Seventeen original files were SHA256 checked. Twenty wrong-material controls and seven independent sweep/contrast probes passed. The probe results concern arithmetic/source eligibility, not equal burning.

The controlled browser used 24 mocked requests: 20 recorded cases plus four regressions. The final narrow layout stacks input/reference/result/source cards and uses the outer page scroll. The recorded main width and scroll width are both 815px; table height and scroll height are both 1258px. No internal/horizontal overflow was observed in that case. Screenshots: qa/release-0.4.0/comparison-supported.png and qa/release-0.4.0/comparison-unassessed.png. No new API call or scientific validation occurred.

## Source files behind the reviewed benchmark

The table records the exact original-file identities verified by the offline benchmark. It does not assert exhaustive parsing of every source section/table. Full locations, row/cell/page references and case results remain in qa/release-0.4.0/benchmark-recheck.json.

| File ID | Original filename | SHA256 |
| --- | --- | --- |
| f896 | efee0c2029a1dce29b15__PSI-10_Experimental table_Flame Design_Normal Flame.csv | 4a663292bd3f65201943cc71bd661a70383639276a9176f64105b285bf0b6deb |
| f15150 | ec14a2adff59880e3689__PSI-20_Experimental table_ACME BRE.csv | 4aa5d3f98708ceacced5c620d46858b9965f8d4d941b203229f46467d53e5ab7 |
| f22719 | e83dd676eacb889337f2__PSI-23_Experimental table_ACME s-Flame.csv | 16cd10f50bd2e962887c8eb4077e5a9b3e790c78de8e0361c0b77e19300be7cf |
| f24946 | d67804d816f7429c7fc3__PSI-25_Experimental table_BASS-II.csv | 71e792bf6b5fb5ea620c5dd70fbbac05515992e12aefcf5dff47312caa48c042 |
| f24951 | 6924805f7f6aa6a83021067c__PSI-25_Reports_BASS-II Summary Report.pdf | 5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770 |
| f24955 | 0617e9852d10035a8948__PSI-26_Science Documents_As Run_Test Matrix.xlsx | 850910541fc9c802d00aa9de14758205103642184249b419c09868df2fbea6e8 |
| f34162 | 19f75f17c3f8def65f77__PSI-39_Analyzed Data_FLEX-1393_Summary.pdf | 2620445e3885e766c211612638a80535767e644c28b83459979efdf9f3889154 |
| f36766 | b77f8ff963055799368e__PSI-68_Experimental table_Flex2.csv | cc57ad1bd9977aa13e7ac6c3aa618303012686e232b36c052c6a9f1a74e5f528 |
| f50351 | 785ee2ece0f33319e2a4__PSI-69_Experimental table_FLEX.csv | 37c88ce8ae9391b7544ff630a45ce87543d04d317cdbfbed104fe7d5c27e1b96 |
| f51120 | e55411e2e3e202af673a__PSI-98_Experimental table_SAFFIRE-1.csv | c01f29c62455f0a3b512290ab85e5687ecded326733189f002f580368402308d |
| f51147 | fc299b8d9af1d673c3d5__PSI-99_Experimental table_SAFFIRE-2.csv | 3c24390b9ef86f3d1ebaab911a1a3cc95a8759aebf42062371370e6d4b31b8ac |
| f3288 | 836806daf359cc9a4b7c__PSI-100_Experimental table_SAFFIRE-3.csv | 4d3c717ec20dd0247db670b2784a9fd7d746788bc54a936f80693e48eb8cd117 |
| f3433 | f06b2800681b8f9a3b1e__PSI-101_Experimental table_SAME-R.csv | 87164b7dc9168a4273c159f7a9f23699afbd06ad97b77974377e79b9bf8a3bef |
| f3553 | d928d882b07b5b75fe89__PSI-102_Experimental table_SAME.csv | 268d1e121d2f211b124407dd32b9475617bd269ede2c2d1749441da3e949a2af |
| f11467 | 563debb8270d83134a8c__PSI-107_Experimental table_Spice.csv | fb0d7e60cf5367afb429089e9901d27288f78038efd26c8de1db4fbe04117136 |
| f11554 | 1cfed08a36d8388387ac__PSI-117_Analyzed Data_PROCI_2023_C12_Extinction_Diameter_vs_pressure.csv | 4ab6f8c19f40a3349096eab8bdceb0a62611020af15e63f816922b149cfa7001 |
| f12313 | 87c436a97880a38c5de4__PSI-159_Experimental table_CFI-G_Normal Flames.csv | d95a621c3fbd27d204dd32ed29fa17d68f2b779d6a523cde8479ed7ebaa5251a |

## Risks, pending work and delivery boundary

D040-01 (HIGH) addresses misleading interpretation of unassessed inputs; D040-02 (LOW) addresses readability; D040-03 (HIGH) protects candidate validity. G040-01 remains open: the index is not every report, section, table or graph. Relevant omitted findings, source-context coverage and recommendation semantics belong to the separate 0.4.1 work. The present explanation says “not indexed”, not “absent from the entire report”. Third-party Material_Sensitivity remains applicability-only, outside PSI experiment/citation/score/recommendation evidence.

G040-02 retains the release and scientific/assurance limits. The exact rebuilt EXE is verified: SHA256 b87a34b5aca083a38250af4eab267ca1015871db8b37bafbaae0c7758011e54d, 102982144 bytes. The actual-dataset sidecar check also passed (11 profiles, 22 verified dependencies, no external research IDs or score adjustment); both receipts report zero provider calls. Final source inventory, full code index and ZIP readback receipts are pending the release owner's completed chain; their future paths are listed as pending in the JSON and are not cited as passed evidence here. Reports and indexes belong inside the relevant version ZIP's Developer Patch directory. Existing 0.3.9 receipts retain their original version/hash identity. NPR Class C assurance, physical transfer, independent review and second-device validation remain open.
