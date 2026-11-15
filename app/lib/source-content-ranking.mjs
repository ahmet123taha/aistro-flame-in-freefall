// Retrieval-only language features. Returned scientific quotations stay literal.
const STOP=new Set('the and with from this that what which under about into have has were their how does can for are was of to in is as on at by a an or it its be been için veya nasıl olan olarak nedir'.split(' '));
export function sequence(text){return (String(text||'').normalize('NFKC').toLowerCase().replace(/(\p{L})[-\u00ad][\t ]*\r?\n[\t ]*(\p{L})/gu,'$1$2').replace(/\b[A-Z]{1,3}\d+(?==)/gi,'').match(/[\p{L}\p{N}]+/gu)||[]).filter(t=>t.length>1&&!STOP.has(t));}
export function phraseFeatures(quote,request){
 const query=sequence(request.question||request.scenario),source=sequence(quote),queryTerms=new Set(query);
 if(query.length<2)return {exactPhrase:false,longestRun:0,queryWordCount:query.length,minimumSpan:null,bonus:0};
 const sourceText=' '+source.join(' ')+' ',exactPhrase=sourceText.includes(' '+query.join(' ')+' ');let longestRun=0;
 for(let length=Math.min(query.length,8);length>=2;length--){let found=false;for(let i=0;i+length<=query.length;i++)if(sourceText.includes(' '+query.slice(i,i+length).join(' ')+' ')){found=true;break;}if(found){longestRun=length;break;}}
 const occurrences=source.flatMap((word,index)=>queryTerms.has(word)?[{word,index}]:[]),matched=new Set(occurrences.map(o=>o.word)),counts=new Map();let left=0,minimumSpan=Infinity;
 for(let right=0;right<occurrences.length;right++){const word=occurrences[right].word;counts.set(word,(counts.get(word)||0)+1);while(counts.size===matched.size&&matched.size>=2){minimumSpan=Math.min(minimumSpan,occurrences[right].index-occurrences[left].index+1);const old=occurrences[left++].word;if(counts.get(old)===1)counts.delete(old);else counts.set(old,counts.get(old)-1);}}
 const proximity=Number.isFinite(minimumSpan)?matched.size/minimumSpan:0;
 return {exactPhrase,longestRun,queryWordCount:query.length,minimumSpan:Number.isFinite(minimumSpan)?minimumSpan:null,bonus:(exactPhrase?12+query.length:0)+longestRun*longestRun*.65+proximity*2};
}
