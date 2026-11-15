import {build} from 'esbuild';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=process.cwd(),plan=JSON.parse(await readFile('qa/english-migration/history-plan.json','utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const record of plan){
 if(process.argv[2]&&record.version!==process.argv[2])continue;
 const source=path.resolve(record.sourceRoot,'..','english'),stage=path.resolve(source,'..','build'),app=path.resolve(source,'..','package','SpaceApps1');
 await mkdir(stage,{recursive:true});await mkdir(app,{recursive:true});
 const entry=path.join(stage,'portable-bundle.mjs');
 await build({entryPoints:[path.join(source,'portable.mjs')],outfile:entry,bundle:true,platform:'node',target:'node25',format:'esm',define:{'process.env.FLAME_PORTABLE_BUILD':'"1"'}});
 const assets={};for(const f of await readdir(path.join(source,'public')))if(/\.(html|m?js|css|svg)$/.test(f))assets['public/'+f]=path.join(source,'public',f);
 assets['public/THIRD_PARTY_NOTICES.txt']=path.join(root,'docs/standards/NODE_LICENSE.txt');
 const inputs=[];for(const [name,file] of Object.entries({entry,...assets})){const b=await readFile(file);if(/AIza[A-Za-z0-9_-]{25,}/.test(b.toString()))throw Error('Credential-shaped input: '+file);inputs.push({name,bytes:b.length,sha256:sha(b)});}
 const exe=path.join(app,'SpaceApps1.exe'),config=path.join(stage,'sea.json');
 await writeFile(config,JSON.stringify({main:entry,mainFormat:'module',output:exe,disableExperimentalSEAWarning:true,useSnapshot:false,useCodeCache:false,execArgvExtension:'none',assets}));
 execFileSync(process.execPath,['--build-sea',config],{stdio:'pipe',windowsHide:true});
 const b=await readFile(exe),pe=b.readUInt32LE(0x3c);if(b.toString('ascii',pe,pe+4)!=='PE\0\0')throw Error('Invalid PE');b.writeUInt16LE(2,pe+24+68);
 for(let i=0;;i++)try{await writeFile(exe,b);break;}catch(e){if(i===20||!['EBUSY','EPERM'].includes(e.code))throw e;await new Promise(r=>setTimeout(r,500));}
 const manifest={version:record.version,sourceVersion:record.oldVersion,language:'en',originalZip:record.originalZip,originalZipSha256:record.originalZipSha256,builtAt:new Date().toISOString(),node:process.version,bytes:b.length,sha256:sha(b),inputs,credentialsIncluded:false,datasetIncluded:false,failedHistoricalVersion:record.version==='0.0.5',verification:'pending'};
 await writeFile(path.join(stage,'build-manifest.json'),JSON.stringify(manifest,null,2));
 await writeFile(path.join(app,'THIRD_PARTY_NOTICES.txt'),await readFile(assets['public/THIRD_PARTY_NOTICES.txt']));
 await writeFile(path.join(app,'START_HERE.txt'),`SpaceApps1 ${record.version} | English | Windows x64\n\nExtract the ZIP. Place the existing Veri_Seti folder beside SpaceApps1.exe. Double-click SpaceApps1.exe. No Rust/Node installation or second launcher is required.\nEnter your own Gemini API key in Settings. It is encrypted under your Windows account and is not part of the package. Do not share LocalAppData.\nThe fixed dataset directory name Veri_Seti is preserved for compatibility; source documents and scientific measurements are unchanged.\nThis is a source-based research prototype, not an operational fire-risk system. NPR 7150.2D Class C remains an engineering target, not a certification.\n${record.version==='0.0.5'?'HISTORICAL FAILED PATCH: retained for review; known historical defects have not been silently fixed by translation.\n':''}`);
 console.log(JSON.stringify({version:record.version,exe,sha256:manifest.sha256,status:'built; verification pending'}));
}
