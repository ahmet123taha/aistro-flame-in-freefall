import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceContentStatusText} from '../public/source-content-status.mjs';
import {sourceReferenceHtml} from '../public/source-reference.mjs';
test('mixed extraction statuses remain separate from partial, blank and rejected originals',()=>{
 const text=sourceContentStatusText({state:'ready',selectedFiles:15,coverage:{fileStatuses:{extracted_unreviewed:2,extracted_literal_stream:5,fallback_extracted_unreviewed:2,partial_literal_stream:1,no_extractable_text:3,excluded_error:1,future_status:1}}});
 assert.match(text,/9 files with extracted text; 1 partially recovered; 3 without extractable text; 1 excluded; 1 with other recorded statuses/);
 assert.match(text,/Coverage remains partial/);assert.match(text,/does not verify scientific meaning/);
});
test('legacy coverage and absent add-on have honest distinct descriptions',()=>{
 assert.match(sourceContentStatusText({state:'ready',selectedFiles:1544,coverage:{fileStatuses:{extracted_unreviewed:974,no_extractable_text:561,excluded_error:9}}}),/974 files with extracted text; 0 partially recovered; 561 without extractable text; 9 excluded/);
 for(const content of [undefined,{state:'invalid'},{state:'missing'}])assert.match(sourceContentStatusText(content),/unavailable.*matching Research_Content.*Reviewed numerical evidence remains available/);
});
test('a recovered prefix stays visibly partial at its original source link',()=>{
 const html=sourceReferenceHtml({fileId:'f19099',name:'data.csv',rowStart:1,rowEnd:3094,partialSource:true,sourceReadScope:'reviewed_prefix_only_before_first_NUL'});
 assert.match(html,/CSV records 1–3094/);assert.match(html,/partial source: recovered prefix only/);assert.match(html,/href="\/api\/files\/f19099"/);
 assert.match(sourceReferenceHtml({fileId:'f19099',partialSource:true,sourceReadScope:'reviewed_prefix_only_before_first_NUL; suffix not parsed or aligned'}),/partial source: recovered prefix only/);
});
test('OpenXML paragraph and slide anchors never masquerade as PDF pages',()=>{
 const html=sourceReferenceHtml({fileId:'f34124',name:'Report.docx',part:'word/document.xml',paragraph:29});
 assert.match(html,/paragraph 29/);assert.match(html,/word\/document.xml/);assert.doesNotMatch(html,/#page=|PDF p\./);
 const slide=sourceReferenceHtml({fileId:'f8',name:'Slides.pptx',part:'ppt\/slides\/slide3.xml',slide:3,paragraph:2});
 assert.match(slide,/slide 3/);assert.match(slide,/paragraph 2/);assert.doesNotMatch(slide,/#page=|PDF p\./);
});
