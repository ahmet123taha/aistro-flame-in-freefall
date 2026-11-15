import {cfigTrial} from './gas-trials.mjs';
import {BASS_CALIBRATION} from './bass-evidence.mjs';
// Adapters only use measured input columns with explicit units. No keyword percentages.
export function parseCsv(text){
 const rows=[];let row=[],value='',quoted=false,line=1,start=1;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else if(c==='\n'){if(quoted)value+=c;else{row.push(value.replace(/\r$/,''));if(row.some(v=>v.trim()))rows.push({cells:row,line:start});row=[];value='';start=line+1;}line++;}else value+=c;}
 if(quoted)throw Error('Unclosed CSV quote');if(value||row.length){row.push(value.replace(/\r$/,''));rows.push({cells:row,line:start});}
 const header=rows.shift()?.cells.map(s=>s.replace(/^\uFEFF/,'').trim())||[];
 return rows.map(r=>({line:r.line,cells:Object.fromEntries(header.map((h,i)=>[h,r.cells[i]?.trim()||'']))}));
}
export const MATERIALS={pmma:'PMMA',sibal:"SIBAL fabric",nomex:'Nomex',kapton:'Kapton',teflon:'PTFE / Teflon',silicone:"Silicone",methanol:"Methanol",heptane:"n-Heptane",dodecane:"n-Dodecane",ethylene:"Ethylene",methane:"Methane",propane:"Propane",propylene:"Propylene",ethane:"Ethane",butane:"Butane (isomer unspecified)",wax:"Japan wax",cotton:"Cotton"};
const materialRules=[['pmma',/\bpmma\b/i],['sibal',/\bsibal\b/i],['nomex',/\bnomex\b/i],['kapton',/\bkapton\b/i],['teflon',/\b(teflon|ptfe)\b/i],['silicone',/\bsilicone\b/i],['methanol',/\bmethanol\b/i],['heptane',/\b(n-)?heptane\b|\bC7H16\b/i],['dodecane',/\b(n-)?dodecane\b|\bC12H26\b/i],['ethylene',/\bethylen[e]?\b|\bC2H4\b/i],['methane',/\bmethane\b|\bCH4\b/i],['propane',/\bpropane\b|\bC3H8\b/i],['propylene',/\bpropylene\b|\bC3H6\b/i],['ethane',/\bethane\b|\bC2H6\b/i],['butane',/\b(?:n-)?butane\b|\bC4H10\b/i],['wax',/Japan Wax/i],['cotton',/\bcotton\b/i]];
export const materialId=text=>{if(/^cotton-fiberglass\s*\(sibal\)$/i.test(String(text).trim()))return 'sibal';if(/\bcotton-fiberglass\b/i.test(String(text)))return null;const found=materialRules.filter(([,pattern])=>pattern.test(text));return found.length===1?found[0][0]:null;};
export function specimenKind(sourceId,label){
 if(['PSI-10','PSI-107','PSI-159'].includes(sourceId))return 'gas';
 if(sourceId==='PSI-69')return 'droplet';
 if(/\b(sphere|ball)\b/i.test(label))return 'sphere';
 if(/\brod\b/i.test(label))return 'rod';
 if(/\bcandle\b/i.test(label))return 'candle';
 if(/\b(film|sheet|slab|fabric|sibal|nomex)\b/i.test(label))return 'sheet';
 return '';
}
function scalar(raw,unit=''){const m=String(raw).trim().match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+))(?:\s*([a-zA-Z/%µ²]+))?$/);if(!m)return null;const n=Number(m[1]);return Number.isFinite(n)&&(!m[2]||m[2].toLowerCase()===unit.toLowerCase())?n:null;}
function lengthMm(raw){const m=String(raw).trim().match(/^((?:\d+(?:\.\d*)?|\.\d+))\s*(mm|cm|microns?|µm)$/i);return m?Number(m[1])*({cm:10,mm:1,micron:.001,microns:.001,'µm':.001}[m[2].toLowerCase()]):null;}
export function normalizeTable(sourceId,file,text,{bassCalibrationVerified=false}={}){
 const records=parseCsv(text),output=[];let rejected=0;
 // The PSI-26 experimental CSV is a sample/run inventory, not a condition table.
 // Its pressure measurements are read separately from the hash-pinned as-run XLSX.
 if(sourceId==='PSI-26')return {rows:[],rejected:0,inputRows:records.length,disposition:'Sample/run inventory only; no numerical condition columns'};
 for(const {cells:c,line} of records){
  const values={},evidence={},normalizationIssues=[],comparisonWarnings=[];let materialLabel='',runId='',flowDirection='',instrumentReadings=null,materialSpecification='',sampleId='',gasTrial=null;
  const put=(key,column,convert=v=>scalar(v),unit='',factor=1)=>{if(!(column in c))return;const parsed=convert(c[column]);if(parsed===null||!Number.isFinite(parsed)||parsed<0)return;const v=parsed*factor;if(['oxygen','co2Percent','fuelPercent'].includes(key)&&v>100)return;if(['pressure','temperatureK','thicknessMm','diameterMm','widthMm','nozzleDiameterMm'].includes(key)&&v===0)return;values[key]=v;evidence[key]={column,raw:c[column],unit,value:v,fileId:file.id,row:line};};
  const mat=column=>{materialLabel=c[column]||'';const id=materialId(materialLabel);if(id){values.material=id;evidence.material={column,raw:materialLabel,value:id,fileId:file.id,row:line};}};
  if(sourceId==='PSI-25'){
   runId=c['Test #'];mat('Fuel Sample Material');put('oxygen','Calibrated  initial O2 % by vol',scalar,"% vol");put('co2Percent','Initial CO2 % by vol',scalar,"% vol");
   const thickness=materialLabel.match(/([\d.]+)\s*microns?/i)||materialLabel.match(/([\d.]+)\s*mm\s*(?:thick|PMMA\s+film)/i);
   if(thickness){const value=Number(thickness[1])*(/micron/i.test(thickness[0])?.001:1);if(value>0){values.thicknessMm=value;evidence.thicknessMm={column:'Fuel Sample Material',raw:materialLabel,value,unit:'mm',fileId:file.id,row:line};}}
   if(evidence.oxygen)evidence.oxygen.basis='whole_trial_initial';
   sampleId=c['Sample #']||'';
   if(/^nomex natural \(nomex iii\)$/i.test(materialLabel.trim()))materialSpecification='nomex-iii-natural';
   // The workbook describes a SPICE centerline location, not every specimen location.
   // Retain an instrument estimate but do not score it as local specimen velocity.
   const air=scalar(c['Air display']);
   instrumentReadings={airDisplay:c['Air display']||null,fanDisplay:c['Fan display']||null,flowRestrictor:c['Flow restrictor']||null,specimenFlowVerified:false};
   if(bassCalibrationVerified&&air!==null&&air>0){
    instrumentReadings.centerlineEstimate={value:air*BASS_CALIBRATION.factor,unit:'cm/s',calibration:{...BASS_CALIBRATION},usableForSpecimenMatching:false,reason:"Equivalence between the specimen position and SPICE centerline calibration position has not been verified."};
   }
   // ISS is not numeric zero g; no residual acceleration is manufactured.
  }else if(['PSI-98','PSI-99','PSI-100'].includes(sourceId)){
   runId=c['Sample Number'];mat('Material');put('airflow','Air Flow (cm/s)',v=>scalar(v,'cm/s'),'cm/s');put('airflow','Air Flow',v=>scalar(v,'cm/s'),'cm/s');
   put('thicknessMm','Sample Thickness (cm)',scalar,'mm',10);put('thicknessMm','Samle Thickness',lengthMm,'mm');put('thicknessMm','Sample Thickness',lengthMm,'mm');
   put('widthMm','Sample Width (cm)',v=>scalar(v,'cm'),'mm',10);put('widthMm','Sample Width',lengthMm,'mm');
   put('oxygen','Percent O2',scalar,"% vol");put('oxygen','Percent O2 (Note 1)',scalar,"% vol");
   if(sourceId==='PSI-99'&&file.id==='f51147'&&file.sha256==='3c24390b9ef86f3d1ebaab911a1a3cc95a8759aebf42062371370e6d4b31b8ac'&&c['Samle Thickness']?.trim()==='037 mm'){
    delete values.thicknessMm;delete evidence.thicknessMm;
    const reason='Source thickness 037 mm is ambiguous in the reviewed Saffire-II CSV. It is excluded from numerical matching; no decimal point is inserted. An earlier design/status table differs and cannot replace the as-run source.';
    normalizationIssues.push({code:'ambiguous_source_thickness',parameter:'thicknessMm',status:'quarantined',raw:c['Samle Thickness'],reason,provenance:{fileId:file.id,sha256:file.sha256,row:line,column:'Samle Thickness'},conflictingDesignSource:{fileId:'f3299',sha256:'6cff0b55b8f1416f5b5b768b7fd22ae31991791ef633865471b72ff19ff4159b',page:3,table:'1',lifecycle:'preflight_design_status_not_asrun'}});
    comparisonWarnings.push(reason);
   }
   flowDirection=(c['Flow Direction']||c.Direction||'').toLowerCase().trim();
  }else if(sourceId==='PSI-101'){
   runId=c['SAME Test #'];mat('Sample Type');put('airflow','Inlet velocity (cm/s)',scalar,'cm/s');
  }else if(sourceId==='PSI-102'){
   runId=c['Sample #'];mat('Sample Material');put('airflow','Air Flow (cm/s)',scalar,'cm/s');
  }else if(sourceId==='PSI-107'){
   runId=[c['GMT date'],c['GMT ignition'],line].join('-');mat('Fuel');put('airflow','Air Rate (cm/s)',scalar,'cm/s');put('nozzleDiameterMm','Nozzle (mm)',scalar,'mm');
  }else if(sourceId==='PSI-69'){
   runId=c['FLEX Test #'];mat('Fuel');put('oxygen','O initial ambient composition; mole fraction',scalar,"% vol",100);put('pressure','Ambient pressure; mmHg',scalar,'kPa',.133322387415);put('diameterMm','Droplet initial diameter; mm',scalar,'mm');
  }else if(sourceId==='PSI-10'&&c['Flame Type']==='Normal'){
   runId=c.Test;mat('Fuel');put('pressure','pinit (atm)',scalar,'kPa',101.325);put('fuelPercent','Xfuel',scalar,'% mol',100);
   // Tad is adiabatic flame temperature, not ambient temperature. XO2 needs column semantics review.
  }else if(sourceId==='PSI-159'){
   runId=c.Test;mat('Fuel');put('pressure','approx p (bar)',scalar,'kPa',100);
   gasTrial=cfigTrial(c,file,line);if(gasTrial){Object.assign(values,gasTrial.values);Object.assign(evidence,gasTrial.evidence);}
   // Approximate pressure is explicitly tagged; never use Peak burner T or Tad as ambient T.
   if(evidence.pressure)evidence.pressure.approximate=true;
  }else{rejected++;continue;}
  if(!runId||!Object.keys(values).some(k=>k!=='material')){rejected++;continue;}
  output.push({...(gasTrial?{gasChemistry:gasTrial.gasChemistry,gasConfiguration:gasTrial.gasConfiguration,gasConfigurationEvidence:gasTrial.gasConfigurationEvidence,gasCompositionRequired:gasTrial.gasCompositionRequired,observations:gasTrial.observations}:{}),sourceId,runId,values,evidence,materialLabel,specimenKind:specimenKind(sourceId,materialLabel),flowDirection,...(normalizationIssues.length?{normalizationIssues,comparisonWarnings}:{}),...(instrumentReadings?{instrumentReadings,sampleId,materialSpecification}:{}),provenance:{fileId:file.id,name:file.name,sha256:file.sha256,row:line}});
 }
 return {rows:output,rejected,inputRows:records.length};
}
