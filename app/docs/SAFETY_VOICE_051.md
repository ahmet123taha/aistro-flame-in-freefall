# Safety and incident voice engineering change: 0.5.1

This change targets recoverable voice interaction and concise, source-grounded Safety guidance. Implementation-level AWS verification passed; live/operational acceptance remains open. The reported incident conversation ending after approximately three seconds has no confirmed root cause: the corrected code-level failure modes are candidates for improvement, not a reconstruction of that session.

| Requirement | Intended behavior | Engineering defect |
| --- | --- | --- |
| FIF-091 | Incomplete/cancelled responses and recoverable response/transcription errors preserve a usable session and label partial output. | D-051-01 |
| FIF-092 | Serialize response creation, allow bounded transient RTC recovery, and provide explicit audio resume when autoplay is blocked. | D-051-02 |
| FIF-093 | Give the next fact-supported protective action and at most one useful question; use corrections and completed actions. | D-051-03 |
| FIF-094 | Prioritize prevention, risk understanding and response planning while preserving explicit educational combustion/rocket ignition intent. | D-051-04 |
| FIF-095 | Use short source-supported single-action checklist steps and update their applicability when facts or evidence change. | D-051-04 |
| FIF-096 | Present Safety prominently with a concise empty state and finite accessible attention for newly accepted validated findings only. | D-051-05 |

## Voice lifecycle boundaries

A response-level interruption is distinct from a terminal session or transport failure. Partial model output must remain visibly partial and must not silently become a complete history turn. A recoverable error should return the user to an available listening or text state. Serialization must prevent overlapping response creation while retaining the next legitimate request; it must not automatically retry a billed generation.

A transient RTC disconnect has a bounded grace interval; a terminal failure still cleans up resources. Browser autoplay refusal exposes an explicit Enable audio action while retaining the connection. Recovery does not reset the session budget or reopen the microphone after teardown. Keep `gpt-realtime-2.1-mini`, `max_output_tokens:512`, the 120-second session ceiling and 30-second idle ceiling. These controls are resource bounds, not proof of response latency, completeness or operational reliability.

## Guidance and scientific evidence

Incident replies should use professional short sentences, with one next concrete protective action by default and at most one question that changes the next safe decision. Ask about position relative to smoke, a safe route or already-known stored materials only when useful. Unknown stays unknown. Do not ask someone to approach a fire to identify materials. Once a protective action or actual emergency notification is confirmed, advance rather than repeating generic reassurance or default stay-put instructions.

No role or location implies qualifications, training or control authority. Unknown hazards do not justify generic extinguisher, power-isolation, hatch or ventilation commands. Equipment discussion requires an applicable approved procedure, confirmed training/authorization and safe approved controls. Earth evacuation guidance cannot be translated into leaving a pressurized habitat. This application is neither dispatch nor an approved procedure catalog.

An explicit educational combustion, rocket ignition or deliberate-experiment request retains its research objective; a mention of fire alone is not a reported uncontrolled incident. Broad learning requests do not need personalized checklist steps or a measurement interview. Safety is the primary product emphasis; the numerical matching algorithm and its 60/40 weighting are unchanged.

Checklist text contains one short action. Source evidence, applicability, unknown-information branches and limitations remain available. Relevant new findings and corrected facts can replace or clear obsolete steps. A source quotation establishes traceability; it does not authorize an operational procedure or calibrated risk degree. Existing active-incident behavior continues to hide generated intervention instructions and hand off to actual responsible authorities.

Official guidance informed these engineering boundaries: [USFA extinguisher guidance](https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/fire-extinguishers/) makes training, smoke exposure and a clear escape path relevant to extinguisher use; [USFA escape planning](https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/home-fire-escape-plans/index.html) supports escape preparation and actual fire-service contact. [NASA OCHMO-TB-008 Rev A](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-008-fire-protection.pdf) describes atmosphere fragility, limited escape options and integrated spacecraft protection; it explicitly remains reference material. These are engineering provenance, not newly ingested PSI/REF research data or an applicable onboard procedure. Source roles and limits are recorded in `qa/release-0.5.1/prompt-sources.json`.

## Accessible attention

Safety attention must be finite and restricted to a newly accepted, validated relevant finding. Restored, unchanged, rejected or stale content must not start another pulse. Reduced-motion users need a static cue; meaning cannot depend on animation or color alone. Focus behavior, controls and readable contrast remain usable. A pulse signals new reviewable information, not a fire alarm, a calibrated hazard level or completion of a safety action.

## Verification and remaining acceptance

The following current receipt paths retain the verified scope and explicit acceptance limits:

| Evidence | Intended scope |
| --- | --- |
| `qa/release-0.5.1/aws/test-results.log` | Full source-bound AWS mocked test output |
| `qa/release-0.5.1/aws/test-summary.json` | Machine-readable AWS mocked totals and exclusions |
| `qa/release-0.5.1/aws/syntax.json` | Candidate syntax-check receipt |
| `qa/release-0.5.1/browser/readback.json` | Controlled browser state, attention/accessibility and recovery readback |
| `qa/release-0.5.1/package-audit.json` | Candidate package identity/content audit |

No local tests, paid/live model or microphone trials, or local EXE execution test are authorized in this scope. A package audit is not executable acceptance. Mocked event tests and prompt contracts do not establish live voice quality, latency, safe model behavior or the cause of the user's reported session ending. Historical test counts cannot be relabeled as 0.5.1 results. Update evidence status only after reading the matching candidate receipts.

`docs/defects-0.5.0-to-0.5.1.json` tracks D-051-01..05. `docs/risks-and-gaps.json` retains G-051-01..04 for session diagnosis, model/safety acceptance, browser/accessibility coverage and pending verification. Requirements and NPR engineering trace links are recorded in the requirement registry and Class C JSON/CSV matrix. No matrix requirement is closed by this change; independent safety review, applicable tailoring, complete requirement conditions and formal approval remain open. No deployment, operational signoff or NASA Class C compliance claim is included.

## Current release evidence

AWS Linux: 609 passed, 0 failed, 1 Windows-only test skipped (610 total); isolated network, mocked provider. Public UI toggle/empty Safety readback; no real voice/microphone/provider or local EXE trial. Full emergency/clinical/scientific acceptance and Class C assurance remain open.

AWS serves 0.5.1 at https://aistro-flame-freefall.duckdns.org. The previous 0.5.0 runtime is retained for rollback. No credential, model budget, matching weight or scientific dataset changes were made.
