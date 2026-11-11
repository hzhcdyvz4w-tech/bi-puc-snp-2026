/* Integração documental DOCAS: somente atalhos e resumo no Confronto.
   Gestão de convites, autenticação e recebimentos ficam exclusivamente no módulo gerenciador. */
'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 function init(){
  const input=$('puc3-files-DOCAS'),card=input?.closest('.puc3-source');
  if(card&&!card.dataset.docasBridge){
   card.dataset.docasBridge='1';card.hidden=false;card.classList.add('puc3-docas-integrada');
   const title=card.querySelector('h3');
   for(const element of Array.from(card.children))if(element!==title)element.hidden=true;
   const p=document.createElement('p');p.className='muted';
   p.textContent='As DOCAS enviam formulários exclusivamente por seus convites externos. Os registros entram no Supabase e aparecem automaticamente na Central DOCAS do BI.';
   const line=document.createElement('p');line.id='puc-docas-card-status';line.className='statusline';line.textContent='Acesse a Central DOCAS para consultar respostas e administrar convites.';
   const action=document.createElement('button');action.className='btn';action.type='button';action.textContent='Abrir Central DOCAS';
   action.onclick=()=>{
     if(typeof window.PUC_DOCAS_ABRIR==='function')window.PUC_DOCAS_ABRIR('records');
     else document.querySelector('#nav [data-page="docas"]')?.click();
   };
   card.append(p,line,action);
   const css=document.createElement('style');css.id='puc-docas-card-style';
   css.textContent='#puc3-central-files .puc3-docas-integrada[hidden]{display:block!important}#puc3-central-files .puc3-docas-integrada > [hidden]{display:none!important}';
   document.head.append(css);
  }
  const compare=$('comparacao');
  if(compare&&!$('puc-docas-compare-automatico')){
   const el=document.createElement('section');el.id='puc-docas-compare-automatico';el.className='panel';
   const h=document.createElement('h2');h.textContent='DOCAS — Dados declarados no Supabase';
   const p=document.createElement('p');p.className='muted';p.textContent='Valores informados pelas Companhias, sujeitos à conferência com SEI, Balanço e SIOP. A visualização exige autorização gerencial.';
   const info=document.createElement('p');info.className='statusline';info.id='puc-docas-auto-status';info.textContent='Entre na Central DOCAS para liberar a consulta.';
   const wrap=document.createElement('div');wrap.className='scroll';
   const table=document.createElement('table');table.className='data-table';table.style.minWidth='700px';
   const head=table.createTHead().insertRow();
   for(const col of ['Companhia','UF','Empreendimento','Atualização','Execução física','Execução financeira','Situação']){let th=document.createElement('th');th.textContent=col;head.append(th)}
   const body=table.createTBody();body.id='puc-docas-auto-rows';wrap.append(table);el.append(h,p,info,wrap);compare.append(el);
  }
 }
 function refresh(){
  init();
  const arr=window.PUC_DOCAS_DECLARACOES_EXTERNAS;
  if(!Array.isArray(arr))return;
  const status=$('puc-docas-auto-status'),body=$('puc-docas-auto-rows'),note=$('puc-docas-card-status');
  if(note)note.textContent=arr.length+' formulário(s) sincronizado(s) com o Supabase.';
  if(!body)return;body.replaceChildren();
  for(const x of arr.slice().sort((a,b)=>String(b.enviado_em||'').localeCompare(String(a.enviado_em||''))).slice(0,250)){
   const row=body.insertRow();
   const data=[x.companhia_nome,x.uf,x.empreendimento,x.data_atualizacao,x.execucao_fisica==null?'—':x.execucao_fisica+'%',x.execucao_financeira==null?'—':x.execucao_financeira+'%',x.status];
   for(const value of data){const c=row.insertCell();c.textContent=String(value??'—')}
  }
  if(status)status.textContent=arr.length+' declaração(ões) do Supabase. Dados sujeitos à conferência técnica.';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
 window.addEventListener('puc:docas-externas-atualizadas',refresh);
})();
