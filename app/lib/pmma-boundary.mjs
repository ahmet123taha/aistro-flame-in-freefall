import {BASS_REPORT} from './bass-evidence.mjs';
import {boundaryComponents} from '../public/figure-models.mjs';
import {numericCloseness} from './proximity.mjs';
export const BOUNDARY_METHOD='pmma-rod-boundary';
export const PMMA_BOUNDARY_SOURCE=Object.freeze({...BASS_REPORT,page:83,printedPage:75,table:null,contextPage:74,equation:'6.1',figure:'6.9/6.10',contextPages:[74,75,76,83,84],referenceRadiusCm:.318,
 formula:'Xb=6 exp(−0.5a)+0.0167a+13.4; a=(3/2)(U/r)√(r/r0)',
 plotWindow:{stretchMin:1,stretchMax:150,oxygenMin:13,oxygenMax:19},
 scope:'Selected plotting window from Figures6.9/6.10, not an independently validated domain. Extinction of already established flames, not ignition probability.'});
export const MINIMUM_STRETCH=2*Math.log(3/.0167);
export function normalizedRodStretch(U,D){
 if(!Number.isFinite(U)||!Number.isFinite(D)||U<=0||D<=0)return null;
 const r=D/20;return 1.5*U/r*Math.sqrt(r/PMMA_BOUNDARY_SOURCE.referenceRadiusCm);
}
export function oxygenBoundary(a){
 if(!Number.isFinite(a)||a<=0)return null;
 return boundaryComponents(a).combined;
}
export function boundaryValue(U,D,X){
 const a=normalizedRodStretch(U,D);if(a===null||!Number.isFinite(X))return null;
 const value=oxygenBoundary(a),derivative=-3*Math.exp(-.5*a)+.0167;
 // Δ=X-Xb. Unit derivatives and dimensionless normalized local derivatives are separate.
 return {normalizedStretch:a,boundaryOxygen:value,oxygenMarginPp:X-value,minimumStretch:MINIMUM_STRETCH,minimumOxygen:oxygenBoundary(MINIMUM_STRETCH),
 branch:a<MINIMUM_STRETCH?'quenching_side':a>MINIMUM_STRETCH?'blowoff_side':'minimum',
 closenessToBoundaryPercent:numericCloseness(X,value),
 derivatives:[{key:'oxygen',unit:'pp / pp',marginDerivative:1,scaledMarginDerivative:X},
 {key:'airflow',unit:'pp / (cm/s)',marginDerivative:-derivative*a/U,scaledMarginDerivative:-derivative*a},
 {key:'rodDiameterMm',unit:'pp / mm',marginDerivative:derivative*a/(2*D),scaledMarginDerivative:derivative*a/2}],
 nominalPosition:X>value?'above_fit':X<value?'below_fit':'on_fit'};
}
export function boundaryUncertainty(c){
 const keys=['oxygenUncertaintyPp','airflowUncertaintyCmS','diameterUncertaintyMm'];
 if(keys.some(k=>!Number.isFinite(c[k])||c[k]<0))return {status:'unknown',reason:"All three measurement error bounds are required; an empty value is not zero."};
 const U=[c.airflow-c.airflowUncertaintyCmS,c.airflow+c.airflowUncertaintyCmS],D=[c.rodDiameterMm-c.diameterUncertaintyMm,c.rodDiameterMm+c.diameterUncertaintyMm],X=[c.oxygen-c.oxygenUncertaintyPp,c.oxygen+c.oxygenUncertaintyPp];
 const a=[normalizedRodStretch(U[0],D[1]),normalizedRodStretch(U[1],D[0])],w=PMMA_BOUNDARY_SOURCE.plotWindow;
 if(U[0]<=0||D[0]<6.35||D[1]>12.7||X[0]<w.oxygenMin||X[1]>w.oxygenMax||a.some(v=>v===null)||a[0]<w.stretchMin||a[1]>w.stretchMax)return {status:'outside_window',reason:"Part of the uncertainty box lies outside the selected source window; it is not clipped."};
 const values=[oxygenBoundary(a[0]),oxygenBoundary(a[1])];
 if(a[0]<=MINIMUM_STRETCH&&a[1]>=MINIMUM_STRETCH)values.push(oxygenBoundary(MINIMUM_STRETCH));
 const boundary=[Math.min(...values),Math.max(...values)],margin=[X[0]-boundary[1],X[1]-boundary[0]];
 return {status:'bounded',inputBounds:{airflow:U,rodDiameterMm:D,oxygen:X},stretchBounds:a,boundaryOxygenBounds:boundary,marginBoundsPp:margin,
 relation:margin[0]<=0&&margin[1]>=0?'overlaps_fit':margin[0]>0?'above_fit':'below_fit',
 modelErrorIncluded:false,note:"Box calculation from entered measurement intervals without correlation information; not a confidence interval. Empirical fit error and model uncertainty are excluded."};
}
export function boundaryApplicability(c){
 const reasons=[],w=PMMA_BOUNDARY_SOURCE.plotWindow;
 if(c.material!=='pmma'||c.materialVariant!=='cast-pmma'||c.specimenKind!=='rod')reasons.push("Select a cast-PMMA rod.");
 if(c.tipShape!=='hemispherical'||c.flowDirection!=='concurrent')reasons.push("An approximately hemispherical tip and concurrent flow are required.");
 if(c.gravityRegime!=='microgravity'||(c.gravityMs2!=null&&c.gravityMs2!==0))reasons.push("The source concerns microgravity; transfer to other gravity conditions has not been validated.");
 if(c.flameState!=='established')reasons.push("The curve describes extinction of a previously ignited, established flame; it is not an ignition calculation.");
 if(c.oxidizerDiluent!=='nitrogen')reasons.push("The source dilutes air with N₂; no transfer to other diluents is established.");
 if(c.oxygenBasis!=='boundary_state')reasons.push("Oxygen must represent the boundary state; an initial trial value alone is insufficient.");
 if(!(c.rodDiameterMm>=6.35&&c.rodDiameterMm<=12.7))reasons.push("Source rod-diameter range: 6.35–12.7 mm.");
 if(!Number.isFinite(c.oxygen)||c.oxygen<w.oxygenMin||c.oxygen>w.oxygenMax)reasons.push("Oxygen is missing or outside the selected 13–19% source plot window.");
 const a=normalizedRodStretch(c.airflow,c.rodDiameterMm);
 if(a===null||a<w.stretchMin||a>w.stretchMax)reasons.push("Normalized stretch must lie within the selected 1–150 s⁻¹ source plot window.");
 return {applicable:reasons.length===0,reasons,scope:"Comparison with the source empirical curve; no independent transfer validation for pressure, temperature or actual material properties. Not a safety decision."};
}
// An analyst-chosen relative probe, NOT sensor uncertainty or a safety action.
// Exact extrema reuse the source curve's analytic stationary point. Shares are
// normalized one-at-a-time excursions of the same dimensional output (O2 pp).
export function boundarySensitivity(c){
 const stepPercent=c.boundaryProbePercent??1;
 if(!Number.isFinite(stepPercent)||stepPercent<.01||stepPercent>10)return {status:'invalid_probe',reason:"The sensitivity step must be between 0.01% and 10%."};
 const scope=boundaryApplicability(c);
 if(!scope.applicable)return {status:'not_applicable',reasons:scope.reasons};
 const fraction=stepPercent/100,nominal=boundaryValue(c.airflow,c.rodDiameterMm,c.oxygen);
 const outsideReason="The sensitivity interval extends beyond the source window; it was not clipped.";
 const errors={oxygen:'oxygenUncertaintyPp',airflow:'airflowUncertaintyCmS',rodDiameterMm:'diameterUncertaintyMm'};
 const zeroErrors={oxygenUncertaintyPp:0,airflowUncertaintyCmS:0,diameterUncertaintyMm:0};
 const rows=Object.entries(errors).map(([key,errorKey])=>{
  const halfWidth=c[key]*fraction,inputBounds=[c[key]-halfWidth,c[key]+halfWidth];
  const interval=boundaryUncertainty({...c,...zeroErrors,[errorKey]:halfWidth});
  const base={key,input:c[key],inputBounds,stepPercent,sharePercent:null};
  if(interval.status!=='bounded')return {...base,status:'outside_window',reason:outsideReason};
  const derivative=nominal.derivatives.find(s=>s.key===key).marginDerivative;
  const changes=inputBounds.map(v=>{const p={...c,[key]:v};return boundaryValue(p.airflow,p.rodDiameterMm,p.oxygen).oxygenMarginPp-nominal.oxygenMarginPp;});
  const deltaBounds=interval.marginBoundsPp.map(v=>v-nominal.oxygenMarginPp);
  const linearChanges=[-halfWidth*derivative,halfWidth*derivative];
  return {...base,status:'calculated',marginDerivative:derivative,changesPp:{decrease:changes[0],increase:changes[1]},
   linearChangesPp:{decrease:linearChanges[0],increase:linearChanges[1]},
   endpointLinearErrorPp:Math.max(...changes.map((v,i)=>Math.abs(v-linearChanges[i]))),
   marginBoundsPp:interval.marginBoundsPp,deltaBoundsPp:deltaBounds,
   maxExcursionPp:Math.max(...deltaBounds.map(Math.abs)),
   stationaryPointIncluded:key!=='oxygen'&&interval.stretchBounds[0]<=MINIMUM_STRETCH&&interval.stretchBounds[1]>=MINIMUM_STRETCH};
 });
 const complete=rows.every(r=>r.status==='calculated');
 const sum=complete?rows.reduce((n,r)=>n+r.maxExcursionPp,0):null;
 if(sum>0)for(const r of rows)r.sharePercent=100*r.maxExcursionPp/sum;
 const joint=boundaryUncertainty({...c,...Object.fromEntries(Object.entries(errors).map(([k,e])=>[e,c[k]*fraction]))});
 return {status:complete?'calculated':'partial',stepPercent,stepOrigin:'analyst_relative_probe',nominalMarginPp:nominal.oxygenMarginPp,rows,
  sharesAvailable:complete&&sum>0,sumIndividualExcursionsPp:sum,
  jointProbe:{status:joint.status,marginBoundsPp:joint.marginBoundsPp??null,reason:joint.status==='bounded'?null:outsideReason,modelErrorIncluded:false},
  excludedParameters:['temperatureK','pressure','gravityMs2','material_properties'],
  scope:"Effect on ΔO₂ in the source equation for an equal relative perturbation. The step is not measurement error. Shares are not fire risk, experimental importance or similarity weights; they can change with the step and baseline conditions.",
  interactionNote:"Adding individual effects does not give the joint effect. The simultaneous oxygen/velocity/diameter box is computed separately using the full equation; it is not a statistical Sobol index. Source fit error is excluded."};
}
export function boundaryMatch(corpus,request){
 const c=request.conditions,applicability=boundaryApplicability(c),reference=corpus.experiments?.boundaryReference;
 if(reference?.id!==PMMA_BOUNDARY_SOURCE.fileId||reference.sha256!==PMMA_BOUNDARY_SOURCE.sha256||!request.ids.includes('PSI-25')){applicability.applicable=false;applicability.reasons.push("The verified BASS-II boundary source is not selected.");}
 const value=applicability.applicable?boundaryValue(c.airflow,c.rodDiameterMm,c.oxygen):null;
 const boundary=value?{...value,uncertainty:boundaryUncertainty(c),sensitivity:boundarySensitivity(c),source:PMMA_BOUNDARY_SOURCE,input:c,
  plot:{...PMMA_BOUNDARY_SOURCE.plotWindow,curve:Array.from({length:101},(_,i)=>{const a=Math.exp(i*Math.log(150)/100);return {a,oxygen:oxygenBoundary(a)};})},
  limitation:"This comparison shows position relative to the source fit curve. Above is the source sustained-burning side; below is the extinction side. It does not determine burning/nonburning or safety in the real scenario. Fit-coefficient error distributions are unknown. Similarity is not a fire-hazard ranking."}:null;
 const experiment=boundary?{sourceId:'PSI-25',runId:'PMMA-boundary-Eq6.1',materialLabel:"Cast PMMA · established-flame extinction boundary",specimenKind:'rod',values:{material:'pmma'},evidence:{},contributions:[],provenance:{...PMMA_BOUNDARY_SOURCE,name:reference.name,kind:'empirical_equation'},boundary,
  similarity:null,complete:false,weightTotal:0,comparableWeight:0,knownPoints:0,weightedParameters:0}:null;
 return {mode:'numeric_conditions',datasetHash:corpus.hash,method:{id:BOUNDARY_METHOD,weightOrigin:'empirical_boundary_not_weighted_similarity',scientificallyCalibrated:false,sourceFit:true},applicability,
  matches:experiment?[{id:'PSI-25',experimentId:experiment.runId,experiment,similarity:null,evidenceType:'source_boundary',sourceRows:[reference.id+':Eq6.1'],level:'boundary_review'}]:[],
  aiRecommendations:[],numericComparisonAvailable:Boolean(experiment),normalization:corpus.experiments?.summary||{},weightTotal:0,weightConfigurationComplete:false,weights:{},limitation:"Published experimental fit, not independent safety/decision validation."};
}
