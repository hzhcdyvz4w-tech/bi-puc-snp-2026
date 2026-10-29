/* SEI na aba Confronto – leitura local, sem upload remoto. */
(function(){
'use strict';
const $s=id=>document.getElementById(id);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let docs=[], chosen=-1;
const maxFile=45*1024*1024,maxExpanded=65*1024*1024;
function say(t){$s('sei-confront-status').textContent=t}
function filetype(n){return (n.split('.').pop()||'').toLowerCase()}
function infer(n){return /boletim|medi[cç][aã]o|(^|[/_\s])bm\d/i.test(n)?'Medição/BM':/nota.fiscal|nf[-_ ]|pagamento|ordem.banc/i.test(n)?'Pagamento':/aditivo/i.test(n)?'Termo aditivo':/apostil/i.test(n)?'Apostilamento':/contrato/i.test(n)?'Contrato':/cronograma/i.test(n)?'Cronograma':'Documento'}
async function toText(name,bytes){
 const type=filetype(name);
 if(['txt','csv','json','xml','html','htm','md'].includes(type)){return new TextDecoder('utf-8').decode(bytes).slice(0,350000)}
 if(type==='pdf'){
   if(!window.pdfjsLib)return '[PDF identificado. Leitor PDF não disponível nesta sessão; consulte o documento original.]';
   try{const loading=pdfjsLib.getDocument({data:new Uint8Array(bytes),disableFontFace:true});const pdf=await loading.promise;const pages=Math.min(pdf.numPages,60);let result=[];
     for(let i=1;i<=pages;i++){let p=await pdf.getPage(i);let cont=await p.getTextContent();result.push('PÁGINA '+i+'\n'+cont.items.map(x=>x.str||'').join(' '))}
     if(pdf.numPages>pages)result.push('[Restante do PDF não analisado: limite de 60 páginas]');return result.join('\n\n').slice(0,350000)
   }catch(e){return '[PDF não extraído: '+e.message+']'}
 }
 return '[Formato identificado. Extração textual não disponível para esta extensão.]';
}
async function add(name,bytes,container){if(bytes.byteLength>maxExpanded)throw Error('Documento descompactado excede 65 MB');
 const txt=await toText(name,bytes);
 docs.push({name,container,category:infer(name),size:bytes.byteLength,text:txt,project:$s('cmp-project').value,reference:$s('sei-confront-ref').value.trim()});
}
async function processFile(file){
 if(file.size>maxFile)throw Error(file.name+': arquivo acima de 45 MB');
 const t=filetype(file.name),bytes=await file.arrayBuffer();
 if(t!=='zip'){await add(file.name,bytes,'arquivo individual');return}
 if(typeof JSZip==='undefined')throw Error('Leitor ZIP não disponível.');
 const z=await JSZip.loadAsync(bytes);const entries=Object.values(z.files).filter(x=>!x.dir&&!/^__MACOSX\/|(^|\/)\./.test(x.name));
 if(entries.length>250)throw Error('ZIP com mais de 250 entradas; divida o processo em lotes.');
 let size=0;for(let e of entries){
   if(e.name.includes('..')||e.name.startsWith('/'))continue;
   const subtype=filetype(e.name);
   if(!['pdf','txt','csv','json','xml','html','htm','md','doc','docx','xls','xlsx','png','jpg','jpeg'].includes(subtype))continue;
   let b=await e.async('arraybuffer');size+=b.byteLength;if(size>maxExpanded)throw Error('ZIP ultrapassou limite total de 65 MB de documentos');
   await add(e.name,b,file.name);
 }
}
function render(){
 const list=$s('sei-confront-files');
 list.innerHTML=docs.length?docs.map((d,i)=>'<button type="button" class="sei-document'+(i===chosen?' active':'')+'" data-doc="'+i+'"><b>'+esc(d.name)+'</b><small>'+esc(d.category)+' · '+(d.size/1024).toFixed(1)+' KB · '+esc(d.container)+'</small></button>').join(''):'<p class="muted">Nenhum documento processado.</p>';
 list.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>selectDoc(+b.dataset.doc))
}
function selectDoc(i){
 chosen=i;render();const d=docs[i];if(!d)return;
 $s('sei-confront-preview').textContent=d.text||'[Sem conteúdo textual extraído]';
 $s('sei-confront-picked').textContent=d.name+' · '+d.category+' · '+d.container;
 $s('sei-confront-search').value='';
 $s('sei-confront-use').disabled=false;
}
function attach(){
 const d=docs[chosen];if(!d)return;
 const project=d.project||$s('cmp-project').value;if(!project){say('Selecione um investimento na aba Confronto antes de vincular.');return}
 $s('obs-project').value=project;$s('obs-source').value='SEI';
 $s('obs-evidence').value=[d.reference,d.container,d.name].filter(Boolean).join(' | ');
 $s('obs-note').value='Documento SEI: '+d.category+'. Trecho consultado localmente, sujeito à conferência do documento original. '+(d.text.startsWith('[')?'Extração textual não disponível. ':'')+'Registrar valor, indicador, competência e data de corte somente após conferência.';
 $s('obs-verified').checked=false;
 $s('observation-form').scrollIntoView({behavior:'smooth',block:'start'});
 say('Evidência transferida ao formulário. Confira o documento, informe valor e período; marque verificação somente após validação documental.');
}
function init(){
 const target=$s('comparacao');if(!target||$s('sei-confront-pane'))return;
 const pane=document.createElement('div');pane.className='panel';pane.id='sei-confront-pane';
 pane.innerHTML='<h2>Importar processo SEI e anexos ao confronto</h2><p class="muted">Associe o investimento acima e selecione PDFs, TXT, CSV, JSON, imagens, DOCX ou um ZIP exportado do SEI. A leitura de texto é local, sem envio dos arquivos a servidores. O sistema <strong>não presume valores</strong> de medições nem realiza validação jurídica automática.</p>'+
 '<div class="formgrid"><label>Processo SEI / referência<input id="sei-confront-ref" placeholder="Ex.: 50020.000000/2026-00"></label><label>Arquivos e processo ZIP<input id="sei-confront-input" type="file" multiple accept=".zip,.pdf,.txt,.csv,.json,.xml,.html,.md,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"></label></div>'+
 '<div class="two-actions" style="margin-top:12px"><button type="button" class="btn" id="sei-confront-read">Analisar arquivos nesta sessão</button><button type="button" class="btn secondary" id="sei-confront-clear">Limpar anexos locais</button><button type="button" class="btn secondary" id="sei-confront-inventory">Exportar inventário JSON</button></div>'+
 '<p class="statusline" id="sei-confront-status" role="status">Nenhum arquivo selecionado. Os anexos não são armazenados no GitHub.</p>'+
 '<div class="grid2"><div><h3>Documentos encontrados</h3><div id="sei-confront-files" class="sei-documents"></div></div><div><h3 id="sei-confront-picked">Prévia textual</h3><label>Localizar termo no documento<input id="sei-confront-search" placeholder="Ex.: valor medido, aditivo, pagamento" style="width:100%;padding:9px;border:1px solid #cad9e2;border-radius:7px"></label><pre id="sei-confront-preview" class="sei-preview">Selecione um documento na lista.</pre><button type="button" class="btn" id="sei-confront-use" disabled>Vincular evidência ao DE/PARA</button></div></div>'+
 '<p class="risk-warning">Controle: PDF digitalizado pode não conter texto pesquisável; DOCX, planilhas e imagens são apenas inventariados nesta janela. O conteúdo original deve ser conferido e os campos numéricos registrados manualmente antes do confronto. Limites por segurança: 45 MB por arquivo e 65 MB de conteúdo ZIP extraído.</p>';
 target.insertBefore(pane,target.children[1]||null);
 const css=document.createElement('style');css.textContent='.sei-documents{max-height:360px;overflow:auto;border:1px solid #dde8ef;border-radius:9px}.sei-document{display:block;text-align:left;width:100%;border:0;border-bottom:1px solid #e1eaf0;background:#fff;color:#254a65;padding:12px;cursor:pointer}.sei-document.active{background:#e4f2f8}.sei-document b,.sei-document small{display:block;overflow-wrap:anywhere}.sei-document small{margin-top:5px;font-weight:400}.sei-preview{white-space:pre-wrap;overflow:auto;max-height:340px;min-height:110px;background:#f7fafc;border:1px solid #dce5ed;padding:11px;border-radius:8px;font-size:12px;line-height:1.5}';document.head.appendChild(css);
 $s('sei-confront-read').onclick=async()=>{const f=[...$s('sei-confront-input').files];if(!f.length){say('Escolha pelo menos um arquivo.');return}if(!$s('cmp-project').value){say('Primeiro selecione o investimento na parte superior do Confronto.');return}
   $s('sei-confront-read').disabled=true;let count=docs.length,errors=[];for(let file of f){try{say('Analisando '+file.name+' ...');await processFile(file)}catch(e){errors.push(file.name+': '+e.message)}}
   render();say((docs.length-count)+' documentos inventariados. '+(errors.length?'Pendências: '+errors.join('; '):'Selecione uma evidência para conferir e vincular.'));$s('sei-confront-read').disabled=false;
 };
 $s('sei-confront-use').onclick=attach;
 $s('sei-confront-clear').onclick=()=>{docs=[];chosen=-1;render();$s('sei-confront-preview').textContent='Selecione um documento na lista.';$s('sei-confront-use').disabled=true;$s('sei-confront-input').value='';say('Anexos removidos da memória desta página.')};
 $s('sei-confront-search').oninput=e=>{const d=docs[chosen];if(!d)return;const q=e.target.value.trim().toLowerCase();if(!q){$s('sei-confront-preview').textContent=d.text;return}let p=d.text.toLowerCase().indexOf(q);$s('sei-confront-preview').textContent=p<0?'Termo não encontrado no texto extraído.':d.text.slice(Math.max(0,p-350),Math.min(d.text.length,p+1200))};
 $s('sei-confront-inventory').onclick=()=>{const safe=docs.map(({name,container,category,size,project,reference})=>({name,container,category,size,project,reference,observacao:'Não comprova conteúdo não extraído'}));const b=new Blob([JSON.stringify({gerado_em:new Date().toISOString(),arquivos:safe},null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='inventario_sei_confronto.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();