import test from 'node:test';
import assert from 'node:assert/strict';
import {sibalReportRows,SIBAL_SOURCE} from '../lib/sibal-evidence.mjs';
import {transitionApplicability,transitionInputBox,evaluateTransitions,paretoLayers,SIBAL_TRANSITION_METHOD} from '../lib/sibal-transitions.mjs';
import {matchExperiments} from '../lib/numeric-matching.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderNumericCard,renderNumericDetails} from '../public/numeric-card.mjs';
const file={id:SIBAL_SOURCE.fileId,sha256:SIBAL_SOURCE.sha256,name:'Report'},rows=sibalReportRows(file),corpus={hash:'h',experiments:{rows,boundaryReference:file}};
const c={material:'sibal',fabricConstruction:'sibal-75-25',specimenKind:'sheet',flowDirection:'concurrent',gravityRegime:'microgravity',flameState:'established',widthMm:22,pressure:101.325,thicknessMm:.32,arealDensityMgCm2:18.2,exposedLengthMm:100,oxygen:17.5,airflow:2.2,transitionKind:'all',oxygenUncertaintyPp:.05,airflowUncertaintyCmS:.1};
const request={method:SIBAL_TRANSITION_METHOD,ids:['PSI-25'],question:'x',conditions:{gravity:'other',...c}};
test('SIBAL transition scope requires source nominal material, geometry, pressure and established flame',()=>{
 assert.equal(transitionApplicability(c).applicable,true);
 for(const patch of [{material:'cotton'},{fabricConstruction:'other'},{specimenKind:'rod'},{flowDirection:'opposed'},{gravityRegime:'earth'},{gravityMs2:1.6},{flameState:'unignited'},{specimenHistory:'reused'},{widthMm:17},{thicknessMm:.5},{pressure:100},{arealDensityMgCm2:18},{exposedLengthMm:50},{oxygen:15},{airflow:56}])assert.equal(transitionApplicability({...c,...patch}).applicable,false,JSON.stringify(patch));
 assert.equal(matchExperiments({...corpus,experiments:{...corpus.experiments,boundaryReference:{...file,sha256:'bad'}}},request).matches.length,0);
});
test('Observed events are separate from no-blowoff records and from another specimen width',()=>{
 const wide=evaluateTransitions(rows,c);assert.equal(wide.events.length,4);assert.equal(wide.notObserved.length,2);assert.ok(wide.events.every(e=>e.kind==='quenching'));
 assert.ok(wide.notObserved.every(e=>e.paretoLayer===undefined&&e.inputBoxContainsObservation===null));
 const narrow=evaluateTransitions(rows,{...c,widthMm:12});assert.equal(narrow.events.length,3);assert.equal(narrow.events.filter(e=>e.kind==='blowoff').length,1);assert.equal(narrow.notObserved.length,0);assert.match(narrow.limitations[0],/was unresolved/);
 assert.equal(evaluateTransitions(rows,{...c,transitionKind:'blowoff'}).events.length,0);
 assert.equal(evaluateTransitions(rows,{...c,widthMm:22+1e-10}).events.length,4);
});
test('Pareto layers preserve tradeoffs and ties, independent of positive unit scaling',()=>{
 const p=(runId,oxygen,airflow)=>({runId,distance:{oxygen,airflow}}),points=[p('a',0,2),p('b',1,1),p('c',2,0),p('d',2,2),p('e',3,3),p('tie',1,1)];
 const layers=paretoLayers(points);assert.deepEqual([...layers.values()].sort(),[1,1,1,1,2,3]);
 assert.equal(layers.get('b'),layers.get('tie'));assert.equal(layers.get('d'),2);
 const scaled=paretoLayers(points.map(p=>({...p,distance:{oxygen:p.distance.oxygen*100,airflow:p.distance.airflow*.01}})));
 for(const p of points)assert.equal(layers.get(p.runId),scaled.get(p.runId));
 assert.throws(()=>paretoLayers([p('bad',NaN,1)]));assert.throws(()=>paretoLayers([p('x',1,1),p('x',2,2)]));
});
test('Source endpoint overlap is a measured-input box, not an invented boundary or bracket',()=>{
 const t=evaluateTransitions(rows,c),e=t.events.find(e=>e.runId==='GMT100-T13');
 assert.equal(e.terminalFlow,2.2);assert.equal(e.initialFlow,4);assert.equal(e.deltaOxygenPp,0);assert.equal(e.deltaAirflowCmS,0);assert.equal(e.paretoLayer,1);assert.equal(e.inputBoxContainsObservation,true);assert.equal(t.overlapCount,1);
 assert.equal(t.inputBox.sourceUncertaintyKnown,false);
 const shifted=evaluateTransitions(rows,{...c,oxygen:17.6,airflow:2.3,oxygenUncertaintyPp:.1,airflowUncertaintyCmS:.1}).events.find(e=>e.runId==='GMT100-T13');
 assert.ok(Math.abs(shifted.deltaOxygenPp-.1)<1e-10);assert.ok(Math.abs(shifted.deltaAirflowCmS-.1)<1e-10);assert.equal(shifted.inputBoxContainsObservation,true);
 assert.ok(Math.abs(shifted.airflowCloseness-95.652173913)<1e-8);
});
test('Missing and out-of-window errors remain unknown; zero errors are explicit point comparison',()=>{
 assert.equal(transitionInputBox({...c,oxygenUncertaintyPp:undefined}).status,'unknown');
 assert.equal(transitionInputBox({...c,airflow:1.05,airflowUncertaintyCmS:.1}).status,'outside_window');
 assert.equal(evaluateTransitions(rows,{...c,oxygenUncertaintyPp:undefined}).events[0].inputBoxContainsObservation,null);
 assert.equal(evaluateTransitions(rows,{...c,oxygenUncertaintyPp:0,airflowUncertaintyCmS:0}).overlapCount,1);
});
test('New method rejects invalid filters and does not use user-defined weights as physical ones',()=>{
 const parsed=validateRequest({...request,weights:{oxygen:100}},['PSI-25']);assert.equal(parsed.method,SIBAL_TRANSITION_METHOD);assert.equal(parsed.conditions.transitionKind,'all');
 assert.throws(()=>validateRequest({...request,conditions:{...request.conditions,transitionKind:'safe'}},['PSI-25']));
 const r=matchExperiments(corpus,parsed);assert.equal(r.matches[0].similarity,null);assert.equal(r.method.scientificallyCalibrated,false);assert.deepEqual(r.weights,{});
});
test('Review UI labels source events, separate distances, missing errors and unobserved mechanisms',()=>{
 const m=matchExperiments(corpus,request).matches[0],html=renderNumericCard({id:'PSI-25',name:'BASS',match:m});
 assert.match(html,/Event within input interval/);assert.match(html,/Pareto/);assert.match(html,/Layers are not risk levels/);assert.match(html,/boundary line is generated/);assert.match(html,/No blowoff/);assert.ok(!html.includes('score-10'));
 const noEvents=matchExperiments(corpus,{...request,conditions:{...c,transitionKind:'blowoff'}}).matches[0];assert.match(renderNumericCard({id:'PSI-25',name:'BASS',match:noEvents}),/No transition observed/);
 assert.match(renderNumericDetails(m),/PDF 104, 106, 108–109/);
});
