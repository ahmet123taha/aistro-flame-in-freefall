# Contributing

Thank you for helping make combustion evidence easier to inspect and understand.

For a bug report, describe the version, operating system, steps, expected result, and actual result. Include a small reproducible example or source identifier where possible. Do not post API keys, private conversations, or documents you cannot redistribute in public issues.

For scientific changes, link the original source and identify the relevant page, table, units, material identity, and experimental conditions. Distinguish reported observations, extracted values, assumptions, and calculations. A retrieval score must not become a fire-risk estimate without an independently supported model.

For code changes:

1. Fork the repository and create a focused branch.
2. Read [app/AGENTS.md](app/AGENTS.md) and the relevant requirements before changing application behavior.
3. Preserve source provenance, unknown values, material distinctions, and provider-error boundaries.
4. Add meaningful regression coverage and run `npm ci` followed by `npm test` in `app/`.
5. Describe the change, its evidence, verification, and remaining limitations in the pull request.

Keep large datasets and built executables out of Git. Propose data changes through manifests and provenance records; do not overwrite raw sources. Preserve third-party licenses and obtain the rights required for anything you contribute.

Disclose substantial AI assistance and review generated work before submitting it. Contributions to original project code and documentation are made under this repository's Apache-2.0 license; separately licensed material must be clearly identified. No contribution should imply NASA endorsement or certification.
