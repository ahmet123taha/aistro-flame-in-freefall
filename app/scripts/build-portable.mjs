import {PDF_ASSETS} from '../lib/pdf-assets.mjs';
import {writeThirdPartyNotices} from './third-party-notices.mjs';
import {compileAgentSkills} from './compile-agent-skills.mjs';
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { VERSION, DATASET_VERSION } from '../lib/version.mjs';
import {SOURCE_CONTENT_BASELINE} from '../lib/source-content-baseline.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await compileAgentSkills({check:true});
const output=path.resolve(process.argv[2] || path.join(process.env.USERPROFILE,'Desktop','Spaceapps','Releases',VERSION,'SpaceApps1'));
const staging=path.join(root,'build');await mkdir(staging,{recursive:true});await mkdir(output,{recursive:true});
const entry=path.join(staging,'portable-bundle.mjs');
await build({entryPoints:[path.join(root,'portable.mjs')],outfile:entry,bundle:true,platform:'node',target:'node25',format:'esm',define:{'process.env.FLAME_PORTABLE_BUILD':'"1"'},metafile:true}).then(result=>writeFile(path.join(staging,'bundle-inputs.json'),JSON.stringify(result.metafile,null,2)));
const assets={};
const thirdPartyNotices=await writeThirdPartyNotices(root);
assets['public/THIRD_PARTY_NOTICES.txt']=path.join(root,'public','THIRD_PARTY_NOTICES.txt');
for(const file of [...PDF_ASSETS,'prepared-graph-reader.mjs','prepared-graphs.css','branding.css','branding/aistro-bee.jpeg','branding/astrobee-wordmark.jpeg','condition-guidance.css','workspace-entry.mjs','workspace-entry.css','pdf-flow-reader.mjs','document-reader.css','context-fields.mjs','context-fields-panel.mjs','context-fields.css','condition-requests.mjs','scenario-panel.mjs','source-content-status.mjs','source-reference.mjs','parameter-comparison.mjs','material-support-card.mjs','gravity-input.mjs','dialogue-flow.mjs','figure-models.mjs','figure-reader.mjs','source-library.mjs','table-preview.mjs','recommendations-panel.mjs','source-briefing.mjs','safety-workspace.mjs','safety-steps-panel.mjs','safety-steps.css','index.html','app.js','environment-panel.mjs','conversation-panel.mjs','styles.css','favicon.svg','workspace-state.mjs','result-card.mjs','experiment-comparison.mjs','numeric-card.mjs','physical-card.mjs','thermal-card.mjs','transition-card.mjs','gas-physics-card.mjs','gas-observations.mjs','boundary-card.mjs'])assets['public/'+file]=path.join(root,'public',file);
const inputs=[];
for(const [name,file] of Object.entries({entry,...assets})){const bytes=await readFile(file);if(/(?:AIza[A-Za-z0-9_-]{25,}|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,})/.test(bytes.toString('utf8')))throw new Error('Credential-shaped value found; release stopped.');inputs.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const target=path.join(output,'SpaceApps1.exe');
const configuration={main:entry,mainFormat:'module',output:target,disableExperimentalSEAWarning:true,useSnapshot:false,useCodeCache:false,execArgvExtension:'none',assets};
const configPath=path.join(staging,'sea-config.json');await writeFile(configPath,JSON.stringify(configuration,null,2));
execFileSync(process.execPath,['--build-sea',configPath],{stdio:'pipe',windowsHide:true});
// The Windows GUI subsystem avoids opening a second console when the user double-clicks.
const binary=await readFile(target);const pe=binary.readUInt32LE(0x3c);if(binary.toString('ascii',pe,pe+4)!=='PE\0\0')throw new Error('Expected Windows PE image');binary.writeUInt16LE(2,pe+24+68);
// Windows can briefly lock a newly emitted PE. Retry only the same local write;
// never start another SEA build or record a successful manifest before it completes.
let patchWriteRetries=0;
for(;;){try{await writeFile(target,binary);break;}catch(error){
 if(!['EBUSY','EPERM'].includes(error.code)||patchWriteRetries>=20)throw error;
 patchWriteRetries++;await new Promise(resolve=>setTimeout(resolve,500));
}}
const runtimeProfile='%LOCALAPPDATA%/FlameInFreefall'+(VERSION.includes('-prototype.')?'/Prototypes/'+VERSION:'');
const manifest={version:VERSION,builtAt:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,file:path.basename(target),bytes:binary.length,sha256:createHash('sha256').update(binary).digest('hex'),patchWriteRetries,inputs,credentialsIncluded:false,runtimeProfile,credentialProfile:'%LOCALAPPDATA%/FlameInFreefall',scientificScope:'External Veri_Seti package',datasetVersion:DATASET_VERSION,signature:'unsigned',classCStatus:'engineering baseline in progress; not certified'};
await writeFile(path.join(output,'release-manifest.json'),JSON.stringify(manifest,null,2));
await writeFile(path.join(output,'THIRD_PARTY_NOTICES.txt'),thirdPartyNotices.bytes);
await writeFile(path.join(root,'qa','portable-build.json'),JSON.stringify(manifest,null,2));
await writeFile(path.join(output,'START_HERE.txt'),`SPACEAPPS1 ${VERSION} - WINDOWS x64

1. Extract the application ZIP.
2. Extract the fixed dataset ZIP separately.
3. Place the Veri_Seti folder beside SpaceApps1.exe.
4. Double-click SpaceApps1.exe. The browser opens automatically.

No second launcher, Rust or Node installation is required.
Keep the canonical Veri_Seti name; it is part of the dataset contract.
If the dataset is missing, add the folder and restart the application.
Enter your OpenAI API key in Settings. It is encrypted with Windows DPAPI
in your local account profile. The shared package contains no API key.
Conversation history is saved locally as conversations.json under
${runtimeProfile}. Prototype chats/cache/instance state are separate from production.
The OpenAI Windows-encrypted key is stored separately in
%LOCALAPPDATA%/FlameInFreefall/credentials.openai.dpapi.
Previous-provider credentials are not read, overwritten or included in the package.
Conversation history is plain text and is not included in this shared ZIP.
Saved conversations can be reopened
from Chat history or the conversation selector. New chat starts with empty inputs.
New chat with these inputs copies only the current environment into a fresh chat.
It does not copy previous dialogue, source focus, results or recommendations.
The last 8 messages and bounded scenario of the active chat enter
the model context; visible history can be longer. Old unsaved messages cannot
be recovered. Limits: 50 conversations, 500 messages per conversation, 4 MB total.
History limits stop saving with a visible notice; they do not silently delete history.
Do not share LocalAppData. Close the application using its shutdown button.

Only supported source tables and selected evidence enter numerical/AI context;
the application does not claim to interpret every PDF or spreadsheet.
For query-based source content, merge Veri_Seti-Research_Content-${SOURCE_CONTENT_BASELINE.indexRelativePath.split('/').at(-1)}.zip
into the existing Veri_Seti folder. The versioned index is an ADD-ON, not the
full raw dataset. Restart after installation. Settings shows its coverage.
Extracted passages do not automatically become measured numerical conditions.
Similarity is not a calibrated fire-risk probability.
NPR 7150.2D Class C remains an engineering target, not a certification.
`);
console.log(JSON.stringify({file:target,bytes:binary.length,sha256:manifest.sha256}));

