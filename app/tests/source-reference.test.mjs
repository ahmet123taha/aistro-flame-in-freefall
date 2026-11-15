import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceReferenceHtml} from '../public/source-reference.mjs';
import {researchCards} from '../public/environment-panel.mjs';
import {recommendationHtml} from '../public/recommendations-panel.mjs';
import {attachSourceFragments} from '../lib/research-source-context.mjs';
import {researchContext} from '../lib/research-coverage.mjs';
import {researchEvidence,resolveResearchEvidence} from '../lib/research-evidence.mjs';
import {validateResearch,researchRanking} from '../lib/research.mjs';
import {SCENARIO_CRITERIA} from '../lib/research-scoring.mjs';
const hash='b'.repeat(64);

test('PDF references use a local source route and positive exact page with no default full hash',()=>{
 const html=sourceReferenceHtml({fileId:'f12',page:22,name:'Combustion guide.pdf',sha256:hash});
 assert.match(html,/href="\/api\/files\/f12#page=22"/);assert.match(html,/PDF p\. 22/);assert.match(html,/rel="noopener noreferrer"/);assert.doesNotMatch(html,/Original SHA256/);assert.ok(!html.includes(hash));
});
test('sheet row and cell locations are visible while source labels cannot inject HTML',()=>{
 const html=sourceReferenceHtml({fileId:'f5',sheet:'Tests <img src=x>',row:5,cells:['B5','C5','D5','E5'],name:'" onmouseover="bad'});
 assert.match(html,/row 5/);assert.match(html,/B5, C5, D5, E5/);assert.match(html,/Tests &lt;img src=x&gt;/);assert.doesNotMatch(html,/<img|title="" onmouseover=/);assert.doesNotMatch(html,/#page=/);
});
test('DOCX references identify the named table, XML row and internal document part',()=>{
 const html=sourceReferenceHtml({fileId:'f34124',table:'I',kind:'docx_table',row:7,xmlRow:7,part:'word/document.xml'});
 assert.match(html,/Table I/);assert.match(html,/XML row 7/);assert.match(html,/word\/document\.xml/);assert.match(html,/href="\/api\/files\/f34124"/);assert.doesNotMatch(html,/#page=/);
});
test('malformed file IDs, arbitrary URLs and inferred file paths cannot create links',()=>{
 for(const fileId of ['https://example.test/f7','javascript:alert(1)','../f7','f7?download=1','f7#page=2','MAT-1','F7',7])assert.equal(sourceReferenceHtml({fileId,page:2}), '');
 for(const p of [null,[],{}, {sourceId:'PSI-1',url:'/api/files/f7',path:'f7'}])assert.equal(sourceReferenceHtml(p),'');
});
test('zero, negative, fractional and string pages never become PDF anchors',()=>{
 for(const page of [0,-1,2.5,'22',NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
  const html=sourceReferenceHtml({fileId:'f7',page});assert.match(html,/href="\/api\/files\/f7"/);assert.doesNotMatch(html,/#page=|PDF p\./);
 }
});
test('hashes appear only after explicit opt-in and only for a valid original SHA256',()=>{
 assert.ok(sourceReferenceHtml({fileId:'f7',sha256:hash},{showHash:true}).includes(hash));
 assert.doesNotMatch(sourceReferenceHtml({fileId:'f7',sha256:'<script>bad</script>'},{showHash:true}),/Original SHA256|<script>/);
});
test('a file-only reference does not invent a page or measurement location',()=>{
 const html=sourceReferenceHtml({fileId:'f7'});assert.match(html,/>f7<\/a>/);assert.doesNotMatch(html,/PDF|row|sheet|Table/);
});
test('streamed text, CSV logical records and worksheet ranges keep their explicit units',()=>{
 const text=sourceReferenceHtml({fileId:'f2',lineStart:12,lineEnd:19});assert.match(text,/lines 12–19/);assert.doesNotMatch(text,/bytes/);
 const csv=sourceReferenceHtml({fileId:'f3',name:'source.csv',rowStart:8,rowEnd:14,sourceLineStart:10,sourceLineEnd:20});assert.match(csv,/CSV records 8–14/);assert.match(csv,/source lines 10–20/);
 const sheet=sourceReferenceHtml({fileId:'f4',name:'source.xlsx',sheet:'Tests',rowStart:22,rowEnd:26});assert.match(sheet,/Tests · rows 22–26/);
 const record=sourceReferenceHtml({fileId:'f5',recordStart:2,recordEnd:2,partialRecord:true,segmentStart:0,segmentEnd:400});assert.match(record,/record 2 · partial record/);assert.doesNotMatch(record,/bytes|characters|400/);
});
test('invalid or incomplete ranges do not invent an end location',()=>{
 for(const [start,end] of [[0,3],[-1,3],[9,5],[2,2.5],['2',4],[2,undefined],[2,Infinity]]){
  const html=sourceReferenceHtml({fileId:'f7',lineStart:start,lineEnd:end,rowStart:start,rowEnd:end,recordStart:start,recordEnd:end});assert.doesNotMatch(html,/lines? |rows? |records? /);
 }
});

const passage='The extinguishing stream can entrain surrounding oxygen. The source reports a controlled experiment with limitations on transfer.';
const base={hash:'SOURCE_REFERENCE_TEST',records:[{id:'PSI-1',title:'Test study',content:{approach:'This is metadata context for the controlled material study.'},tableReferences:[]}],experiments:{rows:[],studyEvidence:[]}};
const fragment={id:'C-'+'a'.repeat(24),fileId:'f7',name:'Original report.pdf',sha256:hash,sourceIds:['PSI-1'],location:{page:48,start:720,end:720+passage.length},quote:passage,scope:'literal_extracted_text_not_reviewed_numerical_evidence'};
const request={ids:['PSI-1'],scenario:'Investigate the source experiment for stored material.',question:'Review the source experiment.',conditions:{},flow:{canRank:true,updateResearch:true}};
function fixture({unscored=false,metadata=false}={}){
 const corpus=researchContext(attachSourceFragments(structuredClone(base),{chunks:[fragment],sourceCandidateIds:['PSI-1']}),request);
 const evidence=researchEvidence(corpus,request.ids).find(e=>metadata?e.field==='approach':e.provenance?.fileId==='f7');
 const a={sourceId:'PSI-1',evidenceId:evidence.id,rubric:Object.fromEntries(Object.keys(SCENARIO_CRITERIA).map(k=>[k,.75])),rubricReasons:Object.fromEntries(Object.keys(SCENARIO_CRITERIA).map(k=>[k,'The supplied source partially supports '+k])),reason:'Review the experiment described in this source.',limitation:'The experiment does not establish storage safety.',evidenceProvenance:{fileId:'f999',page:999}};
 if(unscored)delete a.rubricReasons.gravity;
 const input={stage:'rank',summary:'Review the cited experiment.',questions:[],assessments:[a],unknowns:[],conditionSuggestions:[],evidenceGaps:[],recommendations:{action:'keep',items:[]},nextStep:'Inspect the source limitations.',emergency:false};
 const resolved=resolveResearchEvidence(input,corpus,request),analysis=validateResearch(resolved,corpus,request);
 return{corpus,analysis,resolved,ranking:researchRanking(corpus,request,analysis)};
}
test('scored source evidence links its original document inside Why this source',()=>{
 const {corpus,ranking}=fixture(),html=researchCards(ranking,corpus.records);
 assert.ok(html.indexOf('/api/files/f7#page=48')>html.indexOf('<summary>Why this source?</summary>'));
 assert.doesNotMatch(html,/f999|Original SHA256/);
});
test('direct scored validation derives the real literal source anchor and replaces forged provenance',()=>{
 const {corpus,resolved}=fixture();delete resolved.assessments[0].evidenceProvenance;
 const derived=validateResearch(resolved,corpus,request).assessments[0].evidenceProvenance;
 assert.equal(derived.fileId,'f7');assert.equal(derived.page,48);assert.equal(derived.sha256,hash);
 resolved.assessments[0].evidenceProvenance={fileId:'f999',page:999,sha256:'d'.repeat(64)};
 assert.deepEqual(validateResearch(resolved,corpus,request).assessments[0].evidenceProvenance,derived);
});
test('direct scored metadata and unanchored index text discard a forged original-file property',()=>{
 const {corpus,resolved}=fixture({metadata:true});resolved.assessments[0].evidenceProvenance={fileId:'f999',page:999};
 assert.equal(validateResearch(resolved,corpus,request).assessments[0].evidenceProvenance,undefined);
 const indexQuote='This reviewed index summary has no original literal file anchor.';
 const plain=structuredClone(base);plain.records[0].content.fileText=indexQuote;
 const a={...resolved.assessments[0],field:'fileText',quote:indexQuote,evidenceProvenance:{fileId:'f999',page:999}};
 assert.equal(validateResearch({...resolved,assessments:[a]},plain,request).assessments[0].evidenceProvenance,undefined);
});
test('unscored assessment retains server-derived literal provenance and original-file access',()=>{
 const {corpus,analysis,resolved,ranking}=fixture({unscored:true});
 assert.equal(analysis.unscoredAssessments[0].evidenceProvenance.fileId,'f7');assert.equal(analysis.unscoredAssessments[0].evidenceProvenance.page,48);
 const html=researchCards(ranking,corpus.records);assert.match(html,/Score unavailable/);assert.match(html,/\/api\/files\/f7#page=48/);assert.doesNotMatch(html,/f999/);
 resolved.assessments[0].evidenceProvenance={fileId:'f999',page:999};assert.equal(validateResearch(resolved,corpus,request).unscoredAssessments[0].evidenceProvenance.fileId,'f7');
});
test('unscored metadata cannot inherit model-provided original-file provenance',()=>{
 const {analysis,resolved,ranking,corpus}=fixture({unscored:true,metadata:true});
 assert.equal(analysis.unscoredAssessments[0].evidenceProvenance,undefined);assert.doesNotMatch(researchCards(ranking,corpus.records),/\/api\/files\/f999|#page=999/);
 resolved.assessments[0].evidenceProvenance={fileId:'f999',page:999};assert.equal(validateResearch(resolved,corpus,request).unscoredAssessments[0].evidenceProvenance,undefined);
});
test('recommendations reuse the source renderer inside their passage without mutating card state',()=>{
 const item={title:'Review the source arrangement',text:'Compare the tested arrangement.',relevance:'The geometry may differ.',priority:'medium',sourceId:'PSI-1',field:'fileText',quote:passage,limitation:'No validated storage prediction.',evidenceProvenance:{fileId:'f7',page:48,sha256:hash}};
 const state={items:[item],stale:true,emergency:false},before=structuredClone(state),html=recommendationHtml(state);
 assert.ok(html.indexOf('/api/files/f7#page=48')>html.indexOf('<summary>Source passage</summary>'));
 assert.match(html,/Limit:/);assert.deepEqual(state,before);
});
