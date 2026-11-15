import {numericCloseness} from './proximity.mjs';
import {rodThermalEvidence} from './pmma-thermal.mjs';
export const PMMA_ROD_SOURCE=Object.freeze({
 fileId:'f45',sha256:'8cee8a023d9f0aab214996ebaeefb842080b0c935ba9e01db0096a47379519f7',
 page:7,table:'1',contextPages:[2,3,4,6,7,8,9],url:'https://ntrs.nasa.gov/citations/20150008961',
 title:'Microgravity Flammability of PMMA Rods in Concurrent Flow',year:2015,
});
export const PHYSICAL_METHODS=['pmma-rod-forced','pmma-rod-total'];
export function pmmaRodReferences(file){
 if(file?.id!==PMMA_ROD_SOURCE.fileId||file.sha256!==PMMA_ROD_SOURCE.sha256)return [];
 return [[.318,2.36,3.63,5.99],[.476,3.46,4.62,8.08],[.635,3.31,5.38,8.68]].map(([radiusCm,forced,curvature,total],i)=>({
  sourceId:'PSI-25',runId:'PMMA-Figure2-'+String.fromCharCode(97+i),materialLabel:"Cast-PMMA rod · approximately hemispherical tip",specimenKind:'rod',flowDirection:'concurrent',materialVariant:'cast-pmma',gravityRegime:'microgravity',tipShape:'hemispherical',
  values:{material:'pmma',rodDiameterMm:radiusCm*20,forcedStretch:forced,curvatureStretch:curvature,totalStretch:total},
  evidence:{rodDiameterMm:{column:'Rod radius, cm',raw:String(radiusCm),unit:'mm',value:radiusCm*20,fileId:file.id,page:7,table:'1',row:i+1,note:"Diameter=2×radius; cm→mm. Source rounding is preserved."}},
  provenance:{...PMMA_ROD_SOURCE,name:file.name,kind:'pdf_table',printedPage:7,row:i+1},
  physicalReference:{reported:true,figure:'2',phase:'near_quenching_limit',oxygen:null,airflow:null,note:"Table1 contains the authors’ stretch estimates. Oxygen and raw flow are absent; they are not back-calculated and presented as measurements. The total column retains source rounding."},
 }));
}
// U in cm/s, D and flame radius in mm. a_f=(3/2)U/R =30U/D [s^-1].
// a_curv=2*a_f*(R_flame/R-1); a_total=a_f+a_curv.
export function rodStretch({airflow:U,rodDiameterMm:D,flameRadiusMm:F},total=false){
 if(!Number.isFinite(U)||!Number.isFinite(D)||U<=0||D<=0)return null;
 const R=D/2,forced=30*U/D;
 if(!total)return {value:forced,forced,curvature:null,total:null,unit:'s⁻¹',elasticities:{airflow:1,rodDiameterMm:-1}};
 if(!Number.isFinite(F)||F<=R)return null;
 const curvature=2*forced*(F/R-1),value=forced+curvature,den=F-.5*R;
 return {value,forced,curvature,total:value,unit:'s⁻¹',elasticities:{airflow:1,rodDiameterMm:-2-.5*R/den,flameRadiusMm:F/den}};
}
export function rodApplicability(c,method){
 const reasons=[];
 if(c.material!=='pmma')reasons.push("Select PMMA material.");
 if(c.materialVariant!=='cast-pmma')reasons.push("The source uses cast PMMA; specify the manufacturing type.");
 if(c.specimenKind!=='rod')reasons.push("Select a solid rod specimen.");
 if(c.tipShape!=='hemispherical')reasons.push("Approximately hemispherical tip geometry is required.");
 if(c.flowDirection!=='concurrent')reasons.push("Flow and flame spread must be concurrent.");
 if(c.gravityRegime!=='microgravity')reasons.push("The source concerns microgravity; specify the gravity regime.");
 if(c.gravityMs2!=null&&c.gravityMs2!==0)reasons.push("This microgravity model has not been validated for the entered positive gravitational acceleration.");
 if(!(c.rodDiameterMm>=6.35&&c.rodDiameterMm<=12.7))reasons.push("Diameter must lie within the source-tested 6.35–12.7 mm range.");
 if(!Number.isFinite(c.airflow)||c.airflow<=0)reasons.push("A positive flow velocity is required.");
 if(method==='pmma-rod-total'&&(!Number.isFinite(c.flameRadiusMm)||c.flameRadiusMm<=c.rodDiameterMm/2))reasons.push("Measured flame radius must exceed rod radius; it is not invented.");
 return {applicable:reasons.length===0,reasons,scope:"Stretch comparison within source geometry, not a complete flammability or extinction model. Intermediate diameters require additional experimental validation."};
}
export function physicalMatch(corpus,request){
 const c=request.conditions,method=request.method,total=method==='pmma-rod-total';
 const applicability=rodApplicability(c,method),referenceRows=(corpus.experiments?.physicalRows||[]).filter(r=>request.ids.includes(r.sourceId));
 if(!referenceRows.length)applicability.reasons.push("No verified PMMA stretch reference is available among the selected sources.");
 applicability.applicable&&=referenceRows.length>0;
 const model=applicability.applicable?rodStretch(c,total):null;
 const parameter=total?'totalStretch':'forcedStretch',label=total?'Toplam gerinim':"Forced-flow stretch";
 const matches=model?referenceRows.map(row=>{
  const value=row.values[parameter],score=numericCloseness(model.value,value);
  const magnitude=Object.values(model.elasticities).reduce((n,v)=>n+Math.abs(v),0);
  const experiment={...row,contributions:[{key:parameter,label,unit:'s⁻¹',input:model.value,observed:value,weight:100,score,points:score,evidence:{column:total?'a = af + acurv':'af = 3/2 U/R',raw:String(value),...PMMA_ROD_SOURCE},status:'compared'},{key:'rodDiameterMm',label:"Rod diameter",unit:'mm',input:c.rodDiameterMm,observed:row.values.rodDiameterMm,weight:0,score:numericCloseness(c.rodDiameterMm,row.values.rodDiameterMm),points:0,evidence:row.evidence.rodDiameterMm,status:'compared'}],materialCompatible:true,specimenCompatible:true,weightTotal:100,comparableWeight:100,knownPoints:score,similarity:score,complete:true,weightedParameters:1,comparedParameters:2,
   physics:{method,label,formula:total?'a=30U/D × (4Rf/D−1)':'af=30U/D',input:c,calculated:model,source:{...PMMA_ROD_SOURCE},sensitivity:Object.entries(model.elasticities).map(([key,elasticity])=>({key,elasticity,relativeSensitivityPercent:100*Math.abs(elasticity)/magnitude})),
    limitation:"This percentage is stretch closeness only. Equivalence of oxygen and thermal state is unknown; it is not a combustion probability or critical-risk score. Local sensitivity shares are not risk weights.",
    thermal:rodThermalEvidence(c),
    diameterDifferent:Math.abs(c.rodDiameterMm-row.values.rodDiameterMm)>1e-9,
    curvatureOmitted:!total,rangeValidation:'Only three representative source estimates; no independent generalization validation.'}};
  return {id:row.sourceId,experimentId:row.runId,experiment,similarity:score,evidenceType:'physical_feature',sourceRows:[row.provenance.fileId+':Table1:'+row.provenance.row],reasonTags:[label+' %'+score.toFixed(1)],level:'physical_feature'};
 }).sort((a,b)=>b.similarity-a.similarity).slice(0,1):[];
 return {mode:'numeric_conditions',matches,datasetHash:corpus.hash,aiRecommendations:[],numericComparisonAvailable:matches.length>0,weightTotal:100,weightConfigurationComplete:true,weights:{[parameter]:100},normalization:corpus.experiments?.summary||{},method:{id:method,scientificallyCalibrated:false,weightOrigin:'single_physical_feature_not_risk',formula:model?matches[0]?.experiment.physics.formula:null},applicability,limitation:"Comparison of a source-equation-derived feature, not an extinction/combustion boundary or general risk model."};
}
