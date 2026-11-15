import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_PREPARED_POINTS,PREPARED_GRAPH_NOTICE,validatePreparedGraph,preparedGraphGeometry,nearestPreparedPoint,preparedGraphCSV,mountPreparedGraph} from '../public/prepared-graph-reader.mjs';
import {parseDelimited} from '../public/table-preview.mjs';

const point=(x,y,row=2)=>({x,y,row,xCell:'A'+row,yCell:'B'+row,xRaw:String(x),yRaw:String(y)});
const graph=()=>({id:'table-fixture',title:'Offline exact table observations',kind:'generated',origin:'source_table',caption:'Synthetic reader test; no scientific conclusion.',limitations:['Fixture only.'],source:{fileId:'f123',name:'Original source.csv',sha256:'a'.repeat(64),sheet:'CSV'},x:{label:'Time',unit:'s'},y:{label:'Temperature',unit:'K'},series:[{id:'one',label:'Run one',points:[point(0,300,2),point(2,310,3),null,point(1,305,5)]},{id:'two',label:'Run two',points:[point(0,320,6),point(3,330,7)]}]});

test('source-table provenance is mandatory and raw source content is not modified',()=>{
 const g=graph(),before=structuredClone(g);assert.equal(validatePreparedGraph(g),g);assert.deepEqual(g,before);assert.match(PREPARED_GRAPH_NOTICE,/not an original source figure/);
 for(const change of [g=>g.kind='original',g=>g.origin='equation',g=>g.source.sha256='unknown',g=>g.source.sheet='',g=>g.x.unit=null,g=>g.series[0].points[0].row=0,g=>g.series[0].points[0].xCell='A0',g=>g.series[0].points[0].yRaw=undefined,g=>g.series[0].id=g.series[1].id,g=>g.series[0].xUnit='min']){
  const bad=graph();change(bad);assert.throws(()=>validatePreparedGraph(bad),/Prepared graph unavailable/);
 }
});

test('nonfinite coordinates fail explicitly; oversize input is rejected without downsampling',()=>{
 for(const value of [NaN,Infinity,-Infinity,'1',null]){const g=graph();g.series[0].points[0].x=value;assert.throws(()=>preparedGraphGeometry(g),/nonfinite/);}
 const g=graph();g.series=[{id:'one',label:'One',points:Array(MAX_PREPARED_POINTS).fill(point(1,2))}];assert.equal(validatePreparedGraph(g),g);
 g.series[0].points.push(null);assert.throws(()=>validatePreparedGraph(g),/not downsampled/);assert.equal(g.series[0].points.length,MAX_PREPARED_POINTS+1);
});

test('geometry preserves all exact observations, input order and null gaps without fitting',()=>{
 const g=graph(),geometry=preparedGraphGeometry(g);assert.deepEqual(geometry.series[0].segments.map(segment=>segment.map(item=>item.pointIndex)),[[0,1],[3]]);
 const original=g.series.flatMap(series=>series.points.filter(Boolean)),mapped=geometry.series.flatMap(series=>series.segments.flat().map(item=>item.point));assert.deepEqual(mapped,original);
 assert.equal(mapped.length,5);assert.equal(mapped[2].x,1);assert.deepEqual(geometry.bounds,{xMin:0,xMax:3,yMin:300,yMax:330});
 g.connect=true;assert.deepEqual(preparedGraphGeometry(g).series,geometry.series);
});

test('constant and extreme finite ranges produce finite SVG coordinates',()=>{
 for(const points of [[point(0,0),point(0,0,3)],[point(-1e308,-1e308),point(1e308,1e308,3)],[point(5e-324,5e-324),point(1e-323,1e-323,3)]]){
  const g=graph();g.series=[{id:'range',label:'Range',points}];const geometry=preparedGraphGeometry(g);
  for(const item of geometry.series[0].segments[0]){assert.ok(Number.isFinite(item.x)&&item.x>=82&&item.x<=732);assert.ok(Number.isFinite(item.y)&&item.y>=40&&item.y<=390);}
 }
});

test('pointer readouts select an existing visible source observation, never an interpolated point',()=>{
 const geometry=preparedGraphGeometry(graph()),first=geometry.series[0].segments[0][0];
 const selected=nearestPreparedPoint(geometry,first.x+.1,first.y+.1);assert.equal(selected.point,first.point);assert.equal(selected.pointIndex,0);assert.equal(selected.seriesIndex,0);
 const hidden=nearestPreparedPoint(geometry,first.x,first.y,new Set([1]));assert.equal(hidden.seriesIndex,1);assert.ok(graph().series[1].points.some(p=>p.x===hidden.point.x&&p.y===hidden.point.y));
 assert.equal(nearestPreparedPoint(geometry,100,100,new Set()),null);assert.equal(nearestPreparedPoint(geometry,NaN,100),null);
});

test('CSV roundtrips exact raw strings, source cells, units, provenance and explicit gaps',()=>{
 const g=graph();g.series[0].points[0].xRaw='0.0000';g.series[0].points[0].yRaw='300,"reported"\nnot normalized';
 const parsed=parseDelimited(preparedGraphCSV(g)),[headers,...rows]=parsed.rows,data=rows.map(row=>Object.fromEntries(headers.map((key,i)=>[key,row[i]])));
 assert.equal(parsed.truncated,false);assert.equal(data.length,6);assert.equal(data[0].x_raw,'0.0000');assert.equal(data[0].y_raw,'300,"reported"\nnot normalized');assert.equal(data[2].record_type,'gap');assert.equal(data[2].x,'');
 assert.equal(data[0].x_cell,'A2');assert.equal(data[0].y_cell,'B2');assert.equal(data[0].source_row,'2');assert.equal(data[0].source_sha256,g.source.sha256);assert.equal(data[0].source_sheet,'CSV');assert.equal(data[0].x_unit,'s');assert.equal(data[0].y_unit,'K');
});

test('CSV formula-injection protection covers raw cells and metadata while numeric coordinates remain exact',()=>{
 const g=graph();g.series[0].label='=HYPERLINK("unsafe")';g.source.name='\t=unsafe.csv';g.series[0].points[0].x=-1;g.series[0].points[0].xRaw='-1.000';g.series[0].points[0].yRaw='  +SUM(A1:A2)';
 const [header,...rows]=parseDelimited(preparedGraphCSV(g)).rows,index=key=>header.indexOf(key),row=rows[0];
 assert.equal(row[index('x')],'-1');assert.equal(row[index('x_raw')],"'-1.000");assert.equal(row[index('y_raw')],"'  +SUM(A1:A2)");assert.equal(row[index('series_label')],"'=HYPERLINK(\"unsafe\")");assert.equal(row[index('source_name')],"'\t=unsafe.csv");
 assert.equal(g.series[0].points[0].xRaw,'-1.000');
});

test('invalid data renders a safe accessible error and can be disposed',()=>{
 let cleared=false;const host={ownerDocument:{defaultView:{cancelAnimationFrame(){},clearTimeout(){}}},innerHTML:'',replaceChildren(){cleared=true;}};
 const g=graph();g.title='<script>unsafe</script>';g.source.sha256='invalid';const reader=mountPreparedGraph(host,g);assert.match(host.innerHTML,/role="alert"/);assert.doesNotMatch(host.innerHTML,/<script>/);reader.dispose();assert.equal(cleared,true);
});
