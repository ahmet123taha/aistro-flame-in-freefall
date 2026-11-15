import {gasOutcome,renderGasObservations} from './gas-observations.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(v)?v.toLocaleString("en-US",{maximumFractionDigits:4}):"Unknown";
const meaning={sheet:"Sheet / film / fabric",rod:"Rod",sphere:"Sphere",droplet:"Droplet",gas:"Gas / burner",candle:"Candle",concurrent:"Concurrent flow",opposed:"Opposed flow",fresh:"Unused specimen",reused:"Reused specimen",not_reported:"History not specified",whole_trial_initial:"Trial start",reported_nominal_fixed:"Nominal table value",section_nominal:"Nominal condition in the section",original_construction:"Original specimen construction; not a current measurement"};
export const COMPARISON_LIMIT=6;
export function experimentKey(r){
 return encodeURIComponent(JSON.stringify(r.physicalTrialKey?[r.sourceId,r.physicalTrialKey]:[r.sourceId,r.runId,r.provenance?.fileId,r.provenance?.page??null,r.provenance?.row??null]));
}
export function comparisonCandidates(response){
 const rows=new Map();
 for(const match of response?.matches||[])for(const row of [match.experiment,...(match.relatedExperiments||[])]){
  if(row?.provenance?.fileId&&row.runId)rows.set(experimentKey(row),row);
 }
 return rows;
}
export function toggleExperiment(keys,key,response){
 if(!comparisonCandidates(response).has(key))throw Error("This trial is not in the current matching results.");
 if(keys.includes(key))return keys.filter(x=>x!==key);
 if(keys.length>=COMPARISON_LIMIT)throw Error("Maximum trials per table: "+COMPARISON_LIMIT+" trials can be compared.");
 return [...keys,key];
}
export function describeOutcome(r){
 const o=r.observations;
 if(!o)return {kind:'unknown',label:"Outcome not normalized in the source row",detail:"An absent outcome does not mean combustion did not occur."};
 if(o.type==='reported_cfig_trial')return gasOutcome(o);
 if(o.type==='reported_nomex_trial')return {kind:'no_sustained_flame',label:"No sustained flame observed",detail:"Brief ignition/flash: "+(o.briefIgnition===true?"present":o.briefIgnition===false?"absent":"not separately specified")+'. '+(o.sourceComment||'')+" Not a nonflammability classification."};
 if(o.type==='reported_sibal_trial'){
  const labels={no_ignition:"Reported as no ignition in the table",quenching:"Quenching as flow decreases",blowoff:"Blowoff at high flow",no_blowoff:"No blowoff observed in the trial",ignited:"Ignition reported",one_sided:"Single-sided flame",not_reported:"Outcome not specified in this table row"};
  return {kind:labels[o.outcome]?o.outcome:'unknown',label:labels[o.outcome]||"Outcome class unknown",detail:(o.sourceComment||"Comment not specified")+(o.outcome==='no_ignition'?". Brief flashes are not excluded; terminology may differ in the detailed log.":'')+(o.outcome==='no_blowoff'?". This is not a blowoff-boundary measurement.":'')};
 }
 if(o.type==='reported_measurements')return {kind:o.stages?.some(s=>Number.isFinite(s.spreadRateMmS))?'measured_spread':'untracked_spread',label:o.stages?.some(s=>Number.isFinite(s.spreadRateMmS))?"Flame-spread velocity measured":"Flame-spread velocity not tracked",detail:"Measurement on an ignited specimen, not ignition probability under user conditions. Flow stages are kept separate."};
 return {kind:'unknown',label:"Outcome type is not supported in this view",detail:"Review source details; a zero outcome is not assumed."};
}
export function comparisonWarnings(rows){
 const out=[];
 const distinct=key=>new Set(rows.map(r=>key(r)).filter(v=>v!=null&&v!==''));
 if(distinct(r=>r.values.material).size>1)out.push("Different materials: an outcome difference cannot be attributed to one parameter.");
 if(distinct(r=>r.specimenKind).size>1)out.push("Specimen types differ; sheet, rod and droplet measurements are not equivalent.");
 if(distinct(r=>r.gasConfiguration).size>1)out.push("Normal/inverse gas configurations differ; ambient and burner concentrations are not equivalent.");
 if(distinct(r=>r.flowDirection).size>1)out.push("Flow/flame directions differ; equal combustion mechanisms are not assumed.");
 if(distinct(r=>r.specimenHistory).size>1||rows.some(r=>r.specimenHistory==='reused'))out.push("Specimens are reused or their histories differ/are unknown; initial construction is not assumed identical.");
 if(rows.some(r=>r.observations?.flowMode==='changed'||r.observations?.stages?.length>1))out.push("No single velocity or average is invented for varying-flow trials; initial/final or stage values are shown separately.");
 if(distinct(r=>r.evidence?.oxygen?.basis).size>1)out.push("Oxygen values use different timing/measurement definitions; initial and nominal values are not simultaneous boundary measurements.");
 if(rows.some(r=>r.observations?.oxygenQuality==='flagged_inaccurate'))out.push("The source contains a questionable oxygen reading; it is excluded from numerical scoring.");
 out.push("These selected trials are not a controlled experimental pair or a statistical sample. Outcome counts do not establish combustion probability, safe/critical thresholds or causality.");
 return out;
}
export function createComparisonSnapshot({keys,response,request,records=[],createdAt=new Date().toISOString()}){
 const unique=[...new Set(keys)];
 if(unique.length<2||unique.length>COMPARISON_LIMIT)throw Error("Select 2–6 distinct trials for comparison.");
 const candidates=comparisonCandidates(response);
 const rows=unique.map(k=>{const row=candidates.get(k);if(!row)throw Error("The selected trial is not in the current matching results.");return {...row,researchName:records.find(r=>r.id===row.sourceId)?.name||row.sourceId};});
 return JSON.parse(JSON.stringify({schema:'experiment-comparison-v1',createdAt,datasetHash:response.datasetHash,method:response.method,request,rows,warnings:comparisonWarnings(rows),outcomeScope:'Reported source observations, never a prediction, risk percentage or causal comparison.'}));
}
export function comparisonButton(r){return `<button type="button" data-pin-experiment="${esc(experimentKey(r))}" aria-pressed="false" aria-label="${esc(r.sourceId+' '+r.runId)} comparison selection">Add to comparison</button>`;}
function observationDetails(r){
 const o=r.observations;if(!o)return '';
 if(o.type==='reported_cfig_trial')return renderGasObservations(r);
 if(o.type==='reported_measurements')return '<p>'+o.stages.map(s=>`${num(s.airflow)} cm/s → ${num(s.spreadRateMmS)} mm/s`).join('<br>')+"</p><p>Flow → flame-spread velocity; initial trial O₂ %"+num(o.initialOxygen)+", final O₂ %"+num(o.finalOxygen)+". No separate O₂ is assigned to each stage.</p>";
 if(o.type==='reported_sibal_trial')return `<p>Flow ${o.flowMode==='constant'?"constant":"initial → final"}: ${o.flowEndpoints.map(num).join(' → ')} cm/s. O₂ %${num(o.reportedOxygen)} (${o.oxygenQuality==='flagged_inaccurate'?"questionable; not scored":"nominal table value"}).</p>`;
 if(o.type==='reported_nomex_trial')return `<p>Initial trial O₂ %${num(o.initialOxygen)}; valid final O₂ ${o.finalOxygen===null?"not measured":'%'+num(o.finalOxygen)}.</p><p>${esc(o.sourceDiscrepancy)}</p>`;
 return '';
}
export function renderExperimentComparison(s){
 if(!s?.rows?.length)return "<p>No saved experiment comparison.</p>";
 const rows=s.rows,keys=[...new Set(rows.flatMap(r=>(r.contributions||[]).filter(c=>c.key!=='material'&&(c.input!==null||c.observed!==null||c.weight>0)).map(c=>c.key)))];
 const savedInputs=[...new Map(rows.flatMap(r=>r.contributions||[]).map(c=>[c.key,c])).values()].filter(c=>Number.isFinite(s.request?.conditions?.[c.key])).map(c=>c.label+': '+num(s.request.conditions[c.key])+' '+c.unit).join(' · ');
 const cells=fn=>rows.map(r=>'<td>'+fn(r)+'</td>').join('');
 const line=(label,fn)=>'<tr><th scope="row">'+label+'</th>'+cells(fn)+'</tr>';
 return `<h3>Experiment comparison · ${rows.length} trial</h3><p class="comparison-snapshot">Saved matching snapshot: ${esc(s.createdAt)}. This tab does not update when inputs change later. Method: ${esc(s.method?.id||'direct')}.</p><p class="comparison-snapshot">Saved inputs: ${esc(savedInputs||"See the input record below")}</p><div class="table-scroll experiment-comparison"><table style="min-width:${Math.max(650,(rows.length+1)*180)}px"><thead><tr><th>Criterion</th>${rows.map(r=>`<th scope="col">${esc(r.sourceId)} · ${esc(r.runId)}<small>${esc(r.researchName)}</small></th>`).join('')}</tr></thead><tbody>${line("Material / specimen",r=>esc([r.materialLabel||r.values.material||"Unknown",r.materialSpecification,r.fabricConstruction,meaning[r.specimenKind]||r.specimenKind,meaning[r.flowDirection]||r.flowDirection,meaning[r.specimenHistory]||r.specimenHistory].filter(Boolean).join(' · ')))}${line("Nominal closeness",r=>r.similarity===null||r.similarity===undefined?"No overall score":'%'+num(r.similarity))}${line("Compared weight",r=>num(r.comparableWeight)+' / '+num(r.weightTotal))}${line("Input error interval",r=>r.inputUncertainty?.range?'%'+num(r.inputUncertainty.range.min)+'–'+num(r.inputUncertainty.range.max)+"; source error excluded":"Not calculated / unknown")}${line("Observed source outcome",r=>{const o=describeOutcome(r);return '<strong>'+esc(o.label)+'</strong><p>'+esc(o.detail)+'</p>'+observationDetails(r);})}${keys.map(key=>{const c=rows.flatMap(r=>r.contributions||[]).find(c=>c.key===key);return line(esc(c.label)+' <small>'+esc(c.unit)+'</small>',r=>{const v=r.contributions?.find(c=>c.key===key);if(!v)return "Not part of this method";return "Input: "+num(v.input)+"<br>Trial: "+num(v.observed)+"<br>Closeness: "+(v.score===null?"Unavailable":'%'+num(v.score))+" · weight %"+num(v.weight)+" · contribution "+num(v.points)+(v.evidence?.basis?"<small>Measurement definition: "+esc(meaning[v.evidence.basis]||v.evidence.basis)+'</small>':'');});}).join('')}${line("Source and location",r=>{const p=r.provenance;return `<button data-preview="${esc(p.fileId)}" data-name="${esc(p.name)}">Open source document</button><p>${esc(p.name)}<br>${p.page?'PDF '+p.page+" · table "+esc(p.table):"CSV row "+p.row}<br>Source row ${p.row} · ${esc(r.runId)}</p><small>SHA-256: ${esc(p.sha256||"Unknown")}</small>`;})}</tbody></table></div><details class="comparison-limits" open><summary>Comparison limitations</summary>${s.warnings.map(w=>'<p>'+esc(w)+'</p>').join('')}<p>High closeness does not prove the same combustion outcome under user conditions. The overall score covers only the selected criteria.</p></details><details><summary>Saved inputs, weights and dataset identity</summary><pre>${esc(JSON.stringify({request:s.request,datasetHash:s.datasetHash,method:s.method},null,2))}</pre></details>`;
}
