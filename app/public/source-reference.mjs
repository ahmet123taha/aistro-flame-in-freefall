const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const positiveInteger=value=>Number.isSafeInteger(value)&&value>0;
const rangeLabel=(start,end,singular,plural)=>positiveInteger(start)&&positiveInteger(end)&&end>=start?(start===end?singular+' '+start:plural+' '+start+'–'+end):null;

// The caller supplies server-derived provenance. This renderer neither invents
// a location nor accepts a remote URL or model-provided file path.
export function sourceReferenceHtml(provenance,{showHash=false}={}){
 if(!provenance||typeof provenance!=='object'||Array.isArray(provenance)||typeof provenance.fileId!=='string'||!/^f\d+$/.test(provenance.fileId))return '';
 const p=provenance,where=[];
 if(positiveInteger(p.page))where.push('PDF p. '+p.page);
 if(positiveInteger(p.slide))where.push('slide '+p.slide);
 if(positiveInteger(p.paragraph))where.push('paragraph '+p.paragraph);
 if(typeof p.sheet==='string'&&p.sheet.trim())where.push(p.sheet);
 if(typeof p.table==='string'&&p.table.trim())where.push('Table '+p.table);
 const xmlRow=positiveInteger(p.xmlRow)?p.xmlRow:p.kind==='docx_table'&&positiveInteger(p.row)?p.row:null;
 const csvRecord=!p.sheet&&/\.(csv|tsv)$/i.test(p.name||''),rowName=p.kind==='docx_table'?'XML row':csvRecord?'CSV record':'row',rowPlural=p.kind==='docx_table'?'XML rows':csvRecord?'CSV records':'rows';
 const rows=rangeLabel(p.rowStart,p.rowEnd,rowName,rowPlural),lines=rangeLabel(p.lineStart,p.lineEnd,'line','lines'),records=rangeLabel(p.recordStart,p.recordEnd,'record','records'),sourceLines=rangeLabel(p.sourceLineStart,p.sourceLineEnd,'source line','source lines');
 if(xmlRow!==null)where.push('XML row '+xmlRow);
 else if(rows)where.push(rows);
 else if(positiveInteger(p.row))where.push(rowName+' '+p.row);
 if(lines)where.push(lines);
 else if(positiveInteger(p.line))where.push('line '+p.line);
 if(records)where.push(records);
 if(sourceLines)where.push(sourceLines);
 if(p.partialRecord===true)where.push('partial record');
 if(p.partialSource===true)where.push(['reviewed_prefix_only_before_first_NUL','reviewed_prefix_only_before_first_NUL; suffix not parsed or aligned'].includes(p.sourceReadScope)?'partial source: recovered prefix only':'partial source');
 if(typeof p.cell==='string'&&p.cell.trim())where.push(p.cell);
 else if(Array.isArray(p.cells)){
  const cells=p.cells.filter(c=>typeof c==='string'&&/^[A-Z]{1,3}[1-9]\d*$/.test(c));
  if(cells.length)where.push(cells.slice(0,6).join(', ')+(cells.length>6?' … ('+cells.length+' cells)':''));
 }
 if(typeof p.column==='string'&&p.column.trim())where.push('column '+p.column);
 if(typeof p.part==='string'&&p.part.trim())where.push(p.part);
 const href='/api/files/'+p.fileId+(positiveInteger(p.page)?'#page='+p.page:'');
 const title=typeof p.name==='string'&&p.name.trim()?' title="'+esc(p.name)+'"':'';
 const hash=showHash&&typeof p.sha256==='string'&&/^[a-f0-9]{64}$/i.test(p.sha256)?'<small>Original SHA256: '+esc(p.sha256)+'</small>':'';
 return '<p class="source-reference"><a href="'+href+'" target="_blank" rel="noopener noreferrer"'+title+'>'+esc([p.fileId,...where].join(' · '))+'</a>'+hash+'</p>';
}
