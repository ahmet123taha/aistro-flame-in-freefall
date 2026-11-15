const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cardScore(match,retrieval){
 const score=retrieval?match.topicCoverage:match.similarity;
 const valid=typeof score==='number'&&Number.isFinite(score)&&score>=0&&score<=100;
 return {text:valid?score.toFixed(0)+'%':'—',band:valid?Math.round(score/10):'unknown',label:retrieval?"Topic relevance":"Condition similarity",critical:!retrieval&&match.level==='critical',title:retrieval?`${match.matchedTopicCount||0}/${match.topicCount||0} topics occur in the source text. This is not numerical condition similarity or fire risk.`:"Calibrated condition similarity, not fire probability."};
}
export function renderStudyCard(record,{selected=false,retrieval=false,synthetic=false,ai=false}={}){
 const m=record.match,s=cardScore(m,retrieval),tags=Array.isArray(m.reasonTags)&&m.reasonTags.length?m.reasonTags:[m.reason||"General source"];
 return `<article class="study"><div class="match-score score-${s.band}" title="${esc(s.title)}"><strong>${synthetic?'DEMO · ':''}${s.text}</strong><small>${s.label}</small>${s.critical?"<b class=\"critical-label\">Critical</b>":''}</div><div class="study-content"><h3>${esc(record.name)} <small>${esc(record.id)}</small></h3><div class="reason-tags" aria-label="Ranking reasons">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>${ai?"<span class=\"ai-badge\">✦ AI recommendation</span>":''}<div class="study-actions"><button data-open="${esc(record.id)}">Open report</button><button data-data="${esc(record.id)}">Data / conditions</button><button data-ai="${esc(record.id)}">✦ Continue with AI</button></div></div><div class="study-select"><span class="badge">${retrieval?"Relevant source":"Matching source"}</span><input type="checkbox" data-select="${esc(record.id)}" aria-label="${esc(record.name)} — select" ${selected?'checked':''}></div></article>`;
}
