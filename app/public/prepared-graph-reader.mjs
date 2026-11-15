// Exact table observations only. No resampling, fitted curves or interpolation.
export const MAX_PREPARED_POINTS=100000;
export const PREPARED_GRAPH_NOTICE='Generated plot · reconstructed from source table; not an original source figure';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=value=>typeof value==='string'&&value.trim().length>0;
const raw=value=>typeof value==='string'||typeof value==='number'&&Number.isFinite(value);
const cell=value=>typeof value==='string'&&/^\$?[A-Z]{1,4}\$?[1-9][0-9]*$/i.test(value);
const palette=['#1476b8','#b34c00','#00816d','#8653ad','#ba3459','#657000'];
let sequence=0;

export function validatePreparedGraph(graph){
 const fail=message=>{throw new Error('Prepared graph unavailable: '+message);};
 if(!graph||graph.kind!=='generated'||graph.origin!=='source_table')fail('only reviewed source-table plots are supported.');
 if(!text(graph.id)||!text(graph.title)||typeof graph.caption!=='string'||!Array.isArray(graph.limitations)||graph.limitations.some(x=>typeof x!=='string'))fail('the title, caption or limitations are invalid.');
 if(!graph.source||!text(graph.source.fileId)||!text(graph.source.name)||!text(graph.source.sheet)||!/^[a-f0-9]{64}$/i.test(graph.source.sha256||''))fail('source file, SHA-256 and sheet provenance are required.');
 for(const axis of ['x','y'])if(!graph[axis]||!text(graph[axis].label)||typeof graph[axis].unit!=='string')fail('both axes require a label and a declared unit (empty for dimensionless data).');
 if(graph.connect!==undefined&&typeof graph.connect!=='boolean')fail('the connection setting must be explicit true or false.');
 if(!Array.isArray(graph.series)||!graph.series.length)fail('there are no source series.');
 let count=0;const ids=new Set();
 for(const series of graph.series){
  if(!series||!text(series.id)||ids.has(series.id)||!text(series.label)||!Array.isArray(series.points))fail('series identifiers, labels or points are invalid.');
  ids.add(series.id);
  if(series.xUnit!==undefined&&series.xUnit!==graph.x.unit||series.yUnit!==undefined&&series.yUnit!==graph.y.unit)fail('series with different axis units cannot share this plot.');
  let actual=0;
  // Count separators too: a large gap-only payload must not bypass the bound.
  count+=series.points.length;if(count>MAX_PREPARED_POINTS)fail('more than 100000 points/separators; data were not downsampled.');
  for(const point of series.points){
   if(point===null)continue;
   if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isSafeInteger(point.row)||point.row<1||!cell(point.xCell)||!cell(point.yCell)||!raw(point.xRaw)||!raw(point.yRaw))fail('a source point has nonfinite coordinates or missing row/cell/raw provenance.');
   actual++;
  }
  if(!actual)fail('each series requires at least one actual source point.');
 }
 return graph;
}

export function preparedGraphGeometry(graph){
 validatePreparedGraph(graph);
 const bounds={xMin:Infinity,xMax:-Infinity,yMin:Infinity,yMax:-Infinity};
 for(const series of graph.series)for(const point of series.points)if(point){bounds.xMin=Math.min(bounds.xMin,point.x);bounds.xMax=Math.max(bounds.xMax,point.x);bounds.yMin=Math.min(bounds.yMin,point.y);bounds.yMax=Math.max(bounds.yMax,point.y);}
 const fraction=(value,min,max)=>{if(min===max)return .5;const scale=Math.max(Math.abs(min),Math.abs(max),1);return (value/scale-min/scale)/(max/scale-min/scale);};
 const x=value=>82+650*fraction(value,bounds.xMin,bounds.xMax),y=value=>390-350*fraction(value,bounds.yMin,bounds.yMax);
 return {bounds,x,y,series:graph.series.map((series,seriesIndex)=>({seriesIndex,segments:series.points.reduce((parts,point,pointIndex)=>{if(!point){if(parts.at(-1).length)parts.push([]);}else parts.at(-1).push({seriesIndex,pointIndex,point,x:x(point.x),y:y(point.y)});return parts;},[[]]).filter(part=>part.length)}))};
}

export function nearestPreparedPoint(geometry,x,y,visible){
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 let nearest=null,distance=Infinity;
 for(const series of geometry.series){if(visible&&!visible.has(series.seriesIndex))continue;for(const segment of series.segments)for(const item of segment){const d=Math.hypot(item.x-x,item.y-y);if(d<distance){distance=d;nearest={...item,distance:d};}}}
 return nearest;
}

// Quoting alone does not prevent spreadsheet formula execution. Prefix dangerous
// strings with an apostrophe; original raw values remain unchanged in the reader.
function csvCell(value){let valueText=String(value??'');if(typeof value==='string'&&(/^[\s\u0000-\u001f]*[=+@-]/.test(valueText)||/^[\t\r\n]/.test(valueText)))valueText="'"+valueText;return '"'+valueText.replaceAll('"','""')+'"';}
export function preparedGraphCSV(graph){
 validatePreparedGraph(graph);
 const columns=['graph_id','series_id','series_label','record_type','x','y','x_raw','y_raw','x_unit','y_unit','source_row','x_cell','y_cell','source_file_id','source_name','source_sha256','source_sheet'];
 const rows=[columns];
 for(const series of graph.series)for(const point of series.points)rows.push([graph.id,series.id,series.label,point?'source_point':'gap',point?.x,point?.y,point?.xRaw,point?.yRaw,graph.x.unit,graph.y.unit,point?.row,point?.xCell,point?.yCell,graph.source.fileId,graph.source.name,graph.source.sha256,graph.source.sheet]);
 return rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}

export function mountPreparedGraph(host,graph){
 const doc=host.ownerDocument,win=doc.defaultView;let disposed=false,frame=0,downloadTimer=0,downloadUrl;
 const dispose=()=>{disposed=true;win.cancelAnimationFrame(frame);win.clearTimeout(downloadTimer);if(downloadUrl)win.URL.revokeObjectURL(downloadUrl);host.replaceChildren();};
 let geometry;try{geometry=preparedGraphGeometry(graph);}catch(error){host.innerHTML='<p class="prepared-graph-error" role="alert">'+escape(error.message)+'</p>';return {dispose};}
 const uid='prepared-graph-'+(++sequence),visible=new Set(graph.series.map((_,i)=>i));let selected=null;
 const axisLabel=axis=>axis.label+(axis.unit?' ('+axis.unit+')':'');
 const tick=value=>Number(value.toPrecision(6)).toString();
 const ticks=(min,max)=>min===max?[min]:Array.from({length:5},(_,i)=>min*(1-i/4)+max*(i/4));
 const xTicks=ticks(geometry.bounds.xMin,geometry.bounds.xMax),yTicks=ticks(geometry.bounds.yMin,geometry.bounds.yMax);
 const paths=geometry.series.map((series,i)=>{
  const all=series.segments.flat(),dots=all.map(p=>`M${p.x-2} ${p.y}a2 2 0 1 0 4 0a2 2 0 1 0-4 0`).join('');
  const line=graph.connect===true?series.segments.map(segment=>segment.map((p,j)=>(j?'L':'M')+p.x+' '+p.y).join('')).join(''):'';
  return `<g data-prepared-series="${i}">${line?`<path class="prepared-line" d="${line}" stroke="${palette[i%palette.length]}" stroke-dasharray="${i%2?'5 3':'none'}"/>`:''}<path class="prepared-points" d="${dots}" fill="${palette[i%palette.length]}"/></g>`;
 }).join('');
 host.innerHTML=`<section class="prepared-graph" aria-labelledby="${uid}-title"><h3 id="${uid}-title">${escape(graph.title)}</h3><p class="prepared-graph-notice">${PREPARED_GRAPH_NOTICE}</p><p>${escape(graph.caption)}</p><fieldset class="prepared-graph-legend"><legend>Visible source series</legend>${graph.series.map((s,i)=>`<label><input type="checkbox" data-prepared-toggle="${i}" checked><span class="prepared-swatch" style="background:${palette[i%palette.length]}"></span>${escape(s.label)}</label>`).join('')}</fieldset><svg class="prepared-graph-svg" viewBox="0 0 820 475" role="img" aria-labelledby="${uid}-svg-title ${uid}-svg-desc"><title id="${uid}-svg-title">${escape(graph.title)}</title><desc id="${uid}-svg-desc">Exact source points. ${graph.connect===true?'Straight lines connect adjacent source points; explicit gaps are not bridged.':'Points are not connected.'} No smoothing, fitting or interpolated readouts. Use the point controls below for keyboard access.</desc><rect x="0" y="0" width="820" height="475" fill="white"/>${xTicks.map(v=>`<path class="prepared-grid" d="M${geometry.x(v)} 40V390"/><text x="${geometry.x(v)}" y="412" text-anchor="middle">${escape(tick(v))}</text>`).join('')}${yTicks.map(v=>`<path class="prepared-grid" d="M82 ${geometry.y(v)}H732"/><text x="74" y="${geometry.y(v)+4}" text-anchor="end">${escape(tick(v))}</text>`).join('')}<path class="prepared-axes" d="M82 40V390H732"/>${paths}<circle data-prepared-cursor r="6" fill="none" stroke="#111" stroke-width="2" hidden/><text x="407" y="455" text-anchor="middle">${escape(axisLabel(graph.x))}</text><text transform="translate(20 215) rotate(-90)" text-anchor="middle">${escape(axisLabel(graph.y))}</text></svg><div class="prepared-graph-controls"><label>Source series<select data-prepared-select></select></label><label>Source point number<input data-prepared-number type="number" min="1" step="1" value="1"></label><label>Browse source points<input data-prepared-range type="range" min="1" step="1" value="1"></label><button type="button" data-prepared-export>Download all source points (CSV)</button></div><p data-prepared-status role="status" aria-live="polite"></p><table class="prepared-graph-readout"><caption>Selected actual source point</caption><tbody data-prepared-readout></tbody></table><p class="prepared-graph-method">${graph.connect===true?'Straight lines are visual guides between adjacent observations; gaps remain open.':'Scatter points only.'} No smoothing, interpolation, fitting or downsampling is applied. CSV includes every source point and explicit gap record; spreadsheet-sensitive text is prefixed with an apostrophe for safety.</p><details><summary>Source provenance and limitations</summary><p><a href="/api/files/${encodeURIComponent(graph.source.fileId)}" target="_blank" rel="noopener">${escape(graph.source.name)}</a> · Sheet: ${escape(graph.source.sheet)}</p><p class="prepared-source-hash">SHA-256: ${escape(graph.source.sha256)}</p><ul>${graph.limitations.map(limit=>'<li>'+escape(limit)+'</li>').join('')}</ul></details></section>`;
 const $=selector=>host.querySelector(selector),select=$('[data-prepared-select]'),number=$('[data-prepared-number]'),range=$('[data-prepared-range]'),svg=$('svg');
 const actual=seriesIndex=>geometry.series[seriesIndex].segments.flat();
 function read(item){
  selected=item;const list=actual(item.seriesIndex),position=list.findIndex(p=>p.pointIndex===item.pointIndex)+1,point=item.point;
  select.value=String(item.seriesIndex);number.max=range.max=String(list.length);number.value=range.value=String(position);
  $('[data-prepared-status]').textContent=graph.series[item.seriesIndex].label+' · actual source point '+position+' of '+list.length+' · source row '+point.row;
  const pairs=[['Source row',point.row],[axisLabel(graph.x)+' · raw value',point.xRaw],[axisLabel(graph.y)+' · raw value',point.yRaw],['Numeric x coordinate',point.x],['Numeric y coordinate',point.y],['Source x cell',point.xCell],['Source y cell',point.yCell],['Source file',graph.source.name],['Source sheet',graph.source.sheet]];
  $('[data-prepared-readout]').innerHTML=pairs.map(([key,value])=>'<tr><th scope="row">'+escape(key)+'</th><td>'+escape(value)+'</td></tr>').join('');
  const cursor=$('[data-prepared-cursor]');cursor.removeAttribute('hidden');cursor.setAttribute('cx',item.x);cursor.setAttribute('cy',item.y);
 }
 function updateVisible(){
  select.innerHTML=graph.series.map((s,i)=>visible.has(i)?`<option value="${i}">${escape(s.label)}</option>`:'').join('');
  for(const node of host.querySelectorAll('[data-prepared-series]'))node.style.display=visible.has(Number(node.dataset.preparedSeries))?'':'none';
  select.disabled=number.disabled=range.disabled=!visible.size;
  if(!visible.size){selected=null;$('[data-prepared-cursor]').setAttribute('hidden','');$('[data-prepared-readout]').replaceChildren();$('[data-prepared-status]').textContent='No source series are visible. Enable a series above to inspect its actual points.';return;}
  read(selected&&visible.has(selected.seriesIndex)?selected:actual(visible.values().next().value)[0]);
 }
 for(const toggle of host.querySelectorAll('[data-prepared-toggle]'))toggle.onchange=()=>{const index=Number(toggle.dataset.preparedToggle);toggle.checked?visible.add(index):visible.delete(index);updateVisible();};
 select.onchange=()=>read(actual(Number(select.value))[0]);
 function fromControl(control){const index=Number(control.value);const list=actual(Number(select.value));if(control.value.trim()===''||!Number.isInteger(index)||index<1||index>list.length){$('[data-prepared-status]').textContent='Choose a whole source point number from 1 to '+list.length+'. The previous actual point is retained.';return;}read(list[index-1]);}
 number.oninput=()=>fromControl(number);range.oninput=()=>fromControl(range);
 function atPointer(event){const matrix=svg.getScreenCTM();if(!matrix)return;const p=new win.DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());const nearest=nearestPreparedPoint(geometry,p.x,p.y,visible);if(nearest)read(nearest);}
 svg.onpointermove=event=>{win.cancelAnimationFrame(frame);const point={clientX:event.clientX,clientY:event.clientY};frame=win.requestAnimationFrame(()=>{if(!disposed)atPointer(point);});};
 svg.onclick=atPointer;
 $('[data-prepared-export]').onclick=()=>{if(downloadUrl)win.URL.revokeObjectURL(downloadUrl);downloadUrl=win.URL.createObjectURL(new win.Blob([preparedGraphCSV(graph)],{type:'text/csv;charset=utf-8'}));const anchor=doc.createElement('a');anchor.href=downloadUrl;anchor.download=graph.id.replace(/[^A-Za-z0-9_.-]/g,'_')+'-source-points.csv';anchor.click();win.clearTimeout(downloadTimer);downloadTimer=win.setTimeout(()=>{if(downloadUrl)win.URL.revokeObjectURL(downloadUrl);downloadUrl=undefined;},1000);};
 updateVisible();return {dispose};
}
