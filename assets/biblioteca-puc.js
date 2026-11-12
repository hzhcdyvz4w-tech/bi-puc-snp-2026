/* BI PUC – Biblioteca documental local e recortes por objeto (29/10/2026) */
(()=>{'use strict';
const E=id=>document.getElementById(id),key='puc-doc-meta-v2';let db=null;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ext=s=>(s.split('.').pop()||'').toLowerCase();
const category=n=>/boletim|medi[cç][aã]o|(^|[^\w])bm[\s_-]?\d/i.test(n)?'BM / medição':/aditivo/i.test(n)?'Aditivo':/apostil/i.test(n)?'Apostilamento':/pagamento|nota.?fiscal/i.test(n)?'Pagamento':'Documento';
const stored=[];let selected=null;
function projectIds(doc){return [...new Set([...(Array.isArray(doc.projects)?doc.projects:[]),doc.project].filter(Boolean))]}
function chosenProjects(){const choices=E('puc-lib-multi-choices');if(choices)return [...choices.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value);const one=E('puc-lib-project')?.value;return one?[one]:[]}
function pucCaption(doc){return projectIds(doc).join(', ')||'Sem PUC vinculada'}
let lastIngestReport={count:0,ignored:0,errors:[]};
async function digest(blob){const raw=await blob.arrayBuffer();const h=await crypto.subtle.digest('SHA-256',raw);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const engine=()=>window.PUCDocEngine;
function bmNumber(x){return engine()?.bmNumber(x.name,x.text)||''}
function bmCompetence(x){return engine()?.bmPeriod(x.name,x.text)||''}
function classification(x){return engine()?.bmClass(x.name,x.text)||'SEM INDICAÇÃO DE BM'}
function updateEntry(x){
 if(x.origin==='SEI')x.ref=String(x.ref||'').replace(/\s*\|\s*\d+\s+documento\(s\)\s+selecionado\(s\)/gi,'').trim();
 x.text=String(x.text||'');
 const gate=x.origin==='SEI'?engine()?.seiBMDecision?.(x.name,x.text,x.quality):null;
 if(gate&&!gate.eligible){
  x.bmStatus=gate.status;x.bm=null;x.bmManual=false;
  x.category='Fora da análise SEI';x.candidates=[];x.workName='';x.seiScope='IGNORADO';x.seiSkipReason=gate.reason;
  return x;
 }
 x.seiScope=x.origin==='SEI'?'BM_LEGIVEL':'';x.seiSkipReason='';
 x.workName=engine()?.bmWorkName?.(x.text)||x.workName||'';
 x.candidates=engine()?.indicators(x.text)||[];
 x.bmStatus=x.bmManual?'BM IDENTIFICADO (MANUAL)':classification(x);
 if(x.bmManual||x.bmStatus==='BM IDENTIFICADO'||x.bmStatus==='BM PROVÁVEL'){
  x.category='BM / medição';x.bm={number:bmNumber(x),period:bmCompetence(x),candidates:x.candidates,status:'PENDENTE DE CONFERÊNCIA'};
 }else{x.category=x.bmStatus==='BM MENCIONADO'?'Documento com referência a BM':
  (category(x.name)==='BM / medição'?'Documento':category(x.name));x.bm=null}
 return x;
}

function openDB(){return new Promise((resolve,reject)=>{let r=indexedDB.open('BI_PUC_DOCUMENTOS_LOCAL',2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function transact(mode,fn){return new Promise((resolve,reject)=>{let tx=db.transaction('files',mode),store=tx.objectStore('files'),result;let request;try{request=fn(store)}catch(e){tx.abort();reject(e);return}request.onsuccess=()=>{result=request.result};request.onerror=()=>reject(request.error);tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||request.error);tx.onabort=()=>reject(tx.error||Error('Transação documental cancelada'))})}
async function reload(){stored.splice(0);stored.push(...(await transact('readonly',s=>s.getAll())).sort((a,b)=>b.time-a.time).map(updateEntry));paint()}
function status(msg){let p=E('puc-library-status');if(p)p.textContent=msg}
function normalizeName(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function cleanDocumentText(source,type){
 let raw=String(source||'');
 if(type==='html'||type==='htm'||/<(?:html|head|style|body|p|div|span)\b/i.test(raw)){
   const doc=new DOMParser().parseFromString(raw,'text/html');
   doc.querySelectorAll('style,script,noscript,svg,template,head').forEach(x=>x.remove());
   raw=(doc.body?.innerText||doc.body?.textContent||'').replace(/\u00a0/g,' ');
 }
 return raw.replace(/(?:^|\n)\s*(?:p\.[\w.#:\s>{},-]+|@media[^{]+)\s*\{[^}]*\}/gm,' ').replace(/[ \t]{3,}/g,' ').slice(0,250000)
}
function candidates(source){
 const text=String(source||'');const result=[];
 // Only take values adjacent to an explicit financial or physical indicator.
 const patterns=[
 {type:'Valor medido',regex:/(?:valor\s+(?:total\s+)?medido|total\s+d[ao]\s+medi[cç][aã]o)\s*[:\-–]?\s*(R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}|R\$\s*\d+,\d{2})/gi},
 {type:'Valor pago',regex:/(?:valor\s+(?:total\s+)?pago|total\s+pagamento)\s*[:\-–]?\s*(R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}|R\$\s*\d+,\d{2})/gi},
 {type:'Percentual físico',regex:/(?:execu[cç][aã]o\s+f[ií]sica|avan[cç]o\s+f[ií]sico)\s*[:\-–]?\s*(\d{1,3}(?:,\d{1,2})?\s*%)/gi}
 ];
 for(const item of patterns){let match;while((match=item.regex.exec(text))&&result.length<30){result.push({type:item.type,excerpt:text.slice(Math.max(0,match.index-70),Math.min(text.length,match.index+match[0].length+80)).replace(/\s+/g,' ').slice(0,260),values:[match[1]],line:text.slice(0,match.index).split('\n').length,status:'CANDIDATO – NÃO CONFERIDO'})}}
 return result
}
async function extract(f,origin){return engine().unpack(f,origin==='SEI'?engine()?.seiBMFileAllowed:null)}
async function fileText(item){return engine().read(item)}
async function reanalyse(onlySEIBMs=false){
 let changed=0,problems=[];const button=E(onlySEIBMs?'puc-bm-reanalyse':'puc-reanalyse');if(button)button.disabled=true;
 const queue=(onlySEIBMs?stored.filter(d=>d.origin==='SEI'&&isBM(d)):
 stored.filter(d=>d.origin!=='SEI'||engine()?.seiBMFileAllowed?.(d.name))).filter(d=>{
 if(d.origin!=='SEI')return true;
 try{return !new Set(JSON.parse(localStorage.getItem('BI_PUC_SEI_COMPARACAO_EXCLUIDOS_V1')||'[]')).has(d.id)}catch(e){return true}
});
 try{for(const d of queue){if(!d.blob)continue;
  try{const result=await fileText({name:d.name,blob:d.blob});d.text=result.text;d.quality=result.quality;updateEntry(d);await transact('readwrite',s=>s.put(d));changed++;
   if(changed%5===0)status('Reanalisando documentos: '+changed+'/'+queue.length);
  }catch(err){problems.push(d.name+': '+err.message)}
 }await reload();status('Reanálise concluída: '+changed+' arquivos; '+stored.filter(isBM).length+' BMs identificados. '+(problems.length?'Falhas: '+problems.slice(0,3).join('; '):''))}
 finally{if(button)button.disabled=false}
}
async function ingest(files,origin,project,ref,selectedZipEntries=null){
 const requested=[...new Set((Array.isArray(project)?project:[project]).filter(Boolean))];
 let count=0,linked=0,ignored=0;let errors=[];
 for(const file of files){
  try{
   if(file.size>90*1024*1024)throw Error('arquivo acima de 90 MB');
   const inner=await extract(file,origin);
   for(const item of inner){
    if(origin==='SEI'&&/\.zip$/i.test(file.name)&&selectedZipEntries&&!selectedZipEntries.has(file.name+'\u0001'+item.container+'\u0001'+item.name))continue;
    if(origin==='SEI'&&!engine()?.seiBMFileAllowed?.(item.name)){ignored++;continue}
    const hash=await digest(item.blob);
    const previous=stored.find(x=>x.hash===hash&&x.origin===origin&&x.ref===ref);
    if(previous){
     const joined=[...new Set([...projectIds(previous),...requested])];
     if(joined.length>projectIds(previous).length){
      previous.projects=joined;previous.project=joined[0]||'';
      await transact('readwrite',st=>st.put(previous));linked++;
     }else errors.push(item.name+': arquivo ja cadastrado neste processo e origem');
     continue;
    }
    const parsed=await fileText(item);
    if(origin==='SEI'&&!engine()?.seiBMDecision?.(item.name,parsed.text,parsed.quality)?.eligible){ignored++;continue}
    const entry=updateEntry({id:crypto.randomUUID(),hash,name:item.name,container:item.container,blob:item.blob,origin,project:requested[0]||'',projects:requested,ref,time:Date.now(),category:category(item.name),text:parsed.text,quality:parsed.quality});
    await transact('readwrite',st=>st.put(entry));stored.push(entry);count++;
   }
  }catch(e){errors.push(file.name+': '+e.message)}
 }
 lastIngestReport={count,linked,ignored,errors};await reload();
 status(count+' BM(s) novo(s), '+linked+' vínculo(s) ampliado(s) e '+ignored+' arquivo(s) ignorado(s) por não serem BM legível. '+
  (requested.length?requested.join(', '):'Sem PUC vinculada')+'. '+(errors.length?'Pendências: '+errors.slice(0,6).join('; '):'Nenhum arquivo fora do escopo foi analisado.'));
 return count;
}
async function deleteBatch(mode){
 const chosen=mode==='project'?chosenProjects():[];
 if(mode==='project'&&!chosen.length){status('Marque uma ou mais PUCs para desvincular seus documentos.');return}
 const ref=E('puc-lib-ref')?.value.trim()||'';
 if(mode==='process'&&!ref){status('Informe o processo para excluir documentos.');return}
 const targets=stored.filter(x=>mode==='all'||(mode==='project'&&projectIds(x).some(id=>chosen.includes(id)))||(mode==='process'&&String(x.ref||'').trim()===ref));
 if(!targets.length){status('Nenhum documento corresponde ao criterio informado.');return}
 const msg=mode==='project'?'Desvincular '+targets.length+' documento(s) das PUCs '+chosen.join(', ')+'? Documentos compartilhados com outras PUCs serao preservados; documentos sem outro vinculo serao excluidos.':'Excluir '+targets.length+' documento(s) da biblioteca local? O registro de achados de arquivos apagados tambem deixa de estar disponivel.';
 if(!confirm(msg))return;
 const tx=db.transaction('files','readwrite'),st=tx.objectStore('files');let removed=0,unlinked=0;
 for(const doc of targets){
  if(mode==='project'){
   const rest=projectIds(doc).filter(id=>!chosen.includes(id));
   if(rest.length){doc.projects=rest;doc.project=rest[0];st.put(doc);unlinked++;continue}
  }
  st.delete(doc.id);removed++;
 }
 await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
 if(selected&&targets.some(x=>x.id===selected.id)&&removed)E('puc-library-detail').innerHTML='';
 await reload();status(removed+' arquivo(s) excluido(s) e '+unlinked+' compartilhado(s) mantido(s) com os demais vinculos.');
}
function bmRows(){const el=E('puc-bm-list');if(!el)return;const arr=stored.filter(isBM);el.innerHTML=arr.length?arr.map(x=>'<tr><td>'+escape(displaySEIReference(x.ref))+'</td><td>'+escape(pucCaption(x))+'</td><td>'+escape(x.bm?.number||'Nº não identificado')+'</td><td>'+escape(x.bm?.period||'Competência não identificada')+'</td><td>'+escape(x.name)+'</td><td>'+escape(String(x.candidates.length))+' candidato(s), não conferido(s)</td><td><button type="button" class="btn secondary" data-bm-open="'+escape(x.id)+'">Conferir</button></td></tr>').join(''):'<tr><td colspan="7">Nenhum BM identificado. Confirme se o ZIP foi importado na Biblioteca e use Reanalisar anexos; PDFs digitalizados ou XLS antigos podem precisar de tratamento externo.</td></tr>';el.querySelectorAll('[data-bm-open]').forEach(b=>b.onclick=()=>{view(b.dataset.bmOpen);E('puc-library-detail')?.scrollIntoView({behavior:'smooth'})})}

function isBM(x){
 if(x?.origin==='SEI')return x.seiScope!=='IGNORADO'&&!!engine()?.seiBMDecision?.(x.name,x.text,x.quality)?.eligible;
 return !!x.bmManual||x.bmStatus==='BM IDENTIFICADO'||x.bmStatus==='BM PROVÁVEL'||classification(x)==='BM IDENTIFICADO'||classification(x)==='BM PROVÁVEL'
}
function displaySEIReference(raw){
 const ref=String(raw||'').replace(/\s*\|\s*\d+\s+documento\(s\)\s+selecionado\(s\)/gi,'').trim();
 return ref||'Processo SEI não informado';
}
function bmProjectOptions(){
 const projects=(()=>{try{return JSON.parse(E('embedded-data')?.textContent||'{}').projetos||[]}catch(e){return []}})();
 return projects.map(p=>({id:p.id||p.codigo||'',label:(p.id||p.codigo||'')+' · '+(p.nome||p.empreendimento||p.objeto||p.descricao||'')})).filter(p=>p.id);
}
async function assignBMContext(ids,project,reference){
 const unique=[...new Set(ids)].filter(Boolean);
 if(!unique.length)throw Error('Nenhum BM selecionado para vinculação.');
 if(!project)throw Error('Selecione a PUC que consta no processo.');
 if(!String(reference||'').trim())throw Error('Informe o número do processo SEI antes de vincular os BMs.');
 let updated=0;
 for(const id of unique){
  const doc=stored.find(x=>x.id===id);
  if(!doc||doc.origin!=='SEI'||!isBM(doc))continue;
  doc.projects=[...new Set([...projectIds(doc),project])];doc.project=doc.projects[0];doc.ref=String(reference).trim();
  await transact('readwrite',st=>st.put(doc));updated++;
 }
 await reload();return updated;
}

function bmFiltered(){
 const project=E('cmp-project')?.value||'',process=E('puc-bm-filter-process')?.value.trim().toLowerCase()||'';
 return stored.filter(x=>isBM(x)&&(!project||projectIds(x).includes(project))&&(!process||((x.ref||'')+' '+(x.container||'')).toLowerCase().includes(process)));
}
function refreshBMConfront(){
 const body=E('puc-bm-confront-rows');if(!body)return;const list=bmFiltered();
 body.innerHTML=list.length?list.map(x=>'<tr><td>'+escape(pucCaption(x))+'</td><td>'+escape(displaySEIReference(x.ref))+'</td><td>'+escape(x.bm?.number||bmNumber(x)||'Não identificado')+'</td><td>'+escape(x.bm?.period||bmCompetence(x)||'Não identificada')+'</td><td>'+escape(x.name)+'</td><td>'+escape(x.candidates.map(c=>c.type+': '+c.values.join(', ')).join('; ')||'Sem valor estruturado')+'</td><td><button type="button" class="btn secondary" data-bm-compare="'+escape(x.id)+'">Conferir BM</button></td></tr>').join(''):'<tr><td colspan="7">Não foram encontrados BMs vinculados ao filtro. Verifique os documentos e o vínculo PUC/processo.</td></tr>';
 body.querySelectorAll('[data-bm-compare]').forEach(b=>b.onclick=()=>{const item=stored.find(x=>x.id===b.dataset.bmCompare);if(!item)return;if(window.PUC3ReviewDoc?.(item.id))return;document.querySelector('[data-page="documentos"]')?.click();view(item.id);E('puc-library-detail')?.scrollIntoView({behavior:'smooth'})});
 E('puc-bm-confront-count').textContent=list.length+' BM(s) identificados — candidatos não validados';
}
function setupBMConfront(){
 const cmp=E('comparacao');if(!cmp)return;
 const panel=document.createElement('div');panel.className='panel';panel.id='puc-bm-confront';panel.innerHTML='<h2>Boletins de medição relacionados ao confronto</h2><p class="muted">Exibe <strong>somente documentos reconhecidos como BMs</strong> e vinculados à PUC selecionada. Filtre também pelo processo. Valores extraídos são candidatos, não entram automaticamente nos indicadores nem constituem prova de pagamento ou execução física.</p><div class="filters"><label>Filtrar processo SEI <input id="puc-bm-filter-process" placeholder="Número ou referência" style="width:220px;max-width:100%"></label><button type="button" class="btn secondary" id="puc-bm-show-all">Mostrar BMs de todas as PUCs</button><button type="button" class="btn secondary" id="puc-bm-go-docs">Anexar / gerenciar documentos</button><button type="button" class="btn secondary" id="puc-bm-reanalyse">Reanalisar PDFs dos BMs já anexados</button></div><div class="puc-bm-association" style="padding:12px;border:1px solid #d5e3ec;border-radius:8px;margin:12px 0;display:flex;align-items:end;gap:9px;flex-wrap:wrap"><label>PUC comprovada nos documentos <select id="puc-bm-assoc-project"><option value="">Selecionar empreendimento</option></select></label><label>Processo SEI <input id="puc-bm-assoc-process" placeholder="Ex.: 50020.001577/2025-18"></label><button type="button" class="btn secondary" id="puc-bm-assoc-save">Vincular BMs exibidos à PUC/processo (após conferir)</button><small>Não valida medições ou valores. Utilize somente para boletins do mesmo empreendimento e processo.</small></div><div class="statusline" id="puc-bm-confront-count"></div><div class="scroll"><table class="data-table"><thead><tr><th>PUC</th><th>Processo</th><th>BM nº</th><th>Competência</th><th>Documento</th><th>Valores candidatos</th><th>Ação</th></tr></thead><tbody id="puc-bm-confront-rows"></tbody></table></div>';
 cmp.appendChild(panel);
 const assoc=E('puc-bm-assoc-project');
 bmProjectOptions().forEach(p=>{const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.label;assoc.appendChild(opt)});
 E('puc-bm-assoc-save').onclick=async()=>{
  const project=assoc.value,ref=E('puc-bm-assoc-process').value.trim(),targets=bmFiltered();
  if(!project||!ref){alert('Selecione a PUC e informe o processo SEI para confirmar a vinculação.');return}
  if(!targets.length){alert('Nenhum BM está visível para vincular. Utilize “Mostrar BMs de todas as PUCs” se necessário.');return}
  if(!confirm('Confirmou nos documentos que os '+targets.length+' BMs exibidos pertencem à '+project+' e ao processo '+ref+'? Esta operação NÃO valida valores nem medições.'))return;
  try{const n=await assignBMContext(targets.map(x=>x.id),project,ref);status(n+' BM(s) vinculado(s) ao processo '+ref+'; valores continuam pendentes de conferência.')}
  catch(e){status('Falha na vinculação: '+e.message)}
 };
  E('cmp-project')?.addEventListener('change',refreshBMConfront);
 E('puc-bm-filter-process').addEventListener('input',refreshBMConfront);
 E('puc-bm-show-all').onclick=()=>{E('cmp-project').value='';E('cmp-project').dispatchEvent(new Event('change'));refreshBMConfront()};
 E('puc-bm-go-docs').onclick=()=>document.querySelector('[data-page="documentos"]')?.click();
 E('puc-bm-reanalyse').onclick=()=>reanalyse(true);
 refreshBMConfront();
}

function fileRows(){const p=E('puc-library-list');if(!p)return;
 p.innerHTML=stored.map(x=>'<tr><td><button class="btn secondary" data-view="'+escape(x.id)+'">'+escape(x.name)+'</button><br><small>'+escape(x.container||'individual')+'</small></td><td>'+escape(x.origin)+'</td><td>'+escape(pucCaption(x))+'</td><td>'+escape(x.category)+'</td><td>'+x.candidates.length+' candidato(s)<br><small>'+escape(x.quality||'Leitura anterior — reanalisar')+'</small></td><td><button class="btn secondary" data-remove="'+escape(x.id)+'">Excluir</button></td></tr>').join('')||'<tr><td colspan="6">Nenhum arquivo salvo.</td></tr>';
 p.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));p.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este documento da biblioteca local? Registros do DE/PARA não serão apagados.'))return;await transact('readwrite',s=>s.delete(b.dataset.remove));if(selected?.id===b.dataset.remove){selected=null;E('puc-library-detail').innerHTML=''}await reload();status('Documento excluído da biblioteca local.')})
}
function paint(){fileRows();bmRows();refreshBMConfront();const p=E('puc-library-count');if(p)p.textContent=stored.length+' arquivo(s) · '+stored.filter(isBM).length+' BM(s) · '+stored.filter(x=>String(x.quality||'').includes('NÃO EXTRAÍDO')||String(x.quality||'').includes('OCR')||String(x.quality||'').includes('LEGADO')).length+' sem leitura integral';if(window.PUCRefreshParts)window.PUCRefreshParts();document.dispatchEvent(new CustomEvent('puc-documents-updated',{detail:{documents:stored.length,bms:stored.filter(isBM).length}}))}
function view(id){selected=stored.find(x=>x.id===id);if(!selected)return;
 E('puc-library-detail').innerHTML='<h3>'+escape(selected.name)+'</h3><p>Origem '+escape(selected.origin)+' · Processo '+escape(selected.ref||'não informado')+' · '+selected.candidates.length+' candidatos extraídos. <strong>Não comprovados.</strong></p><div class="scroll"><table class="data-table"><thead><tr><th>Tipo</th><th>Trecho localizado</th><th>Valores candidatos</th></tr></thead><tbody>'+selected.candidates.map(c=>'<tr><td>'+escape(c.type)+'</td><td>'+escape(c.excerpt)+'</td><td>'+escape(c.values.join(' | '))+'</td></tr>').join('')+'</tbody></table></div><pre style="max-height:260px;overflow:auto;white-space:pre-wrap;font-size:12px">'+escape(selected.text.slice(0,14000))+'</pre><div class="two-actions"><button type="button" class="btn" id="puc-use-evidence">Vincular ao formulário de confronto</button><button type="button" class="btn secondary" id="puc-bm-mark">'+(isBM(selected)?'Desmarcar como BM':'Marcar como BM apos conferir')+'</button></div>';
 E('puc-bm-mark').onclick=async()=>{if(!selected)return;selected.bmManual=!selected.bmManual;updateEntry(selected);await transact('readwrite',st=>st.put(selected));await reload();view(selected.id);status('Classificação registrada: '+(selected.bmManual?'BM':'documento comum'))};
 E('puc-use-evidence').onclick=()=>{if(!E('obs-evidence'))return;const project=selected.project||E('cmp-project').value;if(!project){status('Selecione antes o empreendimento na aba Confronto.');return}E('obs-project').value=project;E('obs-source').value=selected.origin==='SEI'?'SEI':selected.origin==='BALANCO'?'BALANCO':selected.origin==='DOCAS'?'DOCAS':'PORTAL';E('obs-evidence').value=[selected.ref,selected.container,selected.name].filter(Boolean).join(' · ');E('obs-verified').checked=false;E('obs-note').value='Evidência identificada na biblioteca local; valores candidatos NÃO CONFERIDOS. Conferir documento, período, medição, contrato e valor antes de registrar.';document.querySelector('[data-page="comparacao"]').click();E('observation-form').scrollIntoView({behavior:'smooth'});};
}
function setup(){
 let section=E('documentos');if(!section)return;let pane=document.createElement('div');pane.className='panel';pane.id='puc-library';pane.innerHTML='<h2>Biblioteca documental compartilhada e persistente (local)</h2><p class="muted">Anexe vários documentos de uma vez. Ficam armazenados no navegador (IndexedDB) para consulta em Documentos e Confronto; não são publicados nem compartilhados entre computadores.</p><div class="formgrid"><label>Origem<select id="puc-lib-origin"><option>SEI</option><option>DOCAS</option><option>BALANCO</option><option>PORTAL</option></select></label><label>Investimento<select id="puc-lib-project"><option value="">Selecionar ao confrontar</option></select></label><label>Processo / referência<input id="puc-lib-ref"></label><label>Arquivos (múltiplos ou ZIP)<input id="puc-lib-files" multiple type="file" accept=".pdf,.xlsx,.zip"></label></div><div class="two-actions" style="margin:12px 0"><button class="btn" type="button" id="puc-lib-save">Importar e guardar nesta máquina</button><button class="btn secondary" type="button" id="puc-lib-export">Exportar índice JSON</button><strong id="puc-library-count"></strong></div><p role="status" id="puc-library-status"></p><div class="scroll"><table class="data-table"><thead><tr><th>Arquivo</th><th>Origem</th><th>Projeto</th><th>Tipo</th><th>Achados sugeridos</th><th>Ação</th></tr></thead><tbody id="puc-library-list"></tbody></table></div><div id="puc-library-detail"></div>';
 section.appendChild(pane);
 const reBtn=document.createElement('button');reBtn.type='button';reBtn.id='puc-reanalyse';reBtn.className='btn secondary';reBtn.textContent='Reanalisar documentos já anexados';reBtn.onclick=()=>reanalyse(false);
 E('puc-library-count')?.parentElement?.appendChild(reBtn);

 // A lista de anexos fica recolhível, sem remover nem apagar arquivos.
 const toggle=document.createElement('button');toggle.type='button';toggle.className='btn secondary';toggle.id='puc-toggle-docs';toggle.setAttribute('aria-expanded','false');toggle.textContent='Mostrar documentos anexados';pane.insertBefore(toggle,E('puc-library-count')?.parentElement?.nextSibling||null);
 const table=E('puc-library-list')?.closest('.scroll');if(table){table.id='puc-docs-table';table.hidden=true;toggle.onclick=()=>{table.hidden=!table.hidden;toggle.setAttribute('aria-expanded',String(!table.hidden));toggle.textContent=table.hidden?'Mostrar documentos anexados':'Ocultar documentos anexados'}};
 const controls=document.createElement('div');controls.className='two-actions';controls.style.margin='10px 0';controls.innerHTML='<button type="button" class="btn secondary" id="puc-delete-project">Excluir documentos da PUC selecionada</button><button type="button" class="btn secondary" id="puc-delete-process">Excluir documentos do processo informado</button><button type="button" class="btn secondary" id="puc-delete-all">Limpar biblioteca inteira</button><button type="button" class="btn secondary" id="puc-clear-form">Limpar seleção de anexos</button>';pane.appendChild(controls);
 E('puc-delete-project').onclick=()=>deleteBatch('project');
 E('puc-delete-process').onclick=()=>deleteBatch('process');
 E('puc-delete-all').onclick=()=>deleteBatch('all');
 const link=document.createElement('button');link.type='button';link.className='btn secondary';link.textContent='Vincular anexos sem PUC ao investimento escolhido';controls.appendChild(link);
 link.onclick=async()=>{const projects=chosenProjects(),ref=E('puc-lib-ref').value.trim();
 if(!projects.length){status('Marque uma ou mais PUCs na Biblioteca.');return}
 const docs=stored.filter(x=>!projectIds(x).length&&(!ref||x.ref===ref)&&(x.origin!=='SEI'||isBM(x)));if(!docs.length){status('Não há anexos sem PUC nesse processo.');return}
 if(!confirm('Vincular '+docs.length+' documento(s) sem PUC a '+projects.join(', ')+'? Confira a documentação de cada investimento.'))return;
 const tx=db.transaction('files','readwrite');docs.forEach(d=>{d.projects=[...projects];d.project=projects[0];tx.objectStore('files').put(d)});
 await new Promise((ok,fail)=>{tx.oncomplete=ok;tx.onerror=()=>fail(tx.error);tx.onabort=()=>fail(tx.error)});
 await reload();status(docs.length+' documentos associados a '+projects.join(', ')+'.');
 };
 E('puc-clear-form').onclick=()=>{E('puc-lib-files').value='';E('puc-lib-ref').value='';E('puc-lib-project').value='';E('puc-lib-multi-choices')?.querySelectorAll('input[type="checkbox"]').forEach(x=>{x.checked=false});E('puc-lib-multi-choices')?.dispatchEvent(new Event('change'));status('Seleção limpa; documentos arquivados foram preservados.')};

 const bms=document.createElement('div');bms.className='panel';bms.id='puc-bm-dashboard';bms.innerHTML='<h2>Boletins de medição por processo anexado</h2><p class="muted">Identificação documental preliminar por processo, PUC e número do BM. Valores e competências extraídos do texto são candidatos e exigem conferência antes de integrar o DE/PARA. Um processo pode ter vários BMs.</p><div class="scroll"><table class="data-table"><thead><tr><th>Processo SEI</th><th>PUC</th><th>BM nº</th><th>Competência</th><th>Arquivo</th><th>Valores candidatos</th><th>Ação</th></tr></thead><tbody id="puc-bm-list"></tbody></table></div>';section.appendChild(bms);setupBMConfront();
 const bmTable=E('puc-bm-list')?.closest('.scroll');if(bmTable){const t=document.createElement('button');t.type='button';t.className='btn secondary';t.textContent='Mostrar lista de BMs';t.setAttribute('aria-expanded','false');bmTable.hidden=true;bms.insertBefore(t,bmTable);t.onclick=()=>{bmTable.hidden=!bmTable.hidden;t.textContent=bmTable.hidden?'Mostrar lista de BMs':'Ocultar lista de BMs';t.setAttribute('aria-expanded',String(!bmTable.hidden))}}
 const old=E('sei-confront-pane');if(old){const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.textContent='Anexar documentos / consultar BMs';btn.onclick=()=>{document.querySelector('[data-page="documentos"]').click();pane.scrollIntoView({behavior:'smooth'})};old.replaceWith(btn)}
 const legacy=E('upload-file');if(legacy){legacy.closest('.upload')?.insertAdjacentHTML('beforebegin','<p class="notice subtle">Para arquivos SEI, ZIP, BMs e anexos das Docas, use somente a Biblioteca Documental abaixo. O importador desta seção permanece dedicado à consulta SIOP.</p>');}
 if(E('upload-origin'))E('upload-origin').addEventListener('change',()=>{const isSiop=E('upload-origin').value==='SIOP';const box=E('upload-file')?.closest('.upload');if(box)box.style.display=isSiop?'':'none'});
 /* O botão de acesso a Documentos foi inserido no lugar da janela antiga; sem duplicação. */
 E('puc-lib-origin').addEventListener('change',()=>{const input=E('puc-lib-files');if(input)input.accept=E('puc-lib-origin').value==='SEI'?'.pdf,.xlsx,.zip':'.pdf,.zip,.txt,.csv,.json,.xml,.xls,.xlsx,.doc,.docx,.png,.jpg,.jpeg'});
 E('puc-lib-save').onclick=async()=>{const b=E('puc-lib-save');b.disabled=true;try{await ingest([...E('puc-lib-files').files],E('puc-lib-origin').value,chosenProjects(),E('puc-lib-ref').value)}finally{b.disabled=false}};
 E('puc-lib-export').onclick=()=>{let data=stored.map(({id,name,container,origin,project,projects,ref,time,category,candidates})=>({id,name,container,origin,project,projects,ref,time,category,candidates}));let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='indice_documental_puc_local.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 // Reutilizar os anexos de Documentos e da janela SEI para manter uma única biblioteca.
 /* Importador SIOP original preservado. Os demais documentos usam apenas a biblioteca. */
 /* Painel SEI duplicado substituído por atalho. */
 // Ao selecionar ZIP/PDF por engano nos importadores CSV, redirecionar para a biblioteca, sem tentar interpretar como CSV.
 for(const id of ['load-standard-csv','load-schedule-csv']){
 const input=E(id);if(!input)continue;
 input.setAttribute('accept','.csv,.zip,.pdf,.xls,.xlsx,.doc,.docx');
 input.addEventListener('change',async()=>{const files=[...input.files];if(!files.length)return;
 if(files.every(f=>/\.csv$/i.test(f.name)))return;
 const origin=id==='load-schedule-csv'?'BALANCO':'SEI';const project=chosenProjects().length?chosenProjects():E('cmp-project')?.value||'';const ref=E('puc-lib-ref')?.value||'';
 const saved=await ingest(files,origin,project,ref);input.value='';
 const msg=saved+' documento(s) processado(s) a partir de '+files.length+' anexo(s). '+stored.filter(isBM).length+' BM(s) identificados. '+(!project?'ATENÇÃO: escolha a PUC na Biblioteca Documental para vincular os documentos.':'Dados disponíveis na biblioteca.');
 const feedback=E(id==='load-schedule-csv'?'schedule-feedback':'standard-feedback');if(feedback)feedback.textContent=msg;
 status(msg);});
 }
 const select=E('puc-lib-project'),source=E('cmp-project');
 const projectData=()=>{try{const raw=E('embedded-data')?.textContent;return JSON.parse(raw||'{}').projetos||[]}catch(e){return []}};
 const syncProjects=()=>{
  const ps=projectData();if(!ps.length){status('Não foi possível ler a carteira PUC embutida; recarregue a página.');return}
  const targets=[source,select,E('obs-project'),E('upload-project')].filter(Boolean);
  for(const target of targets){const current=target.value;const old=Array.from(target.options).some(o=>o.value&&ps.some(p=>p.id===o.value));if(!old){target.innerHTML='<option value="">Selecionar investimento PUC</option>';for(const p of ps){const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.id+' · '+p.empresa+' · '+p.empreendimento;target.add(opt)}}if(current&&ps.some(p=>p.id===current))target.value=current}
  if(source&&select&&source.value&&!select.value)select.value=source.value;
  const summary=E('puc-project-count');if(summary)summary.textContent=ps.length+' PUCs cadastradas';
 };
 const count=document.createElement('small');count.id='puc-project-count';count.className='muted';select?.parentElement?.appendChild(count);
 syncProjects();
 // Escolha múltipla acessível, sem exigir Ctrl/Shift; o select antigo fica oculto
 // apenas como adaptador para rotinas herdadas, sem perder o cadastro das 12 PUCs.
 if(select&&!E('puc-lib-multi-choices')){
  const original=select.closest('label');
  const field=document.createElement('div');field.className='puc-lib-multi-field';
  const lbl=document.createElement('div');lbl.className='puc-lib-multi-label';lbl.textContent='Investimentos PUC (seleção múltipla)';
  const details=document.createElement('details');details.className='puc-lib-multi-dropdown';
  const summary=document.createElement('summary');summary.id='puc-lib-multi-summary';summary.textContent='Marcar uma ou mais PUCs';
  const actions=document.createElement('div');actions.className='puc-lib-multi-actions';
  const all=document.createElement('button');all.type='button';all.textContent='Marcar todas';all.className='btn secondary';
  const clear=document.createElement('button');clear.type='button';clear.textContent='Limpar';clear.className='btn secondary';
  const list=document.createElement('div');list.id='puc-lib-multi-choices';list.className='puc-lib-multi-choices';list.setAttribute('role','group');list.setAttribute('aria-label','Selecionar PUCs');
  for(const p of projectData()){
   const row=document.createElement('label');row.className='puc-lib-check-row';
   const cb=document.createElement('input');cb.type='checkbox';cb.value=p.id;cb.setAttribute('aria-label',p.id);
   const title=document.createElement('span');title.textContent=p.id+' · '+p.empresa+' · '+p.empreendimento;
   row.append(cb,title);list.append(row);
  }
  const update=()=>{
   const ids=chosenProjects();summary.textContent=!ids.length?'Marcar uma ou mais PUCs':ids.length===1?ids[0]+' selecionada':ids.length+' PUCs selecionadas · '+ids.join(', ');
   select.value=ids[0]||'';
   const n=E('puc-lib-multi-count');if(n)n.textContent=ids.length+' de '+projectData().length+' PUCs marcadas';document.dispatchEvent(new CustomEvent('puc-library-projects-selected',{detail:{projects:ids}}));
  };
  list.addEventListener('change',update);
  all.onclick=()=>{list.querySelectorAll('input').forEach(x=>x.checked=true);update()};
  clear.onclick=()=>{list.querySelectorAll('input').forEach(x=>x.checked=false);update()};
  const counter=document.createElement('small');counter.id='puc-lib-multi-count';counter.className='muted';
  actions.append(all,clear);
  details.append(summary,actions,list);
  field.append(lbl,details,counter);
  select.style.display='none';select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  if(original){original.replaceWith(field);field.append(select)}else select.parentElement.append(field);
  const style=document.createElement('style');
  style.textContent='.puc-lib-multi-field{min-width:0}.puc-lib-multi-label{font-size:12px;font-weight:600;margin-bottom:6px}.puc-lib-multi-dropdown{border:1px solid #bed0df;border-radius:9px;background:#fff;position:relative;min-width:0}.puc-lib-multi-dropdown>summary{cursor:pointer;padding:11px 12px;min-height:40px;font-size:13px;font-weight:600;overflow-wrap:anywhere}.puc-lib-multi-dropdown[open]{border-color:#27658c}.puc-lib-multi-actions{display:flex;gap:8px;padding:8px 10px;flex-wrap:wrap}.puc-lib-multi-choices{max-height:300px;overflow-y:auto;padding:0 8px 8px}.puc-lib-check-row{display:flex!important;align-items:flex-start;gap:10px;border-top:1px solid #e6edf2;padding:9px 6px;font-size:12px;cursor:pointer;line-height:1.4}.puc-lib-check-row input{flex:0 0 auto!important;width:18px!important;height:18px!important;margin:0!important}.puc-lib-check-row span{flex:1;overflow-wrap:anywhere}#puc-lib-multi-count{display:block;padding-top:5px}@media(max-width:650px){.puc-lib-multi-choices{max-height:230px}}';
  document.head.append(style);update();
 }
 source?.addEventListener('change',()=>{syncProjects();if(select)select.value=source.value;refreshBMConfront()});
 select?.addEventListener('focus',syncProjects);
 E('puc-lib-save')?.addEventListener('click',syncProjects,{capture:true});
 window.addEventListener('pageshow',syncProjects);
 const fromCompare=document.createElement('button');fromCompare.type='button';fromCompare.className='btn secondary';fromCompare.textContent='Abrir biblioteca de documentos salvos';fromCompare.onclick=()=>{document.querySelector('[data-page="documentos"]').click();pane.scrollIntoView({behavior:'smooth'})};E('sei-confront-pane')?.querySelector('.two-actions')?.appendChild(fromCompare);
}
async function saveFinding(docId,finding){const item=stored.find(d=>d.id===docId);if(!item)throw Error('Documento não encontrado');
 const find={...finding,source:item.origin,docId:item.id,document:item.name,container:item.container,reference:item.ref,verified:Boolean(finding.verified),reviewedAt:new Date().toISOString()};
 item.findings=Array.isArray(item.findings)?item.findings:[];
 if(find.id){const pos=item.findings.findIndex(x=>x.id===find.id);if(pos>=0)item.findings[pos]=find;else item.findings.push(find)}
 else {find.id=crypto.randomUUID();item.findings.push(find)}
 await transact('readwrite',st=>st.put(item));await reload();return find}
async function deleteFinding(docId,findingId){const item=stored.find(d=>d.id===docId);if(!item)return;item.findings=(item.findings||[]).filter(x=>x.id!==findingId);await transact('readwrite',st=>st.put(item));await reload()}
window.PUCDocLibrary={getSelectedProjects:chosenProjects,getBlob:async id=>{if(!db)return null;const item=await transact('readonly',st=>st.get(id));return item?.blob||null},list:()=>stored.map(x=>({id:x.id,name:x.name,container:x.container,origin:x.origin,project:x.project,projects:projectIds(x),ref:x.ref,category:x.category,bmStatus:x.bmStatus,bmNumber:x.bm?.number||'',bmPeriod:x.bm?.period||'',quality:x.quality,candidates:x.candidates||[],findings:x.findings||[],text:x.text||'',workName:x.workName||'',hash:x.hash})),ingest:async(files,origin,project,ref,selectedZipEntries=null)=>{if(!db)throw Error('Banco documental não inicializado');return ingest(files,origin,project,ref,selectedZipEntries)},saveFinding,deleteFinding,assignBMContext,getLastIngestReport:()=>({...lastIngestReport,errors:[...lastIngestReport.errors]}),refresh:reload};

async function init(){try{db=await openDB();setup();await reload();window.PUCDocLibrary.storageReady=true}catch(err){const msg='Não foi possível inicializar a biblioteca local: '+err.message;window.PUCDocLibrary.storageError=msg;status(msg);if(!E('puc-library-status')){const notice=document.createElement('p');notice.id='puc-library-error';notice.className='notice';notice.textContent=msg;E('documentos')?.insertBefore(notice,E('documentos').firstChild)}console.error(msg,err)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();