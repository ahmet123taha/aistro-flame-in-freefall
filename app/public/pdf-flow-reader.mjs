// Continuous original-PDF reading. Page shells retain geometry while offscreen
// canvases are released; source pages are never reconstructed from extracted text.
const MAX_CANVASES=6,MAX_RENDERING=2,MAX_PIXELS=4_000_000;
export const clampPage=(value,total)=>Math.max(1,Math.min(total,Math.floor(Number(value)||1)));
export function renderScale(width,height,deviceScale=1){return Math.min(Math.max(1,deviceScale),Math.sqrt(MAX_PIXELS/(width*height)),8192/Math.max(width,height));}
export function preserveScroll(host,action){
 const win=host.ownerDocument.defaultView,positions=[];
 for(let node=host.parentElement;node;node=node.parentElement)if(node.scrollHeight>node.clientHeight||node.scrollWidth>node.clientWidth)positions.push([node,node.scrollTop,node.scrollLeft]);
 const x=win.scrollX,y=win.scrollY;action();
 for(const [node,top,left] of positions){node.scrollTop=top;node.scrollLeft=left;}win.scrollTo(x,y);
}
export function mountPdfFlowReader(host,{pdf,file,status=()=>{}}){
 const doc=host.ownerDocument,win=doc.defaultView,total=pdf.numPages;
 let disposed=false,zoom=1,epoch=0,active=0,current=1,tick=0,resizeTimer=0,firstSize={width:612,height:792},observer=null,resize=null,lastWidth=0;
 const tasks=new Set(),records=[],queue=new Set(),$=selector=>host.querySelector(selector);
 host.innerHTML=`<div class="pdf-flow-controls"><label>Page <input data-flow-page type="number" min="1" max="${total}" value="1" aria-label="Go to PDF page"></label><button type="button" data-flow-go>Go</button><span>of ${total}</span><span class="pdf-flow-zoom"><button type="button" data-flow-out aria-label="Zoom out">−</button><output data-flow-zoom>100%</output><button type="button" data-flow-in aria-label="Zoom in">+</button><button type="button" data-flow-fit>Fit width</button></span></div><p class="muted">Scroll to read every original page. Pages load as you reach them; text and source links stay with their page.</p><div class="pdf-page-flow" aria-label="Continuous original PDF pages"></div>`;
 const flow=$('.pdf-page-flow');
 function viewport(){return {top:0,bottom:win.innerHeight,height:win.innerHeight};}
 function size(record){const unit=record.unit||firstSize,width=Math.max(180,host.clientWidth-16)*zoom;return {width,height:width*unit.height/unit.width};}
 function setSize(record){const box=size(record);record.surface.style.width=box.width+'px';record.surface.style.height=box.height+'px';}
 function visibleDistance(record){const box=record.shell.getBoundingClientRect(),view=viewport();return box.bottom<view.top?view.top-box.bottom:box.top>view.bottom?box.top-view.bottom:0;}
 function currentRecord(){return records.find(r=>r.shell.getBoundingClientRect().bottom>90)||records.at(-1);}
 function release(record){record.task?.cancel();record.task=null;if(record.canvas){record.canvas.width=record.canvas.height=0;record.canvas.remove();record.canvas=null;}record.links.replaceChildren();record.state='idle';delete record.shell.dataset.renderError;record.retry.hidden=true;record.label.hidden=false;record.label.textContent='Page '+record.number+' · loads while scrolling';record.label.removeAttribute('title');}
 function trim(){const painted=records.filter(r=>r.canvas);painted.sort((a,b)=>visibleDistance(a)-visibleDistance(b));for(const record of painted.slice(MAX_CANVASES))release(record);}
 function schedule(){if(disposed||tick)return;tick=win.requestAnimationFrame(()=>{tick=0;if(disposed||!host.getClientRects().length)return;const near=records.filter(r=>visibleDistance(r)<win.innerHeight).sort((a,b)=>visibleDistance(a)-visibleDistance(b));for(const record of near.slice(0,MAX_CANVASES))if(record.state==='idle')queue.add(record);const now=currentRecord();if(now){current=now.number;if(doc.activeElement!==$('[data-flow-page]'))$('[data-flow-page]').value=current;}trim();pump();});}
 async function linkTarget(destination){if(typeof destination==='string')destination=await pdf.getDestination(destination);if(!Array.isArray(destination))return null;const ref=destination[0];return typeof ref==='number'?ref+1:(await pdf.getPageIndex(ref))+1;}
 async function addLinks(record,page,pageViewport,token){
  let annotations=[];try{annotations=await page.getAnnotations({intent:'display'});}catch{return;}
  if(disposed||token!==epoch||!record.canvas)return;
  for(const annotation of annotations){if(annotation.subtype!=='Link'||!annotation.rect)continue;
   const rect=[...pageViewport.convertToViewportPoint(annotation.rect[0],annotation.rect[1]),...pageViewport.convertToViewportPoint(annotation.rect[2],annotation.rect[3])],link=doc.createElement('a');
   if(annotation.url&&/^https?:\/\//i.test(annotation.url)){link.href=annotation.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Open PDF link: '+annotation.url);}
   else if(annotation.dest){link.href='/api/files/'+encodeURIComponent(file.id);link.setAttribute('aria-label','Follow link within this PDF');link.onclick=async e=>{e.preventDefault();try{const number=await linkTarget(annotation.dest);if(!disposed&&token===epoch&&number)jump(number);}catch{status('This internal PDF link could not be resolved. Open the original to inspect it.');}};}
   else continue;
   Object.assign(link.style,{left:Math.min(rect[0],rect[2])+'px',top:Math.min(rect[1],rect[3])+'px',width:Math.abs(rect[2]-rect[0])+'px',height:Math.abs(rect[3]-rect[1])+'px'});record.links.append(link);
  }
 }
 async function draw(record){
  active++;record.state='rendering';const token=epoch;record.label.textContent='Rendering page '+record.number+'…';
  try{
   const page=await pdf.getPage(record.number);if(disposed||token!==epoch)return;
   const unit=page.getViewport({scale:1});record.unit=unit;const anchor=currentRecord(),before=anchor?.shell.getBoundingClientRect().top;
   setSize(record);if(anchor&&record.number<anchor.number)win.scrollBy(0,anchor.shell.getBoundingClientRect().top-before);
   const box=size(record),pageViewport=page.getViewport({scale:box.width/unit.width}),ratio=renderScale(pageViewport.width,pageViewport.height,win.devicePixelRatio||1),canvas=doc.createElement('canvas');
   const retained=records.filter(r=>r.canvas&&r!==record).sort((a,b)=>visibleDistance(a)-visibleDistance(b));for(const old of retained.slice(MAX_CANVASES-1))release(old);
   canvas.className='pdf-page-canvas';canvas.setAttribute('aria-label','Original PDF page '+record.number);canvas.width=Math.ceil(pageViewport.width*ratio);canvas.height=Math.ceil(pageViewport.height*ratio);canvas.style.width=pageViewport.width+'px';canvas.style.height=pageViewport.height+'px';record.canvas=canvas;record.surface.prepend(canvas);
   const task=page.render({canvasContext:canvas.getContext('2d'),viewport:pageViewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0],background:'white'});record.task=task;tasks.add(task);
   try{await task.promise;}finally{tasks.delete(task);if(record.task===task)record.task=null;}
   if(disposed||token!==epoch)return;record.state='ready';record.label.hidden=true;await addLinks(record,page,pageViewport,token);
  }catch(error){if(!disposed&&token===epoch&&error.name!=='RenderingCancelledException'){record.state='error';record.shell.dataset.renderError=error.message;record.label.hidden=false;record.label.textContent='Page '+record.number+' could not be rendered. Use the original-page link or retry.';record.label.title=error.message;record.retry.hidden=false;}}
  finally{active--;trim();pump();}
 }
 function pump(){if(disposed)return;const pending=[...queue].filter(r=>r.state==='idle'&&visibleDistance(r)<win.innerHeight*1.5).sort((a,b)=>visibleDistance(a)-visibleDistance(b));queue.clear();for(const record of pending){if(active<MAX_RENDERING)void draw(record);else queue.add(record);}}
 function jump(value){const number=clampPage(value,total),record=records[number-1];if(!record)return;record.shell.scrollIntoView({block:'start',behavior:'instant'});current=number;$('[data-flow-page]').value=number;schedule();}
 function rescale(value){if(disposed||!records.length||host.clientWidth<1)return;const anchor=currentRecord(),before=anchor.shell.getBoundingClientRect().top,oldHeight=anchor.shell.getBoundingClientRect().height,fraction=oldHeight?Math.max(0,-before/oldHeight):0;zoom=Math.max(.6,Math.min(2.5,value));epoch++;queue.clear();for(const task of tasks)task.cancel();for(const record of records){release(record);setSize(record);}const after=anchor.shell.getBoundingClientRect(),target=before<0?-fraction*after.height:before;win.scrollBy(0,after.top-target);$('[data-flow-zoom]').textContent=Math.round(zoom*100)+'%';$('[data-flow-out]').disabled=zoom<=.6;$('[data-flow-in]').disabled=zoom>=2.5;schedule();}
 async function initialize(){
  try{const first=await pdf.getPage(1);if(disposed)return;firstSize=first.getViewport({scale:1});}catch(error){if(!disposed)status('Could not read PDF page size: '+error.message);}
  if(disposed)return;
  const fragment=doc.createDocumentFragment();
  for(let number=1;number<=total;number++){
   const shell=doc.createElement('section');shell.className='pdf-flow-page';shell.dataset.pdfPage=number;shell.setAttribute('aria-label','PDF page '+number+' of '+total);
   shell.innerHTML=`<div class="pdf-page-heading"><strong>Page ${number} <span>/ ${total}</span></strong><a href="/api/files/${encodeURIComponent(file.id)}#page=${number}" target="_blank" rel="noopener">Original page ↗</a></div><div class="pdf-flow-surface-wrap"><div class="pdf-flow-surface"><span class="pdf-page-placeholder">Page ${number} · loads while scrolling</span><div class="pdf-page-links"></div></div></div><button type="button" class="pdf-page-retry" hidden>Retry page</button><details class="pdf-page-text"><summary>Extractable text · page ${number}</summary><pre class="local-excerpt">Open to read this page’s text.</pre></details>`;
   const record={number,shell,surface:shell.querySelector('.pdf-flow-surface'),label:shell.querySelector('.pdf-page-placeholder'),links:shell.querySelector('.pdf-page-links'),retry:shell.querySelector('.pdf-page-retry'),state:'idle',canvas:null,task:null,unit:null};records.push(record);setSize(record);fragment.append(shell);
   record.retry.onclick=()=>{record.retry.hidden=true;release(record);queue.add(record);pump();};
   const textDetails=shell.querySelector('.pdf-page-text');textDetails.ontoggle=async()=>{if(!textDetails.open||textDetails.dataset.loaded)return;textDetails.dataset.loaded='loading';const pre=textDetails.querySelector('pre');pre.textContent='Reading original page text…';try{const page=await pdf.getPage(number),text=await page.getTextContent();if(disposed)return;pre.textContent=text.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('').trim()||'No extractable text on this page. Read the original page above; OCR is not applied.';textDetails.dataset.loaded='true';}catch{if(!disposed){pre.textContent='Text could not be extracted. Read the original page above.';delete textDetails.dataset.loaded;}}};
  }
  preserveScroll(host,()=>flow.append(fragment));
  observer=new IntersectionObserver(schedule,{rootMargin:'100% 0px'});for(const record of records)observer.observe(record.shell);
  lastWidth=host.clientWidth;resize=new ResizeObserver(()=>{if(host.clientWidth>0&&Math.abs(host.clientWidth-lastWidth)>2){lastWidth=host.clientWidth;win.clearTimeout(resizeTimer);resizeTimer=win.setTimeout(()=>rescale(zoom),100);}});resize.observe(host);schedule();
 }
 $('[data-flow-go]').onclick=()=>jump($('[data-flow-page]').value);$('[data-flow-page]').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jump(e.target.value);}};
 $('[data-flow-in]').onclick=()=>rescale(zoom+.2);$('[data-flow-out]').onclick=()=>rescale(zoom-.2);$('[data-flow-fit]').onclick=()=>rescale(1);
 win.addEventListener('scroll',schedule,{passive:true});void initialize();
 return {jump,refresh:schedule,dispose(){disposed=true;epoch++;win.cancelAnimationFrame(tick);win.clearTimeout(resizeTimer);observer?.disconnect();resize?.disconnect();win.removeEventListener('scroll',schedule);queue.clear();for(const task of tasks)task.cancel();for(const record of records)release(record);host.replaceChildren();}};
}
