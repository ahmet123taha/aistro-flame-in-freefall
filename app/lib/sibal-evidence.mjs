import {BASS_REPORT} from './bass-evidence.mjs';
export const SIBAL_SOURCE=Object.freeze({...BASS_REPORT,page:104,printedPage:96,table:'7.1',contextPage:102,contextPages:[102,103,104],composition:'75% cotton / 25% fiberglass; fraction basis not specified here',thicknessMm:.32,arealDensityMgCm2:18.2,originalExposedLengthMm:100,pressureKPa:101.325});
// Exact Table7.1 entries: run, width cm, flow endpoints cm/s, O2 vol%, source comment.
// Endpoints are NOT a continuous time series, uncertainty interval, or two steady stages.
export const SIBAL_TABLE=[
 ['GMT45-T1',2.2,[10],18.5,''],['GMT45-T2',2.2,[10,5],18.5,''],
 ['GMT45-T4',2.2,[10,2.2],18.7,'Quenched'],['GMT45-T15',2.2,[10,29],18.7,'No blowoff'],
 ['GMT100-T5',2.2,[10,2.4],18.8,''],['GMT100-T6',2.2,[4.5,2.6],18.8,''],
 ['GMT100-T13',2.2,[4,2.2],17.5,'Quenched'],['GMT100-T16',2.2,[4,3],17.6,''],
 ['GMT175-T9',2.2,[10],16.4,'No ignition'],['GMT175-T10',2.2,[5],16.4,'No ignition'],
 ['GMT175-T18',2.2,[5,2.6],17.4,'Quenched'],['GMT178-T11',2.2,[4],17.1,''],
 ['GMT178-T12',2.2,[5],16.8,'No ignition'],['GMT178-T14',2.2,[4,2.8],16.9,'Quenched'],
 ['GMT178-T17',2.2,[6,53],16.9,'No blowoff'],['GMT190-T19',1.2,[11],17.2,''],
 ['GMT190-T20',1.2,[11,3],17.2,'Quenched'],['GMT190-T21',1.2,[11,47],17.2,'Blow-off'],
 ['GMT190-T22',1.2,[10.5,5],17.1,'Quenched'],['GMT190-T23',2.2,[10],17.2,'Reused, did not ignite'],
 ['GMT190-T24',2.2,[10],18.2,'Reused, one-sided flame'],['GMT216-T25',2.2,[5,2.5],20.8,'Reused, ignited'],
 ['GMT216-T26',2.2,[5,2.5],20.8,'Reused, ignited'],['GMT216-T27',1.2,[5,2],20.7,'Reused, ignited'],
 ['GMT216-T28a',1.2,[5],20.7,'Reused, did not ignite'],['GMT216-T28b',1.2,[5],20.7,'Reused, did not ignite'],
 ['GMT216-T29',1.2,[5,2],20.7,'Reused, ignited'],['GMT96-T8',2.2,[5],21,'BASS'],
 ['GMT96-T7',2.2,[10],21,'BASS'],['GMT131-T10',1.2,[11],21,'BASS'],['GMT222-T11',1.2,[19],21,'BASS'],
];
const labels={not_reported:"Outcome not specified in this table row",quenching:"Quenching as flow decreases",blowoff:"Blowoff at high flow",no_blowoff:"No blowoff observed in the trial",no_ignition:"Reported as no ignition in the table",one_sided:"Single-sided flame",ignited:"Ignition reported"};
export function sibalReportRows(file){
 if(file?.id!==SIBAL_SOURCE.fileId||file.sha256!==SIBAL_SOURCE.sha256)return [];
 return SIBAL_TABLE.map(([runId,widthCm,flows,oxygen,comment],i)=>{
  const reused=comment.startsWith('Reused'),unreliable=i<2;
  const outcome=comment==='Quenched'?'quenching':comment==='Blow-off'?'blowoff':comment==='No blowoff'?'no_blowoff':/No ignition|did not ignite/.test(comment)?'no_ignition':comment.includes('one-sided')?'one_sided':comment==='Reused, ignited'?'ignited':'not_reported';
  const provenance={...SIBAL_SOURCE,name:file.name,row:i+1,kind:'pdf_table'};
  const values={material:'sibal',widthMm:widthCm*10,pressure:101.325},evidence={};
  const put=(key,value,column,raw,unit,page=104,extra={})=>{values[key]=value;evidence[key]={fileId:file.id,row:i+1,page,table:page===104?'7.1':null,column,raw:String(raw),value,unit,...extra};};
  put('material','sibal','Section7.1.3 material','75% cotton / 25% fiberglass','',102);
  put('widthMm',widthCm*10,'Sample width, cm',widthCm,'mm');
  put('pressure',101.325,'Ambient pressure', '1 atm','kPa',102,{basis:'section_nominal',conversion:'1 atm = 101.325 kPa'});
  if(!unreliable)put('oxygen',oxygen,'O2, vol%',oxygen,"% vol",104,{basis:'reported_nominal_fixed',note:"Section7.1.3 describes a constant value during the trial; initial/final readings differ in the supplementary log. These are not a simultaneous measurement series."});
  if(flows.length===1)put('airflow',flows[0],'Flow, cm/s',flows[0],'cm/s');
  // Reused material may be consumed; original construction dimensions are not current measurements.
  if(!reused){
   put('thicknessMm',.32,'Sample thickness','about 0.32 mm','mm',102,{approximate:true,basis:'original_construction'});
   put('arealDensityMgCm2',18.2,'Area density',18.2,'mg/cm²',102,{basis:'original_construction'});
   put('exposedLengthMm',100,'Exposed length','10 cm','mm',102,{basis:'original_construction'});
  }
  return {sourceId:'PSI-25',runId,values,evidence,materialLabel:"SIBAL · 75% cotton / 25% glass fiber",fabricConstruction:'sibal-75-25',specimenKind:'sheet',flowDirection:'concurrent',specimenHistory:reused?'reused':'not_reported',provenance,
   ...(outcome==='one_sided'?{burningSides:1}:{}),
   observations:{type:'reported_sibal_trial',outcome,label:labels[outcome],sourceComment:comment||null,series:i>=27?'BASS':'BASS-II',reportedOxygen:oxygen,oxygenQuality:unreliable?'flagged_inaccurate':'nominal',flowEndpoints:flows,flowMode:flows.length===1?'constant':'changed',reused,
    limitations:[
     "Observation in this trial, not a prediction of ignition or extinction for the user specimen. Extinction and no ignition do not establish nonflammability.",
     "The table’s no-ignition label does not exclude brief flashes; the supplementary log reports brief ignition followed by extinction without spread in some trials.",
     "Oxygen is the nominal table value; the section treats it as constant while initial/final values differ in the supplementary log. Documents are not merged.",
     ...(unreliable?["Table footnote b: the O2 reading may be inaccurate; excluded from numerical similarity."]:[]),
     ...(reused?["Reused, partially burned specimen. Remaining length, thickness and areal density are unknown; original values are not carried into matching."]:["The row does not specify reuse; this is not independent verification that the specimen was unused."]),
     ...(flows.length>1?["The flow column gives initial and final velocities; no average velocity or steady intermediate stage is invented."]:[]),
    ]}};
 });
}
