import {figuresForFile,CURVES,BOUNDARY_EQUATION,canRegenerate,readCurve,curveSamples,curveCSV,xFraction,xAtFraction,cropPixels,curveAtPointer} from './figure-models.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number.isFinite(v)?v.toFixed(4):'—';
const box={left:75,top:30,width:650,height:350};

// This view reads the caller-owned PDF; it never modifies or digitizes source bytes.
export function mountFigureReader(host,{file,pdf,initialFigureId,plottedOnly=false,documentedOnly=false}){
 const figures=figuresForFile(file).filter(f=>!plottedOnly||canRegenerate(f));if(!figures.length)return {dispose(){}};
 let figure=figures.find(f=>f.id===initialFigureId)||figures[0],view=!documentedOnly&&canRegenerate(figure)?'curve':'original',a=10,zoom=1,generation=0,task=null,disposed=false;
 const $=s=>host.querySelector(s);
 host.innerHTML=`<section class="figure-reader"><div class="figure-heading"><h3>Graph reader</h3><span>Reviewed source figures</span></div><div class="figure-toolbar"><label>Graph<select data-figure-select>${figures.map(f=>`<option value="${f.id}">Figure ${f.number} · ${esc(f.title)}</option>`).join('')}</select></label><div class="figure-modes" role="group" aria-label="Graph display"><button type="button" data-view="curve">Calculated curves</button><button type="button" data-view="original">Original graph</button></div></div><p data-fidelity></p><div data-figure-body></div><p class="figure-caption" data-caption></p><details class="figure-provenance"><summary>Figure provenance and reproduction limits</summary><div data-figure-provenance></div></details></section>`;
 function cancel(){generation++;task?.cancel();task=null;}
 function render(){
  cancel();if(disposed)return;
  $('[data-fidelity]').textContent=figure.fidelity;
  $('[data-caption]').textContent=figure.caption;
  $('[data-figure-provenance]').innerHTML=`<p>NASA/TM-20210011385 · Figure ${esc(figure.number)} · PDF page ${figure.page} / printed page ${figure.printedPage}. Crop coordinates are reviewed for this exact report hash.</p><p><a href="/api/files/${esc(file.id)}#page=${figure.page}" target="_blank" rel="noopener">Open original source page</a></p><pre>SHA-256: ${esc(file.sha256)}</pre>`+(canRegenerate(figure)?`<p>${BOUNDARY_EQUATION}; a = (3/2)(U/r)√(r/r₀), U in cm/s, r in cm, r₀ = 0.318 cm.</p><p>The displayed window is 1–150 s⁻¹ and 13–19% O₂. Values come from the rounded published coefficients, not new measurements. No experimental uncertainty, measured point or digitized coordinate is invented. No pressure, temperature or fire-probability inference is made.</p>`:'');
  for(const b of host.querySelectorAll('[data-view]')){b.setAttribute('aria-pressed',String(b.dataset.view===view));b.hidden=documentedOnly&&b.dataset.view==='curve';b.disabled=b.dataset.view==='curve'&&(!canRegenerate(figure)||documentedOnly);}
  if(view==='curve'&&canRegenerate(figure))renderCurve();else renderOriginal();
 }
 function renderCurve(){
  const w=figure.window,x=v=>box.left+box.width*xFraction(v,w,figure.scale),y=v=>box.top+box.height*(w.yMax-v)/(w.yMax-w.yMin);
  const ticks=figure.scale==='log'?[1,2,5,10,20,50,100,150]:[1,25,50,75,100,125,150];
  const samples=curveSamples(figure);const clipId='curve-clip-'+figure.id;
  $('[data-figure-body]').innerHTML=`<p class="figure-kind">Generated plot · reconstructed from a published equation, not an original source graph or measured points</p><fieldset class="figure-legend"><legend>Visible curves</legend>${CURVES.map(c=>`<label><input type="checkbox" data-curve="${c.id}" checked><span class="curve-swatch" style="background:${c.color}"></span>${esc(c.label)}</label>`).join('')}</fieldset><div class="interactive-figure"><div class="plot-tooltip" data-plot-tooltip hidden></div><svg class="curve-svg" viewBox="0 0 780 450" role="img" aria-label="Interactive published PMMA boundary fits, ${figure.scale} stretch axis"><title>Published equations only; experimental points are shown in Original graph</title><defs><clipPath id="${clipId}"><rect x="75" y="30" width="650" height="350"/></clipPath></defs><rect width="780" height="450" fill="white"/>${[13,14,15,16,17,18,19].map(v=>`<path d="M75 ${y(v)}H725" stroke="#dce3e8"/><text x="63" y="${y(v)+5}" text-anchor="end">${v}</text>`).join('')}${ticks.map(v=>`<path d="M${x(v)} 30V380" stroke="#edf0f2"/><text x="${x(v)}" y="405" text-anchor="middle">${v}</text>`).join('')}<path d="M75 30V380H725" fill="none" stroke="#333"/>${CURVES.map(c=>`<path data-curve-path="${c.id}" d="${samples.map((v,i)=>(i?'L':'M')+x(v.a).toFixed(4)+' '+y(v[c.id]).toFixed(4)).join(' ')}" clip-path="url(#${clipId})" stroke="${c.color}" stroke-width="${c.id==='combined'?3:2}" stroke-dasharray="${c.dash}" fill="none"/>`).join('')}<text data-plot-readout x="725" y="20" text-anchor="end"></text><line data-cursor x1="0" x2="0" y1="30" y2="380" stroke="#586a7a" stroke-dasharray="3 4"/><g data-cursor-points>${CURVES.map(c=>`<circle data-cursor-point="${c.id}" r="5" fill="${c.color}" stroke="white" stroke-width="2"/>`).join('')}</g><text x="400" y="438" text-anchor="middle">Normalized stretch a (s⁻¹) · ${figure.scale==='log'?'logarithmic':'linear'} scale</text><text transform="translate(21 208) rotate(-90)" text-anchor="middle">Final oxygen concentration (% vol)</text></svg></div><div class="figure-readout"><label>Read at stretch a (s⁻¹)<input data-read-a type="number" min="1" max="150" step="any" value="${a}" inputmode="decimal"></label><button type="button" data-read>Read value</button><button type="button" data-minimum>Curve minimum</button><button type="button" data-export>Download calculated CSV</button></div><p data-read-status role="status"></p><table class="figure-values"><thead><tr><th>Curve</th><th>Calculated O₂ (% vol)</th></tr></thead><tbody>${CURVES.map(c=>`<tr data-value-row="${c.id}"><th>${esc(c.label)}</th><td data-value="${c.id}"></td></tr>`).join('')}</tbody></table><p class="muted">Move or click on the plot to read the equation, or enter a value directly. Four displayed decimals are calculation digits, not measurement precision. Original measured points remain in Original graph.</p>`;
  const update=value=>{
   const point=readCurve(figure,value);if(!point){$('[data-read-status]').textContent='Enter a stretch value within the reviewed 1–150 s⁻¹ window. The last valid readout is retained.';return;}
   a=value;$('[data-plot-readout]').textContent='a '+n(a)+' s⁻¹ · Boundary '+n(point.combined)+'% O₂';const line=$('[data-cursor]');line.setAttribute('x1',x(a));line.setAttribute('x2',x(a));
   for(const c of CURVES){const p=$(`[data-cursor-point="${c.id}"]`);p.setAttribute('cx',x(a));p.setAttribute('cy',y(point[c.id]));$(`[data-value="${c.id}"]`).textContent=n(point[c.id]);}
   $('[data-read-status]').textContent=`Reading a = ${n(a)} s⁻¹ · published equation values.`;
  };
  const input=$('[data-read-a]');$('[data-read]').onclick=()=>update(input.value.trim()===''?NaN:Number(input.value));input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();update(input.value.trim()===''?NaN:Number(input.value));}};
  $('[data-minimum]').onclick=()=>{a=2*Math.log(3/.0167);input.value=String(a);update(a);};
  $('[data-export]').onclick=()=>download(curveCSV(figure),'text/csv;charset=utf-8',`BASS-II-Figure-${figure.number}-calculated-fits.csv`);
  for(const check of host.querySelectorAll('[data-curve]'))check.onchange=()=>{for(const sel of [`[data-curve-path="${check.dataset.curve}"]`,`[data-cursor-point="${check.dataset.curve}"]`,`[data-value-row="${check.dataset.curve}"]`])$(sel).style.display=check.checked?'':'none';};
  const svg=$('.curve-svg'),tooltip=$('[data-plot-tooltip]');const readPointer=e=>{
   const matrix=svg.getScreenCTM();if(!matrix)return;const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
   if(point.x<75||point.x>725||point.y<30||point.y>380){tooltip.hidden=true;return;}
   const value=xAtFraction((point.x-75)/650,w,figure.scale);input.value=String(Number(value.toPrecision(10)));update(value);
   const visible=[...host.querySelectorAll('[data-curve]:checked')].map(c=>c.dataset.curve),hit=curveAtPointer(figure,value,w.yMax-(point.y-30)/350*(w.yMax-w.yMin),visible);
   tooltip.hidden=!hit;if(hit){tooltip.textContent=hit.label+'\na = '+n(hit.x)+' s⁻¹\nO₂ = '+n(hit.y)+' % vol\nCalculated source equation';const rect=svg.getBoundingClientRect();tooltip.style.left=Math.max(0,Math.min(rect.width-240,e.clientX-rect.left+12))+'px';tooltip.style.top=Math.max(0,e.clientY-rect.top-80)+'px';}
  };svg.onpointermove=readPointer;svg.onclick=readPointer;svg.onpointerleave=()=>{tooltip.hidden=true;};update(a);
 }
 async function renderOriginal(){
  const token=generation;
  $('[data-figure-body]').innerHTML='<p class="figure-kind">Documented graph · original source image, not generated by AISTRO</p><div class="original-figure-controls"><button type="button" data-original-out>Zoom out</button><button type="button" data-original-in>Zoom in</button><button type="button" data-save-image disabled>Download graph PNG</button><span data-original-status role="status">Rendering source crop…</span></div><div class="original-figure-wrap"></div>';
  const draw=async()=>{
   task?.cancel();const drawToken=++generation;const status=$('[data-original-status]');$('[data-save-image]').disabled=true;status.textContent='Rendering source crop…';
   try{const p=await pdf.getPage(figure.page);if(disposed||drawToken!==generation)return;
    const viewport=p.getViewport({scale:6}),crop=cropPixels(figure.crop,viewport.width,viewport.height),canvas=document.createElement('canvas');canvas.className='original-graph';canvas.setAttribute('aria-label','Original graph cropped from source PDF');$('.original-figure-wrap').replaceChildren(canvas);$('.original-figure-wrap').style.maxHeight=zoom>1?'75vh':'none';
    canvas.width=crop.width;canvas.height=crop.height;canvas.style.width=(100*zoom)+'%';canvas.style.maxWidth='none';
    task=p.render({canvasContext:canvas.getContext('2d'),viewport,transform:[1,0,0,1,-crop.left,-crop.top],background:'white'});await task.promise;
    if(!disposed&&drawToken===generation){status.textContent=`Figure ${figure.number} · original crop · ${Math.round(zoom*100)}% view`;$('[data-save-image]').disabled=false;}
   }catch(e){if(!disposed&&drawToken===generation&&e.name!=='RenderingCancelledException')status.textContent='Original figure could not be rendered: '+e.message;}
  };
  $('[data-original-in]').onclick=()=>{zoom=Math.min(3,zoom+.25);draw();};$('[data-original-out]').onclick=()=>{zoom=Math.max(.5,zoom-.25);draw();};
  $('[data-save-image]').onclick=()=>{const canvas=$('.original-graph'),number=figure.number;if(!canvas?.width||!canvas.height)return;canvas.toBlob(blob=>{if(blob&&!disposed)download(blob,'image/png',`BASS-II-Figure-${number}-original-crop.png`);});};
  if(token===generation)await draw();
 }
 function download(content,type,name){const url=URL.createObjectURL(content instanceof Blob?content:new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function selectFigure(id){const next=figures.find(f=>f.id===id);if(!next||disposed)return false;figure=next;$('[data-figure-select]').value=id;a=10;zoom=1;view=!documentedOnly&&canRegenerate(figure)?'curve':'original';render();return true;}
 $('[data-figure-select]').onchange=e=>selectFigure(e.target.value);
 for(const b of host.querySelectorAll('[data-view]'))b.onclick=()=>{if(b.dataset.view==='curve'&&!canRegenerate(figure))return;view=b.dataset.view;render();};
 $('[data-figure-select]').value=figure.id;
 render();return {selectFigure,dispose(){disposed=true;cancel();host.replaceChildren();}};
}
