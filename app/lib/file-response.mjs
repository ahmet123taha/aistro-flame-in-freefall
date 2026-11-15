import {pipeline} from 'node:stream/promises';

const IMAGE_TYPES={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml'};
const TEXT_PREVIEW=/\.(txt|csv|tsv|json|xml|md|log)$/i;
const PREVIEW_BYTES=128000;

// A single byte range keeps PDF seeking bounded without multipart buffering.
// Unknown units/multiple ranges are ignored; an invalid byte range is rejected.
export function singleByteRange(value,size){
  if(typeof value!=='string'||!value.startsWith('bytes=')||value.includes(','))return null;
  const match=/^bytes=(\d*)-(\d*)$/.exec(value);
  if(!match||(!match[1]&&!match[2])||size===0)return false;
  const first=match[1]===''?null:Number(match[1]),last=match[2]===''?null:Number(match[2]);
  if((first!==null&&!Number.isSafeInteger(first))||(last!==null&&!Number.isSafeInteger(last)))return false;
  if(first===null)return last>0?{start:Math.max(0,size-last),end:size-1}:false;
  if(first>=size||(last!==null&&last<first))return false;
  return {start:first,end:last===null?size-1:Math.min(last,size-1)};
}

function json(res,status,data){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});
  res.end(JSON.stringify(data));
}

/** Serve only a dataset.file() handle, which has passed path, size and SHA checks. */
export async function serveDatasetFile(req,res,dataset,id,{preview=false}={}){
  const {row,handle}=await dataset.file(id);
  try{
    if(req.destroyed||res.destroyed)return;
    if(preview){
      if(!TEXT_PREVIEW.test(row.name))return json(res,415,{error:'Text preview is unavailable for this file type. Open the original file.'});
      const buffer=Buffer.alloc(Math.min(row.bytes,PREVIEW_BYTES));
      const {bytesRead}=await handle.read(buffer,0,buffer.length,0);
      return json(res,200,{name:row.name,text:buffer.subarray(0,bytesRead).toString('utf8'),truncated:row.bytes>bytesRead,sha256:row.sha256});
    }
    const isPdf=/\.pdf$/i.test(row.name),imageType=IMAGE_TYPES[row.name.split('.').pop().toLowerCase()];
    const etag=`"${row.sha256}"`;
    const headers={
      'Content-Type':isPdf?'application/pdf':imageType||'application/octet-stream',
      'Content-Disposition':`${isPdf||imageType?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(row.name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}`,
      'Accept-Ranges':'bytes',ETag:etag,
    };
    // Range applies only to GET. A stale/weak/date If-Range returns the full file.
    const range=req.method==='GET'&&(!req.headers['if-range']||req.headers['if-range']===etag)
      ?singleByteRange(req.headers.range,row.bytes):null;
    if(range===false){
      res.writeHead(416,{...headers,'Content-Range':`bytes */${row.bytes}`,'Content-Length':0});
      return res.end();
    }
    const start=range?.start??0,end=range?.end??row.bytes-1;
    res.writeHead(range?206:200,{...headers,'Content-Length':Math.max(0,end-start+1),...(range?{'Content-Range':`bytes ${start}-${end}/${row.bytes}`}:{})});
    if(req.method==='HEAD'||row.bytes===0)return res.end();
    // Explicit position matters: dataset.file() has already streamed the handle
    // once for SHA verification. pipeline propagates backpressure and disconnects.
    const stream=handle.createReadStream({start,end,autoClose:false,highWaterMark:64*1024});
    try{await pipeline(stream,res);}catch{if(!res.destroyed)res.destroy();}
  }finally{await handle.close();}
}
