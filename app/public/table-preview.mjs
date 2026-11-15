// Bounded display only; no evaluation, unit normalization or scientific inference.
export function parseDelimited(text,delimiter=',',limit=201){
 const rows=[];let row=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted)quoted=false;else if(cell==='')quoted=true;else cell+='"';}
  else if(c===delimiter&&!quoted){row.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';if(rows.length>=limit)return {rows,truncated:true};}
  else cell+=c;
 }
 if(cell||row.length){row.push(cell);rows.push(row);}
 return {rows,truncated:false};
}
