import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGravityInput,readConditionInput,gravityInputMessage,STANDARD_GRAVITY_MS2} from '../public/gravity-input.mjs';
import {newConversationContext} from '../public/conversation-panel.mjs';
import {createConversationStore} from '../lib/conversations.mjs';

test('bare gravity values retain m/s² semantics including zero and missing values',()=>{
  assert.equal(parseGravityInput('1.96'),1.96);
  assert.equal(parseGravityInput('1,96'),1.96);
  assert.equal(parseGravityInput('0'),0);
  assert.equal(parseGravityInput(''),null);
  assert.equal(parseGravityInput('  '),null);
  assert.equal(parseGravityInput(null),null);
});
test('explicit g or G is converted exactly once using standard gravity',()=>{
  assert.equal(parseGravityInput('1g'),STANDARD_GRAVITY_MS2);
  for(const value of ['1.96 g','1.96G',' 1,96 G '])assert.equal(parseGravityInput(value),1.96*9.80665);
  assert.equal(parseGravityInput('0.2g'),1.96133);
  assert.equal(parseGravityInput('1e-6 G'),1e-6*9.80665);
  assert.equal(parseGravityInput('0 g'),0);
  assert.equal(parseGravityInput(String(parseGravityInput('1.96 G'))),1.96*9.80665);
});
test('explicit acceleration suffixes and invalid input cannot be confused with g',()=>{
  for(const value of ['1.96m/s²','1.96 m/s2','1,96 m/s^2'])assert.equal(parseGravityInput(value),1.96);
  for(const value of ['g','1.96 gg','1.96 mg','1.96 G junk','1,000,5','NaN','Infinity','-1g','1e999g','101.98g','1000.01','0x10',{},true])assert.ok(Number.isNaN(parseGravityInput(value)),String(value));
  assert.equal(parseGravityInput('1000'),1000);
});
test('all request paths share SI normalization and show the converted value before submission',()=>{
  assert.equal(readConditionInput('gravityMs2','1.96G'),1.96*9.80665);
  assert.equal(readConditionInput('gravityMs2','1.96'),1.96);
  assert.equal(readConditionInput('oxygen','30'),30);
  assert.equal(readConditionInput('oxygen',''),null);
  assert.match(gravityInputMessage('1.96G'),/19\.221034 m\/s²/);
  assert.match(gravityInputMessage(''),/Bare numbers use m\/s²/);
  assert.match(gravityInputMessage('1.96gg'),/Enter gravity/);
});
test('conversation switching preserves g entry and canonical SI without double conversion',async()=>{
  const environment={material:'PMMA',conditions:{material:'pmma',gravityMs2:1.96*9.80665},gravityInput:'1.96 G'};
  const context=newConversationContext(environment);
  assert.equal(context.gravityInput,'1.96 G');assert.equal(context.conditions.gravityMs2,1.96*9.80665);
  const store=createConversationStore();
  await store.save({revision:0,activeId:'gravity',conversations:[{id:'gravity',title:'Gravity units',messages:[],context}]});
  const restored=(await store.read()).conversations[0].context;
  assert.equal(restored.gravityInput,'1.96 G');assert.equal(parseGravityInput(restored.gravityInput),restored.conditions.gravityMs2);
  assert.equal(newConversationContext().gravityInput,undefined);
  assert.equal(newConversationContext({conditions:{gravityMs2:1.96}}).conditions.gravityMs2,1.96);
});
