// Intent controls optional form guidance, never evidence eligibility, rankings,
// saved measurements or the authorization to make a scientific claim.
export const ASSISTANCE_INTENTS = Object.freeze(['general_information', 'source_discovery', 'condition_comparison', 'clarification']);

const normalized = text => String(text || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replaceAll('ı', 'i').replace(/[’']/g, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
const clauses = text => String(text || '').split(/[.!?;\n]/).map(normalized).filter(Boolean);

// Only explicit standalone user controls override the model's semantic intent.
// Do not infer an intent, a measurement or expertise from "ISS", a material,
// "safety", numbers, or broad informational keywords. The current question is
// used, not cumulative history, so an old no-form preference does not veto a
// later comparison request.
function explicitControls(question) {
  const parts = clauses(question);
  const informationOnly = parts.some(text => /^(?:(?:please|for now|now|instead|actually) )*(?:just information|only information|general information only|i (?:just|only) want (?:general )?information|i only want an explanation|sadece bilgi(?: almak)? istiyorum|sadece bilgi ver|yalnizca bilgi almak istiyorum)(?: (?:for now|please|lutfen))?$/.test(text));
  const noForm = parts.some(text => /^(?:please |lutfen )?(?:(?:do not|dont) (?:ask (?:me )?for (?:conditions|measurements|parameters)|(?:open|show) (?:the |a )?(?:conditions panel|input panel|form))|no (?:form|measurements) (?:please|for now)|(?:kosul|parametre|olcum) sorma|(?:kosullar |girdi )?panelini acma|form istemiyorum)$/.test(text));
  return {informationOnly, noForm};
}

export function gateAssistanceIntent(value, request = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const controls = explicitControls(request.question);
  const intent = controls.informationOnly ? 'general_information'
    : ASSISTANCE_INTENTS.includes(value.assistanceIntent) ? value.assistanceIntent
    : value.stage === 'rank' ? 'source_discovery' : 'clarification';
  const suppressForm = intent === 'general_information' || controls.noForm;
  return {
    ...value, assistanceIntent: intent,
    ...(suppressForm ? {conditionRequests: [], contextFields: {action: 'keep', fields: []}} : {}),
    // An informational answer is complete without a measurements questionnaire.
    // Preserve its sourced content, optional explicit-value suggestions and
    // evidence limitations; do not manufacture a replacement scientific answer.
    ...(intent === 'general_information' ? {questions: []} : {})
  };
}
