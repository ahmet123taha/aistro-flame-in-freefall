import test from 'node:test';
import assert from 'node:assert/strict';
import {compileAgentSkills} from '../scripts/compile-agent-skills.mjs';
import {selectAgentSkills,scopedResearchRequest,AGENT_SKILL_HASH} from '../lib/agent-skills.mjs';
import {payloadFor,createAnalyzer} from '../lib/gemini.mjs';
import {validateConversations} from '../lib/conversations.mjs';
import {newConversationContext} from '../public/conversation-panel.mjs';
const corpus={hash:'TEST_ONLY',records:[{id:'PSI-25',title:'Test A',content:{approach:'TEST_ONLY A'},tableReferences:[]},{id:'PSI-26',title:'Test B',content:{approach:'TEST_ONLY B'},tableReferences:[]}]};
const request={mode:'research',ids:['PSI-25','PSI-26'],question:'Discuss this study.',scenario:'Fabric storage',conditions:{gravityMs2:0},flow:{canRank:true,requiredStage:null}};
test('all shipped skills are compiled byte-consistently and the zero input routes numerical support',async()=>{
 const result=await compileAgentSkills({check:true});assert.equal(result.hash,AGENT_SKILL_HASH);assert.equal(result.count,5);
 assert.deepEqual(selectAgentSkills({...request,focusSourceId:'PSI-26'}).map(s=>s.id),['concise-dialogue','focused-source','numerical-evidence','safety-checklist','source-takeaways']);
 assert.deepEqual(selectAgentSkills({...request,flow:{requiredStage:'conversation'}}).map(s=>s.id),['concise-dialogue']);
 assert.ok(!selectAgentSkills({...request,conditions:{gravityMs2:null}}).some(s=>s.id==='numerical-evidence'));
});
test('focused payload excludes other studies and embeds actual skills with receipts',()=>{
 const p=payloadFor(corpus,{...request,focusSourceId:'PSI-26'}),d=JSON.parse(p.input[0].content[0].text);
 assert.deepEqual(d.sources.map(s=>s.id),['PSI-26']);assert.equal(d.focusSourceId,'PSI-26');assert.equal(d.agentSkills.manifestHash,AGENT_SKILL_HASH);
 assert.match(p.instructions,/APPLICATION SKILL: focused-source/);assert.match(p.instructions,/Do not paraphrase/);
 assert.equal(p.tools,undefined);assert.equal(p.toolConfig,undefined);
 assert.deepEqual(scopedResearchRequest(corpus,{...request,focusSourceId:'PSI-26',flow:{canRank:false}}).ids,[]);
});
test('invalid focus fails before retrieval or provider; valid focus limits lookup and generation',async()=>{
 let lookedUp=null,calls=0;
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',contextProvider:async r=>{lookedUp=r.ids;return corpus;},fetchImpl:async(_u,o)=>{calls++;const d=JSON.parse(JSON.parse(o.body).input[0].content[0].text);assert.deepEqual(d.sources.map(s=>s.id),['PSI-26']);return new Response('{}',{status:503});}});
 await assert.rejects(analyzer.analyze({...request,focusSourceId:'PSI-999'}),{code:'SOURCE_FOCUS_INVALID'});assert.equal(lookedUp,null);assert.equal(calls,0);
 await assert.rejects(analyzer.analyze({...request,focusSourceId:'PSI-26'}),{code:'OPENAI_503'});assert.deepEqual(lookedUp,['PSI-26']);assert.equal(calls,1);
});
test('focused language-only turn needs no scientific source but retains skill context',()=>{
 const p=payloadFor({hash:'TEST_ONLY',records:[]},{...request,focusSourceId:'PSI-26',flow:{canRank:false,requiredStage:'conversation'}});
 const d=JSON.parse(p.input[0].content[0].text);assert.deepEqual(d.sources,[]);assert.equal(d.focusSourceId,'PSI-26');assert.ok(d.agentSkills.active.some(s=>s.id==='focused-source'));
});
test('focus is stored with its own chat but excluded from new chat environment transfer',()=>{
 const value={revision:0,activeId:'chat1',conversations:[{id:'chat1',title:'TEST_ONLY',messages:[],context:{focusSourceId:'PSI-26'}}]};
 assert.equal(validateConversations(value).conversations[0].context.focusSourceId,'PSI-26');
 assert.equal(newConversationContext(value.conversations[0].context).focusSourceId,undefined);
 value.conversations[0].context.focusSourceId='../../secret';assert.equal(validateConversations(value).conversations[0].context.focusSourceId,null);
});
