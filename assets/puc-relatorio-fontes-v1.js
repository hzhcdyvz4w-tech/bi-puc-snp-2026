/* BI PUC — Relatório Analítico por fontes — 16/11/2026
 * Integra os registros da sessão, a biblioteca documental, as fichas e a Central DOCAS.
 * Nunca presume homologação, vínculo por mera similaridade ou artigo legal inexistente.
 * Acesso ao Supabase é realizado exclusivamente pelo gerenciador DOCAS autenticado.
 */
(function(window){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const plain=v=>v===null||v===undefined||v===''?'Não informado':String(v);
 const sourceLabels={SEI:'Processos SEI — BMs principais',BALANCO:'Balanço',DOCAS:'DOCAS',SIOP:'SIOP — referência orçamentária'};
 const sections=['SEI','BALANCO','DOCAS'];
 const allSelected=mode=>mode==='TODAS'?['SEI','BALANCO','DOCAS','SIOP']:sections.includes(mode)?[mode]:[];
 const isBlank=v=>v===null||v===undefined||v==='';
 const money=v=>{
  if(isBlank(v))return 'Não informado';
  if(typeof v==='number'&&Number.isFinite(v))return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  return esc(String(v));
 };
 const val=v=>esc(plain(v));
 const table=(heads,rows,empty)=>{
  if(!rows.length)return '<p class="r-empty">'+esc(empty||'Não há registros vinculados a este empreendimento nesta fonte. Ausência de registro não significa ausência documental.')+'</p>';
  return '<div class="wrap-table"><table><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+
   '</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 };
 const section=(n,title,body)=>'<section class="r-section"><h3>'+n+'. '+esc(title)+'</h3>'+body+'</section>';
 function linkedDocs(id,origin){
  return (window.PUCDocLibrary?.list?.()||[]).filter(d=>
   d.origin===origin&&(d.project===id||(Array.isArray(d.projects)&&d.projects.includes(id))));
 }
 function readFicha(id){
  const state=window.PUCFichasBM?.getState?.()||{};
  return {
   bms:(state.bmRows||[]).filter(x=>x.project===id&&x.status!=='ignorado'),
   balance:(state.balances||{})[id]||null,
   planned:(state.planned||{})[id]||[]
  };
 }
 function bmsHTML(id){
  const docs=linkedDocs(id,'SEI').filter(x=>/^(BM IDENTIFICADO|BM PROVÁVEL)/.test(x.bmStatus||''));
  const info=readFicha(id),rows=info.bms;
  const notes=[];
  if(!docs.length)notes.push('Não foram localizados BMs principais vinculados expressamente a esta PUC na biblioteca documental.');
  if(rows.some(x=>x.status!=='confirmado'))notes.push('Há BMs candidatos não conferidos; não integram automaticamente os percentuais físicos validados.');
  const overview='<p><b>Boletins localizados:</b> '+docs.length+
   ' · <b>Registros na ficha:</b> '+rows.length+' · <b>Conferidos:</b> '+rows.filter(x=>x.status==='confirmado').length+
   ' · <b>Pendentes:</b> '+rows.filter(x=>x.status!=='confirmado').length+'</p>';
  const bms=table(['BM','Data/competência','Contrato','Físico acumulado (%)','Medição do período','Medição acumulada','Conferência e evidência'],rows.map(r=>[
   val(r.number||'Sem nº'),val(r.date||'Não identificada'),val(r.contract),
   r.physical===null||r.physical===undefined?'—':val(r.physical)+'%',
   r.measured===null||r.measured===undefined?'—':money(r.measured),
   r.cumulative===null||r.cumulative===undefined?'—':money(r.cumulative),
   '<b>'+esc(r.status==='confirmado'?'Conferido pelo operador':'A conferir')+'</b><div>'+val(r.evidence)+'</div>'
  ]),'Nenhuma medição incorporada à ficha do empreendimento.');
  const docsTable=table(['Documento SEI principal','BM/competência extraídos','Processo/referência','Qualidade e associação','Indicadores textuais capturados'],docs.map(d=>{
   const found=(d.candidates||[]).map(c=>{
    const values=Array.isArray(c.values)?c.values:[];
    return esc(c.type||'Indicador')+': '+esc(values.map(plain).join(', ')||'Não informado');
   });
   return [val(d.name),val('BM '+plain(d.bmNumber)+' · '+plain(d.bmPeriod)),val(d.ref),
    val(d.bmStatus)+'<div>'+val(d.quality)+'</div>',
    found.length?found.map(x=>'<div>'+x+'</div>').join(''):'<span class="muted">Sem indicador numérico extraível; conferir documento</span>'];
  }),'Nenhum PDF/planilha principal de medição com vínculo documental foi encontrado.');
  const findings=docs.flatMap(d=>(d.findings||[]).map(f=>({doc:d.name,ref:d.ref,indicator:f.indicator||f.type||'Achado registrado',status:f.status||'A conferir',text:f.note||f.description||f.value||''})));
  const findingsTable=findings.length?'<h4>Apontamentos documentais registrados</h4>'+table(
   ['Documento','Achado/indicador','Situação','Descrição'],findings.map(f=>[val(f.doc)+'<div>'+val(f.ref)+'</div>',val(f.indicator),val(f.status),val(f.text)])):'';
  return {html:overview+bms+'<h4>Documentos principais e evidências capturadas</h4>'+docsTable+findingsTable+
   (notes.length?'<p class="r-alert">'+notes.map(esc).join(' ')+'</p>':''),
   count:docs.length,records:rows.length,issues:notes,docs};
 }
 function balanceData(id,p){
  const linked=linkedDocs(id,'BALANCO'),ficha=readFicha(id);
  // Correspondências textuais são apenas candidatas, nunca tratadas como vínculos confirmados.
  const raw=window.PUCCorrelacao?.balancoRows?.()||[];
  const possible=raw.filter(r=>
   (String(p.id_governa||'')&&String(p.id_governa)===String(r.id||'')&&String(p.uf||'')===String(r.uf||''))||
   window.PUCCorrelacao?.projectSuggestions?.(r)?.some(x=>x.id===id));
  return {linked,ficha:ficha.balance,possible};
 }
 function balanceHTML(id,p){
  const b=balanceData(id,p);
  const keys=[
   ['global','Valor global do investimento'],['physical','Execução física (%)'],
   ['financial','Execução financeira (%)'],['start','Início informado'],
   ['end_plan','Conclusão prevista'],['end_real','Conclusão efetiva'],
   ['cutoff','Data de referência/corte'],['evidence','Documento de comprovação'],
   ['same_scope','Mesmo objeto/escopo declarado'],['verified','Conferido pelo operador']];
  const structured=b.ficha?table(['Indicador','Informação registrada'],keys.map(([k,label])=>[
   val(label),typeof b.ficha[k]==='boolean'?val(b.ficha[k]?'Sim':'Não'):
     k==='global'?money(b.ficha[k]):val(b.ficha[k])
  ])):'<p class="r-empty">Balanço não conferido/incorporado à ficha da PUC nesta sessão.</p>';
  const docs=table(['Arquivo do Balanço vinculado','Referência','Situação de leitura'],b.linked.map(d=>[
   val(d.name),val(d.ref),val(d.quality)+' · '+val(d.category)
  ]),'Nenhum arquivo do Balanço com vínculo explícito à PUC.');
  const possible= b.possible.length?
   '<h4>Correspondências textuais a confirmar (não são vínculos financeiros comprovados)</h4>'+
   table(['ID governa','UF','Empreendimento no Balanço','Valor global bruto','Execução física bruta','Fonte'],b.possible.map(r=>[
    val(r.id),val(r.uf),val(r.empreendimento),val(r.valor_global),val(r.execucao_fisica),val(r.arquivo)
   ])):
   '<p class="muted">Nenhuma correspondência adicional de UF/objeto identificada automaticamente.</p>';
  return {html:'<h4>Dados estruturados vinculados à ficha</h4>'+structured+
    '<h4>Documentos do Balanço com vínculo explícito</h4>'+docs+possible,
    count:b.linked.length,records:b.ficha?keys.filter(([k])=>!isBlank(b.ficha[k])).length:0,
    issues:!b.ficha?['Sem Balanço conferido na ficha do empreendimento.']:[],balance:b.ficha};
 }
 function docasMatches(id,p){
  const rows=Array.isArray(window.PUC_DOCAS_DECLARACOES_EXTERNAS)?
   window.PUC_DOCAS_DECLARACOES_EXTERNAS:[];
  const idGov=String(p.id_governa||'').trim();
  // ID governa explícito ou nome exato + Companhia + UF; jamais semelhança vaga.
  return rows.filter(r=>{
   const co=norm(r.companhia_nome||r.companhia_codigo),company=norm(p.empresa);
   const companyOk=co===company||co.includes(company)||company.includes(co);
   const ufOk=norm(r.uf)===norm(p.uf);
   const explicit=idGov&&String(r.id_gov_pac||'').trim()===idGov;
   const exact=norm(r.empreendimento)===norm(p.empreendimento);
   return companyOk&&ufOk&&(explicit||exact);
  });
 }
 const docasFields=[
 ['protocolo','Protocolo'],['enviado_em','Recebimento'],['status','Status gerencial'],
 ['companhia_nome','Companhia'],['uf','UF'],['empreendimento','Empreendimento declarado'],
 ['id_gov_pac','ID GOV/PAC'],['data_atualizacao','Data de atualização'],
 ['objetivo_descricao','Objetivo/descrição'],['investimento_total','Valor total declarado'],
 ['origem_recursos','Origem dos recursos'],['inicio','Início da obra'],
 ['conclusao_prevista','Conclusão prevista'],['situacao','Situação'],
 ['fase','Fase'],['execucao_fisica','Execução física declarada (%)'],
 ['execucao_financeira','Execução financeira declarada (%)'],
 ['contratos_principais','Contratos principais'],['resultados_entregas','Resultados/entregas'],
 ['restricoes_pendencias','Restrições/pendências'],
 ['providencias_proximos_marcos','Providências/próximos marcos'],
 ['analise','Análise do gestor']
 ];
 function docasHTML(id,p){
  const all=Array.isArray(window.PUC_DOCAS_DECLARACOES_EXTERNAS)?
   window.PUC_DOCAS_DECLARACOES_EXTERNAS:[],rows=docasMatches(id,p);
  const authorized=$('pdc-admin')&&!$('pdc-admin').hidden;
  const warning=!authorized?
   '<p class="r-alert">A Central DOCAS não está autenticada nesta sessão. Os formulários recebidos no Supabase não podem ser consultados neste relatório. Acesse a Central com seu token gerencial.</p>':
   (!rows.length?'<p class="r-alert">Não foi encontrada declaração com vínculo inequívoco à PUC nesta sessão. Existem '+all.length+' registro(s) acessíveis à Central, mas não serão atribuídos por similaridade textual.</p>':'');
  const content=rows.map(r=>'<h4>Declaração: '+val(r.protocolo)+' · '+val(r.enviado_em)+'</h4>'+
   table(['Campo declarado','Informação recebida'],docasFields.map(([key,label])=>[val(label),val(r[key])] )));
  const docs=linkedDocs(id,'DOCAS');
  const docsTable=docs.length?'<h4>Arquivos locais vinculados</h4>'+
   table(['Arquivo','Referência'],docs.map(d=>[val(d.name),val(d.ref)])):'';
  return {html:warning+content.join('')+docsTable,
   count:authorized?rows.length:0,records:authorized?rows.length*docasFields.length:0,
   issues:warning?['Dados DOCAS ainda sem autenticação ou correspondência inequívoca com a PUC.']:[],rows:authorized?rows:[]};
 }
 function sourcePanel(code,id,p){
  if(code==='SEI')return bmsHTML(id);
  if(code==='BALANCO')return balanceHTML(id,p);
  return docasHTML(id,p);
 }
 function build(ctx,mode,id){
  const r=ctx.buildCritical(id);if(!r)return null;
  const selected=allSelected(mode);
  const filteredRows=r.rows.filter(row=>selected.includes(row.source));
  const filteredAudits=r.audits.filter(a=>selected.includes(a.source_a)&&selected.includes(a.source_b));
  const filteredSchedules=r.slist.filter(x=>selected.includes(x.source));
  const docFilter= r.files.filter(x=>selected.includes(x.source));
  const all=sections.filter(s=>selected.includes(s));
  const panels=all.map(code=>({code,...sourcePanel(code,id,r.p)}));
  const issues=panels.flatMap(x=>x.issues.map(msg=>({source:x.code,message:msg})));
  for(const code of all)if(!filteredRows.some(x=>x.source===code)&&
   !filteredSchedules.some(x=>x.source===code)&&
   !(panels.find(x=>x.code===code)?.count)){
    issues.push({source:code,message:'Não há valores/cronogramas/documentos inequivocamente associados e disponíveis para esta origem.'});
  }
  return {...r,mode,selected,filteredRows,filteredAudits,filteredSchedules,docFilter,panels,issues};
 }
 function render(ctx){
  const id=$('report-project')?.value||'',select=$('report-source');
  const mode=select?.value||'TODAS';
  const holder=$('critical-report'),summary=$('report-summary');
  if(!holder)return null;
  if(!id){holder.innerHTML='<div class="empty">Escolha a Companhia, o empreendimento e as fontes para produzir o relatório.</div>';if(summary)summary.textContent='';latest=null;return null}
  const r=build(ctx,mode,id);
  if(!r){holder.innerHTML='<div class="empty">Empreendimento não encontrado na carteira.</div>';return null}
  const {p,selected,panels,filteredRows,filteredAudits,filteredSchedules,docFilter}=r;
  const sourceTitle=mode==='TODAS'?'SEI + Balanço + DOCAS (com contexto SIOP)':(sourceLabels[mode]||mode);
  let n=0;
  const heading='<div class="report-print-only">MINISTÉRIO DE PORTOS E AEROPORTOS — SNP · DOCUMENTO AUXILIAR</div>'+
   '<h2 class="report-title">Relatório Analítico do Empreendimento — '+esc(p.id)+'</h2>'+
   '<p><b>Objeto:</b> '+val(p.empreendimento)+'<br><b>Companhia:</b> '+val(p.empresa)+' · <b>UF:</b> '+val(p.uf)+
   ' · <b>Ação/PO:</b> '+val(p.acao)+' / '+val(p.po)+
   '<br><b>Recorte das fontes:</b> '+esc(sourceTitle)+
   '<br><b>Emissão:</b> '+esc(new Date().toLocaleString('pt-BR'))+
   ' · <b>Homologação:</b> PENDENTE — SNP</p>';
  const metrics='<div class="report-grid">'+[
   ['Registros estruturados',filteredRows.length],
   ['BMs / declarações / documentos',panels.reduce((sum,p)=>sum+p.count,0)],
   ['Confrontos comparáveis ou pendentes',filteredAudits.length],
   ['Alertas documentais',r.issues.length+filteredAudits.filter(x=>x.status!=='SEM DIVERGÊNCIA NUMÉRICA').length]
  ].map(([label,count])=>'<div class="report-kpi"><small>'+esc(label)+'</small><strong>'+count+'</strong></div>').join('')+'</div>';
  const method=section(++n,'Objeto, alcance e metodologia',
   '<p>O relatório consolida exclusivamente os dados recuperáveis no navegador do gestor e, quando autenticado, as declarações das DOCAS carregadas pela Central. Cada documento é identificado por origem; valores e percentuais não são atribuídos ao empreendimento por mera similaridade de nome.</p>'+
   '<p><b>Origem selecionada:</b> '+esc(sourceTitle)+
   '. Só são comparados indicadores com mesma natureza, objeto, contrato, competência, unidade e data de corte; divergências não comprovam irregularidade.</p>'+
   '<p><b>Ressalva:</b> sem arquivos ou registros na sessão, a ausência de dados não comprova inexistência de documento ou ausência de execução.</p>');
  const provenance=sections.filter(x=>selected.includes(x)).map(code=>{
   const x=panels.find(p=>p.code===code);
   return section(++n,'Análise documental — '+sourceLabels[code],x.html);
  }).join('');
  const physical=section(++n,'Execução física e evolução do empreendimento',
   '<p>Percentuais físicos são extraídos dos BMs conferidos, Balanço registrado ou declaração DOCAS, conforme a origem selecionada. Não são derivados de empenho, pagamento ou dotação.</p>'+
   ctx.renderRecords(filteredRows,ctx.REPORT_PHYSICAL)+
   (filteredAudits.length?'<h4>Confrontos entre fontes equivalentes</h4>'+ctx.renderAudit(filteredAudits,ctx.REPORT_PHYSICAL):''));
  const financial=section(++n,'Valores do investimento, medições e execução financeira',
   '<p>Valor do contrato, medição e saldo não se confundem com dotação ou pagamento da União, nem com recurso recebido/aplicado pela Companhia.</p>'+
   ctx.renderRecords(filteredRows,ctx.REPORT_FINANCIAL)+
   (filteredAudits.length?'<h4>Confrontos financeiros</h4>'+ctx.renderAudit(filteredAudits,ctx.REPORT_FINANCIAL):''));
  const schedule=section(++n,'Cronograma e marcos físicos',
   ctx.renderSchedules(filteredSchedules)+
   '<p><b>Itens inventariados na origem selecionada:</b> '+docFilter.length+
   '. O inventário não certifica o conteúdo integral de PDFs/ZIPs.</p>');
  const audits=filteredAudits.filter(a=>a.status!=='SEM DIVERGÊNCIA NUMÉRICA');
  const findings=section(++n,'Constatações, divergências e pendências',
   table(['Fonte','Situação','Descrição','Referência'],audits.map(x=>[
    val(ctx.sourceLabel(x.source_a)+' × '+ctx.sourceLabel(x.source_b)),
    val(x.status),val(x.reason),val((x.evidence_a||'')+' / '+(x.evidence_b||''))
   ]),'Não foram identificadas divergências *verificáveis* nos pares de dados incluídos. Isso não equivale a conformidade integral.')+
   (r.issues.length?'<h4>Limitações e diligências de complementação</h4>'+
    '<ul>'+r.issues.map(x=>'<li><b>'+val(sourceLabels[x.source]||x.source)+':</b> '+val(x.message)+'</li>').join('')+'</ul>':''));
  const legal=section(++n,'Fundamentação normativa e enquadramento jurídico',
   '<p><b>Base normativa específica ainda não vinculada ao relatório.</b> As legislações que serão disponibilizadas pelo gestor deverão ser analisadas, com identificação exata da norma, artigo, redação aplicável e correspondência com a evidência do empreendimento.</p>'+
   '<p>Até essa conferência, o BI não atribui infração, prazo legal, obrigação normativa específica ou conclusão jurídica automática.</p>');
  const recommendations=[
   ...r.issues.map(x=>'Para '+(sourceLabels[x.source]||x.source)+': '+x.message),
   ...audits.map(x=>'Conferir '+ctx.sourceLabel(x.source_a)+' × '+ctx.sourceLabel(x.source_b)+': '+x.reason),
   'Vincular cada documento a PUC, contrato, objeto e data de referência antes de comparar percentuais ou valores.',
   'Submeter o histórico das medições e os resultados do Balanço e DOCAS à validação técnica da SNP.'
  ];
  const conclusion=section(++n,'Conclusão analítica e sugestões de melhorias',
   '<p>'+((filteredRows.length||panels.some(x=>x.count))?
    'Há informações documentais ou estruturadas relacionadas ao empreendimento, identificadas nas seções precedentes. Sua suficiência depende de conferência de vínculos, datas e documentos originais.':
    'Não há evidências suficientes na seleção atual para emitir conclusão sobre execução física ou financeira.')+'</p>'+
   '<p><b>Conclusão:</b> análise técnica documental <b>preliminar e não homologada</b>. '+
   (audits.length?'Há '+audits.length+' confronto(s) que exigem exame e saneamento; ':'')+
   (r.issues.length?'Há '+r.issues.length+' limitação(ões) de disponibilidade/vinculação documental; ':'')+
   'nenhuma dessas constatações equivale, isoladamente, a irregularidade.</p>'+
   '<h4>Providências e melhorias sugeridas</h4><ol>'+[...new Set(recommendations)].map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+
   '<p><b>Conferência/homologação SNP:</b> PENDENTE. <b>Uso:</b> assessoramento e revisão documental.</p>');
  holder.innerHTML=heading+metrics+method+provenance+physical+financial+schedule+findings+legal+conclusion;
  const title=p.empresa+' · '+id+' · '+sourceTitle+' · '+filteredRows.length+' registros estruturados · '+panels.reduce((sum,x)=>sum+x.count,0)+' documentos/declarações vinculados';
  if(summary)summary.textContent=title;
  latest={id,p,mode,r,ctx,renderedAt:new Date().toISOString()};
  return latest;
 }
 let latest=null;
 function exportFindings(ctx){
  const id=$('report-project')?.value;if(!id)return false;
  const mode=$('report-source')?.value||'TODAS';
  const r=build(ctx,mode,id);if(!r)return false;
  const findings=[
   ...r.filteredAudits.filter(x=>x.status!=='SEM DIVERGÊNCIA NUMÉRICA').map(a=>({
    empreendimento:id,fonte:a.source_a+' / '+a.source_b,situacao:a.status,
    descricao:a.reason,referencia:(a.evidence_a||'')+'; '+(a.evidence_b||''),homologacao:'PENDENTE'
   })),
   ...r.issues.map(i=>({empreendimento:id,fonte:i.source,situacao:'DADO/EVIDÊNCIA A CONFERIR',
    descricao:i.message,referencia:'',homologacao:'PENDENTE'}))
  ];
  ctx.csvDownload('PUC_ANALITICO_ACHADOS_'+id+'_'+mode+'.csv',findings,
   ['empreendimento','fonte','situacao','descricao','referencia','homologacao']);
  return true;
 }
 function liveRefresh(){
  const on=$('relatorio');
  if(on&&!on.classList.contains('hidden')&&$('report-project')?.value&&typeof window.showCritical==='function'){
   window.showCritical();
  }
 }
 for(const name of ['puc-documents-updated','puc-ficha-bms-atualizados','puc:docas-externas-atualizadas']){
  window.addEventListener(name,liveRefresh);
 }
 window.PUCRelatorioFontes={render,build,exportFindings,docasMatches,linkedDocs};
})(window);
