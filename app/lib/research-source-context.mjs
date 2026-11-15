// Literal document discovery is separate from reviewed numerical measurements.
export function attachSourceFragments(corpus,retrieval={}){
 const chunks=[...(retrieval.chunks||[]),...(retrieval.contextChunks||[])].filter(c=>/^C-[a-f0-9]+$/.test(c.id)&&/^f\d+$/.test(c.fileId)&&/^[a-f0-9]{64}$/.test(c.sha256)&&typeof c.quote==='string'&&c.quote.length<=1400&&Array.isArray(c.sourceIds)&&c.scope==='literal_extracted_text_not_reviewed_numerical_evidence');
 const records=corpus.records.map(record=>{
  const fragments=chunks.filter(c=>/^(PSI|REF)-\d+$/.test(record.id)&&c.sourceIds.includes(record.id)).map(c=>({...c,association:'Catalog association only. Verify the named study and material in the literal passage; this is not an experimental-row assignment.'}));
  if(!fragments.length)return record;
  const sourceIndexText=record.content?.fileText||'';
  const literal=fragments.map(c=>c.quote).join('\n\n');
  return {...record,sourceFragments:fragments,sourceIndexText,content:{...record.content,fileText:literal+(sourceIndexText?'\n\n'+sourceIndexText:'')},fileSources:[...(record.fileSources||[]),...fragments.map(c=>({id:c.fileId,name:c.name,sha256:c.sha256,chunkId:c.id,...c.location,catalogAssociationOnly:true}))],contextWarnings:[...(record.contextWarnings||[]),'Literal extracted passages are unreviewed discovery text, not normalized measurements. A shared document catalog association does not assign its findings to every linked investigation.']};
 });
 return {...corpus,records,sourceContentRetrieval:{sourceCandidateIds:retrieval.sourceCandidateIds||[],candidateSourceIds:retrieval.candidateSourceIds||[],characters:retrieval.characters||0,queryStatus:retrieval.queryStatus||'not_reported',numericTokensIgnored:Boolean(retrieval.numericTokensIgnored),coverage:retrieval.coverage||null,omittedCandidateShardFiles:retrieval.omittedCandidateShardFiles||0,excluded:retrieval.excluded||[],limits:retrieval.limits||{},indexHash:retrieval.indexHash||null,unavailable:Boolean(retrieval.indexUnavailable)}};
}

export function literalSourceProvenance(record,quote){
 const fragment=record?.sourceFragments?.find(c=>c.quote===quote&&c.sourceIds.includes(record.id));
 return fragment?{fileId:fragment.fileId,name:fragment.name,sha256:fragment.sha256,chunkId:fragment.id,...fragment.location,catalogAssociationOnly:true}:null;
}
