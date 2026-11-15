# AI use and human direction

AISTRO is an **AI-assisted, human-directed student hackathon project**. This disclosure separates tools used to create the project from AI used by the running application.

## Development, editing, and translation

ChatGPT/Codex assisted with programming, research, tests, interface iteration, debugging, documentation, report editing, and English-language editing/translation under the user's direction. The workflow included a coordinating assistant and specialized subagents. Human instructions supplied goals, corrections, feature decisions, and release choices; this does not establish independent human review of every generated line.

Google Gemini was also used in earlier technical advice and planning. The precise historical internal model behind every development interaction has not been reconstructed, and no per-line human/AI authorship percentage is claimed.

The user-supplied bee image bears a ChatGPT/AI-generation label. Its exact generation prompt, model, and date are not verified. The ASTROBEE wordmark was also user-supplied; its generation method and rights chain were not independently established. Neither asset is represented as an official NASA logo. See [third-party notices](../THIRD_PARTY_NOTICES.md).

## Runtime research assistant

Version **0.5.2** uses the OpenAI Responses API with the configured **`gpt-6.1-sol`** research model, medium reasoning, and `store:false`. The local application selects evidence and validates the returned structure and source references. A model interpretation is still an interpretation, even when a citation is present.

- The model receives the current request, bounded conversation context, and selected indexed source excerpts or reviewed records.
- The full raw dataset is not uploaded to the model. There is no enabled provider web-search tool or external vector-store upload in the current workflow.
- Keys remain in the Windows-encrypted local account store or the hosted server environment; they are not included in the public package.
- The application does not silently retry a failed provider request or switch to a different provider/model.
- `store:false` does not establish zero data retention or a particular processing region. Provider policies and account settings remain relevant.

## Historical features

Earlier releases used Gemini for research and experimented with separate incident text/voice transports, including OpenAI Realtime. **Those incident transports, microphone capture, and separate incident conversations are inactive in 0.5.2.** Incident support now opens the existing Safety panel. Historical source files and reports are retained for traceability and must not be read as current capabilities.

No custom model training or fine-tuning is recorded. Data parsing, retrieval, deterministic plotting, and generating an answer from selected context are not training a new model. Some development/extraction environments contained pretrained layout resources; installation alone does not establish their execution or distribution in the application.

## Verification limits

Recorded offline tests use controlled or mocked provider responses. Prior small live connectivity trials do not establish scientific accuracy, production response quality, emergency capability, or the safety of every recommendation. No new paid model test is claimed for repository publication.

The Safety panel is a research aid, not emergency dispatch or an approved operating procedure. Independent scientific and safety review remains necessary. This project is not affiliated with, endorsed by, or certified by NASA.

This disclosure is based on the current implementation and the sealed release's `Developer Patch/Submission/06-AI-Software-and-Asset-Disclosure.md`; earlier entries retain their historical context.
