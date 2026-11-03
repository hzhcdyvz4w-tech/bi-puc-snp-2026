/* BI PUC — quadro indicativo das quatro fontes por ID_governa, UF e empreendimento.
   Não soma contratos, medições, ações SIOP ou declarações distintas.
   Não transforma associação textual em vínculo financeiro confirmado. */
(function(w){
 'use strict';
 const $=id=>document.getElementById(id);
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const states=x=>String(x??'').toUpperCase().split(/[,;\/]/).map(z=>z.trim()).filter(Boolean);
 const monetary=x=>{
  if(x===null||x===undefined||String(x).trim()==='')return null;
  if(typeof x==='number')return Number.isFinite(x)?x:null;
  let z=String(x).replace(/R\$/ig,'').replace(/\s/g,'').replace(/^\+/,'');
  if(!/^[0-9.,]+$/.test(z))return null;
  if(z.includes(',')&&z.includes('.'))z=z.lastIndexOf(',')>z.lastIndexOf('.')?z.replace(/\./g,'').replace(',','.'):z.replace(/,/g,'');
  else if(z.includes(','))z=z.replace(/\./g,'').replace(',','.');
  else if(/^(\d{1,3}\.)+\d{3}$/.test(z))z=z.replace(/\./g,'');
  const n=Number(z);return Number.isFinite(n)?n:null;
 };
 const reais=x=>{const n=monetary(x);return n===null?'—':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})};
 const projects=()=>{try{return JSON.parse($('embedded-data')?.textContent||'{}').projetos||[]}catch(e){return []}};
 const siop=()=>{try{return JSON.parse($('embedded-data')?.textContent||'{}').siop||[]}catch(e){return []}};
 const sourceDocs=()=>w.PUCDocLibrary?.list?.()||[];
 const balances=()=>w.PUCCorrelacao?.balancoRows?.()||[];
 function matchProject(row,ps){
  const rowUF=states(row.uf);
  const explicit=ps.filter(p=>/^\d+$/.test(String(p.id_governa||''))&&String(p.id_governa).trim()===String(row.id||'').trim()&&rowUF.includes(String(p.uf||'').toUpperCase()));
  if(explicit.length===1)return {project:explicit[0],type:'ID_governa cadastrado'};
  if(explicit.length>1)return {project:null,type:'ID_governa duplicado — revisar'};
  const exact=ps.filter(p=>norm(p.empreendimento)===norm(row.empreendimento)&&rowUF.includes(String(p.uf||'').toUpperCase()));
  return exact.length===1?{project:exact[0],type:'Nome/UF coincidentes — vínculo preliminar'}:{project:null,type:exact.length>1?'Empreendimento ambíguo':'Sem PUC confirmada'};
 }
 function getCandidate(doc,type){
  const list=(doc.candidates||[]).filter(c=>c.type===type).flatMap(c=>c.values||[]);
  return list.length===1?list[0]:null;
 }

 // Uma obra pode atender várias PUCs. A ligação textual é apenas hipótese; valores são do contrato global.
 const workNorm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 const stemRules=[
  ['ARMAZENS',/\bARMAZ(?:EM|ENS)\b/,/\bARMAZ(?:EM|ENS)\b/],
  ['GALPOES',/\bGALP(?:AO|OES)\b/,/\bGALP(?:AO|OES)\b/],
  ['SOLAR',/\b(?:SOLAR|FOTOVOLTAIC[AO])\b/,/\b(?:SOLAR|FOTOVOLTAIC[AO])\b/],
  ['DOLPHINS',/\bDOLPHINS?\b/,/\bDOLPHINS?\b/],
  ['DEFENSAS',/\bDEFENSAS?\b/,/\bDEFENSAS?\b/],
  ['DRAGAGEM',/\bDRAGAGEM\b/,/\bDRAGAGEM\b/],
  ['FERROVIA',/\bFERROVIARI[OA]\b/,/\bFERROVIARI[OA]\b/]
 ];
 function suggestWorkProjects(work,ps){
  const title=workNorm(work);if(!title)return [];
  return ps.filter(p=>{
   const name=workNorm(p.empreendimento),uf=workNorm(p.uf);
   const stateTerms={RN:/\b(?:RN|NATAL|RIO GRANDE DO NORTE)\b/,RJ:/\b(?:RJ|RIO DE JANEIRO|ITAGUAI|GAMBOA)\b/,PE:/\b(?:PE|SUAPE|PERNAMBUCO|TATUOCA)\b/,PA:/\b(?:PA|VILA DO CONDE)\b/};
   if(stateTerms[uf]&&!stateTerms[uf].test(title))return false;
   const hits=stemRules.filter(x=>x[1].test(name)&&x[2].test(title));
   if(!hits.length)return false;
   if(hits.some(x=>['ARMAZENS','GALPOES','SOLAR','DOLPHINS','FERROVIA'].includes(x[0])))return true;
   const specific=workNorm(p.empreendimento).split(' ').filter(x=>x.length>=6&&!/^(?:RECUPERACAO|MELHORIA|ESTRUTURAL|CONSTRUCAO|IMPLANTACAO|AMPLIACAO|MODERNIZACAO|INSTALACOES|PROJETOS|EXECUTIVOS|CANAL|ACESSO|PORTO|NATAL|DRAGAGEM|DEFENSAS|TERMINAL)$/.test(x));
   return hits.length>=2||specific.some(x=>title.includes(x));
  }).map(p=>({id:p.id,empreendimento:p.empreendimento,uf:p.uf,relation:'Sugestão textual — não homologada'}));
 }
 const bmIsSelected=d=>{
  if(d.origin!=='SEI'||!/BM IDENTIFICADO|BM PROVÁVEL/.test(d.bmStatus||''))return false;
  try{return !new Set(JSON.parse(localStorage.getItem('BI_PUC_SEI_COMPARACAO_EXCLUIDOS_V1')||'[]')).has(d.id)}
  catch(e){return true}
 };
 function buildWorkGroups({pucs=[],documentos=[]}={}){
  const groups=new Map();
  for(const doc of documentos.filter(bmIsSelected)){
   const work=String(doc.workName||'').trim();if(!work)continue;
   const key=workNorm(work)+'|'+workNorm(doc.ref||'');
   if(!groups.has(key))groups.set(key,{key,work,ref:doc.ref||'',projects:suggestWorkProjects(work,pucs),bms:[]});
   const value=type=>getCandidate(doc,type);
   groups.get(key).bms.push({id:doc.id,document:doc.name,number:doc.bmNumber||'',period:doc.bmPeriod||'',
    amount:value('Valor da Medição (BM)'),contract:value('Valor do Contrato (BM)'),cumulative:value('Valor Acumulado (BM)'),balance:value('Saldo do Contrato (BM)'),
    pct:value('Valor da Medição (%) BM'),pctAcc:value('Valor Acumulado (%) BM'),pctBalance:value('Saldo do Contrato (%) BM'),quality:doc.quality||''});
  }
  return [...groups.values()].sort((a,b)=>a.work.localeCompare(b.work,'pt-BR'));
 }

 function build({balancos=[],pucs=[],orcamento=[],documentos=[]}={}){
  const distinct=new Map();
  for(const r of balancos){
   if(!r?.empreendimento||!r?.uf)continue;
   const key=String(r.id||'')+'|'+norm(r.uf)+'|'+norm(r.empreendimento);
   // Preserve the latest available row per identifier; duplicates are not additive.
   if(!distinct.has(key))distinct.set(key,r);
  }
  const all=[...distinct.values()].map(row=>{
   const mapping=matchProject(row,pucs),project=mapping.project,identity=String(row.id||'').trim(),uf=states(row.uf);
   const relatedBM=documentos.filter(d=>bmIsSelected(d)&&project&&d.project===project.id&&(/BM IDENTIFICADO|BM PROVÁVEL/.test(d.bmStatus||'')||(d.findings||[]).some(f=>f.indicator==='medicao_bm')));
   const bms=relatedBM.map(d=>{
    let amount=getCandidate(d,'Valor da Medição (BM)');
    let cumulative=getCandidate(d,'Valor Acumulado (BM)');
    let pct=getCandidate(d,'Valor da Medição (%) BM');
    let pctAcc=getCandidate(d,'Valor Acumulado (%) BM');
    const verified=(d.findings||[]).filter(f=>f.verified&&f.indicator==='medicao_bm'&&f.project===project.id);
    if(amount===null&&verified.length===1)amount=verified[0].value;
    return {document:d.name,bm:d.bmNumber||'',amount,acc:cumulative,pct,pctAcc,quality:d.quality||'',ref:d.ref||'',verified:verified.length>0};
   });
   const ss=project?orcamento.filter(s=>s.id_puc===project.id):[];
   const docas=documentos.filter(d=>{
    if(d.origin!=='DOCAS')return false;
    let data;try{data=JSON.parse(d.text||'{}')}catch(e){return false}
    if(data.schema!=='BI_PUC_DOCAS_V1')return false;
    const cadastro=data.cadastro||{};
    const stateMatch=uf.includes(String(cadastro.uf||'').toUpperCase());
    return stateMatch&&((identity&&String(cadastro.id_governa||'').trim()===identity)||
     (!cadastro.id_governa&&norm(cadastro.empreendimento)===norm(row.empreendimento)));
   }).flatMap(d=>{
    let data;try{data=JSON.parse(d.text||'{}')}catch(e){return []}
    const contracts=(data.grupos?.contratos||[]).filter(c=>monetary(c.medido)!==null).map(c=>({value:c.medido,nature:'Medido declarado no contrato '+(c.numero||'não informado'),document:d.name,verified:!!data.conferidoSNP}));
    if(contracts.length)return contracts;
    const finance=(data.grupos?.financeiro||[]).filter(f=>monetary(f.pago)!==null).map(f=>({value:f.pago,nature:'Pagamento PUC declarado (não é BM)',document:d.name,verified:!!data.conferidoSNP}));
    if(finance.length)return finance;
    return monetary(data.cadastro?.valor_global)!==null?[{value:data.cadastro.valor_global,nature:'Valor global declarado (não é BM)',document:d.name,verified:!!data.conferidoSNP}]:[];
   });
   const references=project?buildWorkGroups({pucs,documentos}).filter(g=>g.projects.some(p=>p.id===project.id)).map(g=>({work:g.work,shared:g.projects.length>1})):[];
   return {id:identity,uf:row.uf,empreendimento:row.empreendimento,project:project?.id||'',link:mapping.type,workReferences:references,
    balanco:{value:row.valor_global,nature:'Valor do investimento/empreendimento no Balanço',file:row.arquivo||'',competencia:row.data_referencia||'',hasValue:monetary(row.valor_global)!==null},
    bms,siop:ss.map(s=>({value:s.empenhado,nature:'Empenhado pela União · ação '+(s.acao||'')+'/PO '+(s.po||''),file:s.arquivo_fonte||'',cutoff:s.data_referencia||'',warning:'Associação SIOP temática, não homologada'})),docas};
  });
  all.sort((a,b)=>states(a.uf)[0]?.localeCompare(states(b.uf)[0]||'')||a.empreendimento.localeCompare(b.empreendimento,'pt-BR'));
  return all;
 }
 function cell(items,type){
  if(type==='balanco'){
   if(!items.hasValue)return '<span class="pucq-empty">Sem valor extraído</span>';
   return '<strong>'+escape(reais(items.value))+'</strong><small>'+escape(items.nature)+'</small><small>'+escape(items.file)+'</small>';
  }
  if(!items.length)return '<span class="pucq-empty">Sem dado vinculado</span>';
  return items.slice(0,8).map(item=>{
   const value=type==='bm'?item.amount:item.value;
   let sub=type==='bm'?'BM '+(item.bm||'nº pendente')+' · '+item.document:item.nature;
   let extra=type==='bm'?(item.pct?'Medição '+item.pct:'')+(item.acc!==null&&item.acc!==undefined?' · Acumulado '+reais(item.acc):'')+(item.pctAcc?' ('+item.pctAcc+')':''):'';
   return '<div class="pucq-amount"><strong>'+escape(reais(value))+'</strong><small>'+escape(sub)+'</small>'+(extra?'<small>'+escape(extra)+'</small>':'')+(type==='bm'&&!item.verified?'<small>'+(value===null?'Sem valor monetário extraído · reanalisar PDF ou conferir manualmente':'Candidato não conferido')+'</small>':'')+(item.warning?'<small>'+escape(item.warning)+'</small>':'')+(type==='bm'&&/OCR|SEM TEXTO|NÃO EXTRAÍDO/i.test(item.quality)?'<small>PDF possivelmente digitalizado: OCR/conferência necessária</small>':'')+'</div>';
  }).join('')+(items.length>8?'<small>Mais '+(items.length-8)+' registro(s); não somados</small>':'');
 }
 let currentUF='',currentSearch='';


 function sharedBMReference(row,groups){
  const related=groups.filter(g=>{
   if(row.project)return g.projects.some(p=>p.id===row.project);
   const synthetic={id:'BALANCO-'+row.id,uf:states(row.uf)[0]||'',empreendimento:row.empreendimento};
   return suggestWorkProjects(g.work,[synthetic]).length===1;
  });
  return related.map(g=>{
   const unique=new Map();
   for(const b of g.bms){
    const key=(b.number||b.document)+'|'+(b.period||'');
    if(!unique.has(key)||(unique.get(key).amount===null&&b.amount!==null))unique.set(key,b);
   }
   const values=[...unique.values()].filter(b=>b.amount!==null).map(b=>'BM '+(b.number||'nº a conferir')+': '+reais(b.amount)+(b.pct?' ('+b.pct+')':''));
   return '<div class="pucq-shared-value"><strong>'+(values.length?'Valor BM da obra (global, sem rateio)':'BM da obra — valor não extraído')+'</strong>'+(values.length?'<small>'+escape(values.join(' · '))+'</small>':'<small>Reanalisar PDFs selecionados ou conferir o documento.</small>')+'<small>Obra: '+escape(g.work)+'</small><small>Processo '+escape(g.ref||'não informado')+' · vínculo por nome/UF pendente de conferência. Não somar por PUC.</small></div>';
  }).join('');
 }
 function bmCell(row,groups){
  const direct=(row.bms||[]).length?cell(row.bms,'bm'):'';
  const missing=!(row.bms||[]).some(b=>b.amount!==null&&b.amount!==undefined);
  const fallback=missing?sharedBMReference(row,groups):'';
  return direct||fallback?direct+fallback:'<span class="pucq-empty">Sem dado vinculado</span>';
 }
 function workGroupsHTML(groups){
  if(!groups.length)return '<p class="muted">Nenhum nome de obra recuperado dos BMs selecionados. Reanalisar PDFs ou conferir documentos digitalizados.</p>';
  return groups.map(g=>{
   const sub=g.projects.length?g.projects.map(p=>'<li><strong>'+escape(p.id)+'</strong> · '+escape(p.empreendimento)+' <small>Subdivisão sugerida — conferir vínculo</small></li>').join(''):'<li>Nenhum empreendimento do cadastro identificado com segurança — vinculação pendente</li>';
   const counts=new Map();for(const b of g.bms){const k=b.number||b.document;counts.set(k,(counts.get(k)||0)+1)}
   const rows=g.bms.map(b=>{
    const show=x=>x===null||x===undefined?'Não extraído':reais(x);
    const repeated=b.number&&counts.get(b.number)>1;
    return '<tr><td>'+escape(b.number||'Nº a confirmar')+'</td><td>'+escape(b.document)+(repeated?'<small>Mais de um arquivo do mesmo BM: não somar</small>':'')+'</td><td>'+escape(show(b.contract))+'</td><td>'+escape(show(b.amount))+(b.pct?'<small>'+escape(b.pct)+'</small>':'')+'</td><td>'+escape(show(b.cumulative))+(b.pctAcc?'<small>'+escape(b.pctAcc)+'</small>':'')+'</td><td>'+escape(show(b.balance))+(b.pctBalance?'<small>'+escape(b.pctBalance)+'</small>':'')+'</td></tr>';
   }).join('');
   return '<details class="pucq-work-group" open><summary><strong>'+escape(g.work)+'</strong><small>'+g.projects.length+' possível(is) empreendimento(s) · '+g.bms.length+' arquivo(s) BM · Processo '+escape(g.ref||'não informado')+'</small></summary><div class="pucq-work-children"><strong>Subdivisões reconhecidas no nome da obra (não homologadas)</strong><ul>'+sub+'</ul><p class="muted">Valores do contrato/obra global. Não distribuir automaticamente entre PUCs ou somar medições acumuladas.</p><div class="scroll"><table class="data-table"><thead><tr><th>BM</th><th>Documento</th><th>Contrato</th><th>Medição / %</th><th>Acumulado / %</th><th>Saldo / %</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></details>';
  }).join('');
 }

 function render(){
  const place=$('pucq-table-body'),counter=$('pucq-count');if(!place)return;
  const rows=build({balancos:balances(),pucs:projects(),orcamento:siop(),documentos:sourceDocs()});
  const groups=buildWorkGroups({pucs:projects(),documentos:sourceDocs()});const groupPanel=$('pucq-work-groups');if(groupPanel)groupPanel.innerHTML=workGroupsHTML(groups.filter(g=>!currentUF||g.projects.some(p=>p.uf===currentUF)||!g.projects.length));
  const ufs=[...new Set(rows.flatMap(r=>states(r.uf)))].sort();
  const select=$('pucq-uf');if(select){
   const choice=currentUF;
   select.innerHTML='<option value="">Todas as UFs</option>'+ufs.map(uf=>'<option value="'+escape(uf)+'">'+escape(uf)+'</option>').join('');
   select.value=choice&&ufs.includes(choice)?choice:'';
  }
  const visible=rows.filter(r=>(!currentUF||states(r.uf).includes(currentUF))&&(!currentSearch||(r.id+' '+r.empreendimento+' '+r.uf).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(currentSearch)));
  place.innerHTML=visible.length?visible.map(r=>'<tr><td><strong>'+escape(r.id||'Não informado')+'</strong></td><td>'+escape(r.uf)+'</td><td><strong>'+escape(r.empreendimento)+'</strong><small>'+escape(r.project||'PUC não vinculada')+' · '+escape(r.link)+'</small></td><td>'+bmCell(r,groups)+'</td><td>'+cell(r.balanco,'balanco')+'</td><td>'+cell(r.siop,'siop')+'</td><td>'+cell(r.docas,'docas')+'</td></tr>').join(''):'<tr><td colspan="7">Nenhum empreendimento identificado para os filtros. Importe o Balanço em XLSX/CSV e confira a UF e o ID_governa.</td></tr>';
  if(counter){const orphan=sourceDocs().filter(d=>d.origin==='SEI'&&/BM IDENTIFICADO|BM PROVÁVEL/.test(d.bmStatus||'')&&!d.project).length;counter.textContent=visible.length+' de '+rows.length+' empreendimento(s) · '+orphan+' BM(s) SEI ainda sem PUC vinculada. Valores de naturezas diferentes não são comparados automaticamente.'}
 }
 function reportSection(projectId){
  const rows=build({balancos:balances(),pucs:projects(),orcamento:siop(),documentos:sourceDocs()}).filter(r=>r.project===projectId);
  const groups=buildWorkGroups({pucs:projects(),documentos:sourceDocs()});
  if(!rows.length)return '<h3>Quadro das quatro fontes por ID_governa e UF</h3><p>Não há vínculo confirmado entre este projeto e uma linha do Balanço. Não atribuir valores de outras obras.</p>';
  return '<h3>Valores por ID_governa e UF (fontes distintas; sem equivalência automática)</h3><table><thead><tr><th>ID_governa</th><th>UF</th><th>Empreendimento</th><th>Valor BM</th><th>Valor do Balanço</th><th>Valor do SIOP</th><th>Valor Informado pelas DOCAS</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+escape(r.id)+'</td><td>'+escape(r.uf)+'</td><td>'+escape(r.empreendimento)+'</td><td>'+bmCell(r,groups)+(r.workReferences?.length?'<small class="pucq-work-ref">'+r.workReferences.map(g=>escape(g.shared?'Obra conjunta (valor global no quadro consolidado; sem rateio)':'Correspondência textual com BM — vínculo pendente')+' · '+escape(g.work)).join('<br>')+'</small>':'')+'</td><td>'+cell(r.balanco,'balanco')+'</td><td>'+cell(r.siop,'siop')+'</td><td>'+cell(r.docas,'docas')+'</td></tr>').join('')+'</tbody></table>';
 }
 function init(){
  const main=$('puc3-main');if(!main||$('pucq-panel'))return;
  const panel=document.createElement('section');panel.id='pucq-panel';panel.className='pucq-panel';
  panel.innerHTML='<h3>Quadro de valores por ID_governa, UF e empreendimento</h3><p class="muted">Fontes independentes. <strong>Valor BM</strong> = medição contratual; <strong>Balanço</strong> = valor global do empreendimento; <strong>SIOP</strong> = empenho da União (vínculo preliminar); <strong>DOCAS</strong> = valor declarado conforme sua natureza. Sem correspondência documental, não há soma nem divergência automática.</p><div class="pucq-controls"><label>UF <select id="pucq-uf"><option value="">Todas as UFs</option></select></label><label>Localizar ID ou empreendimento <input id="pucq-search" type="search" placeholder="ID_governa ou nome"></label></div><p id="pucq-count" class="muted"></p><div class="two-actions"><button id="pucq-refresh" type="button" class="btn secondary">Reanalisar PDFs dos BMs já anexados</button></div><h4>Obras consolidadas, subdivisões e boletins selecionados</h4><div id="pucq-work-groups"></div><div class="scroll pucq-scroll"><table class="data-table pucq-table"><thead><tr><th>ID_governa</th><th>UF</th><th>Nome do empreendimento</th><th>Valor BM</th><th>Valor do Balanço</th><th>Valor do SIOP</th><th>Valor Informado pelas DOCAS</th></tr></thead><tbody id="pucq-table-body"></tbody></table></div>';
  const after=$('puc3-document-list');if(after)after.insertAdjacentElement('afterend',panel);else main.appendChild(panel);
  const css=document.createElement('style');css.textContent='.pucq-work-group{margin:12px 0;border:1px solid #cbdde8;border-radius:10px;overflow:hidden}.pucq-work-group summary{padding:14px 16px;background:#e7f0f7;color:#173b59;cursor:pointer;line-height:1.5}.pucq-work-group summary small{display:block;font-size:12px;color:#526f83}.pucq-work-children{padding:15px}.pucq-work-children li{margin:7px 0}.pucq-work-ref{display:block;color:#245b82;margin-top:6px}.pucq-shared-value{background:#eef5fb;border-left:3px solid #32719a;padding:7px;margin-top:8px}.pucq-shared-value strong{font-size:12px;display:block}.pucq-panel{margin:20px 0;padding:16px 0;border-block:1px solid #dce6ec}.pucq-controls{display:flex;flex-wrap:wrap;gap:15px;margin:14px 0}.pucq-controls label{display:flex;flex-direction:column;gap:5px;font-size:13px}.pucq-controls select,.pucq-controls input{min-width:160px;padding:9px;border:1px solid #cedae4;border-radius:7px}.pucq-table{min-width:1180px!important}.pucq-table th,.pucq-table td{vertical-align:top;min-width:112px}.pucq-table td:nth-child(3){min-width:245px}.pucq-table td small{display:block;color:#607b8c;font-size:11px;margin-top:4px;overflow-wrap:anywhere}.pucq-amount{padding:4px 0 8px;border-bottom:1px dotted #d5e1e8}.pucq-amount strong{white-space:nowrap}.pucq-empty{color:#718493;font-style:italic}.pucq-scroll{overflow-x:auto}';document.head.appendChild(css);
  $('pucq-refresh').onclick=()=>{const action=$('puc-bm-reanalyse');if(action)action.click();else alert('Abra Boletins de medição no Confronto das fontes para reanalisar os PDFs armazenados.');};
  $('pucq-uf').onchange=e=>{currentUF=e.target.value;render()};
  $('pucq-search').oninput=e=>{currentSearch=e.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();render()};
  document.addEventListener('puc-documents-updated',render);
  document.addEventListener('puc-sei-selection-updated',render);
  render();
 }
 w.PUCQuadroValores={build,buildWorkGroups,suggestWorkProjects,parseMoney:monetary,render,reportSection};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
