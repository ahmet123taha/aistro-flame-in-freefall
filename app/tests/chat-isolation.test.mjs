import test from 'node:test';import assert from 'node:assert/strict';
import {newConversationContext,modelHistory} from '../public/conversation-panel.mjs';
import {createConversationStore} from '../lib/conversations.mjs';
import {payloadFor} from '../lib/gemini.mjs';

test('new chat discards old scenario, evidence, source focus and recommendations',()=>{
 const old={scenario:'OLD oxygen storage',material:'PMMA',atmosphere:'nitrogen',conditions:{material:'pmma',oxygen:30,airflow:0,pressure:null},conditionBasis:{airflow:'estimated'},recommendations:{items:[{text:'OLD recommendation'}]},history:[{text:'OLD'}],ranking:{total:100},sourceId:'PSI-25'};
 const blank=newConversationContext();assert.deepEqual(blank.conditions,{});assert.equal(blank.material,'');
 const seeded=newConversationContext(old);assert.equal(seeded.scenario,'');assert.equal(seeded.material,'PMMA');assert.equal(seeded.conditions.oxygen,30);assert.equal(seeded.conditions.airflow,0);assert.equal(seeded.conditions.pressure,null);assert.equal(seeded.conditionBasis.airflow,'estimated');assert.deepEqual(seeded.recommendations.items,[]);
 assert.equal(seeded.history,undefined);assert.equal(seeded.sourceId,undefined);assert.equal(seeded.ranking,undefined);
 seeded.conditions.oxygen=20;assert.equal(old.conditions.oxygen,30);
});
test('new-chat request contains only its own turns and current environment; old chat remains restorable',async()=>{
 const store=createConversationStore();const old={id:'old',title:'Old habitat',messages:[{id:'a',role:'user',text:'OLD_SCENARIO oxygen 30'}],context:{scenario:'OLD_SCENARIO oxygen 30',conditions:{oxygen:30},material:'PMMA'}};
 const fresh={id:'new',title:'New habitat',messages:[{id:'b',role:'user',text:'NEW_SCENARIO wood'}],context:newConversationContext({material:'Wood',conditions:{material:'wood',oxygen:21,airflow:0}})};
 await store.save({revision:0,activeId:'new',conversations:[old,fresh]});const saved=await store.read();
 const current=saved.conversations.find(c=>c.id===saved.activeId);const request={mode:'research',ids:[],question:current.messages[0].text,scenario:current.messages[0].text,conditions:current.context.conditions,history:modelHistory(current.messages)};
 const body=JSON.parse(payloadFor({records:[]},request).input[0].content[0].text);assert.equal(body.conditions.oxygen,21);assert.equal(body.conditions.airflow,0);assert.ok(!JSON.stringify(body).includes('OLD_SCENARIO'));assert.deepEqual(body.previousRecommendations,[]);
 saved.activeId='old';await store.save(saved);assert.equal((await store.read()).conversations[0].context.conditions.oxygen,30);assert.equal((await store.read()).conversations[0].messages[0].text,'OLD_SCENARIO oxygen 30');
});
