# Third-party software, services, and source material

This index identifies the main components used by AISTRO 0.5.2. The **[complete bundled notices](app/public/THIRD_PARTY_NOTICES.txt)** preserve the actual component texts; this table does not replace them. The application source lockfile is [app/package-lock.json](app/package-lock.json).

## Delivered software and build tools

| Component | Role | Applicable notices |
|---|---|---|
| [Node.js](https://nodejs.org/) | Server runtime; embedded in the Windows single executable | MIT and bundled component terms: [exact composite notice](app/docs/standards/NODE_LICENSE.txt) |
| [PDF.js / pdfjs-dist 6.5.438](https://github.com/mozilla/pdf.js) | Local PDF display, workers, fonts, character maps, and decoding assets | Apache-2.0 for PDF.js; [vendored license](app/public/vendor/pdfjs/LICENSE), plus component-specific notices below |
| [Lucide](https://lucide.dev/) | Interface icons | ISC, with MIT notices for applicable Feather-derived icons: [retained text](app/docs/standards/LUCIDE_LICENSE.txt) |
| [Acorn](https://github.com/acornjs/acorn) and acorn-walk | Source parsing and development tooling | MIT; exact texts in the [bundled notices](app/public/THIRD_PARTY_NOTICES.txt) |
| [esbuild](https://github.com/evanw/esbuild) | Bundling the application for Node SEA | MIT; exact text in the [bundled notices](app/public/THIRD_PARTY_NOTICES.txt) |

PDF.js includes additional notices under [cmaps](app/public/vendor/pdfjs/cmaps/LICENSE), [standard_fonts](app/public/vendor/pdfjs/standard_fonts/), and [wasm](app/public/vendor/pdfjs/wasm/). Preserve these when redistributing. In particular, the **vendored Liberation notice is GPLv2 with font exceptions**; do not substitute the license from a newer upstream snapshot. The [asset inventory](app/docs/pdfjs-vendor.json) records the vendored version and fingerprints.

The application uses native HTTP/fetch for its AI transport; an OpenAI or Google SDK is not an application dependency. Optional platform packages in a lockfile do not establish that every package was shipped or executed.

## AI and infrastructure services

- **[OpenAI](https://openai.com/):** current research inference, plus ChatGPT/Codex-assisted development. Access to the hosted service is governed by the provider's terms; the project license does not grant service access or credits.
- **[Google Gemini](https://ai.google.dev/):** historical application provider and earlier research/advice. It is not the active research provider in 0.5.2.
- **[GitHub](https://github.com/):** source and release distribution. The public demonstration uses separate hosting and a DuckDNS address.

See [AI disclosure](docs/ai-disclosure.md) for development, inference, historical audio, and model-training boundaries. Release records also inventory development/reporting tools such as Python, Playwright, Poppler, and extraction packages; their availability is not evidence that they are application runtime dependencies. In particular, PyMuPDF has AGPL/commercial terms and must not be silently treated as permissively licensed runtime software.

## Scientific data and material references

NASA PSI records, supporting reports, manufacturer references, scientific articles, and their figures retain their individual provenance and terms. Consult the **[dataset guide](data/README.md)** for the published selection, source links, retained notices, and redistribution boundaries. A citation or publicly reachable URL does not by itself grant permission to redistribute a third-party publication.

The software's Apache-2.0 license applies to original project code, not to all files collected into the research corpus. Cite the original investigators and source publications when using their findings.

## Branding

The AISTRO bee image and ASTROBEE wordmark were user-supplied. The bee carries a ChatGPT/AI-generation label; the exact generation prompt/model/date and the wordmark's authorship were not independently reconstructed. These assets and any trademarks are **outside the blanket software license grant**. No rights to NASA or other organizations' logos or marks are granted. The repository presentation uses the project's own identity and does not claim NASA endorsement.

Detailed historical software, AI, and asset inventories are retained inside the release's `Developer Patch/Submission/Inventories/` directory. Historical unresolved findings are not silently converted into rights clearance by publication.
