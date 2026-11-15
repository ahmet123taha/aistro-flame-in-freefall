import {contextSearchText} from '../public/context-fields.mjs';
import {materialRelation} from './research-coverage.mjs';
import {sourceMaterialReview} from './material-evidence-review.mjs';
const tokens=s=>new Set(String(s||'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
export function researchCandidates(corpus,request,limit=12){
 const records=corpus.records.filter(r=>request.ids.includes(r.id));
 if(records.length<=limit)return request.ids;
 const contentIds=(corpus.sourceContentRetrieval?.sourceCandidateIds||[]).filter(id=>request.ids.includes(id));
 const materialSources=new Set();
 for(const r of corpus.experiments?.rows||[])if(materialRelation(request.conditions.material,r.values.material)==='same_family')materialSources.add(r.sourceId);
 for(const r of corpus.experiments?.studyEvidence||[])if(materialRelation(request.conditions.material,r.material)==='same_family')materialSources.add(r.sourceId);
 const relatedSources=new Set(records.filter(r=>sourceMaterialReview(corpus,r.id,request.conditions).status==='related_composite_context').map(r=>r.id));
 if(!materialSources.size&&!relatedSources.size&&!contentIds.length)return request.ids;
 const q=tokens(request.scenario+' '+request.question+' '+contextSearchText(request.contextDetails)),scored=records.map(r=>{
  const t=tokens(Object.values(r.content||{}).join(' ')+' '+r.title),overlap=[...q].filter(k=>k.length>3&&t.has(k)).length;
  return {id:r.id,material:materialSources.has(r.id),related:relatedSources.has(r.id),overlap};
 }).sort((a,b)=>Number(b.material)-Number(a.material)||Number(b.related)-Number(a.related)||b.overlap-a.overlap||a.id.localeCompare(b.id));
 if(!contentIds.length)return scored.slice(0,limit).map(r=>r.id);
 // Protect both literal content hits and reviewed material evidence. A study's
 // title need not name the finding. Lexical recall is not a scientific score.
 const selected=new Set(contentIds.slice(0,Math.ceil(limit/2)));
 for(const r of scored.filter(r=>r.material||r.related).slice(0,Math.floor(limit/2)))selected.add(r.id);
 for(const id of [...contentIds,...scored.map(r=>r.id)]){if(selected.size>=limit)break;selected.add(id);}
 return [...selected];
}
