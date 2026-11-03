/* BI PUC: correlação assistida (não homologada) entre Balanço e documentos SEI. */
(function(){'use strict';
 const byId=id=>document.getElementById(id);
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clean=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 const keys=value=>clean(value).split(' ').filter(w=>w.length>=4&&!['PORTO','OBRAS','OBRA','PARA','COMO','NOVA','NOVO','SOBRE','DADOS','INVESTIMENTO','EXECUCAO','ESTRUTURA','TERMINAL','RECUPERACAO','MELHORIA'].includes(w));
 const readProjects=()=>{try{return JSON.parse(byId('embedded-data')?.textContent||'{}').projetos||[]}catch(e){return []}};
 function parseDelimited(text){
  const a=[];let r=[],field='',inside=false;const source=String(text||'').replace(/^\uFEFF/,'');
  for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(inside&&source[i+1]==='"'){field+='"';i++}else inside=!inside}
   else if(c===';'&&!inside){r.push(field);field=''}
   else if((c==='\n'||c==='\r')&&!inside){if(c==='\r'&&source[i+1]==='\n')i++;r.push(field);if(r.some(x=>x.trim()))a.push(r);r=[];field=''}else field+=c;
  }r.push(field);if(r.some(x=>x.trim()))a.push(r);return a;
 }
 const normalHeaders={'ID GOVERNA':'id','NOME DO EMPREENDIMENTO':'empreendimento','UF':'uf','MUNICIPIOS':'municipios','EXECUTOR':'executor','VALOR INVESTIMENTO':'valor_global','INICIO EMPREENDIMENTO DD MM AAAA':'inicio','PREVISAO CONCLUSAO DO EMPREENDIMENTO DD MM AAAA':'termino','EXECUCAO FISICA':'execucao_fisica','DATA DE REFERENCIA':'data_referencia'};
 function balancoRows(){
  const files=window.PUCDocLibrary?.list?.().filter(d=>d.origin==='BALANCO')||[],rows=[];
  for(const f of files){const all=parseDelimited(f.text);if(!all.length)continue;let idx=all.findIndex(row=>row.some(x=>clean(x)==='NOME DO EMPREENDIMENTO')&&row.some(x=>clean(x)==='UF'));if(idx<0)continue;
   let headers=all[idx].map(x=>normalHeaders[clean(x)]||'');
   for(const line of all.slice(idx+1)){
    let o={};for(let n=0;n<headers.length;n++)if(headers[n])o[headers[n]]=String(line[n]||'').trim();
    if(!o.empreendimento||!o.uf)continue;
    rows.push({...o,arquivo:f.name,referencia:f.ref,documento_id:f.id});
   }
  }
  return rows;
 }
 function dateString(v){const n=Number(v);if(/^[0-9]{5}$/.test(String(v||''))&&n>30000&&n<100000){const dt=new Date(Date.UTC(1899,11,30)+n*86400000);return dt.toLocaleDateString('pt-BR',{timeZone:'UTC'})}return String(v||'Não informada')}
 function projectSuggestions(row){const uf=String(row.uf||'').split(/[,;\/]/).map(x=>x.trim().toUpperCase());return readProjects().filter(p=>uf.includes(p.uf)).map(p=>{
  const pwords=new Set(keys(p.empreendimento)),words=keys(row.empreendimento);const common=words.filter(w=>pwords.has(w));
  const overlap=common.length/Math.max(1,Math.min(pwords.size,words.length));return {id:p.id,title:p.empreendimento,score:overlap};
 }).filter(x=>x.score>=0.42).sort((a,b)=>b.score-a.score);
 }
 function seiSummary(){const docs=window.PUCDocLibrary?.list?.().filter(x=>x.origin==='SEI')||[];
  const bms=docs.filter(x=>/^BM IDENTIFICADO|^BM PROVÁVEL/.test(x.bmStatus||''));
  return {total:docs.length,bms,unknown:bms.filter(x=>!x.bmNumber||!x.bmPeriod).length};
 }
 function render(){
  const target=byId('puc3-vinculos-empreendimentos'),status=byId('puc3-vinculos-status'),sei=byId('puc3-vinculos-sei');if(!target||!status)return;
  const rows=balancoRows(),docs=seiSummary();
  status.textContent=rows.length+' empreendimento(s) identificado(s) nos Balanços anexados · '+docs.total+' documentos SEI analisados · '+docs.bms.length+' BMs possíveis. A associação com a PUC depende de verificação do analista.';
  if(sei)sei.innerHTML=docs.bms.length?'<p><strong>BMs SEI candidatos:</strong> '+docs.bms.length+' · '+docs.unknown+' sem número/competência completos.</p><div class="puc-correlacao-docs">'+docs.bms.slice(0,35).map(x=>'<div><b>'+safe(x.name)+'</b><span> · BM '+safe(x.bmNumber||'não identificado')+' · '+safe(x.bmPeriod||'competência pendente')+' · referência: '+safe(x.ref||'não informada')+'</span></div>').join('')+'</div>':'<p class="muted">Nenhum BM confirmado nesta sessão. Anexe processo SEI e revise os documentos antes de gerar a curva S.</p>';
  if(!rows.length){target.innerHTML='<p class="muted">Nenhum registro estruturado de Balanço disponível. Importe o XLSX na aba mais recente e selecione a UF/empreendimento. Arquivos em outros formatos exigem revisão manual.</p>';return}
  const sortRows=rows.slice().sort((a,b)=>a.uf.localeCompare(b.uf)||a.empreendimento.localeCompare(b.empreendimento,'pt-BR'));
  target.innerHTML='<div class="puc-correlacao-table"><table class="data-table"><thead><tr><th>UF</th><th>Empreendimento / ID_governa</th><th>Valor global</th><th>Físico Balanço</th><th>Datas</th><th>Possível PUC</th></tr></thead><tbody>'+sortRows.slice(0,120).map(row=>{
   const matches=projectSuggestions(row);return '<tr><td>'+safe(row.uf)+'</td><td><strong>'+safe(row.empreendimento)+'</strong><small>ID_governa '+safe(row.id||'não informado')+' · '+safe(row.municipios||'município não informado')+'</small></td><td>'+safe(row.valor_global||'—')+'</td><td>'+safe(row.execucao_fisica||'—')+'</td><td>'+safe(dateString(row.inicio))+' até '+safe(dateString(row.termino))+'</td><td>'+(matches.length?matches.slice(0,2).map(x=>'<small>'+safe(x.id)+' — sugestão não homologada ('+Math.round(x.score*100)+'% de coincidência textual)</small>').join(''):'<small>Sem vínculo seguro — revisão necessária</small>')+'</td></tr>';
  }).join('')+'</tbody></table></div>'+(rows.length>120?'<small>Mostrados os primeiros 120 registros. Filtre pela UF e empreendimento na importação para detalhar a análise.</small>':'');
 }
 function reportSection(projectId){
  const rows=balancoRows(),projects=readProjects(),p=projects.find(x=>x.id===projectId);
  if(!p)return '<p><b>Identificação do Balanço:</b> projeto não localizado no cadastro referencial.</p>';
  const matching=rows.filter(row=>projectSuggestions(row).some(m=>m.id===projectId)).slice(0,12);
  if(!matching.length)return '<h3>Identificação Balanço — UF / empreendimento</h3><p>Nenhuma correspondência textual suficientemente específica foi localizada no Balanço anexado para '+safe(projectId)+'. Esta ausência não comprova falta de investimento; conferir ID_governa, UF e denominação oficial.</p>';
  return '<h3>Identificação Balanço — UF / empreendimento (vínculo preliminar)</h3><p>Registros candidatos encontrados por UF e similaridade textual. <b>Não comprovam vínculo financeiro ou documental.</b></p><table><thead><tr><th>ID_governa</th><th>UF</th><th>Empreendimento</th><th>Valor global (bruto)</th><th>Início / término</th><th>Execução física (bruto)</th><th>Fonte</th></tr></thead><tbody>'+matching.map(r=>'<tr><td>'+safe(r.id||'—')+'</td><td>'+safe(r.uf)+'</td><td>'+safe(r.empreendimento)+'</td><td>'+safe(r.valor_global||'—')+'</td><td>'+safe(dateString(r.inicio))+' / '+safe(dateString(r.termino))+'</td><td>'+safe(r.execucao_fisica||'—')+'</td><td>'+safe(r.arquivo||'Balanço')+'</td></tr>').join('')+'</tbody></table>';
 }
 function init(){const panel=byId('puc3-main');if(!panel)return;let block=document.createElement('details');block.className='panel';block.id='puc3-vinculos';block.innerHTML='<summary style="cursor:pointer;font-weight:700">Identificação de obras · UF × Empreendimento × SEI/BMs</summary><p class="muted">O Balanço fornece a localização e identificação da obra; o SEI fornece o histórico de documentos e boletins. Os percentuais só são comparados após comprovação de mesmo objeto, contrato, período e data de corte.</p><p class="statusline" id="puc3-vinculos-status"></p><div id="puc3-vinculos-empreendimentos"></div><h3>BMs localizados no SEI (não vinculados automaticamente)</h3><div id="puc3-vinculos-sei"></div>';panel.appendChild(block);const style=document.createElement('style');style.textContent='.puc-correlacao-table{overflow:auto}.puc-correlacao-table .data-table{min-width:950px}.puc-correlacao-table small{display:block;color:#697f91;margin-top:4px}.puc-correlacao-docs{max-height:240px;overflow:auto;font-size:12px}.puc-correlacao-docs>div{padding:7px;border-bottom:1px solid #dce6ee}';document.head.appendChild(style);render()}
 window.PUCCorrelacao={refresh:render,balancoRows,projectSuggestions,seiSummary,reportSection};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();