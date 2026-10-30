/* BI PUC – Biblioteca documental local e recortes por objeto (29/10/2026) */
(()=>{'use strict';
const E=id=>document.getElementById(id),key='puc-doc-meta-v2';let db=null;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ext=s=>(s.split('.').pop()||'').toLowerCase();
const category=n=>/boletim|medi[cç][aã]o|(^|[^\w])bm[\s_-]?\d/i.test(n)?'BM / medição':/aditivo/i.test(n)?'Aditivo':/apostil/i.test(n)?'Apostilamento':/pagamento|nota.?fiscal/i.test(n)?'Pagamento':'Documento';
const stored=[];let selected=null;let lastIngestReport={count:0,errors:[]};
async function digest(blob){const raw=await blob.arrayBuffer();const h=await crypto.subtle.digest('SHA-256',raw);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const engine=()=>window.PUCDocEngine;
function bmNumber(x){return engine()?.bmNumber(x.name,x.text)||''}
function bmCompetence(x){return engine()?.bmPeriod(x.name,x.text)||''}
function classification(x){return engine()?.bmClass(x.name,x.text)||'SEM INDICAÇÃO DE BM'}
function updateEntry(x){x.text=String(x.text||'');x.candidates=engine()?.indicators(x.text)||[];
 x.bmStatus=x.bmManual?'BM IDENTIFICADO (MANUAL)':classification(x);
 if(x.bmManual||x.bmStatus==='BM IDENTIFICADO'||x.bmStatus==='BM PROVÁVEL'){
  x.category='BM / medição';x.bm={number:bmNumber(x),period:bmCompetence(x),candidates:x.candidates,status:'PENDENTE DE CONFERÊNCIA'}
 }else{x.category=x.bmStatus==='BM MENCIONADO'?'Documento com referência a BM':(category(x.name)==='BM / medição'?'Documento':category(x.name));x.bm=null}
 return x
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
async function extract(f){return engine().unpack(f)}
async function fileText(item){return engine().read(item)}
async function reanalyse(){
 let changed=0,problems=[];const button=E('puc-reanalyse');if(button)button.disabled=true;
 try{for(const d of stored){if(!d.blob)continue;
  try{const result=await fileText({name:d.name,blob:d.blob});d.text=result.text;d.quality=result.quality;updateEntry(d);await transact('readwrite',s=>s.put(d));changed++;
   if(changed%10===0)status('Reanalisando documentos: '+changed+'/'+stored.length);
  }catch(err){problems.push(d.name+': '+err.message)}
 }await reload();status('Reanálise concluída: '+changed+' arquivos; '+stored.filter(isBM).length+' BMs identificados. '+(problems.length?'Falhas: '+problems.slice(0,3).join('; '):''))}
 finally{if(button)button.disabled=false}
}
async function ingest(files,origin,project,ref){let count=0;let errors=[];
 for(const file of files){try{if(file.size>90*1024*1024)throw Error('arquivo acima de 90 MB');let sub=await extract(file);
 for(let item of sub){const hash=await digest(item.blob);const duplicate=stored.find(x=>x.hash===hash&&x.origin===origin&&x.project===project&&x.ref===ref);if(duplicate){errors.push(item.name+': duplicado no mesmo processo e PUC');continue}const parsed=await fileText(item);const entry=updateEntry({id:crypto.randomUUID(),hash,name:item.name,container:item.container,blob:item.blob,origin,project,ref,time:Date.now(),category:category(item.name),text:parsed.text,quality:parsed.quality});
 await transact('readwrite',s=>s.put(entry));stored.push(entry);count++}
 }catch(e){errors.push(file.name+': '+e.message)}}
 lastIngestReport={count,errors};await reload();status(count+' documento(s) arquivado(s) neste navegador. '+(errors.length?'Pendências: '+errors.slice(0,12).join('; '):'Os outros módulos podem consultar a biblioteca.'));return count
}
async function deleteBatch(mode){
 let targets=mode==='all'?[...stored]:stored.filter(x=>mode==='project'?x.project===E('puc-lib-project').value:x.ref.trim()===E('puc-lib-ref').value.trim());
 if(mode==='project'&&!E('puc-lib-project').value){status('Selecione uma PUC para excluir somente seus documentos.');return}
 if(mode==='process'&&!E('puc-lib-ref').value.trim()){status('Informe o processo para excluir somente seus documentos.');return}
 if(!targets.length){status('Nenhum documento corresponde ao critério de exclusão.');return}
 if(!confirm('Excluir definitivamente '+targets.length+' documento(s) deste navegador? Esta ação não exclui arquivos originais nem registros já lançados no DE/PARA.'))return;
 const tx=db.transaction('files','readwrite');const obj=tx.objectStore('files');targets.forEach(x=>obj.delete(x.id));
 await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
 if(selected&&targets.some(x=>x.id===selected.id)){selected=null;E('puc-library-detail').innerHTML=''}
 await reload();status(targets.length+' documento(s) excluído(s) da biblioteca local. Registros já lançados no DE/PARA não foram apagados.')
}
function bmRows(){const el=E('puc-bm-list');if(!el)return;const arr=stored.filter(isBM);el.innerHTML=arr.length?arr.map(x=>'<tr><td>'+escape(x.ref||'Processo não identificado')+'</td><td>'+escape(x.project||'Sem PUC vinculada')+'</td><td>'+escape(x.bm?.number||'Nº não identificado')+'</td><td>'+escape(x.bm?.period||'Competência não identificada')+'</td><td>'+escape(x.name)+'</td><td>'+escape(String(x.candidates.length))+' candidato(s), não conferido(s)</td><td><button type="button" class="btn secondary" data-bm-open="'+escape(x.id)+'">Conferir</button></td></tr>').join(''):'<tr><td colspan="7">Nenhum BM identificado. Confirme se o ZIP foi importado na Biblioteca e use Reanalisar anexos; PDFs digitalizados ou XLS antigos podem precisar de tratamento externo.</td></tr>';el.querySelectorAll('[data-bm-open]').forEach(b=>b.onclick=()=>{view(b.dataset.bmOpen);E('puc-library-detail')?.scrollIntoView({behavior:'smooth'})})}

function isBM(x){return !!x.bmManual||x.bmStatus==='BM IDENTIFICADO'||x.bmStatus==='BM PROVÁVEL'||classification(x)==='BM IDENTIFICADO'||classification(x)==='BM PROVÁVEL'}
function bmFiltered(){
 const project=E('cmp-project')?.value||'',process=E('puc-bm-filter-process')?.value.trim().toLowerCase()||'';
 return stored.filter(x=>isBM(x)&&(!project||!x.project||x.project===project)&&(!process||((x.ref||'')+' '+(x.container||'')).toLowerCase().includes(process)));
}
function refreshBMConfront(){
 const body=E('puc-bm-confront-rows');if(!body)return;const list=bmFiltered();
 body.innerHTML=list.length?list.map(x=>'<tr><td>'+escape(x.project||'PUC não vinculada')+'</td><td>'+escape(x.ref||'Processo não informado')+'</td><td>'+escape(x.bm?.number||bmNumber(x)||'Não identificado')+'</td><td>'+escape(x.bm?.period||bmCompetence(x)||'Não identificada')+'</td><td>'+escape(x.name)+'</td><td>'+escape(x.candidates.map(c=>c.type+': '+c.values.join(', ')).join('; ')||'Sem valor estruturado')+'</td><td><button type="button" class="btn secondary" data-bm-compare="'+escape(x.id)+'">Conferir BM</button></td></tr>').join(''):'<tr><td colspan="7">Não foram encontrados BMs vinculados ao filtro. Verifique os documentos e o vínculo PUC/processo.</td></tr>';
 body.querySelectorAll('[data-bm-compare]').forEach(b=>b.onclick=()=>{const item=stored.find(x=>x.id===b.dataset.bmCompare);if(!item)return;document.querySelector('[data-page="documentos"]')?.click();view(item.id);E('puc-library-detail')?.scrollIntoView({behavior:'smooth'})});
 E('puc-bm-confront-count').textContent=list.length+' BM(s) identificados — candidatos não validados';
}
function setupBMConfront(){
 const cmp=E('comparacao');if(!cmp)return;
 const panel=document.createElement('div');panel.className='panel';panel.id='puc-bm-confront';panel.innerHTML='<h2>Boletins de medição relacionados ao confronto</h2><p class="muted">Exibe <strong>somente documentos reconhecidos como BMs</strong> e vinculados à PUC selecionada. Filtre também pelo processo. Valores extraídos são candidatos, não entram automaticamente nos indicadores nem constituem prova de pagamento ou execução física.</p><div class="filters"><label>Filtrar processo SEI <input id="puc-bm-filter-process" placeholder="Número ou referência" style="width:220px;max-width:100%"></label><button type="button" class="btn secondary" id="puc-bm-show-all">Mostrar BMs de todas as PUCs</button><button type="button" class="btn secondary" id="puc-bm-go-docs">Anexar / gerenciar documentos</button></div><div class="statusline" id="puc-bm-confront-count"></div><div class="scroll"><table class="data-table"><thead><tr><th>PUC</th><th>Processo</th><th>BM nº</th><th>Competência</th><th>Documento</th><th>Valores candidatos</th><th>Ação</th></tr></thead><tbody id="puc-bm-confront-rows"></tbody></table></div>';
 cmp.appendChild(panel);
 E('cmp-project')?.addEventListener('change',refreshBMConfront);
 E('puc-bm-filter-process').addEventListener('input',refreshBMConfront);
 E('puc-bm-show-all').onclick=()=>{E('cmp-project').value='';E('cmp-project').dispatchEvent(new Event('change'));refreshBMConfront()};
 E('puc-bm-go-docs').onclick=()=>document.querySelector('[data-page="documentos"]')?.click();
 refreshBMConfront();
}

function fileRows(){const p=E('puc-library-list');if(!p)return;
 p.innerHTML=stored.map(x=>'<tr><td><button class="btn secondary" data-view="'+escape(x.id)+'">'+escape(x.name)+'</button><br><small>'+escape(x.container||'individual')+'</small></td><td>'+escape(x.origin)+'</td><td>'+escape(x.project||'não vinculado')+'</td><td>'+escape(x.category)+'</td><td>'+x.candidates.length+' candidato(s)<br><small>'+escape(x.quality||'Leitura anterior — reanalisar')+'</small></td><td><button class="btn secondary" data-remove="'+escape(x.id)+'">Excluir</button></td></tr>').join('')||'<tr><td colspan="6">Nenhum arquivo salvo.</td></tr>';
 p.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));p.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este documento da biblioteca local? Registros do DE/PARA não serão apagados.'))return;await transact('readwrite',s=>s.delete(b.dataset.remove));if(selected?.id===b.dataset.remove){selected=null;E('puc-library-detail').innerHTML=''}await reload();status('Documento excluído da biblioteca local.')})
}
function paint(){fileRows();bmRows();refreshBMConfront();const p=E('puc-library-count');if(p)p.textContent=stored.length+' arquivo(s) · '+stored.filter(isBM).length+' BM(s) · '+stored.filter(x=>String(x.quality||'').includes('NÃO EXTRAÍDO')||String(x.quality||'').includes('OCR')||String(x.quality||'').includes('LEGADO')).length+' sem leitura integral';if(window.PUCRefreshParts)window.PUCRefreshParts();document.dispatchEvent(new CustomEvent('puc-documents-updated',{detail:{documents:stored.length,bms:stored.filter(isBM).length}}))}
function view(id){selected=stored.find(x=>x.id===id);if(!selected)return;
 E('puc-library-detail').innerHTML='<h3>'+escape(selected.name)+'</h3><p>Origem '+escape(selected.origin)+' · Processo '+escape(selected.ref||'não informado')+' · '+selected.candidates.length+' candidatos extraídos. <strong>Não comprovados.</strong></p><div class="scroll"><table class="data-table"><thead><tr><th>Tipo</th><th>Trecho localizado</th><th>Valores candidatos</th></tr></thead><tbody>'+selected.candidates.map(c=>'<tr><td>'+escape(c.type)+'</td><td>'+escape(c.excerpt)+'</td><td>'+escape(c.values.join(' | '))+'</td></tr>').join('')+'</tbody></table></div><pre style="max-height:260px;overflow:auto;white-space:pre-wrap;font-size:12px">'+escape(selected.text.slice(0,14000))+'</pre><div class="two-actions"><button type="button" class="btn" id="puc-use-evidence">Vincular ao formulário de confronto</button><button type="button" class="btn secondary" id="puc-bm-mark">'+(isBM(selected)?'Desmarcar como BM':'Marcar como BM apos conferir')+'</button></div>';
 E('puc-bm-mark').onclick=async()=>{if(!selected)return;selected.bmManual=!selected.bmManual;updateEntry(selected);await transact('readwrite',st=>st.put(selected));await reload();view(selected.id);status('Classificação registrada: '+(selected.bmManual?'BM':'documento comum'))};
 E('puc-use-evidence').onclick=()=>{if(!E('obs-evidence'))return;const project=selected.project||E('cmp-project').value;if(!project){status('Selecione antes o empreendimento na aba Confronto.');return}E('obs-project').value=project;E('obs-source').value=selected.origin==='SEI'?'SEI':selected.origin==='BALANCO'?'BALANCO':selected.origin==='DOCAS'?'DOCAS':'PORTAL';E('obs-evidence').value=[selected.ref,selected.container,selected.name].filter(Boolean).join(' · ');E('obs-verified').checked=false;E('obs-note').value='Evidência identificada na biblioteca local; valores candidatos NÃO CONFERIDOS. Conferir documento, período, medição, contrato e valor antes de registrar.';document.querySelector('[data-page="comparacao"]').click();E('observation-form').scrollIntoView({behavior:'smooth'});};
}
function setup(){
 let section=E('documentos');if(!section)return;let pane=document.createElement('div');pane.className='panel';pane.id='puc-library';pane.innerHTML='<h2>Biblioteca documental compartilhada e persistente (local)</h2><p class="muted">Anexe vários documentos de uma vez. Ficam armazenados no navegador (IndexedDB) para consulta em Documentos e Confronto; não são publicados nem compartilhados entre computadores.</p><div class="formgrid"><label>Origem<select id="puc-lib-origin"><option>SEI</option><option>DOCAS</option><option>BALANCO</option><option>PORTAL</option></select></label><label>Investimento<select id="puc-lib-project"><option value="">Selecionar ao confrontar</option></select></label><label>Processo / referência<input id="puc-lib-ref"></label><label>Arquivos (múltiplos ou ZIP)<input id="puc-lib-files" multiple type="file" accept=".pdf,.zip,.txt,.csv,.json,.xml,.xls,.xlsx,.doc,.docx,.png,.jpg,.jpeg"></label></div><div class="two-actions" style="margin:12px 0"><button class="btn" type="button" id="puc-lib-save">Importar e guardar nesta máquina</button><button class="btn secondary" type="button" id="puc-lib-export">Exportar índice JSON</button><strong id="puc-library-count"></strong></div><p role="status" id="puc-library-status"></p><div class="scroll"><table class="data-table"><thead><tr><th>Arquivo</th><th>Origem</th><th>Projeto</th><th>Tipo</th><th>Achados sugeridos</th><th>Ação</th></tr></thead><tbody id="puc-library-list"></tbody></table></div><div id="puc-library-detail"></div>';
 section.appendChild(pane);
 const reBtn=document.createElement('button');reBtn.type='button';reBtn.id='puc-reanalyse';reBtn.className='btn secondary';reBtn.textContent='Reanalisar documentos já anexados';reBtn.onclick=reanalyse;
 E('puc-library-count')?.parentElement?.appendChild(reBtn);

 // A lista de anexos fica recolhível, sem remover nem apagar arquivos.
 const toggle=document.createElement('button');toggle.type='button';toggle.className='btn secondary';toggle.id='puc-toggle-docs';toggle.setAttribute('aria-expanded','false');toggle.textContent='Mostrar documentos anexados';pane.insertBefore(toggle,E('puc-library-count')?.parentElement?.nextSibling||null);
 const table=E('puc-library-list')?.closest('.scroll');if(table){table.id='puc-docs-table';table.hidden=true;toggle.onclick=()=>{table.hidden=!table.hidden;toggle.setAttribute('aria-expanded',String(!table.hidden));toggle.textContent=table.hidden?'Mostrar documentos anexados':'Ocultar documentos anexados'}};
 const controls=document.createElement('div');controls.className='two-actions';controls.style.margin='10px 0';controls.innerHTML='<button type="button" class="btn secondary" id="puc-delete-project">Excluir documentos da PUC selecionada</button><button type="button" class="btn secondary" id="puc-delete-process">Excluir documentos do processo informado</button><button type="button" class="btn secondary" id="puc-delete-all">Limpar biblioteca inteira</button><button type="button" class="btn secondary" id="puc-clear-form">Limpar seleção de anexos</button>';pane.appendChild(controls);
 E('puc-delete-project').onclick=()=>deleteBatch('project');
 E('puc-delete-process').onclick=()=>deleteBatch('process');
 E('puc-delete-all').onclick=()=>deleteBatch('all');
 const link=document.createElement('button');link.type='button';link.className='btn secondary';link.textContent='Vincular anexos sem PUC ao investimento escolhido';controls.appendChild(link);
 link.onclick=async()=>{const project=E('puc-lib-project').value,ref=E('puc-lib-ref').value.trim();
 if(!project){status('Escolha primeiro uma PUC na Biblioteca.');return}
 const docs=stored.filter(x=>!x.project&&(!ref||x.ref===ref));if(!docs.length){status('Não há anexos sem PUC nesse processo.');return}
 if(!confirm('Vincular '+docs.length+' documento(s) sem PUC ao investimento '+project+'? Confira se o processo corresponde a este investimento.'))return;
 const tx=db.transaction('files','readwrite');docs.forEach(d=>{d.project=project;tx.objectStore('files').put(d)});
 await new Promise((ok,fail)=>{tx.oncomplete=ok;tx.onerror=()=>fail(tx.error);tx.onabort=()=>fail(tx.error)});
 await reload();status(docs.length+' documentos associados a '+project+'.');
 };
 E('puc-clear-form').onclick=()=>{E('puc-lib-files').value='';E('puc-lib-ref').value='';E('puc-lib-project').value='';status('Seleção limpa; documentos arquivados foram preservados.')};

 const bms=document.createElement('div');bms.className='panel';bms.id='puc-bm-dashboard';bms.innerHTML='<h2>Boletins de medição por processo anexado</h2><p class="muted">Identificação documental preliminar por processo, PUC e número do BM. Valores e competências extraídos do texto são candidatos e exigem conferência antes de integrar o DE/PARA. Um processo pode ter vários BMs.</p><div class="scroll"><table class="data-table"><thead><tr><th>Processo SEI</th><th>PUC</th><th>BM nº</th><th>Competência</th><th>Arquivo</th><th>Valores candidatos</th><th>Ação</th></tr></thead><tbody id="puc-bm-list"></tbody></table></div>';section.appendChild(bms);setupBMConfront();
 const bmTable=E('puc-bm-list')?.closest('.scroll');if(bmTable){const t=document.createElement('button');t.type='button';t.className='btn secondary';t.textContent='Mostrar lista de BMs';t.setAttribute('aria-expanded','false');bmTable.hidden=true;bms.insertBefore(t,bmTable);t.onclick=()=>{bmTable.hidden=!bmTable.hidden;t.textContent=bmTable.hidden?'Mostrar lista de BMs':'Ocultar lista de BMs';t.setAttribute('aria-expanded',String(!bmTable.hidden))}}
 const old=E('sei-confront-pane');if(old){const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.textContent='Anexar documentos / consultar BMs';btn.onclick=()=>{document.querySelector('[data-page="documentos"]').click();pane.scrollIntoView({behavior:'smooth'})};old.replaceWith(btn)}
 const legacy=E('upload-file');if(legacy){legacy.closest('.upload')?.insertAdjacentHTML('beforebegin','<p class="notice subtle">Para arquivos SEI, ZIP, BMs e anexos das Docas, use somente a Biblioteca Documental abaixo. O importador desta seção permanece dedicado à consulta SIOP.</p>');}
 if(E('upload-origin'))E('upload-origin').addEventListener('change',()=>{const isSiop=E('upload-origin').value==='SIOP';const box=E('upload-file')?.closest('.upload');if(box)box.style.display=isSiop?'':'none'});
 /* O botão de acesso a Documentos foi inserido no lugar da janela antiga; sem duplicação. */
 E('puc-lib-save').onclick=async()=>{const b=E('puc-lib-save');b.disabled=true;try{await ingest([...E('puc-lib-files').files],E('puc-lib-origin').value,E('puc-lib-project').value,E('puc-lib-ref').value)}finally{b.disabled=false}};
 E('puc-lib-export').onclick=()=>{let data=stored.map(({id,name,container,origin,project,ref,time,category,candidates})=>({id,name,container,origin,project,ref,time,category,candidates}));let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='indice_documental_puc_local.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 // Reutilizar os anexos de Documentos e da janela SEI para manter uma única biblioteca.
 /* Importador SIOP original preservado. Os demais documentos usam apenas a biblioteca. */
 /* Painel SEI duplicado substituído por atalho. */
 // Ao selecionar ZIP/PDF por engano nos importadores CSV, redirecionar para a biblioteca, sem tentar interpretar como CSV.
 for(const id of ['load-standard-csv','load-schedule-csv']){
 const input=E(id);if(!input)continue;
 input.setAttribute('accept','.csv,.zip,.pdf,.xls,.xlsx,.doc,.docx');
 input.addEventListener('change',async()=>{const files=[...input.files];if(!files.length)return;
 if(files.every(f=>/\.csv$/i.test(f.name)))return;
 const origin=id==='load-schedule-csv'?'BALANCO':'SEI';const project=E('cmp-project')?.value||E('puc-lib-project')?.value||'';const ref=E('puc-lib-ref')?.value||'';
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
 syncProjects();source?.addEventListener('change',()=>{syncProjects();if(select)select.value=source.value;refreshBMConfront()});
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
window.PUCDocLibrary={list:()=>stored.map(x=>({id:x.id,name:x.name,container:x.container,origin:x.origin,project:x.project,ref:x.ref,category:x.category,bmStatus:x.bmStatus,bmNumber:x.bm?.number||'',bmPeriod:x.bm?.period||'',quality:x.quality,candidates:x.candidates||[],findings:x.findings||[],text:x.text||'',hash:x.hash})),ingest:async(files,origin,project,ref)=>{if(!db)throw Error('Banco documental não inicializado');return ingest(files,origin,project,ref)},saveFinding,deleteFinding,getLastIngestReport:()=>({...lastIngestReport,errors:[...lastIngestReport.errors]}),refresh:reload};

async function init(){try{db=await openDB();setup();await reload()}catch(err){status('Não foi possível abrir o armazenamento local: '+err.message)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();