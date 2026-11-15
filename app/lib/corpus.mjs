import {validateRecommendations} from './recommendations.mjs';
import {validateResearch} from './research.mjs';
import {GAS_METHOD} from './gas-stoichiometry.mjs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {validateWeights} from './numeric-matching.mjs';
import {validateNumericUncertainty} from './numeric-uncertainty.mjs';
import {PHYSICAL_METHODS} from './pmma-rod-model.mjs';
import {SIBAL_TRANSITION_METHOD} from './sibal-transitions.mjs';
import {BOUNDARY_METHOD} from './pmma-boundary.mjs';

export const IDS = ['PSI-107', 'PSI-115', 'PSI-117', 'PSI-142'];
export const FIELDS = ['objective', 'approach', 'hypothesis', 'researchImpacts', 'documentText', 'fileText'];
export const DEFAULT_QUESTION = "How might airflow and thermal effects influence cool-flame extinction in microgravity? Compare the relevant studies.";
export const DEFAULT_CONDITIONS = {gravity:'microgravity', material:'n-alkane', oxygen:null, pressure:null, airflow:null};
// Labels and ranges below are a human-reviewed index of the four allowed metadata records.
// Ranges describe a study, not matched individual experimental runs.
const INDEX = {
  'PSI-107': {name:'SPICE', subtitle:"Soot formation and gaseous flames", kind:"Flight experiment", gravity:"ISS microgravity and ground comparison", material:"Methane, ethylene, propane, propylene", geometry:"Gas jet / coflow", measurement:"Flame length, radiative loss, flow", parameters:"5.4–65 cm/s coflow; 0.41 / 0.76 / 1.6 mm burner", field:'approach', topics:['smoke','soot'], aliases:['spice','kurum','gaz','methane','metan','smoke point','eş akış','coflow']},
  'PSI-115': {name:'Smoke Dynamics', subtitle:"Smoke-particle growth", kind:"Numerical simulation", gravity:"Earth gravity and microgravity modeled", material:"Dibutyl phthalate (DBP)", geometry:"Heated specimen / crossflow", measurement:"Particle distribution, growth, transport", parameters:"Two crossflow velocities; values absent from this file", field:'approach', topics:['smoke'], aliases:['duman','parçacık','dbp','smoke','aerosol','algıla','sensör']},
  'PSI-117': {name:'Cool Flame CFD', subtitle:"Thermal effects and flame stability", kind:"CFD / FLEX comparison", gravity:"Microgravity model; comparison with FLEX", material:"n-alkane droplets", geometry:"Large and small droplets", measurement:"Ignition delay, oscillation, extinction diameter", parameters:"1–4 mm and approximately 0.5 mm droplets", field:'approach', topics:['cool','flow'], aliases:['soğuk','cool','ısı','ısıl','thermal','akış','convection','sönme','extinction','n-alkane','n-alkan','damlacık','droplet']},
  'PSI-142': {name:'Cool Flame Limits', subtitle:"Transitions and extinction limits", kind:"Ground research / modeling", gravity:"Ground experiments; FLEX conditions as reference", material:"n-heptane, DME, large n-alkanes", geometry:"Counterflow / one-dimensional models", measurement:"Extinction limit, temperature, species distribution", parameters:"DME/air simulations: up to 20 atm", field:'approach', topics:['cool','oxygen'], aliases:['soğuk','cool','oksijen','oxygen','basınç','pressure','dme','heptan','sönme','extinction','sınır','limit','n-alkane','n-alkan']}
};

export async function loadCorpus(directory, readSource = filename => readFile(path.join(directory, filename)), ids=IDS) {
  const records = await Promise.all(ids.map(async id => {
    const filename = `${id}_investigation_metadata.json`;
    const bytes = Buffer.from(await readSource(filename));
    const raw = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    if (raw.accession !== id) throw new Error(`Unexpected source ID: ${id}`);
    const content = Object.fromEntries(FIELDS.map(f => [f, String(raw[f] || '')]));
    return {id, filename, bytes:bytes.length, sha256:createHash('sha256').update(bytes).digest('hex'),
      title:raw.title, version:raw.version, modified:raw.modifiedDate, doi:raw.doi,
      url:raw.doi?`https://doi.org/${raw.doi}`:`https://psi.nasa.gov/physci/repo/data/investigations/${id}`,
      ...(INDEX[id] || {name:raw.title,subtitle:"Local PSI research collection",kind:"Research record",material:"Review the source description",parameters:"Experimental conditions have not yet been normalized",topics:[],aliases:[id.toLowerCase(),...String(raw.title).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>4)]}), content,
      publications:(raw.publications || []).map(p=>({title:p.title,doi:p.doi || ''})),
      tableReferences:(raw.experimentalTable || []).map(t=>({filename:t.file_name,bytes:t.file_size})),
      hardware:raw.experimentHardware || "Not specified in this metadata file",
      rowCount:(raw.experiments || []).length};
  }));
  return {records, hash:createHash('sha256').update(records.map(r=>r.sha256).join('|')).digest('hex')};
}

export function validateRequest(input, allowedIds=IDS) {
  if (!input || typeof input.question !== 'string' || input.question.trim().length === 0 || input.question.length > 1400) throw new Error("Message cannot be empty; use no more than 1400 characters.");
  if (!Array.isArray(input.ids) || (!input.ids.length && input.mode!=='chat') || input.ids.some(id=>!allowedIds.includes(id))) throw new Error("Select at least one valid study.");
  const c=input.conditions || {};
  const method=input.method||'direct';
  if(!['direct',...PHYSICAL_METHODS,BOUNDARY_METHOD,SIBAL_TRANSITION_METHOD,GAS_METHOD].includes(method))throw Error("Invalid comparison method.");
  if (!['microgravity','earth','moon','mars','other'].includes(c.gravity)) throw new Error("Invalid gravity selection.");
  const conditions={gravity:c.gravity,material:String(c.material || '').slice(0,140)};
  for (const [field,max] of [['oxygen',100],['pressure',100000],['airflow',100000]]) {
    const v=c[field];
    if (v===null || v===undefined || v==='') conditions[field]=null;
    else if (typeof v !== 'number' || !Number.isFinite(v) || v<0 || v>max || (field==='pressure' && v===0)) throw new Error(`${field}: numerical value is outside the allowed range.`);
    else conditions[field]=v;
  }
  for(const [field,max] of [['gravityMs2',1000],['temperatureK',10000],['thicknessMm',100000]]) {
    if(!(field in c))continue;
    const v=c[field];
    if(v===null||v==='')conditions[field]=null;
    else if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max||(field!=='gravityMs2'&&v===0))throw new Error(`${field}: numerical value is outside the allowed range.`);
    else conditions[field]=v;
  }
  for(const [field,max] of [['diameterMm',100000],['rodDiameterMm',100000],['flameRadiusMm',100000],['arealDensityMgCm2',100000],['exposedLengthMm',100000],['widthMm',100000],['nozzleDiameterMm',100000],['co2Percent',100],['fuelPercent',100],['ambientFuelPercent',100],['oxidizerOxygenPercent',100]]){
    const v=c[field];if(v===null||v===undefined||v==='')conditions[field]=null;
    else if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max||((field.endsWith('Mm')||field==='arealDensityMgCm2')&&v===0))throw Error(field+": invalid numerical value.");else conditions[field]=v;
  }
  if(c.flowDirection&&!['concurrent','opposed'].includes(c.flowDirection))throw Error("Invalid flow direction.");
  conditions.flowDirection=c.flowDirection||'';
  if(c.specimenKind&&!['gas','droplet','sheet','rod','sphere','candle'].includes(c.specimenKind))throw Error("Invalid specimen type.");
  conditions.specimenKind=c.specimenKind||'';
  if(c.burningSides!=null&&c.burningSides!==''&&![1,2].includes(c.burningSides))throw Error("The number of burning faces must be 1 or 2.");
  conditions.burningSides=c.burningSides||null;
  if(conditions.burningSides&&conditions.specimenKind!=='sheet')throw Error("Select a sheet / film / fabric specimen to specify burning faces.");
  for(const [field,allowed] of [['gasDiluent',['nitrogen','other']],['gasConfiguration',['normal','inverse']],['materialSpecification',['nomex-iii-natural','other']],['transitionKind',['all','quenching','blowoff']],['fabricConstruction',['sibal-75-25','other']],['specimenHistory',['fresh','reused']],['materialVariant',['cast-pmma','extruded-pmma']],['tipShape',['hemispherical','flat']],['gravityRegime',['microgravity','partial','earth']]]){
    if(c[field]&&!allowed.includes(c[field]))throw Error(field+": invalid option.");
    conditions[field]=c[field]||'';
  }
  for(const field of ['thermalAnalysis','quasiSteady']){
    if(c[field]!=null&&typeof c[field]!=='boolean')throw Error(field+": a boolean value is required.");
    conditions[field]=c[field]===true;
  }
  for(const field of ['regressionRateMmS','solidLengthMm']){
    const v=c[field];
    if(v==null||v==='')conditions[field]=null;
    else if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>100000||(field==='solidLengthMm'&&v===0))throw Error(field+": invalid measurement.");
    else conditions[field]=v;
  }
  for(const [field,allowed] of [['flameState',['established','unignited']],['oxidizerDiluent',['nitrogen','other']],['oxygenBasis',['boundary_state','initial_only']]]){
    if(c[field]&&!allowed.includes(c[field]))throw Error(field+": invalid option.");
    conditions[field]=c[field]||'';
  }
  for(const field of ['oxygenUncertaintyPp','airflowUncertaintyCmS','diameterUncertaintyMm']){
    const v=c[field];if(v==null||v==='')conditions[field]=null;
    else if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1000)throw Error(field+": invalid error bound.");
    else conditions[field]=v;
  }
  const probe=method===BOUNDARY_METHOD?(c.boundaryProbePercent??1):1;
  if(typeof probe!=='number'||!Number.isFinite(probe)||probe<.01||probe>10)throw Error("The sensitivity step must be between 0.01% and 10%.");
  conditions.boundaryProbePercent=probe;
  conditions.numericUncertainty=method==='direct'?validateNumericUncertainty(c.numericUncertainty,conditions):{};
  const mode=input.mode==='chat'?'chat':'analysis';
  const history=mode==='chat'&&Array.isArray(input.history)?input.history.slice(-8).filter(m=>['user','assistant'].includes(m.role)&&typeof m.text==='string').map(m=>({role:m.role,text:m.text.slice(0,1000)})):[];
  return {mode,history,method,question:input.question.trim(),ids:[...new Set(input.ids)].sort(),conditions,weights:validateWeights(method==='direct'?input.weights:null)};
}

export function rankRecords(records, request) {
  const text=`${request.question} ${request.conditions.material}`.toLocaleLowerCase('tr');
  return records.filter(r=>request.ids.includes(r.id)).map(r=>{
    const terms=r.aliases.filter(term=>text.includes(term));
    return {...r, relevance:terms.length, matchingTerms:terms,
      matchReason:terms.length ? `Topic match: ${terms.slice(0,4).join(', ')}.` : "Selected source; no direct keyword match with the question."};
  }).sort((a,b)=>b.relevance-a.relevance || a.id.localeCompare(b.id));
}

export function modelContext(corpus, request) {
  return corpus.records.filter(r=>request.ids.includes(r.id)).map(r=>({
    id:r.id,title:r.title,version:r.version,fields:r.content,fileSources:r.fileSources||[],contextWarnings:r.contextWarnings||[],
    experimentalTableReferences:(r.tableReferences||[]).map(t=>t.filename),
    note:'Table references are filenames only, not table contents. Publication titles are not evidence of their full text.'
  }));
}

export function validateAnalysis(value, corpus, request) {
  if(request.mode==='research')return validateResearch(value,corpus,request);
  if (!value || typeof value.summary !== 'string' || !value.summary.trim() || value.summary.length>3000) throw new Error("Invalid analysis summary.");
  const conversational=request.mode==='chat'&&['conversation','unsupported'].includes(value.answerType);
  if (!Array.isArray(value.items) || (!conversational && value.items.length<1) || value.items.length>12) throw new Error("Invalid analysis items.");
  for (const item of value.items) {
    if (!['finding','candidate','relevance'].includes(item.kind) || typeof item.text!=='string' || !item.text.trim() || item.text.length>2200) throw new Error("Invalid finding format.");
    const record=corpus.records.find(r=>r.id===item.sourceId && request.ids.includes(r.id));
    if (!record || !FIELDS.includes(item.field) || typeof item.quote!=='string' || item.quote.length<18 || !record.content[item.field].includes(item.quote)) throw new Error("The source quotation could not be verified. The response was withheld.");
    if (!['reported','inference'].includes(item.evidenceType)) throw new Error("Evidence type is missing.");
    if (item.kind==='candidate' && item.evidenceType!=='inference') throw new Error("Solution candidates based on this metadata must be labeled as inferences.");
    if (typeof item.limitation!=='string' || !item.limitation.trim()) throw new Error("Evidence limitation is missing.");
  }
  if (!Array.isArray(value.unknowns) || (!conversational && !value.unknowns.length) || value.unknowns.length>8 || value.unknowns.some(x=>typeof x!=='string' || x.length>1200) || typeof value.nextStep!=='string' || !value.nextStep.trim()) throw new Error("Uncertainty or next step is missing.");
  return validateRecommendations(value,corpus,request);
}
