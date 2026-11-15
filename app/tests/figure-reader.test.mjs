import test from 'node:test';
import assert from 'node:assert/strict';
import {FIGURES,BASS_FIGURE_SHA,figuresForFile,canRegenerate,boundaryComponents,readCurve,curveSamples,curveCSV,xAtFraction,xFraction,cropPixels} from '../public/figure-models.mjs';
import {BASS_REPORT} from '../lib/bass-evidence.mjs';
import {oxygenBoundary} from '../lib/pmma-boundary.mjs';

test('only exact reviewed source bytes enable graph definitions; unverified series stay original-only',()=>{
 assert.equal(BASS_FIGURE_SHA,BASS_REPORT.sha256);
 assert.deepEqual(figuresForFile({name:'BASS-II Summary Report.pdf',sha256:'different'}),[]);
 assert.deepEqual(figuresForFile(null),[]);
 assert.equal(figuresForFile({sha256:BASS_REPORT.sha256}).length,3);
 const original=FIGURES.find(f=>f.number==='6.7');assert.equal(canRegenerate(original),false);assert.equal(readCurve(original,10),null);assert.throws(()=>curveSamples(original));assert.throws(()=>curveCSV(original));
});
test('published rounded Equation 6.1 is reproduced without claiming measured points',()=>{
 const expected=[[1,17.0558839582758],[10,13.607427681994513],[150,15.905]];
 for(const [a,y] of expected){assert.ok(Math.abs(boundaryComponents(a).combined-y)<1e-12);assert.equal(oxygenBoundary(a),boundaryComponents(a).combined);}
 const values=boundaryComponents(10);assert.ok(Math.abs(values.quench-13.440427681994513)<1e-12);assert.equal(values.blowoff,13.567);
 for(const f of FIGURES.filter(canRegenerate)){const point=readCurve(f,10);assert.equal(point.measured,false);assert.equal(point.kind,'published_empirical_fit');for(const x of [0,151,NaN,Infinity])assert.equal(readCurve(f,x),null);}
 for(const a of [0,-1,NaN,Infinity])assert.equal(boundaryComponents(a),null);
});
test('linear and logarithmic pointer mappings read the equation, not a rounded polyline',()=>{
 for(const f of FIGURES.filter(canRegenerate)){
  for(const a of [1,2,10,10.380,100,150]){const back=xAtFraction(xFraction(a,f.window,f.scale),f.window,f.scale);assert.ok(Math.abs(back-a)<1e-10);}
  const rows=curveSamples(f,301);assert.equal(rows.length,301);assert.equal(rows[0].a,1);assert.equal(rows.at(-1).a,150);assert.ok(rows.every(r=>Number.isFinite(r.combined)&&r.measured===false));
 }
 assert.equal(xAtFraction(.5,FIGURES[0].window,'linear'),75.5);
 assert.ok(Math.abs(xAtFraction(.5,FIGURES[0].window,'log')-Math.sqrt(150))<1e-12);
});
test('calculated CSV carries equation/source provenance and roundtrips all curve samples',()=>{
 const figure=FIGURES[0],csv=curveCSV(figure);assert.match(csv,/NOT measured points/);assert.ok(csv.includes(BASS_REPORT.sha256));
 const data=csv.split('\r\n').filter(row=>!row.startsWith('#')).slice(1).map(row=>row.split(',').map(Number));
 assert.equal(data.length,301);for(const [a,combined,quench,blowoff] of data){const expected=boundaryComponents(a);for(const key of ['combined','quench','blowoff'])assert.ok(Math.abs({combined,quench,blowoff}[key]-expected[key])<2e-10);}
});
test('reviewed normalized crops include axes and reject invalid regions',()=>{
 for(const f of FIGURES){const c=cropPixels(f.crop,1224,1584);assert.ok(c.left>=0&&c.top>=0&&c.width>0&&c.height>0);assert.ok(c.left+c.width<=1224&&c.top+c.height<=1584);}
 assert.deepEqual(cropPixels({x:.2,y:.1,width:.5,height:.3},1000,1000),{left:200,top:100,width:500,height:300});
 assert.throws(()=>cropPixels({x:.9,y:0,width:.2,height:.5},1000,1000));assert.throws(()=>cropPixels({x:0,y:0,width:-1,height:1},1000,1000));
});
