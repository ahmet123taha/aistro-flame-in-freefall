# 0.1.2 — Numerical matching correction from 0.1.1

Critical defect: counting input topics was not the numerical closeness requested by the user. The new /api/match compares actual table rows only. Topic percentage was removed from matching cards. Different numerical values under the same topics no longer necessarily produce the same score.

FIF-020: min(a,b)/max(a,b)*100 closeness, summed using user weights. 0/0 is exact equality; missing values are not scores. An overall score requires weights totaling 100, numerical evidence for every positively weighted parameter and a selected matching material family. Columns from different trials are not merged. Material-family equality does not establish equal grade or flammability.

Added material/fuel, specimen type and flow direction. Added droplet diameter, width, burner diameter, CO2 and fuel concentration to the first six numerical fields. Examined 22 candidate CSVs; partially normalized 1538 input rows from 10 investigations. This does not mean 1538 publications or all NASA data. Numerical gravity and ambient temperature are absent from these adapters. FAN indication is not velocity, adiabatic flame temperature is not ambient temperature, and microgravity is not assumed to be numerical zero.

The user's example weights remain 20+5+10+5+10=50; the remaining 50 was not invented. They are adjustable. This is not an experimentally calibrated fire-risk model; critical thresholds remain open. NASA BASS record 20140011099 supports the importance of airflow and specimen thickness, not these percentages or this similarity formula.

Tests: tests/numeric-matching.test.mjs, tests/matching.test.mjs, full suite; relocated EXE; real data and browser. No live model call. This is partial NPR Class C engineering evidence, not certification. Old ZIPs are unchanged.

Source: https://ntrs.nasa.gov/citations/20140011099 (checked 14 November 2026).

Next validation: material grade/coating/mixture taxonomy; measurement uncertainties/intervals; source-derived rows for g and ambient T; geometry-specific physics and independent threshold validation.