/* Integração declaratória automática — formulário DOCAS → Supabase → Documentos e Confronto */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  function init() {
    const localInput=$('puc3-files-DOCAS');
    const card=localInput?.closest('.puc3-source');
    const central=$('puc3-central-files');
    const manager=$('puc-docas-externas-manager');

    // O módulo gerencial pertence à mesma área de documentos, após as três fontes.
    if(central&&manager&&central.nextElementSibling!==manager){
      central.insertAdjacentElement('afterend',manager);
    }
    if(card&&!card.dataset.docasAuto){
      card.dataset.docasAuto='1';
      card.hidden=false;
      card.classList.add('puc3-docas-integrada');
      // Preservar nós e listeners anteriores (compatibilidade), mas nunca pedir JSON.
      const title=card.querySelector('h3');
      for(const node of [...card.children])if(node!==title)node.hidden=true;
      const info=document.createElement('p');
      info.className='muted';
      info.textContent='As DOCAS preenchem o formulário externo exclusivo. Os registros são recebidos automaticamente no banco do BI, sem anexar JSON ou importar arquivos.';
      const count=document.createElement('p');
      count.id='puc-docas-card-status';
      count.className='statusline';
      count.textContent='Acesse a central abaixo para consultar as respostas das 13 companhias.';
      const actions=document.createElement('div');
      actions.className='two-actions';
      const records=document.createElement('button');
      records.className='btn';
      records.type='button';
      records.textContent='Ver formulários recebidos';
      const manage=document.createElement('button');
      manage.className='btn secondary';
      manage.type='button';
      manage.textContent='Gerenciar acessos das DOCAS';
      function go(which){
        document.querySelector('#nav [data-page="documentos"]')?.click();
        const panel=$('puc-docas-externas-manager');
        if(!panel){count.textContent='Central indisponível. Atualize a página.';return}
        window.PUC_DOCAS_TAB_DESEJADA=which==='links'?'links':'records';
        if($('pd-painel')?.style.display==='block'){
          if(which==='links')$('pd-ver-companhias')?.click();
          else $('pd-ver-registros')?.click();
        }
        panel.scrollIntoView({behavior:'smooth',block:'start'});
      }
      records.onclick=()=>go('records');
      manage.onclick=()=>go('links');
      actions.append(records,manage);
      card.append(info,count,actions);
      if(!$('puc-docas-card-css')){
        const css=document.createElement('style');
        css.id='puc-docas-card-css';
        css.textContent='#puc3-central-files .puc3-docas-integrada[hidden]{display:block!important}'+
          '#puc3-central-files .puc3-docas-integrada > [hidden]{display:none!important}'+
          '#puc3-central-files .puc3-docas-integrada .two-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}'+
          '#puc3-central-files .puc3-docas-integrada .two-actions .btn{margin:0}'+
          '#puc-docas-externas-manager{scroll-margin-top:18px}';
        document.head.appendChild(css);
      }
    }
    const cmp=$('comparacao');
    if(cmp&&!$('puc-docas-compare-automatico')){
      const pane=document.createElement('section');pane.id='puc-docas-compare-automatico';pane.className='panel';
      const heading=document.createElement('h2');heading.textContent='DOCAS — Declarações recebidas automaticamente';
      const note=document.createElement('p');note.className='muted';
      note.textContent='Fonte: declarações externas recebidas no banco central. Dados não substituem o processo SEI, Balanço ou medição e não são automaticamente homologados.';
      const status=document.createElement('p');status.id='puc-docas-auto-status';status.className='statusline';
      status.textContent='Aguardando autenticação gerencial para sincronizar informações do Supabase.';
      const wrap=document.createElement('div');wrap.className='scroll';
      const table=document.createElement('table');table.className='data-table';
      table.style.minWidth='720px';
      const thead=document.createElement('thead');
      const tr=document.createElement('tr');
      for (const name of ['Companhia','UF','Empreendimento','Data','Execução física','Execução financeira','Situação']) {
        const th=document.createElement('th');th.textContent=name;tr.append(th);
      }
      thead.append(tr);
      const tbody=document.createElement('tbody');tbody.id='puc-docas-auto-rows';
      table.append(thead,tbody);wrap.append(table);pane.append(heading,note,status,wrap);
      cmp.append(pane);
    }
  }
  function sync(){
    init();
    const data=window.PUC_DOCAS_DECLARACOES_EXTERNAS;
    if(!Array.isArray(data))return;
    const cardStatus=$('puc-docas-card-status');
    if(cardStatus)cardStatus.textContent=data.length+' formulário(s) recebido(s). Consulte a central para conferir.';
    const status=$('puc-docas-auto-status'),tbody=$('puc-docas-auto-rows');
    if(!tbody)return;
    tbody.replaceChildren();
    const ordered=data.slice().sort((a,b)=>String(b.enviado_em||'').localeCompare(String(a.enviado_em||'')));
    for(const r of ordered.slice(0,250)){
      const tr=document.createElement('tr');
      const info=[r.companhia_nome,r.uf,r.empreendimento,r.data_atualizacao,
        r.execucao_fisica==null?'Não informado':r.execucao_fisica+'%',
        r.execucao_financeira==null?'Não informado':r.execucao_financeira+'%',
        r.status||'recebida'];
      for(const value of info){const td=document.createElement('td');td.textContent=String(value??'—');tr.append(td)}
      tbody.append(tr);
    }
    if(status)status.textContent=ordered.length+' declaração(ões) diretamente do Supabase; valores declarados, sujeitos à conferência técnica.';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  window.addEventListener('puc:docas-externas-atualizadas',sync);
  document.addEventListener('click',event=>{if(event.target.closest('#pd-exit')){const link=document.getElementById('pd-link-emitido');if(link)link.value='';const box=document.getElementById('pd-link-emitido-area');if(box)box.hidden=true;}});
  if(location.hash==='#recebimentos-docas'){
    document.querySelector('#nav [data-page="documentos"]')?.click();
    setTimeout(()=>document.getElementById('puc-docas-externas-manager')?.scrollIntoView({block:'start'}),150);
  }
  sync();
})();
