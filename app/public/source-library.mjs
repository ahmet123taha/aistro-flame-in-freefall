import {parseDelimited} from './table-preview.mjs';
import {figuresForFile} from './figure-models.mjs';
import {mountFigureReader} from './figure-reader.mjs';
import {mountPdfFlowReader,preserveScroll} from './pdf-flow-reader.mjs';
import {mountPreparedGraph} from './prepared-graph-reader.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=name=>name.replace(/^[a-f0-9]{8,}__/,'');

// Owns only the mounted source tab. Disposal cancels work when the tab changes.
export function mountSourceLibrary(host,sourceId,mode){
 let disposed=false,offset=0,generation=0,listGeneration=0,pdfTask=null,pdf=null,selected=null,figureReader=null,pageReader=null,preparedReader=null;
 const leaveDocumentFlow=enterDocumentFlow(host);
 const controller=new AbortController();
 host.innerHTML=`<section class="source-library"><h3>${mode==='data'?'Local tables and report figures':'Local source documents'}</h3><div class="library-controls"><label>File type<select data-kind><option value="plotted">Generated plots</option><option value="documented">Documented graphs</option><option value="report">PDF reports</option><option value="table">Tables</option><option value="figure">Other image / figure files</option><option value="text">Text documents</option><option value="">All files</option></select></label><label>Find a local file<input data-search placeholder="Report, table or figure name"></label><button data-find>Find</button></div><p data-list-state role="status"></p><div class="library-list" aria-label="Local source files"></div><div class="library-paging"><button data-prev>Previous files</button><span data-count></span><button data-next>Next files</button></div><p data-preview-state role="status"></p><div class="source-preview" tabindex="0" aria-label="Local file viewer"><div class="preview-content"></div></div></section>`;
 const $=s=>host.querySelector(s),viewer=$('.preview-content'),viewport=$('.source-preview'),list=$('.library-list');
 viewport.classList.add('document-flow-preview');
 $('.library-controls').insertAdjacentHTML('beforeend','<button type="button" data-reviewed-graphs hidden>Generated plots</button>');
 $('[data-kind]').value=mode==='data'?'table':'report';
 const status=text=>{if(!disposed)$('[data-preview-state]').textContent=text;};
 const commit=html=>preserveScroll(host,()=>{viewer.style.minHeight=Math.max(0,innerHeight-viewer.getBoundingClientRect().top)+'px';viewer.innerHTML=html;});
 async function get(url){const res=await fetch(url,{signal:controller.signal});const body=await res.json();if(!res.ok)throw Error(body.error||'Local file could not be opened.');return body;}
 async function destroyPdf(){pageReader?.dispose();pageReader=null;figureReader?.dispose();figureReader=null;preparedReader?.dispose();preparedReader=null;const task=pdfTask;pdfTask=null;pdf=null;await task?.destroy().catch(()=>{});}
 async function loadFiles(auto=false){
  const token=++listGeneration;$('[data-list-state]').textContent='Reading the local file index…';list.setAttribute('aria-busy','true');
  try{
   const params=new URLSearchParams({accession:sourceId,kind:$('[data-kind]').value,q:$('[data-search]').value,offset:String(offset)});
   const data=await get('/api/files?'+params);if(disposed||token!==listGeneration)return;
   $('[data-list-state]').textContent='';list.setAttribute('aria-busy','false');
   const oldListTop=list.scrollTop;
   list.innerHTML=data.items.map(f=>`<button class="library-file" data-file="${esc(f.selectionId||f.id)}"><strong>${esc(f.displayName||short(f.name))}</strong><small>${esc(f.kind==='plotted'?'Generated · '+(f.origin==='source_table'?'source table':'published equation'):f.kind==='documented'?'Documented · original source':f.kind)} · ${(f.bytes/1e6).toFixed(2)} MB</small></button>`).join('')||'<p>No local file of this type. Choose another file type.</p>';
   list.scrollTop=oldListTop;
   $('[data-count]').textContent=`${data.total} files · ${data.total?offset+1:0}–${Math.min(offset+50,data.total)}`;
   $('[data-prev]').disabled=offset===0;$('[data-next]').disabled=offset+50>=data.total;
   list.onclick=e=>{const b=e.target.closest('[data-file]');if(b)openFile(data.items.find(f=>(f.selectionId||f.id)===b.dataset.file));};
   if(auto&&data.items.length)await openFile(data.items[0]);
   else if(auto&&!data.items.length&&$('[data-kind]').value==='report'){$('[data-kind]').value='text';await loadFiles(true);}
  }catch(e){if(!disposed&&token===listGeneration){$('[data-list-state]').textContent=e.message;list.setAttribute('aria-busy','false');}}
 }
 async function openFile(file){
  if(!file)return;
  // Keep the document geometry while disposal and asynchronous source reads run.
  // Otherwise clearing the old reader clamps the page scroll before commit can restore it.
  const before=viewer.getBoundingClientRect();viewer.style.minHeight=Math.max(before.height,innerHeight-before.top,0)+'px';
  if(pdf&&figureReader&&selected?.id===file.id&&selected?.kind===file.kind&&file.plot){let changed=false;preserveScroll(host,()=>{changed=figureReader.selectFigure(file.plot.id);});if(changed){selected=file;for(const button of list.querySelectorAll('[data-file]'))button.setAttribute('aria-current',String(button.dataset.file===(file.selectionId||file.id)));status('Opened '+file.displayName);return;}}
  const token=++generation;selected=file;viewer.onclick=null;for(const button of list.querySelectorAll('[data-file]'))button.setAttribute('aria-current',String(button.dataset.file===(file.selectionId||file.id)));await destroyPdf();if(disposed||token!==generation)return;
  status('Verifying and opening the original local file…');
  const url='/api/files/'+file.id;
  try{
   if(file.preparedGraphId){
    const graph=await get('/api/graphs/'+encodeURIComponent(file.preparedGraphId));if(disposed||token!==generation)return;
    commit(fileHeader(file)+'<div data-prepared-graph></div>');preparedReader=mountPreparedGraph(viewer.querySelector('[data-prepared-graph]'),graph);
   }else if(/\.pdf$/i.test(file.name)){
    const pdfjs=await import('/vendor/pdfjs/build/pdf.mjs');if(disposed||token!==generation)return;
    pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/build/pdf.worker.mjs';
    pdfTask=pdfjs.getDocument({url,disableRange:true,disableStream:true,isEvalSupported:false,cMapUrl:'/vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/vendor/pdfjs/standard_fonts/',wasmUrl:'/vendor/pdfjs/wasm/'});
    const opened=await pdfTask.promise;if(disposed||token!==generation)return;pdf=opened;
    const reviewed=figuresForFile(file).length>0;
    commit(fileHeader(file)+(reviewed?'<div data-figure-reader></div>':'')+`<details class="full-report-pages" ${reviewed?'':'open'}><summary>Read full report · ${pdf.numPages} pages</summary><div data-pdf-flow></div></details>`);
    if(reviewed)figureReader=mountFigureReader(viewer.querySelector('[data-figure-reader]'),{file,pdf,initialFigureId:file.plot?.id,plottedOnly:file.kind==='plotted',documentedOnly:file.kind==='documented'});
    const full=viewer.querySelector('.full-report-pages'),showPages=()=>{if(!pageReader)pageReader=mountPdfFlowReader(viewer.querySelector('[data-pdf-flow]'),{pdf,file,status});else pageReader.refresh();};
    full.ontoggle=()=>{if(full.open)showPages();};if(full.open)showPages();
    status('Opened '+short(file.name));
   }else if(/\.(txt|csv|tsv|json|xml|md|log)$/i.test(file.name)){
    const data=await get(url+'/preview');if(disposed||token!==generation)return;
    let html=fileHeader(file);
    if(/\.(csv|tsv)$/i.test(file.name)){
     const parsed=parseDelimited(data.text,/\.tsv$/i.test(file.name)?'\t':',');
     html+=`<p>Original cells; source units and missing entries are preserved. ${data.truncated||parsed.truncated?'Bounded preview (up to 128 KB / 200 data rows); open the original for the full table.':''}</p><div class="table-scroll"><table class="source-table"><tbody>${parsed.rows.map((cells,i)=>'<tr>'+cells.map(c=>`<${i===0?'th':'td'}>${esc(c)}</${i===0?'th':'td'}>`).join('')+'</tr>').join('')}</tbody></table></div>`;
    }else html+=`<h4>Local document text</h4><pre class="local-excerpt">${esc(data.text)||'This source file is empty.'}</pre>${data.truncated?'<p>First 128 KB shown. Open the original for the full document.</p>':''}`;
    commit(html);status('Opened '+short(file.name));
   }else if(/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)){
    commit(fileHeader(file)+(file.kind==='documented'?`<p class="figure-kind">Documented graph · original source image, not generated by AISTRO</p><p>${esc(file.caption)}</p><p>Read the original axes and units. Numerical values have not been extracted from pixels.</p>`:'')+`<img class="source-figure" src="${url}" alt="${esc(file.displayName||short(file.name))}">`);status('Opened '+short(file.name));
   }else commit(fileHeader(file)+'<p>This format opens in its native application. Download the original above. PDF, text, CSV/TSV and common figure images can be viewed here.</p>');
   status('Opened '+short(file.name));
  }catch(e){if(!disposed&&token===generation)status('Could not preview this file: '+e.message);}
 }
 function fileHeader(f){return `<h4>${esc(short(f.name))}</h4><p><a href="/api/files/${esc(f.id)}" target="_blank" rel="noopener">Open / download original</a></p><details><summary>File and source provenance</summary><p>Source: ${esc(sourceId)} · File ID: ${esc(f.id)} · ${f.bytes} bytes</p><pre>SHA-256: ${esc(f.sha256)}</pre></details>`;}
 $('[data-find]').onclick=()=>{offset=0;loadFiles();};$('[data-kind]').onchange=()=>{offset=0;loadFiles(true);};$('[data-search]').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();offset=0;loadFiles();}};
 $('[data-prev]').onclick=()=>{offset=Math.max(0,offset-50);loadFiles();};$('[data-next]').onclick=()=>{offset+=50;loadFiles();};
 loadFiles(true);
 // The shortcut is offered only when the exact report hash has reviewed figures.
 get('/api/files?'+new URLSearchParams({accession:sourceId,kind:'report'})).then(data=>{if(disposed)return;const file=data.items.find(f=>figuresForFile(f).length);if(file){const button=$('[data-reviewed-graphs]');button.hidden=false;button.onclick=async()=>{$('[data-kind]').value='plotted';offset=0;await loadFiles(true);};}}).catch(()=>{});
 return {dispose(){disposed=true;generation++;listGeneration++;controller.abort();destroyPdf();leaveDocumentFlow();}};
}

// Source tabs extend the webpage; the normal research workspace retains its
// independent panels after disposal. Header and side controls remain reachable.
function enterDocumentFlow(host){
 const doc=host.ownerDocument,win=doc.defaultView,main=host.closest('main'),header=doc.querySelector('body>header'),tabs=doc.querySelector('.workspace-strip'),body=doc.body,before=host.getBoundingClientRect().top;
 const setHeader=()=>{body.style.setProperty('--document-header-height',(header?.getBoundingClientRect().height||64)+'px');body.style.setProperty('--document-tabs-height',(tabs?.getBoundingClientRect().height||0)+'px');};setHeader();
 body.classList.add('document-reading');if(main)main.scrollTop=0;
 win.scrollBy(0,host.getBoundingClientRect().top-before);
 const resize=new ResizeObserver(setHeader);if(header)resize.observe(header);if(tabs)resize.observe(tabs);
 return ()=>{const y=win.scrollY;resize.disconnect();body.classList.remove('document-reading');body.style.removeProperty('--document-header-height');body.style.removeProperty('--document-tabs-height');if(main)main.scrollTop=y;};
}
