/* BI PUC — Curva S documental por BM selecionado; dados permanecem exclusivamente no navegador. */
(()=>{'use strict';
const byId=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>{const raw=String(x??'').replace(/[\sR$%]/g,'').trim();if(!raw)return NaN;const n=raw.includes(',')?Number(raw.replace(/\./g,'').replace(',','.')):Number(raw);return Number.isFinite(n)?n:NaN};
const pct=x=>x===null||!Number.isFinite(x)?'—':x.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
const money=x=>x===null||!Number.isFinite(x)?'—':x.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const excluded=()=>{try{return new Set(JSON.parse(localStorage.getItem('BI_PUC_SEI_COMPARACAO_EXCLUIDOS_V1')||'[]'))}catch(e){return new Set()}};
const currentProject=()=>byId('ficha-project')?.value||'';
const currentContract=()=>byId('ficha-contract')?.value?.trim()||'';
const selected=()=>{const id=currentProject();if(!id)return [];return (window.PUCDocLibrary?.list?.()||[]).filter(d=>d.origin==='SEI'&&/^(BM IDENTIFICADO|BM PROVÁVEL)/.test(d.bmStatus||'')&&!excluded().has(d.id)&&/\.pdf$/i.test(d.name)&&(d.project===id||(Array.isArray(d.projects)&&d.projects.includes(id))))};
function rowsFromItems(items){
 const rows=[];
 for(const item of items||[]){
  const s=String(item.str||'').trim(),x=item.transform?.[4],y=item.transform?.[5];
  if(!s||!Number.isFinite(x)||!Number.isFinite(y))continue;
  let row=rows.find(r=>Math.abs(r.y-y)<2.1);
  if(!row){row={y,parts:[]};rows.push(row)}
  row.parts.push({s,x});
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
 if(!window.pdfjsLib?.getDocument)throw Error('PDF.js indisponível. Atualize a página.');
 if(blob.size>35*1024*1024)throw Error('PDF acima de 35 MB; confira o arquivo original.');
 const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;
 const pages=Math.min(pdf.numPages,65),records=[],meta=[];
 try{
  for(let p=1;p<=pages;p++){
   const items=(await (await pdf.getPage(p)).getTextContent()).items;
   records.push(...parsePage(items,p));
   if(p===1||p===pages)meta.push(rowsFromItems(items).slice(0,36).map(r=>r.text).join('\n'));
  }
 }finally{try{await pdf.destroy()}catch(e){}}
 const byNumber=new Map(),warnings=[];
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
 if(points.length<2||!points.some(p=>Number.isFinite(p.percentualPrevistoAcumulado)||Number.isFinite(p.percentualRealizadoAcumulado)))
  throw Error('Histórico acumulado insuficiente neste PDF; consulte BMs individuais conferidos.');
 for(const key of ['percentualPrevistoAcumulado','percentualRealizadoAcumulado']){
  const series=points.filter(p=>Number.isFinite(p[key]));
  if(series.some((p,i)=>i>0&&p[key]<series[i-1][key]-.01))
   warnings.push('A série '+(key.includes('Previsto')?'prevista':'realizada')+' diminui entre BMs. Verificar retificações.');
 }
 const result={doc,points,pages,meta:metadata(meta.join('\n')+'\n'+String(doc.text||'')),warnings:[...new Set(warnings)]};
 cache.set(doc.id,result);
 return result;
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
 return '<svg class="puc-curva-svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Curva S dos percentuais documentados: previsto azul, realizado verde" xmlns="http://www.w3.org/2000/svg">'+axes+
 series('percentualPrevistoAcumulado','#3977c5')+series('percentualRealizadoAcumulado','#5cbb83')+
 ticks+'<text x="'+(width/2)+'" y="'+(height-8)+'" text-anchor="middle" font-size="12">'+(useDays?'Dias transcorridos conforme o BM':'Sequência dos boletins (BM)')+'</text></svg>';
}
function horizontalTable(points){
 const chunks=[];for(let i=0;i<points.length;i+=14)chunks.push(points.slice(i,i+14));
 const build=items=>{
  const header=items.map(p=>'<th>BM '+String(p.number).padStart(2,'0')+'</th>').join('');
  const line=(title,key,formatter,kind)=>'<tr class="puc-curva-row-'+kind+'"><th>'+title+'</th>'+items.map(p=>'<td>'+formatter(Number.isFinite(p[key])?p[key]:null)+'</td>').join('')+'</tr>';
  return '<div class="puc-curva-table-scroll"><table class="puc-curva-table"><thead><tr><th>Indicador</th>'+header+'</tr></thead><tbody>'+
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
function layout(result){
 const {points,meta,doc,warnings}=result;
 let projects=[];try{projects=JSON.parse(byId('embedded-data')?.textContent||'{}').projetos||[]}catch(e){}
 const project=projects.find(p=>p.id===currentProject());
 const actual=[...points].reverse().find(p=>Number.isFinite(p.percentualRealizadoAcumulado));
 const planned=[...points].reverse().find(p=>Number.isFinite(p.percentualPrevistoAcumulado));
 const comparable=actual&&planned&&actual.number===planned.number;
 const delta=comparable?+(actual.percentualRealizadoAcumulado-planned.percentualPrevistoAcumulado).toFixed(2):null;
 const box=(label,value)=>'<div><small>'+label+'</small><strong>'+value+'</strong></div>';
 const source=[doc.ref,doc.name].filter(Boolean).join(' · ');
 const alert=warnings.length?'<p class="puc-curva-alert">'+[...new Set(warnings)].map(esc).join(' · ')+'</p>':'';
 return '<div class="puc-curva-report" data-doc-id="'+esc(doc.id)+'">'+
 '<header><div><h3>CURVA S — Acompanhamento contratual</h3><small>Documento: '+esc(source)+'</small></div><span class="puc-curva-warning">EXTRAÇÃO A CONFERIR · NÃO HOMOLOGADA</span></header>'+
 '<div class="puc-curva-meta">'+
 box('Empreendimento',esc(project?.empreendimento||doc.workName||'Vínculo não comprovado'))+
 box('Contrato',esc(meta.contract||currentContract()||'Não identificado'))+
 box('Contratada',esc(meta.contractor||'Não identificada'))+
 box('Ordem de serviço',esc(meta.serviceOrder||'Não identificada'))+
 box('BM de referência',esc(meta.bm||doc.bmNumber||'Não identificado'))+
 box('PUC / UF',esc((currentProject()||'—')+' / '+(project?.uf||'—')))+
 '<div class="puc-curva-obj"><small>Objeto contratual</small><strong>'+esc(meta.object||doc.workName||project?.empreendimento||'Não identificado')+'</strong></div></div>'+
 '<div class="puc-curva-kpis">'+
 box('Boletins no histórico',String(points.length))+
 box('Último realizado acumulado',actual?pct(actual.percentualRealizadoAcumulado):'—')+
 box('Previsto na mesma medição',comparable?pct(planned.percentualPrevistoAcumulado):'—')+
 box('Desvio realizado – previsto',delta===null?'Não comparável':(delta>0?'+':'')+delta.toLocaleString('pt-BR',{maximumFractionDigits:2})+' p.p.')+
 '</div>'+alert+
 '<h4>Curva S — percentuais acumulados documentados</h4>'+svgChart(points)+
 '<div class="puc-curva-legend"><span><i style="background:#3977c5"></i> Previsto acumulado</span><span><i style="background:#5cbb83"></i> Realizado acumulado</span></div>'+
 '<h4>Histórico das medições — previsto e realizado</h4>'+horizontalTable(points)+
 '<p class="puc-curva-note">Percentuais extraídos da tabela do BM, sem estimativas, somas de BMs repetidos ou interpolação de períodos ausentes. Não presumir que a tabela contratual corresponde à execução física oficial, ao SIOP ou a valores pagos.</p>'+
 '<p class="puc-curva-note">Fonte: '+esc(source)+' · '+result.pages+' página(s) examinada(s) · Emitido em '+new Date().toLocaleString('pt-BR')+'. Conferir contrato, objeto, sequência e valores com o documento original antes de usar na decisão.</p></div>';
}
let chosen='',generation=0,activeReport=null;
function availableDocuments(){
 const docs=selected(),contract=currentContract();
 if(!contract)return docs;
 return docs.filter(d=>{
  const m=metadata(d.text||'');
  if(m.contract)return m.contract.toUpperCase().includes(contract.toUpperCase());
  return (d.name||'').toUpperCase().includes(contract.toUpperCase().replaceAll('/','_'));
 });
}
function syncDocuments(){
 const sel=byId('puc-curva-document-select'),status=byId('puc-curva-document-status');
 if(!sel)return null;
 const docs=availableDocuments(),previous=chosen||sel.value;
 sel.replaceChildren(new Option('Selecione um BM com Curva S anexado em Documentos',''));
 for(const d of docs)sel.add(new Option(d.name+' · '+(d.bmNumber?'BM '+d.bmNumber:'BM sem número')+(d.ref?' · '+d.ref:''),d.id));
 const preferred=docs.find(d=>/CURVA[\s_.-]*S/i.test(d.name))||docs[0];
 sel.value=docs.some(d=>d.id===previous)?previous:(preferred?.id||'');
 chosen=sel.value;
 if(!currentProject())status.textContent='Selecione um empreendimento. A Curva S exige vínculo dos BMs com a obra.';
 else if(!docs.length)status.textContent='Nenhum BM vinculado a esta PUC'+(currentContract()?' e ao contrato informado':'')+'. Confira a associação em Documentos → SEI.';
 return docs.find(d=>d.id===sel.value)||null;
}
function showLegacy(note){
 const box=byId('puc-curva-documental'),legacy=byId('ficha-print-area');
 if(box)box.replaceChildren();
 if(legacy)legacy.hidden=false;
 activeReport=null;
 if(currentProject())window.PUCFichasBM?.drawSheet?.();
 const state=window.PUCFichasBM?.getState?.(),project=currentProject(),contract=currentContract();
 const confirmed=(state?.bmRows||[]).filter(x=>x.project===project&&x.status==='confirmado'&&x.physical!=null&&Number.isFinite(Number(x.physical))&&(!contract||x.contract===contract));
 const status=byId('puc-curva-document-status');
 if(status)status.textContent=note+(confirmed.length?' · '+confirmed.length+' BM(s) físicos conferidos disponíveis na ficha abaixo.':' · Sem pontos físicos conferidos, não será criada curva estimada.');
}
async function render(){
 const box=byId('puc-curva-documental');if(!box)return;
 const run=++generation,doc=syncDocuments();
 if(!currentProject())return showLegacy('Escolha o empreendimento para consultar os BMs.');
 if(!doc)return showLegacy('Histórico previsto × realizado não identificado entre os BMs vinculados.');
 const status=byId('puc-curva-document-status');
 status.textContent='Lendo a tabela histórica do PDF selecionado...';
 try{
  const result=await extract(doc);if(run!==generation)return;
  const contract=currentContract();
  if(contract&&result.meta.contract&&result.meta.contract.toUpperCase().trim()!==contract.toUpperCase().trim())
   return showLegacy('O contrato identificado no PDF não corresponde ao filtro informado. Confira o documento.');
  box.innerHTML=layout(result);activeReport=result;
  const legacy=byId('ficha-print-area');if(legacy)legacy.hidden=true;
  status.textContent=result.points.length+' BMs históricos extraídos do PDF selecionado · '+(result.points.some(x=>Number.isFinite(x.percentualPrevistoAcumulado))?'previsto disponível':'sem previsto')+' · '+(result.points.some(x=>Number.isFinite(x.percentualRealizadoAcumulado))?'realizado disponível':'sem realizado')+'. Extração a conferir.';
 }catch(e){if(run!==generation)return;showLegacy('Não foi possível extrair o histórico da Curva S: '+e.message)}
}
function setup(){
 const root=byId('ficha-result-panel');if(!root||byId('puc-curva-documental'))return;
 const box=document.createElement('div');box.id='puc-curva-documental-wrap';
 box.innerHTML='<div class="puc-curva-chooser"><label for="puc-curva-document-select">BM selecionado em Documentos → SEI</label><select id="puc-curva-document-select"></select><p id="puc-curva-document-status" aria-live="polite"></p></div><div id="puc-curva-documental"></div>';
 root.insertBefore(box,byId('ficha-print-area'));
 byId('puc-curva-document-select').onchange=()=>{chosen=byId('puc-curva-document-select').value;render()};
 document.addEventListener('puc-documents-updated',render);document.addEventListener('puc-sei-selection-updated',render);
 const style=document.createElement('style');
 style.textContent='#ficha-print-area[hidden]{display:none!important}.puc-curva-chooser{display:flex;flex-direction:column;gap:7px;margin:15px 0;padding:15px;background:#f5f8fc;border:1px solid #cbdce8;border-radius:9px}.puc-curva-chooser select{width:100%;max-width:650px;padding:10px}.puc-curva-chooser p{font-size:13px;color:#49657a}.puc-curva-report{border:1px solid #d5e0e9;border-radius:9px;overflow:hidden;margin:15px 0;padding:17px}.puc-curva-report header{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:2px solid #b6d2e5;padding-bottom:12px}.puc-curva-report h3{margin:0;font-size:20px}.puc-curva-report small{display:block;color:#597185}.puc-curva-warning{color:#9b4d22;font-size:11px;font-weight:700}.puc-curva-meta,.puc-curva-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.puc-curva-meta>div,.puc-curva-kpis>div{padding:10px;background:#f2f6fa;border:1px solid #dce7f0;border-radius:5px;min-width:0}.puc-curva-meta strong,.puc-curva-kpis strong{display:block;font-size:14px;overflow-wrap:anywhere}.puc-curva-obj{grid-column:1/-1}.puc-curva-report h4{font-size:15px;margin:18px 0 10px}.puc-curva-table-scroll{overflow-x:auto;max-width:100%;border:1px solid #dce4ed}.puc-curva-table{border-collapse:collapse;min-width:max-content;font-size:12px}.puc-curva-table th,.puc-curva-table td{border:1px solid #d2dfe9;padding:7px 9px;white-space:nowrap;text-align:right}.puc-curva-table th:first-child{position:sticky;left:0;background:#eaf2fa;text-align:left;z-index:1}.puc-curva-table thead{background:#cbddea}.puc-curva-row-plan{background:#e1eefb}.puc-curva-row-real{background:#fbe8df}.puc-curva-row-neutral{background:#f2f5f8}.puc-curva-table-block{margin:12px 0 24px;break-inside:avoid}.puc-curva-table-block h5{font-size:13px;margin:0 0 8px;color:#25445d}.puc-curva-svg{width:100%;height:auto;display:block;background:white}.puc-curva-legend{display:flex;gap:22px;flex-wrap:wrap;font-size:12px;margin:10px 0}.puc-curva-legend i{display:inline-block;width:17px;height:3px;vertical-align:middle;margin-right:6px}.puc-curva-note{font-size:12px;color:#4f6275;line-height:1.5}.ficha-grafico-enxuto #ficha-print-area:has(+ *){margin-top:10px}@media(max-width:800px){.puc-curva-meta,.puc-curva-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}@media print{.puc-curva-chooser{display:none}.puc-curva-table-scroll{overflow:visible}.puc-curva-table{font-size:8px}}';
 document.head.appendChild(style);render();
}
window.PUCCurvaSEI={parsePage,extract,render,selected,setup};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
