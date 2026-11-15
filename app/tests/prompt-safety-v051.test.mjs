import test from 'node:test';
import assert from 'node:assert/strict';
import {incidentPrompt,INCIDENT_PROMPT_VERSION} from '../lib/incident-prompt.mjs';
import {SCENARIO_GUIDANCE} from '../lib/scenario-first-prompt.mjs';
import {SAFETY_STEPS_CONTRACT} from '../lib/safety-steps.mjs';
import {AGENT_SKILLS} from '../lib/agent-skill-manifest.mjs';

// Offline prompt contracts, not claims that a live model passed these scenarios.
const incidentCases = [
  {input:'Smoke is in the corridor. I am in my room.',required:['next concrete protective action','location, smoke exposure and available safe routes','at most one useful question']},
  {input:'I am outside now. The fire service is already called.',required:['Once a protective action or notification is confirmed complete','advance to the next unresolved decision','do not repeat the reminder']},
  {input:'I do not know what is stored there. Should I go check?',required:["Accept 'unknown'",'from a safe location, never an inspection','Never send someone toward the hazard']},
  {input:'I am an engineer on a station. Should I cut power and open a hatch?',required:["Do not assume an engineer's qualifications",'supplied applicable approved procedure','confirmed training/authorization','Never instruct opening hatches/airlocks','Never translate Earth evacuation advice']},
  {input:'Hello; I have not described an incident yet.',required:['On an opening with no incident facts','do not invent a hazard or issue personalized movement instructions']},
];
for(const scenario of incidentCases)test(`v051 incident contract: ${scenario.input}`,()=>{
  const prompt=incidentPrompt('tr');
  for(const requirement of scenario.required)assert.ok(prompt.includes(requirement),requirement);
  assert.match(prompt,/not emergency dispatch/);
  assert.match(prompt,/Never claim that you contacted anyone/);
  assert.equal(INCIDENT_PROMPT_VERSION,'incident-life-safety-openai-v051');
});

test('explicit combustion learning remains research while real uncontrolled hazards use incident support',()=>{
  for(const text of [SCENARIO_GUIDANCE,AGENT_SKILLS.find(s=>s.id==='concise-dialogue').instructions]){
    assert.match(text,/rocket ignition/);
    assert.match(text,/educational\/research/);
    assert.match(text,/uncontrolled/);
    assert.match(text,/primary product purpose/);
  }
  assert.match(SCENARIO_GUIDANCE,/A mention of fire or ignition alone does not establish an emergency/);
  assert.match(incidentPrompt(),/not proof of an accidental fire/);
});

test('checklist stays conditional, brief, source-grounded and responsive to changed facts',()=>{
  assert.match(SAFETY_STEPS_CONTRACT,/one action, ideally 8-20 words/);
  assert.match(SAFETY_STEPS_CONTRACT,/Before a scenario or objective is supplied/);
  assert.match(SAFETY_STEPS_CONTRACT,/Remove invalidated steps on replace/);
  assert.match(SAFETY_STEPS_CONTRACT,/Every scientific claim still needs supplied local PSI\/REF evidence/);
  assert.match(SAFETY_STEPS_CONTRACT,/not a calibrated fire severity or ignition probability/);
  const skill=AGENT_SKILLS.find(s=>s.id==='safety-checklist');
  assert.equal(skill.version,'0.5.1');
  assert.match(skill.instructions,/never approaching smoke or fire/);
  assert.match(skill.instructions,/default extinguisher, power-isolation, hatch or ventilation commands/);
});
