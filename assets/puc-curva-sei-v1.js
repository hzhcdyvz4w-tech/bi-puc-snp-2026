/* BI PUC — Curva S documental por BM selecionado; dados permanecem exclusivamente no navegador. */
(()=>{'use strict';
const byId=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>{const raw=String(x??'').replace(/[\sR$%]/g,'').trim();if(!raw)return NaN;const n=raw.includes(',')?Number(raw.replace(/\./g,'').replace(',','.')):Number(raw);return Number.isFinite(n)?n:NaN};
const pct=x=>x===null||!Number.isFinite(x)?'—':x.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
const money=x=>x===null||!Number.isFinite(x)?'—':x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const excluded=()=>{try{return new Set(JSON.parse(localStorage.getItem('BI_PUC_SEI_COMPARACAO_EXCLUIDOS_V1')||'[]'))}catch(e){return new Set()}};
const currentProject=()=>byId('ficha-project')?.value||'';
const currentProjects=()=>{
 const ids=window.PUCFichasBM?.selectedProjectIds?.()||[currentProject()];
 return [...new Set(ids.filter(Boolean))];
};
const currentContract=()=>byId('ficha-contract')?.value?.trim()||'';
const associatedIds=doc=>[...new Set([doc.project,...(Array.isArray(doc.projects)?doc.projects:[])].filter(Boolean))];
function belongsToProject(doc,id){
 const ids=associatedIds(doc);
 if(ids.includes(id))return true;
 const rows=window.PUCFichasBM?.getState?.()?.bmRows||[];
 return rows.some(r=>r.project===id&&r.sourceDocId===doc.id&&r.status!=='ignorado');
}
const selected=()=>{
 const ids=currentProjects();if(!ids.length)return [];
 return (window.PUCDocLibrary?.list?.()||[]).filter(doc=>
  doc.origin==='SEI'&&/^(BM IDENTIFICADO|BM PROVÁVEL)/.test(doc.bmStatus||'')&&
  !excluded().has(doc.id)&&/\.pdf$/i.test(doc.name)&&
  ids.some(id=>belongsToProject(doc,id))
 );
};
function rowsFromItems(items){
 const rows=[];
 for(const item of items||[]){
  const s=String(item.str||'').trim(),x=item.transform?.[4],y=item.transform?.[5];
  if(!s||!Number.isFinite(x)||!Number.isFinite(y))continue;
  let row=rows.find(r=>Math.abs(r.y-y)<2.1);
  if(!row){row={y,parts:[]};rows.push(row)}
  row.parts.push({s,x,width:Number(item.width)||0});
 }
 for(const r of rows){r.parts.sort((a,b)=>a.x-b.x);r.text=r.parts.map(x=>x.s).join(' ')}
 return rows.sort((a,b)=>b.y-a.y);
}
function parsePage(items,pageNo){
 const rows=rowsFromItems(items);const hdr=rows.map(r=>{
  const h=[];
  for(let k=0;k<r.parts.length;k++){
   const p=r.parts[k],inline=p.s.match(/^BM\s*(\d{1,2})$/i);
   if(inline){h.push({number:Number(inline[1]),x:p.x});continue}
   if(/^BM$/i.test(p.s)){
    const next=r.parts[k+1],match=next?.s.match(/^(\d{1,2})$/);
    if(match&&next.x-p.x<27){h.push({number:Number(match[1]),x:p.x});k++}
   }
  }
  return {row:r,head:h};
 }).filter(x=>x.head.length>=3).sort((a,b)=>b.head.length-a.head.length)[0];
 if(!hdr)return [];
 const heads=hdr.head.sort((a,b)=>a.x-b.x);
 if(new Set(heads.map(x=>x.number)).size!==heads.length)return [];
 const nearest=(x)=>heads.reduce((best,h,i)=>Math.abs(h.x-x)<Math.abs(heads[best].x-x)?i:best,0);
 function rowAt(offset,kind){
  const candidates=rows.map(r=>{
   const delta=hdr.row.y-r.y;
   const parts=r.parts.filter(p=>kind==='pct'?/\d+(?:,\d+)?\s*%/.test(p.s):/^\d[\d.]*,\d{2}$/.test(p.s));
   return {r,delta,parts};
  }).filter(v=>v.parts.length>=Math.min(heads.length,3)&&Math.abs(v.delta-offset)<13);
  return candidates.sort((a,b)=>Math.abs(a.delta-offset)-Math.abs(b.delta-offset))[0]||null;
 }
 const period=rows.filter(r=>hdr.row.y-r.y>2&&hdr.row.y-r.y<16).map(r=>r.parts.filter(p=>/^\d{1,4}$/.test(p.s))).sort((a,b)=>b.length-a.length)[0]||[];
 const days=new Map();period.forEach(p=>days.set(nearest(p.x),Number(p.s)));
 const specs=[['financeiroPrevistoParcial',34,'money'],['financeiroRealizadoParcial',61,'money'],
 ['financeiroPrevistoAcumulado',88,'money'],['financeiroRealizadoAcumulado',115,'money'],
 ['percentualPrevistoParcial',150,'pct'],['percentualRealizadoParcial',178,'pct'],
 ['percentualPrevistoAcumulado',206,'pct'],['percentualRealizadoAcumulado',232,'pct']];
 const points=heads.map((h,i)=>({number:h.number,day:days.get(i)??null,page:pageNo}));
 for(const [key,offset,kind] of specs){
  const r=rowAt(offset,kind);if(!r)continue;
  for(const part of r.parts){
   const i=nearest(part.x);const value=num(part.s);
   if(Number.isFinite(value)&&points[i][key]===undefined)points[i][key]=value;
  }
 }
 return points;
}

/* Leitura geométrica da tabela larga do BM, inclusive colunas SUAPE/MPOR.
   Linhas sem rótulo inequívoco permanecem como candidatas e exigem escolha
   explícita da fonte de "previsto" e "realizado"; nunca se infere pela cor. */
function widePageCandidates(items,pageNo){
 const rows=rowsFromItems(items);
 const allHeaders=rows.map(row=>{
  const heads=[],seen=new Set();
  for(let i=0;i<row.parts.length;i++){
   const part=row.parts[i],matches=[...part.s.matchAll(/\bBM\s*(?:N[º°.]?\s*)?0*(\d{1,3})\b/gi)];
   for(const m of matches){
    const number=Number(m[1]),x=part.x+(Number(part.width)||part.s.length*4)*m.index/Math.max(part.s.length,1);
    const key=number+':'+Math.round(x);
    if(!seen.has(key)){heads.push({number,x});seen.add(key)}
   }
   if(/^\s*BM\s*$/i.test(part.s)&&row.parts[i+1]&&/^\d{1,3}$/.test(row.parts[i+1].s)){
    const next=row.parts[i+1];
    if(Math.abs(next.x-part.x)<32){
     const number=Number(next.s),key=number+':'+Math.round(part.x);
     if(!seen.has(key)){heads.push({number,x:part.x});seen.add(key)}
    }
   }
  }
  return {row,heads:heads.sort((a,b)=>a.x-b.x)};
 }).filter(v=>v.heads.length>=2&&new Set(v.heads.map(h=>h.number)).size===v.heads.length);
 const header=allHeaders.sort((a,b)=>b.heads.length-a.heads.length)[0];
 if(!header)return [];
 const heads=header.heads,n=heads.length;
 const maxDistance=n>1?(heads.at(-1).x-heads[0].x)/(n-1):999;
 const nearest=x=>heads.reduce((best,h,j)=>Math.abs(h.x-x)<Math.abs(heads[best].x-x)?j:best,0);
 const lower=rows.filter(r=>r.y<header.row.y-3);
 const raw=[];
 for(const row of lower){
  const byBM=new Map();
  for(const part of row.parts){
   const matches=[...part.s.matchAll(/(?:^|[^\d])(\d{1,3}(?:[.,]\d{1,3})?)\s*%/g)];
   for(const m of matches){
    const offset=m.index+(m[0].match(/^\D*/)?.[0].length||0);
    const x=part.x+(Number(part.width)||part.s.length*4)*(offset/Math.max(part.s.length,1));
    const ix=nearest(x);
    if(Math.abs(x-heads[ix].x)>maxDistance*0.82)continue;
    const value=Number(m[1].replace(',','.'));
    if(!Number.isFinite(value)||value<0||value>100)continue;
    if(!byBM.has(ix))byBM.set(ix,[]);
    byBM.get(ix).push({number:heads[ix].number,value,x});
   }
  }
  if(byBM.size<Math.min(3,n))continue;
  for(const arr of byBM.values())arr.sort((a,b)=>a.x-b.x);
  raw.push({row,byBM});
 }
 const result=[];
 for(let rank=0;rank<raw.length;rank++){
  const {row,byBM}=raw[rank],groups=new Map();
  for(const [j,values] of byBM){
   for(let k=0;k<Math.min(values.length,2);k++){
    const group=values.length===1?'TOTAL':(k===0?'COLUNA 1':'COLUNA 2');
    if(!groups.has(group))groups.set(group,[]);
    groups.get(group).push({number:heads[j].number,value:values[k].value,page:pageNo});
   }
  }
  const leading=row.parts.filter(p=>p.x<heads[0].x-maxDistance*.45).map(p=>p.s).join(' ');
  const nearby=rows.filter(r=>r.y>row.y&&r.y<row.y+12).map(r=>r.text).join(' ');
  const context=(leading+' '+nearby).slice(0,240);
  const normalized=context.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  let semantic='';
  if(/ACUMULAD/.test(normalized)&&/(FISIC|EVOLU|EXECU|PERCENT)/.test(normalized)){
   if(/PREVIST|PLANEJAD|PROGRAMAD/.test(normalized))semantic='percentualPrevistoAcumulado';
   if(/REALIZAD|EXECUTAD|MEDID/.test(normalized))semantic='percentualRealizadoAcumulado';
  }
  for(const [group,values] of groups){
   values.sort((a,b)=>a.number-b.number);
   if(values.length<Math.min(2,n))continue;
   const seriesKey='linha-'+String(rank+1).padStart(2,'0')+'-'+group.replace(/ /g,'');
   result.push({key:seriesKey,rank:rank+1,group,page:pageNo,values,semantic,
    note:context.trim().slice(0,100),sample:values.slice(0,4).map(v=>'BM '+v.number+': '+v.value.toLocaleString('pt-BR')+'%').join(' · ')});
  }
 }
 return result;
}
function metadata(text){
 const src=String(text||'');
 const take=(rx)=>src.match(rx)?.[1]?.trim()||'';
 return {contract:take(/CONTRATO\s*:\s*([^\n]+)/i),contractor:take(/CONTRATADA\s*:\s*([^\n]+)/i),
 serviceOrder:take(/ORDEM\s+DE\s+SERVI[CÇ]O\s*:\s*([^\n]+)/i),
 object:take(/OBJETO\s*:\s*([^\n]{15,600})/i),bm:take(/MEDI[CÇ][ÃA]O\s*:\s*(\d{1,3})/i)};
}
const cache=new Map();
async function extract(doc){
 if(cache.has(doc.id))return cache.get(doc.id);
 const blob=await window.PUCDocLibrary?.getBlob?.(doc.id);
 if(!blob)throw Error('PDF não preservado na biblioteca local. Reimporte em Documentos → SEI.');
 for(let k=0;k<15&&!window.pdfjsLib?.getDocument;k++)await new Promise(ok=>setTimeout(ok,200));
 if(!window.pdfjsLib?.getDocument)throw Error('Leitor PDF.js indisponível. Confira a conexão e atualize a página.');
 if(window.pdfjsLib.GlobalWorkerOptions)window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 if(blob.size>35*1024*1024)throw Error('PDF acima de 35 MB; confira o arquivo original.');
 const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;
 const pages=Math.min(pdf.numPages,65),truncated=pdf.numPages>65,records=[],meta=[],wide=[];
 try{
  for(let p=1;p<=pages;p++){
   const items=(await (await pdf.getPage(p)).getTextContent()).items;
   const widePage=widePageCandidates(items,p),fixed=parsePage(items,p);
   const paired=widePage.some(v=>v.group==='COLUNA 2');
   const knownFixed=fixed.filter(v=>Number.isFinite(v.percentualPrevistoAcumulado)||
     Number.isFinite(v.percentualRealizadoAcumulado)).length>=2;
   // Preserva PDFs do leiaute tradicional e evita usar seus deslocamentos
   // absolutos em tabelas largas de duas colunas por BM.
   if(knownFixed&&!paired)records.push(...fixed);
   else if(widePage.length)wide.push(...widePage);
   else records.push(...fixed);
   if(p===1||p===pages)meta.push(rowsFromItems(items).slice(0,36).map(r=>r.text).join('\n'));
  }
 }finally{try{await pdf.destroy()}catch(e){}}
 const byNumber=new Map(),warnings=[];
 if(truncated)warnings.push('PDF com '+pdf.numPages+' páginas: leitura limitada a 65 páginas; histórico pode estar incompleto.');
 for(const row of records){
  if(!Number.isInteger(row.number)||row.number<0||row.number>999)continue;
  for(const key of ['percentualPrevistoParcial','percentualRealizadoParcial','percentualPrevistoAcumulado','percentualRealizadoAcumulado']){
   if(!Number.isFinite(row[key])||row[key]<0||row[key]>100)delete row[key];
  }
  for(const key of ['financeiroPrevistoParcial','financeiroRealizadoParcial','financeiroPrevistoAcumulado','financeiroRealizadoAcumulado']){
   if(!Number.isFinite(row[key])||row[key]<0)delete row[key];
  }
  if(row.day!=null&&(!Number.isFinite(row.day)||row.day<0))row.day=null;
  if(!byNumber.has(row.number)){byNumber.set(row.number,row);continue}
  const prior=byNumber.get(row.number),merged={...prior};
  for(const [key,value] of Object.entries(row)){
   if(value==null)continue;
   if(key!=='page'&&key!=='number'&&Number.isFinite(merged[key])&&Number.isFinite(value)&&merged[key]!==value){
    warnings.push('BM '+row.number+': valores conflitantes em páginas distintas; conferir a série.');
    delete merged[key];continue;
   }
   if(merged[key]==null)merged[key]=value;
  }
  byNumber.set(row.number,merged);
 }
 const points=[...byNumber.values()].sort((a,b)=>a.number-b.number);
 if((points.length<2||!points.some(p=>Number.isFinite(p.percentualPrevistoAcumulado)||Number.isFinite(p.percentualRealizadoAcumulado)))&&!wide.length)
  throw Error('Histórico acumulado insuficiente neste PDF; consulte BMs individuais conferidos.');
 for(const key of ['percentualPrevistoAcumulado','percentualRealizadoAcumulado']){
  const series=points.filter(p=>Number.isFinite(p[key]));
  if(series.some((p,i)=>i>0&&p[key]<series[i-1][key]-.01))
   warnings.push('A série '+(key.includes('Previsto')?'prevista':'realizada')+' diminui entre BMs. Verificar retificações.');
 }
 const result={doc,points,pages,wideCandidates:wide,meta:metadata(meta.join('\n')+'\n'+String(doc.text||'')),warnings:[...new Set(warnings)]};
 cache.set(doc.id,result);
 return result;
}
/* Histórico completo: leitura de cada BM vinculado, sem inferência de dados ausentes.
   Uma divergência de percentuais para o mesmo BM é marcada e retirada do gráfico. */
function bmIndex(v){
 const raw=String(v??'').trim(),m=raw.match(/^(?:BM\s*)?0*(\d{1,3})$/i);
 return m?Number(m[1]):null;
}
function singleBmPoint(doc,projectId=currentProject()){
 const row=reviewedRow(doc,projectId);
 const parsed=window.PUCFichasBM?.parseBmText?.(doc.text||'',doc.name)||{};
 const guess=doc.name.match(/(?:^|[^\w])BM[\s_.-]*(?:N[º°. ]*)?0*(\d{1,3})(?!\d)/i)?.[1];
 const number=bmIndex(row?.number)??bmIndex(doc.bmNumber)??bmIndex(parsed.bm_number)??bmIndex(guess);
 if(number===null)return null;
 const raw=row?.physical!=null?row.physical:parsed.physical_cumulative;
 if(raw===null||raw===undefined||raw==='')return null;
 const value=Number(raw);
 if(!Number.isFinite(value)||value<0||value>100)return null;
 return {number,percentualRealizadoAcumulado:value,date:row?.date||parsed.measurement_date||'',
  sourceName:doc.name,page:null,confidence:row?.status==='confirmado'?'Conferido pelo operador':'Candidato não conferido',
  originDoc:doc.id};
}
function uniteHistory(parts){
 const data=new Map(),conflicts=new Set(),alerts=[];
 const numberFields=['percentualRealizadoAcumulado','percentualPrevistoAcumulado','percentualPrevistoParcial',
   'percentualRealizadoParcial','financeiroPrevistoParcial','financeiroRealizadoParcial',
   'financeiroPrevistoAcumulado','financeiroRealizadoAcumulado','day'];
 for(const item of parts){
  const number=bmIndex(item.number);if(number===null)continue;
  if(!data.has(number))data.set(number,{number,day:null,page:null,sourceName:'',sources:[],confidence:'Candidato não conferido'});
  const dst=data.get(number);
  const source=String(item.sourceName||'Documento não especificado');
  if(!dst.sources.includes(source))dst.sources.push(source);
  if(!dst.sourceName)dst.sourceName=source;
  if(item.confidence==='Conferido pelo operador')dst.confidence='Conferido pelo operador';
  if(item.page!=null&&dst.page==null)dst.page=item.page;
  if(item.date&&!dst.date)dst.date=item.date;
  for(const key of numberFields){
   const value=item[key];
   if(!Number.isFinite(value))continue;
   const conflictKey=number+':'+key;
   if(conflicts.has(conflictKey))continue;
   if(Number.isFinite(dst[key])&&Math.abs(dst[key]-value)>0.02){
    delete dst[key];
    conflicts.add(conflictKey);
    alerts.push('BM '+number+': divergência em '+key+' entre documentos. Ponto omitido até conferência.');
   }else dst[key]=value;
  }
 }
 const points=[...data.values()].sort((a,b)=>a.number-b.number);
 for(const key of ['percentualPrevistoAcumulado','percentualRealizadoAcumulado']){
  const series=points.filter(p=>Number.isFinite(p[key]));
  if(series.some((p,i)=>i>0&&p[key]<series[i-1][key]-.01))
   alerts.push('Percentual '+(key.includes('Previsto')?'previsto':'realizado')+' acumulado diminui entre BMs. Verificar eventuais retificações.');
 }
 const usable=points.filter(p=>Number.isFinite(p.percentualPrevistoAcumulado)||Number.isFinite(p.percentualRealizadoAcumulado));
 const gaps=[];
 for(let n=1;n<points.length;n++)if(points[n].number-points[n-1].number>1)
  gaps.push('Entre BM '+points[n-1].number+' e BM '+points[n].number+' há medições sem ponto identificado.');
 return {points:usable,warnings:[...new Set([...alerts,...gaps])],allPoints:points,conflicts};
}
async function consolidate(docs,progress=()=>{},stillCurrent=()=>true,projectId=currentProject()){
 if(!docs.length)throw Error('Nenhum BM vinculado ao empreendimento e ao contrato selecionados.');
 const codes=docs.map(d=>({doc:d,...docContract(d,projectId)}));
 const conflicts=codes.filter(x=>x.conflict);
 const identifiable=[...new Set(codes.filter(x=>!x.conflict).map(x=>x.contract).filter(Boolean))];
 if(!currentContract()&&identifiable.length>1)throw Error('Há BMs com contratos distintos ('+identifiable.join(', ')+'). Selecione um contrato antes de consolidar.');
 const target=contractCode(currentContract())||identifiable[0]||'';
 const input=codes.filter(x=>!x.conflict&&(target?
    (x.contract===target||!x.contract):!x.contract));
 const noContract=input.filter(x=>!x.contract);
 const evidenceWarnings=noContract.map(x=>x.doc.name+
   ': contrato não reconhecido automaticamente. Vinculação provisória ao filtro; confira o instrumento antes da validação.');
 const omissions=[...conflicts.map(x=>x.doc.name+': '+x.conflict),
   ...codes.filter(x=>!x.conflict&&(!input.some(d=>d.doc.id===x.doc.id)))
      .map(x=>x.doc.name+': contrato não identificado ou diferente; não consolidado.')];
 const parts=[],sources=[],wideCandidates=[],warningDetails=[...omissions,...evidenceWarnings];
 let totalPages=0,usedHistorical=0;
 for(let i=0;i<input.length;i++){
  if(!stillCurrent())return null;
  const d=input[i].doc,review=reviewedRow(d,projectId),evidence={name:d.name,reference:d.ref||'',bm:review?.number||d.bmNumber||'',
   contract:input[i].contract||'Não identificado — conferir',status:review?.status==='confirmado'?'Conferido':'Pendente',
   historic:'Não identificado',physical:'Ausente'};
  sources.push(evidence);
  const single=singleBmPoint(d,projectId);
  if(single){parts.push(single);evidence.physical=pct(single.percentualRealizadoAcumulado);}
  progress(i,input.length,'Examinando BM '+(i+1)+' de '+input.length+' · '+d.name);
  if(/\.pdf$/i.test(d.name)){
   try{
    const history=await extract(d);
    if(!stillCurrent())return null;
    for(const point of history.points)parts.push({...point,sourceName:d.name,originDoc:d.id,
      confidence:review?.status==='confirmado'?'Conferido pelo operador':'Extração não conferida'});
    for(const candidate of history.wideCandidates||[]){
      const scoped={...candidate,key:d.id+'::'+candidate.key,sourceName:d.name,sourceDocId:d.id};
      wideCandidates.push(scoped);
      const dest=candidate.semantic&&candidate.group==='TOTAL'?candidate.semantic:
        (candidateMap.percentualPrevistoAcumulado===scoped.key?'percentualPrevistoAcumulado':
         candidateMap.percentualRealizadoAcumulado===scoped.key?'percentualRealizadoAcumulado':'');
      if(dest)for(const val of candidate.values)parts.push({
        number:val.number,[dest]:val.value,sourceName:d.name,originDoc:d.id,page:candidate.page,
        confidence:candidate.semantic?'Rótulo identificado':'Linha selecionada pelo operador'
      });
    }
    evidence.historic=history.points.length+' ponto(s) históricos'+(history.wideCandidates?.length?
      ' · '+history.wideCandidates.length+' linha(s) percentuais identificadas':'');
    const latest=[...history.points].reverse().find(p=>Number.isFinite(p.percentualRealizadoAcumulado));
    if(latest&&!single)evidence.physical=pct(latest.percentualRealizadoAcumulado)+' (tabela histórica)';
    totalPages+=history.pages;
    usedHistorical++;
    warningDetails.push(...history.warnings.map(w=>d.name+': '+w));
   }catch(e){
    evidence.historic='Sem quadro histórico extraível';
    // Single-BM results from the stored document remain available even without a full PDF table.
    if(!single)warningDetails.push(d.name+': '+String(e.message||e).slice(0,180));
   }
  }
 }
 const merged=uniteHistory(parts);
 const candidateRows=[...new Map(wideCandidates.map(x=>[x.key,x])).values()].sort((a,b)=>a.rank-b.rank||a.group.localeCompare(b.group));
 const usable=merged.points;
 if(!usable.length){
  return {points:[],meta:{contract:target},doc:{id:'todos',name:'Todos os BMs vinculados',ref:'Documentos → SEI'},
   warnings:[...new Set([...warningDetails,...merged.warnings])],sources,pages:totalPages,
   usedHistorical,scanned:input.length,excluded:omissions.length,candidateRows};
 }
 const recent=docs.find(d=>/CURVA[\s_.-]*S/i.test(d.name))||docs[0];
 return {points:usable,meta:{...metadata(recent?.text||''),contract:target},doc:{id:'todos',name:input.length+' boletim(ns) do contrato',ref:'Documentos → SEI'},
  warnings:[...new Set([...warningDetails,...merged.warnings])],sources,pages:totalPages,
  usedHistorical,scanned:input.length,excluded:omissions.length,candidateRows};
}

function svgChart(points){
 const width=1100,height=350,left=68,right=22,top=20,bottom=62;
 const useDays=points.length>1&&points.every(p=>Number.isFinite(p.day))&&points.every((p,i)=>i===0||p.day>points[i-1].day);
 const scale=p=>useDays?p.day:p.number,positions=points.map(scale),min=Math.min(...positions),max=Math.max(...positions);
 const x=p=>left+(min===max?(width-left-right)/2:(width-left-right)*(scale(p)-min)/(max-min));
 const y=v=>top+(height-top-bottom)*(1-v/100);
 const axes=[0,20,40,60,80,100].map(v=>'<line x1="'+left+'" y1="'+y(v)+'" x2="'+(width-right)+'" y2="'+y(v)+'" stroke="#e0e7ef"/><text x="'+(left-9)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="12" fill="#40536b">'+v+'%</text>').join('');
 const series=(key,color)=>{
  const segments=[];let buffer=[];
  for(const p of points){if(Number.isFinite(p[key]))buffer.push(p);else if(buffer.length){segments.push(buffer);buffer=[]}}
  if(buffer.length)segments.push(buffer);
  // Values not present in a particular BM remain gaps, never inferred.
  return segments.filter(a=>a.length>1).map(seg=>'<polyline points="'+seg.map(p=>x(p).toFixed(1)+','+y(p[key]).toFixed(1)).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linejoin="round"/>').join('')+
   points.filter(p=>Number.isFinite(p[key])).map(p=>'<circle cx="'+x(p).toFixed(1)+'" cy="'+y(p[key]).toFixed(1)+'" r="4" fill="'+color+'"><title>BM '+p.number+' · '+pct(p[key])+'</title></circle>').join('');
 };
 const ticks=points.filter((p,i)=>i===0||i===points.length-1||i%Math.max(1,Math.ceil(points.length/12))===0).map(p=>'<text x="'+x(p).toFixed(1)+'" y="'+(height-28)+'" text-anchor="middle" font-size="11" fill="#40536b">'+(useDays?p.day:'BM '+p.number)+'</text>').join('');
 const labelKey=points.some(p=>Number.isFinite(p.percentualRealizadoAcumulado))?'percentualRealizadoAcumulado':'percentualPrevistoAcumulado';
 const visible=points.filter(p=>Number.isFinite(p[labelKey]));
 const jump=Math.max(1,Math.ceil(visible.length/16));
 const labels=visible.filter((p,i)=>i===0||i===visible.length-1||i%jump===0)
  .map(p=>'<text x="'+x(p).toFixed(1)+'" y="'+Math.max(12,y(p[labelKey])-10).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="600" fill="#28546c">'+
   p[labelKey].toLocaleString('pt-BR',{maximumFractionDigits:1})+'%</text>').join('');
 return '<svg class="puc-curva-svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Curva S dos percentuais documentados: previsto azul, realizado verde" xmlns="http://www.w3.org/2000/svg">'+axes+
 series('percentualPrevistoAcumulado','#3977c5')+series('percentualRealizadoAcumulado','#5cbb83')+
 labels+ticks+'<text x="'+(width/2)+'" y="'+(height-8)+'" text-anchor="middle" font-size="12">'+(useDays?'Dias transcorridos conforme o BM':'Sequência dos boletins (BM)')+'</text></svg>';
}
function horizontalTable(points){
 const chunks=[];for(let i=0;i<points.length;i+=14)chunks.push(points.slice(i,i+14));
 const build=items=>{
  const header=items.map(p=>'<th>BM '+String(p.number).padStart(2,'0')+'</th>').join('');
  const line=(title,key,formatter,kind)=>'<tr class="puc-curva-row-'+kind+'"><th>'+title+'</th>'+items.map(p=>'<td>'+formatter(Number.isFinite(p[key])?p[key]:null)+'</td>').join('')+'</tr>';
  const rawLine=(title,key)=>'<tr class="puc-curva-row-neutral"><th>'+title+'</th>'+items.map(p=>'<td title="'+esc(p[key]||'')+'">'+esc(String(p[key]||'—').slice(0,32))+'</td>').join('')+'</tr>';
  return '<div class="puc-curva-table-scroll"><table class="puc-curva-table"><thead><tr><th>Indicador</th>'+header+'</tr></thead><tbody>'+
   rawLine('Arquivo de origem','sourceName')+
   rawLine('Conferência','confidence')+
   rawLine('Data identificada','date')+
   line('Página do PDF','page',v=>v===null?'—':v,'neutral')+
   line('Período (dias)','day',v=>v===null?'—':v,'neutral')+
   line('Previsto (parcial) — R$','financeiroPrevistoParcial',money,'plan')+
   line('Realizado (parcial) — R$','financeiroRealizadoParcial',money,'real')+
   line('Previsto (acumulado) — R$','financeiroPrevistoAcumulado',money,'plan')+
   line('Realizado (acumulado) — R$','financeiroRealizadoAcumulado',money,'real')+
   line('Previsto (parcial) — %','percentualPrevistoParcial',pct,'plan')+
   line('Realizado (parcial) — %','percentualRealizadoParcial',pct,'real')+
   line('Previsto (acumulado) — %','percentualPrevistoAcumulado',pct,'plan')+
   line('Realizado (acumulado) — %','percentualRealizadoAcumulado',pct,'real')+
   '</tbody></table></div>';
 };
 return chunks.map((items,i)=>'<section class="puc-curva-table-block"><h5>Histórico BM '+items[0].number+' a BM '+items[items.length-1].number+'</h5>'+build(items)+'</section>').join('');
}

function parseTranscribedHistory(text,reference){
 const src=String(text||'').trim(),ref=String(reference||'').trim();
 if(!ref)throw Error('Informe a referência do BM ou processo SEI para rastreabilidade.');
 const rows=src.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(rows.length<2||rows.length>500)throw Error('Informe entre 2 e 500 medições, uma por linha.');
 const points=[],seen=new Set();
 for(const line of rows){
  const cols=line.includes('\t')?line.split('\t'):line.split(';');
  if(cols.length<3||cols.length>5)throw Error('Formato: BM; previsto acumulado (%); realizado acumulado (%).');
  const bm=(cols[0]||'').trim().match(/^(?:BM\s*)?0*(\d{1,3})$/i);
  if(!bm){
   if(points.length===0&&/BM|MEDI[CÇ][ÃA]O|N[ÚU]MERO/i.test(cols[0]||''))continue;
   throw Error('Número de BM inválido: '+String(cols[0]).slice(0,35));
  }
  const number=Number(bm[1]);
  if(seen.has(number))throw Error('BM repetido: '+number+'. Confira retificações antes de consolidar.');
  seen.add(number);
  const readPercent=(value)=>{
   const v=String(value||'').trim();
   if(!v)return null;
   if(!/^\d{1,3}(?:[,.]\d{1,3})?\s*%?$/.test(v))throw Error('Percentual inválido no BM '+number+': '+v.slice(0,25));
   const num=Number(v.replace('%','').replace(',','.'));
   if(!Number.isFinite(num)||num>100)throw Error('Percentual acima de 100% no BM '+number);
   return num;
  };
  const prev=readPercent(cols[1]),real=readPercent(cols[2]);
  if(prev===null&&real===null)continue;
  const point={number,sourceName:ref,confidence:'Transcrição do operador',page:null};
  if(prev!==null)point.percentualPrevistoAcumulado=prev;
  if(real!==null)point.percentualRealizadoAcumulado=real;
  points.push(point);
 }
 points.sort((a,b)=>a.number-b.number);
 if(points.length<2)throw Error('São necessários dois ou mais BMs com percentuais para traçar a Curva S.');
 return {points,reference:ref};
}

function sourceAudit(result){
 const sources=result.sources||[];
 if(!sources.length)return '';
 const rows=sources.map(s=>'<tr><td>'+esc(s.bm||'—')+'</td><td>'+esc(s.name)+'</td><td>'+esc(s.contract)+'</td>'+
  '<td>'+esc(s.physical)+'</td><td>'+esc(s.historic)+'</td><td>'+esc(s.status)+'</td></tr>').join('');
 return '<section class="puc-curva-audit"><h4>Documentos examinados e rastreabilidade</h4>'+
  '<p class="puc-curva-note">Cada linha corresponde a um BM da biblioteca local. Os candidatos não conferidos são usados apenas na prévia documental; não constituem medição validada.</p>'+
  '<div class="puc-curva-table-scroll"><table class="puc-curva-table"><thead><tr>'+
  '<th>BM</th><th>Arquivo SEI</th><th>Contrato</th><th>Físico acumulado</th><th>Histórico no PDF</th><th>Situação</th>'+
  '</tr></thead><tbody>'+rows+'</tbody></table></div></section>';
}

function layout(result,projectId=currentProject()){
 const {points,meta,doc,warnings}=result;
 let projects=[];try{projects=JSON.parse(byId('embedded-data')?.textContent||'{}').projetos||[]}catch(e){}
 const project=projects.find(p=>p.id===projectId);
 const actual=[...points].reverse().find(p=>Number.isFinite(p.percentualRealizadoAcumulado));
 const planned=[...points].reverse().find(p=>Number.isFinite(p.percentualPrevistoAcumulado));
 const comparable=actual&&planned&&actual.number===planned.number;
 const delta=comparable?+(actual.percentualRealizadoAcumulado-planned.percentualPrevistoAcumulado).toFixed(2):null;
 const box=(label,value)=>'<div><small>'+label+'</small><strong>'+value+'</strong></div>';
 const source=[doc.ref,doc.name].filter(Boolean).join(' · ');
 const alert=warnings.length?'<p class="puc-curva-alert">'+[...new Set(warnings)].map(esc).join(' · ')+'</p>':'';
 return '<div class="puc-curva-report" data-doc-id="'+esc(doc.id)+'">'+
 '<header><div><h3>CURVA S — Acompanhamento contratual</h3><small>Documento: '+esc(source)+'</small></div><span class="puc-curva-warning">'+(result.manual?'TRANSCRIÇÃO':'EXTRAÇÃO')+' A CONFERIR · NÃO HOMOLOGADA</span></header>'+
 '<div class="puc-curva-meta">'+
 box('Empreendimento',esc(project?.empreendimento||doc.workName||'Vínculo não comprovado'))+
 box('Contrato',esc(meta.contract||currentContract()||'Não identificado'))+
 box('Contratada',esc(meta.contractor||'Não identificada'))+
 box('Ordem de serviço',esc(meta.serviceOrder||'Não identificada'))+
 box('BM de referência',result.scanned?'Consolidado de '+result.scanned+' arquivo(s)':esc(meta.bm||doc.bmNumber||'Não identificado'))+
 box('PUC / UF',esc((projectId||'—')+' / '+(project?.uf||'—')))+
 '<div class="puc-curva-obj"><small>Objeto contratual</small><strong>'+esc(meta.object||doc.workName||project?.empreendimento||'Não identificado')+'</strong></div></div>'+
 '<div class="puc-curva-kpis">'+
 box('Pontos consolidados',String(points.length))+
 box('Documentos BM examinados',String(result.scanned??1))+
 box('Último realizado acumulado',actual?pct(actual.percentualRealizadoAcumulado):'—')+
 box('Previsto na mesma medição',comparable?pct(planned.percentualPrevistoAcumulado):'—')+
 box('Desvio realizado – previsto',delta===null?'Não comparável':(delta>0?'+':'')+delta.toLocaleString('pt-BR',{maximumFractionDigits:2})+' p.p.')+
 '</div>'+alert+
 '<h4>Curva S — percentuais acumulados documentados</h4>'+svgChart(points)+
 '<div class="puc-curva-legend"><span><i style="background:#3977c5"></i> Previsto acumulado</span><span><i style="background:#5cbb83"></i> Realizado acumulado</span></div>'+
 '<h4>Histórico das medições — previsto e realizado</h4>'+horizontalTable(points)+sourceAudit(result)+
 '<p class="puc-curva-note">Histórico consolidado dos BMs vinculados ao empreendimento/contrato. Percentuais históricos são extraídos das tabelas nos PDFs; percentuais físicos individuais podem aparecer como prévia documental não conferida. Sem estimativas, somatório de percentuais de BMs ou interpolação de períodos ausentes. O gráfico não constitui execução física homologada, pagamento ou lançamento no SIOP.</p>'+
 '<p class="puc-curva-note">Fonte: '+esc(source)+' · '+result.pages+' página(s) examinada(s) · Emitido em '+new Date().toLocaleString('pt-BR')+'. Conferir contrato, objeto, sequência e valores com o documento original antes de usar na decisão.</p></div>';
}
let generation=0,activeReport=null,selectedBmIds=new Set(),selectionScope='',selectionEdited=false,
    candidateMap={percentualPrevistoAcumulado:'',percentualRealizadoAcumulado:''},candidateScope='',availableCandidateRows=[];

const ALL='__todos_bms__';
const contractCode=s=>{
 const input=String(s??'').toUpperCase();
 const found=input.match(/\b\d{1,6}\s*[\/.\-]\s*(?:20)?\d{2,4}\b/);
 return found?found[0].replace(/\s/g,'').replace(/[.\-]/g,'/'):input.trim().replace(/\s+/g,' ');
};
function reviewedRow(doc,projectId=currentProject()){
 const id=projectId;
 return (window.PUCFichasBM?.getState?.()?.bmRows||[]).find(
  r=>r.project===id&&r.sourceDocId===doc.id&&r.status!=='ignorado'
 )||null;
}
function docContract(doc,projectId=currentProject()){
 const reviewed=reviewedRow(doc,projectId);
 const meta=metadata(doc.text||'');
 const fromText=meta.contract||((doc.text||'').match(/(?:CONTRATO(?:\s+N[°ºO.]*)?\s*[:\s-]+)(\d{1,6}\s*[\/.\-]\s*(?:20)?\d{2,4})/i)?.[1]||'');
 // A reviewed contract has priority; it must be consistent with the PDF when available.
 const a=contractCode(reviewed?.contract),b=contractCode(fromText);
 if(a&&b&&a!==b)return {contract:'',conflict:'Contrato divergente na ficha e no PDF: '+a+' × '+b};
 return {contract:a||b,conflict:''};
}
function availableDocuments(){
 const docs=selected(),contract=contractCode(currentContract());
 if(!contract)return docs;
 // PDFs sem número contratual reconhecível permanecem selecionáveis como candidatos, mas nunca são homologados.
 return docs.filter(d=>{const c=docContract(d);return !c.conflict&&(c.contract===contract||!c.contract)});
}
function syncDocuments(){
 const list=byId('puc-curva-bms-list'),status=byId('puc-curva-document-status'),counter=byId('puc-curva-bms-counter');
 if(!list)return null;
 const docs=availableDocuments().slice().sort((a,b)=>{
  const n=d=>Number(reviewedRow(d)?.number||d.bmNumber||9999);
  return n(a)-n(b)||a.name.localeCompare(b.name,'pt-BR',{numeric:true});
 });
 const scope=currentProjects().join('|')+'|'+contractCode(currentContract());
 if(scope!==selectionScope){selectedBmIds=new Set(docs.map(d=>d.id));selectionScope=scope;selectionEdited=false}
 const valid=new Set(docs.map(d=>d.id));
 selectedBmIds=new Set([...selectedBmIds].filter(id=>valid.has(id)));
 if(!selectionEdited)for(const d of docs)selectedBmIds.add(d.id);
 const query=(byId('puc-curva-bms-search')?.value||'').toLocaleLowerCase('pt-BR').trim();
 const visible=query?docs.filter(d=>{
  const r=reviewedRow(d);
  return [d.name,d.ref,d.bmNumber,d.bmPeriod,d.workName,r?.number,r?.contract]
    .some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(query));
 }):docs;
 list.innerHTML=visible.map(d=>{
  const matched=currentProjects().filter(id=>belongsToProject(d,id));
  const r=reviewedRow(d,matched[0]||currentProject()),bm=r?.number||d.bmNumber||'?';
  const situation=r?.status==='confirmado'?'Conferido':r?.status==='pendente'?'Pendente':'Não incorporado';
  return '<label class="puc-curva-bm-option"><input type="checkbox" data-curva-id="'+esc(d.id)+'" '+
   (selectedBmIds.has(d.id)?'checked':'')+'><span class="puc-curva-bm-detail"><strong>BM '+esc(bm)+' · '+esc(d.name)+'</strong>'+
   '<small>'+esc(matched.join(' + ')+' · '+(r?.contract||docContract(d,matched[0]).contract||'Contrato não identificado')+' · '+situation)+
   '</small></span></label>';
 }).join('')||'<p class="puc-curva-note">Nenhum BM corresponde à pesquisa.</p>';
 const active=docs.filter(d=>selectedBmIds.has(d.id));
 if(counter)counter.textContent=active.length+' de '+docs.length+' BM(s) selecionados'+(query?' · '+visible.length+' exibido(s)':'');
 if(!currentProject())status.textContent='Selecione primeiro o empreendimento e o contrato.';
 else if(!docs.length)status.textContent='Nenhum BM vinculado ao empreendimento/contrato. Confira Documentos → SEI.';
 else if(!active.length)status.textContent='Nenhum BM selecionado. Marque um ou mais documentos.';
 else status.textContent=active.length+' BM(s) prontos para consolidar. Somente dados identificados nos documentos serão usados.';
 return {docs:active,available:docs.length};
}
function invalidateSelection(){
 generation++;activeReport=null;
 byId('puc-curva-documental')?.replaceChildren();
 const previous=byId('ficha-print-area');if(previous)previous.hidden=true;
 const status=byId('puc-curva-document-status');
 if(status)status.textContent='Seleção alterada. Clique em “Gerar Curva S dos BMs selecionados” para atualizar o gráfico.';
}
function updateMappingOptions(candidates){
 availableCandidateRows=candidates||[];
 const box=byId('puc-curva-line-mapping'),forecast=byId('puc-curva-line-previsto'),actual=byId('puc-curva-line-realizado');
 if(!box||!forecast||!actual)return;
 box.hidden=!availableCandidateRows.length;
 for(const [select,selectedKey] of [[forecast,candidateMap.percentualPrevistoAcumulado],[actual,candidateMap.percentualRealizadoAcumulado]]){
  select.replaceChildren(new Option('Não identificar automaticamente',''));
  for(const c of availableCandidateRows){
   const choice=new Option('Linha '+String(c.rank).padStart(2,'0')+' · '+c.group+' · '+c.sample+
    ' · '+c.sourceName+' (p. '+c.page+')',c.key);
   select.add(choice);
  }
  select.value=availableCandidateRows.some(c=>c.key===selectedKey)?selectedKey:'';
 }
 const sum=byId('puc-curva-line-info');
 if(sum)sum.textContent=availableCandidateRows.length+' linhas percentuais detectadas na tabela. Confira no PDF qual representa a execução física prevista e/ou realizada. Colunas financeiras não podem ser usadas como físico.';
}
function showLegacy(note){
 const box=byId('puc-curva-documental'),legacy=byId('ficha-print-area');
 if(box)box.replaceChildren();
 if(legacy)legacy.hidden=false;
 activeReport=null;
 if(currentProject())window.PUCFichasBM?.drawSheet?.();
 const state=window.PUCFichasBM?.getState?.(),project=currentProject(),contract=currentContract();
 const related=(state?.bmRows||[]).filter(x=>x.project===project&&x.status!=='ignorado'&&(!contract||x.contract===contract));
 const confirmed=related.filter(x=>x.status==='confirmado'&&x.physical!=null&&Number.isFinite(Number(x.physical)));
 const pending=related.filter(x=>x.status==='pendente');
 const status=byId('puc-curva-document-status');
 if(status)status.textContent=note+
   (confirmed.length?' · '+confirmed.length+' BM(s) conferidos para o gráfico físico.':'')+
   (pending.length?' · '+pending.length+' BM(s) a conferir: utilize o botão Conferir BMs acima.':'')+
   (!confirmed.length&&!pending.length?' · Nenhum BM associado com pontos utilizáveis. Confira o vínculo em Documentos → SEI.':'');
}
async function render(){
 const panel=byId('puc-curva-documental');
 if(!panel)return;
 const id=++generation,selection=syncDocuments();
 const mappingScope=currentProjects().join('|')+'|'+contractCode(currentContract());
 if(candidateScope!==mappingScope){candidateScope=mappingScope;candidateMap={percentualPrevistoAcumulado:'',percentualRealizadoAcumulado:''};updateMappingOptions([])}

 if(!currentProject())return showLegacy('Escolha o empreendimento antes de gerar o histórico dos BMs.');
 if(!selection)return showLegacy('Nenhum BM elegível identificado no projeto e contrato selecionados.');
 const docs=selection.docs;
 const projects=currentProjects();
 if(projects.length>1){
  const status=byId('puc-curva-document-status'),legacy=byId('ficha-print-area');
  activeReport=null;panel.replaceChildren();if(legacy)legacy.hidden=true;
  if(!docs.length){
   status.textContent='Nenhum BM marcado para as PUCs selecionadas. Marque BMs dos empreendimentos desejados.';
   return;
  }
  const cards=[],candidateRows=[],completed=[],problems=[];
  for(const puc of projects){
   if(id!==generation)return;
   const groupDocs=docs.filter(doc=>belongsToProject(doc,puc));
   if(!groupDocs.length){
    cards.push('<section class="puc-curva-group"><h3>'+esc(puc)+'</h3><p>Sem Boletins de Medição vinculados a esta PUC. Confira Documentos → SEI.</p></section>');
    continue;
   }
   // Quando há contratos distintos dentro da mesma PUC, também são separados.
   const buckets=new Map();
   for(const doc of groupDocs){
    const key=docContract(doc,puc).contract||'SEM CONTRATO IDENTIFICADO';
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(doc);
   }
   for(const [contract,group] of buckets){
    if(id!==generation)return;
    status.textContent='Lendo '+group.length+' BM(s) da '+puc+' · '+contract+'...';
    try{
     const result=await consolidate(group,(i,n,txt)=>{
      if(id===generation)status.textContent=puc+' · '+contract+': '+txt+' ('+(i+1)+'/'+n+')';
     },()=>id===generation,puc);
     if(id!==generation||!result)return;
     candidateRows.push(...(result.candidateRows||[]));
     if(result.points.length){
      cards.push('<section class="puc-curva-group"><h3>'+esc(puc)+' · '+esc(contract)+'</h3>'+
       layout(result,puc)+'</section>');
      completed.push({puc,contract,points:result.points.length,documents:result.scanned});
     }else{
      cards.push('<section class="puc-curva-group"><h3>'+esc(puc)+' · '+esc(contract)+'</h3>'+
       '<p class="puc-curva-note">BMs examinados, mas sem histórico físico acumulado identificável. Não foi calculada curva estimada.</p>'+
       sourceAudit(result)+'</section>');
     }
    }catch(e){
     problems.push(puc+' / '+contract+': '+String(e.message||e));
     cards.push('<section class="puc-curva-group"><h3>'+esc(puc)+' · '+esc(contract)+'</h3>'+
      '<p class="puc-curva-alert">'+esc(String(e.message||e))+'</p></section>');
    }
   }
  }
  if(id!==generation)return;
  updateMappingOptions([...new Map(candidateRows.map(c=>[c.key,c])).values()]);
  panel.innerHTML='<p class="puc-curva-group-summary"><b>Seleção conjunta: '+esc(projects.join(' + '))+
   '.</b> Relatórios físicos separados por PUC e contrato. Percentuais e saldos não são somados.</p>'+cards.join('');
  if(completed.length)activeReport={group:true,reports:completed};
  status.textContent=completed.length+' curva(s) documentais emitidas em '+projects.length+
   ' PUC(s). '+problems.length+' pendência(s). Os demais BMs exigem revisão; nenhuma curva foi estimada.';
  return;
 }
 if(!docs.length){
  if(selection.available===0)return showLegacy('Nenhum documento BM vinculado ao filtro. Verifique Documentos → SEI.');
  generation++;
  activeReport=null;panel.replaceChildren();
  const legacy=byId('ficha-print-area');if(legacy)legacy.hidden=true;
  const state=byId('puc-curva-document-status');
  if(state)state.textContent='Nenhum BM marcado. Selecione pelo menos um BM para calcular a Curva S.';
  return;
 }
 const status=byId('puc-curva-document-status');
 activeReport=null;
 panel.replaceChildren();
 const legacy=byId('ficha-print-area');
 if(legacy)legacy.hidden=true;
 status.textContent='Preparando histórico de '+docs.length+' boletim(ns) da obra...';
 try{
  const result=await consolidate(docs,(i,total,text)=>{
   if(id===generation)status.textContent=text+' ('+(i+1)+'/'+total+')';
  },()=>id===generation);
  if(id!==generation||!result)return;
  updateMappingOptions(result.candidateRows||[]);
  if(!result.points.length){
   activeReport=null;
   const old=byId('ficha-print-area');if(old)old.hidden=true;
   const state=byId('puc-curva-document-status');
   if(state)state.textContent='Foram examinados '+result.scanned+' BM(s), mas ainda não existe uma série física identificada. '+
     ((result.candidateRows||[]).length?'Selecione a linha percentual correta na tabela acima.':'Confira os BMs originais: valores podem estar somente em imagem ou sem rótulo físico.');
   panel.replaceChildren();
   panel.innerHTML='<div class="puc-curva-empty-audit"><h4>Diagnóstico dos BMs examinados</h4>'+
     sourceAudit(result)+
     '<p class="puc-curva-alert">'+(result.warnings.length?
      result.warnings.slice(0,9).map(esc).join(' · '):
      'Os PDFs podem conter quadros de imagens sem texto reconhecível. Confira os BMs originais ou informe os percentuais físicos na tabela de conferência.')+
     '</p></div>';
   return;
  }
  panel.innerHTML=layout(result);
  activeReport=result;
  if(legacy)legacy.hidden=true;
  const pending=(result.sources||[]).filter(x=>x.status!=='Conferido').length;
  const missing=(result.sources||[]).filter(x=>x.physical==='Ausente'&&x.historic==='Sem quadro histórico extraível').length;
  const planned=result.points.filter(p=>Number.isFinite(p.percentualPrevistoAcumulado)).length;
  const actual=result.points.filter(p=>Number.isFinite(p.percentualRealizadoAcumulado)).length;
  status.textContent='Histórico reunido: '+result.scanned+' BM(s) examinados; '+
    result.points.length+' medições com dados utilizáveis, '+planned+' pontos previstos, '+
    actual+' realizados. '+pending+' documento(s) sem conferência; '+missing+' sem percentual utilizável. Extração sujeita à validação técnica.';
 }catch(e){
  if(id!==generation)return;
  showLegacy('Falha na consolidação do histórico dos BMs: '+String(e.message||e));
 }
}
function setup(){
 const root=byId('ficha-result-panel');if(!root||byId('puc-curva-documental'))return;
 const box=document.createElement('div');box.id='puc-curva-documental-wrap';
 box.innerHTML='<div class="puc-curva-chooser"><div class="puc-curva-bm-heading"><label>Boletins de Medição — seleção simultânea</label><span id="puc-curva-bms-counter" class="puc-curva-note"></span></div>'+
 '<div class="puc-curva-bm-toolbar"><input type="search" id="puc-curva-bms-search" placeholder="Pesquisar BM, arquivo ou contrato" aria-label="Pesquisar BMs da Curva S">'+
 '<button type="button" class="btn secondary" id="puc-curva-select-all">Selecionar todos</button>'+
 '<button type="button" class="btn secondary" id="puc-curva-select-none">Limpar seleção</button></div>'+
 '<div id="puc-curva-bms-list" class="puc-curva-bms-list" role="group" aria-label="Boletins selecionáveis para Curva S"></div>'+
 '<div class="puc-curva-line-mapping" id="puc-curva-line-mapping" hidden><strong>Identificação das linhas da tabela horizontal</strong><p class="puc-curva-note" id="puc-curva-line-info"></p>'+
 '<div class="puc-curva-mapping-fields"><label>Previsto físico acumulado<select id="puc-curva-line-previsto"></select></label>'+
 '<label>Realizado físico acumulado<select id="puc-curva-line-realizado"></select></label></div>'+
 '<p class="puc-curva-note">Selecione apenas a linha comprovada pelo título do documento. Os valores continuam identificados como extração não homologada.</p></div>'+
  '<details class="puc-curva-manual"><summary>PDF digitalizado sem texto? Inserir percentuais conferidos do documento</summary>'+
 '<p class="puc-curva-note">Alternativa para tabela que não possa ser lida automaticamente: cole os dados do quadro oficial, uma linha por BM, sem inventar valores. Os registros permanecem somente nesta sessão.</p>'+
 '<label>Referência do BM/SEI <input id="puc-curva-manual-ref" type="text" placeholder="Documento SEI, contrato e página" maxlength="220"></label>'+
 '<label>BM; previsto físico acumulado (%); realizado físico acumulado (%)<textarea id="puc-curva-manual-data" rows="6" placeholder="BM;Previsto;Realizado&#10;25;55,00%;48,70%&#10;26;58,00%;51,27%" spellcheck="false"></textarea></label>'+
 '<button type="button" class="btn secondary" id="puc-curva-manual-generate">Gerar prévia com valores transcritos</button><p class="puc-curva-note" id="puc-curva-manual-status" role="status"></p></details>'+
  '<div class="puc-curva-bm-toolbar"><button type="button" class="btn" id="puc-curva-refresh">Gerar Curva S dos BMs selecionados</button></div>'+
 '<p id="puc-curva-document-status" role="status" aria-live="polite"></p></div><div id="puc-curva-documental"></div>';
 root.insertBefore(box,byId('ficha-print-area'));
 byId('puc-curva-bms-list').addEventListener('change',e=>{
  const checkbox=e.target.closest('input[data-curva-id]');if(!checkbox)return;
  if(checkbox.checked)selectedBmIds.add(checkbox.dataset.curvaId);
  else selectedBmIds.delete(checkbox.dataset.curvaId);
  selectionEdited=true;syncDocuments();invalidateSelection();
 });
 byId('puc-curva-bms-search').addEventListener('input',syncDocuments);
 byId('puc-curva-select-all').onclick=()=>{
  for(const d of availableDocuments())selectedBmIds.add(d.id);
  selectionEdited=true;syncDocuments();invalidateSelection();
 };
 byId('puc-curva-select-none').onclick=()=>{selectedBmIds.clear();selectionEdited=true;syncDocuments();invalidateSelection()};
 const mappingChange=(key,id)=>{
  const choice=byId(id)?.value||'';
  candidateMap[key]=choice;
  if(choice&&candidateMap.percentualPrevistoAcumulado&&candidateMap.percentualPrevistoAcumulado===candidateMap.percentualRealizadoAcumulado){
    candidateMap.percentualPrevistoAcumulado='';
    const previous=byId('puc-curva-line-previsto');if(previous)previous.value='';
  }
  render();
 };
 byId('puc-curva-line-previsto').onchange=()=>mappingChange('percentualPrevistoAcumulado','puc-curva-line-previsto');
 byId('puc-curva-line-realizado').onchange=()=>mappingChange('percentualRealizadoAcumulado','puc-curva-line-realizado');
 byId('puc-curva-manual-generate').onclick=()=>{
  const status=byId('puc-curva-manual-status');
  if(!currentProject()){status.textContent='Selecione primeiro o empreendimento.';return}
  if(currentProjects().length>1){status.textContent='Para transcrever uma tabela, selecione uma PUC de cada vez e indique a fonte do contrato. Nenhum dado conjunto foi gerado.';return}
  try{
   const input=parseTranscribedHistory(byId('puc-curva-manual-data')?.value||'',
       byId('puc-curva-manual-ref')?.value||'');
   const result={manual:true,points:input.points,meta:{contract:currentContract()},
     doc:{id:'transcricao',name:'Quadro do documento transcrito pelo operador',ref:input.reference},
     scanned:0,pages:0,sources:input.points.map(p=>({name:input.reference,bm:String(p.number),
       physical:Number.isFinite(p.percentualRealizadoAcumulado)?pct(p.percentualRealizadoAcumulado):'Não informado',
       historic:'Transcrição do quadro original',contract:currentContract()||'Não identificado',
       status:'Pendente de validação'})),
     warnings:['Valores transcritos pelo operador a partir da fonte indicada; não substituem conferência do BM original.']};
   generation++;activeReport=result;
   const old=byId('ficha-print-area');if(old)old.hidden=true;
   byId('puc-curva-documental').innerHTML=layout(result);
   const info=byId('puc-curva-document-status');
   if(info)info.textContent=input.points.length+' BM(s) transcritos na prévia. Confira cada valor com o original antes de utilizar em decisão.';
   status.textContent='Prévia da tabela transcrita gerada. Verifique a referência e todos os percentuais.';
  }catch(e){status.textContent='Não foi possível gerar a prévia: '+String(e.message||e)}
 };
 byId('puc-curva-refresh').onclick=render;
 byId('ficha-generate')?.addEventListener('click',render);
 byId('ficha-project')?.addEventListener('change',()=>{selectionScope='';selectedBmIds.clear();render()});
 byId('ficha-contract')?.addEventListener('change',()=>{selectionScope='';selectedBmIds.clear();render()});
 let delay=null;
 function schedule(clearPdf=false){
  clearTimeout(delay);
  delay=setTimeout(()=>{if(clearPdf)cache.clear();render()},240);
 }
 document.addEventListener('puc-documents-updated',()=>schedule(true));
 document.addEventListener('puc-sei-selection-updated',()=>schedule(false));
 document.addEventListener('puc-ficha-bms-atualizados',()=>schedule(false));
 document.addEventListener('puc-projetos-agrupados-atualizados',()=>{selectionScope='';selectedBmIds.clear();schedule(false)});
 document.addEventListener('click',event=>{
   if(!event.target.closest?.('#ficha-print-btn')||!activeReport||!byId('puc-curva-documental')?.querySelector('.puc-curva-report'))return;
   event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();
   document.body.classList.add('ficha-print','puc-curva-print');
   window.print();
 },true);
 window.addEventListener('afterprint',()=>document.body.classList.remove('puc-curva-print'));
 const style=document.createElement('style');
 style.textContent='#ficha-print-area[hidden]{display:none!important}.puc-curva-chooser{display:flex;flex-direction:column;gap:7px;margin:15px 0;padding:15px;background:#f5f8fc;border:1px solid #cbdce8;border-radius:9px}.puc-curva-chooser select{width:100%;max-width:650px;padding:10px}.puc-curva-chooser p{font-size:13px;color:#49657a}.puc-curva-report{border:1px solid #d5e0e9;border-radius:9px;overflow:hidden;margin:15px 0;padding:17px}.puc-curva-report header{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:2px solid #b6d2e5;padding-bottom:12px}.puc-curva-report h3{margin:0;font-size:20px}.puc-curva-report small{display:block;color:#597185}.puc-curva-warning{color:#9b4d22;font-size:11px;font-weight:700}.puc-curva-meta,.puc-curva-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.puc-curva-meta>div,.puc-curva-kpis>div{padding:10px;background:#f2f6fa;border:1px solid #dce7f0;border-radius:5px;min-width:0}.puc-curva-meta strong,.puc-curva-kpis strong{display:block;font-size:14px;overflow-wrap:anywhere}.puc-curva-obj{grid-column:1/-1}.puc-curva-report h4{font-size:15px;margin:18px 0 10px}.puc-curva-table-scroll{overflow-x:auto;max-width:100%;border:1px solid #dce4ed}.puc-curva-table{border-collapse:collapse;min-width:max-content;font-size:12px}.puc-curva-table th,.puc-curva-table td{border:1px solid #d2dfe9;padding:7px 9px;white-space:nowrap;text-align:right}.puc-curva-table th:first-child{position:sticky;left:0;background:#eaf2fa;text-align:left;z-index:1}.puc-curva-table thead{background:#cbddea}.puc-curva-row-plan{background:#e1eefb}.puc-curva-row-real{background:#fbe8df}.puc-curva-row-neutral{background:#f2f5f8}.puc-curva-table-block{margin:12px 0 24px;break-inside:avoid}.puc-curva-table-block h5{font-size:13px;margin:0 0 8px;color:#25445d}.puc-curva-svg{width:100%;height:auto;display:block;background:white}.puc-curva-legend{display:flex;gap:22px;flex-wrap:wrap;font-size:12px;margin:10px 0}.puc-curva-legend i{display:inline-block;width:17px;height:3px;vertical-align:middle;margin-right:6px}.puc-curva-note{font-size:12px;color:#4f6275;line-height:1.5}.ficha-grafico-enxuto #ficha-print-area:has(+ *){margin-top:10px}@media(max-width:800px){.puc-curva-meta,.puc-curva-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}@media print{.puc-curva-chooser{display:none}.puc-curva-table-scroll{overflow:visible}.puc-curva-table{font-size:8px}}';

 style.textContent += '.puc-curva-audit{margin:14px 0}.puc-curva-audit .puc-curva-table th{position:static;white-space:nowrap;text-align:left}.puc-curva-audit .puc-curva-table td{text-align:left;white-space:normal;min-width:100px;overflow-wrap:anywhere}.puc-curva-empty-audit{margin:12px 0;padding:14px;border:1px solid #cbdde9;border-radius:8px}.puc-curva-audit .puc-curva-table{min-width:750px}';
 style.textContent += '#puc-curva-documental-wrap{margin-top:14px}.puc-curva-chooser{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.puc-curva-chooser select{flex:1;min-width:240px}.puc-curva-chooser p{flex-basis:100%;margin:0}.puc-curva-report header{background:white;color:#20354b;flex-wrap:wrap}.puc-curva-row-real{background:#e7f5eb}.puc-curva-alert{padding:10px;background:#fff3dd;border-left:3px solid #bd873b;font-size:12px}@media(max-width:720px){.puc-curva-chooser{display:block}.puc-curva-chooser select,.puc-curva-chooser button{width:100%;margin:6px 0}}@media print{body.ficha-print.puc-curva-print #fichas,body.ficha-print.puc-curva-print #ficha-result-panel,body.ficha-print.puc-curva-print #puc-curva-documental-wrap,body.ficha-print.puc-curva-print #puc-curva-documental{display:block!important}body.ficha-print.puc-curva-print #ficha-print-area{display:none!important}body.ficha-print.puc-curva-print .puc-curva-chooser{display:none!important}body.ficha-print.puc-curva-print #ficha-result-panel{border:0!important;padding:0!important}body.ficha-print.puc-curva-print .puc-curva-report{border:0!important;padding:0!important}.puc-curva-report{print-color-adjust:exact;-webkit-print-color-adjust:exact}.puc-curva-table-block{break-inside:avoid}.puc-curva-table-scroll{overflow:visible}}';

 style.textContent += '.puc-curva-manual{padding:13px;background:#fff;border:1px solid #d1dfea;border-radius:9px}.puc-curva-manual summary{cursor:pointer;font-weight:700;font-size:13px}.puc-curva-manual label{display:flex;flex-direction:column;gap:6px;margin:10px 0;font-size:12px;font-weight:650}.puc-curva-manual input,.puc-curva-manual textarea{width:100%;box-sizing:border-box;border:1px solid #b9d0e1;border-radius:7px;padding:10px;font-family:inherit}.puc-curva-manual textarea{font-family:ui-monospace,monospace}';
 style.textContent += '.puc-curva-line-mapping{background:#fff;border:1px solid #9fc1d6;padding:13px;border-radius:9px}.puc-curva-line-mapping strong{font-size:14px}.puc-curva-mapping-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0}.puc-curva-mapping-fields label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700}.puc-curva-mapping-fields select{width:100%;min-width:0;padding:9px}@media(max-width:700px){.puc-curva-mapping-fields{grid-template-columns:1fr}}';
 style.textContent += '.puc-curva-bm-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.puc-curva-bm-heading label{font-size:14px;font-weight:700}.puc-curva-bm-toolbar{display:flex;gap:9px;flex-wrap:wrap;align-items:center}.puc-curva-bm-toolbar input{flex:1;min-width:210px;max-width:100%;padding:10px;border:1px solid #cbdce8;border-radius:7px}.puc-curva-bms-list{width:100%;max-height:265px;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:9px;border:1px solid #ccdae7;border-radius:9px;background:white}.puc-curva-bm-option{display:flex;align-items:flex-start;gap:9px;min-width:0;padding:10px;border:1px solid #dde6ef;border-radius:8px;background:#f8fbfe;cursor:pointer}.puc-curva-bm-option input{margin-top:4px;width:17px;height:17px;flex:none}.puc-curva-bm-detail{min-width:0;overflow-wrap:anywhere}.puc-curva-bm-detail strong{font-size:12px;display:block}.puc-curva-bm-detail small{font-size:11px;color:#506b80;display:block;margin-top:4px}.puc-curva-bm-option:has(input:checked){border-color:#5793ba;background:#eff7fd}@media(max-width:700px){.puc-curva-bms-list{grid-template-columns:1fr}.puc-curva-bm-toolbar button{width:100%}}@media print{.puc-curva-bm-toolbar,.puc-curva-bms-list,.puc-curva-bm-heading{display:none!important}}';
 style.textContent += '.puc-curva-group{margin:18px 0;padding:14px;border:1px solid #c5d8e7;border-radius:10px;break-inside:avoid-page}.puc-curva-group>h3{font-size:17px;margin:0 0 10px;color:#225577}.puc-curva-group-summary{padding:12px;background:#edf5fc;border-left:3px solid #2a6f98;color:#234c64}.puc-curva-group .puc-curva-report{margin:0;border:0;padding:4px}';
 document.head.appendChild(style);render();
}
window.PUCCurvaSEI={parsePage,widePageCandidates,extract,render,selected,setup,consolidate,uniteHistory,singleBmPoint,parseTranscribedHistory,svgChart,
 selectDocumentRow:(field,key)=>{
  if(!['percentualPrevistoAcumulado','percentualRealizadoAcumulado'].includes(field))return false;
  if(typeof key!=='string'||key.length>240)return false;
  candidateMap[field]=key;
  return true;
 }};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
