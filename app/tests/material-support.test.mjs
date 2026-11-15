import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadMaterialSupport,validateMaterialProfile} from '../lib/material-support-store.mjs';
import {materialApplicability,materialSupportContext} from '../lib/material-applicability.mjs';
import {researchEvidence,resolveResearchEvidence} from '../lib/research-evidence.mjs';
import {researchContext} from '../lib/research-coverage.mjs';
import {researchRanking} from '../lib/research.mjs';
import {payloadFor,createAnalyzer} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
import {loadDataset} from '../lib/dataset.mjs';
import {fixture} from './dataset-fixture.mjs';
import {renderMaterialSupport} from '../public/material-support-card.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const original=Buffer.from('TEST ONLY original property table\n15,0.15\n45,0.16\n15,0.151\n');
const profile=()=>({id:'MAT-test-pmma',material:'pmma',specimen:{name:'TEST PMMA board',grade:'unspecified',composition:'PMMA',conditioning:'dried',identityStatus:'family_supported_grade_unverified',identityLimit:'Grade and geometry remain unverified.'},property:'thermal_conductivity',unit:'W/(m K)',temperatureRole:'specimen_mean_temperature',points:[{temperatureK:288.15,value:.15,replicate:'R1',cycle:'1'},{temperatureK:318.15,value:.16,replicate:'R1',cycle:'1'},{temperatureK:288.15,value:.151,replicate:'R1',cycle:'2'}],source:{publisher:'TEST LAB',title:'TEST ONLY data',authors:['TEST AUTHOR'],url:'https://example.invalid/source',citation:'TEST ONLY citation',revision:'test-commit',path:'Third_Party/sources/test/table.csv',sha256:hash(original),bytes:original.length,location:'TEST rows 2–4',licenseStatus:'TEST ONLY'},review:{status:'reviewed_transcription',method:'TEST ONLY transcription',limitations:['Not a combustion curve.'],independentScientificReview:false},usage:{purpose:'applicability_context_only',numericScoreAdjustment:false}});
async function sidecar(root,profiles=[profile()]){
 await mkdir(path.join(root,'Material_Sensitivity'),{recursive:true});await mkdir(path.join(root,'Third_Party/sources/test'),{recursive:true});
 await writeFile(path.join(root,'Third_Party/sources/test/table.csv'),original);
 const bytes=Buffer.from(JSON.stringify({schema:1,role:'material_applicability_only',profiles,coverage:[{material:'sibal',status:'gap',notes:'No exact SIBAL property curve.'}]}));
 await writeFile(path.join(root,'Material_Sensitivity/profiles.json'),bytes);
 const metadata=Buffer.from('TEST ONLY specimen metadata'),method=Buffer.from('TEST ONLY source method');
 const dep=(name,b)=>({path:'Third_Party/sources/test/'+name,sha256:hash(b),bytes:b.length});
 await writeFile(path.join(root,'Third_Party/sources/test/metadata.json'),metadata);await writeFile(path.join(root,'Third_Party/sources/test/method.txt'),method);
 const provenance=Buffer.from(JSON.stringify({schema:1,role:'material_applicability_only',contextSources:[dep('method.txt',method)],profiles:profiles.map(p=>({profileId:p.id,sourceHashCheck:p.source,metadata:dep('metadata.json',metadata),disposition:'active_applicability_context'}))}));
 await writeFile(path.join(root,'Material_Sensitivity/PROVENANCE.json'),provenance);
 await writeFile(path.join(root,'Material_Sensitivity/MANIFEST.json'),JSON.stringify({schema:1,role:'material_applicability_only',version:'test-v1',profilesFile:'profiles.json',profilesSha256:hash(bytes),provenanceFile:'PROVENANCE.json',provenanceSha256:hash(provenance),numericScoreAdjustment:false}));
}
const corpus=()=>({hash:'NASA_TEST_HASH',records:[{id:'PSI-1',title:'NASA source',tableReferences:[],content:{approach:'An original PSI experiment describes material combustion measurements.'}}],experiments:{rows:[{sourceId:'PSI-1',runId:'1',values:{material:'pmma',temperatureK:300},provenance:{fileId:'f1',sha256:'a'.repeat(64)}}],studyEvidence:[]}});
const support=()=>({hash:'MATERIAL_HASH',status:{state:'ready',version:'test'},profiles:[profile()],coverage:[]});
const request={mode:'research',ids:['PSI-1'],question:'Review this source.',scenario:'I store PMMA.',conditions:{material:'pmma',temperatureK:310}};

test('optional sidecar validates original bytes and preserves cycles instead of inventing a fitted curve',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'material-support-'));await sidecar(root);const k=await loadMaterialSupport(root);
 assert.equal(k.status.state,'ready');assert.equal(k.profiles.length,1);assert.equal(k.profiles[0].points[2].cycle,'2');assert.equal(k.profiles[0].points[0].temperatureK,k.profiles[0].points[2].temperatureK);
});
test('changed original property data are excluded while NASA remains usable',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'material-support-'));await sidecar(root);await writeFile(path.join(root,'Third_Party/sources/test/table.csv'),'changed');const k=await loadMaterialSupport(root);
 assert.equal(k.status.state,'partial');assert.equal(k.profiles.length,0);assert.equal(k.status.excluded.length,1);
});
test('manifest integrity and optional absence fail closed independently of PSI data',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'material-support-'));assert.equal((await loadMaterialSupport(root)).status.state,'missing');await sidecar(root);await writeFile(path.join(root,'Material_Sensitivity/profiles.json'),'{}');assert.equal((await loadMaterialSupport(root)).status.state,'invalid');
});
test('specimen metadata and global method dependencies are validated, not just instrument bytes',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'material-support-'));await sidecar(root);await writeFile(path.join(root,'Third_Party/sources/test/metadata.json'),'changed identity');assert.equal((await loadMaterialSupport(root)).profiles.length,0);
 await sidecar(root);await writeFile(path.join(root,'Third_Party/sources/test/method.txt'),'changed method');assert.equal((await loadMaterialSupport(root)).status.state,'invalid');
});
test('a changed provenance document is excluded before any material context is used',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'material-support-'));await sidecar(root);await writeFile(path.join(root,'Material_Sensitivity/PROVENANCE.json'),'{}');assert.equal((await loadMaterialSupport(root)).status.state,'invalid');
});
test('source path traversal and identity conflicts cannot become active context',async()=>{
 for(const mutate of [p=>p.source.path='Third_Party/sources/../../outside.csv',p=>p.specimen.identityStatus='identity_conflict']){
  const root=await mkdtemp(path.join(os.tmpdir(),'material-support-')),p=profile();mutate(p);await sidecar(root,[p]);assert.equal((await loadMaterialSupport(root)).profiles.length,0);
 }
});
test('unreviewed units, ambient relabelling, model approval and score adjustments are rejected',()=>{
 for(const mutate of [p=>p.unit='J/(m3 K)',p=>p.temperatureRole='ambient',p=>p.usage.numericScoreAdjustment=true,p=>p.review.independentScientificReview=true,p=>p.id='PSI-999',p=>p.points[0].value=NaN]){const p=profile();mutate(p);assert.throws(()=>validateMaterialProfile(p));}
});
test('dataset loader adds no third-party PSI record, file or material suggestion',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'material-dataset-'));const {root}=await fixture(dir);const before=await loadDataset(dir);await sidecar(root);const after=await loadDataset(dir);
 assert.equal(after.corpus.hash,before.corpus.hash);assert.deepEqual(after.corpus.records,before.corpus.records);assert.equal(after.status.files,before.status.files);assert.equal(after.list().total,before.list().total);assert.equal(after.corpus.materialSupport.profiles.length,1);
});
test('property context is family-specific and does not treat specimen T as ambient T',()=>{
 const c={...corpus(),materialSupport:support()},s=materialApplicability(c,request.conditions,'PSI-1');
 assert.equal(s.status,'property_context_available');assert.equal(s.numericScoreAdjustment,false);assert.equal(s.directAmbientTemperatureComparison,false);assert.equal(s.parameterReview[0].status,'property_context_only');assert.equal(s.sourceMaterialEvidence,'indexed_same_family');
 assert.equal(materialApplicability(c,{material:'fiberglass'}).profiles.length,0);assert.equal(materialApplicability(c,{}).status,'material_not_supplied');
 const unrelated=materialApplicability({...c,experiments:{rows:[],studyEvidence:[]}},request.conditions,'PSI-1');assert.equal(unrelated.sourceMaterialEvidence,'not_verified_from_index');
});
test('third-party evidence changes no condition proximity or scenario score',()=>{
 const a={sourceId:'PSI-1',reason:'TEST reason',limitation:'TEST limitation',rubric:{objective:1,setting:1,material:1,mechanism:1}};
 const plain=researchRanking(corpus(),request,{assessments:[a]}).matches[0],withSupport=researchRanking({...corpus(),materialSupport:support()},request,{assessments:[a]}).matches[0];
 for(const key of ['total','numericPoints','scenarioPoints','maxPoints'])assert.equal(withSupport[key],plain[key]);assert.deepEqual(withSupport.parameterSupport,plain.parameterSupport);
});
test('OpenAI receives a separate applicability channel with no external PSI citation ids',()=>{
 const c={...corpus(),materialSupport:support()},context=researchContext(c,request),data=JSON.parse(payloadFor(context,request).input[0].content[0].text);
 assert.equal(data.materialApplicability.role,'material_applicability_only');assert.equal(data.materialApplicability.profiles.length,1);assert.equal(data.materialApplicability.profiles[0].points,undefined);
 assert.deepEqual(researchEvidence(context,request.ids),researchEvidence(researchContext(corpus(),request),request.ids));
 assert.ok(data.sources.every(x=>!x.id.startsWith('MAT-')));assert.ok(data.evidence.every(x=>!x.sourceId.startsWith('MAT-')));
 assert.throws(()=>resolveResearchEvidence({assessments:[{sourceId:'MAT-test-pmma',evidenceId:data.evidence[0].id}]},context,request));
});
test('bounded UI context displays exact values and refuses score/tolerance claims',()=>{
 const c={...corpus(),materialSupport:support()},s=materialApplicability(c,request.conditions,'PSI-1'),html=renderMaterialSupport(s);
 assert.match(html,/third-party/);assert.match(html,/No numerical score adjustment/);assert.match(html,/0\.151/);assert.match(html,/Specimen mean temperature/);assert.doesNotMatch(html,/interpolated value|99%/);
 const many={...c,materialSupport:{...support(),profiles:Array.from({length:6},(_,i)=>({...profile(),id:'MAT-test-'+i}))}};assert.equal(materialSupportContext(many,request.conditions).profiles.length,4);
 const large=structuredClone(many);for(const p of large.materialSupport.profiles){p.specimen.conditioning='TEST '.repeat(400);p.review.limitations=Array(8).fill('TEST '.repeat(200));}const bounded=materialSupportContext(large,request.conditions);assert.ok(JSON.stringify(bounded).length<=12000);assert.ok(bounded.omittedProfiles>0);
});
test('read-only support endpoint validates source queries and never invokes a provider',async()=>{
 const c={...corpus(),materialSupport:support()},app=createApp({corpus:c,analyzer:{status:()=>({configured:false})}});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+app.address().port;const r=await fetch(base+'/api/material-support?material=pmma&sourceId=PSI-1');assert.equal(r.status,200);assert.equal((await r.json()).support.profiles.length,1);assert.equal((await fetch(base+'/api/material-support?sourceId=MAT-test')).status,400);}finally{await new Promise(r=>app.close(r));}
});
test('material index identity participates in OpenAI cache invalidation without real calls',async()=>{
 const c={...corpus(),materialSupport:support()};let calls=0;
 const analysis={stage:'clarify',summary:'TEST ONLY: describe the scenario.',questions:[],assessments:[],conditionSuggestions:[],unknowns:[],nextStep:'Describe it.',emergency:false};
 const analyzer=createAnalyzer({corpus:c,key:'TEST_ONLY',fetchImpl:async()=>{calls++;return Response.json({...providerResponse(analysis)});}});
 const q={...request,scenario:'',question:'Discuss my conditions.'};await analyzer.analyze(q);await analyzer.analyze(q);assert.equal(calls,1);c.materialSupport.hash='CHANGED_INDEX';await analyzer.analyze(q);assert.equal(calls,2);
});
