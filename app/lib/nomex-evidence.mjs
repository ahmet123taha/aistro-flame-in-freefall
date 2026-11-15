import {BASS_REPORT} from './bass-evidence.mjs';
export const NOMEX_SOURCE=Object.freeze({...BASS_REPORT,page:113,printedPage:105,table:'A.2',contextPage:54,section:'3.1.1',materialSpecification:'nomex-iii-natural'});
export const NOMEX_CSV=Object.freeze({fileId:'f24946',sha256:'71e792bf6b5fb5ea620c5dd70fbbac05515992e12aefcf5dff47312caa48c042'});
// Appendix A.2. Keep raw terminal readings separate from usable measurements.
const trials=[
 {runId:'F1',sampleId:'227',asRun:14,date:'2014-02-19',oxygen:22.2,co2:.46,air:9.5,fan:82,restrictor:2,rawInitialOxygen:20.6,finalOxygen:22.2,initialCO:0,finalCO:2,finalCO2:.45,briefIgnition:true,spread:false,igniterOnAtExtinction:true,comment:'Ignited briefly but did not spread at all and extinguished while the igniter was still on'},
 {runId:'F2',sampleId:'228m',asRun:103,date:'2014-07-28',oxygen:21,co2:.37,air:15,fan:92,restrictor:2,rawInitialOxygen:21,finalOxygen:21,initialCO:105,finalCO:82,finalCO2:.39,briefIgnition:null,spread:null,igniterOnAtExtinction:null,comment:'Tried to ignite, flame would not sustain'},
 {runId:'F3',sampleId:'229m',asRun:115,date:'2014-08-01',oxygen:21.7,co2:.36,air:8,fan:61,restrictor:1,rawInitialOxygen:20.8,finalOxygen:null,printedFinalOxygen:.9,initialCO:2,finalCO:null,finalCO2:null,briefIgnition:true,spread:null,igniterOnAtExtinction:null,comment:'Brief ignition flash, no sustained flame; no postburn sensor readings taken'},
];
export function nomexReportRows(file){
 if(file?.id!==NOMEX_SOURCE.fileId||file.sha256!==NOMEX_SOURCE.sha256)return [];
 return trials.map((t,i)=>{
  const values={material:'nomex',oxygen:t.oxygen,co2Percent:t.co2};
  const evidence=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{fileId:file.id,page:113,row:i+1,table:'A.2',column:key==='material'?'Material':key==='oxygen'?'Calibrated initial O2, vol%':'Initial CO2, vol%',raw:key==='material'?'Nomex natural (Nomex III)':String(value),unit:key==='material'?'':"% vol",value,...(key==='oxygen'?{basis:'whole_trial_initial'}:{})}]));
  return {sourceId:'PSI-25',runId:t.runId,sampleId:t.sampleId,values,evidence,materialLabel:"Nomex III · natural (source name)",materialSpecification:NOMEX_SOURCE.materialSpecification,specimenKind:'sheet',flowDirection:'concurrent',specimenHistory:'not_reported',
   provenance:{...NOMEX_SOURCE,name:file.name,row:i+1,kind:'pdf_table'},
   instrumentReadings:{airDisplay:String(t.air),fanDisplay:String(t.fan),flowRestrictor:String(t.restrictor),specimenFlowVerified:false},
   observations:{type:'reported_nomex_trial',label:"No sustained flame observed",outcome:'no_sustained_flame',briefIgnition:t.briefIgnition,spread:t.spread,igniterOnAtExtinction:t.igniterOnAtExtinction,igniter:'Integral',date:t.date,asRun:t.asRun,sampleId:t.sampleId,sourceComment:t.comment,
    initialOxygen:t.oxygen,rawInitialOxygen:t.rawInitialOxygen,finalOxygen:t.finalOxygen,printedFinalOxygen:t.printedFinalOxygen??null,initialCO2:t.co2,finalCO2:t.finalCO2,initialCOppm:t.initialCO,finalCOppm:t.finalCO,
    sourceDiscrepancy:"Section 3.1.1 (PDF 54) summarizes three specimens as not igniting; Appendix A.2 (PDF 113) reports brief ignition/flashes for F1/F3. This record preserves the detailed observations; the statements are not treated as equivalent.",
    limitations:["The absence of sustained flame in these three trials does not establish nonflammability or safety under user conditions.","The source name is Nomex III natural. Fiber proportions, coating, areal density, thickness, width and ignition energy/duration are absent from this table. Results are not transferred to another Nomex product.","Initial O2 and post-trial readings are kept separate. Heated specimen temperature, numerical gravity and gas velocity around the specimen are unknown.",...(t.runId==='F3'?["The final calibrated O2 cell for F3 shows 0.9, but the log states no post-trial measurement was taken; the CSV also says none. The 0.9 value is not used as a valid final measurement or extinction threshold."]:[]) ]}};
 });
}
// Only these three hash-pinned records have cross-document identity evidence.
// Link provenance, never pool numeric values or count two documents as two trials.
export function linkNomexTrials(rows){
 const links=[];
 for(const t of trials){
  const same=rows.filter(r=>r.sourceId==='PSI-25'&&r.runId===t.runId&&r.sampleId===t.sampleId&&r.values.material==='nomex');
  const csv=same.find(r=>r.provenance.fileId===NOMEX_CSV.fileId&&r.provenance.sha256===NOMEX_CSV.sha256);
  const pdf=same.find(r=>r.provenance.fileId===NOMEX_SOURCE.fileId&&r.provenance.sha256===NOMEX_SOURCE.sha256);
  if(!csv||!pdf)continue;
  const equal=['oxygen','co2Percent'].every(k=>csv.values[k]===pdf.values[k])&&csv.materialSpecification===pdf.materialSpecification;
  if(!equal){links.push({runId:t.runId,status:'values_disagree_not_linked'});continue;}
  const key='BASS-II:Nomex:'+t.sampleId+':'+t.runId;
  csv.physicalTrialKey=key;pdf.physicalTrialKey=key;
  const record=r=>({runId:r.runId,provenance:r.provenance,values:r.values,evidence:r.evidence,instrumentReadings:r.instrumentReadings,materialSpecification:r.materialSpecification});
  csv.corroboratingSources=[record(pdf)];pdf.corroboratingSources=[record(csv)];
  links.push({runId:t.runId,sampleId:t.sampleId,physicalTrialKey:key,status:'linked_without_merging',sources:[csv.provenance,pdf.provenance]});
 }
 return links;
}
