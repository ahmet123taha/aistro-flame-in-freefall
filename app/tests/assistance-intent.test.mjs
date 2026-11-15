import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {gateAssistanceIntent} from '../lib/assistance-intent.mjs';
import {validateResearch, researchRanking, RESEARCH_SYSTEM, RESEARCH_OUTPUT} from '../lib/research.mjs';
import {payloadFor, createAnalyzer} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
import {researchEvidence} from '../lib/research-evidence.mjs';

const quote = 'This controlled fixture describes research into detection and prevention of fires in occupied spacecraft. It does not provide an approved operational crew procedure.';
const corpus = {hash: 'assistance-intent-fixture', records: [{id: 'PSI-20', title: 'Synthetic source for routing tests', content: {approach: quote}}]};
const dimensions = ['objective', 'material', 'geometry', 'storage', 'atmosphere', 'gravity', 'flow', 'mechanism'];
const requests = [{key: 'pressure', reason: 'Known pressure could refine a comparison.'}, {key: 'oxygen', reason: 'Known oxygen could refine a comparison.'}];
const fields = {action: 'replace', fields: [{id: 'storage_description', label: 'Storage description', kind: 'text', reason: 'May narrow storage literature.', unit: '', options: []}]};
const assessment = {sourceId: 'PSI-20', field: 'approach', quote, rubric: Object.fromEntries(dimensions.map(key => [key, 0.5])), rubricReasons: Object.fromEntries(dimensions.map(key => [key, 'Synthetic partial source support for ' + key + '.'])), reason: 'This fixture supplies limited research context.', limitation: 'A synthetic validation fixture, not actual fire guidance.'};
const request = (question = 'I just arrived at ISS; teach me fire safety procedures.') => ({mode: 'research', ids: ['PSI-20'], scenario: question, question, conditions: {}, atmosphere: '', flow: {updateResearch: true, canRank: true}});
const reply = (assistanceIntent = 'general_information') => ({stage: 'rank', assistanceIntent, summary: 'The supplied research addresses detection and prevention (PSI-20); an approved crew procedure is not provided.', questions: ['What is your exact pressure?'], assessments: [structuredClone(assessment)], sourceBriefs: [{sourceId: 'PSI-20', field: 'approach', quote, basis: 'study_scope', topic: 'detection', finding: 'The fixture describes detection and prevention research.', application: 'Useful only as limited background for this information request.', limitation: 'It is not an approved crew procedure.'}], conditionRequests: structuredClone(requests), contextFields: structuredClone(fields), conditionSuggestions: [], unknowns: [], evidenceGaps: [], recommendations: {action: 'keep', items: []}, nextStep: 'Open the cited source for its original research context.', emergency: false});

test('general learning answer retains sourced summary, briefs and ranking but cannot request form fields', () => {
  const current = request(); current.conditions = {oxygen: 30, pressure: null};
  current.contextDetails = {fields: fields.fields, offered: ['storage_description'], active: ['storage_description'], values: {storage_description: 'stacked fabrics'}, unavailable: [], seen: ['storage_description']};
  const snapshot = structuredClone(current);
  const value = reply(), out = validateResearch(value, corpus, current);
  assert.equal(out.assistanceIntent, 'general_information'); assert.equal(out.summary, value.summary);
  assert.deepEqual(out.conditionRequests, []); assert.deepEqual(out.contextFields, {action: 'keep', fields: []}); assert.deepEqual(out.questions, []);
  assert.equal(out.assessments.length, 1); assert.equal(out.assessments[0].quote, quote);
  assert.equal(out.sourceBriefs.length, 1); assert.equal(out.sourceBriefs[0].finding, value.sourceBriefs[0].finding);
  assert.equal(researchRanking(corpus, current, out).matches.length, 1);
  assert.deepEqual(current, snapshot); assert.deepEqual(value.conditionRequests, requests);
});

test('a real conditions comparison can request useful missing fields without erasing known measurements', () => {
  const current = request('Compare the cotton storage experiments with my 30% oxygen environment.');
  current.conditions = {oxygen: 30};
  const out = validateResearch(reply('condition_comparison'), corpus, current);
  assert.equal(out.assistanceIntent, 'condition_comparison'); assert.deepEqual(out.conditionRequests, [requests[0]]);
  assert.equal(out.contextFields.action, 'replace'); assert.equal(out.contextFields.fields[0].id, 'storage_description');
  assert.equal(current.conditions.oxygen, 30); assert.equal(out.assessments.length, 1);
});

test('source discovery preserves narrowly useful optional refinements and accepts no measurements', () => {
  const out = validateResearch(reply('source_discovery'), corpus, request('Find cotton storage experiments and help narrow the sources.'));
  assert.deepEqual(out.conditionRequests, requests); assert.equal(out.contextFields.action, 'replace');
  const ranking = researchRanking(corpus, request(), out); assert.equal(ranking.matches[0].numericBudget, 0);
});

test('topic switch uses current response intent, not previous comparison forms or historical no-form wording', () => {
  const learning = request('Now explain the purpose of smoke detection research.');
  learning.history = [{role: 'user', text: 'Compare my oxygen and pressure values.'}];
  learning.scenario = 'Compare my oxygen and pressure values.\nNow explain smoke detection research.';
  const info = validateResearch(reply('general_information'), corpus, learning);
  assert.deepEqual(info.conditionRequests, []); assert.equal(info.contextFields.action, 'keep');
  const comparison = request('Now compare my known conditions with the experiments.');
  comparison.scenario = 'I only want information.\nNow compare my known conditions with the experiments.';
  comparison.history = [{role: 'user', text: 'I only want information.'}];
  const out = validateResearch(reply('condition_comparison'), corpus, comparison);
  assert.equal(out.assistanceIntent, 'condition_comparison'); assert.deepEqual(out.conditionRequests, requests);
});

test('explicit current just-information controls recover a conflicting model intent', () => {
  for (const question of ['I only want information. Teach me fire safety.', 'For now, just information.', 'Sadece bilgi almak istiyorum. Yangın güvenliğini anlat.']) {
    const out = validateResearch(reply('condition_comparison'), corpus, request(question));
    assert.equal(out.assistanceIntent, 'general_information'); assert.deepEqual(out.conditionRequests, []); assert.deepEqual(out.contextFields, {action: 'keep', fields: []});
  }
});

test('a no-form preference does not relabel a genuine comparison or suppress its sourced results', () => {
  const out = validateResearch(reply('condition_comparison'), corpus, request('Compare my oxygen measurements. Do not open the conditions panel.'));
  assert.equal(out.assistanceIntent, 'condition_comparison'); assert.deepEqual(out.conditionRequests, []);
  assert.deepEqual(out.contextFields, {action: 'keep', fields: []}); assert.equal(out.assessments.length, 1);
});

test('location, material, numeric and quoted keywords do not serve as a broad intent classifier', () => {
  for (const question of ['ISS oxygen comparison: 21% and 30%.', 'Teach me how to compare cotton and PMMA observations.', 'A quoted document says "I only want information". Compare my conditions.', 'I do not only want information; compare my pressure values.', 'I need information about material comparisons.']) {
    const out = gateAssistanceIntent(reply('condition_comparison'), request(question));
    assert.equal(out.assistanceIntent, 'condition_comparison'); assert.deepEqual(out.conditionRequests, requests);
  }
});

test('missing and invalid old intent fields are nonfatal compatibility cases, not fabricated measurements', () => {
  for (const intent of [undefined, null, 'old_cached_value', {model: 'injected'}]) {
    const value = reply(intent), out = validateResearch(value, corpus, request('Review the available papers.'));
    // Default parameter handles undefined in reply(); delete it to mimic old cache.
    if (intent === undefined) {delete value.assistanceIntent; assert.equal(validateResearch(value, corpus, request()).assistanceIntent, 'source_discovery');}
    else assert.equal(out.assistanceIntent, 'source_discovery');
    assert.equal(out.assessments.length, 1);
  }
});

test('ISS location alone cannot become assumed oxygen, pressure or gravity suggestions', () => {
  const value = reply(); value.conditionSuggestions = [
    {key: 'oxygen', value: 21, unit: '%vol', basis: 'estimated', quote: 'I just arrived at ISS'},
    {key: 'pressure', value: 101.3, unit: 'kPa', basis: 'estimated', quote: '101.3 kPa'},
    {key: 'gravityMs2', value: 0, unit: 'm/s2', basis: 'estimated', quote: 'I just arrived at ISS'}
  ];
  const out = validateResearch(value, corpus, request());
  assert.deepEqual(out.conditionSuggestions, []); assert.equal(out.conditionSuggestionReview.rejected.length, 3);
  assert.equal(out.summary, value.summary); assert.deepEqual(request().conditions, {});
});

test('general information still accepts a truly reported optional value without automatically applying it', () => {
  const current = request('Pressure is 100 kPa. I only want information.');
  const value = reply(); value.conditionSuggestions = [{key: 'pressure', value: 100, unit: 'kPa', basis: 'user_reported', quote: 'Pressure is 100 kPa'}];
  const out = validateResearch(value, corpus, current);
  assert.deepEqual(out.conditionRequests, []); assert.equal(out.conditionSuggestions[0].value, 100); assert.deepEqual(current.conditions, {});
});

test('assistance intent cannot weaken source quote, source scope, or rubric validation', () => {
  for (const transform of [
    value => {value.assessments[0].quote = 'A fabricated source quotation claiming operational approval.';},
    value => {value.assessments[0].sourceId = 'PSI-999';},
    value => {value.assessments[0].rubric.objective = 7;}
  ]) {
    const value = reply(); transform(value);
    assert.throws(() => validateResearch(value, corpus, request()), /quotation|rubric/);
  }
  assert.throws(() => validateResearch(reply(), corpus, {...request(), ids: []}), /quotation/);
});

test('intent contract is in the actual server payload with source-only evidence and no location defaults', () => {
  const payload = payloadFor(corpus, request());
  const prompt = payload.instructions;
  for (const item of ['general_information', 'source_discovery', 'condition_comparison', 'clarification', 'A clear learning question is already an objective', 'Never infer ISS/Earth/Moon', 'ONLY supplied local source fields']) assert.ok(prompt.includes(item), item);
  assert.ok(RESEARCH_OUTPUT.includes('assistanceIntent:')); assert.ok(RESEARCH_SYSTEM.includes('questions:[], conditionRequests:[]'));
  const user = JSON.parse(payload.input[0].content[0].text);
  for (const key of ['oxygen', 'pressure', 'gravityMs2']) assert.equal(user.conditions[key], null);
  assert.equal(payload.tools, undefined);
});

test('ordinary ISS learning question traverses HTTP, model response and source validation without opening Conditions', async () => {
  let calls = 0;
  const analyzer = createAnalyzer({corpus, key: 'TEST_ONLY_NOT_REAL', fetchImpl: async (_url, options) => {
    calls++; const data = JSON.parse(JSON.parse(options.body).input[0].content[0].text);
    assert.equal(data.flow.canRank, true); assert.equal(data.conditions.oxygen, null);
    const value = reply();
    const evidence = researchEvidence(corpus, ['PSI-20']).find(item => item.sourceId === 'PSI-20');
    value.assessments = [{...assessment, field: undefined, quote: undefined, evidenceId: evidence.id}];
    value.sourceBriefs = [{...value.sourceBriefs[0], field: undefined, quote: undefined, evidenceId: evidence.id}];
    return Response.json({...providerResponse(value,{model:'TEST_ONLY'})});
  }});
  const app = createApp({corpus, analyzer, sessionToken: 'intent-test'});
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${app.address().port}/api/research`, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Flame-Session': 'intent-test'}, body: JSON.stringify({question: request().question, scenario: '', conditions: {}})});
    const result = await response.json(); assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(result.analysis.assistanceIntent, 'general_information'); assert.deepEqual(result.analysis.conditionRequests, []);
    assert.deepEqual(result.analysis.contextFields, {action: 'keep', fields: []}); assert.equal(result.analysis.sourceBriefs.length, 1);
    assert.equal(result.ranking.matches.length, 1); assert.equal(result.ranking.matches[0].numericBudget, 0); assert.equal(calls, 1);
  } finally {await new Promise(resolve => app.close(resolve));}
});
