import {bassAsRunRows,BASS_ASRUN_SOURCE} from './bass-asrun.mjs';
import {NORMALIZATION_REVIEW_SOURCES} from './reviewed-normalization-evidence.mjs';
import {STANDARD_GRAVITY_MS2} from '../public/gravity-input.mjs';

export const PSI26_REPORT_SOURCE=Object.freeze({...NORMALIZATION_REVIEW_SOURCES.find(s=>s.fileId==='f34124'),
 part:'word/document.xml',kind:'docx_table',table:'I',xmlTableIndex:1,
 methodParagraphs:[29,31],tableAssociationParagraphs:[49,51]});
export const PSI26_REPORT_SOURCES=Object.freeze([PSI26_REPORT_SOURCE,BASS_ASRUN_SOURCE]);
// test, width cm, direction, explicit reported flows cm/s, comment, linked as-run row.
// One Table I row is one physical trial; flow stages are never additional trials.
export const PSI26_REPORT_TABLE=Object.freeze([
 ['1',2,'concurrent',[10,5],'Single flow speed change',4],
 ['7',2,'concurrent',[10],'',7],
 ['8',2,'concurrent',[5],'',8],
 ['4',2,'concurrent',[22],'',15],
 ['10',1,'concurrent',[11],'',16],
 ['5',2,'concurrent',[5,3,1.5,1],'Flow reduction; quenching extinction observed',41],
 ['6',2,'opposed',[9],'',49],
 ['2',2,'concurrent',[9,44],'Flow increase; blowoff extinction not attained',58],
 ['3',2,'opposed',[10,20,44],'Flow increase; blowoff extinction not attained',59],
 ['11',1,'concurrent',[20],'',70],
 ['9',2,'opposed',[10,6,4,2,1.5,1],'Flow reduction; extinction not observed',71],
]);
const temporalBasis='Reported flow setting/sequence and same-physical-trial as-run pressure are not proven time-synchronized measurements.';

export function psi26ReportRows(verifiedFiles){
 const file=verifiedFiles.find(f=>f.id===PSI26_REPORT_SOURCE.fileId&&f.sha256===PSI26_REPORT_SOURCE.sha256);
 const asrunFile=verifiedFiles.find(f=>f.id===BASS_ASRUN_SOURCE.fileId&&f.sha256===BASS_ASRUN_SOURCE.sha256);
 if(!file||!asrunFile)return [];
 const linkedRows=new Map(bassAsRunRows(asrunFile).map(r=>[r.provenance.row,r]));
 return PSI26_REPORT_TABLE.map(([testId,widthCm,flowDirection,flowSequence,comment,asrunRow],index)=>{
  const asrun=linkedRows.get(asrunRow);
  if(!asrun||asrun.testId!==testId||asrun.values.material!=='sibal')throw Error('Reviewed PSI-26 report/as-run identity link differs');
  const provenance={...PSI26_REPORT_SOURCE,name:file.name,xmlRow:index+2,row:index+2};
  const materialProvenance={fileId:file.id,sha256:file.sha256,name:file.name,part:'word/document.xml',bodyParagraph:31,kind:'docx_methods'};
  const values={material:'sibal',widthMm:widthCm*10,pressure:asrun.values.pressure};
  const evidence={
   material:{fileId:file.id,column:'Methods, SIBAL fabric',raw:'75% by mass cotton; remainder fiberglass',value:'sibal',provenance:materialProvenance},
   widthMm:{fileId:file.id,column:'Width(cm)',raw:String(widthCm),sourceUnit:'cm',unit:'mm',factor:10,value:values.widthMm,provenance},
   pressure:{...asrun.evidence.pressure,provenance:{...asrun.provenance},basis:'linked_asrun_whole_trial_not_time_synchronized'},
  };
  if(flowSequence.length===1){
   values.airflow=flowSequence[0];
   evidence.airflow={fileId:file.id,column:'Flow Speed(cm/s)',raw:String(flowSequence[0]),sourceUnit:'cm/s',unit:'cm/s',value:values.airflow,provenance,basis:'report_single_setting_not_synchronized_to_asrun_pressure'};
  }
  return {sourceId:'PSI-26',runId:'report-table-I-test-'+testId,testId,sampleId:asrun.sampleId,
   sourceRun:asrun.sourceRun,physicalTrialKey:asrun.physicalTrialKey,values,evidence,provenance,
   materialLabel:'SIBAL fabric:75% by mass cotton/25% fiberglass',fabricConstruction:'sibal-75-25',
   specimenKind:'sheet',flowDirection,jointlyTested:false,stageTemporalBasis:temporalBasis,
   reviewedPhysicalTrialLink:{basis:'Exact test identifier and SIBAL label in both hash-verified sources',report:provenance,asrun:asrun.provenance},
   // Construction dimensions are annotations, not remaining dimensions of reused fuel.
   originalConstruction:{exposedLengthMm:85,arealDensityMgCm2:18,weaveThreadsPerInch:[60,40],compositionBasis:'mass',provenance:{...materialProvenance,bodyParagraphs:[29,31]},fieldProvenance:{exposedLengthMm:{...materialProvenance,bodyParagraph:29},arealDensityMgCm2:materialProvenance,weaveThreadsPerInch:materialProvenance,compositionBasis:materialProvenance}},
   observations:{type:'reviewed_psi26_report_trial',sourceComment:comment||null,
    flowSequenceCmS:[...flowSequence],flowMode:flowSequence.length===1?'single_reported_setting':'reported_sequence',
    stageValues:flowSequence.map(airflow=>({airflow,unit:'cm/s',sourceRole:'reported_flow_setting',provenance})),
    stageTemporalBasis:temporalBasis,oxygenPerStage:null},
   comparisonWarnings:[temporalBasis,
    'Report and as-run describe the same physical trial; source records and flow settings are not independent experiments.',
    'SIBAL is a cotton/fiberglass composite; the material is not pure Cotton.',
    'No numerical gravity, ambient temperature or oxygen measurement is added. AIR display is not converted.',
    ...(flowSequence.length>1?['Multiple reported flow settings remain a sequence; no mean or intermediate tested setting is invented.']:[])],
  };
 });
}

// Separate settings from a reported sequence, not new trials or synchronized
// pressure/oxygen tuples. Source terminal comments do not apply to every stage.
export function psi26ReportFragments(verifiedFiles){
 const flows=psi26ReportRows(verifiedFiles).map(row=>({sourceId:'PSI-26',material:'sibal',scope:'within_trial_reported_settings',physicalTrialKey:row.physicalTrialKey,jointlyTested:false,
  parameters:{airflow:{kind:'set',values:[...row.observations.flowSequenceCmS],unit:'cm/s',sourceUnit:'cm/s',column:'Flow Speed(cm/s)',basis:'discrete_reported_settings_not_time_synchronized',sourceRole:'reported_flow_setting'}},
  provenance:row.provenance,stageTemporalBasis:row.stageTemporalBasis,
  text:'BASS report Table I, test '+row.testId+': SIBAL '+row.flowDirection+' flow settings '+row.observations.flowSequenceCmS.join(', ')+' cm/s. These are discrete reported settings of one physical trial, not independently repeated trials or a continuous sweep. '+row.stageTemporalBasis+(row.observations.sourceComment?' Terminal/source comment (not a finding at every setting): '+row.observations.sourceComment:'. No terminal outcome is supplied for every setting.')
 }));
 const file=verifiedFiles.find(f=>f.id===PSI26_REPORT_SOURCE.fileId&&f.sha256===PSI26_REPORT_SOURCE.sha256);
 if(!file)return flows;
 // Figure 13 explicitly labels the panels 0-g and 1-g. This is a nominal
 // condition comparison, not a residual-acceleration measurement. Do not infer
 // numeric zero from the word microgravity, or attach this figure to a table run.
 return [...flows,{sourceId:'PSI-26',material:'sibal',scope:'figure_nominal_condition_comparison',jointlyTested:false,
  parameters:{gravityMs2:{kind:'set',values:[0,STANDARD_GRAVITY_MS2],raw:'0-g concurrent-flow flame (left) and 1-g upward flame (right)',sourceUnit:'g',unit:'m/s2',factor:STANDARD_GRAVITY_MS2,approximate:true,sourceRole:'nominal_gravity_setting',basis:'figure_labels_not_measured_residual_acceleration',column:'Figure 13 caption'}},
  provenance:{fileId:file.id,sha256:file.sha256,name:file.name,part:'word/document.xml',bodyParagraph:77,figure:'13',kind:'docx_figure_caption'},
  text:'Figure 13 explicitly compares a nominal 0-g concurrent-flow flame with a nominal 1-g upward flame for the 2-cm-wide SIBAL cotton-fiberglass sample. These figure labels support nominal gravity-setting proximity only, not a measured residual acceleration, a common flow direction, an exact tested tuple or equal combustion behavior. Composition is defined in Methods paragraph 31: 75% cotton by mass, remainder fiberglass. This is not pure cotton.'
 }];
}
