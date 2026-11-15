import {SIBAL_SOURCE} from './sibal-evidence.mjs';
import {numericCloseness} from './proximity.mjs';
export const SIBAL_TRANSITION_METHOD='sibal-transition-review';
export const TRANSITION_SCOPE={...SIBAL_SOURCE,interpretationPages:[106,108,109],figure:'7.7',window:{airflow:[1,55],oxygen:[16,21]},kind:'observed_endpoints_not_fitted_boundary'};
const near=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<1e-9;
export function transitionApplicability(c){
 const reasons=[];
 if(c.material!=='sibal'||c.fabricConstruction!=='sibal-75-25'||c.specimenKind!=='sheet')reasons.push("Select SIBAL 75% cotton / 25% glass fiber and a solid fabric specimen.");
 if(c.flowDirection!=='concurrent'||c.gravityRegime!=='microgravity'||(c.gravityMs2!=null&&c.gravityMs2!==0))reasons.push("The source concerns concurrent flow and microgravity.");
 if(c.flameState!=='established')reasons.push("This review concerns quenching/blowoff observations of established flames, not an ignition calculation.");
 if(c.specimenHistory==='reused')reasons.push("Reused specimens are not represented in this transition group.");
 if(![12,22].some(w=>near(c.widthMm,w)))reasons.push("Source width must be 12 or 22 mm; boundaries are not transferred between widths.");
 for(const [key,value,label] of [['pressure',101.325,"Pressure (kPa)"],['thicknessMm',.32,"Nominal initial thickness (mm)"],['arealDensityMgCm2',18.2,"Initial areal density (mg/cm²)"],['exposedLengthMm',100,"Initial exposed length (mm)"]])if(!near(c[key],value))reasons.push(`${label}: nominal source value ${value}. Transfer to a different construction/pressure has not been validated.`);
 for(const [key,[min,max]] of Object.entries(TRANSITION_SCOPE.window))if(!Number.isFinite(c[key])||c[key]<min||c[key]>max)reasons.push(`${key}: source experimental window ${min}–${max} must be within the stated range.`);
 return {applicable:!reasons.length,reasons,scope:"Distance from source events with the same nominal construction. Matching nominal construction is not material certification or verification of specimen history; no extinction boundary is predicted."};
}
// Multi-objective ordering: no invented linear tradeoff between pp O2 and cm/s flow.
export function paretoLayers(points){
 if(points.some(p=>!p.runId||![p.distance?.oxygen,p.distance?.airflow].every(v=>Number.isFinite(v)&&v>=0))||new Set(points.map(p=>p.runId)).size!==points.length)throw Error('Invalid/nonfinite or duplicate distance points');
 const result=new Map(),remaining=[...points];let rank=1;
 while(remaining.length){
  const front=remaining.filter(p=>!remaining.some(q=>q!==p&&q.distance.oxygen<=p.distance.oxygen&&q.distance.airflow<=p.distance.airflow&&(q.distance.oxygen<p.distance.oxygen||q.distance.airflow<p.distance.airflow)));
  if(!front.length)throw Error('Invalid/nonfinite distance points');
  for(const p of front){result.set(p.runId,rank);remaining.splice(remaining.indexOf(p),1);}rank++;
 }
 return result;
}
export function transitionInputBox(c){
 if(![c.oxygenUncertaintyPp,c.airflowUncertaintyCmS].every(v=>Number.isFinite(v)&&v>=0))return {status:'unknown',note:"Oxygen and flow error bounds are required; an empty value is not zero."};
 const oxygen=[c.oxygen-c.oxygenUncertaintyPp,c.oxygen+c.oxygenUncertaintyPp],airflow=[c.airflow-c.airflowUncertaintyCmS,c.airflow+c.airflowUncertaintyCmS];
 if(oxygen[0]<16||oxygen[1]>21||airflow[0]<1||airflow[1]>55)return {status:'outside_window',note:"Part of the measurement box lies outside the source window; the interval was not clipped."};
 return {status:'bounded',oxygen,airflow,sourceUncertaintyKnown:false,note:"Only user measurement bounds are included. Source-point error is unknown; overlap is not a confidence interval or risk class."};
}
export function evaluateTransitions(rows,c){
 const inputBox=transitionInputBox(c),eligible=rows.filter(r=>r.observations?.type==='reported_sibal_trial'&&r.provenance.sha256===SIBAL_SOURCE.sha256&&r.provenance.fileId===SIBAL_SOURCE.fileId&&near(r.values.widthMm,c.widthMm)&&!r.observations.reused);
 const events=[],notObserved=[];
 for(const r of eligible){
  const o=r.observations;if(!['quenching','blowoff','no_blowoff'].includes(o.outcome))continue;
  if(c.transitionKind&&c.transitionKind!=='all'&&(c.transitionKind==='quenching'?o.outcome!=='quenching':!['blowoff','no_blowoff'].includes(o.outcome)))continue;
  const terminal=o.flowEndpoints.at(-1),sourceOxygen=o.reportedOxygen,deltaU=c.airflow-terminal,deltaX=c.oxygen-sourceOxygen;
  const overlap=inputBox.status==='bounded'?inputBox.airflow[0]-1e-12<=terminal&&terminal<=inputBox.airflow[1]+1e-12&&inputBox.oxygen[0]-1e-12<=sourceOxygen&&sourceOxygen<=inputBox.oxygen[1]+1e-12:null;
  const point={runId:r.runId,kind:o.outcome,label:o.label,widthMm:r.values.widthMm,sourceOxygen,initialFlow:o.flowEndpoints[0],terminalFlow:terminal,deltaOxygenPp:deltaX,deltaAirflowCmS:deltaU,distance:{oxygen:Math.abs(deltaX),airflow:Math.abs(deltaU)},oxygenCloseness:numericCloseness(c.oxygen,sourceOxygen),airflowCloseness:numericCloseness(c.airflow,terminal),inputBoxContainsObservation:overlap,sourceComment:o.sourceComment,provenance:r.provenance};
  if(o.outcome==='no_blowoff'){point.inputBoxContainsObservation=null;point.note="No blowoff was observed at the final velocity. This point is neither a blowoff threshold nor a numerical lower bound on a future threshold.";notObserved.push(point);}else events.push(point);
 }
 for(const kind of ['quenching','blowoff']){const group=events.filter(p=>p.kind===kind),ranks=paretoLayers(group);for(const p of group)p.paretoLayer=ranks.get(p.runId);}
 events.sort((a,b)=>a.kind.localeCompare(b.kind)||a.paretoLayer-b.paretoLayer||a.distance.oxygen-b.distance.oxygen||a.distance.airflow-b.distance.airflow||a.runId.localeCompare(b.runId));
 return {events,notObserved,inputBox,overlapCount:events.filter(e=>e.inputBoxContainsObservation===true).length,
  ordering:"Pareto layers based on oxygen and flow differences within the same mechanism. Layer1: no other observation is closer in both dimensions. Layers are not risk levels.",
  physicalInterpretation:"Source PDF106/108: at low flow, pyrolysis and heat release decrease while radiation and then conduction losses become important; three-dimensional heat/mass transfer matters near the boundary. This qualitative explanation does not yield fixed numerical weights.",
  limitations:[c.widthMm===12?"The source explicitly states that the 12 mm specimen extinction boundary was unresolved; only individual events are shown.":"The source plots part of the 22 mm boundary; that curve is neither digitized nor invented here.",
   "Final flow is the experimental condition at which the event is reported; the full transient flow history and simultaneous oxygen at the event are unknown.",
   "Nominal source oxygen differs from initial/final supplementary-log readings. The points are not independent boundary validation.",
   "Proximity to points or measurement-box overlap does not prove burning/extinction or a safe/critical decision under user conditions.",
   "No-blowoff records are not scored as event thresholds. There is no single risk ranking across mechanisms."]};
}
export function sibalTransitionMatch(corpus,request){
 const c=request.conditions,applicability=transitionApplicability(c),reference=corpus.experiments?.boundaryReference;
 if(reference?.id!==SIBAL_SOURCE.fileId||reference.sha256!==SIBAL_SOURCE.sha256||!request.ids.includes('PSI-25')){applicability.applicable=false;applicability.reasons.push("The verified BASS-II report is not selected.");}
 const transitions=applicability.applicable?{...evaluateTransitions(corpus.experiments?.rows||[],c),input:c,source:TRANSITION_SCOPE}:null;
 const experiment=transitions?{sourceId:'PSI-25',runId:'SIBAL-observed-transitions',values:{material:'sibal'},evidence:{},contributions:[],materialLabel:"SIBAL · observed quenching and blowoff conditions",specimenKind:'sheet',provenance:{...SIBAL_SOURCE,name:reference.name,kind:'observed_transition_review'},transitions,similarity:null,complete:false,weightTotal:0,comparableWeight:0,knownPoints:0,weightedParameters:0}:null;
 return {mode:'numeric_conditions',datasetHash:corpus.hash,method:{id:SIBAL_TRANSITION_METHOD,scientificallyCalibrated:false,weightOrigin:'separate_observation_distances_not_risk_weights'},applicability,matches:experiment?[{id:'PSI-25',experimentId:experiment.runId,experiment,similarity:null,evidenceType:'observed_transitions',sourceRows:[reference.id+':Table7.1'],level:'observation_review'}]:[],aiRecommendations:[],numericComparisonAvailable:Boolean(experiment),normalization:corpus.experiments?.summary||{},weightTotal:0,weightConfigurationComplete:false,weights:{},limitation:"Distance from experimental transition observations, not a calibrated critical-risk percentage."};
}
