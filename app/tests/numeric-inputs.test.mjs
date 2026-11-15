import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest } from '../lib/corpus.mjs';
import { payloadFor } from '../lib/gemini.mjs';
test('Numeric gravity temperature and thickness retain units and unknowns without fabricated matches',()=>{
 const input={question:"Material yangın davranışını karşılaştır",ids:['PSI-107'],conditions:{gravity:'other',gravityMs2:1.62,temperatureK:293.15,thicknessMm:0.5}};
 const parsed=validateRequest(input);assert.equal(parsed.conditions.gravityMs2,1.62);assert.equal(parsed.conditions.temperatureK,293.15);assert.equal(parsed.conditions.thicknessMm,0.5);assert.equal(parsed.conditions.oxygen,null);
 const body=JSON.parse(payloadFor({records:[]},parsed).input[0].content[0].text);assert.equal(body.conditions.units.gravityMs2,'m/s2');assert.equal(body.conditions.units.temperatureK,'K');
 for(const [field,value] of [['gravityMs2',-1],['temperatureK',0],['thicknessMm',Infinity],['gravityMs2','1.62']])assert.throws(()=>validateRequest({...input,conditions:{...input.conditions,[field]:value}}));
 assert.equal(validateRequest({...input,conditions:{gravity:'other',gravityMs2:null}}).conditions.gravityMs2,null);
});
