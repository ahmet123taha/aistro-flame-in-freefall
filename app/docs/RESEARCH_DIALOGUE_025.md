# Environment and scenario research - 0.2.5

## User flow
Optional material/environment form -> Gemini asks situation and objective -> user describes situation or estimates -> clarification if needed -> local-source research ranking. A user can start in chat with every field blank. Neither a selected paper nor numerical completeness is required for conversation. Specialist experiment comparison is a separate explicit method.

## Prompt layers
lib/research.mjs exports RESEARCH_SYSTEM and RESEARCH_OUTPUT. lib/gemini.mjs selects them for research mode. The user JSON contains scenario, current conditions, atmosphere, confirmed estimate basis, and bounded dialogue history. Source records are local indexed metadata/supporting text, capped at 4,000 characters per field, labelled bounded. No browsing tools are supplied. The actual generateContent call remains Gemini 3.1 Flash-Lite with the existing DPAPI key store. Runtime local cache has a new prompt-version identity.

## Scoring and missingness
The overall research relevance preference is 60 numerical points plus 40 scenario points. Numerical closeness is 100*min(input,source)/max(input,source), two zero values equal 100. Equal numeric shares are assigned only among user-supplied primary measurements. A missing source value is NOT reweighted. Numeric points require every supplied measurement in one compatible material trial. Missing material or no numeric values means no total percentage. Scenario rubric has objective, setting, material and mechanism: 0/5/10 points each. AI interpretations require a verbatim source quotation and limitation. Quotes establish traceability, not independent semantic correctness. Score is not fire probability, prediction, confidence or physical equivalence.

## Suggestions and source provenance
Only quoted explicit user values with supported units may be suggested. Estimates remain marked. No Celsius-to-Kelvin or other unverified conversion is performed by the model. Application requires an explicit Apply action and invalidates previous ranking. Changes to conditions during a request invalidate the returning result. Autocomplete indexes canonical material names in normalized rows and supported material mentions in metadata; it does not claim all files were parsed.

## Emergency and scientific scope
Active incident accounts should not wait for a form or sensor readings. Use applicable crew/site emergency authority and procedures. The system is instructed not to prescribe unvalidated suppressant, dosage or atmosphere changes. Research examples retain their experimental context. This application is not a qualified emergency-response system. Partial-gravity inference, calibrated safety thresholds, independent scientific validation and full NPR Class C evidence remain open.

## Verification
Tests: tests/research.test.mjs and existing regression suite. Browser QA uses explicit TEST ONLY mock responses through the real analyzer protocol, not a live Gemini call. Actual packaged EXE separately checked for default simplified form, source materials and isolated portability; original dataset and user credentials were not modified.
