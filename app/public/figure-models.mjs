// Reviewed definitions are tied to exact source bytes, never a filename guess.
export const BASS_FIGURE_SHA='5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770';
export const BOUNDARY_EQUATION='X_O2 = 6 exp(-0.5 a) + 0.0167 a + 13.4';
const freeze=value=>{Object.freeze(value);for(const child of Object.values(value))if(child&&typeof child==='object'&&!Object.isFrozen(child))freeze(child);return value;};
// Bounding boxes of the PDF's embedded graph objects in top-left page points.
// One-point padding preserves antialiased edge labels, with captions kept separate.
const graphBox=(x,y,width,height)=>({x:(x-1)/612,y:(y-1)/792,width:(width+2)/612,height:(height+2)/792});
export const FIGURES=freeze([
 {id:'bass-6-10',number:'6.10',title:'PMMA flammability boundary · logarithmic axis',page:84,printedPage:76,sha256:BASS_FIGURE_SHA,model:'bass-boundary-6.1',scale:'log',crop:graphBox(130.4250336,308.5348511,351.1499824,296.7946289),caption:'Figure 6.10. Flammability boundary on a logarithmic stretch-rate axis. The original includes ISS stable, quench and blowoff points, complementary drop-tower points and uncertainty bars.',fidelity:'The published boundary and two component fits are reproduced from their printed coefficients. Experimental points, their error bars and the drop-tower regression are available only in the original figure.',window:{xMin:1,xMax:150,yMin:13,yMax:19}},
 {id:'bass-6-9',number:'6.9',title:'PMMA flammability boundary · linear axis',page:83,printedPage:75,sha256:BASS_FIGURE_SHA,model:'bass-boundary-6.1',scale:'linear',crop:graphBox(127.5,390.675293,356.3735193,269.7999969),caption:'Figure 6.9. Flammability boundary from BASS-II tests, with complementary drop-tower results, on a linear stretch-rate axis.',fidelity:'Only the printed boundary and component-fit equations are regenerated. The reader uses the reviewed 1–150 s⁻¹ window, a subset of the original axes; measured points and error bars are not reconstructed.',window:{xMin:1,xMax:150,yMin:13,yMax:19}},
 {id:'bass-6-7',number:'6.7',title:'Stretch rate and radiometer time history',page:82,printedPage:74,sha256:BASS_FIGURE_SHA,model:null,crop:graphBox(110.8000793,72,390.3600608,260.5999852),caption:'Figure 6.7. Time history of stretch rate a and radiometer signal for two local blowoffs for a 0.318 cm rod. The left and right axes use different quantities.',fidelity:'Original figure only. An exact time-series table has not been verified. No numerical coordinates are inferred from pixels.'}
]);
export const CURVES=freeze([
 {id:'combined',label:'Combined boundary · Equation 6.1',color:'#246d83',dash:''},
 {id:'quench',label:'Quenching fit',color:'#bc282b',dash:'7 5'},
 {id:'blowoff',label:'Blowoff fit',color:'#292929',dash:'12 6'}
]);
export function figuresForFile(file){return FIGURES.filter(f=>f.sha256===file?.sha256);}
export function boundaryComponents(a){
 if(!Number.isFinite(a)||a<=0)return null;
 return {combined:6*Math.exp(-.5*a)+.0167*a+13.4,quench:6*Math.exp(-.5*a)+13.4,blowoff:.0167*a+13.4};
}
export function canRegenerate(figure){return figure?.sha256===BASS_FIGURE_SHA&&figure.model==='bass-boundary-6.1'&&['log','linear'].includes(figure.scale);}
export function readCurve(figure,a){
 if(!canRegenerate(figure)||!Number.isFinite(a)||a<figure.window.xMin||a>figure.window.xMax)return null;
 return {a,...boundaryComponents(a),kind:'published_empirical_fit',measured:false};
}
// UI hit-testing tolerance is in displayed y-axis units, not a scientific error.
export function curveAtPointer(figure,a,ordinate,visible=CURVES.map(c=>c.id),tolerance=.22){
 const point=readCurve(figure,a);if(!point||!Number.isFinite(ordinate)||!Number.isFinite(tolerance)||tolerance<0)return null;
 const candidates=CURVES.filter(c=>visible.includes(c.id)&&point[c.id]>=figure.window.yMin&&point[c.id]<=figure.window.yMax).map(c=>({...c,x:point.a,y:point[c.id],distance:Math.abs(point[c.id]-ordinate)})).sort((a,b)=>a.distance-b.distance);
 return candidates[0]?.distance<=tolerance?candidates[0]:null;
}
export function xFraction(a,{xMin,xMax},scale){return scale==='log'?Math.log(a/xMin)/Math.log(xMax/xMin):(a-xMin)/(xMax-xMin);}
export function xAtFraction(t,{xMin,xMax},scale){const f=Math.min(1,Math.max(0,t));return scale==='log'?xMin*Math.pow(xMax/xMin,f):xMin+f*(xMax-xMin);}
export function curveSamples(figure,count=400){
 if(!canRegenerate(figure)||!Number.isInteger(count)||count<2||count>2000)throw Error('No verified curve or invalid sample count.');
 return Array.from({length:count},(_,i)=>readCurve(figure,xAtFraction(i/(count-1),figure.window,figure.scale)));
}
export function curveCSV(figure){
 const rows=curveSamples(figure,301);
 return ['# Published empirical fits; NOT measured points','# '+BOUNDARY_EQUATION,'# Source SHA-256: '+figure.sha256,`# Figure ${figure.number}; PDF page ${figure.page}; selected window 1-150 s^-1; coefficients are rounded`, 'normalized_stretch_s^-1,combined_oxygen_vol_percent,quench_fit_oxygen_vol_percent,blowoff_fit_oxygen_vol_percent',...rows.map(r=>[r.a,r.combined,r.quench,r.blowoff].map(v=>v.toFixed(10)).join(','))].join('\r\n');
}
export function cropPixels(crop,width,height){
 if(!crop||![width,height,crop.x,crop.y,crop.width,crop.height].every(Number.isFinite)||width<=0||height<=0||crop.x<0||crop.y<0||crop.width<=0||crop.height<=0||crop.x+crop.width>1||crop.y+crop.height>1)throw Error('Invalid reviewed crop.');
 const left=Math.floor(crop.x*width),top=Math.floor(crop.y*height);
 return {left,top,width:Math.ceil((crop.x+crop.width)*width)-left,height:Math.ceil((crop.y+crop.height)*height)-top};
}
