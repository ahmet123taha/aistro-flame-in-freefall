// Transcribed from existing, hash-pinned NASA documents; never a universal fire model.
export const BASS_CALIBRATION = Object.freeze({
 fileId:'f24948',sha256:'bc0dca3efdef44a7774d8dd37aebc0cedae8d67d7bae8c9cbde9590014a3c983',
 sheet:'Fan Calibration data',cells:'A33:A34',factor:1.0066,
 formula:'U (cm/s) = 1.0066 × AIR',
 scope:'SPICE calibration, 56 mm downstream, 36 mm from bottom (centerline). AIR display only; not Fan display. No time interpolation.',
});
export const BASS_REPORT = Object.freeze({
 fileId:'f24951',sha256:'5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770',
 page:65,printedPage:57,table:'5.1',contextPage:64,
 url:'https://ntrs.nasa.gov/citations/20210011385',
 identity:'Existing NTRS publication copy; identity to the unavailable PSI binary was not established.',
});
// run, thickness mm, width cm, burning sides, velocities cm/s, spread rates mm/s,
// burn time min, initial O2 vol%, final O2 vol%. null means Not tracked, never zero.
export const BASS_SHEET_DATA = [
 ['M1',1,2.2,1,[9],[.071],6.4,22.2,21.9],
 ['M2',3,2.2,1,[20,15],[.052,.033],22.9,22.2,21.2],
 ['M3',5,2.2,1,[10,20],[.029,.024],20.1,20.8,19.7],
 ['M4',5,2.2,2,[5,3],[.045,.033],19.8,21.8,19.8],
 ['M5',3,2.2,2,[10],[.071],27.2,22.2,19],
 ['M6',1,2.2,2,[10,8],null,16.8,21.8,20.7],
 ['M7',1,1.2,2,[10,6,5,3],[.106,.099,.083,.07],18.4,18.9,18.4],
 ['M8',2,1.2,2,[10,6,5],[.057,.056,.04],25.2,19.1,18.2],
 ['M9',3,1.2,2,[14],[.025],16.8,18,17.6],
 ['M10',4,1.2,2,[15,10],[.0373,.03],30.5,20.1,18.6],
 ['M11',5,1.2,2,[21,15,13],[.048,.028,.022],28.5,20,18.5],
 ['M12',2,2.2,2,[12,10],null,16.2,21.7,20.4],
 ['M13',4,2.2,2,[6,5,4],[.047,.035,.033],20.5,20.8,19],
 ['M14',2,2.2,1,[15,14,10],[.0624,.055,.0353],15.4,22.2,21.6],
 ['M15',4,2.2,1,[20],[.045],22,21,20],
 ['M16',1,2.2,2,[5,3,2],[.144,.1309,.1062],8.4,19.2,18.7],
 ['M17',2,2.2,2,[5,4,3],[.053,.042,.026],30.7,18.8,17.1],
 ['M18',3,2.2,2,[10,8],[.026,.013],25.5,17.9,16.8],
 ['M19',4,2.2,2,[10,6],[.027,.0159],25.7,19,17.4],
 ['M20',5,2.2,2,[10],[.012],16.5,18,17.4],
];
export function bassReportRows(file){
 if(file?.id!==BASS_REPORT.fileId||file.sha256!==BASS_REPORT.sha256)return [];
 return BASS_SHEET_DATA.map(([runId,thicknessMm,widthCm,burningSides,flows,rates,burnTimeMin,oxygen,finalOxygen],i)=>{
  const provenance={...BASS_REPORT,name:file.name,row:i+1,kind:'pdf_table',sha256:file.sha256};
  const values={material:'pmma',thicknessMm,widthMm:widthCm*10,oxygen};
  // Only five trials have one listed velocity. Never collapse multi-stage trials to an average.
  if(flows.length===1)values.airflow=flows[0];
  const columns={material:'Section 5.3: PMMA flat samples',thicknessMm:'Thickness, mm',widthMm:'Width, cm',oxygen:'Initial O2, vol%',airflow:'Velocity, cm/s'};
  const evidence=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{fileId:file.id,row:i+1,page:key==='material'?64:65,table:key==='material'?null:'5.1',column:columns[key],raw:key==='widthMm'?String(widthCm):String(value),value,unit:key==='widthMm'||key==='thicknessMm'?'mm':key==='airflow'?'cm/s':key==='oxygen'?"% vol":'',...(key==='oxygen'?{basis:'whole_trial_initial',note:"Initial O2; not a simultaneous O2 measurement for every flow stage."}:{})}]));
  return {sourceId:'PSI-25',runId,values,evidence,materialLabel:"PMMA sheet",specimenKind:'sheet',flowDirection:'opposed',burningSides,provenance,
   observations:{type:'reported_measurements',burnTimeMin,initialOxygen:oxygen,finalOxygen,stages:flows.map((airflow,j)=>({airflow,spreadRateMmS:rates?.[j]??null})),
    limitation:"Reported experimental result, not a prediction for user conditions. Oxygen changed during the trial; no separate O2 value is assigned to each stage. Spread in an ignited specimen is not the probability of spontaneous ignition."}};
 });
}
