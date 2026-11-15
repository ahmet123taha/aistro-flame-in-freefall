import {BASS_ASRUN_DATA} from './bass-asrun-data.mjs';
import {materialId,specimenKind} from './experiment-tables.mjs';

export const BASS_ASRUN_SOURCE=Object.freeze({fileId:'f24955',sha256:'850910541fc9c802d00aa9de14758205103642184249b419c09868df2fbea6e8',sheet:'as run matrix',worksheet:'xl/worksheets/sheet1.xml',kind:'xlsx_cells'});
export const BASS_ASRUN_LIMITS=Object.freeze([
 'No numerical gravity or ambient temperature is reported in this worksheet. ISS microgravity is not converted to zero or 0.16 m/s2.',
 'Oxygen heading says O2 % by volume but stored/displayed values are fractions such as 0.221 (format 0.000, not percent). Unit scale is unresolved; raw values are retained and are not scored.',
 'AIR display is an instrument setting, often a multi-stage string. It is not scored as local specimen velocity.',
 'Only the as run matrix is indexed. Year-specific duplicate sheets, planned trials and missing-TP summaries are not additional independent measurements.',
]);
export function bassAsRunRows(file){
 if(file?.id!==BASS_ASRUN_SOURCE.fileId||file.sha256!==BASS_ASRUN_SOURCE.sha256)return [];
 return BASS_ASRUN_DATA.map(r=>{
  const material=materialId(r.material),pressure=Number(r.pressureAtm)*101.325;
  const provenance={...BASS_ASRUN_SOURCE,name:file.name,row:r.row,cells:{run:'C'+r.row,test:'D'+r.row,sample:'E'+r.row,material:'F'+r.row,pressure:'AB'+r.row}};
  const values={pressure,...(material?{material}:{})};
  const evidence={pressure:{fileId:file.id,sheet:BASS_ASRUN_SOURCE.sheet,row:r.row,cell:'AB'+r.row,column:'pressure, atm',raw:r.pressureAtm,...(r.pressureFormula?{sourceFormula:r.pressureFormula,cacheChecked:true}:{}),sourceUnit:'atm',unit:'kPa',factor:101.325,value:pressure}};
  if(material)evidence.material={fileId:file.id,sheet:BASS_ASRUN_SOURCE.sheet,row:r.row,cell:'F'+r.row,column:'material',raw:r.material,value:material};
  return {sourceId:'PSI-26',physicalTrialKey:'PSI-26:asrun:f24955:row'+r.row,runId:'asrun-'+r.run+'-row-'+r.row,sourceRun:r.run,sampleId:r.sample,testId:r.test,materialLabel:r.material,specimenKind:specimenKind('PSI-26',r.material),values,evidence,provenance,
   instrumentReadings:{airDisplay:r.airDisplay,specimenFlowVerified:false},
   unscoredSourceValues:{oxygen:{raw:r.oxygenRaw,cell:'AA'+r.row,heading:'O2 % by volume',displayFormat:'0.000',status:'unit_scale_unresolved'}},comparisonWarnings:[...BASS_ASRUN_LIMITS]};
 });
}
