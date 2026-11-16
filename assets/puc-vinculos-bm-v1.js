/* BI PUC — Conciliador manual de BMs dos processos SEI.
 * Um BM só recebe vínculo após seleção explícita do empreendimento e conferência do operador.
 * Persistência local ao navegador (exportação/importação JSON para transferência).
 */
(function(w){
 'use strict';
 const KEY='BI_PUC_VINCULOS_BM_SEI_V1';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const docs=()=>w.PUCDocLibrary?.list?.().filter(d=>d.origin==='SEI'&&/BM IDENTIFICADO|BM PROVÁVEL/.test(d.bmStatus||''))||[];
 const balances=()=>w.PUCCorrelacao?.balancoRows?.()||[];
 const rowKey=r=>[String(r.id||'').trim(),norm(r.uf),norm(r.empreendimento)].join('|');
 const sourceKey=d=>String(d.id||'').trim();
 const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}};
 const write=data=>{localStorage.setItem(KEY,JSON.stringify(data));w.dispatchEvent(new CustomEvent('puc-bm-vinculos-atualizados'))};
 const all=()=>read();
 const get=doc=>read()[typeof doc==='object'?sourceKey(doc):String(doc)]||null;
 const match=(doc,row)=>{const x=get(doc);return !!x&&x.rowKey===rowKey(row)&&x.documentName===doc.name&&x.status==='conferido'};
 const money=x=>w.PUCQuadroValores?.parseMoney?.(x)??null;
 const candidate=(doc,type)=>{
  const found=(doc.candidates||[]).filter(c=>c.type===type).flatMap(c=>c.values||[]);
  return found.length===1?money(found[0]):null;
 };
 function validated(data,doc,rows){
  if(!doc||!rows.some(r=>rowKey(r)===data.rowKey))throw Error('Selecione um BM e um empreendimento existente no Balanço.');
  if(!String(data.ref||'').trim()||!String(data.bmNumber||'').trim()||!String(data.competence||'').trim())
   throw Error('Informe referência SEI, número do BM e competência comprovados no boletim.');
  if(!String(data.justification||'').trim()||String(data.justification).trim().length<12)
   throw Error('Descreva a evidência que comprova a associação (contrato, objeto ou referência).');
  if(!data.verified)throw Error('Confirme a conferência documental antes de registrar.');
  if(data.value!==''&&data.value!==null&&data.value!==undefined&&money(data.value)===null)
   throw Error('O valor da medição deve ser numérico e comprovado no BM.');
  return {docId:sourceKey(doc),documentName:doc.name,documentOrigin:'SEI',rowKey:data.rowKey,
   project:String(data.project||''),ref:String(data.ref).trim(),bmNumber:String(data.bmNumber).trim(),
   competence:String(data.competence).trim(),contract:String(data.contract||'').trim(),
   justification:String(data.justification).trim(),value:data.value===''?null:money(data.value),
   valueSource:data.valueSource||'conferência manual do BM',status:'conferido',
   reviewedAt:new Date().toISOString()};
 }
 function save(doc,data){
  const result=validated(data,doc,balances());
  const state=read();state[sourceKey(doc)]=result;write(state);return result;
 }
 function remove(id){const data=read();delete data[String(id)];write(data)}
 function render(){
  const node=$('puc-bm-associacoes'),select=$('puc-bm-doc'),target=$('puc-bm-row');
  if(!node||!select||!target)return;
  const files=docs(),rows=balances(),priorFile=select.value,priorRow=target.value;
  select.innerHTML='<option value="">Selecione o BM do processo SEI</option>'+
   files.map(d=>'<option value="'+esc(sourceKey(d))+'">'+esc((d.bmNumber?'BM '+d.bmNumber+' · ':'')+d.name+' · '+(d.ref||'SEI a conferir'))+'</option>').join('');
  target.innerHTML='<option value="">Selecione a obra / ID Governa do Balanço</option>'+
   rows.map(r=>'<option value="'+esc(rowKey(r))+'">'+esc((r.id||'Sem ID')+' · '+r.uf+' · '+r.empreendimento)+'</option>').join('');
  if(files.some(d=>sourceKey(d)===priorFile))select.value=priorFile;
  if(rows.some(r=>rowKey(r)===priorRow))target.value=priorRow;
  const data=read(),confirmed=Object.values(data).filter(v=>files.some(d=>sourceKey(d)===v.docId&&d.name===v.documentName)&&rows.some(r=>rowKey(r)===v.rowKey));
  const orphan=files.filter(d=>!confirmed.some(x=>x.docId===sourceKey(d))).length;
  const suggestions=$('puc-bm-suggestions');
  if(suggestions){
   const pending=files.filter(d=>!confirmed.some(x=>x.docId===sourceKey(d)));
   suggestions.replaceChildren();
   for(const d of pending){
    const row=document.createElement('div');row.className='puc-bm-link-item';
    const desc=document.createElement('span');
    desc.textContent='BM '+(d.bmNumber||'nº pendente')+' — '+d.name+' · '+(d.workName||'objeto não extraído')+' · SEI '+(d.ref||'não informado');
    const choose=document.createElement('button');choose.className='btn secondary';choose.type='button';choose.textContent='Examinar e associar';
    choose.onclick=()=>{select.value=sourceKey(d);selectDoc();$('puc-bm-justification').focus();};
    row.append(desc,choose);suggestions.append(row);
   }
   if(!pending.length)suggestions.textContent='Não há BM pendente entre os documentos atualmente identificados.';
  }
  const label=$('puc-bm-links-summary');
  if(label)label.textContent=files.length+' BMs identificados · '+confirmed.length+' associações conferidas neste navegador · '+orphan+' sem associação';
  const holder=$('puc-bm-links-list');holder.replaceChildren();
  for(const item of confirmed){
   const line=document.createElement('div');line.className='puc-bm-link-item';
   const r=rows.find(x=>rowKey(x)===item.rowKey);
   const txt=document.createElement('span');
   txt.textContent='BM '+item.bmNumber+' · '+(r?.empreendimento||item.rowKey)+' · '+(item.value===null?'Valor não extraído':item.value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}))+' · SEI '+item.ref;
   const btn=document.createElement('button');btn.type='button';btn.className='btn secondary';btn.textContent='Desvincular';
   btn.onclick=()=>{if(confirm('Desfazer a associação conferida deste BM?'))remove(item.docId)};
   line.append(txt,btn);holder.append(line);
  }
  if(!confirmed.length)holder.textContent='Nenhum BM associado neste navegador. Os documentos SEI continuam disponíveis para seleção.';
  renderExtractedValues();
  $('puc-bm-link-save').disabled=!files.length||!rows.length;
 }
 function renderExtractedValues(){
  const host=$('puc-bm-extracoes');
  if(!host)return;
  const files=docs(),current=read(),list=$('puc-bm-extracoes-list');
  if(!list)return;
  list.replaceChildren();
  let unique=0,ambiguous=0,unavailable=0;
  for(const d of files){
   const candidateEntries=(d.candidates||[]).filter(c=>c.type==='Valor da Medição (BM)');
   const values=candidateEntries.flatMap(c=>Array.isArray(c.values)?c.values:[]).filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='');
   const amount=values.length===1?money(values[0]):null;
   if(amount!==null&&values.length===1)unique++;
   else if(values.length>1)ambiguous++;
   else unavailable++;
   const link=current[sourceKey(d)];
   const row=list.insertRow(),cells=[
    d.bmNumber||'Não identificado',d.name||'Arquivo não identificado',
    d.bmPeriod||'Não informada',
    (values.length===1&&amount!==null)?amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):
      values.length>1?'Múltiplos candidatos ('+values.length+') — conferir':'Não extraído',
    d.ref||'Referência SEI não informada',
    d.workName||'Objeto não extraído',
    link?.status==='conferido'?'Conferido — '+(link.rowKey||''):'Aguardando associação'
   ];
   for(const value of cells){const td=row.insertCell();td.textContent=String(value);td.style.overflowWrap='anywhere';}
  }
  const summary=$('puc-bm-extracoes-status');
  if(summary)summary.textContent=files.length+' BM(s) identificados no navegador: '+unique+
    ' com valor único candidato extraído; '+ambiguous+
    ' com valores ambíguos; '+unavailable+' sem valor extraído. Nenhum valor é homologado automaticamente.';
 }
 function exportAuditPackage(){
  const files=docs();
  if(!files.length){status('Não há BMs identificados para exportar. Importe o processo SEI na aba Documentos.');return false}
  const rows=balances();
  let raw={};try{raw=JSON.parse($('embedded-data')?.textContent||'{}')}catch{}
  // Download LOCAL: nenhum dado é transmitido para GitHub ou Supabase.
  const maxText=350000;
  const pacote={
   schema:'BI_PUC_AUDITORIA_BMS_SEI_V1',generatedAt:new Date().toISOString(),
   provenance:'Biblioteca IndexedDB local BI_PUC_DOCUMENTOS_LOCAL; não homologado',
   totalBMs:files.length,
   instructions:'Documento destinado à análise da associação BM x obra do Balanço. Valores candidatos exigem conferência do PDF original.',
   bmDocuments:files.map(d=>({
    id:d.id,name:d.name,hash:d.hash||'',container:d.container||'',
    origin:d.origin,project:d.project||'',projects:d.projects||[],
    bmStatus:d.bmStatus,bmNumber:d.bmNumber,bmPeriod:d.bmPeriod,
    workName:d.workName,ref:d.ref,quality:d.quality,
    candidates:d.candidates||[],findings:d.findings||[],
    text:String(d.text||'').slice(0,maxText),
    textTruncated:String(d.text||'').length>maxText
   })),
   balanceRows:rows.map(r=>({
    id:r.id,uf:r.uf,empreendimento:r.empreendimento,
    valor_global:r.valor_global,inicio:r.inicio,termino:r.termino,
    arquivo:r.arquivo,documento_id:r.documento_id,data_referencia:r.data_referencia
   })),
   projectRegistry:(raw.projetos||[]).map(p=>({
    id:p.id,id_governa:p.id_governa,uf:p.uf,empreendimento:p.empreendimento,
    empresa:p.empresa,acao:p.acao,po:p.po
   })),
   confirmedLinks:read()
  };
  const blob=new Blob([JSON.stringify(pacote,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='PUC_15_BMS_SEI_PACOTE_CONFERENCIA_'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  status('Pacote local com '+files.length+' BMs, valores extraídos e obras do Balanço exportado. Confira o arquivo antes de compartilhá-lo; pode conter dados do processo SEI.');
  return true;
 }
  function selectDoc(){
  const d=docs().find(x=>sourceKey(x)===$('puc-bm-doc').value);if(!d)return;
  const v=get(d);
  $('puc-bm-ref').value=v?.ref||d.ref||'';
  $('puc-bm-number').value=v?.bmNumber||d.bmNumber||'';
  $('puc-bm-competence').value=v?.competence||d.bmPeriod||'';
  $('puc-bm-contract').value=v?.contract||d.contract||'';
  const c=candidate(d,'Valor da Medição (BM)');
  $('puc-bm-value').value=v?.value??c??'';
  $('puc-bm-value-origin').textContent=c!==null?'Valor candidato extraído do BM; confira-o no documento original.':'Valor não extraído automaticamente; transcreva-o somente após examinar o BM.';
  $('puc-bm-justification').value=v?.justification||'';
  $('puc-bm-confirmed').checked=false;
  // Preservar empreendimento escolhido no quadro ao selecionar um BM ainda não associado.
  $('puc-bm-row').value=v?.rowKey||$('puc-bm-row').value||'';
 }
 function download(){
  const obj={schema:'BI_PUC_VINCULOS_BM_SEI_V1',exportedAt:new Date().toISOString(),items:read()};
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='PUC_ASSOCIACOES_BM_SEI_'+new Date().toISOString().slice(0,10)+'.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
 }
 async function upload(event){
  const file=event.target.files?.[0];if(!file)return;
  try{
   if(file.size>2000000)throw Error('Arquivo acima do limite de 2 MB.');
   const obj=JSON.parse(await file.text());
   if(obj.schema!=='BI_PUC_VINCULOS_BM_SEI_V1'||!obj.items||typeof obj.items!=='object')throw Error('Arquivo de associações incompatível.');
   const state=read(),files=docs(),rows=balances();let count=0;
   for(const [id,x] of Object.entries(obj.items)){
    const doc=files.find(d=>sourceKey(d)===id&&d.name===x.documentName);
    if(!doc||!rows.some(r=>rowKey(r)===x.rowKey)||x.status!=='conferido')continue;
    state[id]=validated({...x,verified:true},doc,rows);count++;
   }
   if(!count)throw Error('Nenhuma associação corresponde aos BMs e empreendimentos disponíveis neste navegador.');
   write(state);status(count+' associação(ões) importada(s) e vinculada(s) aos documentos presentes.');
  }catch(e){status('Não foi possível importar: '+e.message)}finally{event.target.value=''}
 }
 function openForRow(key){
  const section=$('puc-bm-associacoes');
  if(!section)return false;
  render();
  const sel=$('puc-bm-row'),rows=balances();
  if(rows.some(r=>rowKey(r)===key))sel.value=key;
  section.scrollIntoView({behavior:'smooth',block:'start'});
  $('puc-bm-doc')?.focus();
  status('Empreendimento selecionado. Escolha um BM, confira o original e confirme o vínculo.');
  return true;
 }
 const status=t=>{const x=$('puc-bm-link-status');if(x)x.textContent=t};
 function init(){
  const section=$('documentos');if(!section||$('puc-bm-associacoes'))return;
  const panel=document.createElement('section');panel.className='panel';panel.id='puc-bm-associacoes';
  panel.innerHTML='<h2>Vincular BMs dos processos SEI aos empreendimentos</h2>'+
   '<p class="muted">Selecione o boletim encontrado no SEI, identifique a obra/ID Governa do Balanço e confirme os dados com o documento original. Nenhum vínculo é criado somente por semelhança de nome. As associações ficam neste navegador e podem ser exportadas.</p>'+
   '<p id="puc-bm-links-summary" class="statusline"></p>'+
   '<section class="puc-bm-extracoes" style="margin:12px 0 22px"><h3>Valores identificados diretamente nos BMs do SEI</h3>'+
   '<p id="puc-bm-extracoes-status" class="statusline"></p>'+
   '<p class="muted">A tabela mostra exclusivamente valores candidatos extraídos dos BMs locais, inclusive os ainda sem associação. Não inclui valores do Balanço ou do SIOP.</p>'+
   '<div style="overflow-x:auto"><table class="data-table" style="min-width:900px;width:100%"><thead><tr><th>BM</th><th>Arquivo</th><th>Competência</th><th>Valor da medição (BM/SEI)</th><th>Processo SEI</th><th>Obra identificada</th><th>Vínculo</th></tr></thead><tbody id="puc-bm-extracoes-list"></tbody></table></div>'+
   '<button class="btn" type="button" id="puc-bm-export-pacote">Exportar pacote de conferência dos BMs</button>'+
   '<p class="muted">O download contém os textos extraídos dos BMs, candidatos de valores, os registros do Balanço e os vínculos existentes. Arquivo local: nada é enviado automaticamente a terceiros.</p></section>'+
   '<div class="puc-bm-link-fields"><label>Documento BM / processo SEI<select id="puc-bm-doc"></select></label>'+
   '<label>Empreendimento do Balanço<select id="puc-bm-row"></select></label>'+
   '<label>Número do BM<input id="puc-bm-number" type="text" maxlength="80"></label>'+
   '<label>Competência do BM<input id="puc-bm-competence" type="text" maxlength="80" placeholder="MM/AAAA ou data comprovada"></label>'+
   '<label>Referência / processo SEI<input id="puc-bm-ref" type="text" maxlength="250"></label>'+
   '<label>Contrato (se identificado)<input id="puc-bm-contract" type="text" maxlength="150"></label>'+
   '<label>Valor da medição no BM (R$)<input id="puc-bm-value" type="text" inputmode="decimal" placeholder="Sem valor quando não comprovado"><small id="puc-bm-value-origin"></small></label>'+
   '<label>Fundamento documental do vínculo<textarea id="puc-bm-justification" rows="2" maxlength="1000" placeholder="Informe contrato, trecho do BM, referência SEI e correspondência com o objeto"></textarea></label></div>'+
   '<label class="puc-bm-link-check"><input type="checkbox" id="puc-bm-confirmed"> Conferi o BM original e sua correspondência com o empreendimento selecionado.</label>'+
   '<div class="puc-bm-link-actions"><button class="btn" type="button" id="puc-bm-link-save">Confirmar associação do BM</button>'+
   '<button class="btn secondary" type="button" id="puc-bm-link-export">Exportar associações JSON</button>'+
   '<label class="btn secondary">Importar associações JSON<input type="file" id="puc-bm-link-import" accept=".json,application/json" style="display:none"></label></div>'+
   '<p role="status" id="puc-bm-link-status"></p><h3>Associações conferidas</h3><div id="puc-bm-links-list"></div>'+
   '<details id="puc-bm-pendentes" open><summary><strong>Boletins do SEI aguardando associação</strong></summary><div id="puc-bm-suggestions"></div></details>';
  const anchor=$('pucq-panel');
  if(anchor)anchor.insertAdjacentElement('beforebegin',panel);else section.append(panel);
  const css=document.createElement('style');
  css.textContent='.puc-bm-link-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.puc-bm-link-fields label{display:flex;flex-direction:column;gap:5px;font-size:13px}.puc-bm-link-fields input,.puc-bm-link-fields select,.puc-bm-link-fields textarea{width:100%;min-width:0;padding:9px;border:1px solid #cbdbe4;border-radius:7px;background:#fff}.puc-bm-link-check{display:block;margin:12px 0}.puc-bm-link-actions{display:flex;gap:9px;flex-wrap:wrap}.puc-bm-link-item{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dde6ed;padding:9px 0;gap:10px;font-size:13px}@media(max-width:750px){.puc-bm-link-fields{grid-template-columns:1fr}}';
  document.head.append(css);
  $('puc-bm-doc').onchange=selectDoc;
  $('puc-bm-link-save').onclick=()=>{
   const doc=docs().find(d=>sourceKey(d)===$('puc-bm-doc').value);
   try{
    save(doc,{rowKey:$('puc-bm-row').value,ref:$('puc-bm-ref').value,bmNumber:$('puc-bm-number').value,
     competence:$('puc-bm-competence').value,contract:$('puc-bm-contract').value,value:$('puc-bm-value').value,
     justification:$('puc-bm-justification').value,verified:$('puc-bm-confirmed').checked});
    status('Associação conferida e registrada neste navegador. O valor será exibido no quadro BM/SEI.');render();
   }catch(e){status(e.message)}
  };
  $('puc-bm-export-pacote').onclick=exportAuditPackage;
  $('puc-bm-link-export').onclick=download;
  $('puc-bm-link-import').onchange=upload;
  document.addEventListener('puc-documents-updated',render);
  w.addEventListener('puc-bm-vinculos-atualizados',render);
  render();
 }
 w.PUCVinculosBM={all,get,match,save,remove,rowKey,docs,balances,render,openForRow,exportAuditPackage,renderExtractedValues};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);