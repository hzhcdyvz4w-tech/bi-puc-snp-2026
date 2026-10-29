/* BI PUC V13 — confronto documental de três fontes.
   Nenhuma comparação usa a base SIOP de demonstração.
   Só compara indicadores equivalentes, mesma competência, objeto e data de corte, aprovados pelo operador. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const projects=(()=>{try{return JSON.parse($('embedded-data')?.textContent||'{}').projetos||[]}catch(e){return []}})();
const sources=['SEI','BALANCO','SIOP'],names={SEI:'SEI · documentos do processo',BALANCO:'Balanço · arquivo oficial',SIOP:'SIOP · consulta anexada'};
const indicators=[
 ['dotacao_atual','Dotação atual (União)','R$'],['empenho_uniao','Empenhado (União)','R$'],['liquidacao_uniao','Liquidado (União)','R$'],['pagamento_uniao','Pago pela União','R$'],
 ['aporte_puc_recebido','PUC recebida pela companhia','R$'],['puc_aplicada','PUC aplicada pela companhia','R$'],
 ['medicao_bm','BM · Valor medido','R$'],['pagamento_bm','BM · Valor pago','R$'],['valor_contrato','Valor do contrato','R$'],
 ['execucao_fisica','Execução física do empreendimento','%'],['execucao_financeira_balanco','Execução financeira do empreendimento','R$'],
 ['valor_empreendimento','Valor global do empreendimento','R$'],['financeiro_previsto','Desembolso previsto','R$']
];
const label=Object.fromEntries(indicators.map(x=>[x[0],x[1]])),units=Object.fromEntries(indicators.map(x=>[x[0],x[2]]));
const metricSelect=()=>indicators.map(x=>'<option value="'+x[0]+'">'+esc(x[1])+'</option>').join('');
const pOptions='<option value="">Sem PUC específica — carteira/documento geral</option>'+projects.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.id+' · '+p.empresa)+'</option>').join('');
let selected=new Set(),selectedFile=null,lastRows=[],lastPairs=[];
const lib=()=>window.PUCDocLibrary;
const docs=()=>lib()?.list()||[];
function status(message){const el=$('puc3-status');if(el)el.textContent=message}
function val(v){return Number.isFinite(Number(v))&&v!==''?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—'}
function csv(rows,filename){const head=['puc','fonte','documento','referencia','indicador','valor','unidade','competencia','data_corte','objeto','contrato','apuracao','conferido','observacao'];const txt=[head.join(';'),...rows.map(r=>head.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(';'))].join('\r\n');download(new Blob(['\ufeff'+txt],{type:'text/csv;charset=utf-8'}),filename)}
function download(blob,name){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function renderChecks(){
 let query=($('puc3-search')?.value||'').trim().toLowerCase();
 $('puc3-projects').innerHTML=projects.filter(p=>(p.id+' '+p.empresa+' '+p.empreendimento).toLowerCase().includes(query)).map(p=>'<label class="puc3-choose"><input type="checkbox" value="'+esc(p.id)+'" '+(selected.has(p.id)?'checked':'')+'><span><strong>'+esc(p.id)+'</strong> · '+esc(p.empresa)+'<small>'+esc(p.empreendimento)+'</small></span></label>').join('');
 $('puc3-projects').querySelectorAll('input').forEach(x=>x.onchange=()=>{x.checked?selected.add(x.value):selected.delete(x.value);render();});
 const c=$('puc3-selected');if(c)c.textContent=selected.size+' PUC(s) selecionada(s) — '+projects.length+' cadastradas';
}
function filesForReview(){
 return docs().filter(d=>!selected.size||!d.project||selected.has(d.project)||(d.findings||[]).some(f=>selected.has(f.project)));
}
function sourceCards(){
 $('puc3-uploads').innerHTML=sources.map(source=>'<div class="puc3-source"><h3>'+esc(names[source])+'</h3><label>PUC associada ao lote<select id="puc3-project-'+source+'">'+pOptions+'</select></label><label>Processo / referência<input id="puc3-ref-'+source+'" placeholder="SEI, período ou referência do relatório"></label><label>Arquivos<input type="file" multiple id="puc3-files-'+source+'" accept=".zip,.pdf,.xls,.xlsx,.csv,.doc,.docx,.txt,.html,.htm,.xml,.json"></label><button class="btn" type="button" data-import="'+source+'">Analisar anexos '+source+'</button><small>'+ (source==='SEI'?'Busca possíveis BMs pelo nome e texto.':source==='BALANCO'?'Selecione a planilha/relatório oficial.':'A base pré-carregada não conta: anexe a consulta a confrontar.')+'</small></div>').join('');
 $('puc3-uploads').querySelectorAll('[data-import]').forEach(b=>b.onclick=()=>importFiles(b.dataset.import));
}
async function importFiles(source){
 const files=[...$('puc3-files-'+source).files],project=$('puc3-project-'+source).value,ref=$('puc3-ref-'+source).value.trim();
 if(!files.length){status('Selecione ao menos um arquivo para '+source+'.');return}
 if(!lib()){status('Biblioteca documental indisponível. Recarregue a página e execute o diagnóstico.');return}
 const button=$('puc3-uploads').querySelector('[data-import="'+source+'"]');button.disabled=true;
 try{status('Analisando '+files.length+' anexo(s) de '+source+'; arquivos internos do ZIP serão inventariados...');
  const n=await lib().ingest(files,source,project,ref);
  $('puc3-files-'+source).value='';
  if(project)selected.add(project);
  renderChecks();render();
  status(n+' documento(s) incorporado(s) a '+source+'. '+docs().filter(d=>d.origin===source&&/^BM IDENTIFICADO|^BM PROVÁVEL/.test(d.bmStatus||'')).length+' possíveis BMs nesta origem. Revise os achados antes de comparar.');
 }catch(e){status('Falha ao analisar '+source+': '+e.message)}
 finally{button.disabled=false}
}
function lineFor(d){
 const quality=d.quality||'Documento anterior — reanalisar',bm=/^BM IDENTIFICADO|^BM PROVÁVEL/.test(d.bmStatus||'');
 const findings=(d.findings||[]).length, candidates=(d.candidates||[]).slice(0,4).map(c=>c.type+': '+(c.values||[]).join(', ')).join('; ');
 return '<tr><td><strong>'+esc(d.origin)+'</strong><br>'+esc(d.project||'Carteira / sem vínculo')+'</td><td>'+esc(d.name)+'<small>'+esc(d.container||'Arquivo individual')+'</small></td><td>'+esc(bm?'BM identificado / provável':d.bmStatus||'Não classificado')+'</td><td>'+esc(candidates||'Nenhum valor extraído')+'</td><td>'+esc(quality)+'<small>'+findings+' achado(s) revisado(s)</small></td><td><button type="button" class="btn secondary" data-review="'+esc(d.id)+'">Revisar</button></td></tr>'
}
function renderFiles(){
 const files=filesForReview();
 $('puc3-coverage').innerHTML=sources.map(src=>{let set=files.filter(d=>d.origin===src);return '<div class="puc3-kpi"><small>'+src+' anexado</small><strong>'+set.length+'</strong><span>'+set.filter(d=>(d.findings||[]).some(f=>f.verified)).length+' documento(s) com achados conferidos</span></div>'}).join('');
 $('puc3-doc-count').textContent=files.length+' documento(s) apresentados · '+files.filter(d=>/^BM IDENTIFICADO|^BM PROVÁVEL/.test(d.bmStatus||'')).length+' possíveis BMs';
 const body=$('puc3-files-rows');body.innerHTML=files.length?files.map(lineFor).join(''):'<tr><td colspan="6">Anexe arquivos SEI, Balanço e SIOP para iniciar. A base SIOP demonstrativa não é utilizada neste confronto.</td></tr>';
 body.querySelectorAll('[data-review]').forEach(x=>x.onclick=()=>review(x.dataset.review));
}
function renderFindings(){
 let rows=[];for(const d of filesForReview())for(const f of d.findings||[])if(!selected.size||selected.has(f.project))rows.push({...f,docId:d.id,source:d.origin,document:d.name});
 lastRows=rows;
 $('puc3-findings-rows').innerHTML=rows.length?rows.map(f=>'<tr><td>'+esc(f.project||'PUC pendente')+'</td><td>'+esc(f.source)+'<small>'+esc(f.document)+'</small></td><td>'+esc(label[f.indicator]||f.indicator)+'</td><td>'+esc(val(f.value))+' '+esc(units[f.indicator]||'')+'</td><td>'+esc(f.period||'Sem período')+'</td><td>'+esc(f.verified?'Conferido pelo operador':'Pendente de conferência')+'</td><td><button class="btn secondary" type="button" data-edit="'+esc(f.docId)+'" data-id="'+esc(f.id)+'">Editar</button></td></tr>').join(''):'<tr><td colspan="7">Nenhum achado foi revisado. Clique em Revisar em um arquivo, selecione o indicador e confira o valor antes de salvar.</td></tr>';
 $('puc3-findings-rows').querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>review(x.dataset.edit,x.dataset.id))
}
function chooseCandidate(i){
 const d=docs().find(x=>x.id===selectedFile);if(!d)return;
 const c=d.candidates?.[i];if(!c)return;
 const txt=c.values?.[0]||'';const n=txt.replace(/^R\$\s*/,'').replace(/\s*%$/,'').replace(/\./g,'').replace(',','.');
 $('puc3-find-value').value=Number.isFinite(Number(n))?Number(n):'';
 const cat=(c.type||'').toLowerCase();
 $('puc3-find-indicator').value=cat.includes('físic')||cat.includes('fisic')?'execucao_fisica':cat.includes('pago')?'pagamento_bm':'medicao_bm';
 $('puc3-find-note').value='Candidato localizado: '+c.excerpt+'. Necessária verificação da natureza, apuração e documentação original.';
 $('puc3-find-confirm').checked=false;
}
function review(id,fid){
 const d=docs().find(x=>x.id===id);if(!d)return;selectedFile=id;
 const f=(d.findings||[]).find(x=>x.id===fid)||{};
 $('puc3-review').hidden=false;
 $('puc3-review-title').textContent='Revisar evidência · '+d.origin+' · '+d.name;
 $('puc3-review-info').textContent=(d.container||'Arquivo individual')+' · '+(d.quality||'Leitura anterior')+' · '+(d.bmStatus||'Sem classificação BM');
 $('puc3-find-id').value=f.id||'';
 $('puc3-find-project').innerHTML='<option value="">Selecione a PUC comprovada</option>'+projects.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.id+' · '+p.empreendimento)+'</option>').join('');
 $('puc3-find-project').value=f.project||d.project||(selected.size===1?[...selected][0]:'');
 $('puc3-find-indicator').innerHTML=metricSelect();$('puc3-find-indicator').value=f.indicator||'medicao_bm';
 $('puc3-find-value').value=f.value??'';
 $('puc3-find-period').value=f.period||'';
 $('puc3-find-cutoff').value=f.cutoff||'';
 $('puc3-find-object').value=f.object||'GLOBAL_PROJETO';
 $('puc3-find-contract').value=f.contract||'';
 $('puc3-find-aggregation').value=f.aggregation||'ACUMULADO';
 $('puc3-find-note').value=f.note||'';
 $('puc3-find-confirm').checked=!!f.verified;
 $('puc3-find-delete').disabled=!f.id;
 $('puc3-candidates').innerHTML=(d.candidates||[]).length?(d.candidates||[]).map((c,i)=>'<button type="button" class="btn secondary" data-candidate="'+i+'">'+esc(c.type)+' · '+esc((c.values||[]).join(' / '))+'</button>').join(''):'<span class="muted">Sem números extraíveis com segurança. Confira o arquivo original e transcreva manualmente.</span>';
 $('puc3-candidates').querySelectorAll('[data-candidate]').forEach(x=>x.onclick=()=>chooseCandidate(Number(x.dataset.candidate)));
 $('puc3-review').scrollIntoView({behavior:'smooth',block:'start'});
}
async function save(){
 const doc=docs().find(x=>x.id===selectedFile);if(!doc)return;
 const value=$('puc3-find-value').value,project=$('puc3-find-project').value,indicator=$('puc3-find-indicator').value;
 if(!project){status('Escolha a PUC correspondente ao documento e ao achado.');return}
 if(value===''||!Number.isFinite(Number(value))){status('Informe um valor numérico válido; vazio não significa zero.');return}
 const id=$('puc3-find-id').value||'';
 const item={id,project,indicator,value:Number(value),period:$('puc3-find-period').value,cutoff:$('puc3-find-cutoff').value,object:($('puc3-find-object').value||'GLOBAL_PROJETO').trim().toUpperCase(),contract:$('puc3-find-contract').value.trim().toUpperCase(),aggregation:$('puc3-find-aggregation').value,verified:$('puc3-find-confirm').checked,note:$('puc3-find-note').value.trim()};
 try{await lib().saveFinding(doc.id,item);selected.add(project);renderChecks();render();$('puc3-review').hidden=true;status('Achado registrado em '+doc.origin+' para '+project+'. '+(item.verified?'Conferido pelo operador; homologação SNP pendente.':'Pendente de conferência.'))}
 catch(e){status('Erro ao salvar achado: '+e.message)}
}
async function removeFinding(){
 if(!selectedFile||!$('puc3-find-id').value)return;
 if(!confirm('Excluir o achado registrado? O documento original permanece na biblioteca.'))return;
 await lib().deleteFinding(selectedFile,$('puc3-find-id').value);$('puc3-review').hidden=true;render();status('Achado excluído; arquivo preservado.')
}
function audit(){
 const findings=lastRows.filter(f=>selected.has(f.project));
 const byProject=new Map();
 for(const p of selected){byProject.set(p,{sources:new Set(),found:[],pairs:[],pending:0,docs:filesForReview().filter(d=>d.project===p||!d.project)})}
 for(const f of findings){const r=byProject.get(f.project);if(!r)continue;r.found.push(f);r.sources.add(f.source);if(!f.verified||!f.period||!f.cutoff)r.pending++}
 const pairs=[];
 for(const [id,r] of byProject){for(let i=0;i<r.found.length;i++)for(let j=i+1;j<r.found.length;j++){
  const a=r.found[i],b=r.found[j];if(a.source===b.source||a.indicator!==b.indicator)continue;
  let reason=[];if(!a.verified||!b.verified)reason.push('Conferência pendente');
  if(!a.period||!b.period||a.period!==b.period)reason.push('Competência distinta/ausente');
  if(!a.cutoff||!b.cutoff||a.cutoff!==b.cutoff)reason.push('Data de corte distinta/ausente');
  if((a.aggregation||'')!==(b.aggregation||''))reason.push('Apuração distinta');
  if((a.object||'')!==(b.object||''))reason.push('Objeto distinto');
  if((a.contract||'')!==(b.contract||''))reason.push('Contrato distinto');
  const diff=Number(a.value)-Number(b.value),tolerance=units[a.indicator]==='%'?0.1:0.01;
  const state=reason.length?'NÃO COMPARÁVEL':Math.abs(diff)>tolerance?'DIVERGÊNCIA':'CORRESPONDÊNCIA';
  const pair={project:id,a,b,state,reason:reason.join('; '),diff:reason.length?null:diff};pairs.push(pair);r.pairs.push(pair)
 }}
 lastPairs=pairs;
 const body=$('puc3-result');let html='<div class="cmp-metrics"><div class="cmp-metric"><small>PUCs selecionadas</small><strong>'+selected.size+'</strong></div><div class="cmp-metric"><small>Achados registrados</small><strong>'+findings.length+'</strong></div><div class="cmp-metric"><small>Correspondências</small><strong>'+pairs.filter(p=>p.state==='CORRESPONDÊNCIA').length+'</strong></div><div class="cmp-metric"><small>Divergências</small><strong>'+pairs.filter(p=>p.state==='DIVERGÊNCIA').length+'</strong></div></div>';
 html+='<div class="scroll"><table class="data-table"><thead><tr><th>PUC</th><th>Fontes anexadas</th><th>Indicadores conferidos</th><th>Resultado</th><th>Pendências e providências</th></tr></thead><tbody>';
 for(const [id,r] of byProject){
  const p=projects.find(x=>x.id===id);const counts=sources.map(src=>r.docs.filter(x=>x.origin===src&&x.project===id).length);
  const matched=r.pairs.filter(x=>x.state==='CORRESPONDÊNCIA').length,diff=r.pairs.filter(x=>x.state==='DIVERGÊNCIA').length;
  const relevant=r.found.filter(f=>f.verified);
  html+='<tr><td><strong>'+esc(id)+'</strong><br>'+esc(p?.empreendimento||'')+'</td><td>'+sources.map((src,i)=>src+': '+counts[i]).join('<br>')+'</td><td>'+relevant.map(f=>esc(f.source+' · '+(label[f.indicator]||f.indicator))+' = '+esc(val(f.value))+' '+esc(units[f.indicator]||'')).join('<br>')+'</td><td>'+matched+' correspondência(s)<br>'+diff+' divergência(s)<br>'+r.pairs.filter(x=>x.state==='NÃO COMPARÁVEL').length+' não comparáveis</td><td>'+r.pending+' achado(s) sem corte/conferência.<br>'+(r.sources.size<3?'Cobertura das três fontes incompleta.':'Três fontes com achados.')+'<br>'+(r.pairs.length?'Conferir detalhes abaixo.':'Sem pares do mesmo indicador; não afirmar compatibilidade.')+'</td></tr>'
 }
 html+='</tbody></table></div>';
 html+='<h3>Confrontos numéricos por indicador</h3><div class="scroll"><table class="data-table"><thead><tr><th>PUC</th><th>Indicador</th><th>Fonte A / valor</th><th>Fonte B / valor</th><th>Conclusão</th></tr></thead><tbody>';
 html+=pairs.length?pairs.map(p=>'<tr><td>'+esc(p.project)+'</td><td>'+esc(label[p.a.indicator]||p.a.indicator)+'</td><td>'+esc(p.a.source)+' · '+esc(val(p.a.value))+'</td><td>'+esc(p.b.source)+' · '+esc(val(p.b.value))+'</td><td><strong>'+esc(p.state)+'</strong><small>'+esc(p.reason||('Diferença '+val(p.diff)))+'</small></td></tr>').join(''):'<tr><td colspan="5">Não existem dois achados do mesmo indicador em fontes diferentes para confronto. Ausência de confronto não comprova regularidade.</td></tr>';
 html+='</tbody></table></div><p class="notice">Regra: o SIOP de demonstração não integra os resultados. Só são comparados indicadores de mesma natureza, período, data de corte, apuração, objeto e contrato, com conferência registrada. Pagamento da União, PUC recebida, medição e valor pago à contratada não são equivalentes por definição. Relatório auxiliar não homologado pela SNP.</p>';
 body.innerHTML=html;status('Confronto documental calculado: '+selected.size+' PUC(s), '+findings.length+' achados, '+pairs.length+' pares analisados.');
 return {pairs,findings};
}
function exportReport(){
 const computed=audit();const lines=['RELATÓRIO AUXILIAR DE CONFRONTO DOCUMENTAL — SNP / MPOR','Gerado: '+new Date().toLocaleString('pt-BR'),'Status: NÃO HOMOLOGADO','PUCs selecionadas: '+[...selected].join(', '),'','FONTES ANEXADAS / INDICADORES',''];
 for(const id of selected){lines.push('PUC '+id);for(const d of docs().filter(d=>d.project===id))lines.push(' - '+d.origin+' · '+d.name+' · '+(d.quality||'sem avaliação'));for(const f of computed.findings.filter(f=>f.project===id))lines.push('   '+f.source+' · '+(label[f.indicator]||f.indicator)+' = '+f.value+' '+(units[f.indicator]||'')+' · competência '+(f.period||'N/I')+' · corte '+(f.cutoff||'N/I')+' · '+(f.verified?'CONFERIDO PELO OPERADOR':'NÃO CONFERIDO'));lines.push('')}
 lines.push('CONFRONTOS NUMÉRICOS');for(const p of computed.pairs)lines.push(p.project+' · '+(label[p.a.indicator]||p.a.indicator)+' · '+p.a.source+' '+p.a.value+' × '+p.b.source+' '+p.b.value+' · '+p.state+' · '+(p.reason||'Diferença '+p.diff));
 lines.push('','RESSALVAS: somente documentos anexados; valores não equivalentes não são comparados; nenhuma conclusão jurídica automática; homologação SNP pendente.');
 download(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}),'RELATORIO_CONFRONTO_SEI_BALANCO_SIOP.txt');
}
function render(){renderFiles();renderFindings();}
function init(){
 const cmp=$('comparacao');if(!cmp)return;
 const oldMulti=$('puc-multi-panel');if(oldMulti)oldMulti.remove();
 const oldPanels=[...cmp.children].filter(x=>x.classList?.contains('panel'));
 const detail=document.createElement('details');detail.id='puc3-legacy';detail.className='panel';detail.innerHTML='<summary>Consulta auxiliar ao SIOP referencial e registros manuais antigos (não faz parte do confronto documental)</summary><p class="muted">Esta consulta permanece disponível para compatibilidade, mas os valores da base SIOP incorporada não são tratados como evidência confrontada.</p>';
 for(const x of oldPanels)detail.appendChild(x);cmp.appendChild(detail);
 const panel=document.createElement('div');panel.id='puc3-main';panel.className='panel';panel.innerHTML=
 '<h2>Confronto documental · SEI × Balanço × SIOP</h2><p class="muted">Anexe as três fontes, selecione uma ou várias PUCs, revise os achados de cada arquivo e então confronte <strong>somente indicadores equivalentes, com período e corte comprovados</strong>. Os números SIOP pré-carregados são apenas referência e <strong>não entram nesta comparação</strong>.</p>'+
 '<div class="filters"><input id="puc3-search" placeholder="Buscar PUC / empreendimento" aria-label="Filtrar PUCs"><button type="button" id="puc3-all" class="btn secondary">Selecionar todas</button><button type="button" id="puc3-clear" class="btn secondary">Limpar</button><span id="puc3-selected" class="muted"></span></div><div id="puc3-projects" class="puc3-projects"></div>'+
 '<h3>1 · Anexar fontes documentais</h3><div class="puc3-uploads" id="puc3-uploads"></div><p id="puc3-status" class="statusline" role="status">Selecione PUCs e anexe os arquivos das três fontes.</p>'+
 '<h3>2 · Achados por arquivo anexado</h3><div id="puc3-coverage" class="puc3-coverage"></div><p class="muted" id="puc3-doc-count"></p><div class="scroll"><table class="data-table"><thead><tr><th>Fonte / PUC</th><th>Documento</th><th>BM</th><th>Valores candidatos</th><th>Leitura e revisão</th><th>Ação</th></tr></thead><tbody id="puc3-files-rows"></tbody></table></div>'+
 '<div id="puc3-review" hidden class="puc3-review"><h3 id="puc3-review-title">Revisão documental</h3><p id="puc3-review-info" class="muted"></p><p class="muted">Valores abaixo são apenas candidatos. Confira o original antes de indicar conferência.</p><div id="puc3-candidates" class="two-actions"></div><input id="puc3-find-id" type="hidden"><div class="formgrid"><label>PUC efetivamente comprovada<select id="puc3-find-project"></select></label><label>Indicador / natureza<select id="puc3-find-indicator"></select></label><label>Valor comprovado<input type="number" step="any" id="puc3-find-value" placeholder="0,00"></label><label>Competência (mês/ano)<input type="month" id="puc3-find-period"></label><label>Data de corte<input type="date" id="puc3-find-cutoff"></label><label>Apuração<select id="puc3-find-aggregation"><option value="ACUMULADO">Acumulado</option><option value="MENSAL">Mensal</option></select></label><label>Objeto / etapa<input id="puc3-find-object" placeholder="GLOBAL_PROJETO"></label><label>Contrato / referência<input id="puc3-find-contract" placeholder="Quando aplicável"></label><label style="grid-column:1/-1">Observações de conferência<textarea id="puc3-find-note" rows="2"></textarea></label><label style="grid-column:1/-1"><input type="checkbox" id="puc3-find-confirm"> Conferi este valor, objeto, período e documento original (não equivale à homologação SNP)</label></div><div class="two-actions"><button type="button" class="btn" id="puc3-find-save">Salvar achado</button><button type="button" class="btn secondary" id="puc3-find-delete">Excluir achado</button><button type="button" class="btn secondary" id="puc3-review-close">Fechar</button></div></div>'+
 '<h3>3 · Indicadores revisados por arquivo</h3><div class="scroll"><table class="data-table"><thead><tr><th>PUC</th><th>Fonte e documento</th><th>Indicador</th><th>Valor</th><th>Competência</th><th>Situação</th><th>Ação</th></tr></thead><tbody id="puc3-findings-rows"></tbody></table></div>'+
 '<h3>4 · Confrontar e gerar relatório</h3><div class="two-actions"><button type="button" class="btn" id="puc3-run">Confrontar fontes anexadas</button><button type="button" class="btn secondary" id="puc3-csv">Exportar achados CSV</button><button type="button" class="btn secondary" id="puc3-report">Gerar relatório documental</button></div><div id="puc3-result"></div>';
 cmp.insertBefore(panel,cmp.firstChild);
 const style=document.createElement('style');style.textContent='.puc3-projects{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:7px;margin:12px 0 20px}.puc3-choose{display:flex;gap:8px;align-items:start;border:1px solid #dbe5ed;border-radius:8px;padding:9px;font-size:12px;cursor:pointer}.puc3-choose small{display:block;color:#637a8e}.puc3-choose input{margin-top:3px}.puc3-uploads,.puc3-coverage{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0}.puc3-source,.puc3-kpi{padding:13px;border:1px solid #dce7ee;border-radius:10px;background:#f8fafc;min-width:0}.puc3-source label{display:grid;gap:4px;font-size:12px;margin:10px 0}.puc3-source input,.puc3-source select{width:100%;max-width:100%;padding:8px;border:1px solid #cedbe4;border-radius:7px}.puc3-source small,.puc3-kpi span{display:block;font-size:11px;color:#667d90;margin-top:8px}.puc3-kpi strong{font-size:21px;display:block}.puc3-review{padding:18px;border:1px solid #bcd6e3;background:#f5fafc;border-radius:11px;margin:16px 0}.puc3-review[hidden],#puc-docs-table[hidden]{display:none!important}#puc3-files-rows small,#puc3-findings-rows small,#puc3-result small{display:block;color:#667d90;margin-top:4px}#puc3-result{margin-top:18px}#puc3-legacy summary{cursor:pointer;font-weight:650}@media(max-width:850px){.puc3-uploads,.puc3-coverage{grid-template-columns:1fr}.puc3-projects{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.puc3-projects{grid-template-columns:1fr}.puc3-source{padding:11px}}';document.head.appendChild(style);
 sourceCards();renderChecks();render();
 $('puc3-search').oninput=renderChecks;
 $('puc3-all').onclick=()=>{selected=new Set(projects.map(p=>p.id));renderChecks();render()};
 $('puc3-clear').onclick=()=>{selected.clear();renderChecks();render();$('puc3-result').innerHTML=''};
 $('puc3-find-save').onclick=save;$('puc3-find-delete').onclick=removeFinding;
 $('puc3-review-close').onclick=()=>$('puc3-review').hidden=true;
 $('puc3-run').onclick=audit;
 $('puc3-csv').onclick=()=>csv(lastRows.map(f=>({puc:f.project,fonte:f.source,documento:f.document,referencia:f.reference||'',indicador:label[f.indicator]||f.indicator,valor:f.value,unidade:units[f.indicator],competencia:f.period,data_corte:f.cutoff,objeto:f.object,contrato:f.contract,apuracao:f.aggregation,conferido:f.verified?'SIM':'NÃO',observacao:f.note})),'PUC_ACHADOS_DOCUMENTAIS_SEI_BALANCO_SIOP.csv');
 $('puc3-report').onclick=exportReport;
 document.addEventListener('puc-documents-updated',render);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();