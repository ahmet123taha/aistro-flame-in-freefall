# Development

## Run from source

Use **Node.js 22.13 or newer** (required by the locked PDF.js dependency) and install the locked dependencies:

```powershell
git clone https://github.com/ahmet123taha/aistro-flame-in-freefall.git
cd aistro-flame-in-freefall/app
npm ci

# Choose the parent directory that contains your Veri_Seti folder.
$env:SPACEAPPS_DATA_ROOT = 'C:\AistroData'
$env:SPACEAPPS_STATE_DIR = Join-Path $env:LOCALAPPDATA 'AistroSourceDemo'
$env:PUBLIC_ORIGIN = 'http://127.0.0.1:8770'
$env:PORT = '8770'
npm run start:hosted
```

Open **http://127.0.0.1:8770**. To enable AI, supply `OPENAI_API_KEY` privately in the server process environment before starting; never put it in the repository. The current configured research model is `gpt-6.1-sol`. This entry point requires the compatible dataset and listens on loopback; public hosting needs a reverse proxy. See [reproducibility](reproducibility.md) for configuration and verification details.


See [architecture](architecture.md), [verification records](publication-verification.md), and [contribution guidelines](../CONTRIBUTING.md).
