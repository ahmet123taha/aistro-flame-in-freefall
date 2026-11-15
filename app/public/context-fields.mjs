// Declarative research refinements. Shared by HTTP validation, storage and UI.
// These values never enter numerical matching or executable/HTML configuration.
export const CONTEXT_LIMITS=Object.freeze({active:6,saved:24,options:12,value:500});
const reserved=new Set(['material','atmosphere','gravity','gravityMs2','gravity_ms2','temperatureK','temperature_k','oxygen','pressure','airflow','thicknessMm','thickness_mm','__proto__','constructor','prototype']);
const idOk=id=>typeof id==='string'&&/^[a-z][a-z0-9_]{0,47}$/.test(id)&&!reserved.has(id);
const text=(s,max)=>typeof s==='string'&&s.trim()&&s.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s)?s.trim():'';
const fold=s=>String(s??'').trim().normalize('NFKC').toLowerCase();
function cleanWhen(value){
 if(!value||!idOk(value.fieldId)||!Array.isArray(value.oneOf)||!value.oneOf.length||value.oneOf.length>12)return null;
 const oneOf=[...new Set(value.oneOf.map(v=>text(v,80)).filter(Boolean))];
 return oneOf.length===value.oneOf.length?{fieldId:value.fieldId,oneOf}:null;
}
export function cleanContextField(value){
 if(!value||!idOk(value.id)||!['text','choice','number'].includes(value.kind))return null;
 const label=text(value.label,80),reason=text(value.reason,300);if(!label||!reason)return null;
 const unit=value.kind==='number'?text(value.unit,24):'';
 if(value.kind==='number'&&!unit)return null;
 const options=value.kind==='choice'&&Array.isArray(value.options)?[...new Set(value.options.slice(0,60).map(s=>text(s,80)).filter(Boolean))].slice(0,CONTEXT_LIMITS.options):[];
 if(value.kind==='choice'&&!options.length)return null;
 const showWhen=value.showWhen===undefined?undefined:cleanWhen(value.showWhen);
 if(value.showWhen!==undefined&&!showWhen)return null;
 return {id:value.id,label,kind:value.kind,reason,unit,options,...(showWhen?{showWhen}:{})};
}
function cleanFields(value,limit){const out=[];for(const raw of Array.isArray(value)?value.slice(0,60):[]){const field=cleanContextField(raw);if(field&&!out.some(f=>f.id===field.id||f.label.toLowerCase()===field.label.toLowerCase()))out.push(field);if(out.length===limit)break;}return out;}
function validWhen(when,fields){const parent=fields.find(f=>f.id===when.fieldId);return parent?.kind==='choice'&&when.oneOf.every(v=>parent.options.some(o=>fold(o)===fold(v)));}
function validTree(fields){
 const visiting=new Set(),done=new Set();
 function visit(f){if(done.has(f.id))return true;if(visiting.has(f.id))return false;visiting.add(f.id);if(f.showWhen&&(!validWhen(f.showWhen,fields)||!visit(fields.find(p=>p.id===f.showWhen.fieldId))))return false;visiting.delete(f.id);done.add(f.id);return true;}
 if(!fields.every(visit))return false;
 // Each node has one parent. Compute the maximum simultaneously visible branch,
 // rather than rejecting a useful tree just because it has several alternatives.
 function size(f){const children=fields.filter(c=>c.showWhen?.fieldId===f.id);return 1+Math.max(0,...f.options.map(v=>children.filter(c=>c.showWhen.oneOf.some(x=>fold(x)===fold(v))).reduce((n,c)=>n+size(c),0)));}
 return fields.filter(f=>!f.showWhen).reduce((n,f)=>n+size(f),0)<=CONTEXT_LIMITS.active;
}
function cleanMaterial(value,fields){
 if(value===undefined)return undefined;
 if(!value||!['material','fuel'].includes(value.role)||!Array.isArray(value.hints)||value.hints.length>12)return null;
 const hints=[];
 for(const h of value.hints){const showWhen=h?.showWhen===undefined?undefined:cleanWhen(h.showWhen);if(h?.showWhen!==undefined&&(!showWhen||!validWhen(showWhen,fields)))return null;
  if(!Array.isArray(h?.options)||!h.options.length||h.options.length>12)return null;
  const options=[...new Set(h.options.map(v=>text(v,80)).filter(Boolean))];if(options.length!==h.options.length)return null;
  hints.push({...showWhen?{showWhen}:{},options});
 }
 return {role:value.role,hints};
}
function activeIds(fields,values,unavailable){
 const result=new Set();function visible(f){if(result.has(f.id))return true;if(!f.showWhen){result.add(f.id);return true;}const p=fields.find(x=>x.id===f.showWhen.fieldId);if(!p||!visible(p)||unavailable.includes(p.id)||!f.showWhen.oneOf.some(v=>fold(v)===fold(values[p.id])))return false;result.add(f.id);return true;}
 fields.forEach(visible);return fields.filter(f=>result.has(f.id)).map(f=>f.id);
}
export function cleanContextState(value={}){
 const fields=cleanFields(value?.fields,CONTEXT_LIMITS.saved),ids=new Set(fields.map(f=>f.id));
 const subset=v=>Array.isArray(v)?[...new Set(v.filter(id=>ids.has(id)))]:[];
 const values=Object.fromEntries(fields.map(f=>[f.id,text(value?.values?.[f.id],CONTEXT_LIMITS.value)?value.values[f.id]:'']).filter(([,v])=>v));
 const unavailable=subset(value?.unavailable).filter(id=>!values[id]),offered=subset(value?.offered??value?.active);
 const tree=fields.filter(f=>offered.includes(f.id)),valid=validTree(tree),material=cleanMaterial(value?.material,tree);
 return {fields,offered:valid?offered:[],active:valid?activeIds(tree,values,unavailable):[],values,unavailable,seen:subset(value?.seen),...(material?{material}:{})};
}
export function fieldHasAnswer(state,id){return Boolean(state.values[id])||state.unavailable.includes(id);}
export function contextValueError(field,value){
 if(!value?.trim()||field?.kind!=='number')return '';
 return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())&&Number.isFinite(Number(value.replace(',','.')))?'':'Enter a number in the displayed unit, or leave this optional field blank.';
}
export function cleanContextUpdate(value,request={}){
 const keep={action:'keep',fields:[]};
 if(request.emergency||request.flow?.updateResearch===false||!request.scenario?.trim()||!value||value.action==='keep')return keep;
 if(value.action!=='replace'||!Array.isArray(value.fields)||value.fields.length>CONTEXT_LIMITS.saved)return keep;
 const fields=cleanFields(value.fields,CONTEXT_LIMITS.saved);
 // All-or-nothing schema replacement: malformed proposals cannot hide valid fields.
 if(fields.length!==value.fields.length)return keep;
 const previous=cleanContextState(request.contextDetails);
 const retained=fields.map(f=>{const old=previous.fields.find(x=>x.id===f.id);return old&&fieldHasAnswer(previous,f.id)?old:f;});
 if(!validTree(retained))return keep;
 const material=cleanMaterial(value.material,retained);if(material===null)return keep;
 const savedAnswered=previous.fields.filter(f=>fieldHasAnswer(previous,f.id)&&!retained.some(n=>n.id===f.id));
 if(savedAnswered.length+retained.length>CONTEXT_LIMITS.saved)return keep;
 return {action:'replace',fields:retained,...(material?{material}:{})};
}
export function receiveContextFields(value,update,canGuide=true){
 const state=cleanContextState(value);
 const clean=cleanContextUpdate(update,{scenario:'current scenario',contextDetails:state,flow:{updateResearch:canGuide}});
 if(clean.action!=='replace')return {state,newRequests:[]};
 const fields=[...clean.fields,...state.fields.filter(f=>fieldHasAnswer(state,f.id)&&!clean.fields.some(n=>n.id===f.id))];
 const next=cleanContextState({...state,fields,offered:clean.fields.map(f=>f.id),material:clean.material});
 const newRequests=next.active.filter(id=>!fieldHasAnswer(state,id)&&!state.seen.includes(id));
 return {state:cleanContextState({...next,seen:[...state.seen,...next.active]}),newRequests};
}
export function editContextValue(value,id,input){
 const state=cleanContextState(value);if(!state.fields.some(f=>f.id===id))return state;
 const v=String(input??'').slice(0,CONTEXT_LIMITS.value);
 const next=cleanContextState({...state,values:{...state.values,[id]:v},unavailable:state.unavailable.filter(k=>k!==id)});
 return {...next,seen:[...new Set([...next.seen,...next.active])]};
}
export function contextMaterialUi(value){const state=cleanContextState(value),material=state.material;return {label:material?.role==='fuel'?'Fuel material':'Material',options:[...new Set((material?.hints||[]).filter(h=>!h.showWhen||state.active.includes(h.showWhen.fieldId)&&!state.unavailable.includes(h.showWhen.fieldId)&&h.showWhen.oneOf.some(v=>fold(v)===fold(state.values[h.showWhen.fieldId]))).flatMap(h=>h.options))].slice(0,12)};}
export function contextForModel(value){
 const state=cleanContextState(value);
 return state.fields.map(f=>({...f,active:state.active.includes(f.id),value:state.active.includes(f.id)&&!contextValueError(f,state.values[f.id])?(state.values[f.id]||null):null,status:!state.active.includes(f.id)?'saved_not_active':state.unavailable.includes(f.id)?'unknown':contextValueError(f,state.values[f.id])?'invalid_not_used':state.values[f.id]?'user_reported':'not_supplied'}));
}
export function contextSearchText(value){return contextForModel(value).filter(f=>f.active&&f.status==='user_reported').map(f=>f.label+': '+f.value+(f.unit?' '+f.unit:'')).join('; ').slice(0,3600);}
