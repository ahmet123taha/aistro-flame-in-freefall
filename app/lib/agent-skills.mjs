import {AGENT_SKILLS,AGENT_SKILL_HASH} from './agent-skill-manifest.mjs';
export {AGENT_SKILL_HASH};
const numeric=['gravityMs2','temperatureK','oxygen','pressure','airflow','thicknessMm'];
export function selectAgentSkills(request){
 const ids=new Set(['concise-dialogue']);
 if(request.focusSourceId)ids.add('focused-source');
 if(request.mode==='research'&&!request.flow?.requiredStage){ids.add('source-takeaways');ids.add('safety-checklist');if(numeric.some(k=>Number.isFinite(request.conditions?.[k])))ids.add('numerical-evidence');}
 return AGENT_SKILLS.filter(s=>ids.has(s.id));
}
export function agentSkillContext(request){
 const selected=selectAgentSkills(request);
 return {manifestHash:AGENT_SKILL_HASH,active:selected.map(({id,version,sha256})=>({id,version,sha256})),instructions:selected.map(s=>'APPLICATION SKILL: '+s.id+'\n'+s.instructions).join('\n\n')};
}
export function scopedResearchRequest(corpus,request){
 if(!request.focusSourceId)return request;
 const id=request.focusSourceId;
 if(typeof id!=='string'||!corpus.records.some(r=>r.id===id))throw Object.assign(Error('The focused source is not in the local catalog.'),{status:400,code:'SOURCE_FOCUS_INVALID'});
 return {...request,ids:request.flow?.canRank===false?[]:[id]};
}
