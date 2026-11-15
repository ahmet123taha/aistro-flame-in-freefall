import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryList,fileKind} from '../lib/file-library.mjs';
import {FIGURES,BASS_FIGURE_SHA,curveAtPointer,readCurve} from '../public/figure-models.mjs';
const file={id:'f1',name:'BASS-II Summary Report.pdf',category:'Reports',accessions:['PSI-25'],sha256:BASS_FIGURE_SHA,bytes:100,path:'private/path.pdf'};
test('plotted library exposes each reproducible reviewed graph, never every PDF or spreadsheet',()=>{
 const result=libraryList([file,{...file,id:'f2',sha256:'changed'},{...file,id:'f3',name:'unreviewed.xlsx',sha256:'not-reviewed'}],{accession:'PSI-25',kind:'plotted'});
 assert.equal(result.total,2);assert.deepEqual(result.items.map(x=>x.plot.number),['6.10','6.9']);assert.equal(new Set(result.items.map(x=>x.selectionId)).size,2);assert.ok(result.items.every(x=>x.id==='f1'&&x.kind==='plotted'&&!Object.hasOwn(x,'path')));
});
test('plotted search, accession and pagination operate on graph entries',()=>{
 assert.equal(libraryList([file],{kind:'plotted',q:'logarithmic'}).items[0].plot.number,'6.10');assert.equal(libraryList([file],{kind:'plotted',accession:'PSI-99'}).total,0);assert.equal(libraryList([file],{kind:'plotted',offset:50}).items.length,0);
 assert.equal(libraryList([file],{kind:'report'}).total,1);assert.equal(fileKind('unreviewed.xlsx'),'table');
});
test('hover evaluates exact source equations for the nearest visible curve',()=>{
 const f=FIGURES[0],point=readCurve(f,10);const hit=curveAtPointer(f,10,point.combined);assert.equal(hit.id,'combined');assert.equal(hit.x,10);assert.equal(hit.y,point.combined);assert.equal(hit.distance,0);
 const blowoff=curveAtPointer(f,10,point.blowoff,['blowoff']);assert.equal(blowoff.id,'blowoff');assert.equal(blowoff.y,13.567);
});
test('hover never invents coordinates for an unreviewed image or outside source window',()=>{
 assert.equal(curveAtPointer(FIGURES[2],10,15),null);assert.equal(curveAtPointer(FIGURES[0],200,15),null);assert.equal(curveAtPointer(FIGURES[0],10,18),null);assert.equal(curveAtPointer(FIGURES[0],10,13.567,[]),null);assert.equal(curveAtPointer(FIGURES[0],10,NaN),null);
});
