# Incident entry retirement: AISTRO 0.5.2

The user rejected the separate Incident Support experience and explicitly requested that its button remain as a shortcut to the existing Safety panel. This is a feature retirement, not a claim that previous real-time voice acceptance was completed.

## Current interaction

Both the header Incident support button and the workspace Incident support entry expand the existing Safety panel. Repeated clicks leave it open. The original Safety toggle can still collapse it. Both controls accurately expose the expanded state. Opening the panel does not change current recommendations, set a synthetic emergency flag, discard source context, submit a message or start a microphone/provider session.

Normal AI Astro research conversation, contextual Safety recommendations and source links remain available. There is no separate emergency voice/text dialog. Empty Safety remains a clear invitation to describe a situation rather than an invented checklist.

## Runtime boundary

The application no longer imports/installs the incident voice UI or constructs the incident service in hosted or portable entry points. Voice/audio/worklet assets are removed from the production asset allowlist. Retired incident session/message/end routes return 410 without parsing an operational request or contacting a provider. Status no longer advertises a configured voice feature. Historical implementation files and tests may remain in source archives; presence in an engineering archive is not an active product capability.

## Scope and verification

Requirement FIF-097 links the interaction, removed-provider boundary and regression evidence. Verification uses AWS isolated-network provider mocks and public browser navigation; no local application/EXE trial, microphone access or paid model request is authorized. The Windows portable may be built and hash-verified without being executed. Scientific data, numerical matching weights and the research model are unchanged. Detailed current totals and limits belong in the release report and receipts.

## Delivery

The version ZIP has SpaceApps1/ and Developer Patch/ as siblings. The short user transition note is in SpaceApps1/Patches/Changes.txt. Overall-project source/AI/development disclosure remains under Developer Patch/Submission. Release-specific deltas, source maps, tests and limitations remain under Developer Patch/Reports and Verification. Prior voice usage is historical and must not be presented as a current feature. Formal NPR Class C compliance and operational emergency validation remain unclaimed.

## Verified release evidence

AWS isolated mocked checks: 609 passed, 0 failed, 1 Windows-only skipped (610 total). Live hosted UI header and card both open Safety with no separate dialog. No live provider call, microphone or local executable trial. Formal operational/scientific and NPR assurance remain unestablished.

Live URL: https://aistro-flame-freefall.duckdns.org. Previous 0.5.1 runtime retained for rollback. Tests and readback receipts accompany the version package.
