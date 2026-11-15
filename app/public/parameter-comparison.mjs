import {STANDARD_GRAVITY_MS2} from './gravity-input.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={gravityMs2:'Gravity',temperatureK:'Ambient temperature',oxygen:'Oxygen',pressure:'Pressure',airflow:'Gas velocity',thicknessMm:'Thickness'};
const material=id=>({sibal:'SIBAL fabric',pmma:'PMMA',nomex:'Nomex',cotton:'Cotton',wax:'Japan wax'})[id]||id||'Material unidentified';
const number=v=>Number(v).toLocaleString('en-US',{maximumSignificantDigits:7});
const unit=u=>u==='m/s2'?'m/s²':u;
function location(r){
 if(!r)return 'No source reference';const p=r.provenance||{},e=r.evidence||{};
 const where=[p.page!=null?'PDF p. '+p.page:null,e.sheet||p.sheet,p.table?'Table '+p.table:null,p.figure?'Figure '+p.figure:null,p.bodyParagraph!=null?'body paragraph '+p.bodyParagraph:null,r.cell||e.cell,p.row!=null?(p.kind==='docx_table'?'XML row ':'row ')+p.row:null,p.column,p.part,r.runId].filter(Boolean).map(esc).join(' · ');
 const file=/^f\d+$/.test(p.fileId)?`<a href="/api/files/${p.fileId}" target="_blank" rel="noopener noreferrer">${esc(p.fileId)}</a>`:esc(p.fileId||'Source not indexed');
 return file+(where?'<small>'+where+'</small>':'');
}
function reference(r,u){
 if(!r)return 'No comparable value indexed';
 const value=r.kind==='reported_marginal_span'?r.range.map(number).join('–')+' '+unit(u)+'<small>Reported marginal span; no intermediate measurement inferred.</small>':number(r.value)+' '+unit(u)+(r.approximate?' ≈':'');
 return value+`<small>${esc(material(r.material))}${r.credited?'':' · context only'}</small>`+(r.kind==='reported_setting'?'<small>Reported setting; not an exact joint trial.</small>':'')+(r.absoluteDifference!==null?'<small>Absolute difference: '+number(r.absoluteDifference)+' '+unit(u)+'</small>':'');
}
export function renderParameterComparison(d){
 if(!d)return '';
 const rows=d.comparisons.map(c=>{
  const r=c.usedReference||c.contextOnlyReference,raw=c.rawExamples?.[0];
  let value=r?reference(r,c.unit):raw?`Raw example: <code>${esc(raw.raw)}</code><small>${esc(raw.unit)} · ${esc(material(raw.material))}</small><small>Not a nearest comparable measurement.</small>`:'No comparable value indexed';
  if(c.usedReference?.kind==='reported_marginal_span'&&c.nearestReportedReference)value+='<details><summary>Nearest reported point</summary>'+reference(c.nearestReportedReference,c.unit)+'<p>'+location(c.nearestReportedReference)+'</p></details>';
  const score=c.status==='compared'?`<strong>${number(c.usedReference.arithmeticProximity)}% proximity</strong><small>${number(c.awardedPoints)} / ${number(c.weight)} condition points</small>`:'<strong>Unassessed</strong><small>No proximity percentage assigned.</small>';
  return `<tr data-parameter="${c.key}"><th scope="row">${esc(labels[c.key])}</th><td data-label="Your input">${number(c.input)} ${unit(c.unit)}${c.key==='gravityMs2'?'<small>'+number(c.input/STANDARD_GRAVITY_MS2)+' g</small>':''}</td><td data-label="Closest indexed reference">${value}</td><td data-label="Result / reason">${score}<small>${esc(c.reason)}</small></td><td data-label="Source">${location(r||raw)}</td></tr>`;
 }).join('');
 const unused=d.unusedSourceParameters?.length?'<p class="muted">Not entered, so excluded: '+d.unusedSourceParameters.map(x=>esc(labels[x.key])+' (indexed study range '+number(x.min)+'–'+number(x.max)+' '+unit(x.unit)+', across source materials)').join('; ')+'.</p>':'';
 return `<details class="parameter-comparison"><summary>Compare my inputs · ${d.compared}/${d.provided} assessed</summary><p><strong>${d.compared===0&&d.provided?'No input could be assessed. This is not 0% similarity.':d.compared+' entered parameters have comparable evidence.'}</strong> ${number(d.unassessedPoints)} condition points remain unassessed.</p><p>Your material: <strong>${esc(material(d.inputMaterial))}</strong>. Indexed study materials: ${d.indexedSourceMaterials.map(x=>esc(material(x))).join(', ')||'not identified'}. Material families and composites are not interchangeable.</p><div class="table-scroll"><table><thead><tr><th>Parameter</th><th>Your input</th><th>Closest indexed reference</th><th>Result / reason</th><th>Source</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No numerical inputs were supplied.</td></tr>'}</tbody></table></div>${unused}<p class="muted">${esc(d.selectionRule)}</p><p class="muted">${esc(d.meaning)}</p></details>`;
}
