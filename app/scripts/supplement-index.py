import ast,json,hashlib,sys,csv,html
from pathlib import Path
from html.parser import HTMLParser
p=Path(sys.argv[1]);doc=json.loads((p/'code-index.json').read_text(encoding='utf-8'));rows=doc['blocks'];version=doc['version']
def ident(s):return hashlib.sha256(s.encode()).hexdigest()[:18]
for f in doc['files']:
 source=(p/f['source']).read_text(encoding='utf-8');module=next(x['id'] for x in rows if x['file']==f['file'] and x['kind']=='File')
 def add(kind,name,start,end,parent,fn=None,loop=None):
  id=ident(version+f['file']+kind+str(start)+str(end)+name+str(len(rows)));rows.append(dict(id=id,file=f['file'],kind=kind,name=name,parent=parent,function=fn,loop=loop,start=start,end=end,purpose=kind+' - '+name,purposeBasis='syntax_derived_needs_semantic_review',sourceHash=f['sha256'],excerpt=name));return id
 if f['file'].endswith('.py'):
  def walk(n,parent,fn=None,loop=None):
   keep=isinstance(n,(ast.stmt,ast.ExceptHandler));id=parent
   if keep:
    name=getattr(n,'name',None) or ast.get_source_segment(source,n) or type(n).__name__;name=' '.join(name.split())[:180];id=add(type(n).__name__,name,n.lineno,getattr(n,'end_lineno',n.lineno),parent,fn,loop)
   for child in ast.iter_child_nodes(n):walk(child,id,id if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) else fn,id if isinstance(n,(ast.For,ast.AsyncFor,ast.While)) else loop)
  walk(ast.parse(source),module)
 elif f['file'].endswith('.html'):
  class Parser(HTMLParser):
   def __init__(self):super().__init__();self.stack=[]
   def handle_starttag(self,tag,attrs):
    a=dict(attrs);name=tag+(' #'+a['id'] if 'id'in a else '')+(' .'+a['class'] if 'class'in a else '');id=add('HTML '+tag,name,self.getpos()[0],self.getpos()[0],self.stack[-1][1] if self.stack else module)
    if tag not in ['input','meta','link','br','img','hr','source','area','wbr','embed']:self.stack.append((tag,id))
   def handle_endtag(self,tag):
    for i in range(len(self.stack)-1,-1,-1):
     if self.stack[i][0]==tag:self.stack=self.stack[:i];break
  Parser().feed(source)
(p/'code-index.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8')
cols=['id','file','kind','name','start','end','startColumn','endColumn','parent','function','loop','purpose','purposeBasis','sourceHash']
with (p/'code-index.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,cols,extrasaction='ignore');w.writeheader();w.writerows(rows)
payload=json.dumps(doc,ensure_ascii=False).replace('<','\\u003c')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><title>Versioned code index</title><style>body{font:15px system-ui;margin:24px;color:#172d3c}input{padding:10px;width:70%}table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #ccd;vertical-align:top;text-align:left}code{font-size:12px}button{padding:8px}small{color:#456}</style><h1>Code / Frame Index</h1><p>File - function - block / loop. Syntax-derived purpose labels may need semantic review. Source snapshots and hashes belong to this version.</p><input id="q" placeholder="Search file, function, block, loop, identifier or purpose"><p id="count"></p><button id="prev">Previous</button><button id="next">Next</button><table><thead><tr><th>File / line</th><th>Block</th><th>Context</th><th>Purpose</th></tr></thead><tbody id="rows"></tbody></table><script>const DATA=PAYLOAD;let offset=0;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function draw(){const q=document.querySelector('#q').value.toLowerCase();const rr=DATA.blocks.filter(x=>JSON.stringify(x).toLowerCase().includes(q));document.querySelector('#count').textContent='Version '+DATA.version+' | '+DATA.files.length+' files | '+rr.length+' code blocks';document.querySelector('#rows').innerHTML=rr.slice(offset,offset+100).map(x=>'<tr><td><a href="source/'+encodeURI(x.file)+'">'+esc(x.file)+'</a><br>'+x.start+'-'+x.end+'</td><td>'+esc(x.kind)+'<br><code>'+esc(x.id)+'</code><br>'+esc(x.name)+'</td><td>Function: '+esc(x.function)+'<br>Loop: '+esc(x.loop)+'<br>Parent block: '+esc(x.parent)+'</td><td>'+esc(x.purpose)+'<br><small>'+esc(x.purposeBasis)+'</small></td></tr>').join('');document.querySelector('#prev').disabled=offset===0;document.querySelector('#next').disabled=offset+100>=rr.length;}document.querySelector('#q').oninput=()=>{offset=0;draw()};document.querySelector('#prev').onclick=()=>{offset=Math.max(0,offset-100);draw()};document.querySelector('#next').onclick=()=>{offset+=100;draw()};draw();</script></html>'''.replace('PAYLOAD',payload)
(p/'index.html').write_text(page,encoding='utf-8');print(json.dumps({'files':len(doc['files']),'blocks':len(rows)}))
