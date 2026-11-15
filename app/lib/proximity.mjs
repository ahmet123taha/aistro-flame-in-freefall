// A bounded arithmetic distance, not a probability or combustion response model.
export function numericCloseness(a,b){
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<0)return null;
 if(a===0&&b===0)return 100;
 return 100*Math.min(a,b)/Math.max(a,b);
}
