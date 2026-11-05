/* Integração declaratória automática — formulário DOCAS → Supabase → Documentos e Confronto */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  function init() {
    const localInput = $('puc3-files-DOCAS');
    const card = localInput?.closest('.puc3-source') || localInput?.closest('.puc3-upload') || localInput?.parentElement?.parentElement;
    if (card && !card.dataset.docasAuto) {
      card.dataset.docasAuto = '1';
      const ref = $('puc3-ref-DOCAS');
      for (const el of [ref, localInput]) {
        if (el) {
          const label=el.closest('label');
          if(label) label.hidden=true; else el.hidden=true;
        }
      }
      const importButton=card.querySelector('[data-import="DOCAS"]');
      if(importButton) importButton.hidden=true;
      const attachment=$('puc3-attachment-DOCAS');if(attachment)attachment.hidden=true;
      const oldLink=card.querySelector('a[href="formulario-docas.html"]');
      if(oldLink) oldLink.hidden=true;
      for(const small of card.querySelectorAll('small')){if(/Importe a declaração|JSON|Importar declaração/i.test(small.textContent))small.hidden=true}
      const originalInfo=[...card.querySelectorAll('p')].find(p=>p.textContent.includes('baixa um JSON')||p.textContent.includes('Não há transmissão automática'));
      if(originalInfo)originalInfo.textContent='O preenchimento externo envia automaticamente as informações à base central Supabase. Não é necessário baixar JSON, anexar arquivo nem importar manualmente o formulário.';
      const tip=document.createElement('p');
      tip.className='muted';
      tip.textContent='Consulte os registros atualizados automaticamente em “Recebimentos externos — Informações das DOCAS”, abaixo. A consulta dos dados requer autenticação do gestor SNP.';
      card.append(tip);
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
  if(location.hash==='#recebimentos-docas'){
    document.querySelector('#nav [data-page="documentos"]')?.click();
    setTimeout(()=>document.getElementById('puc-docas-externas-manager')?.scrollIntoView({block:'start'}),150);
  }
  sync();
})();
