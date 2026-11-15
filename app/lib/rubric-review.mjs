import {SCENARIO_CRITERIA} from './research-scoring.mjs';

export function reviewRubricReasons(assessment){
 // Historical four-dimension responses keep their existing validation contract.
 if(Object.hasOwn(assessment.rubric,'setting'))return {assessment,unscored:[],zeroExplanations:[]};
 const reasons={...assessment.rubricReasons},unscored=[],zeroExplanations=[];
 for(const dimension of Object.keys(SCENARIO_CRITERIA)){
  const value=assessment.rubricReasons?.[dimension];
  const issue=value==null?'missing':typeof value!=='string'?'invalid_type':!value.trim()?'empty':value.length>600?'too_long':null;
  if(!issue)continue;
  const diagnostic={dimension,issue};
  if(assessment.rubric[dimension]>0)unscored.push(diagnostic);
  else {
   zeroExplanations.push(diagnostic);
   // Administrative explanation only: no source fact or model score is invented.
   reasons[dimension]='No scenario points assigned. The model supplied no usable explanation for this dimension.';
  }
 }
 return {assessment:{...assessment,rubricReasons:reasons},unscored,zeroExplanations};
}
