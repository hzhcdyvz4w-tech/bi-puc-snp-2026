/* BI PUC SNP — Central DOCAS única | gestão via Supabase Auth + RLS.
   Nenhum token administrativo ou chave de serviço fica no navegador. */
'use strict';
(()=> {
 const page=document.getElementById('docas');
 if(!page||document.getElementById('puc-docas-externas-manager'))return;
 const cfg=window.PUC_DOCAS_CONFIG||{};
 const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
 const apikey=String(cfg.publishableKey||'');
 const correct=/^https:\/\/[a-z0-9.-]+\.supabase\.(co|in)$/i.test(base)
      && apikey.startsWith('sb_publishable_');
 const storageKey='puc_docas_gestor_auth_2026_v4';
 try{for(const key of ['puc_docas_token_gestao_v1','puc_docas_manager_session','puc_docas_gestor_sessao_2026'])sessionStorage.removeItem(key)}catch{}
 if(location.hash.startsWith('#gestor='))history.replaceState(null,'',location.pathname+location.search);
 const style=document.createElement('link');
 style.rel='stylesheet';style.href='assets/puc-docas-central.css?v=20261111';
 document.head.append(style);
 const root=document.createElement('section');
 root.id='puc-docas-externas-manager';root.className='panel';
 root.innerHTML=[
 '<div class="pdc-heading"><div><h2>Central DOCAS — Gestão SNP</h2><p class="pdc-note">Formulários recebidos e convites externos das companhias em um único lugar, vinculados ao Supabase. Nenhum arquivo JSON é necessário.</p></div><span class="pill" id="pdc-role">Acesso protegido</span></div>',
 '<p id="pdc-message" class="statusline" role="status" aria-live="polite">Verificando autorização gerencial...</p>',
 '<form class="pdc-login" id="pdc-login"><strong>Autorização do gestor SNP</strong><p class="pdc-note">Entre com a conta gerencial cadastrada no Supabase. Após autenticar, a Central sincroniza os dados automaticamente durante a sessão.</p><div class="pdc-fields"><label>E-mail da conta gerencial<input id="pdc-email" type="email" autocomplete="username" required></label><label>Senha<input id="pdc-password" type="password" autocomplete="current-password" required></label></div><button id="pdc-login-button" class="btn" type="submit">Entrar na Central DOCAS</button></form>',
 '<div id="pdc-admin" hidden>',
 '<div class="pdc-kpis" id="pdc-kpis"></div>',
 '<div class="pdc-actions"><button id="pdc-tab-receipts" class="btn" type="button">Formulários recebidos</button><button id="pdc-tab-invites" class="btn secondary" type="button">Gerar / revogar acessos</button><button id="pdc-refresh" class="btn secondary" type="button">Atualizar agora</button><button id="pdc-exit" class="btn secondary" type="button">Sair da gestão</button></div>',
 '<section id="pdc-receipts"><p class="pdc-note">Declarações enviadas pelas DOCAS, não homologadas automaticamente. Revise os documentos SEI, Balanço e SIOP antes de validar.</p><div class="pdc-fields"><label>Pesquisar<input type="search" id="pdc-search" placeholder="Companhia, empreendimento, UF ou ID GOV/PAC"></label><label>Filtrar situação<select id="pdc-status"><option value="">Todas</option><option value="recebida">Recebida</option><option value="em_analise">Em análise</option><option value="validada">Validada</option><option value="devolvida">Devolvida</option></select></label></div><div class="pdc-actions"><button id="pdc-export" class="btn secondary" type="button">Exportar respostas CSV</button></div><div class="pdc-table"><table class="data-table"><thead><tr><th>Recebida em</th><th>Companhia</th><th>UF</th><th>Empreendimento</th><th>Física</th><th>Financeira</th><th>Situação</th><th>Conferência</th></tr></thead><tbody id="pdc-rows"></tbody></table></div><p class="pdc-note" id="pdc-list-count"></p></section>',
 '<section id="pdc-invites" hidden><p class="pdc-note">13 companhias vinculadas ao Balanço MPOR 2026. <strong>Emitir</strong> cria novo link e invalida o anterior; <strong>Revogar</strong> suspende o acesso sem apagar declarações anteriores. O link externo abre somente o formulário, sem login.</p><div class="pdc-table"><table class="data-table"><thead><tr><th>Companhia</th><th>Empreendimentos</th><th>Envios</th><th>Validade</th><th>Acesso</th></tr></thead><tbody id="pdc-companies"></tbody></table></div><div id="pdc-token-box" class="pdc-token-box" hidden><strong id="pdc-token-title">Link individual emitido</strong><input type="text" id="pdc-token-link" readonly autocomplete="off" aria-label="Link exclusivo para encaminhar à companhia"><button id="pdc-copy" type="button" class="btn">Copiar link</button><p>O endereço é uma credencial. Envie somente ao destinatário; o sistema não consegue recuperar o token antigo depois que esta mensagem for fechada.</p></div></section>',
 '<p class="pdc-note">Sincronização automática a cada 30 segundos enquanto esta página estiver aberta. A gestão permanece restrita à SNP.</p></div>'
 ].join('');
 page.insertBefore(root,page.firstChild);
 const $=id=>root.querySelector('#'+id);
 const msg=t=>{$('pdc-message').textContent=String(t)};
 let sess=null,rows=[],companies=[],selected='receipts',busy=false,rev=0;
 const fields=['data_atualizacao','companhia_nome','uf','empreendimento','id_gov_pac','objetivo_descricao','investimento_total','origem_recursos','inicio','conclusao_prevista','situacao','fase','execucao_fisica','execucao_financeira','contratos_principais','resultados_entregas','restricoes_pendencias','providencias_proximos_marcos','responsavel_preenchimento'];
 const labels=['Data da atualização','Companhia','UF','Empreendimento','ID GOV/PAC','Descrição','Investimento total (R$)','Origem dos recursos','Início','Conclusão prevista','Situação','Fase','Execução física (%)','Execução financeira (%)','Contratos principais','Resultados / entregas','Restrições / pendências','Providências / próximos marcos','Responsável'];
 function saveSession(){try{sess?sessionStorage.setItem(storageKey,JSON.stringify(sess)):sessionStorage.removeItem(storageKey)}catch{}}
 function clearData(){rev++;rows=[];companies=[];$('pdc-rows').replaceChildren();$('pdc-companies').replaceChildren();$('pdc-token-link').value='';$('pdc-token-box').hidden=true;window.PUC_DOCAS_DECLARACOES_EXTERNAS=[];window.dispatchEvent(new CustomEvent('puc:docas-externas-atualizadas',{detail:{quantidade:0}}))}
 function exit(message){sess=null;saveSession();clearData();$('pdc-admin').hidden=true;$('pdc-login').hidden=false;$('pdc-password').value='';$('pdc-role').textContent='Acesso protegido';msg(message||'Sessão gerencial encerrada.')}
 async function refresh(force=false){
  if(!sess)return false;
  if(!force&&sess.expires>Date.now()+75000)return true;
  try{
   const r=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',cache:'no-store',headers:{apikey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:sess.refresh_token})});
   if(!r.ok)throw Error('Sessão expirada');
   const x=await r.json();if(!x.access_token||!x.refresh_token)throw Error('Sessão inválida');
   sess={access_token:x.access_token,refresh_token:x.refresh_token,expires:Date.now()+(x.expires_in||3600)*1000,user_id:x.user?.id||sess.user_id};
   saveSession();return true;
  }catch{exit('Sua sessão expirou. Entre novamente para continuar.');return false}
 }
 async function api(path,options={}){
  if(!(await refresh()))throw Error('Sessão não autorizada');
  const request=()=>fetch(base+path,{...options,cache:'no-store',headers:{apikey,Authorization:'Bearer '+sess.access_token,...options.headers}});
  let r=await request();if(r.status===401&&await refresh(true))r=await request();return r;
 }
 async function verify(){
  const user=await api('/auth/v1/user');
  if(!user.ok)return false;
  const identity=await user.json();
  if(!identity?.id||identity.id!==sess.user_id)return false;
  const r=await api('/rest/v1/puc_doca_perfis?select=papel,ativo&usuario_id=eq.'+encodeURIComponent(identity.id));
  if(!r.ok)return false;const list=await r.json();
  return list[0]?.ativo===true&&list[0]?.papel==='gerente';
 }
 function td(tr,value){const t=tr.insertCell();t.textContent=String(value??'—');return t}
 function visibleRows(){
  const query=$('pdc-search').value.toLocaleLowerCase('pt-BR').trim(),status=$('pdc-status').value;
  return rows.filter(r=>(!status||r.status===status)&&(!query||[r.companhia_nome,r.uf,r.empreendimento,r.id_gov_pac].some(v=>String(v??'').toLocaleLowerCase('pt-BR').includes(query))));
 }
 function broadcast(){
  window.PUC_DOCAS_DECLARACOES_EXTERNAS=rows.map(x=>({...x}));
  window.dispatchEvent(new CustomEvent('puc:docas-externas-atualizadas',{detail:{quantidade:rows.length,fonte:'Supabase',dadosDeclarados:true}}))
 }
 function metrics(){
  const k=$('pdc-kpis');k.replaceChildren();
  const values=[['Formulários recebidos',rows.length],['Pendentes de conferência',rows.filter(r=>['recebida','em_analise'].includes(r.status)).length],['Companhias com respostas',new Set(rows.map(r=>r.companhia_codigo)).size],['Companhias cadastradas',companies.length]];
  for(const [label,value] of values){const el=document.createElement('div');el.className='pdc-kpi';const small=document.createElement('small');small.textContent=label;const b=document.createElement('b');b.textContent=String(value);el.append(small,b);k.append(el)}
 }
 function renderRows(){
  const tbody=$('pdc-rows');tbody.replaceChildren();
  for(const r of visibleRows()){
   const tr=tbody.insertRow();
   td(tr,r.enviado_em?new Date(r.enviado_em).toLocaleString('pt-BR'):'—');
   td(tr,r.companhia_nome);td(tr,r.uf);td(tr,r.empreendimento);
   td(tr,r.execucao_fisica==null?'—':r.execucao_fisica+'%');
   td(tr,r.execucao_financeira==null?'—':r.execucao_financeira+'%');td(tr,r.status);
   const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Examinar';details.append(summary);
   const pre=document.createElement('pre');pre.textContent=labels.map((k,i)=>k+': '+(r[fields[i]]??'—')).join('\n')+'\nProtocolo: '+r.protocolo;details.append(pre);
   const select=document.createElement('select');
   for(const [code,label] of [['recebida','Recebida'],['em_analise','Em análise'],['validada','Validada'],['devolvida','Devolvida']]){const o=document.createElement('option');o.value=code;o.textContent=label;select.append(o)}
   select.value=r.status;details.append(select);
   const note=document.createElement('textarea');note.rows=3;note.maxLength=5000;note.placeholder='Análise / justificativa da SNP';note.value=r.analise||'';details.append(note);
   const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='Salvar conferência';
   button.onclick=async()=>{
    button.disabled=true;
    try{
     const response=await api('/rest/v1/puc_doca_declaracoes?id=eq.'+encodeURIComponent(r.id),{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({status:select.value,analise:note.value})});
     if(!response.ok)throw Error('HTTP '+response.status);
     const list=await response.json();if(list.length!==1)throw Error('Registro não atualizado');
     r.status=list[0].status;r.analise=list[0].analise;tr.cells[6].textContent=r.status;metrics();broadcast();msg('Conferência gravada no Supabase.')
    }catch(e){msg('Falha ao gravar conferência: '+e.message)}
    finally{button.disabled=false}
   };
   details.append(button);tr.insertCell().append(details)
  }
  $('pdc-list-count').textContent=visibleRows().length+' declaração(ões) exibida(s) de '+rows.length+'.';
 }
 async function manage(action,code){
  const r=await api('/rest/v1/rpc/puc_doca_gerencia',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_acao:action,p_codigo:code||null})});
  if(!r.ok)throw Error('Acesso administrativo não autorizado (HTTP '+r.status+')');
  const obj=await r.json();if(!obj.ok)throw Error('Operação não autorizada');return obj
 }
 function renderCompanies(){
  const body=$('pdc-companies');body.replaceChildren();
  for(const item of companies){
   const tr=body.insertRow();
   td(tr,item.nome);td(tr,item.empreendimentos);
   td(tr,String(item.enviados||0)+' / '+String(item.max_envios||300));
   td(tr,!item.ativo?'Revogado':new Date(item.expira_em).toLocaleDateString('pt-BR'));
   const actions=tr.insertCell();
   const issue=document.createElement('button');issue.className='btn secondary';issue.type='button';issue.textContent=item.ativo?'Emitir novo link':'Emitir link';
   issue.onclick=async()=>{
    if(!confirm('Emitir link de acesso para '+item.nome+'? O link anterior será invalidado.'))return;
    issue.disabled=true;
    try{
     const obj=await manage('renovar',item.codigo);
     $('pdc-token-link').value=obj.link;$('pdc-token-title').textContent='Link individual emitido — '+item.nome;
     $('pdc-token-box').hidden=false;
     $('pdc-token-box').scrollIntoView({block:'nearest'});
     msg('Novo link emitido. Copie e encaminhe somente à companhia '+item.nome+'.');
     await update(false);
    }catch(e){msg('Falha ao emitir o link: '+e.message)}
    finally{issue.disabled=false}
   };actions.append(issue);
   if(item.ativo){
    const revoke=document.createElement('button');revoke.className='btn secondary';revoke.type='button';revoke.textContent='Revogar';
    revoke.onclick=async()=>{
     if(!confirm('Revogar o convite de '+item.nome+'? O acesso deixará de funcionar.'))return;
     revoke.disabled=true;
     try{await manage('revogar',item.codigo);$('pdc-token-link').value='';$('pdc-token-box').hidden=true;await update(false);msg('Convite revogado para '+item.nome+'.')}
     catch(e){msg('Falha ao revogar: '+e.message)}finally{revoke.disabled=false}
    };actions.append(revoke)
   }
  }
 }
 async function update(showMsg=true){
  if(busy||!sess)return;busy=true;const current=rev;
  try{
   const list=[],batch=1000;
   for(let offset=0;offset<10000;offset+=batch){
    const r=await api('/rest/v1/puc_doca_declaracoes?select=*&order=enviado_em.desc&limit='+batch+'&offset='+offset);
    if(!r.ok)throw Error('Consulta de recebimentos: HTTP '+r.status);
    const arr=await r.json();list.push(...arr);
    if(arr.length<batch)break;
   }
   const data=await manage('listar');
   if(!sess||rev!==current)return;
   rows=list;companies=data.convites||[];
   renderRows();renderCompanies();metrics();broadcast();
   if(showMsg)msg('Central sincronizada em '+new Date().toLocaleTimeString('pt-BR')+' — '+rows.length+' recebimento(s); '+companies.length+' companhias.');
  }catch(e){msg('Não foi possível sincronizar a Central: '+e.message)}
  finally{busy=false}
 }
 function tab(which){
  selected=which;$('pdc-receipts').hidden=which!=='receipts';$('pdc-invites').hidden=which!=='invites';
  $('pdc-tab-receipts').className=which==='receipts'?'btn':'btn secondary';
  $('pdc-tab-invites').className=which==='invites'?'btn':'btn secondary';
 }
 async function active(){
  if(!(await verify())){exit('A conta não possui perfil gerencial ativo na SNP.');return}
  $('pdc-login').hidden=true;$('pdc-admin').hidden=false;$('pdc-role').textContent='Gestor SNP autorizado';
  tab(window.PUC_DOCAS_TAB_DESEJADA==='links'?'invites':'receipts');
  window.PUC_DOCAS_TAB_DESEJADA=null;
  await update()
 }
 $('pdc-login').addEventListener('submit',async e=>{
  e.preventDefault();const button=$('pdc-login-button');button.disabled=true;
  try{
   const r=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey,'Content-Type':'application/json'},body:JSON.stringify({email:$('pdc-email').value.trim(),password:$('pdc-password').value}),cache:'no-store'});
   if(!r.ok)throw Error('Credenciais inválidas');
   const data=await r.json();if(!data.access_token||!data.refresh_token||!data.user?.id)throw Error('Falha de autenticação');
   sess={access_token:data.access_token,refresh_token:data.refresh_token,user_id:data.user.id,expires:Date.now()+(data.expires_in||3600)*1000};
   saveSession();$('pdc-password').value='';await active()
  }catch(e){exit('Não foi possível entrar: '+e.message)}
  finally{button.disabled=false}
 });
 $('pdc-tab-receipts').onclick=()=>tab('receipts');
 $('pdc-tab-invites').onclick=()=>tab('invites');
 $('pdc-refresh').onclick=()=>update();
 $('pdc-exit').onclick=async()=>{
  if(sess){try{await api('/auth/v1/logout',{method:'POST'})}catch{}}
  exit('Sessão gerencial encerrada.');
 };
 $('pdc-search').oninput=renderRows;$('pdc-status').onchange=renderRows;
 $('pdc-copy').onclick=async()=>{
  const el=$('pdc-token-link');if(!el.value)return;
  try{await navigator.clipboard.writeText(el.value);msg('Link copiado. Envie somente à Companhia autorizada.')}
  catch{el.focus();el.select();msg('Link selecionado para cópia.')}
 };
 $('pdc-export').onclick=()=>{
  const list=visibleRows();if(!list.length){msg('Não há registros para exportar.');return}
  const names=['protocolo','enviado_em','status',...fields,'analise'];
  const csvValue=x=>{let t=String(x??'');if(/^\s*[=+\-@]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'};
  const csv='\ufeff'+[names,...list.map(r=>names.map(k=>r[k]))].map(row=>row.map(csvValue).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='BI_PUC_DOCAS_Recebimentos_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
 };
 window.PUC_DOCAS_ABRIR=(area)=>{
  document.querySelector('#nav [data-page="docas"]')?.click();
  const show=area==='links'?'invites':'receipts';
  window.PUC_DOCAS_TAB_DESEJADA=area==='links'?'links':'records';
  if(sess)tab(show);
  root.scrollIntoView({behavior:'smooth',block:'start'});
  if(!sess)$('pdc-email').focus();
 };
 if(location.hash==='#recebimentos-docas'||location.hash==='#docas-central'){
  setTimeout(()=>window.PUC_DOCAS_ABRIR('records'),100)
 }
 window.setInterval(()=>{if(sess&&!document.hidden)update(false)},30000);
 window.addEventListener('focus',()=>{if(sess)update(false)});
 window.addEventListener('online',()=>{if(sess)update(false)});
 if(!correct){$('pdc-login-button').disabled=true;msg('Integração Supabase indisponível.');return}
 try{sess=JSON.parse(sessionStorage.getItem(storageKey)||'null')}catch{}
 if(sess&&sess.access_token&&sess.refresh_token)active().catch(()=>exit('Sessão expirada. Entre novamente.'));
 else{sess=null;msg('Faça o acesso gerencial para consultar respostas e administrar os convites das DOCAS.')}
})();
