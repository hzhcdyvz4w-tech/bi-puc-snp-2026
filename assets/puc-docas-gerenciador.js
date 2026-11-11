/* BI PUC SNP — Central DOCAS única: acesso por token (sem login diário por email/senha).
   O token só é emitido mediante verificação inicial do gestor autorizado no Supabase.
   O gateway aplica autenticação em cada operação; nenhum segredo é publicado no GitHub. */
'use strict';
(()=>{
 const page=document.getElementById('docas');
 if(!page||document.getElementById('puc-docas-externas-manager'))return;
 const config=window.PUC_DOCAS_CONFIG||{};
 const base=String(config.supabaseUrl||'').replace(/\/$/,'');
 const key=String(config.publishableKey||'');
 const endpoint=base+'/functions/v1/puc-docas-gestao-token';
 const configured=/^https:\/\/[a-z0-9.-]+\.supabase\.(co|in)$/i.test(base)
   && key.startsWith('sb_publishable_')&&!key.startsWith('sb_secret_');
 const style=document.createElement('link');
 style.rel='stylesheet';style.href='assets/puc-docas-central.css?v=20261111-token';
 document.head.append(style);
 const root=document.createElement('section');root.id='puc-docas-externas-manager';root.className='panel';
 root.innerHTML=[
 '<div class="pdc-heading"><div><h2>Central DOCAS — Gestão SNP</h2><p class="pdc-note">Formulários recebidos, conferências e convites externos das companhias em um único ambiente. Nenhuma importação JSON é necessária.</p></div><span id="pdc-role" class="pill">Token obrigatório</span></div>',
 '<p id="pdc-message" class="statusline" role="status" aria-live="polite">Informe seu token administrativo.</p>',
 '<div class="pdc-actions" id="pdc-acesso-externo"><button class="btn" id="pdc-gerar-convites" type="button">Gerar tokens das 13 DOCAS</button><a class="btn secondary" href="https://hzhcdyvz4w-tech.github.io/bi-puc-snp-2026/docas-externo/" target="_blank" rel="noopener noreferrer">Acessar formulário das DOCAS</a><span class="pdc-note">O preenchimento requer o token da Companhia. O token gerencial não é utilizado no formulário externo.</span></div>',
 '<form class="pdc-login" id="pdc-token-login"><strong>Autorização do gestor SNP</strong><p class="pdc-note">Entre com o token administrativo individual. Não é necessário informar e-mail ou senha para acessar a Central.</p><label for="pdc-token-input">Token de acesso gerencial</label><input type="password" id="pdc-token-input" autocomplete="off" spellcheck="false" minlength="64" maxlength="128" placeholder="Cole aqui seu token de acesso" required style="width:100%;margin:8px 0 10px"><div class="pdc-actions"><button class="btn" id="pdc-token-button" type="submit">Entrar com token</button></div></form>',
 '<section id="pdc-setup" class="pdc-login pdc-admin-generator"><h3>Gerar token administrativo da SNP</h3><p class="pdc-note">Para criar ou substituir um token, confirme uma única vez sua conta gerencial já autorizada no Supabase. Após a emissão, a entrada será somente pelo token.</p><form id="pdc-setup-form"><div class="pdc-fields"><label>E-mail gerencial (somente na ativação)<input type="email" id="pdc-setup-email" autocomplete="username" required></label><label>Senha da conta (somente na ativação)<input type="password" id="pdc-setup-password" autocomplete="current-password" required></label></div><div class="pdc-actions"><button id="pdc-setup-button" type="submit" class="btn">Gerar token administrativo</button><button id="pdc-setup-cancel" type="button" class="btn secondary">Limpar campos</button></div></form><p class="pdc-note">A emissão revoga os tokens administrativos anteriores. Guarde o novo token em local seguro; ele não poderá ser recuperado depois.</p></section>',
 '<section id="pdc-admin" hidden>',
 '<div id="pdc-kpis" class="pdc-kpis"></div>',
 '<div class="pdc-actions"><button class="btn" id="pdc-tab-receipts" type="button">Formulários recebidos</button><button class="btn secondary" id="pdc-tab-invites" type="button">Gerar / revogar acessos</button><button class="btn secondary" id="pdc-refresh" type="button">Atualizar agora</button><button class="btn secondary" id="pdc-exit" type="button">Encerrar acesso</button></div>',
 '<div class="pdc-token-box" id="pdc-new-admin" hidden><strong>Seu token administrativo foi emitido</strong><p>Copie e guarde agora. Na próxima entrada, será necessário informar este token.</p><input type="text" id="pdc-new-admin-value" readonly autocomplete="off" aria-label="Token administrativo recém-emitido"><button class="btn" id="pdc-copy-admin" type="button">Copiar token administrativo</button><button class="btn secondary" id="pdc-hide-admin" type="button">Ocultar token</button></div>',
 '<section id="pdc-receipts"><p class="pdc-note">Declarações recebidas são dados declarados pelas DOCAS e sujeitos ao confronto com documentos SEI, Balanço e SIOP.</p><div class="pdc-fields"><label>Pesquisar<input id="pdc-search" type="search" placeholder="Companhia, empreendimento, UF ou ID GOV/PAC"></label><label>Filtrar situação<select id="pdc-status"><option value="">Todas</option><option value="recebida">Recebida</option><option value="em_analise">Em análise</option><option value="validada">Validada</option><option value="devolvida">Devolvida</option></select></label></div><div class="pdc-actions"><button id="pdc-export" class="btn secondary" type="button">Exportar registros CSV</button></div><div class="pdc-table"><table class="data-table"><thead><tr><th>Recebimento</th><th>Companhia</th><th>UF</th><th>Empreendimento</th><th>Física</th><th>Financeira</th><th>Situação</th><th>Conferência</th></tr></thead><tbody id="pdc-rows"></tbody></table></div><p id="pdc-list-count" class="pdc-note"></p></section>',
 '<section id="pdc-invites" hidden><h3>Gerador de tokens de acesso externo</h3><p class="pdc-note">Selecione a Companhia e clique em Gerar token e link. O novo token substitui e invalida somente o anterior dessa Companhia. Os formulários recebidos permanecem preservados.</p><div class="pdc-token-generator"><label for="pdc-company-select">Companhia autorizada</label><select id="pdc-company-select"><option value="">Selecione uma das 13 DOCAS</option></select><button id="pdc-generate-company" type="button" class="btn" disabled>Gerar token e link individual</button></div><div class="pdc-table"><table class="data-table"><thead><tr><th>Companhia</th><th>Empreendimentos</th><th>Envios</th><th>Validade</th><th>Acesso</th></tr></thead><tbody id="pdc-companies"></tbody></table></div><div class="pdc-token-box" id="pdc-company-link-box" hidden><strong id="pdc-company-link-title">Token e link gerados</strong><label for="pdc-company-token">Token recém-gerado</label><input type="text" id="pdc-company-token" readonly autocomplete="off"><label for="pdc-company-link">Link externo exclusivo</label><input type="text" id="pdc-company-link" readonly autocomplete="off" aria-label="Endereço externo da Companhia"><div class="pdc-actions"><button id="pdc-company-copy" class="btn" type="button">Copiar link</button><button id="pdc-company-copy-token" class="btn secondary" type="button">Copiar token</button></div><p>Encaminhe apenas ao representante da Companhia. Esse endereço não libera acesso à Central DOCAS.</p></div></section>',
 '<p class="pdc-note">A Central consulta a base automaticamente a cada 30 segundos enquanto a sessão estiver aberta. O token é mantido somente na memória desta página.</p></section>'
 ].join('');
 page.insertBefore(root,page.firstChild);
 const $=id=>root.querySelector('#'+id);
 const msg=s=>{$('pdc-message').textContent=String(s)};
 let token='',rows=[],companies=[],activeTab='receipts',busy=false,version=0;
 const fields=['data_atualizacao','companhia_nome','uf','empreendimento','id_gov_pac','objetivo_descricao','investimento_total','origem_recursos','inicio','conclusao_prevista','situacao','fase','execucao_fisica','execucao_financeira','contratos_principais','resultados_entregas','restricoes_pendencias','providencias_proximos_marcos','responsavel_preenchimento'];
 const fieldLabels=['Data de atualização','Companhia / Executor','UF','Empreendimento','ID GOV/PAC','Objetivo / descrição','Valor total do investimento','Origem dos recursos','Data de início','Conclusão prevista','Situação','Fase','Execução física (%)','Execução financeira (%)','Contratos principais','Resultados / entregas','Restrições / pendências','Providências / próximos marcos','Responsável pelo preenchimento'];
 const norm=s=>String(s||'').trim().toLowerCase();
 const hex=buf=>Array.from(new Uint8Array(buf)).map(x=>x.toString(16).padStart(2,'0')).join('');
 function clean(){
  version++;rows=[];companies=[];
  $('pdc-rows').replaceChildren();$('pdc-companies').replaceChildren();
  $('pdc-new-admin-value').value='';$('pdc-new-admin').hidden=true;
  $('pdc-company-link').value='';$('pdc-company-token').value='';$('pdc-company-link-box').hidden=true;
  window.PUC_DOCAS_DECLARACOES_EXTERNAS=[];
  window.dispatchEvent(new CustomEvent('puc:docas-externas-atualizadas',{detail:{quantidade:0}}))
 }
 function signOut(note){
  token='';clean();$('pdc-admin').hidden=true;$('pdc-token-login').hidden=false;
  $('pdc-setup').hidden=false;$('pdc-setup-form').reset();
  $('pdc-token-input').value='';$('pdc-role').textContent='Token obrigatório';
  msg(note||'Acesso gerencial encerrado.')
 }
 async function request(action,dados={}){
  if(!/^[a-f0-9]{64}$/.test(token))throw Error('Informe um token gerencial válido.');
  const res=await fetch(endpoint,{method:'POST',mode:'cors',cache:'no-store',redirect:'error',
   headers:{'Content-Type':'application/json',apikey:key},
   body:JSON.stringify({action,token,dados})});
  let result;try{result=await res.json()}catch{throw Error('Resposta inválida do serviço.')}
  if(!res.ok||!result.ok)throw Error(result.erro||('HTTP '+res.status));
  return result
 }
 function cell(row,value){const td=row.insertCell();td.textContent=String(value??'—');return td}
 function selectedRows(){
  const q=norm($('pdc-search').value),state=$('pdc-status').value;
  return rows.filter(r=>(!state||r.status===state)&&(!q||[r.companhia_nome,r.uf,r.empreendimento,r.id_gov_pac].some(x=>norm(x).includes(q))))
 }
 function publish(){
  window.PUC_DOCAS_DECLARACOES_EXTERNAS=rows.map(r=>({...r}));
  window.dispatchEvent(new CustomEvent('puc:docas-externas-atualizadas',{detail:{quantidade:rows.length,dadosDeclarados:true}}))
 }
 function renderMetrics(){
  $('pdc-kpis').replaceChildren();
  for(const [label,count] of [
    ['Formulários recebidos',rows.length],
    ['Aguardando análise',rows.filter(r=>['recebida','em_analise'].includes(r.status)).length],
    ['Companhias com respostas',new Set(rows.map(r=>r.companhia_codigo)).size],
    ['Companhias cadastradas',companies.length]
  ]){
   const el=document.createElement('div');el.className='pdc-kpi';
   const s=document.createElement('small');s.textContent=label;
   const strong=document.createElement('b');strong.textContent=count;
   el.append(s,strong);$('pdc-kpis').append(el)
  }
 }
 function renderRecords(){
  const tbody=$('pdc-rows');tbody.replaceChildren();
  const visible=selectedRows();
  for(const r of visible){
   const tr=tbody.insertRow();
   cell(tr,r.enviado_em?new Date(r.enviado_em).toLocaleString('pt-BR'):'—');
   cell(tr,r.companhia_nome);cell(tr,r.uf);cell(tr,r.empreendimento);
   cell(tr,r.execucao_fisica==null?'—':r.execucao_fisica+'%');
   cell(tr,r.execucao_financeira==null?'—':r.execucao_financeira+'%');cell(tr,r.status);
   const d=document.createElement('details');const summary=document.createElement('summary');
   summary.textContent='Examinar';d.append(summary);
   const pre=document.createElement('pre');pre.textContent=fieldLabels.map((s,i)=>s+': '+(r[fields[i]]??'Não informado')).join('\n')+'\nProtocolo: '+r.protocolo;d.append(pre);
   const select=document.createElement('select');
   for(const [code,title] of [['recebida','Recebida'],['em_analise','Em análise'],['validada','Validada'],['devolvida','Devolvida']]){
    const o=document.createElement('option');o.value=code;o.textContent=title;select.append(o)
   }select.value=r.status;d.append(select);
   const note=document.createElement('textarea');note.rows=3;note.maxLength=5000;note.placeholder='Conclusão / justificativa da SNP';note.value=r.analise||'';d.append(note);
   const button=document.createElement('button');button.className='btn';button.type='button';button.textContent='Salvar conferência';
   button.onclick=async()=>{
    button.disabled=true;
    try{
     await request('conferir',{id:r.id,status:select.value,analise:note.value});
     r.status=select.value;r.analise=note.value;tr.cells[6].textContent=r.status;renderMetrics();publish();msg('Conferência registrada no banco.')
    }catch(e){msg('Falha ao salvar conferência: '+e.message)}finally{button.disabled=false}
   };
   d.append(button);tr.insertCell().append(d)
  }
  $('pdc-list-count').textContent=visible.length+' declaração(ões) exibida(s) de '+rows.length+'.';
 }
 function renderInvites(){
  const tbody=$('pdc-companies');tbody.replaceChildren();
  const selected=$('pdc-company-select').value;
  const picker=$('pdc-company-select');picker.replaceChildren();
  const empty=document.createElement('option');empty.value='';empty.textContent='Selecione uma das 13 DOCAS';picker.append(empty);
  for(const c of companies){
   const opt=document.createElement('option');opt.value=c.codigo;opt.textContent=c.nome;picker.append(opt);
   const tr=tbody.insertRow();
   cell(tr,c.nome);cell(tr,c.empreendimentos);
   cell(tr,(c.enviados||0)+' / '+(c.max_envios||300));
   cell(tr,!c.ativo?'Revogado':new Date(c.expira_em).toLocaleDateString('pt-BR'));
   const controls=tr.insertCell();
   if(c.ativo){
    const off=document.createElement('button');
    off.type='button';off.className='btn secondary';off.textContent='Revogar link';
    off.onclick=async()=>{
     if(!confirm('Revogar o link da Companhia '+c.nome+'?'))return;
     off.disabled=true;
     try{
      await request('revogar',{codigo:c.codigo});
      $('pdc-company-token').value='';$('pdc-company-link').value='';
      $('pdc-company-link-box').hidden=true;
      await load(false);msg('Token revogado para '+c.nome+'.')
     }catch(e){msg('Falha na revogação: '+e.message)}
     finally{off.disabled=false}
    };
    controls.append(off)
   }else controls.textContent='Sem acesso ativo';
  }
  picker.value=companies.some(c=>c.codigo===selected)?selected:'';
  $('pdc-generate-company').disabled=!picker.value;
 }
 async function load(announce=true){
  if(busy||!token)return;busy=true;const seq=version;
  try{
   const total=[],size=200;let offset=0,companyList=[];
   for(let n=0;n<50;n++){
    const data=await request('listar',{offset,limit:size});
    if(n===0)companyList=data.companhias||[];
    const reg=data.registros||[];
    total.push(...reg);offset+=reg.length;
    if(reg.length<size||offset>=data.total)break
   }
   if(seq!==version||!token)return;
   rows=total;companies=companyList;
   renderRecords();renderInvites();renderMetrics();publish();
   if(announce)msg(rows.length+' formulário(s) recebidos • '+companies.length+' companhias • sincronizado em '+new Date().toLocaleTimeString('pt-BR'));
  }catch(e){msg('Não foi possível sincronizar: '+e.message)}
  finally{busy=false}
 }
 function tab(name){
  activeTab=name;$('pdc-receipts').hidden=name!=='receipts';
  $('pdc-invites').hidden=name!=='invites';
  $('pdc-tab-receipts').className=name==='receipts'?'btn':'btn secondary';
  $('pdc-tab-invites').className=name==='invites'?'btn':'btn secondary';
 }
 async function enter(raw,wasSetup=false){
  token=norm(raw);
  if(!/^[a-f0-9]{64}$/.test(token)){token='';throw Error('O token deve conter 64 caracteres hexadecimais.')}
  try{await request('verificar')}catch(e){token='';throw e}
  $('pdc-token-login').hidden=true;$('pdc-setup').hidden=true;
  $('pdc-token-input').value='';$('pdc-admin').hidden=false;$('pdc-role').textContent='Gestão autorizada';
  tab(window.PUC_DOCAS_TAB_DESEJADA==='links'?'invites':'receipts');
  window.PUC_DOCAS_TAB_DESEJADA=null;
  if(!wasSetup){$('pdc-new-admin').hidden=true;$('pdc-new-admin-value').value=''}
  await load()
 }
 $('pdc-token-login').addEventListener('submit',async ev=>{
  ev.preventDefault();
  const button=$('pdc-token-button');button.disabled=true;
  try{await enter($('pdc-token-input').value)}
  catch(e){signOut('Acesso não autorizado: '+e.message)}
  finally{button.disabled=false}
 });
 $('pdc-setup-cancel').onclick=()=>{$('pdc-setup-form').reset();$('pdc-setup-email').focus()};
 $('pdc-setup-form').addEventListener('submit',async ev=>{
  ev.preventDefault();
  const button=$('pdc-setup-button');button.disabled=true;
  try{
   const email=$('pdc-setup-email').value.trim();
   const password=$('pdc-setup-password').value;
   const r=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',cache:'no-store',
    headers:{apikey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
   if(!r.ok)throw Error('Conta gerencial não reconhecida.');
   const session=await r.json();
   if(!session?.access_token||!session?.user?.id)throw Error('Autenticação incompleta.');
   const auth={apikey,Authorization:'Bearer '+session.access_token};
   const profile=await fetch(base+'/rest/v1/puc_doca_perfis?select=papel,ativo&usuario_id=eq.'+encodeURIComponent(session.user.id),{headers:auth,cache:'no-store'});
   if(!profile.ok)throw Error('Não foi possível verificar autorização.');
   const profiles=await profile.json();
   if(profiles[0]?.papel!=='gerente'||profiles[0]?.ativo!==true)throw Error('Conta sem autorização de gestor SNP.');
   const random=crypto.getRandomValues(new Uint8Array(32));
   const newToken=hex(random.buffer);
   const hash=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(newToken)));
   const create=await fetch(base+'/rest/v1/rpc/ativar_token_gerente',{
    method:'POST',cache:'no-store',headers:{...auth,'Content-Type':'application/json'},
    body:JSON.stringify({p_hash:hash})});
   if(!create.ok)throw Error('Não foi possível ativar o token no banco.');
   const data=await create.json();
   if(!data.ok)throw Error('Token não autorizado.');
   $('pdc-setup-form').reset();
   await enter(newToken,true);
   $('pdc-new-admin-value').value=newToken;
   $('pdc-new-admin').hidden=false;
   $('pdc-new-admin').scrollIntoView({block:'nearest'});
   msg('Token administrativo emitido e ativado. Copie e guarde agora; o anterior foi invalidado.');
  }catch(e){msg('Não foi possível ativar o token: '+e.message)}
  finally{$('pdc-setup-password').value='';button.disabled=false}
 });
 $('pdc-tab-receipts').onclick=()=>tab('receipts');
 $('pdc-tab-invites').onclick=()=>tab('invites');
 $('pdc-gerar-convites').onclick=()=>{if(!token){msg('Primeiro gere ou valide seu token administrativo da SNP; depois serão liberados os 13 convites.');$('pdc-token-input').focus();return;}tab('invites');$('pdc-company-select').focus();};
 $('pdc-company-select').onchange=()=>{$('pdc-generate-company').disabled=!$('pdc-company-select').value};
 $('pdc-generate-company').onclick=async()=>{const codigo=$('pdc-company-select').value;const c=companies.find(x=>x.codigo===codigo);if(!c)return; if(!confirm('Gerar um novo token para '+c.nome+'? O convite anterior deixará de funcionar.'))return;const btn=$('pdc-generate-company');btn.disabled=true;try{const result=await request('emitir',{codigo});const novo=new URL(result.link).hash;const chave=new URLSearchParams(novo.slice(1)).get('acesso')||'';if(!/^[a-f0-9]{64}$/.test(chave))throw Error('O servidor não retornou um token válido.');$('pdc-company-token').value=chave;$('pdc-company-link').value=result.link;$('pdc-company-link-title').textContent='Token e link emitidos para '+c.nome;$('pdc-company-link-box').hidden=false;await load(false);msg('Token de '+c.nome+' gerado! Copie apenas o token ou link correspondente à Companhia.');$('pdc-company-link-box').scrollIntoView({block:'nearest'});}catch(e){msg('Falha na emissão: '+e.message)}finally{btn.disabled=!$('pdc-company-select').value}};
 $('pdc-refresh').onclick=()=>load();
 $('pdc-exit').onclick=()=>signOut();
 $('pdc-search').oninput=renderRecords;
 $('pdc-status').onchange=renderRecords;
 function copy(id){
  const el=$(id);
  if(!el.value)return;
  navigator.clipboard.writeText(el.value).then(()=>msg('Copiado para a área de transferência.')).catch(()=>{
   el.focus();el.select();msg('Texto selecionado; use Ctrl+C para copiar.')
  })
 }
 $('pdc-copy-admin').onclick=()=>copy('pdc-new-admin-value');
 $('pdc-company-copy').onclick=()=>copy('pdc-company-link');
 $('pdc-company-copy-token').onclick=()=>copy('pdc-company-token');
 $('pdc-hide-admin').onclick=()=>{$('pdc-new-admin-value').value='';$('pdc-new-admin').hidden=true;msg('Token ocultado; lembre-se de guardá-lo em local seguro.')};
 $('pdc-export').onclick=()=>{
  const selected=selectedRows();
  if(!selected.length){msg('Nenhum registro para exportação.');return}
  const keys=['protocolo','enviado_em','status',...fields,'analise'];
  const csvSafe=value=>{
   let s=String(value??'');
   if(/^[\s]*[=+\-@\t\r\n]/.test(s))s="'"+s;
   return '"'+s.replace(/"/g,'""')+'"'
  };
  const csv='\ufeff'+[keys,...selected.map(r=>keys.map(k=>r[k]))].map(row=>row.map(csvSafe).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='PUC_DOCAS_Recebidos_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000)
 };
 window.PUC_DOCAS_ABRIR=where=>{
  document.querySelector('#nav [data-page="docas"]')?.click();
  window.PUC_DOCAS_TAB_DESEJADA=where==='links'?'links':'records';
  if(token)tab(where==='links'?'invites':'receipts');
  root.scrollIntoView({behavior:'smooth',block:'start'});
  if(!token)$('pdc-token-input').focus()
 };
 window.setInterval(()=>{if(token&&!document.hidden)load(false)},30000);
 window.addEventListener('focus',()=>{if(token)load(false)});
 window.addEventListener('online',()=>{if(token)load(false)});
 if(location.hash==='#recebimentos-docas'||location.hash==='#docas-central')setTimeout(()=>window.PUC_DOCAS_ABRIR('records'),100);
 if(!configured){$('pdc-token-button').disabled=true;msg('Integração ao Supabase indisponível.');return}
 msg('Para gerar convites das 13 DOCAS, use “Gerar token administrativo” pela primeira vez ou valide seu token gerencial já emitido.')
})();