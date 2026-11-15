import {canonicalMaterial} from './material-identity.mjs';

// Evidence explanation only; a shared constituent does not permit borrowing
// the composite specimen's score, geometry or combustion response.
export function sourceMaterialReview(corpus,sourceId,conditions={}){
 const requested=String(conditions.material||'').trim(),canonical=canonicalMaterial(requested);
 const rows=(corpus.experiments?.rows||[]).filter(r=>r.sourceId===sourceId);
 const fragments=(corpus.experiments?.studyEvidence||[]).filter(f=>f.sourceId===sourceId);
 const names=[...new Set([...rows.map(r=>r.values.material),...fragments.map(f=>f.material)].filter(Boolean))];
 const same=names.some(name=>canonicalMaterial(name)===canonical),compositeReferences=[];
 if(['cotton','fiberglass'].includes(canonical)){
  for(const row of rows.filter(r=>canonicalMaterial(r.values.material)==='sibal')){
   const e=row.evidence?.material,p=e?.provenance||row.provenance,description=[row.materialLabel,e?.raw].filter(Boolean).join('; ');
   if(!p?.fileId||!p.sha256||!/cotton/i.test(description)||!/fiber ?glass|fibreglass/i.test(description))continue;
   if(compositeReferences.some(x=>x.provenance.fileId===p.fileId))continue;
   compositeReferences.push({material:'sibal',relationship:'requested_material_is_constituent_of_tested_composite',description,provenance:p,numericalTransferAllowed:false});
  }
  for(const f of fragments.filter(f=>canonicalMaterial(f.material)==='sibal')){
   if(!f.provenance?.fileId||!f.provenance.sha256||!/cotton/i.test(f.text||'')||!/fiber ?glass|fibreglass/i.test(f.text||''))continue;
   if(compositeReferences.some(x=>x.provenance.fileId===f.provenance.fileId))continue;
   compositeReferences.push({material:'sibal',relationship:'requested_material_is_constituent_of_tested_composite',description:f.text,provenance:f.provenance,numericalTransferAllowed:false});
  }
 }
 return {requested:requested||null,canonical:canonical||null,aliasApplied:Boolean(canonical&&canonical!==requested.toLowerCase()),indexedMaterials:names,
  status:!canonical?'not_supplied':same?'same_family_indexed':compositeReferences.length?'related_composite_context':names.length?'different_materials_indexed':'material_not_indexed',
  compositeReferences:compositeReferences.slice(0,3),
  explanation:compositeReferences.length&&!same?'The source tests a cotton–fiberglass composite, not the requested pure material. Its measured conditions remain visible as related literature; transferring a numeric score requires matching the tested composition.':'A matching family name does not establish identical grade, composition, conditioning or geometry.',
  absenceMeaning:'No same-material numerical row in this reviewed index does not establish that the complete source collection lacks that material. Literal source passages, unparsed tables and figures may contain additional evidence.'};
}
