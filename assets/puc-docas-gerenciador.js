/* DOCAS SNP — gestão por token administrativo; nunca publicar o token no repositório. */
'use strict';
(()=>{
 const root=document.getElementById('docas');if(!root)return;
 const cfg=window.PUC_DOCAS_CONFIG||{},base=String(cfg.supabaseUrl||'').replace(/\/$/,''),key=cfg.publishableKey||'';
 const area=document.createElement('section');area.id='puc-docas-externas-manager';area.className='panel';
 area.innerHTML='<h2>Central DOCAS — Formulários recebidos</h2>'+
 '<p class="muted">Acesso administrativo por token exclusivo, sem e-mail e sem senha. Somente a SNP pode emitir convites ou consultar dados recebidos.</p>'+
 '<p class="statusline" id="pd-status" role="status" aria-live="polite">Verificando autorização gerencial por token...</p>'+
 '<div id="pd-login"><p class="notice">Acesso restrito: abra o link administrativo individual fornecido à SNP. Não há cadastro nem formulário de senha.</p></div>'+
 '<div id="pd-painel" style="display:none"><div class="two-actions"><button class="btn" type="button" id="pd-ver-registros">Formulários recebidos</button>'+
 '<button class="btn secondary" type="button" id="pd-ver-companhias">Gerar tokens das DOCAS</button>'+
 '<button class="btn secondary" type="button" id="pd-refresh">Atualizar</button><button class="btn secondary" type="button" id="pd-exit">Encerrar acesso</button></div>'+
 '<div id="pd-registros-conteudo"><div class="scroll"><table class="data-table"><thead><tr><th>Recebimento</th><th>Companhia</th><th>UF</th><th>Empreendimento</th><th>Física</th><th>Financeira</th><th>Status</th><th>Conferência</th></tr></thead><tbody id="pd-rows"></tbody></table></div></div>'+
 '<div id="pd-companhias" hidden><p class="muted">Os links emitidos dão acesso exclusivo ao preenchimento do formulário externo. Emitir novo token invalida o anterior para a mesma Companhia.</p>'+
 '<div class="scroll"><table class="data-table"><thead><tr><th>Companhia</th><th>Envios</th><th>Validade</th><th>Token</th></tr></thead><tbody id="pd-companhias-dados"></tbody></table></div>'+
 '<div id="pd-link-emitido-area" hidden><label>Link recém-emitido para encaminhamento exclusivo<input id="pd-link-emitido" readonly type="text" autocomplete="off"></label><button class="btn" type="button" id="pd-copiar-emitido">Copiar link</button></div></div></div>';
 const before=document.getElementById('puc-docas-acessos-portal');
 if(before)before.insertAdjacentElement('afterend',area);else root.insertBefore(area,root.firstChild);
 const $=id=>document.getElementById(id);
 const status=msg=>$('pd-status').textContent=msg;
 let token='',rows=[],companies=[];
 const SESSION_KEY='puc_docas_token_gestao_v1';
 const params=new URLSearchParams(location.hash.replace(/^#/,''));
 const admin=params.get('gestor');
 if(admin&&/^[a-f0-9]{64}$/.test(admin)){
   token=admin;
   try{sessionStorage.setItem(SESSION_KEY,token)}catch{}
   history.replaceState(null,'',location.pathname+location.search);
   document.querySelector('#nav [data-page="docas"]')?.click();
 }else try{token=sessionStorage.getItem(SESSION_KEY)||''}catch{}
 const fields=['data_atualizacao','companhia_nome','uf','empreendimento','id_gov_pac','objetivo_descricao','investimento_total','origem_recursos','inicio','conclusao_prevista','situacao','fase','execucao_fisica','execucao_financeira','contratos_principais','resultados_entregas','restricoes_pendencias','providencias_proximos_marcos','responsavel_preenchimento'];
 const labels=['Data da atualização','Companhia','UF','Empreendimento','ID GOV/PAC','Objetivo','Investimento total','Origem dos recursos','Início','Conclusão prevista','Situação','Fase','Execução física','Execução financeira','Contratos','Resultados','Restrições','Providências','Responsável'];
 const td=(tr,value)=>{let cell=tr.insertCell();cell.textContent=String(value??'—');return cell};
 const clear=()=>{rows=[];companies=[];$('pd-rows').replaceChildren();$('pd-companhias-dados').replaceChildren();$('pd-link-emitido').value='';$('pd-link-emitido-area').hidden=true;window.PUC_DOCAS_DECLARACOES_EXTERNAS=[];window.dispatchEvent(new CustomEvent('puc:docas-externas-atualizadas',{detail:{quantidade:0}}))};
 async function api(action,body={}){
  if(!token)throw Error('Link administrativo necessário');
  const resp=await fetch(base+'/functions/v1/puc-docas-gestao-token',{method:'POST',mode:'cors',cache:'no-store',headers:{'Content-Type':'application/json',apikey:key},body:JSON.stringify({action,token,...body})});
  const out=await resp.json().catch(()=>({}));
  if(!resp.ok||!out.ok)throw Error(out.erro||('HTTP '+resp.status));
  return out;
 }
 function records(){
  $('pd-rows').replaceChildren();
  for(const x of rows){
   const tr=$('pd-rows').insertRow();
   td(tr,x.enviado_em?new Date(x.enviado_em).toLocaleString('pt-BR'):'—');
   td(tr,x.companhia_nome);td(tr,x.uf);td(tr,x.empreendimento);
   td(tr,x.execucao_fisica==null?'—':x.execucao_fisica+'%');
   td(tr,x.execucao_financeira==null?'—':x.execucao_financeira+'%');td(tr,x.status);
   const cell=tr.insertCell(),details=document.createElement('details'),summary=document.createElement('summary');
   summary.textContent='Examinar e conferir';details.append(summary);
   const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;font-size:12px';
   pre.textContent=labels.map((v,i)=>v+': '+(x[fields[i]]??'—')).join('\n')+'\nProtocolo: '+x.protocolo;details.append(pre);
   const select=document.createElement('select');
   for(const v of ['recebida','em_analise','validada','devolvida']){const o=document.createElement('option');o.value=v;o.textContent=v;select.append(o)}
   select.value=x.status;details.append(select);
   const note=document.createElement('textarea');note.rows=3;note.maxLength=5000;note.placeholder='Análise ou justificativa';note.value=x.analise||'';details.append(note);
   const save=document.createElement('button');save.className='btn';save.type='button';save.textContent='Salvar conferência';
   save.onclick=async()=>{save.disabled=true;try{await api('conferir',{id:x.id,status:select.value,analise:note.value});x.status=select.value;x.analise=note.value;tr.cells[6].textContent=x.status;status('Conferência salva no banco de dados')}catch(e){status('Erro: '+e.message)}finally{save.disabled=false}};
   details.append(save);cell.append(details);
  }
 }
 function renderCompanies(){
  const body=$('pd-companhias-dados');body.replaceChildren();
  for(const c of companies){
   const tr=body.insertRow();td(tr,c.companhia_nome);td(tr,(c.enviados||0)+' / '+c.max_envios);
   td(tr,c.ativo?new Date(c.expira_em).toLocaleDateString('pt-BR'):'Inativo');
   const actions=tr.insertCell(),generate=document.createElement('button');generate.className='btn secondary';generate.textContent='Emitir token';generate.type='button';
   generate.onclick=async()=>{
     if(!confirm('Gerar novo token para '+c.companhia_nome+'? O token anterior será invalidado.'))return;
     generate.disabled=true;
     try{const a=await api('emitir',{codigo:c.companhia_codigo});$('pd-link-emitido').value=a.link;$('pd-link-emitido-area').hidden=false;status('Token emitido. Copie e encaminhe somente à Companhia.');await load(false)}catch(e){status('Erro ao gerar: '+e.message)}finally{generate.disabled=false}
   };
   const revoke=document.createElement('button');revoke.className='btn secondary';revoke.type='button';revoke.textContent='Revogar';revoke.style.marginLeft='7px';
   revoke.onclick=async()=>{if(!confirm('Revogar o acesso de '+c.companhia_nome+'?'))return;try{await api('revogar',{codigo:c.companhia_codigo});status('Acesso revogado');await load(false)}catch(e){status('Falha: '+e.message)}};
   actions.append(generate,revoke);
  }
 }
 async function load(announce=true){
  if(!token)return;
  try{
   const d=await api('listar');rows=d.registros||[];companies=d.companhias||[];
   $('pd-login').style.display='none';$('pd-painel').style.display='block';
   records();renderCompanies();
   window.PUC_DOCAS_DECLARACOES_EXTERNAS=rows.slice();
   window.dispatchEvent(new CustomEvent('puc:docas-externas-atualizadas',{detail:{quantidade:rows.length}}));
   if(announce)status(rows.length+' formulário(s) recebidos · '+companies.length+' companhias cadastradas.');
   if(window.PUC_DOCAS_TAB_DESEJADA==='links')$('pd-ver-companhias').click();
   else if(window.PUC_DOCAS_TAB_DESEJADA==='records')$('pd-ver-registros').click();
   window.PUC_DOCAS_TAB_DESEJADA=null;
  }catch(e){
   status('Não foi possível autorizar a gestão por token: '+e.message);
   $('pd-painel').style.display='none';$('pd-login').style.display='block';
   clear();
  }
 }
 $('pd-ver-registros').onclick=()=>{$('pd-registros-conteudo').hidden=false;$('pd-companhias').hidden=true};
 $('pd-ver-companhias').onclick=()=>{$('pd-registros-conteudo').hidden=true;$('pd-companhias').hidden=false};
 $('pd-refresh').onclick=()=>load();
 $('pd-exit').onclick=()=>{token='';try{sessionStorage.removeItem(SESSION_KEY)}catch{}clear();$('pd-painel').style.display='none';$('pd-login').style.display='block';status('Acesso gerencial encerrado')};
 $('pd-copiar-emitido').onclick=()=>{const link=$('pd-link-emitido').value;if(link)navigator.clipboard.writeText(link).then(()=>status('Link copiado')).catch(()=>status('Selecione e copie o link'))};
 if(token)load();else status('Abra o endereço administrativo exclusivo para habilitar emissão de tokens e recebimentos.');
})();