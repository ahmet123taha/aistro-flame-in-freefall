import {numericCloseness} from './proximity.mjs';

// Absolute half-widths in each parameter's existing unit, not relative errors.
export const NUMERIC_DOMAINS={
 gravityMs2:[0,Infinity],temperatureK:[0,Infinity,true],oxygen:[0,100],
 pressure:[0,Infinity,true],airflow:[0,Infinity],thicknessMm:[0,Infinity,true],
 diameterMm:[0,Infinity,true],widthMm:[0,Infinity,true],nozzleDiameterMm:[0,Infinity,true],
 co2Percent:[0,100],fuelPercent:[0,100],ambientFuelPercent:[0,100],oxidizerOxygenPercent:[0,100],arealDensityMgCm2:[0,Infinity,true],exposedLengthMm:[0,Infinity,true]
};
export function validateNumericUncertainty(raw,conditions){
 if(raw==null)return {};
 if(typeof raw!=='object'||Array.isArray(raw))throw Error("Invalid numerical error bounds.");
 const result={};
 for(const [key,error] of Object.entries(raw)){
  const domain=NUMERIC_DOMAINS[key];
  if(!domain)throw Error("Unknown error-bound parameter: "+key);
  if(error==null||error==='')continue;
  if(typeof error!=='number'||!Number.isFinite(error)||error<0)throw Error(key+": the error bound must be a finite, nonnegative number.");
  const value=conditions[key];
  if(!Number.isFinite(value))throw Error(key+": enter a measurement before its error bound.");
  const lower=value-error,upper=value+error;
  if(!Number.isFinite(upper)||lower<domain[0]||upper>domain[1]||(domain[2]&&lower===0))throw Error(key+": the measurement interval exceeds physical bounds; it is not clipped automatically.");
  result[key]=error;
 }
 return result;
}

// Exact extrema of min(x,y)/max(x,y) over one input interval and a FIXED y.
// For y>0 the maximum is at x=y if included, otherwise at the nearer endpoint.
// For y=0 there is a discontinuity: x=0 ->100, every x>0 ->0.
export function closenessBounds(input,source,error){
 if(!Number.isFinite(error)||error<0||numericCloseness(input,source)===null)return null;
 const lower=input-error,upper=input+error;
 if(lower<0||!Number.isFinite(upper))return null;
 const left=numericCloseness(lower,source),right=numericCloseness(upper,source);
 return {inputMin:lower,inputMax:upper,min:Math.min(left,right),max:lower<=source&&source<=upper?100:Math.max(left,right)};
}

export function aggregateInputUncertainty(contributions,complete){
 const numeric=contributions.filter(c=>c.key!=='material'&&c.weight>0);
 const missing=numeric.filter(c=>!c.inputUncertainty).map(c=>c.key);
 const bounded=numeric.filter(c=>c.inputUncertainty);
 const allComparable=contributions.filter(c=>c.weight>0).every(c=>c.score!==null);
 let range=null;
 if(complete&&allComparable&&!missing.length){
  const fixed=contributions.filter(c=>c.key==='material').reduce((s,c)=>s+(c.points||0),0);
  range={min:fixed+bounded.reduce((s,c)=>s+c.inputUncertainty.min*c.weight/100,0),max:fixed+bounded.reduce((s,c)=>s+c.inputUncertainty.max*c.weight/100,0)};
 }
 return {range,missing,boundedParameters:bounded.length,status:range?'conditional_input_bounds':'incomplete',
  sourceUncertainty:'not_quantified',ranking:'nominal_score_unchanged',
  scope:'Only supplied input error bounds; source nominal values held fixed. Parameter box assumes independently variable inputs, not a probability distribution. Missing errors are unknown, not zero. Not a confidence interval or fire risk.'};
}
