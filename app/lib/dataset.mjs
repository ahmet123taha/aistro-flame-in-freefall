import {libraryList} from './file-library.mjs';
import {loadPreparedGraphs} from './prepared-graphs.mjs';
import { readFile, realpath, stat, open } from 'node:fs/promises';
import path from 'node:path';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { loadCorpus } from './corpus.mjs';
import { DATASET_VERSION } from './version.mjs';
import {normalizeTable,MATERIALS} from './experiment-tables.mjs';
import {GAS_FORMULA_SOURCE,CFIG_REPORT} from './gas-stoichiometry.mjs';
import {matchExperiments} from './numeric-matching.mjs';
import {BASS_CALIBRATION,BASS_REPORT,bassReportRows} from './bass-evidence.mjs';
import {BASS_ASRUN_SOURCE,BASS_ASRUN_LIMITS,bassAsRunRows} from './bass-asrun.mjs';
import {sibalReportRows} from './sibal-evidence.mjs';
import {nomexReportRows,linkNomexTrials} from './nomex-evidence.mjs';
import {PMMA_ROD_SOURCE,pmmaRodReferences} from './pmma-rod-model.mjs';
import {STUDY_EVIDENCE_SOURCES,reviewedStudyEvidence} from './study-evidence.mjs';
import {loadMaterialSupport} from './material-support-store.mjs';
import {loadSourceContent} from './source-content-index.mjs';
import {SOURCE_CONTENT_BASELINE} from './source-content-baseline.mjs';
import {attachSourceFragments} from './research-source-context.mjs';
import {PSI26_REPORT_SOURCES,psi26ReportRows,psi26ReportFragments} from './psi26-report-evidence.mjs';
import {NORMALIZATION_REVIEW_SOURCES} from './reviewed-normalization-evidence.mjs';
import {prioritizeStudyFragments} from './study-evidence-sorting.mjs';

const digest=b=>createHash('sha256').update(b).digest('hex');
const unzip=promisify(gunzip);
export async function confinedPath(root, relative) {
  if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes(':')||path.posix.isAbsolute(relative)||relative.split('/').some(x=>!x||x==='.'||x==='..'))throw new Error("Invalid dataset path.");
  const base=await realpath(root),target=await realpath(path.join(base,...relative.split('/')));
  const rel=path.relative(base,target);
  if(rel.startsWith('..')||path.isAbsolute(rel))throw new Error("The file is outside the dataset.");
  return target;
}
export async function loadDataset(applicationDirectory) {
  const root=path.join(applicationDirectory,'Veri_Seti');
  let bytes;
  try{bytes=await readFile(path.join(root,'DATASET.json'));}
  catch(e){if(e.code==='ENOENT')return {available:false,status:{state:'missing',message:"Place the Veri_Seti folder beside the executable and restart the application."}};throw e;}
  const manifest=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
  if(manifest.schema!==1||manifest.version!==DATASET_VERSION||!Array.isArray(manifest.investigations)||!manifest.investigations.length||manifest.investigations.some(id=>!/^PSI-\d+$/.test(id)))throw new Error("Incompatible dataset version or schema.");
  async function checked(relative,hash){const b=await readFile(await confinedPath(root,relative));if(digest(b)!==hash)throw new Error("Dataset-index integrity check failed: "+relative);return b;}
  const corpus=await loadCorpus('',filename=>checked('_app/metadata/'+filename,manifest.metadataHashes[filename]),manifest.investigations);
  const extra=JSON.parse((await checked('_app/support-records.json',manifest.supportHash)).toString('utf8'));
  for(const r of extra){if(!/^REF-\d+$/.test(r.id)||!r.content||typeof r.content.documentText!=='string')throw new Error("Invalid supporting-source index.");}
  corpus.records.push(...extra);
  // Async streaming inflate avoids an intermittent native synchronous CRC error on
  // the shipped Windows runtime with this 21 MB catalog; SHA is checked first.
  const files=JSON.parse((await unzip(Buffer.from(await checked('_app/files.json.gz',manifest.filesHash)),{maxOutputLength:64*1024*1024})).toString('utf8'));
  if(!Array.isArray(files)||files.length!==manifest.fileCount)throw new Error("Dataset file count does not match.");
  const byId=new Map(files.map(f=>[f.id,f]));
  if(byId.size!==files.length||files.some(f=>!/^f\d+$/.test(f.id)||typeof f.path!=='string'||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256)))throw new Error("Invalid dataset file index.");
  corpus.hash=digest(Buffer.from([corpus.hash,manifest.supportHash,manifest.filesHash].join('|')));
  for(const r of corpus.records)r.fileCount=files.filter(f=>f.accessions.includes(r.id)).length;
  const experimentRows=[],tableAudit=[],documentAudit=[];
  const verifiedDocuments=new Set();
  const reviewedSources=[...new Map([BASS_CALIBRATION,BASS_REPORT,PMMA_ROD_SOURCE,GAS_FORMULA_SOURCE,CFIG_REPORT,BASS_ASRUN_SOURCE,...STUDY_EVIDENCE_SOURCES,...NORMALIZATION_REVIEW_SOURCES,...PSI26_REPORT_SOURCES].map(s=>[s.fileId,s])).values()];
  for(const source of reviewedSources){
    const file=byId.get(source.fileId);
    try{
      if(!file||file.sha256!==source.sha256)throw Error('Pinned document absent or changed');
      await checked(file.path,source.sha256);verifiedDocuments.add(source.fileId);
      documentAudit.push({fileId:source.fileId,sha256:source.sha256,status:'verified',purpose:source.purpose||(STUDY_EVIDENCE_SOURCES.some(s=>s.fileId===source.fileId)?'Reviewed material and marginal condition fragments; per-field scope preserved':source.fileId===BASS_ASRUN_SOURCE.fileId?'PSI-26 as run matrix: pressure AB; oxygen scale unresolved; no numeric gravity':source.fileId===GAS_FORMULA_SOURCE.fileId?'Flame Design SRD PDF8 Eq1.1':source.fileId===CFIG_REPORT.fileId?'CFI-G report PDF3,31 nitrogen dilution and fuel families':source.fileId===BASS_REPORT.fileId?'PDF Tables5.1,7.1,A.2, pages54,64–65,102–104,113; PMMA boundary pages83–84; SIBAL limits108–109':source.fileId===PMMA_ROD_SOURCE.fileId?'PMMA rod stretch equations and Table1, page7':'AIR centerline calibration, A33:A34')});
    }catch{documentAudit.push({fileId:source.fileId,status:'unavailable_or_changed',effect:'Dependent derived data excluded'});}
  }
  for(const file of files.filter(f=>f.name.includes('Experimental table')&&/\.csv$/i.test(f.name)&&f.bytes<500000)){
    try{const data=await checked(file.path,file.sha256);const parsed=normalizeTable(file.accessions[0],file,data.toString('utf8'),{bassCalibrationVerified:verifiedDocuments.has(BASS_CALIBRATION.fileId)});experimentRows.push(...parsed.rows);tableAudit.push({fileId:file.id,sourceId:file.accessions[0],sha256:file.sha256,rows:parsed.rows.length,rejected:parsed.rejected,inputRows:parsed.inputRows,...(parsed.disposition?{disposition:parsed.disposition}:{})});}
    catch{tableAudit.push({fileId:file.id,status:'hash_or_parse_failed',rows:0});}
  }
  if(verifiedDocuments.has(BASS_REPORT.fileId))experimentRows.push(...bassReportRows(byId.get(BASS_REPORT.fileId)),...sibalReportRows(byId.get(BASS_REPORT.fileId)),...nomexReportRows(byId.get(BASS_REPORT.fileId)));
  if(verifiedDocuments.has(BASS_ASRUN_SOURCE.fileId)){
    const rows=bassAsRunRows(byId.get(BASS_ASRUN_SOURCE.fileId));experimentRows.push(...rows);
    tableAudit.push({fileId:BASS_ASRUN_SOURCE.fileId,sourceId:'PSI-26',sha256:BASS_ASRUN_SOURCE.sha256,rows:rows.length,inputRows:rows.length,rejected:0,disposition:'Reviewed as-run pressure cells only',limitations:[...BASS_ASRUN_LIMITS]});
  }
  if(PSI26_REPORT_SOURCES.every(s=>verifiedDocuments.has(s.fileId)))experimentRows.push(...psi26ReportRows([...verifiedDocuments].map(id=>byId.get(id))));
  const physicalTrialLinks=linkNomexTrials(experimentRows);
  const physicalRows=verifiedDocuments.has(PMMA_ROD_SOURCE.fileId)?pmmaRodReferences(byId.get(PMMA_ROD_SOURCE.fileId)):[];
  corpus.experiments={rows:experimentRows,materials:Object.entries(MATERIALS).filter(([id])=>experimentRows.some(r=>r.values.material===id)).map(([id,label])=>({id,label})),summary:{rows:experimentRows.length,sources:new Set(experimentRows.map(r=>r.sourceId)).size,tableAudit,documentAudit,scope:'Source rows, not unique trials: CSV and PDF may describe the same run. Never merge values across documents. Explicit inputs and hash-pinned calibration/report derivatives; multi-stage outcomes are not predictions.'}};
  corpus.experiments.physicalRows=physicalRows;
  corpus.experiments.studyEvidence=reviewedStudyEvidence([...verifiedDocuments].map(id=>byId.get(id)));
  if(PSI26_REPORT_SOURCES.every(s=>verifiedDocuments.has(s.fileId)))corpus.experiments.studyEvidence.push(...psi26ReportFragments([...verifiedDocuments].map(id=>byId.get(id))));
  corpus.experiments.summary.studyEvidence={fragments:corpus.experiments.studyEvidence.length,sources:new Set(corpus.experiments.studyEvidence.map(e=>e.sourceId)).size,kind:'Separate material/condition fragments, not joint experimental trials'};
  corpus.experiments.gasModelSources={verified:[GAS_FORMULA_SOURCE,CFIG_REPORT].every(s=>verifiedDocuments.has(s.fileId)),sources:[GAS_FORMULA_SOURCE,CFIG_REPORT]};
  corpus.experiments.summary.physicalTrialLinks=physicalTrialLinks;
  const bassRows=experimentRows.filter(r=>r.sourceId==='PSI-26');
  corpus.experiments.summary.psi26PhysicalTrials={sourceRecords:bassRows.length,uniquePhysicalTrialKeys:new Set(bassRows.map(r=>r.physicalTrialKey||r.runId)).size,meaning:'Linked report and as-run records are not independent experiments; report flow settings are not synchronized with whole-trial pressure.'};
  corpus.experiments.summary.instrumentEstimatesNotScored=experimentRows.filter(r=>r.instrumentReadings?.centerlineEstimate).length;
  corpus.experiments.boundaryReference=verifiedDocuments.has(BASS_REPORT.fileId)?byId.get(BASS_REPORT.fileId):null;
  corpus.experiments.summary.physicalReferences=physicalRows.length;
  // Optional sidecar: never add its profiles to NASA records, file lists or trials.
  corpus.materialSupport=await loadMaterialSupport(root);
  for(const record of corpus.records){
    const rows=experimentRows.filter(r=>r.sourceId===record.id);
    if(rows.length)record.parameters=rows.length+" trial rows have supported input columns normalized; not all measurements are available.";
    for(const table of record.tableReferences||[])table.normalized=tableAudit.some(t=>t.sourceId===record.id&&t.rows>0&&files.find(f=>f.id===t.fileId)?.name.replace(/^[a-f0-9]+__/,'')===table.filename);
  }
  const dataset={available:true,root,corpus,status:{state:'ready',materialSupport:corpus.materialSupport.status,version:manifest.version,investigations:manifest.investigations.length,supportRecords:extra.length,files:files.length,bytes:manifest.payloadBytes,knownMissing:manifest.knownMissing,reviewNeeded:manifest.reviewNeeded,message:"Fixed dataset detected. Files are hash-verified when accessed; not every table has been converted to structured AI conditions."},
    async context(request){
      if(request.mode==='research'){
       let retrieval={indexUnavailable:true};
       if(corpus.sourceContent?.available)try{retrieval=await corpus.sourceContent.retrieve(request);}catch{retrieval={indexUnavailable:true,excluded:[{reason:'content_retrieval_unavailable'}]};}
       return attachSourceFragments({...corpus,records:corpus.records.filter(r=>request.ids.includes(r.id)).map(record=>{
        const fragments=corpus.experiments.studyEvidence.filter(e=>e.sourceId===record.id);
        const chosen=prioritizeStudyFragments(fragments,request).slice(0,6);
        return {...record,content:{...record.content,...(chosen.length?{fileText:chosen.map(e=>'HASH-VERIFIED LOCAL SOURCE FRAGMENT (not a combined trial): '+JSON.stringify(e)).join('\n')}:{})},fileSources:chosen.map(e=>({id:e.provenance.fileId,name:e.provenance.name,sha256:e.provenance.sha256,row:e.provenance.row,page:e.page,sheet:e.sheet,cells:e.cells})),contextWarnings:['Only reviewed file fragments and normalized source rows are supplied; other library files are not automatically interpreted.']};
       })},retrieval);
      }
      const records=[];
      const numericMatches=matchExperiments(corpus,request).matches;
      for(const record of corpus.records.filter(r=>request.ids.includes(r.id))){
        const candidates=files.filter(f=>f.accessions.includes(record.id)&&/\.(csv|tsv|txt|md)$/i.test(f.name)&&f.bytes<=256000).slice(0,2);
        const pieces=[],fileSources=[],contextWarnings=[];
        const numericMatch=numericMatches.find(m=>m.id===record.id),numeric=numericMatch?.experiment;
        if(numeric){let handle;try{
          const verified=await this.file(numeric.provenance.fileId);handle=verified.handle;
          if(numeric.gasPhysics)for(const source of numeric.gasPhysics.sources){const dependency=await this.file(source.fileId);try{if(dependency.row.sha256!==source.sha256)throw Error('Gas equation source changed');fileSources.push({id:source.fileId,name:dependency.row.name,sha256:source.sha256,gasModelSource:true,page:source.page,pages:source.pages});}finally{await dependency.handle.close();}}
          for(const id of new Set([...Object.values(numeric.evidence).map(e=>e.calibration?.fileId),numeric.instrumentReadings?.centerlineEstimate?.calibration?.fileId].filter(Boolean))){const dependency=await this.file(id);await dependency.handle.close();fileSources.push({id,name:dependency.row.name,sha256:dependency.row.sha256,calibrationSource:true});}
          pieces.push('NORMALIZED EXPERIMENT INPUTS and, when present, separately reported observations. Numerical closeness is an application calculation, NOT a risk estimate. Nomex no-sustained-flame observations include brief ignition in F1/F3 and do NOT mean nonflammability. The report summary and appendix disagree in terminology; preserve the discrepancy. F3 printed final O2=0.9 is invalid as no postburn readings were taken. AIR/FAN readings and any SPICE centerline estimate are NOT verified local specimen velocity and are NOT scored. Linked CSV/PDF records are the SAME trial, not independent validation. Missing values are unknown. Material is a family identifier, not certified grade equivalence. Reported flame spread in ignited specimens is NOT an ignition probability or prediction for user inputs. Initial oxygen is not synchronized to each flow stage. Physical-feature percentages compare only the specified stretch rate. Local elasticities are mathematical sensitivities, NOT risk weights; equal stretch with different diameters does not establish equivalent burning. Optional thermal balance is a source-assumption calculation of required heat flux, NOT measured available flame heat or a burn/extinction prediction. Its loss fraction is NOT a similarity percentage; the approximate70% discussion is NOT an enabled decision threshold. When boundary is supplied, signed O2 margin describes location against an empirical source fit, NOT ignition probability or a safety classification. Input uncertainty excludes unknown model error. Overlap is a source-boundary review flag, not validated critical fire risk. SIBAL transitions are terminal experimental observations, NOT a continuous boundary or safety classifier. Pareto layers order separate oxygen/flow distances within each mechanism, NOT risk importance. Input-box overlap does not include unknown source errors. No-blowoff observations are NOT critical thresholds. The source says the12mm quenching boundary was unresolved; nominal oxygen differs from appendix initial/final readings.\n'+JSON.stringify({runId:numeric.runId,gasPhysics:numeric.gasPhysics||null,gasChemistry:numeric.gasChemistry||null,gasConfiguration:numeric.gasConfiguration||null,gasConfigurationEvidence:numeric.gasConfigurationEvidence||null,gasCompositionRequired:numeric.gasCompositionRequired||null,gasCompatibility:numeric.gasCompatibility||null,physicalTrialKey:numeric.physicalTrialKey||null,materialSpecification:numeric.materialSpecification||null,instrumentReadings:numeric.instrumentReadings||null,provenance:numeric.provenance,values:numeric.values,evidence:numeric.evidence,observations:numeric.observations||null,fabricConstruction:numeric.fabricConstruction||null,specimenHistory:numeric.specimenHistory||null,comparisonWarnings:numeric.comparisonWarnings||[],physics:numeric.physics||null,transitions:numeric.transitions||null,boundary:numeric.boundary?{...numeric.boundary,plot:undefined}:null,physicalReference:numeric.physicalReference||null,burningSides:numeric.burningSides||null,inputUncertainty:numeric.inputUncertainty||null,comparisons:numeric.contributions,similarity:numeric.similarity,weightTotal:numeric.weightTotal,comparableWeight:numeric.comparableWeight}));
          fileSources.push({id:numeric.provenance.fileId,name:numeric.provenance.name,sha256:numeric.provenance.sha256,row:numeric.provenance.row,normalizedInputRow:!numeric.physics&&!numeric.boundary&&!numeric.transitions&&!numeric.gasPhysics,derivedModel:Boolean(numeric.physics||numeric.boundary||numeric.transitions||numeric.gasPhysics)});
        }catch{contextWarnings.push('Normalized row source changed or unavailable; excluded.');}finally{if(handle)await handle.close();}}
        const alternatives=numericMatch?.relatedExperiments||[];
        const nomex=[numeric,...alternatives].filter(x=>x?.observations?.type==='reported_nomex_trial');
        if(nomex.length){let handle;try{
          const verified=await this.file(BASS_REPORT.fileId);handle=verified.handle;
          if(verified.row.sha256!==BASS_REPORT.sha256)throw Error('Report changed');
          pieces.push('NOMEX DETAILED OBSERVATIONS: source summary versus appendix discrepancy preserved. No-sustained-flame is not no-brief-ignition or material nonflammability. Unknown ignition exposure and geometry prevent a safety extrapolation.\n'+JSON.stringify(nomex.map(x=>({runId:x.runId,physicalTrialKey:x.physicalTrialKey,sampleId:x.sampleId,values:x.values,materialSpecification:x.materialSpecification,provenance:x.provenance,observations:x.observations}))));
          fileSources.push({id:BASS_REPORT.fileId,name:verified.row.name,sha256:verified.row.sha256,nomexRows:nomex.length,pages:[54,113]});
          for(const linked of nomex.flatMap(x=>x.linkedSourceRows||[])){
            const linkedFile=await this.file(linked.provenance.fileId);try{if(linkedFile.row.sha256!==linked.provenance.sha256)throw Error('Linked source changed');
            const calibrationId=linked.instrumentReadings?.centerlineEstimate?.calibration?.fileId;if(calibrationId){const cal=await this.file(calibrationId);await cal.handle.close();fileSources.push({id:cal.row.id,name:cal.row.name,sha256:cal.row.sha256,calibrationSource:true,notScored:true});}
            pieces.push('SAME PHYSICAL TRIAL, separate source record, NOT independent replication.\n'+JSON.stringify(linked));fileSources.push({id:linkedFile.row.id,name:linkedFile.row.name,sha256:linkedFile.row.sha256,linkedTrial:linked.runId});}finally{await linkedFile.handle.close();}
          }
        }catch{contextWarnings.push('Nomex report or linked source integrity check failed; missing linked evidence excluded.');}finally{if(handle)await handle.close();}}

        const reported=alternatives.filter(x=>x.observations?.type==='reported_sibal_trial');
        if(reported.length){let handle;try{
          const verified=await this.file(BASS_REPORT.fileId);handle=verified.handle;
          if(verified.row.sha256!==BASS_REPORT.sha256)throw Error('Report changed');
          const compact=reported.map(x=>({runId:x.runId,page:x.provenance.page,table:x.provenance.table,row:x.provenance.row,values:x.values,fabricConstruction:x.fabricConstruction,specimenHistory:x.specimenHistory,observedLabel:x.observations.label,sourceComment:x.observations.sourceComment,flowEndpoints:x.observations.flowEndpoints,oxygenQuality:x.observations.oxygenQuality,reportedOxygen:x.observations.reportedOxygen,similarity:x.similarity,comparisonWarnings:x.comparisonWarnings}));
          pieces.push('OTHER SIBAL SOURCE ROWS (not predictions, not averaged or merged). Reused specimens have unknown remaining construction dimensions. Flagged oxygen is excluded from scoring. No-ignition label does not rule out brief ignition followed by extinction. Nominal fixed O2 in chapter differs from initial/final appendix readings. Missing comments do not mean no ignition or safe material.\n'+JSON.stringify(compact));
          fileSources.push({id:BASS_REPORT.fileId,name:verified.row.name,sha256:verified.row.sha256,normalizedAlternativeRows:compact.length,page:104});
        }catch{contextWarnings.push('Alternative SIBAL source changed/unavailable; rows excluded.');}finally{if(handle)await handle.close();}}
        for(const candidate of candidates){
          let handle;try{const verified=await this.file(candidate.id);handle=verified.handle;const buffer=Buffer.alloc(Math.min(candidate.bytes,12000));await handle.read(buffer,0,buffer.length,0);const text=buffer.toString('utf8');if(text.includes('\u0000')){contextWarnings.push(candidate.id+': binary text excluded');continue;}
            pieces.push('['+candidate.id+' | '+candidate.name+']\n'+text);fileSources.push({id:candidate.id,name:candidate.name,sha256:candidate.sha256,truncated:candidate.bytes>12000});
          }catch{contextWarnings.push(candidate.id+': integrity/read failed; excluded');}finally{if(handle)await handle.close();}
        }
        records.push({...record,content:{...record.content,fileText:pieces.join('\n\n')},fileSources,contextWarnings});
      }
      return {...corpus,records};
    },
    list(options={}){return libraryList(files,options,dataset.preparedGraphs?.entries||[]);},
    async file(id){const row=byId.get(id);if(!row)throw Object.assign(new Error("Dosya indeksinde absent."),{status:404});const target=await confinedPath(root,row.path);const s=await stat(target);if(!s.isFile()||s.size!==row.bytes)throw Object.assign(new Error("The file is missing or its size has changed."),{status:409});
      const handle=await open(target,'r');try{const hash=createHash('sha256');for await(const chunk of handle.createReadStream({autoClose:false}))hash.update(chunk);if(hash.digest('hex')!==row.sha256)throw Object.assign(new Error("File hash verification failed."),{status:409});return {row,handle};}catch(e){await handle.close();throw e;}
    }
  };
  corpus.sourceContent=await loadSourceContent(root,{expectedManifestSha256:SOURCE_CONTENT_BASELINE.manifestSha256,expectedCatalogSha256:manifest.filesHash,verifyFile:id=>dataset.file(id),indexRelativePath:SOURCE_CONTENT_BASELINE.indexRelativePath||'Research_Content'});
  dataset.status.sourceContent=corpus.sourceContent.status;
  corpus.hash=digest(Buffer.from([corpus.hash,corpus.sourceContent.hash||'no-content-index'].join('|')));
  dataset.preparedGraphs=await loadPreparedGraphs(root,files,{resolve:confinedPath,verifyFile:id=>dataset.file(id)});
  dataset.status.preparedGraphs=dataset.preparedGraphs.status;
  return dataset;
}
