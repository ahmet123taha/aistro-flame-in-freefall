import {numericCloseness} from './proximity.mjs';
export const GAS_METHOD='cfig-stoichiometry';
export const GAS_FORMULA_SOURCE={fileId:'f800',sha256:'e783fc0da3d388b567654c109b2595a5a74218de6ccd641241f13b091a5448eb',page:8,equation:'1.1',url:'https://www1.grc.nasa.gov/wp-content/uploads/Flame_Design_SRD_20100401.pdf'};
export const CFIG_REPORT={fileId:'f14515',sha256:'f6cce7cc08ca69c155994d7a8898e21cd4aba122f4e46d5e00708e4889a1ebab',pages:[3,31],url:'https://psi.nasa.gov/physci/repo/data/investigations/PSI-159'};
// CIAAW abridged standard atomic weights (2024). Nominal conversion constants;
// isotope variation is not a quantified input/model error in this calculation.
export const ATOMIC_MASS={C:12.011,H:1.008,N:14.007,O:15.999};
export const GAS_FUELS={ethane:{carbon:2,hydrogen:6},propane:{carbon:3,hydrogen:8},butane:{carbon:4,hydrogen:10}};
export function gasStoichiometry(material,fuelPercent,oxygenPercent){
 const fuel=GAS_FUELS[material];
 if(!fuel||![fuelPercent,oxygenPercent].every(x=>Number.isFinite(x)&&x>0&&x<=100))return null;
 const xf=fuelPercent/100,xo=oxygenPercent/100,mf=fuel.carbon*ATOMIC_MASS.C+fuel.hydrogen*ATOMIC_MASS.H,mo=2*ATOMIC_MASS.O,mn=2*ATOMIC_MASS.N;
 const nuO2=fuel.carbon+fuel.hydrogen/4,s=nuO2*mo/mf;
 const fuelMixtureMass=xf*mf+(1-xf)*mn,oxidizerMixtureMass=xo*mo+(1-xo)*mn;
 const yf=xf*mf/fuelMixtureMass,yo=xo*mo/oxidizerMixtureMass,ratio=s*yf/yo,zst=1/(1+ratio);
 const elasticities={fuelPercent:-(1-zst)*mn/fuelMixtureMass,oxygenPercent:(1-zst)*mn/oxidizerMixtureMass};
 const magnitude=Math.abs(elasticities.fuelPercent)+Math.abs(elasticities.oxygenPercent);
 return {zst,fuelMassFraction:yf,oxygenMassFraction:yo,stoichiometricOxygenMassRatio:s,oxygenMolesPerFuelMole:nuO2,fuelMolarMass:mf,ratio,
  reaction:`C${fuel.carbon}H${fuel.hydrogen} + ${nuO2} O2 -> ${fuel.carbon} CO2 + ${fuel.hydrogen/2} H2O`,
  elasticities,effectShares:{fuelPercent:100*Math.abs(elasticities.fuelPercent)/magnitude,oxygenPercent:100*Math.abs(elasticities.oxygenPercent)/magnitude},
  scope:'Binary fuel/N2 and O2/N2 streams; complete-reaction stoichiometry, not reaction kinetics, heat release, ignition, extinguishment or flammability.'};
}
export function gasStoichiometricMatch(corpus,request){
 const c=request.conditions,reasons=[];
 if(!GAS_FUELS[c.material])reasons.push("This source method applies to ethane, propane or butane.");
 if(c.specimenKind!=='gas')reasons.push("Select the gas fuel / burner specimen type.");
 if(!['normal','inverse'].includes(c.gasConfiguration))reasons.push("Select normal or inverse gas supply configuration.");
 if(c.gasDiluent!=='nitrogen')reasons.push("The remaining component in both streams must be N₂; unknown or other diluents are not assumed.");
 const keys=c.gasConfiguration==='inverse'?['ambientFuelPercent','oxidizerOxygenPercent']:['fuelPercent','oxygen'];
 const calculated=gasStoichiometry(c.material,c[keys[0]],c[keys[1]]);
 if(!calculated)reasons.push("The relevant fuel and oxygen mole percentages must be greater than 0 and no greater than 100.");
 const references=corpus.experiments?.gasModelSources;
 if(!references?.verified)reasons.push("The formula and CFI-G dilution reports could not be verified.");
 const eligible=(corpus.experiments?.rows||[]).filter(r=>request.ids.includes(r.sourceId)&&r.sourceId==='PSI-159'&&r.values.material===c.material&&r.gasConfiguration===c.gasConfiguration&&r.gasChemistry?.reportedZst>0&&r.gasChemistry.reportedZst<1);
 if(!eligible.length)reasons.push("No source Zst record is available for the selected material/configuration.");
 const applicability={applicable:reasons.length===0,reasons};
 const candidates=applicability.applicable?eligible.flatMap(row=>{
  const sourceCalculation=gasStoichiometry(row.values.material,row.values[keys[0]],row.values[keys[1]]);if(!sourceCalculation)return [];
  const score=numericCloseness(calculated.zst,sourceCalculation.zst);
  const contributions=[{key:'stoichiometricMixtureFraction',label:"Calculated Zst",unit:"dimensionless",input:calculated.zst,observed:sourceCalculation.zst,score,weight:100,points:score,status:'derived',evidence:{column:'Eq1.1 from source stream concentrations',raw:String(sourceCalculation.zst),inputColumns:keys.map(k=>row.evidence[k]),formulaSource:GAS_FORMULA_SOURCE,reportedReference:row.gasChemistry.evidence}}];
  for(const [i,key] of keys.entries())contributions.push({key,label:i===0?"Fuel-stream mole percentage":"Oxidizer-stream O₂ mole percentage",unit:'% mol',input:c[key],observed:row.values[key],score:numericCloseness(c[key],row.values[key]),weight:0,points:0,status:'compared',evidence:row.evidence[key]});
  return [{...row,contributions,similarity:score,complete:true,weightTotal:100,comparableWeight:100,knownPoints:score,weightedParameters:1,comparedParameters:3,materialCompatible:true,specimenCompatible:true,
   gasPhysics:{method:GAS_METHOD,calculated,sourceCalculation,reportedZst:row.gasChemistry.reportedZst,sourceDifference:sourceCalculation.zst-row.gasChemistry.reportedZst,keys,sources:[GAS_FORMULA_SOURCE,CFIG_REPORT],
    limitation:"The percentage measures stoichiometric mixture-fraction closeness only. Different compositions can have equal Zst; this does not imply equal ignition, extinction or fire risk. Derivative shares describe local mathematical effects, not general similarity/risk weights."}}];
 }):[];
 candidates.sort((a,b)=>b.similarity-a.similarity||a.provenance.row-b.provenance.row);
 const first=candidates[0];
 return {mode:'numeric_conditions',matches:first?[{id:first.sourceId,experimentId:first.runId,experiment:first,relatedExperiments:candidates.slice(1,51),candidateCount:candidates.length,omittedCandidateCount:Math.max(0,candidates.length-51),similarity:first.similarity,evidenceType:'physical_feature',level:'physical_feature'}]:[],applicability,
  datasetHash:corpus.hash,aiRecommendations:[],numericComparisonAvailable:!!first,weightTotal:100,weightConfigurationComplete:true,weights:{stoichiometricMixtureFraction:100},normalization:corpus.experiments?.summary||{},
  method:{id:GAS_METHOD,formula:'Zst=1/(1+s*YF/YO); s=(C+H/4)*MO2/Mfuel',weightOrigin:'single_stoichiometric_feature_not_risk',scientificallyCalibrated:false},limitation:'Stoichiometry is composition structure; source nominal N2 assumption excludes vitiation products and model uncertainty. No independent fire-risk validation.'};
}
