/* BI PUC — Relatório Analítico por fontes — 16/11/2026
 * Integra os registros da sessão, a biblioteca documental, as fichas e a Central DOCAS.
 * Nunca presume homologação, vínculo por mera similaridade ou artigo legal inexistente.
 * Acesso ao Supabase é realizado exclusivamente pelo gerenciador DOCAS autenticado.
 */
(function(window){
 'use strict';
 const $=id=>document.getElementById(id);
 // O mesmo formato acompanha a tela e a impressão; sem sobreposição de colunas.
 const css=document.createElement('style');
 css.id='puc-relatorio-evidencias-style';
 css.textContent='#critical-report .wrap-table,#critical-report .puc-candidate-scroll{overflow-x:auto;max-width:100%;margin:12px 0}'+
 '#critical-report table{border-collapse:collapse;width:100%;min-width:760px;table-layout:auto}'+
 '#critical-report th,#critical-report td{padding:9px 10px;vertical-align:top;overflow-wrap:anywhere;word-break:normal;border-bottom:1px solid #dce5ed;line-height:1.45}'+
 '#critical-report th{background:#edf3f8;white-space:normal}'+
 '#critical-report td small,#critical-report td .pucq-amount small{display:block;font-size:11px;color:#58738b;margin-top:4px;overflow-wrap:anywhere}'+
 '#critical-report .pucq-amount{min-width:140px;padding:4px 0 8px}'+
 '#critical-report .pucq-amount strong{white-space:normal;overflow-wrap:anywhere}'+
 '#critical-report .r-candidates{margin:13px 0;border:1px solid #d9e4ed;border-radius:8px;overflow:hidden}'+
 '#critical-report .r-candidates>summary{padding:12px;background:#eff5f9;cursor:pointer}'+
 '#critical-report .r-candidates>p{padding:0 12px}'+
 '@media print{#critical-report .wrap-table{overflow:visible}#critical-report table{min-width:0;font-size:9px}#critical-report th,#critical-report td{padding:4px}}';
 if(!document.getElementById(css.id))document.head.appendChild(css);
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
 function bmsHTML(id,p){
  const docs=linkedDocs(id,'SEI').filter(x=>/^(BM IDENTIFICADO|BM PROVÁVEL)/.test(x.bmStatus||''));
  const candidates=(window.PUCDocLibrary?.list?.()||[]).filter(d=>{
    if(d.origin!=='SEI'||!/^BM (?:IDENTIFICADO|PROVÁVEL)/.test(d.bmStatus||'')||docs.some(x=>x.id===d.id))return false;
    const work=String(d.workName||'').trim();
    return !!work&&window.PUCQuadroValores?.suggestWorkProjects?.(work,[{id,uf:p.uf,empreendimento:p.empreendimento}])?.length===1;
  });
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
  const candidatesHTML=candidates.length?'<details class="r-candidates"><summary><b>'+candidates.length+' possível(is) BM(s) relacionado(s) por objeto — a confirmar</b></summary>'+
   '<p>Esses boletins NÃO estão vinculados formalmente à PUC; seus valores não alimentam a Curva S nem compõem medições validadas.</p>'+
   table(['BM','Documento','Obra extraída','Competência','Referência SEI'],candidates.map(d=>[
    val(d.bmNumber||'A identificar'),val(d.name),val(d.workName),val(d.bmPeriod),val(d.ref)
   ]))+'</details>':'';
  return {html:overview+bms+'<h4>Documentos principais e evidências capturadas</h4>'+docsTable+candidatesHTML+findingsTable+
   (notes.length?'<p class="r-alert">'+notes.map(esc).join(' ')+'</p>':''),
   count:docs.length,records:rows.length,issues:notes,docs};
 }
 function balanceData(id,p){
  const linked=linkedDocs(id,'BALANCO'),ficha=readFicha(id);
  // Correspondências textuais são apenas candidatas, nunca tratadas como vínculos confirmados.
  const raw=window.PUCCorrelacao?.balancoRows?.()||[];
  // Não multiplicar a mesma sugestão ao percorrer PDFs/CSV ou versões do mesmo Balanço.
  // Correspondência textual é candidata, mesmo quando há ID_governa; não gera soma financeira.
  const exactId=String(p.id_governa||'').trim(), uf=norm(p.uf);
  const possible=raw.filter(r=>{
   const sameUF=!!uf&&norm(r.uf)===uf;
   if(!sameUF)return false;
   const idMatch=!!exactId&&String(r.id||'').trim()===exactId;
   const titleMatch=norm(r.empreendimento)===norm(p.empreendimento);
   return idMatch||titleMatch||window.PUCCorrelacao?.projectSuggestions?.(r)?.some(x=>x.id===id);
  });
  const deduped=[...new Map(possible.map(r=>[
   [String(r.id||''),norm(r.uf),norm(r.empreendimento),String(r.arquivo||'')].join('|'),r
  ])).values()];
  deduped.sort((a,b)=>String(a.empreendimento||'').localeCompare(String(b.empreendimento||''),'pt-BR'));
  return {linked,ficha:ficha.balance,possible:deduped};
 }
 function balanceHTML(id,p){
  const b=balanceData(id,p);
  const keys=[
   ['global','Valor global do investimento'],['physical','Execução física (%)'],
   ['financial','Execução financeira (%)'],['start','Início informado'],
   ['end_plan','Conclusão prevista'],['end_real','Conclusão efetiva'],
   ['cutoff','Data de referência/corte'],['evidence','Documento de comprovação'],
   ['same_scope','Mesmo objeto/escopo declarado'],['verified','Conferido pelo operador']];
  const known=new Set(keys.map(([k])=>k));
  const extra=b.ficha?Object.entries(b.ficha).filter(([k,v])=>
   !known.has(k)&&!isBlank(v)&&typeof v!=='object').map(([k,v])=>[k,v]):[];
  const structured=b.ficha?table(['Indicador','Informação registrada'],
    [...keys.map(([k,label])=>[
      val(label),typeof b.ficha[k]==='boolean'?val(b.ficha[k]?'Sim':'Não'):
      k==='global'?money(b.ficha[k]):val(b.ficha[k])
    ]),...extra.map(([k,v])=>[val(k.replace(/_/g,' ')),val(v)])]
   ):'<p class="r-empty">Balanço não conferido/incorporado à ficha da PUC nesta sessão.</p>';
  const docs=table(['Arquivo do Balanço vinculado','Referência','Situação de leitura'],b.linked.map(d=>[
   val(d.name),val(d.ref),val(d.quality)+' · '+val(d.category)
  ]),'Nenhum arquivo do Balanço com vínculo explícito à PUC.');
  const balMoney=x=>{const n=window.PUCQuadroValores?.parseMoney?.(x);
    return n===null||!Number.isFinite(n)?'—':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});};
  const candidates=b.possible.length?
   '<details class="r-candidates"><summary><b>Correspondências preliminares do Balanço ('+b.possible.length+')</b> — expandir para conferir, sem atribuição automática de valores</summary>'+
   '<p class="muted">Os registros abaixo são sugestões de identidade da obra. O Balanço pode conter diversas frentes, etapas e contratos na mesma UF.</p>'+
   table(['ID Governa','UF','Empreendimento','Valor global','Físico','Início','Término','Documento'],b.possible.map(r=>[
    val(r.id||'—'),val(r.uf),val(r.empreendimento),balMoney(r.valor_global),
    !isBlank(r.execucao_fisica)?val(r.execucao_fisica)+'%':'—',
    val(window.PUCCorrelacao?.dateString?.(r.inicio)||r.inicio),
    val(window.PUCCorrelacao?.dateString?.(r.termino)||r.termino),
    val(r.arquivo)+'<small>'+val(r.referencia)+'</small>'
   ]))+'</details>':
   '<p class="muted">Nenhuma correspondência preliminar de objeto/UF identificada no Balanço.</p>';
  return {html:'<h4>Dados estruturados vinculados à ficha</h4>'+structured+
    '<h4>Documentos do Balanço com vínculo explícito</h4>'+docs+candidates,
    count:b.linked.length,records:b.ficha?keys.filter(([k])=>!isBlank(b.ficha[k])).length:0,
    issues:!b.ficha?['Sem Balanço conferido na ficha do empreendimento.']:[],balance:b.ficha};
 }
 function docasMatches(id,p){
  const rows=Array.isArray(window.PUC_DOCAS_DECLARACOES_EXTERNAS)?
   window.PUC_DOCAS_DECLARACOES_EXTERNAS:[];
  const idGov=String(p.id_governa||'').trim();
  // ID governa explícito ou nome exato + Companhia + UF; jamais semelhança vaga.
  return rows.filter(r=>{
   const co=norm(r.companhia_nome),codigo=norm(r.companhia_codigo),company=norm(p.empresa);
   // Preferir o código institucional. Nomes completos são admissíveis apenas com equivalência inequívoca.
   // A declaração institucional pode trazer o nome completo, enquanto a
   // carteira utiliza a sigla CODERN. Só aceitar a equivalência institucional
   // explícita, sempre combinada com UF e ID/objeto da obra.
   const aliases={
    CODERN:['COMPANHIA DOCAS DO RIO GRANDE DO NORTE','COMPANHIA DOCAS DO RIO GRANDE DO NORTE CODERN']
   };
   const normalized=company.replace(/ /g,'');
   const companyOk=!!company&&(codigo===company||co===company||
      (aliases[normalized]||[]).includes(co));
   const ufOk=!!norm(p.uf)&&norm(r.uf)===norm(p.uf);
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
 ['analise','Análise do gestor'],['responsavel_preenchimento','Responsável pelo preenchimento']
 ];
 function docasHTML(id,p){
  // Gestor autenticado via token (fluxo vigente); um elemento antigo pdc-admin
  // não é prova nem requisito de sessão. O carregamento protegido define as declarações.
  const authorized=!!($('pdc-admin')&&!$('pdc-admin').hidden && Array.isArray(window.PUC_DOCAS_DECLARACOES_EXTERNAS));
  const all=authorized&&Array.isArray(window.PUC_DOCAS_DECLARACOES_EXTERNAS)?
   window.PUC_DOCAS_DECLARACOES_EXTERNAS:[];
  const rows=authorized?docasMatches(id,p):[];
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
  if(code==='SEI')return bmsHTML(id,p);
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
  // Matriz de rastreabilidade não transforma contagem de fontes em validação.
  const traceRows=[
   ['SEI / BMs','Medições e documentos contratuais','PUC + contrato + BM + competência + referência SEI',
     panels.find(x=>x.code==='SEI')?.count||0,
     'Conferência dos BMs é indispensável; extração OCR/textual é apenas candidata.'],
   ['Balanço','Valor global, prazos e percentual físico do empreendimento',
     'ID Governa + UF + objeto + data de corte + documento',
     panels.find(x=>x.code==='BALANCO')?.count||0,
     'Correspondências por nome/UF devem ser confirmadas antes de atribuir valores.'],
   ['SIOP','Dotação, empenho, liquidação e pagamento da União',
     'Ação/PO + exercício + competência + referência da consulta',
     filteredRows.filter(x=>x.source==='SIOP').length,
     'Não equivale a medição contratual, aplicação da PUC ou execução física.'],
   ['DOCAS','Declarações externas e valores informados pelas companhias',
     'Código da companhia + UF + ID ou objeto + protocolo + validação SNP',
     panels.find(x=>x.code==='DOCAS')?.count||0,
     'Declarações recebidas não constituem validação da SNP.']
  ].filter(x=>selected.includes(({'SEI / BMs':'SEI','Balanço':'BALANCO','SIOP':'SIOP','DOCAS':'DOCAS'})[x[0]]));
  const trace=section(++n,'Matriz de rastreabilidade — Documentos × Relatório Analítico',
   '<p>O número de registros é indicativo e não representa prova de equivalência entre fontes. A matriz identifica o requisito de vínculo antes de qualquer comparação.</p>'+
   table(['Fonte','Natureza do dado','Chaves e provas necessárias','Itens na seleção','Ressalva'],traceRows.map(x=>[
    val(x[0]),val(x[1]),val(x[2]),val(x[3]),val(x[4])
   ]),'Nenhuma fonte com registro comprovadamente vinculado neste recorte.'));
  const investmentIndicators=window.PUCIndicadores?.dashboard?
    section(1,'Indicadores de investimento e execução',window.PUCIndicadores.dashboard(id,p)):
    section(++n,'Indicadores — valor investido, valor pago e execução','<p>Indicadores indisponíveis neste carregamento.</p>');
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
  const findings=section(3,'Constatações e pendências',
   table(['Fonte','Situação','Descrição','Referência'],audits.map(x=>[
    val(ctx.sourceLabel(x.source_a)+' × '+ctx.sourceLabel(x.source_b)),
    val(x.status),val(x.reason),val((x.evidence_a||'')+' / '+(x.evidence_b||''))
   ]),'Não foram identificadas divergências *verificáveis* nos pares de dados incluídos. Isso não equivale a conformidade integral.')+
   (r.issues.length?'<h4>Limitações e diligências de complementação</h4>'+
    '<ul>'+r.issues.map(x=>'<li><b>'+val(sourceLabels[x.source]||x.source)+':</b> '+val(x.message)+'</li>').join('')+'</ul>':''));
  // Dispositivos identificados nos documentos fornecidos. Nunca imputar descumprimento automaticamente.
  // A lei contratual aplicável depende da natureza da entidade, regime e data da contratação.
  const normRefs={
   n14133scope:'Lei nº 14.133/2021, art. 1º, § 1º (ressalva das estatais, regidas pela Lei nº 13.303/2016)',
   n14133exec:'Lei nº 14.133/2021, art. 115 (execução fiel às cláusulas contratuais)',
   n14133fiscal:'Lei nº 14.133/2021, art. 117 (acompanhamento e fiscalização da execução)',
   n14133contract:'Lei nº 14.133/2021, art. 92 (cláusulas necessárias do contrato)',
   n14133accept:'Lei nº 14.133/2021, art. 140 (recebimento do objeto)',
   tcuRegimes:'TCU, Licitações e Contratos, 5ª edição, item 4.4.1 (regimes de execução e critérios de medição)',
   tcuProjeto:'TCU, Licitações e Contratos, 5ª edição, itens 4.4.3.3 e 4.4.3.5 (especificações, critérios de medição e programação)',
   sinapi:'CAIXA, SINAPI — Cálculos e Parâmetros, 8ª edição (2026): referência técnica de custos, quando pertinente',
   sicro:'DNIT, Manual de Custos de Infraestrutura de Transportes, volume 03, 2ª edição (2025): preços referenciais, quando pertinente'
  };
  const entries=[
   ...audits.map(a=>({
    tipo:'Constatação técnica a verificar',
    fato:ctx.sourceLabel(a.source_a)+' × '+ctx.sourceLabel(a.source_b)+' — '+plain(a.reason),
    evidencia:[a.evidence_a,a.evidence_b].filter(Boolean).join(' / ')||'Referência documental não identificada',
    pendencia:'Conferir identidade de objeto, contrato, indicador, unidade, competência e data de corte; apurar a causa da divergência.',
    fundamento:'Potencial referência contratual: '+normRefs.n14133contract+'; '+normRefs.n14133exec+'. Aplicabilidade condicionada ao regime do contrato.',
    conclusao:'Sem conclusão jurídica automática; exige instrumento contratual, documentação original e exame do regime.'
   })),
   ...r.issues.map(i=>({
    tipo:'Pendência administrativa/documental',
    fato:(sourceLabels[i.source]||i.source)+' — '+plain(i.message),
    evidencia:'Fonte indicada no relatório; documento original ou vínculo ainda deve ser confirmado',
    pendencia:'Solicitar/complementar evidência, identificar responsável e registrar a resposta à diligência.',
    fundamento:'Referência orientativa, não imputação: '+normRefs.n14133fiscal+'; '+normRefs.tcuProjeto+'. Aplicar apenas se o regime e o escopo forem pertinentes.',
    conclusao:'Pendência de instrução; ausência de documento na sessão não demonstra descumprimento legal.'
   }))
  ];
  const legalRows=entries.map(e=>[
   val(e.tipo),val(e.fato),val(e.evidencia),val(e.pendencia),val(e.fundamento),val(e.conclusao)
  ]);
  const legal=section(++n,'Fundamentação normativa, evidências e análise jurídica',
   '<p><b>Verificação do regime jurídico é obrigatória:</b> identificar contratante, natureza da entidade, lei de regência, edital, contrato, data e aditivos. '+
   esc(normRefs.n14133scope)+'. O BI não aplica automaticamente a Lei nº 14.133/2021 a contratos de estatais nem substitui a Lei nº 13.303/2016 e o regulamento interno pertinente.</p>'+
   '<h4>Relação das constatações com a documentação e dispositivos a conferir</h4>'+
   table(['Classificação','Fato/constatação','Evidência técnica','Pendência ou providência administrativa','Referência normativa candidata — verificar incidência','Conclusão jurídica'],legalRows,
   'Não há constatação individual verificável nesta seleção. Nenhuma irregularidade pode ser presumida da ausência de achados.')+
   '<h4>Referências conferidas nos materiais disponibilizados</h4>'+
   '<ul>'+Object.values(normRefs).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
   '<p><b>Limite da análise:</b> os manuais do TCU, SINAPI e SICRO são fontes de orientação técnica/jurisprudencial e referência de custos, conforme o caso; não constituem, por si, dispositivo legal infringido. '+
   'Decretos sobre transferências, registro de preços e concessões somente serão relacionados quando o objeto e o instrumento demonstrarem sua incidência.</p>'+
   '<p><b>Conclusão jurídica:</b> pendente de enquadramento individual e validação da área competente. Diferenças de valor, lacunas de documentos e atrasos indicados não são automaticamente irregularidades.</p>');
  const recommendations=[
   ...r.issues.map(x=>'Para '+(sourceLabels[x.source]||x.source)+': '+x.message),
   ...audits.map(x=>'Conferir '+ctx.sourceLabel(x.source_a)+' × '+ctx.sourceLabel(x.source_b)+': '+x.reason),
   'Vincular cada documento a PUC, contrato, objeto e data de referência antes de comparar percentuais ou valores.',
   'Submeter o histórico das medições e os resultados do Balanço e DOCAS à validação técnica da SNP.'
  ];
  const conclusion=section(5,'Conclusão e providências',
   '<p>'+((filteredRows.length||panels.some(x=>x.count))?
    'Há informações documentais ou estruturadas relacionadas ao empreendimento, identificadas nas seções precedentes. Sua suficiência depende de conferência de vínculos, datas e documentos originais.':
    'Não há evidências suficientes na seleção atual para emitir conclusão sobre execução física ou financeira.')+'</p>'+
   '<p><b>Conclusão:</b> análise técnica documental <b>preliminar e não homologada</b>. '+
   (audits.length?'Há '+audits.length+' confronto(s) que exigem exame e saneamento; ':'')+
   (r.issues.length?'Há '+r.issues.length+' limitação(ões) de disponibilidade/vinculação documental; ':'')+
   'nenhuma dessas constatações equivale, isoladamente, a irregularidade.</p>'+
   '<h4>Providências prioritárias</h4><ol>'+[...new Set(recommendations)].slice(0,4).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+
   (recommendations.length>4?'<p class="muted">Demais diligências detalhadas estão disponíveis na aba Documentos.</p>':'')+
   '<p><b>Conferência/homologação SNP:</b> PENDENTE. <b>Uso:</b> assessoramento e revisão documental.</p>');
  // Relatório executivo: cinco blocos. A biblioteca Documentos preserva o exame
  // pormenorizado dos BMs, valores, cronogramas e confrontos técnicos.
  // Exibir associações registradas de BM do SEI no Balanço da PUC selecionada.
  // A identidade deve ser por ID Governa/UF ou nome exato/UF; sem similaridade livre.
  const manager=window.PUCVinculosBM;
  const candidatesBalance=manager?.balances?.()||[];
  const currentProjectsBalance=candidatesBalance.filter(b=>
    norm(b.uf)===norm(p.uf)&&
    ((p.id_governa&&String(b.id||'').trim()===String(p.id_governa).trim())||
     norm(b.empreendimento)===norm(p.empreendimento)));
  const matchingBM=(manager?.docs?.()||[]).flatMap(d=>{
    const link=manager.get(d);
    if(!link||!currentProjectsBalance.some(b=>manager.match(d,b)))return [];
    return [{doc:d,link}];
  });
  const linkedBMReport=matchingBM.length?
   '<h4>Boletins de Medição associados pelo operador ao Balanço</h4>'+
   table(['BM','Competência','Valor medido no período','SEI e documento','Situação'],matchingBM.map(({doc,link})=>[
     val(link.bmNumber),val(link.competence),
     link.value===null?'Não extraído / a conferir':money(link.value),
     val(link.ref)+' · '+val(doc.name),
     'Associação conferida pelo operador; valor e enquadramento sujeitos à validação SNP'
   ])):'<p class="muted">Nenhum BM SEI associado a esta obra do Balanço por conferência do operador nesta sessão.</p>';
  const bmReconciliado=window.PUCBMReconciliado?.report?.(id)||'';
  const evidence=section(2,'Evidências e fontes documentais',
   '<p><b>Fontes consideradas:</b> '+esc(sourceTitle)+'. Os quantitativos são indicativos, não comprovam equivalência ou homologação.</p>'+
   table(['Fonte','Natureza','Itens','Situação'],traceRows.map(x=>[
    val(x[0]),val(x[1]),val(x[3]),val(x[4])
   ]),'Não há documentos relacionados nesta seleção.')+
   (bmReconciliado||linkedBMReport)+
   '<p class="muted">Para examinar e alterar as associações dos BMs, acesse Documentos → Vincular BMs dos processos SEI.</p>');
  const legalBrief=section(4,'Fundamentação normativa',
   '<p><b>Aplicabilidade a conferir:</b> contrato, entidade contratante, data da contratação, objeto e regime jurídico. '+
   esc(normRefs.n14133scope)+'.</p>'+
   '<p>As constatações demandam identificação de dispositivo específico antes de qualquer enquadramento. '+
   'Manuais técnicos são referências de análise, não demonstração automática de infração.</p>'+
   (legalRows.length?'<details><summary><b>Exibir referências normativas candidatas ('+legalRows.length+')</b></summary>'+
     table(['Constatação / pendência','Referência candidata','Situação jurídica'],
       entries.map(e=>[val(e.fato),val(e.fundamento),val(e.conclusao)]))+'</details>':
     '<p>Sem constatações individualizadas para enquadramento jurídico.</p>'));
  // Fluxo 2026: a ficha enxuta, alimentada pelo SEI/Balanço/DOCAS, origina o relatório.
  // A versão anterior permanece apenas como contingência se o novo módulo falhar.
  const generated=window.PUCRelatorioTriagem?.report?.(id,p,mode);
  holder.innerHTML=generated||heading+investmentIndicators+evidence+findings+legalBrief+conclusion;
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
 for(const name of ['puc-documents-updated','puc-ficha-bms-atualizados','puc:docas-externas-atualizadas','puc-bm-vinculos-atualizados']){
  window.addEventListener(name,liveRefresh);
 }
 window.PUCRelatorioFontes={render,build,exportFindings,docasMatches,linkedDocs};
})(window);
