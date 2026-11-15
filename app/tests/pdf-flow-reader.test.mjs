import test from 'node:test';
import assert from 'node:assert/strict';
import {clampPage,renderScale,preserveScroll} from '../public/pdf-flow-reader.mjs';
test('PDF page jumps clamp invalid, fractional and out-of-range values to valid source pages',()=>{
 assert.equal(clampPage('',120),1);assert.equal(clampPage(-10,120),1);assert.equal(clampPage(200,120),120);assert.equal(clampPage(4.8,120),4);
});
test('PDF pixel allocation bounds high DPI and oversized source pages without cropping',()=>{
 for(const [w,h,dpi] of [[800,1100,2],[2200,3100,4],[50000,50000,2],[200,300,1]]){
  const ratio=renderScale(w,h,dpi);assert.ok(ratio>0);assert.ok(w*h*ratio*ratio<=4_000_001);assert.ok(Math.max(w,h)*ratio<=8192.01);
 }
});
test('file content replacement restores every scroller and webpage position',()=>{
 const root={scrollHeight:2000,clientHeight:800,scrollWidth:600,clientWidth:600,scrollTop:400,scrollLeft:0,parentElement:null};
 const parent={scrollHeight:900,clientHeight:400,scrollWidth:800,clientWidth:500,scrollTop:200,scrollLeft:20,parentElement:root};
 const win={scrollX:2,scrollY:350,scrollTo(x,y){this.scrollX=x;this.scrollY=y;}};
 preserveScroll({parentElement:parent,ownerDocument:{defaultView:win}},()=>{root.scrollTop=0;parent.scrollTop=0;parent.scrollLeft=0;win.scrollY=0;});
 assert.deepEqual([root.scrollTop,parent.scrollTop,parent.scrollLeft,win.scrollX,win.scrollY],[400,200,20,2,350]);
});
