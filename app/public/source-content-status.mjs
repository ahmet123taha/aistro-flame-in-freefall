// Describe extraction coverage without equating text recovery with scientific review.
export function sourceContentStatusText(content){
 if(content?.state!=='ready')return 'Source content index is unavailable. Install the matching Research_Content add-on inside Veri_Seti and restart. Reviewed numerical evidence remains available.';
 const statuses=content.coverage?.fileStatuses||{},count=key=>Number.isSafeInteger(statuses[key])&&statuses[key]>=0?statuses[key]:0;
 const recovered=count('extracted_unreviewed')+count('extracted_literal_stream')+count('fallback_extracted_unreviewed'),partial=count('partial_extracted_unreviewed')+count('partial_literal_stream');
 const selected=Number.isSafeInteger(content.selectedFiles)&&content.selectedFiles>=0?content.selectedFiles:0;
 const known=recovered+partial+count('no_extractable_text')+count('excluded_error');
 const other=Math.max(0,selected-known);
 return `Source content: ${recovered.toLocaleString('en-US')} files with extracted text; ${partial.toLocaleString('en-US')} partially recovered; ${count('no_extractable_text').toLocaleString('en-US')} without extractable text; ${count('excluded_error').toLocaleString('en-US')} excluded${other?`; ${other.toLocaleString('en-US')} with other recorded statuses`:''}. ${selected.toLocaleString('en-US')} files inspected. Coverage remains partial. Retrieved passages are checked against original files; extraction does not verify scientific meaning or create measured conditions.`;
}
