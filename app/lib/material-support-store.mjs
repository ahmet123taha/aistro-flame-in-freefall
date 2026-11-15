import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const MATERIAL_SUPPORT_ROLE='material_applicability_only';
const units={thermal_conductivity:'W/(m K)',specific_heat_capacity:'J/(kg K)'};
async function confined(root,relative,maxBytes){
 if(typeof relative!=='string'||relative.length>500||relative.includes('\\')||relative.includes(':')||path.posix.isAbsolute(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe material-support path');
 const base=await realpath(root),target=await realpath(path.join(base,...relative.split('/'))),rel=path.relative(base,target);
 if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Material source escapes dataset');
 const info=await stat(target);if(!info.isFile()||info.size>maxBytes)throw Error('Material-support file is absent or too large');
 return readFile(target);
}
export function validateMaterialProfile(p){
 const text=(v,max=1600)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 if(!p||!/^MAT-[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(p.id)||!text(p.material,100)||!units[p.property]||p.unit!==units[p.property]||p.temperatureRole!=='specimen_mean_temperature')throw Error('Invalid material-profile identity/property');
 if(!p.specimen||['name','grade','composition','conditioning','identityLimit'].some(k=>!text(p.specimen[k])))throw Error('Incomplete specimen identity');
 if(!['family_supported_grade_unverified','family_supported'].includes(p.specimen.identityStatus))throw Error('Material identity is unresolved or conflicting');
 if(!Array.isArray(p.points)||!p.points.length||p.points.length>200||p.points.some(x=>!Number.isFinite(x.temperatureK)||x.temperatureK<=0||!Number.isFinite(x.value)||x.value<=0||!text(x.replicate,100)||!text(x.cycle,100)))throw Error('Invalid source-property points');
 const s=p.source;
 if(!s||['publisher','title','citation','revision','location','licenseStatus'].some(k=>!text(s[k],3000))||!Array.isArray(s.authors)||s.authors.length>30||s.authors.some(a=>!text(a,160))||!/^https:\/\//.test(s.url)||!s.path?.startsWith('Third_Party/sources/')||!Number.isSafeInteger(s.bytes)||s.bytes<1||!/^[a-f0-9]{64}$/.test(s.sha256))throw Error('Incomplete original-source provenance');
 const url=new URL(s.url);if(url.username||url.password||s.url.length>2000)throw Error('Invalid source URL');
 if(p.review?.status!=='reviewed_transcription'||p.review.independentScientificReview!==false||!text(p.review.method,3000)||!Array.isArray(p.review.limitations)||p.review.limitations.length>20||p.review.limitations.some(x=>!text(x,3000)))throw Error('Invalid scientific-review status');
 if(p.usage?.purpose!=='applicability_context_only'||p.usage.numericScoreAdjustment!==false)throw Error('Material profile cannot alter scores');
 if(p.uncertainty&&(!text(p.uncertainty.status,100)||!text(p.uncertainty.description,3000)))throw Error('Invalid uncertainty statement');
 return structuredClone(p);
}
export async function loadMaterialSupport(root){
 const empty=(state,message,extra={})=>({profiles:[],coverage:[],status:{state,message,role:MATERIAL_SUPPORT_ROLE,numericScoreAdjustment:false,...extra},hash:hash(Buffer.from(state))});
 let raw;
 try{raw=await confined(root,'Material_Sensitivity/MANIFEST.json',64000);}
 catch(error){return empty(error.code==='ENOENT'?'missing':'invalid','Separate material applicability data are unavailable. PSI research remains available.');}
 try{
  const manifest=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
  if(manifest.schema!==1||manifest.role!==MATERIAL_SUPPORT_ROLE||manifest.numericScoreAdjustment!==false||manifest.profilesFile!=='profiles.json'||manifest.provenanceFile!=='PROVENANCE.json'||typeof manifest.version!=='string'||!/^[a-f0-9]{64}$/.test(manifest.profilesSha256)||!/^[a-f0-9]{64}$/.test(manifest.provenanceSha256))throw Error('Invalid material-support manifest');
  const bytes=await confined(root,'Material_Sensitivity/'+manifest.profilesFile,4*1024*1024);
  if(hash(bytes)!==manifest.profilesSha256)throw Error('Material profile hash changed');
  const data=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
  if(data.schema!==1||data.role!==MATERIAL_SUPPORT_ROLE||!Array.isArray(data.profiles)||data.profiles.length>40||!Array.isArray(data.coverage)||data.coverage.length>100)throw Error('Invalid material-support index');
  const provenanceBytes=await confined(root,'Material_Sensitivity/PROVENANCE.json',2*1024*1024);
  if(hash(provenanceBytes)!==manifest.provenanceSha256)throw Error('Material provenance changed');
  const provenance=JSON.parse(provenanceBytes.toString('utf8'));
  if(provenance.schema!==1||provenance.role!==MATERIAL_SUPPORT_ROLE||!Array.isArray(provenance.contextSources)||!provenance.contextSources.length||provenance.contextSources.length>10||!Array.isArray(provenance.profiles)||provenance.profiles.length>40)throw Error('Invalid material provenance');
  const profiles=[],excluded=[],seen=new Set(),verified=new Map();
  async function verifySource(s){
   if(!s?.path?.startsWith('Third_Party/sources/')||!/^[a-f0-9]{64}$/.test(s.sha256)||!Number.isSafeInteger(s.bytes)||s.bytes<=0)throw Error('Invalid source dependency');
   const key=s.path+'|'+s.sha256;
   if(!verified.has(key)){const source=await confined(root,s.path,16*1024*1024);verified.set(key,{sha256:hash(source),bytes:source.length});}
   const source=verified.get(key);if(source.sha256!==s.sha256||source.bytes!==s.bytes)throw Error('Original material source changed');
  }
  for(const dependency of provenance.contextSources)await verifySource(dependency);
  for(const candidate of data.profiles){
   try{
    const p=validateMaterialProfile(candidate);if(seen.has(p.id))throw Error('Duplicate profile');seen.add(p.id);
    const refs=provenance.profiles.filter(r=>r.profileId===p.id);
    if(refs.length!==1||refs[0].disposition!=='active_applicability_context'||refs[0].sourceHashCheck?.path!==p.source.path||refs[0].sourceHashCheck?.sha256!==p.source.sha256)throw Error('Profile identity dependency is not active');
    await verifySource(p.source);await verifySource(refs[0].metadata);
    profiles.push(p);
   }catch{excluded.push({id:typeof candidate?.id==='string'?candidate.id.slice(0,104):'invalid',reason:'schema_or_original_hash_failed'});}
  }
  const coverage=data.coverage.filter(c=>typeof c?.material==='string'&&c.material.length<=100&&typeof c.status==='string'&&typeof c.notes==='string').map(c=>({material:c.material,status:c.status.slice(0,100),notes:c.notes.slice(0,3000)}));
  return {profiles,coverage,hash:hash(Buffer.from([hash(raw),hash(bytes),hash(provenanceBytes),...profiles.map(p=>p.source.sha256),JSON.stringify(excluded)].join('|'))),status:{state:excluded.length?'partial':'ready',role:MATERIAL_SUPPORT_ROLE,version:manifest.version,profiles:profiles.length,materials:new Set(profiles.map(p=>p.material)).size,verifiedSourceDependencies:verified.size,excluded,independentScientificReview:false,numericScoreAdjustment:false,message:'Reviewed third-party property context only. Instrument, specimen-metadata and method sources checked; no physical tolerance calibration or numerical score adjustment.'}};
 }catch{return empty('invalid','Material applicability index failed validation and was excluded. PSI research remains available.');}
}
