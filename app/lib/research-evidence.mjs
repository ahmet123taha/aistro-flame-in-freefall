import {createHash} from 'node:crypto';
import {literalSourceProvenance} from './research-source-context.mjs';

// Stable references let the model select evidence rather than retype quotations.
// Returned quotations always come from the exact bounded local context supplied.
export function researchEvidence(corpus, ids) {
  return corpus.records.filter(r=>ids.includes(r.id)).flatMap(r=>[
    ...Object.entries(r.content||{}).flatMap(([field,value])=>{
      if(field==='fileText'&&r.sourceFragments?.length)value=r.sourceIndexText||'';
      const text=String(value), chunks=[];
      for(let start=0;start<text.length;start+=900){
        const quote=text.slice(start,start+1000);
        if(quote.trim().length<18)continue;
        const id='E-'+createHash('sha256').update(JSON.stringify([r.id,field,start,quote])).digest('hex').slice(0,20);
        chunks.push({id,sourceId:r.id,field,quote});
      }
      return chunks;
    }),
    ...(r.sourceFragments||[]).filter(c=>c.quote.trim().length>=18&&r.content?.fileText?.includes(c.quote)).map(c=>({id:'E-'+createHash('sha256').update(JSON.stringify([r.id,c.id,c.quote])).digest('hex').slice(0,20),sourceId:r.id,field:'fileText',quote:c.quote,provenance:literalSourceProvenance(r,c.quote),scope:c.scope,association:c.association}))
  ]);
}

export function resolveResearchEvidence(value,corpus,request) {
  if(!value||typeof value!=='object')return value;
  const evidence=new Map(researchEvidence(corpus,request.ids).map(e=>[e.id,e]));
  const resolve=(input,strict=true)=>{
    if(!input||typeof input!=='object')return input;
    const {evidenceProvenance:untrustedProvenance,...a}=input;
    if(!a?.evidenceId)return a;
    const e=evidence.get(a.evidenceId);
    if(!e||a.sourceId!==e.sourceId){if(strict)throw Object.assign(new Error('Research evidence reference could not be verified. No scientific answer was applied.'),{code:'RESEARCH_EVIDENCE_INVALID',validation:{field:'assessments.evidenceId'}});return {...a,quote:''};}
    return {...a,field:e.field,quote:e.quote,...(e.provenance?{evidenceProvenance:e.provenance}:{})};
  };
  return {...value,...(Array.isArray(value.sourceBriefs)?{sourceBriefs:value.sourceBriefs.map(a=>resolve(a,false))}:{}),...(Array.isArray(value.assessments)?{assessments:value.assessments.map(a=>resolve(a))}:{}),...(Array.isArray(value.recommendations?.items)?{recommendations:{...value.recommendations,items:value.recommendations.items.map(a=>resolve(a,false))}}:{})};
}
