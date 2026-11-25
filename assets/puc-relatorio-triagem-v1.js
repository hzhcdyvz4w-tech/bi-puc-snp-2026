/* Relatório Analítico PUC — ficha de extração e triagem técnica, 25/11/2026
 * Fonte SEI: medições, não pagamentos. Balanço: marcos e percentuais informados.
 * DOCAS: declarações recebidas e vinculadas, dependentes de autenticação gerencial.
 * Critérios de risco são indicativos, não imputação de irregularidade.
 */
(function(w){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 const isValue=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&String(v).trim()!=='Não informado';
 const num=v=>{if(!isValue(v))return null;const s=String(v).trim().replace('%','').replace(/\s/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)&&n>=0&&n<=100?n:null};
 const money=v=>{if(!isValue(v))return null;if(typeof v==='number')return Number.isFinite(v)?v:null;const s=String(v).replace(/R\$\s*/gi,'').trim();if(!/^-?[\d.,]+$/.test(s))return null;const n=Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s);return Number.isFinite(n)?n:null};
 const brl=v=>v===null?'Não informado':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const pct=v=>v===null?'Não informado':v.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
 const iso=v=>{if(!isValue(v))return null;const s=String(v).trim();let y,m,d;
  if(/^\d{5}$/.test(s)&&Number(s)>30000&&Number(s)<100000)return sliceDate(new Date(Date.UTC(1899,11,30)+Number(s)*86400000));
  if(/^\d{4}-\d{2}-\d{2}/.test(s)){[y,m,d]=s.slice(0,10).split('-').map(Number)}
  else if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){[d,m,y]=s.split('/').map(Number)}
  else return null;
  const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?sliceDate(date):null
 };
 const sliceDate=d=>d.toISOString().slice(0,10);
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const days=(a,b)=>Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000);
 const fmtDate=s=>s?s.split('-').reverse().join('/'):'Não informado';
 const registry=()=>{try{return JSON.parse($('embedded-data')?.textContent||'{}').projetos||[]}catch{return []}};
 const selected=(mode,source)=>mode==='TODAS'||mode===source;
 const docasLogged=()=>!!($('pdc-admin')&&!$('pdc-admin').hidden&&Array.isArray(w.PUC_DOCAS_DECLARACOES_EXTERNAS));
 const monthIndex=v=>{
  const names=['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  const t=norm(v).replace(/\s/g,''); const mm=names.findIndex(n=>t.includes(n)); const year=t.match(/20\d\d/);
  return year&&mm>=0?Math.floor(Date.UTC(Number(year[0]),mm,1)/86400000):null;
 };
 const priority=b=>{
  const precise=iso(b.data_referencia||b.data_atualizacao);
  return precise?Math.floor(Date.parse(precise+'T00:00:00Z')/86400000):
   (monthIndex(b.mes_referencia||b.arquivo)||0);
 };
 const fingerprint=b=>[
  b.id,norm(b.uf),norm(b.empreendimento),b.valor_global,b.valor_investido,b.valor_pago,
  b.execucao_fisica,b.execucao_financeira,b.inicio,b.termino,b.data_referencia
 ].map(v=>String(v??'')).join('|');

 function raw(id,p,mode){
  const out={id,company:p.empresa||'',uf:p.uf||'',name:p.empreendimento||'',po:p.po||'',acao:p.acao||'',mode,
   refs:[],physical:null,financial:null,global:null,invested:null,paid:null,medido:null,
   start:null,end:null,asOf:null,sourceOf:{},restrictions:'',phase:'',fiscalReport:false,
   docasStatus:'Indisponível / não autenticada',dataWarnings:[],sourceChecks:[],timelineSnapshots:[]};
  const push=(fonte,field,value,ref,status='Extração preliminar')=>{
   if(!selected(mode,fonte))return;
   out.refs.push({fonte,field,valor:String(value??''),ref:String(ref||'Sem referência'),status});
  };
  const set=(key,value,fonte,ref)=>{
   if(!isValue(value)||isValue(out.sourceOf[key]))return;
   const v=['physical','financial'].includes(key)?num(value):['global','invested','paid'].includes(key)?money(value):value;
   if(v===null||v===undefined)return;
   out[key]=v;out.sourceOf[key]=fonte+' · '+ref;
  };
  const bm=selected(mode,'SEI')?w.PUCBMReconciliado?.forProject?.(id):null;
  if(bm){
   out.medido=bm.totalCents/100;
   const x=w.PUCBMReconciliado?.compute?.();
   push('SEI','Medição contratual acumulada',brl(out.medido),'Contrato 026/2025 · '+bm.rubrica+' · SEI '+(x?.baseSEI||'base a conferir')+' / '+(x?.reajSEI||'reajuste a conferir'),'Conciliação documental não homologada');
  }
  const lib=selected(mode,'SEI')?(w.PUCDocLibrary?.list?.()||[]):[];
  const linked=lib.filter(d=>d.origin==='SEI'&&(String(d.project||'')===String(id)||(d.projects||[]).includes(id)));
  const fiscal=linked.filter(d=>/relat[oó]rio\s+(de\s+)?fiscaliza[çc][aã]o/i.test(d.name||'')||/relat[oó]rio\s+(de\s+)?fiscaliza[çc][aã]o/i.test(String(d.text||'').slice(0,1000)));
  out.fiscalReport=!!fiscal.length;
  if(linked.length)push('SEI','Documentos vinculados',linked.length+' arquivo(s)',linked.slice(0,3).map(d=>d.name).join(' | '),'Vínculo local com a PUC');
  if(fiscal.length)push('SEI','Relatório de fiscalização identificado',fiscal.length+' arquivo(s)',fiscal.map(d=>d.name).join(' | '));
  const ficha=selected(mode,'SEI')?w.PUCFichasBM?.getState?.():null;
  const fichaFis=(ficha?.balances||{})[id];
  if(fichaFis?.verified){
   set('physical',fichaFis.physical,'SEI / ficha conferida',fichaFis.evidence||'Ficha local');
   set('financial',fichaFis.financial,'SEI / ficha conferida',fichaFis.evidence||'Ficha local');
   set('end',iso(fichaFis.end_plan),'SEI / ficha conferida',fichaFis.evidence||'Ficha local');
  }
  // Vinculação estrita do Balanço: ID GovernA + UF, ou objeto integral idêntico + UF.
  if(selected(mode,'BALANCO')){
   const all=(w.PUCCorrelacao?.balancoRows?.()||[]).filter(b=>norm(b.uf)===norm(p.uf));
   const numericGov=/^\d+$/.test(String(p.id_governa||''))?String(p.id_governa):'';
   const matched=all.filter(b=>(numericGov&&String(b.id)===numericGov)||
     (bm?.idGoverna&&String(b.id)===String(bm.idGoverna))||
     (norm(b.empreendimento)===norm(p.empreendimento)&&!!norm(p.empreendimento)));
   const byContent=new Map(matched.map(b=>[fingerprint(b),b]));
   const options=[...byContent.values()].sort((a,b)=>priority(b)-priority(a));
   // Várias importações do mesmo Balanço não representam registros independentes.
   // Selecionar edição mais recente apenas se houver ordenação documental segura.
   const mostRecent=options.at(-1);
   const top=mostRecent?priority(mostRecent):0;
   const equalTop=options.filter(b=>priority(b)===top);
   const contradictory=equalTop.length>1&&new Set(equalTop.map(fingerprint)).size>1;
   const comparable=options.length===1||(top>0&&!contradictory&&equalTop.length===1);
   if(options.length&&comparable){
    const b=mostRecent,ref=(b.arquivo||'Balanço')+' · ID '+(b.id||'não informado');
    if(options.length>1)out.dataWarnings.push('Foram localizadas '+options.length+' versões do Balanço; selecionada a mais recente identificável ('+ref+'). A versão deve ser conferida pela SNP.');
    set('global',b.valor_global,'BALANÇO',ref);
    set('invested',b.valor_investido,'BALANÇO',ref);
    set('paid',b.valor_pago,'BALANÇO',ref);
    set('physical',b.execucao_fisica,'BALANÇO',ref);
    set('financial',b.execucao_financeira,'BALANÇO',ref);
    set('start',iso(b.inicio),'BALANÇO',ref);
    set('end',iso(b.termino),'BALANÇO',ref);
    set('asOf',iso(b.data_referencia),'BALANÇO',ref);
    push('BALANCO','Empreendimento identificado','ID '+b.id+' · '+(b.execucao_fisica??'—')+'% físico',ref,'Identificação por ID/objeto e UF; situação declarada no Balanço');
    out.timelineSnapshots.push({fonte:'BALANÇO',ref,physical:num(b.execucao_fisica),financial:num(b.execucao_financeira),end:iso(b.termino),asOf:iso(b.data_referencia)});
    push('BALANCO','Execução física',pct(num(b.execucao_fisica)),ref,'Balanço informado, sem homologação');
    if(num(b.execucao_financeira)!==null)push('BALANCO','Execução financeira',pct(num(b.execucao_financeira)),ref,'Balanço informado');
    if(iso(b.termino))push('BALANCO','Conclusão prevista',fmtDate(iso(b.termino)),ref,'Cronograma informado; validar aditivos');
    if(iso(b.data_referencia))push('BALANCO','Data de referência',fmtDate(iso(b.data_referencia)),ref,'Data extraída');
    if(!iso(b.data_referencia))out.dataWarnings.push('Balanço sem dia exato de referência; valores podem ser mostrados, mas não concluem atraso por si só.');
   }else if(options.length>1){
    out.dataWarnings.push('Há '+options.length+' versões ou registros incompatíveis do Balanço sem data segura para escolher. Conferir a edição correta para atribuir indicadores.');
   }else out.dataWarnings.push('Nenhuma linha inequívoca do Balanço associada a esta PUC nesta sessão.');
  }
  if(selected(mode,'DOCAS')){
   const docs=docasLogged()?(w.PUCRelatorioFontes?.docasMatches?.(id,p)||[]):[];
   if(!docasLogged())out.dataWarnings.push('Central DOCAS não autenticada; declarações centrais não acessíveis nesta sessão.');
   else if(!docs.length)out.dataWarnings.push('Sem declaração DOCAS vinculada inequivocamente ao empreendimento.');
   else {
    const ordered=docs.slice().sort((a,b)=>String(b.data_atualizacao||b.enviado_em||'').localeCompare(String(a.data_atualizacao||a.enviado_em||'')));
    const d=ordered[0],ref='Protocolo '+(d.protocolo||'não informado')+' · '+(d.enviado_em||'sem data');
    out.docasStatus=String(d.status||'recebida');
    set('global',d.investimento_total,'DOCAS',ref);
    set('physical',d.execucao_fisica,'DOCAS',ref);
    set('financial',d.execucao_financeira,'DOCAS',ref);
    set('start',iso(d.inicio),'DOCAS',ref);
    set('end',iso(d.conclusao_prevista),'DOCAS',ref);
    set('asOf',iso(d.data_atualizacao)||iso(d.enviado_em),'DOCAS',ref);
    out.restrictions=d.restricoes_pendencias||'';
    out.phase=[d.situacao,d.fase].filter(Boolean).join(' · ');
    out.timelineSnapshots.push({fonte:'DOCAS',ref,physical:num(d.execucao_fisica),financial:num(d.execucao_financeira),end:iso(d.conclusao_prevista),asOf:iso(d.data_atualizacao)||iso(d.enviado_em)});
    push('DOCAS','Execução física declarada',pct(num(d.execucao_fisica)),ref,'Declaração externa — '+out.docasStatus);
    if(num(d.execucao_financeira)!==null)push('DOCAS','Execução financeira declarada',pct(num(d.execucao_financeira)),ref,'Declaração externa — '+out.docasStatus);
    if(iso(d.conclusao_prevista))push('DOCAS','Conclusão prevista declarada',fmtDate(iso(d.conclusao_prevista)),ref,'Conferir cronograma vigente');
    push('DOCAS','Declaração mais recente',out.phase||'sem fase informada',ref,'Declaração externa — '+out.docasStatus);
    if(ordered.length>1)out.dataWarnings.push('Há '+ordered.length+' declarações DOCAS; foi utilizada a mais recente por data declarada, sem homologação automática.');
   }
  }
  // Usar apenas um conjunto coerente (físico/prazo/corte) para concluir sobre atraso.
  // O valor individual continua atribuído à fonte original na trilha documental.
  const preferred=out.timelineSnapshots.filter(t=>t.physical!==null&&t.asOf&&t.end)
   .sort((a,b)=>String(a.asOf).localeCompare(String(b.asOf))).at(-1);
  const physicalOrigin=String(out.sourceOf.physical||'').split(' · ')[0];
  const cutoffOrigin=String(out.sourceOf.asOf||'').split(' · ')[0];
  if(preferred&&(!out.asOf||physicalOrigin!==cutoffOrigin||out.physical===null)){
   out.physical=preferred.physical;out.end=preferred.end;out.asOf=preferred.asOf;
   out.sourceOf.physical=preferred.fonte+' · '+preferred.ref;
   out.sourceOf.end=preferred.fonte+' · '+preferred.ref;
   out.sourceOf.asOf=preferred.fonte+' · '+preferred.ref;
   out.dataWarnings.push('Diagnóstico de prazo calculado com físico, conclusão e data de corte da mesma fonte: '+preferred.fonte+'.');
  }else if(physicalOrigin&&cutoffOrigin&&physicalOrigin!==cutoffOrigin){
   out.asOf=null;out.dataWarnings.push('Execução física e data de corte vêm de fontes distintas: não classificar atraso automaticamente.');
  }
  const selectedNames=['SEI','BALANCO','DOCAS'];
  out.sourceChecks=selectedNames.map(fonte=>{
   if(!selected(mode,fonte))return {fonte,situacao:'Fora do filtro selecionado',qtd:0};
   const found=out.refs.filter(r=>r.fonte===fonte);
   let detail=fonte==='BALANCO'? 'Importe e identifique o Balanço na aba Documentos':
     fonte==='DOCAS'?'Autentique a Central DOCAS e confirme o vínculo por empreendimento':
     'Importe e vincule documentos/BMs no módulo Documentos';
   if(fonte==='DOCAS'&&!docasLogged())detail='Central DOCAS sem acesso gerencial autorizado';
   return {fonte,situacao:found.length?'Dados extraídos':'Sem registro vinculado',qtd:found.length,detail};
  });
  return out;
 }
 const choices={
  automatico:'Manter diagnóstico automático',a_iniciar:'A iniciar — planejamento informado',em_andamento:'Em andamento — confirmado pelo gestor',
  atraso:'Indício de atraso — confirmar',concluida:'Conclusão informada — confirmar recebimento',
  paralisada:'Paralisação informada — confirmar',insuficiente:'Informação insuficiente'
 };
 function assess(x,review={}){
  const hasCutoffEvidence=!!String(review.evidence||review.notes||'').trim();
  const manualEnd=iso(review.end),manualCutoff=iso(review.cutoff);
  const end=(manualEnd&&(!x.end||manualEnd!==x.end)&&!hasCutoffEvidence?null:manualEnd)||x.end;
  const asOf=(manualCutoff&&(!x.asOf||manualCutoff!==x.asOf)&&!hasCutoffEvidence?null:manualCutoff)||x.asOf;
  const physical=x.physical;
  let kind='insuficiente',detail='Não foi possível concluir a situação física por falta de informações com data de referência verificável.';
  let duration=null;
  if(x.phase&&/paralisad|suspendid/i.test(x.phase)){kind='paralisada';detail='Paralisação informada pelas DOCAS; exige verificação documental e manifestação da companhia.'}
  else if(physical===100){kind='concluida';detail='Execução física de 100% informada; recebimento e encerramento não comprovados.'}
  else if(end&&asOf&&physical!==null){
   duration=days(asOf,end);
   if(duration>0&&physical<100){kind='atraso';detail='A data prevista informada foi ultrapassada em '+duration+' dia(s) na data de corte da fonte e a execução física registrada era '+pct(physical)+'. Confirmar aditivos/prorrogações e atualização.'}
   else if(physical===0){kind='a_iniciar';detail='Execução física informada em 0% e prazo final ainda não ultrapassado na data de corte; confirmar ordem de serviço e início contratual.'}
   else{kind='em_andamento';detail='Execução física de '+pct(physical)+' informada, sem prazo final ultrapassado na data de corte disponível.'}
  }else if(physical!==null&&end&&!asOf){
   detail='Há execução física e prazo final informados, mas a fonte não registra data de corte verificável: atraso não classificável automaticamente.';
  }else if(physical!==null){kind='em_andamento';detail='Execução física informada em '+pct(physical)+'; cronograma e data de corte insuficientes para concluir sobre atraso.'}
  const now=today();
  if(x.asOf&&days(now,x.asOf)>90)detail+=' A fonte principal está defasada há mais de 90 dias (limiar técnico de triagem, não prazo legal).';
  const alerts=[];
  if((manualEnd&&manualEnd!==x.end||manualCutoff&&manualCutoff!==x.asOf)&&!hasCutoffEvidence)alerts.push('Data ou prazo alterado manualmente sem referência/justificativa; alteração ignorada no diagnóstico.');
  if(kind==='atraso')alerts.push('Prazo final superado na data de referência informada; verificar termo aditivo e reprogramação.');
  if(x.restrictions)alerts.push('Pendências ou restrições declaradas pelas DOCAS: '+x.restrictions);
  if(!x.fiscalReport&&x.medido!==null)alerts.push('Não foi identificado relatório de fiscalização vinculado à PUC nesta seleção; não significa inexistência no SEI.');
  if(x.physical===null)alerts.push('Percentual de execução física não localizado em fonte selecionada.');
  if(!end)alerts.push('Data final de cronograma não localizada ou não confirmada.');
  alerts.push(...x.dataWarnings);
  let visit='diligencia',visitWhy='Priorizar diligência documental e atualização do cronograma; avaliar visita técnica se os indícios persistirem.';
  if(kind==='atraso'&&(duration>=30||!!x.restrictions)){
   visit='vistoria';visitWhy='Há indício temporal de atraso associado a prazo transcorrido ou restrições declaradas. Propor avaliação de vistoria presencial após examinar justificativas, custo-benefício e competência do órgão.';
  }else if(kind==='em_andamento'&&!alerts.length){visit='sem_indicacao';visitWhy='Os dados atualmente disponíveis não justificam, isoladamente, priorização de vistoria.'}
  const hasReason=!!String(review.notes||review.evidence||'').trim();
  if(review.situation&&review.situation!=='automatico'){
   if(hasReason){kind=review.situation;detail+=' Classificação técnica ajustada pelo gestor: '+(choices[kind]||kind)+'.'}
   else alerts.push('Classificação manual não aplicada: é necessária justificativa ou referência documental.');
  }
  if(review.visit&&review.visit!=='automatico'){
   if(hasReason){visit=review.visit;visitWhy='Proposta de encaminhamento ajustada pelo gestor, conforme fundamentação registrada; exige decisão competente.';}
   else alerts.push('Encaminhamento manual de vistoria não aplicado sem justificativa ou referência documental.');
  }
  return {kind,detail,alerts,visit,visitWhy,end,asOf,duration};
 }
 const reviewKey=(id,mode)=>'PUC_TRIAGEM_RELATORIO_V1_'+id+'_'+mode;
 function readReview(id,mode){try{return JSON.parse(localStorage.getItem(reviewKey(id,mode))||'{}')||{}}catch{return {}}}
 function saveReview(id,mode,review){try{localStorage.setItem(reviewKey(id,mode),JSON.stringify(review))}catch{}}
 const current=()=>{const id=$('report-project')?.value||'',mode=$('report-source')?.value||'TODAS',p=registry().find(p=>String(p.id)===String(id));return {id,mode,p}};
 function collectReview(id,mode){
  const form=$('puc-triagem-form');if(!form||form.dataset.context!==id+'|'+mode)return readReview(id,mode);
  const review={end:$('puc-triagem-end')?.value||'',cutoff:$('puc-triagem-cutoff')?.value||'',
   situation:$('puc-triagem-situacao')?.value||'automatico',visit:$('puc-triagem-vistoria')?.value||'automatico',
   notes:$('puc-triagem-notas')?.value?.slice(0,1200)||'',evidence:$('puc-triagem-evidencia')?.value?.slice(0,250)||''};
  saveReview(id,mode,review);return review;
 }
 const selectOpts=(options,v)=>options.map(([key,label])=>'<option value="'+esc(key)+'"'+(key===v?' selected':'')+'>'+esc(label)+'</option>').join('');
 function renderForm(){
  const root=$('puc-triagem-panel');if(!root)return;
  const {id,mode,p}=current();
  if(!p){root.innerHTML='<p class="muted">Escolha um empreendimento para extrair os dados das fontes e preparar o relatório.</p>';return}
  const x=raw(id,p,mode),review=readReview(id,mode),ass=assess(x,review);
  const items=[
   ['Execução física',pct(x.physical),x.sourceOf.physical],
   ['Execução financeira',pct(x.financial),x.sourceOf.financial],
   ['Valor global',brl(x.global),x.sourceOf.global],
   ['Valor medido (BM/SEI)',brl(x.medido),'SEI · não equivale a pagamento'],
   ['Valor investido',brl(x.invested),x.sourceOf.invested],
   ['Valor pago',brl(x.paid),x.sourceOf.paid]
  ];
  const sourceSummary='<div class="puc-triagem-origins"><b>Cobertura das fontes selecionadas</b>'+
   '<div class="puc-triagem-origin-grid">'+x.sourceChecks.map(c=>'<div><strong>'+esc(c.fonte)+'</strong><span>'+esc(c.situacao)+'</span><small>'+esc(c.detail||c.qtd+' evidência(s) extraída(s)')+'</small></div>').join('')+'</div></div>';
  const restricted=mode!=='TODAS'?'<p class="puc-triagem-filter"><b>Filtro atual: '+esc(mode)+'.</b> Neste modo, as demais fontes não são consultadas. Para reunir as informações do relatório, use o botão abaixo.</p><button class="btn" type="button" id="puc-triagem-consolidar">Reunir SEI + Balanço + DOCAS</button>':'';
  root.innerHTML='<div class="puc-triagem-head"><h3>Ficha de extração e conferência</h3><span class="puc-triagem-state">'+esc(choices[ass.kind])+'</span></div>'+
   '<p class="muted">Extração por vínculo documental. Valores ausentes não são preenchidos artificialmente. As informações são preliminares até a conferência pela SNP.</p>'+restricted+sourceSummary+
   '<div class="puc-triagem-cards">'+items.map(([name,value,ref])=>'<div><small>'+esc(name)+'</small><strong>'+esc(value)+'</strong><small>'+esc(ref||'Fonte não confirmada')+'</small></div>').join('')+'</div>'+
   '<p class="puc-triagem-diagnostico"><b>Situação sugerida:</b> '+esc(ass.detail)+'</p>'+
   '<form id="puc-triagem-form" data-context="'+esc(id+'|'+mode)+'"><div class="puc-triagem-formgrid">'+
   '<label>Conclusão prevista a conferir<input id="puc-triagem-end" type="date" value="'+esc(review.end||x.end||'')+'"></label>'+
   '<label>Data de referência da análise<input id="puc-triagem-cutoff" type="date" value="'+esc(review.cutoff||x.asOf||'')+'"></label>'+
   '<label>Situação após conferência<select id="puc-triagem-situacao">'+selectOpts(Object.entries(choices),review.situation||'automatico')+'</select></label>'+
   '<label>Encaminhamento sobre vistoria<select id="puc-triagem-vistoria">'+selectOpts([
    ['automatico','Usar recomendação técnica automática'],['diligencia','Diligenciar antes de decidir'],['vistoria','Propor avaliação de vistoria presencial'],['sem_indicacao','Não priorizar vistoria agora']
   ],review.visit||'automatico')+'</select></label>'+
   '<label class="puc-triagem-wide">Referência documental adicional (SEI / relatório / aditivo)<input id="puc-triagem-evidencia" maxlength="250" value="'+esc(review.evidence||'')+'" placeholder="Ex.: Despacho SEI ... / Termo Aditivo ..."></label>'+
   '<label class="puc-triagem-wide">Justificativa obrigatória para alterar situação ou vistoria<textarea id="puc-triagem-notas" maxlength="1200" rows="2" placeholder="Registre justificativa, providências e ressalvas">'+esc(review.notes||'')+'</textarea></label></div>'+
   '<div class="puc-triagem-actions"><button type="submit" class="btn">Salvar conferência e gerar relatório</button><button id="puc-triagem-reextrair" type="button" class="btn secondary">Atualizar dados extraídos</button><button id="puc-triagem-export" type="button" class="btn secondary">Exportar ficha JSON</button></div></form>'+
   '<details><summary>Rastreabilidade das fontes ('+x.refs.length+')</summary>'+
   (x.refs.length?'<div class="puc-triagem-scroll"><table><thead><tr><th>Fonte</th><th>Indicador</th><th>Valor informado</th><th>Referência</th><th>Conferência</th></tr></thead><tbody>'+
    x.refs.map(r=>'<tr><td>'+esc(r.fonte)+'</td><td>'+esc(r.field)+'</td><td>'+esc(r.valor)+'</td><td>'+esc(r.ref)+'</td><td>'+esc(r.status)+'</td></tr>').join('')+'</tbody></table></div>':
    '<p>Sem evidências vinculadas nesta seleção.</p>')+'</details>';
  if(mode!=='TODAS'&&$('puc-triagem-consolidar'))$('puc-triagem-consolidar').onclick=()=>{
   const source=$('report-source');if(source)source.value='TODAS';renderForm();w.showCritical?.();
  };
  const form=$('puc-triagem-form');
  form.onsubmit=e=>{e.preventDefault();collectReview(id,mode);w.showCritical?.();};
  $('puc-triagem-reextrair').onclick=()=>{collectReview(id,mode);renderForm();};
  $('puc-triagem-export').onclick=()=>{
   const m=collectReview(id,mode),d={schema:'PUC_TRIAGEM_ANALITICA_V1',id,mode,extraidoEm:new Date().toISOString(),dados:x,conferencia:m,diagnostico:assess(x,m)};
   const u=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'})),a=document.createElement('a');
   a.href=u;a.download='PUC_FICHA_TRIAGEM_'+id+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
  };
 }
 function report(id,p,mode){
  const x=raw(id,p,mode),review=collectReview(id,mode),a=assess(x,review);
  const z=(title,body,n)=>'<section class="r-section"><h3>'+n+'. '+esc(title)+'</h3>'+body+'</section>';
  const evidence=x.refs.map(r=>'<tr><td>'+esc(r.fonte)+'</td><td>'+esc(r.field)+'</td><td>'+esc(r.valor)+'</td><td>'+esc(r.ref)+'</td><td>'+esc(r.status)+'</td></tr>').join('');
  const table=x.refs.length?'<div class="puc-triagem-scroll"><table><thead><tr><th>Origem</th><th>Informação</th><th>Valor</th><th>Documento</th><th>Qualificação</th></tr></thead><tbody>'+evidence+'</tbody></table></div>':
   '<p>Não há dados com identidade documental suficiente na fonte selecionada.</p>';
  const audit=a.visit==='vistoria'?'Avaliar tecnicamente a conveniência de vistoria presencial, com despacho motivado e autorização da autoridade competente.':a.visit==='sem_indicacao'?
   'Não há indicação suficiente para priorizar vistoria neste momento; manter monitoramento.':'Solicitar esclarecimentos e documentos à companhia antes de deliberar sobre vistoria presencial.';
  const normative=[
   ['Participação da União no Capital — Portaria MINFRA nº 118/2021, arts. 5º, I, d; 6º, II e III; 7º, § 2º, IX','Planejamento, fiscalização pela estatal e acompanhamento físico do investimento'],
   ['Portaria MINFRA nº 118/2021, arts. 14, § 2º, I; 15; 16, I a IV e § 3º; 17','Relatórios de fiscalização, relatório anual quando exigível, monitoramento e possibilidade de acompanhamento in loco'],
   ['Lei nº 13.303/2016, art. 40, VII a IX','Regulamento interno da estatal sobre gestão e fiscalização de contratos e recebimento de objetos'],
   ['Lei nº 14.133/2021, art. 1º, § 1º','Ressalva das estatais: não aplicar automaticamente seus dispositivos aos contratos da companhia']
  ];
  const bullets=[...new Set(a.alerts)].slice(0,6);
  return '<div class="report-print-only">MINISTÉRIO DE PORTOS E AEROPORTOS · SNP — RELATÓRIO AUXILIAR, NÃO HOMOLOGADO</div>'+
   '<h2>Relatório Analítico do Empreendimento — '+esc(id)+'</h2>'+
   '<p><b>Empreendimento:</b> '+esc(p.empreendimento)+' · <b>Companhia:</b> '+esc(p.empresa)+' · <b>UF:</b> '+esc(p.uf||'—')+
   '<br><b>Ação / PO:</b> '+esc(p.acao||'—')+' / '+esc(p.po||'—')+' · <b>Emissão:</b> '+esc(new Date().toLocaleString('pt-BR'))+
   '<br><b>Fontes:</b> '+esc(mode==='TODAS'?'SEI + Balanço + DOCAS (SIOP apenas contexto)':'Fonte selecionada: '+mode)+
   ' · <b>Situação de validação:</b> PENDENTE de homologação SNP</p>'+
   z('Situação da obra e indicadores',
    '<p><b>Diagnóstico:</b> '+esc(choices[a.kind])+'</p><p>'+esc(a.detail)+'</p>'+
    '<div class="puc-triagem-cards">'+[
     ['Execução física',pct(x.physical)],['Execução financeira',pct(x.financial)],
     ['Medição acumulada BM/SEI',brl(x.medido)],['Valor pago à contratada',brl(x.paid)]
    ].map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join('')+'</div>'+
    '<p><b>Conclusão prevista:</b> '+fmtDate(a.end)+' · <b>Data da informação:</b> '+fmtDate(a.asOf)+'</p>',1)+
   z('Evidências SEI, Balanço e DOCAS',table+
    '<p class="muted">Medição não significa pagamento; registros de declaração não equivalem a atesto. Ausência no BI não comprova inexistência no SEI.</p>',2)+
   z('Constatações e pendências',bullets.length?'<ul>'+bullets.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>':
     '<p>Sem alerta comprovado na extração selecionada. Não equivale a conformidade integral.</p>',3)+
   z('Fundamentação normativa aplicável ao monitoramento',
    '<p>Referências condicionadas à natureza de PUC, vigência da norma, instrumento e regime jurídico da contratação. O BI não qualifica automaticamente infração legal.</p>'+
    '<ul>'+normative.map(([ref,use])=>'<li><b>'+esc(ref)+'</b> — '+esc(use)+'</li>').join('')+'</ul>'+
    '<p>Decreto nº 11.979/2024: competências institucionais de acompanhamento da aplicação dos aportes, ressalvadas alterações posteriores e ato de organização vigente.</p>',4)+
   z('Conclusão técnica e encaminhamento',
    '<p><b>Avaliação da necessidade de auditoria/vistoria presencial:</b> '+esc(audit)+'</p>'+
    '<p><b>Motivação:</b> '+esc(a.visitWhy)+'</p>'+
    '<p><b>Providência recomendada:</b> conferir cronograma físico-financeiro vigente, alterações contratuais, último BM e relatório de fiscalização, com manifestação da empresa e registro da decisão da SNP.</p>'+
    (review.evidence?'<p><b>Referência acrescida pelo gestor:</b> '+esc(review.evidence)+'</p>':'')+
    (review.notes?'<p><b>Observação do gestor:</b> '+esc(review.notes)+'</p>':'')+
    '<p><b>Limitação:</b> triagem técnica assistida, não substitui a fiscalização contratual da estatal nem parecer jurídico ou decisão administrativa.</p>',5);
 }
 function init(){
  const page=$('relatorio');if(!page||$('puc-triagem-panel'))return;
  const el=document.createElement('section');el.id='puc-triagem-panel';el.className='puc-triagem-panel';
  const anchor=$('report-summary');if(anchor)anchor.parentNode.insertBefore(el,anchor);else page.querySelector('.panel')?.appendChild(el);
  const css=document.createElement('style');css.id='puc-triagem-css';
  css.textContent='.puc-triagem-panel{margin:15px 0;padding:17px;border:1px solid #cddde9;border-radius:12px;background:#f9fbfd}.puc-triagem-filter{padding:12px;background:#fff2df;border-left:3px solid #d18c23;border-radius:6px}.puc-triagem-origins{margin:12px 0}.puc-triagem-origin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:8px 0}.puc-triagem-origin-grid>div{background:white;border:1px solid #d4e2ea;border-radius:7px;padding:9px;min-width:0}.puc-triagem-origin-grid strong,.puc-triagem-origin-grid span,.puc-triagem-origin-grid small{display:block;overflow-wrap:anywhere}.puc-triagem-origin-grid span{font-size:12px;font-weight:600}.puc-triagem-origin-grid small{font-size:11px;color:#58738b}.puc-triagem-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.puc-triagem-state{background:#edf2f6;border-radius:12px;padding:6px 12px;font-size:12px;font-weight:600}.puc-triagem-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:13px 0}.puc-triagem-cards>div{border:1px solid #dde5eb;background:white;border-radius:8px;padding:12px;min-width:0}.puc-triagem-cards small{display:block;color:#62788b;font-size:11px;overflow-wrap:anywhere}.puc-triagem-cards strong{display:block;font-size:18px;overflow-wrap:anywhere;margin:5px 0}.puc-triagem-diagnostico{padding:12px;background:#edf3f7;border-radius:7px}.puc-triagem-formgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.puc-triagem-formgrid label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600}.puc-triagem-formgrid input,.puc-triagem-formgrid textarea,.puc-triagem-formgrid select{max-width:100%;width:100%;padding:9px;border:1px solid #c8d8e5;border-radius:7px;background:#fff}.puc-triagem-wide{grid-column:1/-1}.puc-triagem-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.puc-triagem-scroll{overflow-x:auto}.puc-triagem-scroll table{min-width:780px;width:100%;border-collapse:collapse}.puc-triagem-scroll td,.puc-triagem-scroll th{padding:7px 9px;border-bottom:1px solid #dce6eb;text-align:left;vertical-align:top;overflow-wrap:anywhere}.puc-triagem-panel details{margin-top:9px}.puc-triagem-panel summary{cursor:pointer;font-weight:600}@media(max-width:760px){.puc-triagem-origin-grid{grid-template-columns:1fr}.puc-triagem-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.puc-triagem-formgrid{grid-template-columns:1fr}}@media print{.puc-triagem-panel{display:none!important}#critical-report .puc-triagem-cards{grid-template-columns:repeat(4,minmax(0,1fr))}#critical-report .puc-triagem-cards>div{break-inside:avoid}#critical-report .puc-triagem-scroll{overflow:visible}#critical-report .puc-triagem-scroll table{min-width:0;font-size:9px}}';
  document.head.appendChild(css);
  document.addEventListener('change',e=>{if(e.target?.id==='report-project'||e.target?.id==='report-source')renderForm()});
  for(const event of ['puc-documents-updated','puc-ficha-bms-atualizados','puc:docas-externas-atualizadas','puc-bm-vinculos-atualizados']){
   document.addEventListener(event,renderForm);w.addEventListener(event,renderForm);
  }
  renderForm();
 }
 w.PUCRelatorioTriagem={raw,assess,renderForm,report,collectReview};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);