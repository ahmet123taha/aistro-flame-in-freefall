import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,writeFile,rm,open} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fixture} from './dataset-fixture.mjs';
import {loadDataset} from '../lib/dataset.mjs';
import {createApp} from '../server.mjs';
import {singleByteRange} from '../lib/file-response.mjs';

async function withServer(run){
  const dir=await mkdtemp(path.join(os.tmpdir(),'flame-file-http-'));
  let app;
  try{
    const data=await fixture(dir),dataset=await loadDataset(dir);
    app=createApp({corpus:dataset.corpus,dataset,analyzer:{status:()=>({configured:false})}});
    await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
    await run({dir,...data,dataset,url:`http://127.0.0.1:${app.address().port}/api/files/f0`});
  }finally{if(app)await new Promise(resolve=>app.close(resolve));await rm(dir,{recursive:true,force:true});}
}

test('verified full GET and HEAD advertise exact length and strong source hash',()=>withServer(async({url,payload})=>{
  let response=await fetch(url);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('accept-ranges'),'bytes');
  assert.equal(response.headers.get('content-length'),String(payload.length));
  assert.equal(response.headers.get('etag'),'"'+createHash('sha256').update(payload).digest('hex')+'"');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),payload);
  response=await fetch(url,{method:'HEAD',headers:{Range:'bytes=1-3'}});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-length'),String(payload.length));
  assert.equal((await response.arrayBuffer()).byteLength,0);
}));

test('verified GET supports bounded, open-ended and suffix byte ranges',()=>withServer(async({url,payload})=>{
  for(const [range,start,end] of [['bytes=1-4',1,4],['bytes=7-',7,payload.length-1],['bytes=-5',payload.length-5,payload.length-1],['bytes=0-999',0,payload.length-1]]){
    const response=await fetch(url,{headers:{Range:range}});
    assert.equal(response.status,206,range);
    assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${payload.length}`);
    assert.equal(response.headers.get('content-length'),String(end-start+1));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),payload.subarray(start,end+1));
  }
}));

test('unsatisfiable or malformed byte ranges return 416 without bytes',()=>withServer(async({url,payload})=>{
  for(const range of ['bytes=999-',`bytes=${payload.length}-`,'bytes=4-2','bytes=-0','bytes=-','bytes=x-5','bytes=999999999999999999999-']){
    const response=await fetch(url,{headers:{Range:range}});
    assert.equal(response.status,416,range);
    assert.equal(response.headers.get('content-range'),`bytes */${payload.length}`);
    assert.equal((await response.arrayBuffer()).byteLength,0);
  }
}));

test('If-Range requires matching strong ETag; multiple or unknown ranges use full GET',()=>withServer(async({url,payload})=>{
  const etag='"'+createHash('sha256').update(payload).digest('hex')+'"';
  for(const token of [etag,'"different"','W/'+etag,'Wed, 01 Jan 2025 00:00:00 GMT']){
    const response=await fetch(url,{headers:{Range:'bytes=0-2','If-Range':token}});
    assert.equal(response.status,token===etag?206:200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),token===etag?payload.subarray(0,3):payload);
  }
  for(const range of ['bytes=0-2,4-6','items=0-2']){
    const response=await fetch(url,{headers:{Range:range}});
    assert.equal(response.status,200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),payload);
  }
}));

test('range and HEAD requests retain SHA verification and indexed-file access restrictions',()=>withServer(async({url,root,payload})=>{
  const changed=Buffer.from(payload);changed[0]^=1;await writeFile(path.join(root,'PSI/PSI-25/table.csv'),changed);
  for(const method of ['GET','HEAD']){
    const response=await fetch(url,{method,headers:{Range:'bytes=0-2'}});
    assert.equal(response.status,409);
    if(method==='GET')assert.match((await response.json()).error,/hash verification/);
  }
  assert.equal((await fetch(url.replace('f0','f999'),{method:'HEAD'})).status,404);
}));

test('preview remains bounded text and HEAD does not accidentally request a preview body',()=>withServer(async({url,payload})=>{
  const response=await fetch(url+'/preview',{headers:{Range:'bytes=0-1'}});
  assert.equal(response.status,200);
  const preview=await response.json();assert.equal(preview.text,payload.toString());assert.equal(preview.truncated,false);
  assert.equal((await fetch(url+'/preview',{method:'HEAD'})).status,404);
}));

test('stream uses bounded reads and closes its descriptor when the client disconnects',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'flame-file-abort-'));
  let app,closed,closeDone;const done=new Promise(resolve=>closeDone=resolve);
  try{
    const target=path.join(dir,'large.pdf'),handle=await open(target,'w');await handle.truncate(32*1024*1024);await handle.close();
    const row={id:'f0',name:'large.pdf',bytes:32*1024*1024,sha256:'0'.repeat(64)};
    const dataset={available:true,file:async()=>{
      const handle=await open(target,'r'),create=handle.createReadStream.bind(handle),close=handle.close.bind(handle);
      handle.readFile=()=>{throw Error('Whole-file buffering must not be used');};
      handle.createReadStream=options=>{assert.equal(options.highWaterMark,65536);return create(options);};
      handle.close=async()=>{await close();closed=true;closeDone();};return {row,handle};
    }};
    app=createApp({corpus:{records:[],hash:'fixture'},dataset,analyzer:{status:()=>({configured:false})}});
    await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
    await new Promise((resolve,reject)=>{http.get(`http://127.0.0.1:${app.address().port}/api/files/f0`,response=>{
      assert.equal(response.headers['content-type'],'application/pdf');
      response.once('data',()=>{response.destroy();resolve();});
    }).on('error',reject);});
    await Promise.race([done,new Promise((_,reject)=>setTimeout(()=>reject(Error('Descriptor did not close after disconnect')),2000).unref())]);
    assert.equal(closed,true);
  }finally{if(app)await new Promise(resolve=>app.close(resolve));await rm(dir,{recursive:true,force:true});}
});

test('zero-byte ranges are unsatisfiable and whole-file responses remain legal',()=>{
  assert.equal(singleByteRange('bytes=0-',0),false);
  assert.equal(singleByteRange(undefined,0),null);
  assert.deepEqual(singleByteRange('bytes=-999',5),{start:0,end:4});
});
