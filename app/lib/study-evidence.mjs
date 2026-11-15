import {STUDY_EVIDENCE_DATA,STUDY_EVIDENCE_SOURCES as BASE_SOURCES} from './study-evidence-data.mjs';
import {MARGINAL_REVIEW_SOURCES,augmentReviewedStudyEvidence} from './reviewed-normalization-evidence.mjs';
export const STUDY_EVIDENCE_SOURCES=[...new Map([...BASE_SOURCES,...MARGINAL_REVIEW_SOURCES].map(s=>[s.fileId,s])).values()];
export function reviewedStudyEvidence(verifiedFiles){
 const valid=new Set(verifiedFiles.filter(f=>STUDY_EVIDENCE_SOURCES.some(s=>s.fileId===f.id&&s.sha256===f.sha256)).map(f=>f.id));
 const entries=STUDY_EVIDENCE_DATA.filter(e=>valid.has(e.provenance.fileId)).map(e=>({...structuredClone(e),provenance:{...e.provenance,...(e.page?{page:e.page}:{}),...(e.sheet?{sheet:e.sheet,cells:e.cells}:{})}}));
 return augmentReviewedStudyEvidence(entries,verifiedFiles);
}
export function sourceStudyFragments(corpus,sourceId,material=''){
 const entries=(corpus.experiments?.studyEvidence||[]).filter(e=>e.sourceId===sourceId);
 const name=String(material).toLowerCase();
 return entries.sort((a,b)=>Number(b.material===name)-Number(a.material===name));
}
