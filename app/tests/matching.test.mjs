import test from 'node:test';import assert from 'node:assert/strict';import {copyFile,readFile} from 'node:fs/promises';
const {createApp}=await import('../server.mjs');

test('production retrieves local sources without model calls or fabricated percentages',async()=>{
 let calls=0;const corpus={hash:'a'.repeat(64),records:[{id:'PSI-107',name:'Test research',title:'Combustion research',content:{approach:'Oxygen and airflow conditions'},aliases:[]}]};const analyzer={status:()=>({configured:false}),analyze:()=>{calls++;throw Error('Unexpected API');}};
 const server=createApp({corpus,analyzer,sessionToken:'test-session',readAsset:file=>readFile(new URL('../public/'+file,import.meta.url))});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{const headers={'Content-Type':'application/json','X-Flame-Session':'test-session'};const body=JSON.stringify({question:'Test matching request',ids:['PSI-107'],conditions:{gravity:'other',oxygen:21}});
 let r=await fetch(base+'/api/match',{method:'POST',headers,body});assert.equal(r.status,200);const result=await r.json();assert.equal(result.mode,'numeric_conditions');assert.deepEqual(result.matches,[]);assert.equal(result.numericComparisonAvailable,false);assert.equal(calls,0);
 r=await fetch(base+'/api/match',{method:'POST',headers:{'Content-Type':'application/json'},body});assert.equal(r.status,403);
 r=await fetch(base+'/workspace-state.mjs');assert.equal(r.status,200);assert.match(await r.text(),/usablePolicy/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
