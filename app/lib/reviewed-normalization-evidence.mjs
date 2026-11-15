// Reviewed source additions; no inferred ambient temperature, gravity or scale.
export const NORMALIZATION_REVIEW_SOURCES=Object.freeze([
 {fileId:'f34124',sha256:'434e9b2cade638d63dcb738d3355533db702649eca356c63e9277b1ef8eecac7',purpose:'PSI-26 DOCX Methods and Table I, word/document.xml'},
 {fileId:'f24955',sha256:'850910541fc9c802d00aa9de14758205103642184249b419c09868df2fbea6e8',purpose:'PSI-26 as run matrix, linked pressure and physical trial identity'},
 {fileId:'f36766',sha256:'cc57ad1bd9977aa13e7ac6c3aa618303012686e232b36c052c6a9f1a74e5f528',purpose:'PSI-68 rows2-9 initial droplet diameter marginal range'},
 {fileId:'f51120',sha256:'c01f29c62455f0a3b512290ab85e5687ecded326733189f002f580368402308d',purpose:'PSI-98 raw oxygen range/approximation, percent basis unresolved; unscored'},
 {fileId:'f51147',sha256:'3c24390b9ef86f3d1ebaab911a1a3cc95a8759aebf42062371370e6d4b31b8ac',purpose:'PSI-99 raw037mm quarantine and named SIBAL composite alias'},
]);
const pin=id=>NORMALIZATION_REVIEW_SOURCES.find(s=>s.fileId===id);
export const MARGINAL_REVIEW_SOURCES=Object.freeze([pin('f36766'),pin('f51120')]);

export function augmentReviewedStudyEvidence(entries,verifiedFiles){
 const valid=new Map(verifiedFiles.filter(f=>MARGINAL_REVIEW_SOURCES.some(s=>s.fileId===f.id&&s.sha256===f.sha256)).map(f=>[f.id,f]));
 const result=entries.map(e=>{
  if(e.sourceId!=='PSI-68'||e.provenance.fileId!=='f36766'||e.provenance.sha256!==pin('f36766').sha256||!valid.has('f36766')||e.provenance.row<2||e.provenance.row>9)return e;
  return {...e,parameters:{...e.parameters,diameterMm:{kind:'range',min:1.5,max:5,raw:'1.5 - 5',column:'Initial Droplet Diameter (mm)',sourceUnit:'mm',unit:'mm',basis:'marginal_study_summary',sourceRole:'initial_condition',jointlyTested:false}},text:e.text+' Initial droplet diameter is separately reported as1.5–5mm; this marginal span does not establish all combinations with other settings.'};
 });
 const f=valid.get('f51120');
 if(f)for(const [row,raw,kind,min,max] of [[2,'21.5 - 21.7','range',21.5,21.7],[3,'~ 21.5','approximate',21.5,21.5]]){
  result.push({sourceId:'PSI-98',material:'sibal',parameters:{},scope:'unscored_source_unit_review',
   unscoredParameters:{oxygen:{kind,raw,min,max,column:'Percent O2',sourceUnit:'percent; volume/mole basis not specified in this CSV',status:'fraction_basis_unresolved',approximate:kind==='approximate',usableForNumericalMatching:false}},
   text:'Saffire-I source oxygen: '+raw+' percent O2. The CSV does not explicitly identify volume/mole basis or synchronization. Retained as source context, excluded from numerical proximity pending an original-source basis review; no midpoint or exact value is invented.',
   provenance:{fileId:f.id,name:f.name,sha256:f.sha256,row},jointlyTested:false});
 }
 return result;
}
