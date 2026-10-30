/* BI PUC V16 — entrada documental centralizada exclusivamente em Documentos.
   Move, sem clonar, selecao de PUCs e os tres importadores existentes.
   Mantem listeners e dados IndexedDB ja vinculados. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 function toDocuments(){
  const target=document.querySelector('#nav [data-page="documentos"]');
  if(target){target.click();$('puc3-central-files')?.scrollIntoView({behavior:'smooth',block:'start'})}
 }
 function labelHide(id){const x=$(id);if(!x)return;const label=x.closest('label');if(label)label.hidden=true;else x.hidden=true}
 function hideOldImports(){
  // O importador original SIOP/CSV e o importador estruturado antigo nao
  // fazem parte da nova tela de anexacao; so as tres fontes permanecem visiveis.
  const oldPanel=$('upload-file')?.closest('.panel');if(oldPanel)oldPanel.hidden=true;
  const advanced=$('puc3-advanced-imports');if(advanced)advanced.hidden=true;
  const legacy=$('puc3-legacy');if(legacy){labelHide('restore-evidence-json');}
  // Biblioteca persistente continua para revisao, exclusao e diagnostico.
  // O antigo quarto campo de upload da biblioteca e sua acao ficam ocultos.
  labelHide('puc-lib-files');const oldSave=$('puc-lib-save');if(oldSave)oldSave.hidden=true;
  labelHide('puc-lib-origin');
  // Na ficha/Curva S, retirar duplicacoes de anexo; manter a ficha e as curvas.
  for(const id of ['ficha-sei-files','ficha-upload-bms-csv','ficha-balanco-file','ficha-planned-file','ficha-restore-session'])labelHide(id);
  const oldBm=$('ficha-extract-bms');if(oldBm)oldBm.hidden=true;
  const oldToggle=$('ficha-toggle-sources');if(oldToggle){oldToggle.innerHTML='<span aria-hidden="true">▸</span> Consultar fontes';oldToggle.title='Anexos centralizados em Documentos'}
  const sourceHeading=$('ficha-source-panel')?.querySelector('.ficha-source-heading h3');if(sourceHeading)sourceHeading.textContent='Consultar fontes documentais (anexos na aba Documentos)';
  const heading=$('ficha-source-panel')?.querySelector('.ficha-source-heading');
  if(heading&&!$('puc3-ficha-go-docs')){
   const note=document.createElement('div');note.id='puc3-ficha-go-docs';
   note.className='two-actions';note.innerHTML='<button type="button" class="btn" id="puc3-ficha-docs-button">Anexar documentos em Documentos</button><p class="muted">Os arquivos SEI/BMs, Balanço e SIOP são enviados em um único local. A Ficha e a Curva S permanecem disponíveis para conferência e acompanhamento.</p>';
   heading.insertAdjacentElement('afterend',note);
   $('puc3-ficha-docs-button').onclick=toDocuments;
  }
  const oldHelp=$('puc3-open-compare')?.closest('.panel');if(oldHelp)oldHelp.hidden=true;
  const oldPanelText=$('puc-library')?.querySelector('h2');
  if(oldPanelText)oldPanelText.textContent='Biblioteca documental — arquivos já registrados';
  const sourceCards=$('ficha-source-panel')?.querySelectorAll('.ficha-source-card');sourceCards?.forEach(card=>{const p=card.querySelector('p');if(p)p.textContent='Anexação exclusiva na aba Documentos. Utilize esta seção para consultar dados já registrados, conferir boletins e baixar modelos.'});
  const goDocas=$('docas-import-sources');if(goDocas){goDocas.textContent='Abrir Documentos · SEI, Balanço e SIOP';goDocas.addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();toDocuments()},true)}
  $('fichas')?.addEventListener('click',e=>{const btn=e.target.closest('[data-open-ficha-sources]');if(!btn)return;e.stopImmediatePropagation();e.preventDefault();toDocuments()},true);
  for(const btn of document.querySelectorAll('#fichas [data-open-ficha-sources]'))btn.textContent='Anexar na aba Documentos';
  const syncBtn=$('ficha-sync-confront');if(syncBtn){syncBtn.textContent='Registrar no confronto auxiliar (legado)';syncBtn.title='Integra apenas o confronto auxiliar anterior; o confronto documental das três fontes exige achados revisados na aba Confronto das Fontes.'}
 }
 function init(){
  const cmp=$('comparacao'),docs=$('documentos'),main=$('puc3-main');
  const search=$('puc3-search'),select=$('puc3-projects'),uploads=$('puc3-uploads'),message=$('puc3-status');
  if(!cmp||!docs||!main||!search||!select||!uploads||!message)return;
  if($('puc3-central-files'))return;
  // Elementos originais são realocados: callbacks, selecao e importacao permanecem os mesmos.
  const central=document.createElement('div');central.id='puc3-central-files';central.className='panel';
  central.innerHTML='<h2>Documentos das PUCs · SEI (BMs), Balanço e SIOP</h2><p class="muted">Único local para anexar as fontes. Selecione uma ou várias PUCs para acompanhamento, associe os arquivos à PUC correspondente quando possível e importe cada fonte. Os anexos ficam neste navegador. A análise dos resultados é feita em <strong>Confronto das fontes</strong>.</p><h3>1 · Selecionar PUCs</h3>';
  const header=search.closest('.filters');
  const uploadTitle=document.createElement('h3');uploadTitle.textContent='2 · Anexar os arquivos das três fontes';
  central.appendChild(header);central.appendChild(select);central.appendChild(uploadTitle);central.appendChild(uploads);central.appendChild(message);
  const footer=document.createElement('div');footer.className='two-actions';
  footer.innerHTML='<button type="button" class="btn" id="puc3-docs-compare">Ir para o confronto dos documentos</button><small class="muted">SEI: processos e BMs (inclusive ZIP). Balanço: planilha/relatório. SIOP: consulta anexada, não a base ilustrativa.</small>';
  central.appendChild(footer);
  docs.insertBefore(central,docs.firstElementChild);
  $('puc3-docs-compare').onclick=()=>{document.querySelector('#nav [data-page="comparacao"]')?.click();main.scrollIntoView({behavior:'smooth',block:'start'})};
  const h3=[...main.querySelectorAll(':scope > h3')].find(n=>/Anexar fontes documentais/i.test(n.textContent));
  if(h3)h3.remove();
  const intro=main.querySelector(':scope > p.muted');
  if(intro)intro.innerHTML='Os documentos são anexados exclusivamente na aba <strong>Documentos</strong>. Esta aba apresenta os achados por arquivo, o confronto dos indicadores conferidos e o relatório documental, sem utilizar automaticamente os números SIOP de referência.';
  const forward=document.createElement('div');forward.id='puc3-compare-source-link';forward.className='two-actions';
  forward.innerHTML='<button type="button" class="btn secondary" id="puc3-back-to-docs">Abrir Documentos · SEI, Balanço e SIOP</button><span class="muted" id="puc3-compare-selected">PUCs selecionadas em Documentos</span>';
  const compareStatus=document.createElement('p');compareStatus.id='puc3-compare-status';compareStatus.className='statusline';compareStatus.setAttribute('role','status');compareStatus.textContent='Revise os achados e selecione as PUCs em Documentos antes de confrontar.';
  if(intro)intro.insertAdjacentElement('afterend',forward);else main.insertBefore(forward,main.firstChild);
  forward.insertAdjacentElement('afterend',compareStatus);
  $('puc3-back-to-docs').onclick=toDocuments;
  const counter=$('puc3-selected');
  const sync=()=>{$('puc3-compare-selected').textContent=counter?.textContent||'PUCs selecionadas em Documentos'};
  if(counter){const m=new MutationObserver(sync);m.observe(counter,{childList:true,subtree:true,characterData:true});sync()}
  const headings=[...main.querySelectorAll(':scope > h3')];
  for(const title of headings){
   title.textContent=title.textContent.replace(/^2\s*·/, '1 ·').replace(/^3\s*·/, '2 ·').replace(/^4\s*·/, '3 ·');
  }
  // Nenhum outro campo de upload deve ficar visivel fora dos tres acima.
  hideOldImports();
  const css=document.createElement('style');css.textContent=
   '#puc3-central-files .puc3-uploads{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}'+
   '#puc3-central-files input[type=file]{display:block!important;width:100%}'+
   'input[type=file]:not(#puc3-files-SEI):not(#puc3-files-BALANCO):not(#puc3-files-SIOP){display:none!important}'+
   '#upload-file,#puc3-advanced-imports,#ficha-extract-bms,#puc-lib-save{display:none!important}'+
   '.panel[hidden],label[hidden],details[hidden],button[hidden]{display:none!important}'+
   '@media(max-width:850px){#puc3-central-files .puc3-uploads{grid-template-columns:1fr}}';
  document.head.appendChild(css);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();