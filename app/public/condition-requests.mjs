// Shared, data-only contract. Model requests can guide fields, never assign values.
export const CONDITION_LABELS=Object.freeze({material:'Material used',atmosphere:'Other known gases',gravityMs2:'Gravity (acceleration)',temperatureK:'Environment temperature',oxygen:'Oxygen concentration',pressure:'Pressure',airflow:'Ventilation / air movement',thicknessMm:'Material thickness'});
export const conditionKeys=Object.freeze(Object.keys(CONDITION_LABELS));
export function knownCondition(request,key){const value=key==='atmosphere'?request.atmosphere:request.conditions?.[key];return value!==null&&value!==undefined&&value!=='';}
export function unavailableKeys(value){return Array.isArray(value)?[...new Set(value.filter(k=>conditionKeys.includes(k)))].slice(0,8):[];}
export function cleanConditionRequests(value,request={}){
 if(!Array.isArray(value)||request.emergency||request.flow?.updateResearch===false)return [];
 const out=[],unavailable=unavailableKeys(request.unavailableConditions);
 for(const item of value){if(out.length===4)break;if(!item||!conditionKeys.includes(item.key)||typeof item.reason!=='string'||!item.reason.trim()||item.reason.length>400||knownCondition(request,item.key)||unavailable.includes(item.key)||out.some(x=>x.key===item.key))continue;out.push({key:item.key,reason:item.reason.trim()});}
 return out;
}
export function cleanPanelState(value={}){return {expanded:value.expanded===true,seen:unavailableKeys(value.seen),unavailable:unavailableKeys(value.unavailable),requests:cleanConditionRequests(value.requests)};}
export function receiveConditionRequests(state,requests,canGuide=true){
 const next=cleanPanelState(state);if(!canGuide)return next;
 next.requests=cleanConditionRequests(requests,{unavailableConditions:next.unavailable});
 if(next.requests.some(r=>!next.seen.includes(r.key)))next.expanded=true;
 next.seen=unavailableKeys([...next.seen,...next.requests.map(r=>r.key)]);
 return next;
}
