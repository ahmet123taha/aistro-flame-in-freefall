import {gasStoichiometricMatch,GAS_METHOD} from './gas-stoichiometry.mjs';
import {gasCompatibility} from './gas-trials.mjs';
import {sibalTransitionMatch,SIBAL_TRANSITION_METHOD} from './sibal-transitions.mjs';
import {numericCloseness} from './proximity.mjs';
import {closenessBounds,aggregateInputUncertainty,validateNumericUncertainty} from './numeric-uncertainty.mjs';
import {physicalMatch,PHYSICAL_METHODS} from './pmma-rod-model.mjs';
import {boundaryMatch,BOUNDARY_METHOD} from './pmma-boundary.mjs';
export {numericCloseness} from './proximity.mjs';
export const PARAMETERS=[
 ['gravityMs2',"Gravity",'m/s²',20],['temperatureK',"Ambient temperature",'K',5],['oxygen',"Oxygen","% vol",10],['pressure',"Pressure",'kPa',5],['airflow',"Gas flow velocity",'cm/s',10],['thicknessMm',"Solid specimen thickness",'mm',0],['diameterMm',"Droplet diameter",'mm',0],['widthMm',"Specimen width",'mm',0],['nozzleDiameterMm',"Burner diameter",'mm',0],['co2Percent',"Initial CO₂","% vol",0],['fuelPercent',"Burner fuel concentration",'% mol',0],['ambientFuelPercent',"Ambient fuel concentration",'% mol',0],['oxidizerOxygenPercent',"O₂ in burner oxidizer",'% mol',0],['arealDensityMgCm2',"Fabric areal density",'mg/cm²',0],['exposedLengthMm',"Exposed unburned length",'mm',0],['material',"Material / fuel type",'',0]
];
export const DEFAULT_WEIGHTS=Object.fromEntries(PARAMETERS.map(([key,,,weight])=>[key,weight]));
export function validateWeights(value){
 if(value==null)return {...DEFAULT_WEIGHTS};
 if(typeof value!=='object'||Array.isArray(value))throw Error("Invalid weights.");
 const allowed=new Set(PARAMETERS.map(x=>x[0]));
 if(Object.keys(value).some(k=>!allowed.has(k)))throw Error("Unknown weight parameter.");
 const weights=Object.fromEntries(PARAMETERS.map(([key])=>{const v=value[key]??0;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>100)throw Error("Weights must be between 0 and 100.");return [key,v];}));
 if(Object.values(weights).reduce((a,b)=>a+b,0)>100+1e-7)throw Error("Total weight cannot exceed 100.");
 return weights;
}
export function compareExperiment(experiment,conditions,weights){
 const errors=validateNumericUncertainty(conditions.numericUncertainty,conditions);
 const contributions=PARAMETERS.map(([key,label,unit])=>{
  const input=key==='material'?(conditions.material||null):conditions[key]??null,observed=experiment.values[key]??null,weight=weights[key]??0;
  let score=null;
  if(input!==null&&observed!==null)score=key==='material'?(input===observed?100:0):numericCloseness(input,observed);
  const inputUncertainty=key!=='material'&&score!==null&&errors[key]!==undefined?closenessBounds(input,observed,errors[key]):null;
  return {key,label,unit,input,observed,weight,score,points:score===null?null:score*weight/100,inputUncertainty,evidence:experiment.evidence[key]||null,status:input===null?'input_missing':observed===null?'source_missing':'compared'};
 });
 const weightTotal=Object.values(weights).reduce((a,b)=>a+b,0),compared=contributions.filter(x=>x.score!==null);
 const comparableWeight=compared.reduce((s,x)=>s+x.weight,0),points=compared.reduce((s,x)=>s+x.points,0);
 const materialCompatible=Boolean(conditions.material&&conditions.material===experiment.values.material);
 const specimenCompatible=Boolean(conditions.specimenKind&&conditions.specimenKind===experiment.specimenKind);
 const constructionCompatible=experiment.values.material!=='sibal'||Boolean(conditions.fabricConstruction&&conditions.fabricConstruction===experiment.fabricConstruction);
 const historyCompatible=conditions.specimenHistory?conditions.specimenHistory===experiment.specimenHistory:experiment.specimenHistory!=='reused';
 const specificationCompatible=experiment.values.material!=='nomex'||Boolean(conditions.materialSpecification&&conditions.materialSpecification===experiment.materialSpecification);
 const gas=gasCompatibility(experiment,conditions,weights);
 const qualifiersCompatible=constructionCompatible&&historyCompatible&&specificationCompatible&&gas.arrangementCompatible&&gas.compositionCompared;
 const temporalCompatible=experiment.jointlyTested!==false||compared.filter(c=>c.key!=='material'&&c.weight>0).length<=1;
 const complete=materialCompatible&&specimenCompatible&&qualifiersCompatible&&temporalCompatible&&Math.abs(weightTotal-100)<1e-7&&Math.abs(comparableWeight-100)<1e-7;
 const comparisonWarnings=[...(experiment.comparisonWarnings||[]),...(!constructionCompatible?["Fabric construction was not verified against the source; SIBAL composite is not pure cotton."]:[]),...(!historyCompatible?["Specimen reuse status was not matched to the source."]:[])];
 if(!gas.arrangementCompatible)comparisonWarnings.push("CFI-G normal/inverse supply configuration was not matched to the source; no overall score is available.");
 if(!gas.compositionCompared)comparisonWarnings.push("CFI-G requires both reactant-stream concentrations in the inputs and source, compared with positive weights. Pressure closeness alone cannot produce an overall score.");
 if(!specificationCompatible)comparisonWarnings.push("Nomex product specification was not matched to the source; material family alone is insufficient for an overall score.");
 if(experiment.instrumentReadings&&!experiment.evidence.airflow)comparisonWarnings.push("AIR/FAN are instrument readings; they are not scored as gas velocity because calibration applicability at the specimen position is unverified.");
 return {...experiment,gasCompatibility:gas,contributions,inputUncertainty:aggregateInputUncertainty(contributions,complete),materialCompatible,specimenCompatible,constructionCompatible,historyCompatible,specificationCompatible,temporalCompatible,comparisonWarnings,weightTotal,comparableWeight,knownPoints:points,similarity:complete?points:null,complete,comparedParameters:compared.length,weightedParameters:compared.filter(x=>x.weight>0).length,scoreRange:materialCompatible&&specimenCompatible&&qualifiersCompatible&&temporalCompatible&&Math.abs(weightTotal-100)<1e-7?{min:points,max:points+100-comparableWeight}:null};
}
export function matchExperiments(corpus,request){
 if(request.method===GAS_METHOD)return gasStoichiometricMatch(corpus,request);
 if(request.method===SIBAL_TRANSITION_METHOD)return sibalTransitionMatch(corpus,request);
 if(request.method===BOUNDARY_METHOD)return boundaryMatch(corpus,request);
 if(PHYSICAL_METHODS.includes(request.method))return physicalMatch(corpus,request);
 const weights=validateWeights(request.weights),conditions=request.conditions,weightTotal=Object.values(weights).reduce((a,b)=>a+b,0),groups=new Map();
 let materialUnknown=0,materialMismatch=0,notComparable=0;
 for(const row of corpus.experiments?.rows||[]){
  if(!request.ids.includes(row.sourceId))continue;
  if(conditions.material){if(!row.values.material){materialUnknown++;continue;}if(row.values.material!==conditions.material){materialMismatch++;continue;}}
  if(conditions.gasConfiguration&&row.gasConfiguration!==conditions.gasConfiguration)continue;
  if(conditions.flowDirection&&row.flowDirection!==conditions.flowDirection)continue;
  if(conditions.specimenKind&&row.specimenKind!==conditions.specimenKind)continue;
  if(conditions.burningSides&&row.burningSides!==conditions.burningSides)continue;
  if(conditions.fabricConstruction&&row.fabricConstruction&&row.fabricConstruction!==conditions.fabricConstruction)continue;
  if(conditions.materialSpecification&&row.materialSpecification&&row.materialSpecification!==conditions.materialSpecification)continue;
  if(conditions.specimenHistory&&row.specimenHistory&&row.specimenHistory!=='not_reported'&&row.specimenHistory!==conditions.specimenHistory)continue;
  const result=compareExperiment(row,conditions,weights);
  if(!result.contributions.some(x=>x.key!=='material'&&x.score!==null&&x.weight>0)){notComparable++;continue;}
  if(!groups.has(row.sourceId))groups.set(row.sourceId,[]);
  groups.get(row.sourceId).push(result);
 }
 const order=(a,b)=>Number(b.complete)-Number(a.complete)||b.knownPoints-a.knownPoints||b.comparableWeight-a.comparableWeight||a.sourceId.localeCompare(b.sourceId);
 for(const [id,rows] of groups){
  const unique=[],byTrial=new Map();
  for(const row of rows){if(!row.physicalTrialKey){unique.push(row);continue;}if(!byTrial.has(row.physicalTrialKey))byTrial.set(row.physicalTrialKey,[]);byTrial.get(row.physicalTrialKey).push(row);}
  for(const variants of byTrial.values()){
   // Prefer the detailed source observation; never maximize score across duplicate documents.
   variants.sort((a,b)=>Number(Boolean(b.observations))-Number(Boolean(a.observations))||a.provenance.fileId.localeCompare(b.provenance.fileId));
   const primary=variants[0],linked=primary.corroboratingSources||variants.slice(1).map(r=>({runId:r.runId,provenance:r.provenance,values:r.values,evidence:r.evidence,instrumentReadings:r.instrumentReadings,materialSpecification:r.materialSpecification}));
   unique.push({...primary,linkedSourceRows:linked,sourceRecordCount:1+linked.length});
  }
  unique.sort(order);groups.set(id,unique);
 }
 const matches=[...groups.values()].sort((a,b)=>order(a[0],b[0])).slice(0,12).map(rows=>{const row=rows[0];return {id:row.sourceId,experimentId:row.runId,experiment:row,relatedExperiments:rows.slice(1,51),candidateCount:rows.length,omittedCandidateCount:Math.max(0,rows.length-51),similarity:row.similarity,evidenceType:'numeric',sourceRows:[row.provenance.fileId+':'+row.provenance.row],reasonTags:row.contributions.filter(x=>x.score!==null&&x.key!=='material').slice(0,4).map(x=>x.label+' %'+x.score.toFixed(1)),reason:row.materialLabel||"Material not specified",level:'numeric'};});
 return {mode:'numeric_conditions',matches,weights,weightTotal,weightConfigurationComplete:Math.abs(weightTotal-100)<1e-7,datasetHash:corpus.hash,aiRecommendations:[],numericComparisonAvailable:matches.length>0,materialUnknown,materialMismatch,notComparable,normalization:corpus.experiments?.summary||{rows:0,sources:0},method:{id:'relative-closeness-v1',formula:'s(a,b)=100×min(a,b)/max(a,b); a=b=0 ise100; toplam=Σ(w×s/100)',weightOrigin:'user_configured',scientificallyCalibrated:false,missing:"Missing parameters are not reweighted. An overall score requires weights totaling 100 and all weighted fields to be comparable."},limitation:"Numerical closeness is a similarity method, not fire risk or safety approval."};
}
