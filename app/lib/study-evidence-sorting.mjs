import {canonicalMaterial} from './material-identity.mjs';
import {numericCloseness} from './proximity.mjs';
// Context selection only. This does not assign physical tolerances or points.
export function prioritizeStudyFragments(entries,request={}){
 const material=canonicalMaterial(request.conditions?.material),words=new Set(String(request.question||'').toLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[]);
 const score=e=>{
  let covered=0,proximity=0;
  for(const [key,input] of Object.entries(request.conditions||{})){
   if(!Number.isFinite(input))continue;const p=e.parameters?.[key];if(!p)continue;
   if(p.kind==='set'){const values=p.values.filter(Number.isFinite);if(values.length){covered++;proximity+=Math.max(...values.map(v=>numericCloseness(input,v)));}}
   else if(p.kind==='range'&&Number.isFinite(p.min)&&Number.isFinite(p.max)&&p.min>=0&&p.max>=p.min){covered++;proximity+=input>=p.min&&input<=p.max?100:numericCloseness(input,input<p.min?p.min:p.max);}
  }
  const text=String(e.text||'').toLowerCase(),overlap=[...words].filter(w=>text.includes(w)).length;
  return {same:material&&canonicalMaterial(e.material)===material?1:0,covered,proximity,overlap};
 };
 return entries.map((entry,index)=>({entry,index,...score(entry)})).sort((a,b)=>b.same-a.same||b.covered-a.covered||b.proximity-a.proximity||b.overlap-a.overlap||a.index-b.index).map(x=>x.entry);
}
