import {STANDARD_GRAVITY_MS2} from '../public/gravity-input.mjs';

const normalized=text=>String(text).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replaceAll('ı','i');
const fields={temperatureK:{unit:'K',label:/\b(?:temperature|temp|sicaklik|sicakligi)\b/},gravityMs2:{unit:'m/s2',label:/\b(?:gravity|yercekimi|yer cekimi|ivme)\b/},pressure:{unit:'kPa',label:/\b(?:pressure|basinc|basinci)\b/},oxygen:{unit:'%vol',label:/\b(?:oxygen|oksijen|o2)\b/},airflow:{unit:'cm/s',label:/\b(?:airflow|air flow|flow speed|velocity|hava akisi|hava hizi|akis hizi|akis|hiz)\b/},thicknessMm:{unit:'mm',label:/\b(?:thickness|thick|kalinlik|kalinligi)\b/},material:{unit:'text',label:/\b(?:material|malzeme|malzemem|malzemesi)\b/}};
const aliases=[['pmma',/\b(?:pmma|plexiglass|plexiglas|pleksiglas|polymethyl methacrylate)\b/],['fiberglass',/\b(?:fiberglass|glass fibre|glass fiber|cam elyafi|cam elyaf)\b/],['wood',/\b(?:wood|wooden|ahsap|tahta|odun)\b/],['paper',/\b(?:paper|kagit)\b/],['polyethylene',/\b(?:polyethylene|polietilen)\b/],['polypropylene',/\b(?:polypropylene|polipropilen)\b/],['cotton',/\b(?:cotton|pamuk)\b/],['nomex',/\bnomex\b/],['sibal',/\bsibal\b/],['nylon',/\b(?:nylon|naylon)\b/],['polyester',/\bpolyester\b/]];
const number='[+-]?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)(?:e[+-]?\\d+)?';
const measurement=new RegExp(`(${number})\\s*(m\\s*\\/\\s*s(?:²|\\^?2)|cm\\s*\\/\\s*s|m\\s*\\/\\s*s|°\\s*[cfk]|celsius|fahrenheit|kelvin|kpa|pa|bar|atm|mm|cm|%\\s*(?:vol)?|[kcfg])(?=$|[^a-z0-9])`,'gi');
const unsafe=/\b(?:if|suppose|assuming|hypothetical|hypothetically|example|what if|would|could|varsay|varsayalim|ornegin|eger|olsa|olsaydi|olursa|mesela)\b/;
// Mentioning the wish to find a paper is not attribution to that paper.
const attributed=/\b(?:according to|(?:paper|study|article|document|report|source|table)\s+(?:says|reports|states|shows|lists|uses|used|has|measured)|(?:in|from)\s+(?:the\s+)?(?:paper|study|article|document|report|source|table)|makalede|makaleye gore|raporda|kaynakta|tabloda|assistant|chatgpt|asistan)\b|[“”"`]|(?:^|\s)'[^']+'(?:\s|$)/;
const gases=/\b(?:oxygen|oksijen|o2|nitrogen|azot|n2|carbon dioxide|karbondioksit|co2|hydrogen|hidrojen|h2|helium|helyum|he|argon|ar|methane|metan|ch4|propane|propan|fuel|yakit)\b/g;
function nearestLabel(text,start,end,pattern){
 const matches=[...text.matchAll(new RegExp(pattern.source,'g'))];
 return matches.map(m=>({text:m[0],distance:m.index<start?start-(m.index+m[0].length):m.index-end})).filter(m=>m.distance>=0).sort((a,b)=>a.distance-b.distance)[0]?.text||'';
}
const fuels=[['propane',/\b(?:propane|propan)\b/],['methane',/\b(?:methane|metan)\b/],['ethylene',/\b(?:ethylene|etilen)\b/],['propylene',/\b(?:propylene|propilen)\b/],['heptane',/\b(?:n-heptane|heptane|heptan)\b/],['dodecane',/\b(?:n-dodecane|dodecane|dodekan)\b/],['iso-octane',/\b(?:iso-octane|isooctane)\b/],['n-octane',/\bn-octane\b/],['ethanol',/\b(?:ethanol|etanol)\b/],['teflon',/\b(?:teflon|ptfe)\b/]];
const ambiguous=/(?:\d\s*(?:-|–|—|to|ile|\.\.)\s*\d)|(?:[<>≤≥±])|\+\s*\/\s*-|\b(?:between|above|below|under|over|at least|at most|more than|less than|arasi|arasinda|uzerinde|altinda|en az|en fazla)\b/;
const unknown=/\b(?:unknown|unsure|do not know|don't know|bilmiyorum|bilinmiyor|belirsiz)\b/;

/** Only the latest actual user turn is eligible; never scan history or sources. */
export function extractDialogueConditions({question='',trigger,flow}={}){
  const receipt={updates:[],ignored:[]};
  if(trigger==='environment'||flow?.updateResearch===false||typeof question!=='string'||question.length>8000)return receipt;
  // A quoted/reported passage can span commas or clauses. Do not let splitting
  // discard its attribution and turn a cited value into the user's conditions.
  const sentences=question.split(/\.(?=\s+[A-Za-zÇĞİÖŞÜçğıöşü])/);
  const candidates=new Map();
  const put=(key,value,quote,inputValue=null,inputUnit=null,conversion='identity')=>{
    const list=candidates.get(key)||[];list.push({key,value,unit:fields[key].unit,quote,basis:/\b(?:about|approximately|approx|estimate|estimated|roughly|yaklasik|tahmini|tahminen)\b/.test(normalized(quote))?'estimated':'user_reported',...(inputValue===null?{}:{inputValue,inputUnit,conversion})});candidates.set(key,list);
  };
  for(const sentence of sentences){
   if(attributed.test(normalized(sentence))){receipt.ignored.push({quote:sentence.trim(),reason:'quoted_or_reported_context'});continue;}
   for(const raw of sentence.split(/;|\n|,(?=\s*[A-Za-zÇĞİÖŞÜçğıöşü])/)){
    const quote=raw.trim(),text=normalized(quote);
    if(!quote)continue;
    if(unsafe.test(text)||attributed.test(text)||ambiguous.test(text)||/\b(?:or|veya|ya da)\b/.test(text)||(/\b(?:not|degil|degildir)\b/.test(text)&&!unknown.test(text)&&!/\b(?:actually|correction|instead|duzelt|aslinda)\b/.test(text))){
      receipt.ignored.push({quote,reason:'ambiguous_or_noncurrent_statement'});continue;
    }
    if(unknown.test(text)){
      // An explicit current unknown clears the old value; absence alone does not.
      const mentioned=Object.entries(fields).filter(([,f])=>f.label.test(text));
      if(mentioned.length===1&&!new RegExp(number).test(text))put(mentioned[0][0],null,quote);
      else receipt.ignored.push({quote,reason:'ambiguous_unknown_statement'});
      continue;
    }
    for(const [key,field] of Object.entries(fields))if(field.label.test(text)&&(/\b(?:clear|reset|remove)\b/.test(text)||/\b(?:sil|temizle|sifirla)\b/.test(text)))put(key,null,quote);
    if(/\b(?:clear|reset|remove|sil|temizle|sifirla)\b/.test(text))continue;
    if(fields.oxygen.label.test(text))for(const match of text.matchAll(new RegExp(`%\\s*(${number})`,'gi'))){
      const value=Number(match[1].replace(',','.'));
      if(fields.oxygen.label.test(nearestLabel(text,match.index,match.index+match[0].length,gases))&&Number.isFinite(value)&&value>=0&&value<=100)put('oxygen',value,quote,value,'%','identity');
    }
    for(const match of text.matchAll(measurement)){
      const inputValue=Number(match[1].replace(',','.')),unit=match[2].replace(/\s/g,'').replace('°','');
      // Reject a suffix match in a range, exponent, identifier or negative range.
      if(match.index>0&&/[\w.\d-]/.test(text[match.index-1]))continue;
      let key,value,conversion='identity';
      if(['c','celsius','f','fahrenheit','k','kelvin'].includes(unit)){
        const prefix=text.slice(0,match.index);
        if(/\b(?:specimen|sample|surface|flame|burner|ignition|pyrolysis|decomposition|boiling|melting|adiabatic|numune|yuzey|alev|tutusma)\b[^;,.]*$/.test(prefix)&&!/(?:ambient|room|environment|ortam)\s+(?:temperature|sicaklik|sicakligi)?[^;,.]*$/.test(prefix)){
          receipt.ignored.push({key:'temperatureK',quote,reason:'non_ambient_temperature'});continue;
        }
        key='temperatureK';value=unit==='c'||unit==='celsius'?inputValue+273.15:unit==='f'||unit==='fahrenheit'?(inputValue-32)*5/9+273.15:inputValue;
        conversion=['c','celsius'].includes(unit)?'C + 273.15':['f','fahrenheit'].includes(unit)?'(F - 32) * 5/9 + 273.15':'identity';
      }else if(/^m\/s(?:²|\^?2)$/.test(unit)||unit==='g'&&fields.gravityMs2.label.test(text)){
        key='gravityMs2';value=unit==='g'?inputValue*STANDARD_GRAVITY_MS2:inputValue;conversion=unit==='g'?'g * 9.80665':'identity';
      }else if(['pa','kpa','bar','atm'].includes(unit)){
        key='pressure';const factor={pa:.001,kpa:1,bar:100,atm:101.325}[unit];value=inputValue*factor;conversion=factor===1?'identity':`${unit} * ${factor}`;
      }else if(unit.startsWith('%')&&fields.oxygen.label.test(nearestLabel(text,match.index,match.index+match[0].length,gases))){
        key='oxygen';value=inputValue;
      }else if(['cm/s','m/s'].includes(unit)&&fields.airflow.label.test(text)){
        key='airflow';value=inputValue*(unit==='m/s'?100:1);conversion=unit==='m/s'?'m/s * 100':'identity';
      }else if(['mm','cm'].includes(unit)&&fields.thicknessMm.label.test(nearestLabel(text,match.index,match.index+match[0].length,/\b(?:thickness|thick|kalinlik|kalinligi|width|length|diameter|height|genislik|uzunluk|cap)\b/))){
        key='thicknessMm';value=inputValue*(unit==='cm'?10:1);conversion=unit==='cm'?'cm * 10':'identity';
      }
      if(!key)continue;
      const max={temperatureK:10000,gravityMs2:1000,pressure:100000,oxygen:100,airflow:100000,thicknessMm:100000}[key];
      value=Number(value.toPrecision(13));
      if(!Number.isFinite(value)||value<0||value>max||(['temperatureK','pressure','thicknessMm'].includes(key)&&value===0)){receipt.ignored.push({key,quote,reason:'outside_supported_bounds'});continue;}
      put(key,value,quote,inputValue,match[2],conversion);
    }
    const materials=[...aliases,...fuels].filter(([,pattern])=>pattern.test(text));
    const materialIndex=materials.length===1?text.search(materials[0][1]):-1;
    const materialPrefix=materialIndex>=0?text.slice(0,materialIndex).trim():'';
    const assertedMaterial=materialIndex===0||/^[\d.,]+\s*(?:g|kg|mg)\s+of$/.test(materialPrefix)||/^(?:(?:my|the)\s+)?(?:material|malzeme|malzemem|malzemesi)\s*(?::|=|is|olarak)?\s*$/.test(materialPrefix)||/\b(?:i use|i am using|i store|i am storing|i have|we use|we store|we have|kullaniyorum|depoluyorum)\b/.test(text)||/\b(?:material\s*(?::|=|is)|malzemem\b)/.test(text);
    const custom=/\b(?:(?:material|fuel|malzeme|malzemesi|yakit)\s*(?::|=|is\b|olarak\b)|malzemem\b)\s*([a-z0-9][a-z0-9 /%()−-]{1,139}?)(?=\s+(?:at|with|and|ve|temperature|pressure|gravity|sicaklik|basinc|yercekimi)\b|[,;.!?]|$)/.exec(text);
    const qualified=/\b(?:blend|mixture|composite|coated|reinforced|filled|karisim|kompozit|kapli)\b/.test(text)||Boolean(custom?.[1].includes('/'));
    if(custom&&qualified)put('material',custom[1].trim(),quote);
    else if(materials.length===1&&assertedMaterial&&!qualified&&!/\b(?:not|no|degil|degildir)\b/.test(text))put('material',materials[0][0],quote);
    else if(materials.length>1)receipt.ignored.push({key:'material',quote,reason:'multiple_materials'});
    else{
      if(custom&&!/\b(?:unknown|unspecified|none|bilmiyorum|bilinmiyor|nedir|what)\b/.test(custom[1]))put('material',custom[1].trim(),quote);
    }
   }
  }
  for(const [key,list] of candidates){
    // Multiple values in one message remain ambiguous unless separated by an
    // explicit correction marker; never choose an arbitrary range endpoint.
    const distinct=[...new Set(list.map(x=>JSON.stringify(x.value)))];
    const last=list.at(-1);
    const correction=/\b(?:actually|correction|instead|correct|duzelt|duzeltme|aslinda)\b/.test(normalized(last.quote))&&list.filter(x=>x.quote===last.quote).length===1;
    if(distinct.length===1||correction)receipt.updates.push(list.at(-1));
    else receipt.ignored.push({key,reason:'conflicting_values'});
  }
  return receipt;
}

export function applyDialogueConditions(request){
  const receipt=extractDialogueConditions(request),conditions={...request.conditions},conditionBasis={...request.conditionBasis};
  for(const update of receipt.updates){conditions[update.key]=update.value;if(update.value===null)delete conditionBasis[update.key];else conditionBasis[update.key]=update.basis;}
  return {request:{...request,conditions,conditionBasis},receipt};
}
