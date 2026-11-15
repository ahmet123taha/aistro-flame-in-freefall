import {figuresForFile,canRegenerate} from '../public/figure-models.mjs';
export function fileKind(name){
 if(/\.pdf$/i.test(name))return 'report';
 if(/\.(csv|tsv|xlsx?|ods)$/i.test(name))return 'table';
 if(/\.(png|jpe?g|gif|webp|svg|tiff?|eps)$/i.test(name))return 'figure';
 if(/\.(txt|md|json|xml|log)$/i.test(name))return 'text';
 return 'other';
}
export function libraryList(files,{accession='',q='',offset=0,kind=''}={},prepared=[]){
 const term=q.toLowerCase().slice(0,200);
 if(kind==='plotted'||kind==='documented'){
  const selected=files.filter(f=>!accession||f.accessions.includes(accession));
  const byId=new Map(selected.map(f=>[f.id,f]));
  const plots=selected.flatMap(f=>figuresForFile(f).filter(p=>kind==='documented'||canRegenerate(p)).map(plot=>({file:f,plot}))).map(({file:{path,...file},plot})=>({...file,kind,selectionId:file.id+':'+kind+':'+plot.id,plot:{id:plot.id,title:plot.title,number:plot.number,model:plot.model,scale:plot.scale},displayName:'Figure '+plot.number+' · '+plot.title,origin:kind==='documented'?'original_source_figure':'published_equation'}));
  for(const graph of prepared){const f=byId.get(graph.sourceId);if(!f||f.sha256!==graph.sourceSha256||graph.kind!==(kind==='plotted'?'generated':'documented'))continue;const {path,...file}=f;plots.push({...file,kind,selectionId:graph.id,preparedGraphId:graph.kind==='generated'?graph.id:undefined,displayName:graph.title,origin:graph.kind==='generated'?'source_table':'original_source_image',caption:graph.caption});}
  const matches=plots.filter(p=>!term||[p.name,p.displayName].join(' ').toLowerCase().includes(term));
  offset=Math.max(0,Number.isFinite(offset)?Math.floor(offset):0);
  return {total:matches.length,offset,items:matches.slice(offset,offset+50)};
 }
 const matches=files.filter(f=>(!accession||f.accessions.includes(accession))&&(!kind||fileKind(f.name)===kind)&&(!term||[f.name,f.category].join(' ').toLowerCase().includes(term)));
 if(kind)matches.sort((a,b)=>priority(b,accession)-priority(a,accession)||a.name.localeCompare(b.name));
 offset=Math.max(0,Number.isFinite(offset)?Math.floor(offset):0);
 return {total:matches.length,offset,items:matches.slice(offset,offset+50).map(({path,...f})=>({...f,kind:fileKind(f.name)}))};
}
function priority(f,id){return (f.name.includes(id+'_')?10:0)+(/summary report/i.test(f.name)?30:0)+(/experimental table/i.test(f.name)?25:0)+(/science documents|rapor_ve_makaleler/i.test(f.name+' '+f.category)?10:0)+(/srd\.pdf$/i.test(f.name)?5:0);}
