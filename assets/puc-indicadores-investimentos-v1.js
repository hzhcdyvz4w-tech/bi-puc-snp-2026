/* BI PUC | Indicadores de investimento e execução | 2026-11-16
   Mantém naturezas diferentes separadas; jamais confunde empenho com pagamento de BM.
   Ausência de dado explícito não se converte em zero. */
(function(w){
 'use strict';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const amount=v=>w.PUCQuadroValores?.parseMoney?.(v)??null;
 const percent=v=>{
  if(v===null||v===undefined||String(v).trim()==='')return null;
  const t=String(v).replace('%','').trim().replace(',','.');
  if(!/^\d{1,3}(?:\.\d+)?$/.test(t))return null;
  const n=Number(t);return Number.isFinite(n)&&n>=0&&n<=100?n:null;
 };
 const money=v=>{const n=amount(v);return n===null?'Não informado':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})};
 const pct=v=>{const n=percent(v);return n===null?'Não informado':n.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%'};
 const projects=()=>{try{return JSON.parse($('embedded-data')?.textContent||'{}').projetos||[]}catch{return []}};
 const budget=()=>{try{return JSON.parse($('embedded-data')?.textContent||'{}').siop||[]}catch{return []}};
 const source=v=>String(v||'').trim();
 function projectCandidates(id,p){
  const rows=w.PUCCorrelacao?.balancoRows?.()||[],uf=norm(p.uf),idgov=String(p.id_governa||'').trim();
  const matched=rows.filter(r=>norm(r.uf)===uf&&(
   (idgov&&String(r.id||'').trim()===idgov)||
   (norm(r.empreendimento)===norm(p.empreendimento))
  ));
  const unique=new Map();
  for(const r of matched){
   const key=[r.id,norm(r.uf),norm(r.empreendimento),r.documento_id].join('|');
   if(!unique.has(key))unique.set(key,r);
  }
  return [...unique.values()];
 }
 function get(id,p){
  if(!p)return {items:[],warning:'Empreendimento não selecionado'};
  const items=[],push=(origin,label,value,kind,ref,check,scope)=>items.push({origin,label,value,kind,ref,check,scope});
  const bal=projectCandidates(id,p);
  for(const r of bal){
   const link=String(p.id_governa||'').trim()&&String(r.id||'').trim()===String(p.id_governa).trim()?'ID Governa/UF — confirmar contrato':'Nome e UF — vínculo preliminar';
   const ref=[r.arquivo,'ID Governa '+(r.id||'—'),r.data_referencia||'Corte não informado'].join(' · ');
   push('BALANÇO','Valor global do investimento',r.valor_global,'money',ref,link,'Empreendimento');
   push('BALANÇO','Valor investido / invertido',r.valor_investido,'money',ref,link,'Empreendimento');
   push('BALANÇO','Valor pago',r.valor_pago,'money',ref,link,'Empreendimento');
   push('BALANÇO','Execução física',r.execucao_fisica,'percent',ref,link,'Empreendimento');
   push('BALANÇO','Execução financeira',r.execucao_financeira,'percent',ref,link,'Empreendimento');
  }
  const state=w.PUCFichasBM?.getState?.()||{};
  const ficha=(state.balances||{})[id];
  if(ficha){
   const check=ficha.verified?'Conferido pelo operador':'Registro na ficha — conferência pendente';
   const ref=source(ficha.evidence)||'Ficha do empreendimento';
   push('FICHA','Valor global do investimento',ficha.global,'money',ref,check,'Empreendimento');
   push('FICHA','Execução física',ficha.physical,'percent',ref,check,'Empreendimento');
   push('FICHA','Execução financeira',ficha.financial,'percent',ref,check,'Empreendimento');
  }
  const bms=(state.bmRows||[]).filter(r=>String(r.project)===String(id)&&r.status==='confirmado');
  // Cada BM por competência; NÃO somar valores acumulados nem períodos sobrepostos.
  for(const b of bms){
   const ref='BM '+(b.number||'sem nº')+' · '+(b.date||'competência não informada')+' · '+(b.evidence||'SEI não identificado');
   push('BM','Valor medido no período',b.measured,'money',ref,'BM conferido; não equivale a pagamento','Contrato');
   push('BM','Medição acumulada',b.cumulative,'money',ref,'BM conferido; não equivale a valor pago','Contrato');
   push('BM','Execução física',b.physical,'percent',ref,'BM conferido; conferir o escopo da medição','Contrato');
  }
  const admin=$('pdc-admin');
  if(admin&&!admin.hidden&&Array.isArray(w.PUC_DOCAS_DECLARACOES_EXTERNAS)){
   const docs=w.PUCRelatorioFontes?.docasMatches?.(id,p)||[];
   for(const d of docs){
    const ref='DOCAS · protocolo '+(d.protocolo||'—')+' · '+(d.enviado_em||'sem data');
    const check=d.status==='validada'?'Validação registrada na Central DOCAS':'Declaração recebida — conferência SNP pendente';
    push('DOCAS','Valor global do investimento',d.investimento_total,'money',ref,check,'Empreendimento');
    push('DOCAS','Execução física',d.execucao_fisica,'percent',ref,check,'Empreendimento');
    push('DOCAS','Execução financeira',d.execucao_financeira,'percent',ref,check,'Empreendimento');
   }
  }
  const siop=budget().filter(r=>String(r.id_puc||'')===String(id));
  for(const r of siop){
   const ref='SIOP · '+(r.id_siop||'ação/PO '+r.acao+'/'+r.po)+' · '+(r.arquivo_fonte||'consulta')+' · '+(r.data_referencia||'corte não informado');
   push('SIOP','Valor pago pela União',r.pago,'money',ref,'Associação orçamentária preliminar; não é pagamento do contrato da DOCA','União');
   push('SIOP','Valor empenhado pela União',r.empenhado,'money',ref,'Associação orçamentária preliminar; não é valor investido da DOCA','União');
  }
  return {items,project:p,balances:bal.length,bms:bms.length,siop:siop.length};
 }
 const principal=['Valor investido / invertido','Valor pago','Execução física','Execução financeira'];
 function dashboard(id,p){
  const data=get(id,p);
  const categories=[
   {title:'Valor investido / invertido',key:'Valor investido / invertido',kind:'money',note:'Investimento efetivamente informado, não valor global planejado'},
   {title:'Valor pago',key:'Valor pago',kind:'money',note:'Pagamento do empreendimento; pagamento da União é apresentado separadamente'},
   {title:'Execução física',key:'Execução física',kind:'percent',note:'Percentual do empreendimento, sem presumir execução por empenho'},
   {title:'Execução financeira',key:'Execução financeira',kind:'percent',note:'Percentual informado, sujeito à comprovação do denominador e do corte'}
  ];
  const sourceOrder=['BALANÇO','FICHA','DOCAS','BM','SIOP'];
  const cards=categories.map(c=>{
   const rows=data.items.filter(i=>i.label===c.key&&i.scope==='Empreendimento'&&i.value!==undefined&&i.value!==null&&String(i.value).trim()!=='');
   rows.sort((a,b)=>sourceOrder.indexOf(a.origin)-sourceOrder.indexOf(b.origin));
   // Não selecionar um valor de múltiplas fontes como consolidado automaticamente.
   const main=rows.length===1?rows[0]:null;
   const value=main?(c.kind==='money'?money(main.value):pct(main.value)):
    rows.length>1?'Múltiplas fontes':'Não informado';
   return '<div class="puc-i-card"><div class="puc-i-label">'+esc(c.title)+'</div><strong>'+esc(value)+'</strong>'+
    '<small>'+esc(main?main.origin+' · '+main.check:c.note)+'</small>'+
    (rows.length>1?'<small>'+rows.length+' registros: detalhados abaixo, sem consolidação automática.</small>':'')+'</div>';
  }).join('');
  const detail=data.items.filter(i=>!(!i.value&&i.value!==0));
  return '<div class="puc-i-header"><h3>Indicadores de investimentos e execução</h3><p class="muted">Por empreendimento, contrato e fonte. Valores de naturezas distintas não são somados nem tratados como equivalentes.</p></div>'+
   '<div class="puc-i-grid">'+cards+'</div>'+
   '<details class="puc-i-details"><summary><strong>Ver detalhamento e documentação de suporte ('+detail.length+' registros com dados)</strong></summary>'+
   (detail.length?'<div class="puc-i-scroll"><table><thead><tr><th>Indicador</th><th>Valor</th><th>Fonte</th><th>Âmbito</th><th>Evidência</th><th>Situação</th></tr></thead><tbody>'+
    detail.map(i=>'<tr><td>'+esc(i.label)+'</td><td><b>'+esc(i.kind==='percent'?pct(i.value):money(i.value))+'</b></td><td>'+esc(i.origin)+'</td><td>'+esc(i.scope)+'</td><td>'+esc(i.ref)+'</td><td>'+esc(i.check)+'</td></tr>').join('')+'</tbody></table></div>':
    '<p>Nenhum indicador comprovável carregado para o empreendimento selecionado.</p>')+
   '</details><p class="muted">Valor global do investimento ≠ valor efetivamente investido. Medição contratual ≠ pagamento. Pagamento SIOP ≠ pagamento à contratada. Ausência de dado ≠ zero.</p>';
 }
 function reportSection(id,p){return '<section class="r-section"><h3>Indicadores de valor investido, valor pago e execuções</h3>'+dashboard(id,p)+'</section>';}
 let currentProject='';
 function render(){
  const box=$('puc-i-panel');if(!box)return;
  const selection=$('puc-i-project'),id=selection?.value||currentProject;
  const p=projects().find(x=>String(x.id)===String(id));
  $('puc-i-body').innerHTML=p?'<p><b>'+esc(p.empreendimento)+'</b> · '+esc(p.empresa)+' · '+esc(p.uf||'')+'</p>'+dashboard(id,p):
   '<p>Selecione um empreendimento para consultar valores e execuções por fonte.</p>';
 }
 function init(){
  if($('puc-i-panel'))return;
  const page=$('documentos');if(!page)return;
  const panel=document.createElement('section');panel.className='panel';panel.id='puc-i-panel';
  panel.innerHTML='<h2>Investimentos e execução — Indicadores</h2>'+
   '<label>Empreendimento <select id="puc-i-project"><option value="">Selecione o empreendimento</option>'+
   projects().map(p=>'<option value="'+esc(p.id)+'">'+esc(p.empresa)+' · '+esc(p.empreendimento)+'</option>').join('')+
   '</select></label><div id="puc-i-body" aria-live="polite"></div>';
  const anchor=$('pucq-panel');
  if(anchor)anchor.insertAdjacentElement('afterend',panel);else page.appendChild(panel);
  const style=document.createElement('style');style.textContent=
   '.puc-i-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0}.puc-i-card{padding:16px;border-radius:10px;border:1px solid #d4e0e8;background:#f6fafc;min-width:0}.puc-i-label{font-size:13px;font-weight:700;color:#29475e}.puc-i-card strong{display:block;font-size:22px;margin:8px 0;overflow-wrap:anywhere}.puc-i-card small{display:block;color:#58738a;font-size:11px}.puc-i-details{border:1px solid #d7e3e9;border-radius:8px;margin:12px 0}.puc-i-details summary{padding:12px;cursor:pointer;background:#edf4f8}.puc-i-scroll{overflow-x:auto}.puc-i-scroll table{width:100%;min-width:850px;border-collapse:collapse}.puc-i-scroll td,.puc-i-scroll th{padding:10px;border-bottom:1px solid #dbe5ea;text-align:left;vertical-align:top;overflow-wrap:anywhere}.puc-i-scroll th{background:#eef4f7}.puc-i-header p{margin:4px 0}@media(max-width:900px){.puc-i-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:500px){.puc-i-grid{grid-template-columns:1fr}}';
  document.head.appendChild(style);
  $('puc-i-project').onchange=e=>{currentProject=e.target.value;render()};
  document.addEventListener('puc-documents-updated',render);
  w.addEventListener('puc-ficha-bms-atualizados',render);
  w.addEventListener('puc:docas-externas-atualizadas',render);
  render();
 }
 w.PUCIndicadores={get,dashboard,reportSection,render};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
