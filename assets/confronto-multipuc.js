/* BI PUC - confronto simultâneo de investimentos, sem confundir seus objetos */
(function(){'use strict';
const el=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const indicators=['dotacao_atual','empenho_uniao','liquidacao_uniao','pagamento_uniao','aporte_puc_recebido','puc_aplicada','execucao_fisica','medicao_bm','pagamento_bm','valor_contrato','execucao_financeira_balanco','valor_empreendimento'];
const names={'dotacao_atual':'Dotação SIOP','empenho_uniao':'Empenhado União','liquidacao_uniao':'Liquidado União','pagamento_uniao':'Pago União','aporte_puc_recebido':'PUC recebida','puc_aplicada':'PUC aplicada','execucao_fisica':'Execução física (%)','medicao_bm':'BM medido','pagamento_bm':'BM pago','valor_contrato':'Valor do contrato','execucao_financeira_balanco':'Financeiro Balanço','valor_empreendimento':'Valor do empreendimento'};
let selected=new Set(),report=[];
function money(v,kind){return typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('pt-BR',{style:kind==='execucao_fisica'?'decimal':'currency',currency:'BRL',maximumFractionDigits:kind==='execucao_fisica'?2:2})+(kind==='execucao_fisica'?'%':''):'—'}
function csvSave(name,rows){const keys=['puc','empresa','empreendimento','indicador','fonte','valor','unidade','competencia','corte','objeto','evidencia','conferido','confrontos','divergencias','pendencias'];let csv=[keys.join(';'),...rows.map(r=>keys.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(';'))].join('\r\n');let a=document.createElement('a'),u=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function panel(){
 const p=el('cmp-project');if(!p)return;let holder=document.createElement('div');holder.className='panel';holder.id='puc-multi-panel';
 holder.innerHTML='<h2>Confronto simultâneo · múltiplas PUCs</h2><p class="muted">Escolha uma ou várias PUCs. Para cada investimento, o sistema exibe todas as observações e indicadores disponíveis; não soma percentuais nem declara valores entre projetos equivalentes. Diferenças numéricas só são reconhecidas entre fontes comparáveis do mesmo investimento e objeto, com evidências conferidas.</p><div class="filters"><input id="puc-multi-search" placeholder="Filtrar PUC ou empreendimento" aria-label="Pesquisar investimentos"><button class="btn secondary" id="puc-multi-all" type="button">Selecionar todas</button><button class="btn secondary" id="puc-multi-clear" type="button">Limpar</button><button class="btn" id="puc-multi-run" type="button">Comparar selecionadas</button><button class="btn secondary" id="puc-multi-export" type="button">Exportar CSV consolidado</button></div><div class="puc-multi-checks" id="puc-multi-checks"></div><p role="status" class="statusline" id="puc-multi-status">Nenhuma PUC selecionada.</p><div id="puc-multi-result"></div>';
 el('comparacao').insertBefore(holder,el('comparacao').firstElementChild?.nextSibling||null);
 const css=document.createElement('style');css.textContent='.puc-multi-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(255px,1fr));gap:7px;margin:12px 0}.puc-multi-checks label{font-size:12px;display:flex;align-items:center;gap:8px;border:1px solid #dae5ed;border-radius:8px;padding:9px;background:#fafcfd;font-weight:500;cursor:pointer}.puc-multi-checks input{min-width:18px;min-height:18px}.puc-multi-table{min-width:940px}.puc-multi-table td{vertical-align:top;white-space:normal}.puc-multi-good{color:#1a754c;font-weight:700}.puc-multi-risk{color:#a74132;font-weight:700}@media(max-width:650px){.puc-multi-checks{grid-template-columns:1fr}}';document.head.appendChild(css);
 el('puc-multi-all').onclick=()=>{selected=new Set(data.projetos.map(p=>p.id));renderChecks();updateStatus()};
 el('puc-multi-clear').onclick=()=>{selected.clear();renderChecks();el('puc-multi-result').innerHTML='';report=[];updateStatus()};
 el('puc-multi-run').onclick=run;
 el('puc-multi-search').oninput=renderChecks;
 el('puc-multi-export').onclick=()=>{if(!report.length)run();if(report.length)csvSave('PUC_CONFRONTO_MULTIPLO_DETALHADO.csv',report)};
 renderChecks();updateStatus();
}
function renderChecks(){
 const q=el('puc-multi-search').value.toLowerCase();let projects=data.projetos.filter(p=>(p.id+' '+p.empreendimento+' '+p.empresa).toLowerCase().includes(q));
 el('puc-multi-checks').innerHTML=projects.map(p=>'<label><input type="checkbox" value="'+esc(p.id)+'" '+(selected.has(p.id)?'checked':'')+'><span><strong>'+esc(p.id)+'</strong> · '+esc(p.empresa)+'<br>'+esc(p.empreendimento)+'</span></label>').join('');
 el('puc-multi-checks').querySelectorAll('input').forEach(x=>x.onchange=()=>{x.checked?selected.add(x.value):selected.delete(x.value);updateStatus()});
}
function updateStatus(){el('puc-multi-status').textContent=selected.size+' PUC(s) selecionada(s), de '+data.projetos.length+' investimentos cadastrados.'}
function run(){
 if(!selected.size){el('puc-multi-result').innerHTML='<p class="notice">Selecione pelo menos uma PUC.</p>';return}
 let original=el('cmp-subproject')?.value||'';if(el('cmp-subproject'))el('cmp-subproject').value='';
 let summary=[],all=[],counters={diff:0,ok:0,pending:0,obs:0};for(let id of selected){
 const p=data.projetos.find(x=>x.id===id);if(!p)continue;
 let rows=recordsForProject(id),audits=makeAudit(id),counts={diff:audits.filter(a=>a.status==='DIVERGÊNCIA NUMÉRICA').length,ok:audits.filter(a=>a.status==='SEM DIVERGÊNCIA NUMÉRICA').length,pending:audits.filter(a=>!['DIVERGÊNCIA NUMÉRICA','SEM DIVERGÊNCIA NUMÉRICA'].includes(a.status)).length};
 counters.diff+=counts.diff;counters.ok+=counts.ok;counters.pending+=counts.pending;counters.obs+=rows.length;
 let sources=[...new Set(rows.map(r=>r.source))];summary.push({p,rows,audits,counts,sources});
 rows.forEach(r=>all.push({puc:id,empresa:p.empresa,empreendimento:p.empreendimento,indicador:names[r.indicator]||r.indicator,fonte:r.source,valor:r.value,unidade:r.unit,competencia:r.period,corte:r.cutoff,objeto:r.object_ref,evidencia:r.evidence,conferido:r.verified?'SIM':'NÃO',confrontos:audits.filter(a=>a.indicator===r.indicator).length,divergencias:audits.filter(a=>a.indicator===r.indicator&&a.status==='DIVERGÊNCIA NUMÉRICA').length,pendencias:audits.filter(a=>a.indicator===r.indicator&&!['DIVERGÊNCIA NUMÉRICA','SEM DIVERGÊNCIA NUMÉRICA'].includes(a.status)).length}))
 }
 if(el('cmp-subproject'))el('cmp-subproject').value=original;report=all;
 let header='<div class="cmp-metrics"><div class="cmp-metric"><small>PUCs analisadas</small><strong>'+summary.length+'</strong></div><div class="cmp-metric"><small>Registros encontrados</small><strong>'+counters.obs+'</strong></div><div class="cmp-metric"><small>Divergências verificadas</small><strong>'+counters.diff+'</strong></div><div class="cmp-metric"><small>Confrontos pendentes</small><strong>'+counters.pending+'</strong></div></div>';
 let table='<div class="scroll"><table class="data-table puc-multi-table"><thead><tr><th>PUC / empreendimento</th><th>Fontes com dados</th><th>Indicadores e valores encontrados</th><th>Resultados do confronto</th><th>Pendências / ação</th></tr></thead><tbody>'+summary.map(o=>{
 const groups=indicators.map(k=>{let rs=o.rows.filter(x=>x.indicator===k);if(!rs.length)return '';return '<div><strong>'+esc(names[k])+'</strong>: '+rs.map(r=>esc(r.source)+' '+money(Number(r.value),k)+(r.verified?' ✓':' (não conferido)')).join(' | ')+'</div>'}).filter(Boolean).join('');
 const pending=o.rows.filter(r=>!r.verified).length;
 return '<tr><td><strong>'+esc(o.p.id)+'</strong><br>'+esc(o.p.empresa)+'<br>'+esc(o.p.empreendimento)+'</td><td>'+esc(o.sources.join(', ')||'Nenhuma')+'<br><small>'+o.sources.length+'/5 fontes</small></td><td>'+ (groups||'Sem valores disponíveis') +'</td><td><span class="puc-multi-risk">'+o.counts.diff+' divergências</span><br><span class="puc-multi-good">'+o.counts.ok+' coincidências</span><br>'+o.counts.pending+' pendentes/não comparáveis</td><td>'+pending+' registro(s) sem conferência.<br>Homologação SNP: pendente.<br><button type="button" class="btn secondary" data-open-puc="'+esc(o.p.id)+'">Abrir análise individual</button></td></tr>'
 }).join('')+'</tbody></table></div>';
 let risks='<p class="notice">Painel multicarteira: valores são informados individualmente por projeto; não são somados quando diferem em objeto, unidade, período ou natureza. Divergências exigem dados verificados da mesma PUC. Ausência de documento não significa valor zero; coincidência numérica não implica regularidade.</p>';
 el('puc-multi-result').innerHTML=header+table+risks;
 el('puc-multi-result').querySelectorAll('[data-open-puc]').forEach(b=>b.onclick=()=>{el('cmp-project').value=b.dataset.openPuc;el('cmp-project').dispatchEvent(new Event('change'));el('cmp-project').scrollIntoView({behavior:'smooth',block:'center'})});
 updateStatus();
}
function init(){panel()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();