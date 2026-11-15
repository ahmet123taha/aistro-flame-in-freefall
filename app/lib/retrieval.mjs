const topics=[
 ['oxygen',"Oxygen",['oksijen','oxygen','o2']],
 ['pressure',"Pressure",['basınç','pressure']],
 ['temperatureK',"Temperature",['sıcaklık','temperature','thermal']],
 ['airflow',"Flow",['akış','flow','airflow','convection']],
 ['gravityMs2',"Gravity",['yerçekimi','gravity','microgravity']],
 ['thicknessMm',"Thickness",['kalınlık','thickness']],
 ['smoke',"Smoke",['duman','smoke','soot']],
 ['flame',"Flame",['alev','flame']],
 ['combustion',"Combustion",['yanma','combustion','burning']],
 ['fabric',"Fabric",['kumaş','fabric','cotton']],
 ['droplet',"Droplet",['damla','droplet']],
 ['extinction',"Extinction",['sönme','extinction']]
];
const words=text=>new Set(String(text||'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
export function retrieveRecords(corpus,request,{limit=8}={}){
 const conditions=request.conditions||{},question=words(request.question),active=topics.filter(([key])=>conditions[key]!=null);
 // Equal topic coverage is not a comparison of experimental numeric values.
 if(!active.length)active.push(...topics.filter(([, ,terms])=>terms.some(t=>question.has(t))));
 if(conditions.material?.trim())active.push(['material',"Material",[conditions.material.toLowerCase().trim()]]);
 const rows=corpus.records.filter(r=>request.ids.includes(r.id)).map(r=>{
  const text=Object.values(r.content||{}).join(' '),title=String(r.title||r.name||''),source=words(text+' '+title),titleWords=words(title);
  const evidence=active.flatMap(([key,label,aliases])=>{
   const term=aliases.find(t=>t.includes(' ')?(text+' '+title).toLowerCase().includes(t):source.has(t));
   return term?[{key,label,term,sourceId:r.id,field:'metadata'}]:[];
  });
  const hits=[...question].filter(t=>t.length>=3&&source.has(t));
  const topicCoverage=active.length?Math.round(100*evidence.length/active.length):null;
  return {id:r.id,relevance:evidence.length*10+hits.reduce((n,t)=>n+(titleWords.has(t)?3:1),0),terms:evidence.map(e=>e.term),reasonTags:evidence.map(e=>e.label),topicCoverage,topicEvidence:evidence,topicCount:active.length,matchedTopicCount:evidence.length,similarity:null,evidenceType:'metadata',sourceRows:[r.id+':metadata'],reason:evidence.map(e=>e.label).join(' · ')||"General source"};
 }).sort((a,b)=>(b.topicCoverage??-1)-(a.topicCoverage??-1)||b.relevance-a.relevance||a.id.localeCompare(b.id));
 const positive=rows.filter(r=>r.relevance>0);return {matches:(positive.length?positive:rows).slice(0,limit),fallback:!positive.length};
}
export function matchSources(corpus,request){return {mode:'source_retrieval',datasetHash:corpus.hash,...retrieveRecords(corpus,request),aiRecommendations:[],numericComparisonAvailable:false,scoreDefinition:{kind:'topic_coverage',label:"Topic relevance",formula:"100 × input topics present in source / entered topic count",weights:'equal',calibrated:false},limitation:"The percentage measures topic coverage in the source text, not numerical condition similarity or fire risk."};}
