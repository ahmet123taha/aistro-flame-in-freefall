// Reviewed CFI-G column semantics. Never map burner oxygen to ambient oxygen.
export const CFIG_TABLES={
 normal:{fileId:'f12313',sha256:'d95a621c3fbd27d204dd32ed29fa17d68f2b779d6a523cde8479ed7ebaa5251a'},
 inverse:{fileId:'f12273',sha256:'d4d44f8b9896936728748e34d1b6ad0812032a92fa5289599b708c138e3a9b39'}
};
export const GAS_COMPOSITION_KEYS={normal:['oxygen','fuelPercent'],inverse:['ambientFuelPercent','oxidizerOxygenPercent']};
const decimal=raw=>/^\+?(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(raw).trim())?Number(raw):null;
const yesNo=raw=>/^yes(?:\b|,)/i.test(raw)?true:/^no(?:\b|,)/i.test(raw)?false:null;
export function cfigTrial(c,file,line){
 const gasConfiguration=String(c['Flame Type']||'').trim().toLowerCase();
 const source=CFIG_TABLES[gasConfiguration];
 // The source manifest and readback hash must both identify the reviewed table.
 if(!source||file.id!==source.fileId||file.sha256!==source.sha256)return null;
 const values={},evidence={};
 const fraction=(key,column,basis)=>{const n=decimal(c[column]);if(n===null||n<0||n>1)return;values[key]=100*n;evidence[key]={column,raw:c[column],unit:'% mol',value:100*n,basis,fileId:file.id,row:line};};
 if(gasConfiguration==='normal'){
  fraction('oxygen','XO2 before test','ambient_oxidizer_before_test');
  fraction('fuelPercent','Xf','burner_fuel_stream');
 }else{
  fraction('ambientFuelPercent','Xf  before test','ambient_fuel_before_test');
  fraction('oxidizerOxygenPercent','XO2','burner_oxidizer_stream');
 }
 const raw={hotIgnition:c['Hot ignition']||'',coolFlame:c['Cool flame?']||'',termination:c['Self-ext or flow term']||c['Self -ext or flow term']||'',burnTime:c['burn time (sec)']||'',comments:c.Comments||''};
 const hotIgnition=/^flash$/i.test(raw.hotIgnition)?'flash':yesNo(raw.hotIgnition);
 const coolFlame=yesNo(raw.coolFlame),burnTimeSeconds=decimal(raw.burnTime);
 const observations={type:'reported_cfig_trial',label:"CFI-G ignition and cool-flame observation",hotIgnition,coolFlame,burnTimeSeconds,
  terminationCode:raw.termination||null,sourceComment:raw.comments,raw,
  evidence:Object.fromEntries([['hotIgnition','Hot ignition'],['coolFlame','Cool flame?'],['terminationCode','Self-ext or flow term' in c?'Self-ext or flow term':'Self -ext or flow term'],['burnTimeSeconds','burn time (sec)'],['sourceComment','Comments']].filter(([,k])=>k in c).map(([k,column])=>[k,{column,raw:c[column],fileId:file.id,row:line}])),
  limitations:["No hot ignition does not imply no cool flame. An empty cell means unknown.","SE/FT are source termination codes; alone they do not prove that all combustion reactions ceased.","Trial outcomes are not converted to fire probability in the user environment. Tad and burner temperature are not ambient temperature."]};
 const z=decimal(c.Zst);const gasChemistry={reportedZst:z!==null&&z>0&&z<1?z:null,evidence:{column:'Zst',raw:c.Zst||'',fileId:file.id,row:line}};
 return {gasChemistry,gasConfiguration,gasConfigurationEvidence:{column:'Flame Type',raw:c['Flame Type'],fileId:file.id,row:line},gasCompositionRequired:GAS_COMPOSITION_KEYS[gasConfiguration],values,evidence,observations};
}
export function gasCompatibility(experiment,conditions,weights){
 const applies=experiment.sourceId==='PSI-159';
 const arrangementCompatible=!applies||Boolean(experiment.gasConfiguration&&conditions.gasConfiguration===experiment.gasConfiguration);
 const required=experiment.gasCompositionRequired||[];
 const compositionCompared=!applies||Boolean(required.length&&required.every(k=>Number.isFinite(conditions[k])&&Number.isFinite(experiment.values[k])&&weights[k]>0));
 return {arrangementCompatible,compositionCompared};
}
