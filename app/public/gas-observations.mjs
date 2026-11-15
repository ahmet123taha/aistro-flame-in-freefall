const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yn=v=>v===true?"Reported":v===false?"No":v==='flash'?"Brief flash":"Not specified";
export function gasOutcome(o){
 return {kind:'reported_cfig_trial',label:"Hot ignition: "+yn(o.hotIgnition)+" · Cool flame: "+yn(o.coolFlame),detail:o.sourceComment||"No source comment provided."};
}
export function renderGasObservations(r){
 const o=r.observations;if(o?.type!=='reported_cfig_trial')return '';
 const outcome=gasOutcome(o);
 return `<details class="observed-results"><summary>CFI-G source observation · ${esc(outcome.label)}</summary><p>${r.gasConfiguration==='normal'?"Normal: fuel from the burner, oxidizer in the surroundings.":"Inverse: oxidizer from the burner, fuel in the surroundings."}</p><p>${esc(outcome.detail)}</p><p>Source burn duration: ${Number.isFinite(o.burnTimeSeconds)?esc(o.burnTimeSeconds)+' s':"Not specified"} · Termination code: ${esc(o.terminationCode||"Not specified")}.</p>${o.limitations.map(x=>`<p>${esc(x)}</p>`).join('')}<details><summary>Original cells and source location</summary><pre>${esc(JSON.stringify({raw:o.raw,evidence:o.evidence},null,2))}</pre></details></details>`;
}
