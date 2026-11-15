// NASA 20150008961, pages 4 and 8–9. Material-specific illustrative energy balance.
// These are source assumptions, not measured properties of a user's specimen.
export const PMMA_THERMAL_PROFILE=Object.freeze({
 id:'olson-ferkul-2015-pmma-rod',sourcePages:[4,8,9],
 surfaceTemperatureK:573.15,conductivityWcmK:2.09e-3,
 diffusivityCm2S:1.2e-3,densityGcm3:1.19,latentHeatJg:1700,
 emissivity:.85,sigmaWcm2K4:5.729e-12,
 sigmaNote:'Source printed value retained; not substituted with the modern SI constant.',
 sourceIllustrationLengthMm:59,sourceIllustrationPeclet:[0,20],
});

// |dθ/dY| at Y=0; expm1 avoids cancellation near Pe=0.
export function surfaceGradientMagnitude(pe){
 if(!Number.isFinite(pe)||pe<0)return null;
 return pe===0?1:pe/-Math.expm1(-pe);
}

export function rodThermalEvidence(c){
 if(!c.thermalAnalysis)return {status:'not_requested'};
 const p=PMMA_THERMAL_PROFILE,reasons=[];
 if(c.material!=='pmma'||c.materialVariant!=='cast-pmma'||c.specimenKind!=='rod')reasons.push("The model is defined for a cast-PMMA rod.");
 if(c.quasiSteady!==true)reasons.push("The quasi-steady temperature-profile assumption must be verified.");
 if(!Number.isFinite(c.temperatureK)||c.temperatureK<=0||c.temperatureK>=p.surfaceTemperatureK)reasons.push("Ambient temperature must be between 0 K and the assumed surface temperature of 573.15 K.");
 if(!Number.isFinite(c.regressionRateMmS)||c.regressionRateMmS<0)reasons.push("Measured surface regression rate is required; it is not flame-spread velocity.");
 if(!Number.isFinite(c.solidLengthMm)||c.solidLengthMm<=0)reasons.push("The characteristic length between the heated tip and the ambient-temperature boundary is required.");
 if(reasons.length)return {status:'unavailable',reasons,profile:p};
 const lengthCm=c.solidLengthMm/10,velocityCmS=c.regressionRateMmS/10,T=c.temperatureK,S=p.surfaceTemperatureK;
 const pe=lengthCm*velocityCmS/p.diffusivityCm2S;
 if(!Number.isFinite(pe)||pe>20)return {status:'outside_source_illustration',reasons:["Pe > 20; outside the display range of source Figure5. This range is not an experimental validation boundary."],peclet:pe,profile:p};
 const gradient=surfaceGradientMagnitude(pe);
 const conduction=p.conductivityWcmK*(S-T)/lengthCm*gradient;
 const radiation=p.emissivity*p.sigmaWcm2K4*(S**4-T**4);
 const vaporization=p.densityGcm3*velocityCmS*p.latentHeatJg;
 const net=conduction+radiation+vaporization,loss=conduction+radiation;
 // Elasticities are exact local derivatives, not universal parameter weights.
 // E_F=1-Pe/(exp(Pe)-1); series avoids cancellation near zero.
 const eF=pe<1e-4?pe/2-pe*pe/12:1-pe/Math.expm1(pe);
 const sensitivities=[
  {key:'regressionRateMmS',conduction:eF,radiation:0,vaporization:velocityCmS===0?null:1},
  {key:'solidLengthMm',conduction:eF-1,radiation:0,vaporization:0},
  {key:'temperatureK',conduction:-T/(S-T),radiation:-4*T**4/(S**4-T**4),vaporization:0},
 ].map(s=>({...s,net:s.vaporization===null?null:(conduction*s.conduction+radiation*s.radiation+vaporization*s.vaporization)/net}));
 return {status:'calculated',profile:p,inputs:{temperatureK:T,regressionRateMmS:c.regressionRateMmS,solidLengthMm:c.solidLengthMm,quasiSteady:true},peclet:pe,gradientMagnitude:gradient,
  heatFluxWcm2:{conduction,radiation,vaporization,netRequired:net},
  fractions:{conduction:conduction/net,radiation:radiation/net,vaporization:vaporization/net,combinedLoss:loss/net},sensitivities,
  formula:'Pe=L·Vr/α; F=Pe/(1−exp(−Pe)); qc=λs(Ts−T∞)F/L; qr=εσ(Ts⁴−T∞⁴); qv=ρVrLvap; qrequired=qc+qr+qv',
  equilibriumLimit:velocityCmS===0,
  sourceThreshold:{approximateLossFraction:.7,classificationEnabled:false,note:"The source discusses expected extinction near a 70% loss fraction; this is not an independently validated decision threshold."},
  limitation:"The calculation gives net heat flux required by the energy balance; actual flame-supplied flux is not measured. The result is not a burning/extinction classification or similarity score. Constant properties are source assumptions. The displayed Pe range does not establish experimental model validation.",
 };
}
