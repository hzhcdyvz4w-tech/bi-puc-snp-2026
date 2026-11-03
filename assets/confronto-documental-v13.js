/* BI PUC V13 — confronto documental de três fontes.
   Nenhuma comparação usa a base SIOP de demonstração.
   Só compara indicadores equivalentes, mesma competência, objeto e data de corte, aprovados pelo operador. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const projects=(()=>{try{return JSON.parse($('embedded-data')?.textContent||'{}').projetos||[]}catch(e){return []}})();
const sources=['SEI','BALANCO','DOCAS'],names={SEI:'SEI · documentos do processo',BALANCO:'Balanço · arquivo oficial',DOCAS:'Informações das DOCAS'};
const indicators=[
 ['dotacao_atual','Dotação atual (União)','R$'],['empenho_uniao','Empenhado (União)','R$'],['liquidacao_uniao','Liquidado (União)','R$'],['pagamento_uniao','Pago pela União','R$'],
 ['aporte_puc_recebido','PUC recebida pela companhia','R$'],['puc_aplicada','PUC aplicada pela companhia','R$'],
 ['medicao_bm','BM · Valor medido','R$'],['pagamento_bm','BM · Valor pago','R$'],['valor_contrato','Valor do contrato','R$'],
 ['execucao_fisica','Execução física do empreendimento','%'],['execucao_financeira_percentual','Execução financeira do empreendimento (%)','%'],['execucao_financeira_balanco','Execução financeira do empreendimento (R$)','R$'],
 ['valor_empreendimento','Valor global do empreendimento','R$'],['financeiro_previsto','Desembolso previsto','R$']
];
const label=Object.fromEntries(indicators.map(x=>[x[0],x[1]])),units=Object.fromEntries(indicators.map(x=>[x[0],x[2]]));
const metricSelect=()=>'<option value="">Selecione a natureza comprovada</option>'+indicators.map(x=>'<option value="'+x[0]+'">'+esc(x[1])+'</option>').join('');
const pOptions='<option value="">Sem PUC específica — carteira/documento geral</option>'+projects.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.id+' · '+p.empresa)+'</option>').join('');
let selected=new Set(),selectedFile=null,lastRows=[],lastPairs=[];
const lib=()=>window.PUCDocLibrary;
const docs=()=>lib()?.list()||[];
function status(message){for(const id of ['puc3-status','puc3-compare-status']){const el=$(id);if(el)el.textContent=message}}
function val(v){return Number.isFinite(Number(v))&&v!==''?Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—'}
function csv(rows,filename){const head=['puc','fonte','documento','referencia','indicador','valor','unidade','competencia','data_corte','objeto','contrato','numero_bm','apuracao','conferido','observacao'];const safe=v=>{const x=String(v??'');return /^[\s]*[=+@\-\t\r]/.test(x)?"'"+x:x};const txt=[head.join(';'),...rows.map(r=>head.map(k=>'"'+safe(r[k]).replace(/"/g,'""')+'"').join(';'))].join('\r\n');download(new Blob(['\ufeff'+txt],{type:'text/csv;charset=utf-8'}),filename)}
function download(blob,name){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function renderChecks(){
 let query=($('puc3-search')?.value||'').trim().toLowerCase();
 $('puc3-projects').innerHTML=projects.filter(p=>(p.id+' '+p.empresa+' '+p.empreendimento).toLowerCase().includes(query)).map(p=>'<label class="puc3-choose"><input type="checkbox" value="'+esc(p.id)+'" '+(selected.has(p.id)?'checked':'')+'><span><strong>'+esc(p.id)+'</strong> · '+esc(p.empresa)+'<small>'+esc(p.empreendimento)+'</small></span></label>').join('');
 $('puc3-projects').querySelectorAll('input').forEach(x=>x.onchange=()=>{x.checked?selected.add(x.value):selected.delete(x.value);renderChecks();render();});
 const c=$('puc3-selected');if(c)c.textContent=selected.size+' PUC(s) selecionada(s) — '+projects.length+' cadastradas';
}
const SEI_EXCLUSIONS_KEY='BI_PUC_SEI_COMPARACAO_EXCLUIDOS_V1';
let seiExcluded=new Set();
try{seiExcluded=new Set(JSON.parse(localStorage.getItem(SEI_EXCLUSIONS_KEY)||'[]'))}catch(e){seiExcluded=new Set()}
function saveSeiSelection(){try{localStorage.setItem(SEI_EXCLUSIONS_KEY,JSON.stringify([...seiExcluded]))}catch(e){}}
function seiIncluded(d){return d.origin!=='SEI'||!seiExcluded.has(d.id)}
function filesForReview(){
 return docs().filter(d=>sources.includes(d.origin)&&seiIncluded(d)&&(!selected.size||!d.project||selected.has(d.project)||(d.findings||[]).some(f=>selected.has(f.project))));
}

const PUC_BALANCO_UFS=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
async function PUCFiltrarBalancoPorUF(file,uf,empreendimentoIds=null){
 if(!window.JSZip)throw Error('Leitor de planilhas ZIP/XLSX indisponível.');
 const zip=await JSZip.loadAsync(await file.arrayBuffer()),parser=new DOMParser();
 const xml=async path=>{
  let part=zip.file(path);if(!part)throw Error('XLSX sem arquivo '+path);
  let doc=parser.parseFromString(await part.async('string'),'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw Error('XML inválido em '+path);
  return doc;
 };
 let wb=await xml('xl/workbook.xml'),sheets=[...wb.getElementsByTagNameNS('*','sheet')];
 const months={janeiro:1,fevereiro:2,'março':3,marco:3,abril:4,maio:5,junho:6,jun:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12};
 const rank=n=>{n=n.toLowerCase();let year=Number((n.match(/20\d\d/)||[])[0]||0),month=0;for(const [key,v] of Object.entries(months))if(n.includes(key))month=v;return year*12+month};
 sheets.sort((a,b)=>rank(b.getAttribute('name')||'')-rank(a.getAttribute('name')||''));
 const latest=sheets[0];if(!latest)throw Error('A planilha não possui abas.');
 const sheetName=latest.getAttribute('name')||'Aba1';
 const rid=latest.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||latest.getAttribute('r:id');
 const rels=await xml('xl/_rels/workbook.xml.rels');
 const rel=[...rels.getElementsByTagNameNS('*','Relationship')].find(r=>r.getAttribute('Id')===rid);
 if(!rel)throw Error('Relacionamento da aba não encontrado.');
 let target=rel.getAttribute('Target')||'';
 target=target.startsWith('/')?target.replace(/^\/+/,''):'xl/'+target.replace(/^\.?\//,'');
 const sheet=await xml(target);
 let ss=[];
 if(zip.file('xl/sharedStrings.xml')){
  let s=await xml('xl/sharedStrings.xml');
  ss=[...s.getElementsByTagNameNS('*','si')].map(x=>[...x.getElementsByTagNameNS('*','t')].map(t=>t.textContent||'').join(''));
 }
 const data=[...sheet.getElementsByTagNameNS('*','row')].map(row=>{
  let out={};
  for(const cell of row.getElementsByTagNameNS('*','c')){
   const col=(cell.getAttribute('r')||'').replace(/\d+/g,'');
   let v=cell.getElementsByTagNameNS('*','v')[0]?.textContent||'';
   if(cell.getAttribute('t')==='s')v=ss[Number(v)]||'';
   if(cell.getAttribute('t')==='inlineStr')v=[...cell.getElementsByTagNameNS('*','t')].map(t=>t.textContent||'').join('');
   out[col]=v;
  }
  return out;
 });
 const header=data.find(row=>String(row.AG||'').trim().toUpperCase()==='UF'&&/empreendimento/i.test(String(row.B||'')));
 if(!header)throw Error('Cabeçalho UF/empreendimento não encontrado na aba '+sheetName);
 const rows=data.filter(row=>row!==header&&row.B&&row.AG&&(!uf||String(row.AG||'').toUpperCase().split(/[,;\/]/).map(x=>x.trim()).includes(uf)));
 const wanted=empreendimentoIds===null?null:new Set(empreendimentoIds);
 const selected=rows.filter(row=>wanted===null||wanted.has(String(row.A||'')+'|'+String(row.B||'')));
 const colIndex=x=>[...x].reduce((v,c)=>v*26+c.charCodeAt(0)-64,0);
 const cols=Object.keys(header).sort((a,b)=>colIndex(a)-colIndex(b));
 const csvCell=x=>{let s=String(x??'');if(/^\s*[=+@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const csv=[cols.map(k=>csvCell(header[k])).join(';'),...selected.map(row=>cols.map(k=>csvCell(row[k])).join(';'))].join('\r\n');
 const name='BALANCO_'+uf+'_'+sheetName.replace(/[^a-z0-9-]/gi,'_').slice(0,35)+'.csv';
 return {file:new File(['\ufeff'+csv],name,{type:'text/csv'}),count:selected.length,sheet:sheetName,registros:rows.map(row=>({id:String(row.A||''),empreendimento:String(row.B||''),uf:String(row.AG||''),municipio:String(row.AH||''),executor:String(row.AI||''),valor_global:String(row.D||''),inicio:String(row.P||''),termino:String(row.Q||''),fisico:String(row.R||''),data_referencia:String(row.K||'')}))};
}

const multiStyle=document.createElement('style');multiStyle.textContent='.puc3-balanco-multi{border:1px solid #d2dfeb;border-radius:8px;padding:9px;margin:10px 0}.puc3-balanco-multi>strong{display:block;font-size:12px;margin-bottom:8px}.puc3-balanco-actions{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.puc3-balanco-actions button{font-size:11px;padding:6px 9px}.puc3-balanco-multi input[type=search]{width:100%;margin:4px 0 8px}.puc3-balanco-options{max-height:220px;overflow:auto;border:1px solid #dce5ed;border-radius:6px;padding:5px}.puc3-balanco-choice{display:flex!important;align-items:flex-start;gap:8px;padding:7px 5px;border-bottom:1px solid #eef3f7;font-size:12px;cursor:pointer}.puc3-balanco-choice input{flex:0 0 auto;width:auto;margin-top:3px}.puc3-balanco-choice span{overflow-wrap:anywhere}.puc3-balanco-multi small{display:block;margin-top:8px}';document.head.appendChild(multiStyle);
const seiSelectorStyle=document.createElement('style');
seiSelectorStyle.textContent='.puc3-sei-selector,.puc3-sei-zip{margin:10px 0;padding:10px;border:1px solid #d6e2ea;border-radius:8px;background:#f8fbfd}.puc3-sei-selector>strong,.puc3-sei-zip>strong{font-size:12px}.puc3-sei-selector input[type=search],.puc3-sei-zip input[type=search]{width:100%;margin:6px 0}.puc3-sei-actions{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.puc3-sei-actions button{padding:6px 9px;font-size:11px}.puc3-sei-choices{max-height:200px;overflow:auto;border:1px solid #dce6ee;border-radius:6px;background:white;padding:5px}.puc3-sei-choice{display:flex!important;align-items:flex-start;gap:8px;padding:6px 4px;font-size:12px;border-bottom:1px solid #edf2f6;cursor:pointer}.puc3-sei-choice input[type=checkbox]{flex:0 0 auto;width:auto;margin-top:3px}.puc3-sei-choice span{overflow-wrap:anywhere}.puc3-sei-selector small,.puc3-sei-zip small{display:block;margin-top:7px}';document.head.appendChild(seiSelectorStyle);
const selectionLayoutStyle=document.createElement('style');
selectionLayoutStyle.textContent=
 '#puc3-central-files .puc3-sei-selector,#puc3-central-files .puc3-sei-zip,#puc3-central-files .puc3-balanco-multi{width:100%;max-width:100%;min-width:0;overflow:hidden;box-sizing:border-box}'+
 '#puc3-central-files .puc3-sei-choices,#puc3-central-files .puc3-balanco-options{min-width:0;width:100%;max-width:100%;overflow-x:hidden;overflow-y:auto}'+
 '#puc3-central-files label.puc3-sei-choice,#puc3-central-files label.puc3-balanco-choice{display:grid!important;grid-template-columns:18px minmax(0,1fr)!important;align-items:start!important;column-gap:9px!important;width:100%!important;min-width:0!important;margin:0!important;padding:9px 7px!important;border-bottom:1px solid #e7edf2;font-size:12px!important;line-height:1.45!important;cursor:pointer;box-sizing:border-box}'+
 '#puc3-central-files label.puc3-sei-choice:last-child,#puc3-central-files label.puc3-balanco-choice:last-child{border-bottom:0}'+
 '#puc3-central-files label.puc3-sei-choice input[type=checkbox],#puc3-central-files label.puc3-balanco-choice input[type=checkbox]{appearance:auto!important;display:block!important;width:16px!important;height:16px!important;min-width:16px!important;max-width:16px!important;padding:0!important;margin:2px 0 0 0!important;box-sizing:border-box;flex:none}'+
 '#puc3-central-files label.puc3-sei-choice span,#puc3-central-files label.puc3-balanco-choice span{display:block!important;min-width:0;max-width:100%;overflow-wrap:anywhere;word-break:normal;white-space:normal;text-align:left}'+
 '#puc3-central-files .puc3-sei-actions,#puc3-central-files .puc3-balanco-actions{display:flex!important;gap:7px!important;flex-wrap:wrap!important;align-items:center}'+
 '#puc3-central-files .puc3-sei-actions .btn,#puc3-central-files .puc3-balanco-actions .btn{width:auto!important;min-width:0!important;max-width:100%;flex:0 1 auto;padding:7px 10px!important;line-height:1.25}'+
 '#puc3-central-files input[type=search]{width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box}'+
 '@media(max-width:600px){#puc3-central-files label.puc3-sei-choice,#puc3-central-files label.puc3-balanco-choice{padding:10px 6px!important}#puc3-central-files .puc3-sei-actions .btn,#puc3-central-files .puc3-balanco-actions .btn{font-size:11px}}';
document.head.appendChild(selectionLayoutStyle);
const persistenceStyle=document.createElement('style');
persistenceStyle.textContent='.puc3-attachment-status{font-size:12px;line-height:1.45;margin:7px 0 10px;padding:9px 10px;border:1px solid #c7dfd3;border-radius:7px;background:#f3faf5;color:#275545;overflow-wrap:anywhere}';
document.head.appendChild(persistenceStyle);
function sourceCards(){
 $('puc3-uploads').innerHTML=sources.map(source=>'<div class="puc3-source"><h3>'+esc(names[source])+'</h3>'+
 (source==='SEI'?'<div class="puc3-sei-selector"><strong>Selecionar documentos do processo SEI</strong><p class="muted">Escolha vários documentos já armazenados para o confronto. A seleção não exclui arquivos.</p><input id="puc3-sei-search" type="search" placeholder="Pesquisar nome, número ou BM" aria-label="Pesquisar arquivos do SEI"><div class="puc3-sei-actions"><button class="btn secondary" type="button" id="puc3-sei-all">Selecionar todos</button><button class="btn secondary" type="button" id="puc3-sei-clear">Limpar seleção</button></div><div id="puc3-sei-choices" class="puc3-sei-choices" role="group" aria-label="Selecionar múltiplos documentos SEI"></div><small id="puc3-sei-selected-count" aria-live="polite"></small></div><div class="puc3-sei-zip"><strong>Documentos anexados para análise · seleção múltipla</strong><p class="muted">Selecione arquivos individuais ou documentos internos do ZIP. Pesquise pelo nome ou identifique BMs pelo conteúdo antes de analisar.</p><input type="search" id="puc3-sei-zip-search" placeholder="Pesquisar documento, número ou BM"><button type="button" class="btn secondary" id="puc3-sei-scan-bm">Identificar possíveis BMs pelo conteúdo</button><div class="puc3-sei-actions"><button type="button" class="btn secondary" id="puc3-sei-zip-all">Selecionar todos</button><button type="button" class="btn secondary" id="puc3-sei-zip-clear">Limpar</button></div><div id="puc3-sei-zip-items" class="puc3-sei-choices" role="group" aria-label="Selecionar arquivos do ZIP"></div><small id="puc3-sei-zip-count" aria-live="polite">Anexe documentos ou ZIP para selecionar os arquivos.</small></div>':'')+
 (source==='BALANCO'?'<label>UF do Balanço (aba mais recente)<select id="puc3-uf-balanco"><option value="">Todas as UFs</option>'+PUC_BALANCO_UFS.map(uf=>'<option value="'+uf+'">'+uf+'</option>').join('')+'</select></label><div class="puc3-balanco-multi"><strong>Empreendimentos do Balanço · seleção múltipla</strong><div class="puc3-balanco-actions"><button type="button" class="btn secondary" id="puc3-balanco-all">Selecionar todos</button><button type="button" class="btn secondary" id="puc3-balanco-clear">Limpar seleção</button></div><input type="search" id="puc3-balanco-search" placeholder="Localizar ID ou empreendimento" aria-label="Pesquisar empreendimentos do Balanço"><div id="puc3-empreendimento-balanco" class="puc3-balanco-options" role="group" aria-label="Selecionar múltiplos empreendimentos"></div><small id="puc3-balanco-count" aria-live="polite">Anexe o Balanço para escolher os empreendimentos.</small></div><p id="puc3-balanco-preview" class="muted">Anexe o Balanço para identificar UF, nome e ID_governa na aba mais recente.</p>':'')+
 (source==='DOCAS'?'<p class="muted">A Companhia preenche o formulário, baixa um JSON e encaminha a resposta por canal institucional autorizado. Não há transmissão automática pelo site.</p><a class="btn secondary" href="formulario-docas.html" target="_blank" rel="noopener">Abrir formulário das DOCAS</a>':'')+
 '<label>Processo / referência<input id="puc3-ref-'+source+'" placeholder="'+(source==='DOCAS'?'Companhia, competência e referência da declaração':'SEI, período ou referência do relatório')+'"></label>'+
 '<label>Arquivos<input type="file" multiple id="puc3-files-'+source+'" accept="'+(source==='DOCAS'?'.json':'.zip,.pdf,.xls,.xlsx,.csv,.doc,.docx,.txt,.html,.htm,.xml,.json')+'"></label>'+'<div class="puc3-attachment-status" id="puc3-attachment-'+source+'" role="status" aria-live="polite">Nenhum documento armazenado desta fonte neste navegador.</div>'+
 '<button class="btn" type="button" data-import="'+source+'">Analisar anexos '+source+'</button><small>'+
 (source==='SEI'?'Busca BMs pelo nome e conteúdo; exige revisão documental.':source==='BALANCO'?'Identifica UF, empreendimento e ID_governa antes do confronto.':'Importe a declaração JSON da Companhia; os dados exigem conferência.')+
 '</small></div>').join('');
 $('puc3-uploads').querySelectorAll('[data-import]').forEach(b=>b.onclick=()=>importFiles(b.dataset.import));
 for(const source of sources){
  $('puc3-files-'+source)?.addEventListener('change',()=>refreshAttachmentStatus());
 }
 refreshAttachmentStatus();
 $('puc3-sei-search').addEventListener('input',renderSeiSelector);
 $('puc3-sei-all').onclick=()=>{seiExcluded.clear();saveSeiSelection();renderSeiSelector();render()};
 $('puc3-sei-clear').onclick=()=>{seiExcluded=new Set(docs().filter(d=>d.origin==='SEI').map(d=>d.id));saveSeiSelection();renderSeiSelector();render()};
 $('puc3-files-SEI').addEventListener('change',refreshSeiZipPreview);
 $('puc3-sei-zip-search').addEventListener('input',renderSeiZipPreview);
 $('puc3-sei-zip-all').onclick=()=>{seiZipSelected=new Set(seiZipItems.map(x=>x.key));renderSeiZipPreview()};
 $('puc3-sei-zip-clear').onclick=()=>{seiZipSelected.clear();renderSeiZipPreview()};
 $('puc3-sei-scan-bm').onclick=scanPendingSeiBMs;
 renderSeiSelector();
  $('puc3-files-BALANCO').addEventListener('change',refreshBalancoPreview);
 $('puc3-uf-balanco').addEventListener('change',refreshBalancoPreview);
 $('puc3-balanco-all').addEventListener('click',()=>{balancoSelected=new Set(balancoOptions.map(o=>o.key));renderBalancoChoices()});
 $('puc3-balanco-clear').addEventListener('click',()=>{balancoSelected.clear();renderBalancoChoices()});
 $('puc3-balanco-search').addEventListener('input',renderBalancoChoices);
}

function renderSeiSelector(){
 const area=$('puc3-sei-choices'),counter=$('puc3-sei-selected-count');if(!area||!counter)return;
 const available=docs().filter(d=>d.origin==='SEI'),valid=new Set(available.map(d=>d.id));
 seiExcluded=new Set([...seiExcluded].filter(id=>valid.has(id)));saveSeiSelection();
 const query=($('puc3-sei-search')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 area.replaceChildren();let shown=0;
 for(const doc of available){
  const caption=doc.name+(doc.container&&doc.container!=='Arquivo individual'?' · '+doc.container:'')+(doc.bmNumber?' · BM '+doc.bmNumber:'');
  const positive=doc.bmStatus&&doc.bmStatus!=='SEM INDICAÇÃO DE BM';
  const searchable=(caption+(positive?' · '+doc.bmStatus:'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(query&&!searchable.includes(query))continue;
  const label=document.createElement('label');label.className='puc3-sei-choice';
  const cb=document.createElement('input');cb.type='checkbox';cb.value=doc.id;cb.checked=!seiExcluded.has(doc.id);
  cb.onchange=()=>{cb.checked?seiExcluded.delete(doc.id):seiExcluded.add(doc.id);saveSeiSelection();renderSeiSelector();render()};
  const span=document.createElement('span');span.textContent=caption+(positive?' · '+doc.bmStatus:'');label.append(cb,span);area.appendChild(label);shown++;
 }
 if(!shown)area.textContent=available.length?'Nenhum documento corresponde à pesquisa.':'Nenhum documento SEI armazenado neste navegador.';
 counter.textContent=(available.length-seiExcluded.size)+' de '+available.length+' documento(s) selecionado(s) para o confronto.';
}
let seiZipSelected=new Set(),seiZipItems=[],seiZipRevision=0,seiZipReady=false;
function seiNameMatch(item,q){
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(!q)return true;
 const positive=item.bmStatus&&item.bmStatus!=='SEM INDICAÇÃO DE BM';
 return norm(item.title).includes(q)||(positive&&(norm(item.bmStatus).includes(q)||q==='bm'||q==='medicao'))||(item.bmNumber&&norm('BM '+item.bmNumber).includes(q));
}
function renderSeiZipPreview(){
 const area=$('puc3-sei-zip-items'),count=$('puc3-sei-zip-count');if(!area||!count)return;
 area.replaceChildren();const q=($('puc3-sei-zip-search')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 let shown=0;
 for(const item of seiZipItems){
  if(!seiNameMatch(item,q))continue;
  const label=document.createElement('label');label.className='puc3-sei-choice';
  const cb=document.createElement('input');cb.type='checkbox';cb.value=item.key;cb.checked=seiZipSelected.has(item.key);
  cb.onchange=()=>{cb.checked?seiZipSelected.add(item.key):seiZipSelected.delete(item.key);renderSeiZipPreview()};
  const span=document.createElement('span');
  span.textContent=item.title+(item.bmStatus&&item.bmStatus!=='SEM INDICAÇÃO DE BM'?' · '+item.bmStatus:'')+(item.bmNumber?' nº '+item.bmNumber:'');
  label.append(cb,span);area.appendChild(label);shown++;
 }
 if(!shown)area.textContent=seiZipItems.length?(q?'Nenhum documento corresponde à pesquisa. Use “Identificar possíveis BMs pelo conteúdo” para examinar arquivos sem indicação no nome.':'Nenhum arquivo corresponde aos critérios.'):'Anexe arquivos individuais ou ZIP para visualizar os documentos.';
 const positive=seiZipItems.filter(x=>x.bmStatus&&x.bmStatus!=='SEM INDICAÇÃO DE BM').length;
 count.textContent=seiZipSelected.size+' de '+seiZipItems.length+' documento(s) selecionado(s) para importar; '+shown+' visível(is)'+(positive?' · '+positive+' possível(is) BM(s) identificado(s).':' · BMs por conteúdo ainda não conferidos.');
}
async function refreshSeiZipPreview(){
 const generation=++seiZipRevision,files=[...($('puc3-files-SEI')?.files||[])],count=$('puc3-sei-zip-count');
 seiZipItems=[];seiZipSelected.clear();seiZipReady=false;
 const eng=window.PUCDocEngine;
 // Arquivos enviados diretamente aparecem imediatamente, sem precisar de ZIP.
 files.forEach((file,index)=>{
  if(/\.zip$/i.test(file.name))return;
  const bmStatus=eng?.bmClass?.(file.name,'')||'SEM INDICAÇÃO DE BM';
  seiZipItems.push({key:'avulso:'+index,title:file.name,fileIndex:index,item:{name:file.name,blob:file},bmStatus,bmNumber:eng?.bmNumber?.(file.name,'')||''});
 });
 seiZipSelected=new Set(seiZipItems.map(x=>x.key));renderSeiZipPreview();
 const zipFiles=files.filter(f=>/\.zip$/i.test(f.name));
 if(!zipFiles.length){seiZipReady=true;return}
 if(count)count.textContent='Lendo arquivos individuais e conteúdo interno do ZIP...';
 try{
  if(!eng?.unpack)throw Error('Leitor ZIP não inicializado');
  const entries=[];
  for(const file of zipFiles){
   const unpacked=await eng.unpack(file);
   for(const item of unpacked){
    const key=file.name+'\u0001'+item.container+'\u0001'+item.name;
    const bmStatus=eng.bmClass?.(item.name,'')||'SEM INDICAÇÃO DE BM';
    entries.push({key,title:file.name+' / '+item.name+(item.container?' · '+item.container:''),file:file.name,item,bmStatus,bmNumber:eng.bmNumber?.(item.name,'')||''});
   }
  }
  if(generation!==seiZipRevision)return;
  seiZipItems.push(...entries);entries.forEach(x=>seiZipSelected.add(x.key));seiZipReady=true;renderSeiZipPreview();
 }catch(e){if(generation===seiZipRevision){seiZipReady=false;if(count)count.textContent='Erro ao ler o ZIP: '+e.message+' — escolha outro arquivo antes de importar.'}}
}
async function scanPendingSeiBMs(){
 const button=$('puc3-sei-scan-bm'),count=$('puc3-sei-zip-count'),generation=seiZipRevision;
 if(!seiZipReady||!seiZipItems.length){status('Selecione arquivos e aguarde a listagem antes de identificar BMs.');return}
 const engine=window.PUCDocEngine;if(!engine?.read||!engine?.bmClass){status('Leitor de documentos indisponível.');return}
 button.disabled=true;let checked=0,errors=0;
 try{
  for(const record of seiZipItems){
   if(generation!==seiZipRevision)break;
   if(record.scanned)continue;
   try{
    const result=await engine.read(record.item);
    record.bmStatus=engine.bmClass(record.item.name,result.text||'');
    record.bmNumber=engine.bmNumber?.(record.item.name,result.text||'')||'';
    record.scanned=true;
   }catch(e){errors++;record.scanned=true}
   checked++;
   if(checked%5===0&&count)count.textContent='Verificando conteúdo para possíveis BMs: '+checked+' de '+seiZipItems.length+' arquivo(s)...';
  }
  if(generation===seiZipRevision){
   $('puc3-sei-zip-search').value='BM';
   renderSeiZipPreview();
   status('Exame preliminar de '+checked+' documento(s) concluído. '+errors+' arquivo(s) sem leitura. BM identificado/provável/mencionado não equivale a medição validada.');
  }
 }finally{button.disabled=false}
}

function refreshAttachmentStatus(){
 for(const source of sources){
  const label=$('puc3-attachment-'+source);
  if(!label)continue;
  const stored=docs().filter(d=>d.origin===source);
  const pending=[...($('puc3-files-'+source)?.files||[])];
  if(pending.length){
   label.textContent='Selecionado para análise: '+pending.map(f=>f.name).join(' · ')+(stored.length?' | '+stored.length+' documento(s) já armazenado(s)':'');
  }else if(stored.length){
   const recent=stored[0];
   label.textContent='Anexo preservado na biblioteca local: '+(recent.container&&recent.container!=='Arquivo individual'?recent.container:recent.name)+' · '+stored.length+' documento(s) armazenado(s). Selecione outro arquivo somente para atualizar.';
  }else{
   label.textContent='Nenhum documento desta fonte armazenado neste navegador.';
  }
 }
}
document.addEventListener('puc-documents-updated',()=>{refreshAttachmentStatus();renderSeiSelector()});

let balancoSelected=new Set(),balancoOptions=[],balancoRequest=0;
function renderBalancoChoices(){
 const container=$('puc3-empreendimento-balanco');if(!container)return;
 const search=($('puc3-balanco-search')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 container.replaceChildren();let shown=0;
 for(const row of balancoOptions){
  const title=(row.id?'ID '+row.id+' · ':'')+row.empreendimento+' ['+row.uf+']';
  if(search&&!title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(search))continue;
  const label=document.createElement('label');label.className='puc3-balanco-choice';
  const box=document.createElement('input');box.type='checkbox';box.value=row.key;box.checked=balancoSelected.has(row.key);
  box.onchange=()=>{box.checked?balancoSelected.add(row.key):balancoSelected.delete(row.key);updateBalancoCount()};
  label.appendChild(box);const txt=document.createElement('span');txt.textContent=title;label.appendChild(txt);container.appendChild(label);shown++;
 }
 if(!shown)container.textContent=balancoOptions.length?'Nenhum empreendimento encontrado na pesquisa.':'Anexe o arquivo XLSX para carregar a lista.';
 updateBalancoCount();
}
function updateBalancoCount(){
 const counter=$('puc3-balanco-count');if(counter)counter.textContent=balancoSelected.size+' de '+balancoOptions.length+' empreendimento(s) selecionado(s). '+(balancoSelected.size?'A importação usará apenas os marcados.':'Marque pelo menos um empreendimento para importar.');
}
async function refreshBalancoPreview(){
 const file=$('puc3-files-BALANCO')?.files?.[0],uf=$('puc3-uf-balanco')?.value||'',label=$('puc3-balanco-preview'),request=++balancoRequest;
 balancoOptions=[];balancoSelected.clear();renderBalancoChoices();
 if(!label)return;
 if(!file){label.textContent='Anexe o Balanço para identificar UF, empreendimento e ID_governa.';return}
 if(!/\.xlsx$/i.test(file.name)){label.textContent='Seleção disponível apenas para arquivos XLSX.';return}
 try{
  label.textContent='Lendo a aba mais recente do Balanço...';
  const data=await PUCFiltrarBalancoPorUF(file,uf);
  if(request!==balancoRequest)return;
  const seen=new Set();balancoOptions=data.registros.map(r=>({...r,key:r.id+'|'+r.empreendimento})).filter(r=>{if(seen.has(r.key))return false;seen.add(r.key);return true});
  balancoSelected=new Set(balancoOptions.map(r=>r.key));renderBalancoChoices();
  label.textContent=data.sheet+' · '+balancoOptions.length+' empreendimento(s) disponíveis na UF. Marque aqueles que deseja importar.';
 }catch(e){if(request===balancoRequest)label.textContent='Falha na leitura do Balanço: '+e.message}
}
async function importFiles(source){
 const files=[...$('puc3-files-'+source).files],project='',ref=$('puc3-ref-'+source).value.trim(),uf=source==='BALANCO'?($('puc3-uf-balanco')?.value||''):'',empreendimentoIds=source==='BALANCO'?[...balancoSelected]:null;
 if(!files.length){status('Selecione ao menos um arquivo para '+source+'.');return}
 if(!lib()){status('Biblioteca documental indisponível. Recarregue a página e execute o diagnóstico.');return}
 const button=$('puc3-uploads').querySelector('[data-import="'+source+'"]');button.disabled=true;
 try{status('Analisando '+files.length+' anexo(s) de '+source+'; arquivos internos do ZIP serão inventariados...');
  let targetFiles=files,filterMessage='';
  if(source==='BALANCO'&&uf&&files.some(file=>!/\.xlsx$/i.test(file.name)))throw Error('O filtro de UF funciona com Balanço XLSX. Para PDF ou CSV, utilize Todas as UFs.');
  if(source==='BALANCO'&&files.every(file=>/\.xlsx$/i.test(file.name))){
   const filtered=[];let count=0;
   for(const file of files){
    if(empreendimentoIds?.length===0)throw Error('Selecione pelo menos um empreendimento do Balanço.');
    const result=await PUCFiltrarBalancoPorUF(file,uf,empreendimentoIds);filtered.push(result.file);count+=result.count;
   }
   if(!count)throw Error('Não foram encontrados empreendimentos para '+(uf||'as UFs')+' na aba mais recente da planilha.');
   targetFiles=filtered;filterMessage=' | '+(uf?'UF '+uf:'Todas as UFs')+' | '+count+' empreendimento(s)'+' | seleção de '+empreendimentoIds.length+' empreendimento(s) da aba mais recente';
  }
  if(source==='DOCAS')for(const file of files){if(!/\.json$/i.test(file.name))throw Error('A declaração das DOCAS deve ser JSON exportado do formulário.');let record;try{record=JSON.parse(await file.text())}catch(e){throw Error(file.name+': JSON inválido')}if(record.schema!=='BI_PUC_DOCAS_V1'||!record.cadastro?.empreendimento||!record.cadastro?.uf||!record.cadastro?.competencia)throw Error(file.name+': declaração sem identificação, UF ou competência')}
  let seiChoice=null;
  if(source==='SEI'){
   if(!seiZipReady)throw Error('A seleção dos documentos ainda não terminou de carregar ou houve falha na leitura do ZIP.');
   if(!seiZipSelected.size)throw Error('Selecione pelo menos um documento SEI antes da análise.');
   // A seleção restringe arquivos soltos e entradas ZIP; os não marcados não são incorporados.
   targetFiles=files.filter((file,index)=>/\.zip$/i.test(file.name)?seiZipItems.some(x=>x.file===file.name&&seiZipSelected.has(x.key)):seiZipSelected.has('avulso:'+index));
   seiChoice=new Set(seiZipSelected);
   filterMessage+=' | '+seiZipSelected.size+' documento(s) selecionado(s)';
  }
  const n=await lib().ingest(targetFiles,source,project,ref+filterMessage,seiChoice);
  // Mantém a seleção do arquivo após analisar; no recarregamento, exibe o anexo preservado no IndexedDB.
  refreshAttachmentStatus();
  if(project)selected.add(project);
  renderChecks();render();
  const errors=lib().getLastIngestReport?.().errors||[];status(n+' documento(s) incorporado(s) a '+source+'. '+docs().filter(d=>d.origin===source&&/^BM IDENTIFICADO|^BM PROVÁVEL/.test(d.bmStatus||'')).length+' possíveis BMs nesta origem. '+(errors.length?'Pendências: '+errors.slice(0,4).join('; ')+'. ':'')+'Revise os achados antes de comparar.');
 }catch(e){status('Falha ao analisar '+source+': '+e.message)}
 finally{button.disabled=false}
}
function lineFor(d){
 const quality=d.quality||'Documento anterior — reanalisar',bm=/^BM IDENTIFICADO|^BM PROVÁVEL/.test(d.bmStatus||'');
 const findings=(d.findings||[]).length, candidates=(d.candidates||[]).slice(0,4).map(c=>c.type+': '+(c.values||[]).join(', ')).join('; ');
 return '<tr><td><strong>'+esc(d.origin)+'</strong><br>'+esc(d.project||'Carteira / sem vínculo')+'</td><td>'+esc(d.name)+'<small>'+esc(d.container||'Arquivo individual')+'</small></td><td>'+esc(bm?'BM identificado / provável':d.bmStatus||'Não classificado')+'</td><td>'+esc(candidates||'Nenhum valor extraído')+'</td><td>'+esc(quality)+'<small>'+findings+' achado(s) revisado(s)</small></td><td><button type="button" class="btn secondary" data-review="'+esc(d.id)+'">Revisar</button></td></tr>'
}
function renderFiles(){
 const files=filesForReview();
 $('puc3-coverage').innerHTML=sources.map(src=>{let set=files.filter(d=>d.origin===src);return '<div class="puc3-kpi"><small>'+src+' anexado</small><strong>'+set.length+'</strong><span>'+set.filter(d=>(d.findings||[]).some(f=>f.verified)).length+' documento(s) com achados conferidos</span></div>'}).join('');
 $('puc3-doc-count').textContent=files.length+' documento(s) apresentados · '+files.filter(d=>/^BM IDENTIFICADO|^BM PROVÁVEL/.test(d.bmStatus||'')).length+' possíveis BMs';
 const body=$('puc3-files-rows');body.innerHTML=files.length?files.map(lineFor).join(''):'<tr><td colspan="6">Anexe arquivos SEI e Balanço e as declarações das DOCAS para iniciar. A base SIOP de referência continua disponível na página Base SIOP, fora desta importação documental.</td></tr>';
 body.querySelectorAll('[data-review]').forEach(x=>x.onclick=()=>review(x.dataset.review));
}
function renderFindings(){
 let rows=[];for(const d of filesForReview())for(const f of d.findings||[])if(!selected.size||selected.has(f.project))rows.push({...f,docId:d.id,source:d.origin,document:d.name});
 lastRows=rows;
 $('puc3-findings-rows').innerHTML=rows.length?rows.map(f=>'<tr><td>'+esc(f.project||'PUC pendente')+'</td><td>'+esc(f.source)+'<small>'+esc(f.document)+'</small></td><td>'+esc(label[f.indicator]||f.indicator)+'</td><td>'+esc(val(f.value))+' '+esc(units[f.indicator]||'')+'</td><td>'+esc(f.period||'Sem período')+'</td><td>'+esc(f.verified?'Conferido pelo operador':'Pendente de conferência')+'</td><td><button class="btn secondary" type="button" data-edit="'+esc(f.docId)+'" data-id="'+esc(f.id)+'">Editar</button></td></tr>').join(''):'<tr><td colspan="7">Nenhum achado foi revisado. Clique em Revisar em um arquivo, selecione o indicador e confira o valor antes de salvar.</td></tr>';
 $('puc3-findings-rows').querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>review(x.dataset.edit,x.dataset.id))
}
function chooseCandidate(i){
 const d=docs().find(x=>x.id===selectedFile);if(!d)return;
 const c=d.candidates?.[i];if(!c)return;
 const txt=c.values?.[0]||'';let n=String(txt).replace(/^R\$\s*/,'').replace(/\s*%$/,'').replace(/\s/g,'');
 if(n.includes(',')&&n.includes('.')){n=n.lastIndexOf(',')>n.lastIndexOf('.')?n.replace(/\./g,'').replace(',','.'):n.replace(/,/g,'')}
 else if(n.includes(','))n=n.replace(',','.');
 else if(/^(?:\d{1,3}\.)+\d{3}$/.test(n))n=n.replace(/\./g,'');
 $('puc3-find-value').value=Number.isFinite(Number(n))?Number(n):'';
 const cat=(c.type||'').toLowerCase();
 $('puc3-find-indicator').value=cat.includes('dota')?'dotacao_atual':cat.includes('empenh')?'empenho_uniao':cat.includes('liquid')?'liquidacao_uniao':cat.includes('puc recebida')?'aporte_puc_recebido':cat.includes('puc aplicada')?'puc_aplicada':cat.includes('valor global')?'valor_empreendimento':cat.includes('execução financeira')?(cat.includes('(%)')?'execucao_financeira_percentual':'execucao_financeira_balanco'):cat.includes('físic')||cat.includes('fisic')?'execucao_fisica':cat.includes('pago')?(d.origin==='SIOP'?'pagamento_uniao':(d.origin==='SEI'&&/^BM IDENTIFICADO|^BM PROVÁVEL/.test(d.bmStatus||'')?'pagamento_bm':'')):cat.includes('medido')?'medicao_bm':'';
 $('puc3-find-note').value='Candidato localizado: '+c.excerpt+'. Necessária verificação da natureza, apuração e documentação original.';
 $('puc3-find-confirm').checked=false;
}
function review(id,fid){
 const d=docs().find(x=>x.id===id);if(!d)return;selectedFile=id;
 const f=(d.findings||[]).find(x=>x.id===fid)||{};
 $('puc3-review').hidden=false;
 $('puc3-review-title').textContent='Revisar evidência · '+d.origin+' · '+d.name;
 $('puc3-review-info').textContent=(d.container||'Arquivo individual')+' · '+(d.quality||'Leitura anterior')+' · '+(d.bmStatus||'Sem classificação BM');
 $('puc3-find-id').value=f.id||'';
 $('puc3-find-project').innerHTML='<option value="">Selecione a PUC comprovada</option>'+projects.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.id+' · '+p.empreendimento)+'</option>').join('');
 $('puc3-find-project').value=f.project||d.project||(selected.size===1?[...selected][0]:'');
 $('puc3-find-indicator').innerHTML=metricSelect();$('puc3-find-indicator').value=f.indicator||'';
 $('puc3-find-value').value=f.value??'';
 $('puc3-find-period').value=f.period||d.bmPeriod||'';
 $('puc3-find-cutoff').value=f.cutoff||'';
 $('puc3-find-object').value=f.object||'GLOBAL_PROJETO';
 $('puc3-find-contract').value=f.contract||'';
 $('puc3-find-bm').value=f.bmNumber||d.bmNumber||'';
 $('puc3-find-aggregation').value=f.aggregation||'ACUMULADO';
 $('puc3-find-note').value=f.note||'';
 $('puc3-find-confirm').checked=!!f.verified;
 $('puc3-find-delete').disabled=!f.id;
 $('puc3-candidates').innerHTML=(d.candidates||[]).length?(d.candidates||[]).map((c,i)=>'<button type="button" class="btn secondary" data-candidate="'+i+'">'+esc(c.type)+' · '+esc((c.values||[]).join(' / '))+'</button>').join(''):'<span class="muted">Sem números extraíveis com segurança. Confira o arquivo original e transcreva manualmente.</span>';
 $('puc3-candidates').querySelectorAll('[data-candidate]').forEach(x=>x.onclick=()=>chooseCandidate(Number(x.dataset.candidate)));
 $('puc3-review').scrollIntoView({behavior:'smooth',block:'start'});
}
function numericInput(raw){let x=String(raw??'').trim().replace(/^R\$\s*/,'').replace(/\s*%$/,'').replace(/\s/g,'');if(!x)return NaN;
 if(x.includes(',')&&x.includes('.'))x=x.lastIndexOf(',')>x.lastIndexOf('.')?x.replace(/\./g,'').replace(',','.'):x.replace(/,/g,'');
 else if(x.includes(','))x=x.replace(',','.');else if(/^(?:\d{1,3}\.)+\d{3}$/.test(x))x=x.replace(/\./g,'');
 return /^-?\d+(?:\.\d+)?$/.test(x)?Number(x):NaN}

async function save(){
 const doc=docs().find(x=>x.id===selectedFile);if(!doc)return;
 const value=$('puc3-find-value').value,project=$('puc3-find-project').value,indicator=$('puc3-find-indicator').value;
 if(!project){status('Escolha a PUC correspondente ao documento e ao achado.');return}
  if(!indicator){status('Selecione o indicador e sua natureza; a classificação automática não é prova.');return}
 const numeric=numericInput(value);if(!Number.isFinite(numeric)){status('Informe um valor válido. Use 1234,56 ou 1234.56; vazio não significa zero.');return}
 if(units[indicator]==='%'&&(numeric<0||numeric>100)){status('Percentual físico fora do intervalo de 0 a 100%.');return}
  const checked=$('puc3-find-confirm').checked;
  if(checked&&(!$('puc3-find-period').value||!$('puc3-find-cutoff').value)){status('Para conferir, informe competência e data de corte comprovadas.');return}
  if(checked&&['medicao_bm','pagamento_bm'].includes(indicator)&&(!$('puc3-find-contract').value.trim()||!$('puc3-find-bm').value.trim())){status('Para conferir BM, informe contrato e número do boletim.');return}
  const id=$('puc3-find-id').value||'';
 const item={id,project,indicator,value:numeric,period:$('puc3-find-period').value,cutoff:$('puc3-find-cutoff').value,object:($('puc3-find-object').value||'GLOBAL_PROJETO').trim().toUpperCase(),contract:$('puc3-find-contract').value.trim().toUpperCase(),bmNumber:$('puc3-find-bm').value.trim(),aggregation:$('puc3-find-aggregation').value,verified:$('puc3-find-confirm').checked,note:$('puc3-find-note').value.trim()};
 try{await lib().saveFinding(doc.id,item);selected.add(project);renderChecks();render();$('puc3-review').hidden=true;status('Achado registrado em '+doc.origin+' para '+project+'. '+(item.verified?'Conferido pelo operador; homologação SNP pendente.':'Pendente de conferência.'))}
 catch(e){status('Erro ao salvar achado: '+e.message)}
}
async function removeFinding(){
 if(!selectedFile||!$('puc3-find-id').value)return;
 if(!confirm('Excluir o achado registrado? O documento original permanece na biblioteca.'))return;
 await lib().deleteFinding(selectedFile,$('puc3-find-id').value);$('puc3-review').hidden=true;render();status('Achado excluído; arquivo preservado.')
}
function audit(){
 if(!selected.size){$('puc3-result').innerHTML='<p class="notice">Selecione uma ou mais PUCs na aba Documentos antes de confrontar. Nenhuma correspondência foi calculada.</p>';status('Confronto não executado: nenhuma PUC selecionada.');lastPairs=[];return {pairs:[],findings:[]}}
  const findings=lastRows.filter(f=>selected.has(f.project)&&sources.includes(f.source));
 const byProject=new Map();
 for(const p of selected){byProject.set(p,{sources:new Set(),found:[],pairs:[],pending:0,docs:filesForReview().filter(d=>d.project===p||!d.project)})}
 for(const f of findings){const r=byProject.get(f.project);if(!r)continue;r.found.push(f);r.sources.add(f.source);if(!f.verified||!f.period||!f.cutoff)r.pending++}
 const pairs=[];
 for(const [id,r] of byProject){for(let i=0;i<r.found.length;i++)for(let j=i+1;j<r.found.length;j++){
  const a=r.found[i],b=r.found[j];if(a.source===b.source||a.indicator!==b.indicator)continue;
  let reason=[];if(!a.verified||!b.verified)reason.push('Conferência pendente');
  if(!a.period||!b.period||a.period!==b.period)reason.push('Competência distinta/ausente');
  if(!a.cutoff||!b.cutoff||a.cutoff!==b.cutoff)reason.push('Data de corte distinta/ausente');
  if((a.aggregation||'')!==(b.aggregation||''))reason.push('Apuração distinta');
  if(!String(a.object||'').trim()||!String(b.object||'').trim())reason.push('Objeto não comprovado');
   if(String(a.object||'').trim().toUpperCase()!==String(b.object||'').trim().toUpperCase())reason.push('Objeto distinto');
  if(String(a.contract||'').trim().toUpperCase()!==String(b.contract||'').trim().toUpperCase())reason.push('Contrato distinto');
  if(['medicao_bm','pagamento_bm','valor_contrato'].includes(a.indicator)&&(!a.contract||!b.contract))reason.push('Contrato não informado');
   if(a.indicator==='execucao_fisica'&&(a.bmNumber||b.bmNumber)&&(!a.contract||!b.contract))reason.push('Escopo físico de BM sem contrato comprovado');
  if(['medicao_bm','pagamento_bm'].includes(a.indicator)){
   if(!a.bmNumber||!b.bmNumber)reason.push('Número do BM não comprovado');
   else if(String(a.bmNumber).replace(/^0+(?=\d)/,'')!==String(b.bmNumber).replace(/^0+(?=\d)/,''))reason.push('BMs diferentes');
  }
  if((a.source==='SIOP'||b.source==='SIOP')&&!['dotacao_atual','empenho_uniao','liquidacao_uniao','pagamento_uniao'].includes(a.indicator))reason.push('Indicador não comprovável por SIOP orçamentário');
   const diff=Number(a.value)-Number(b.value),tolerance=units[a.indicator]==='%'?0.1:0.01;
  const state=reason.length?'NÃO COMPARÁVEL':Math.abs(diff)>tolerance?'DIVERGÊNCIA':'CORRESPONDÊNCIA';
  const pair={project:id,a,b,state,reason:reason.join('; '),diff:reason.length?null:diff};pairs.push(pair);r.pairs.push(pair)
 }}
 lastPairs=pairs;
 const body=$('puc3-result');let html='<div class="cmp-metrics"><div class="cmp-metric"><small>PUCs selecionadas</small><strong>'+selected.size+'</strong></div><div class="cmp-metric"><small>Achados registrados</small><strong>'+findings.length+'</strong></div><div class="cmp-metric"><small>Correspondências</small><strong>'+pairs.filter(p=>p.state==='CORRESPONDÊNCIA').length+'</strong></div><div class="cmp-metric"><small>Divergências</small><strong>'+pairs.filter(p=>p.state==='DIVERGÊNCIA').length+'</strong></div></div>';
 html+='<div class="scroll"><table class="data-table"><thead><tr><th>PUC</th><th>Fontes anexadas</th><th>Indicadores conferidos</th><th>Resultado</th><th>Pendências e providências</th></tr></thead><tbody>';
 for(const [id,r] of byProject){
  const p=projects.find(x=>x.id===id);const counts=sources.map(src=>r.docs.filter(x=>x.origin===src&&(x.project===id||(x.findings||[]).some(f=>f.project===id))).length);
  const matched=r.pairs.filter(x=>x.state==='CORRESPONDÊNCIA').length,diff=r.pairs.filter(x=>x.state==='DIVERGÊNCIA').length;
  const relevant=r.found.filter(f=>f.verified);
  html+='<tr><td><strong>'+esc(id)+'</strong><br>'+esc(p?.empreendimento||'')+'</td><td>'+sources.map((src,i)=>src+': '+counts[i]).join('<br>')+'</td><td>'+relevant.map(f=>esc(f.source+' · '+(label[f.indicator]||f.indicator))+' = '+esc(val(f.value))+' '+esc(units[f.indicator]||'')).join('<br>')+'</td><td>'+matched+' correspondência(s)<br>'+diff+' divergência(s)<br>'+r.pairs.filter(x=>x.state==='NÃO COMPARÁVEL').length+' não comparáveis</td><td>'+r.pending+' achado(s) sem corte/conferência.<br>'+(counts.filter(n=>n>0).length<3?'Anexos das três fontes incompletos.':r.sources.size<3?'Três fontes anexadas; achados registrados em '+r.sources.size+' fonte(s).':'Três fontes com achados.')+'<br>'+(r.pairs.length?'Conferir detalhes abaixo.':'Sem pares do mesmo indicador; não afirmar compatibilidade.')+'</td></tr>'
 }
 html+='</tbody></table></div>';
 html+='<h3>Confrontos numéricos por indicador</h3><div class="scroll"><table class="data-table"><thead><tr><th>PUC</th><th>Indicador</th><th>Fonte A / documento / valor</th><th>Fonte B / documento / valor</th><th>Competência / corte / objeto / contrato / BM</th><th>Conclusão</th></tr></thead><tbody>';
 html+=pairs.length?pairs.map(p=>'<tr><td>'+esc(p.project)+'</td><td>'+esc(label[p.a.indicator]||p.a.indicator)+'</td><td>'+esc(p.a.source)+' · '+esc(p.a.document||'Documento não identificado')+' · '+esc(val(p.a.value))+'</td><td>'+esc(p.b.source)+' · '+esc(p.b.document||'Documento não identificado')+' · '+esc(val(p.b.value))+'</td><td>'+esc(p.a.period||'Sem competência')+' / '+esc(p.a.cutoff||'Sem corte')+' / '+esc(p.a.object||'Sem objeto')+' / '+esc(p.a.contract||'Sem contrato')+' / BM A '+esc(p.a.bmNumber||'N/A')+' / BM B '+esc(p.b.bmNumber||'N/A')+'</td><td><strong>'+esc(p.state)+'</strong><small>'+esc(p.reason||('Diferença '+val(p.diff)))+'</small></td></tr>').join(''):'<tr><td colspan="6">Não existem dois achados do mesmo indicador em fontes diferentes para confronto. Ausência de confronto não comprova regularidade.</td></tr>';
 html+='</tbody></table></div><p class="notice">Regra: o SIOP de demonstração não integra os resultados. Só são comparados indicadores de mesma natureza, período, data de corte, apuração, objeto e contrato, com conferência registrada. Pagamento da União, PUC recebida, medição e valor pago à contratada não são equivalentes por definição. Relatório auxiliar não homologado pela SNP.</p>';
 body.innerHTML=html;body.dataset.generated='1';status('Confronto documental calculado: '+selected.size+' PUC(s), '+findings.length+' achados, '+pairs.length+' pares analisados.');
 return {pairs,findings};
}
function exportReport(){
 const computed=audit();const lines=['RELATÓRIO AUXILIAR DE CONFRONTO DOCUMENTAL — SNP / MPOR','Gerado: '+new Date().toLocaleString('pt-BR'),'Status: NÃO HOMOLOGADO','PUCs selecionadas: '+[...selected].join(', '),'','FONTES ANEXADAS / INDICADORES',''];
 for(const id of selected){lines.push('PUC '+id);for(const d of docs().filter(d=>d.project===id))lines.push(' - '+d.origin+' · '+d.name+' · '+(d.quality||'sem avaliação'));for(const f of computed.findings.filter(f=>f.project===id))lines.push('   '+f.source+' · '+f.document+' · '+(f.reference||'sem referência')+' · '+(label[f.indicator]||f.indicator)+' = '+f.value+' '+(units[f.indicator]||'')+' · competência '+(f.period||'N/I')+' · corte '+(f.cutoff||'N/I')+' · objeto '+(f.object||'N/I')+' · contrato '+(f.contract||'N/I')+' · BM '+(f.bmNumber||'N/A')+' · '+(f.verified?'CONFERIDO PELO OPERADOR':'NÃO CONFERIDO'));lines.push('')}
 lines.push('CONFRONTOS NUMÉRICOS');for(const p of computed.pairs)lines.push(p.project+' · '+(label[p.a.indicator]||p.a.indicator)+' · '+p.a.source+' '+p.a.value+' × '+p.b.source+' '+p.b.value+' · '+p.state+' · '+(p.reason||'Diferença '+p.diff));
 lines.push('','RESSALVAS: somente documentos anexados; valores não equivalentes não são comparados; nenhuma conclusão jurídica automática; homologação SNP pendente.');
 download(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}),'RELATORIO_CONFRONTO_SEI_BALANCO_SIOP.txt');
}

function reportHtml(){
 const result=audit();let rows=result.findings,body='';
 for(const id of selected){
  const p=projects.find(x=>x.id===id);
  body+='<section><h2>'+esc(id)+' · '+esc(p?.empreendimento||'')+'</h2><p><strong>Companhia:</strong> '+esc(p?.empresa||'')+'</p>';
  const ds=docs().filter(d=>sources.includes(d.origin)&&(d.project===id||((d.findings||[]).some(f=>f.project===id))));
  body+='<h3>Arquivos anexados</h3><table><thead><tr><th>Fonte</th><th>Documento</th><th>Leitura</th><th>BM</th></tr></thead><tbody>';
  body+=ds.length?ds.map(d=>'<tr><td>'+esc(d.origin)+'</td><td>'+esc(d.name)+'</td><td>'+esc(d.quality||'não informada')+'</td><td>'+esc(d.bmStatus||'Não identificado')+'</td></tr>').join(''):'<tr><td colspan="4">Nenhum documento vinculado à PUC</td></tr>';
  body+='</tbody></table><h3>Achados extraídos e conferidos</h3><table><thead><tr><th>Fonte / documento / referência</th><th>Indicador</th><th>Valor</th><th>Competência / corte</th><th>Objeto / contrato / BM</th><th>Conferência</th></tr></thead><tbody>';
  const fs=rows.filter(x=>x.project===id);
  body+=fs.length?fs.map(f=>'<tr><td>'+esc(f.source)+' / '+esc(f.document||'Documento não identificado')+' / '+esc(f.reference||'Referência não informada')+'</td><td>'+esc(label[f.indicator]||f.indicator)+'</td><td>'+esc(val(f.value))+' '+esc(units[f.indicator]||'')+'</td><td>'+esc(f.period||'Não informada')+' / '+esc(f.cutoff||'Não informado')+'</td><td>'+esc(f.object||'Sem objeto')+' / '+esc(f.contract||'Sem contrato')+' / BM '+esc(f.bmNumber||'N/A')+'</td><td>'+esc(f.verified?'Conferido pelo operador':'Pendente')+'</td></tr>').join(''):'<tr><td colspan="6">Não há achados revisados</td></tr>';
  body+='</tbody></table><h3>Comparações documentais</h3><table><thead><tr><th>Indicador</th><th>Fontes e documentos</th><th>Resultado</th><th>Justificativa / escopo</th></tr></thead><tbody>';
  let pr=result.pairs.filter(x=>x.project===id);
  body+=pr.length?pr.map(pair=>'<tr><td>'+esc(label[pair.a.indicator]||pair.a.indicator)+'</td><td>'+esc(pair.a.source)+' · '+esc(pair.a.document||'sem documento')+' × '+esc(pair.b.source)+' · '+esc(pair.b.document||'sem documento')+'</td><td>'+esc(pair.state)+'</td><td>'+esc(pair.reason||'Diferença: '+val(pair.diff))+'<br>Competência '+esc(pair.a.period||'N/I')+' · Corte '+esc(pair.a.cutoff||'N/I')+' · Contrato '+esc(pair.a.contract||'N/I')+' · BM '+esc(pair.a.bmNumber||'N/A')+'</td></tr>').join(''):'<tr><td colspan="4">Não foi possível confronto equivalente entre duas fontes nesta PUC</td></tr>';
  body+='</tbody></table>'+(window.PUCCorrelacao?.reportSection?.(id)||'')+'</section>'; 
 }
 let html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Relatório documental BI PUC</title><style>body{font:13px/1.5 Arial,sans-serif;color:#1a3147;max-width:1050px;margin:30px auto;padding:0 20px}h1{color:#123b61}h2{margin-top:26px;color:#185781}section{break-inside:avoid;margin:22px 0;border-top:2px solid #b8d6e3}table{width:100%;border-collapse:collapse;font-size:11px;margin:10px 0 16px}th,td{border:1px solid #d6e1e8;padding:7px;text-align:left;vertical-align:top}th{background:#eef4f7}.warning{background:#fff6e9;border-left:4px solid #bd8732;padding:12px}@media print{body{margin:5mm;max-width:none}section{page-break-inside:avoid}}</style><h1>BI Executivo PUC · Confronto Documental</h1><p>Secretaria Nacional de Portos · MPOR</p><p>Emitido em '+esc(new Date().toLocaleString('pt-BR'))+' · PUCs: '+esc([...selected].join(', '))+'</p><p class="warning"><strong>Documento auxiliar — não homologado pela SNP.</strong> Compara somente arquivos efetivamente anexados e indicadores equivalentes, conferidos, com competência, data de corte, objeto, contrato e apuração compatíveis. Valores SIOP pré-carregados não integram este relatório. Sem evidência, não há conclusão de correspondência.</p>'+body+'</html>';
 return html;
}
function initReportPage(){
 const page=$('relatorio');if(!page)return;
 const previous=[...page.children].filter(el=>el.classList?.contains('panel'));
 const legacy=document.createElement('details');legacy.className='panel';legacy.innerHTML='<summary>Relatório anterior · SIOP referencial (consulta auxiliar)</summary><p class="muted">A estrutura anterior permanece disponível, mas não deve substituir o confronto documental das três fontes anexadas.</p>';for(const el of previous)legacy.appendChild(el);page.appendChild(legacy);
 const p=document.createElement('div');p.id='puc3-report-panel';p.className='panel';p.innerHTML='<h2>Relatório documental · SEI × Balanço × DOCAS</h2><p class="muted">Usa exclusivamente os documentos anexados e os achados registrados no Confronto das Fontes, incluindo as PUCs selecionadas. O resultado só indica correspondência quando há pelo menos duas fontes com valores de mesmo indicador e contexto comprovado.</p><div class="two-actions"><button type="button" class="btn" id="puc3-report-preview-btn">Visualizar resultado documental</button><button type="button" class="btn secondary" id="puc3-report-html-btn">Baixar relatório HTML para impressão/PDF</button></div><div id="puc3-report-preview" class="statusline">Selecione PUCs e confira os achados na aba Confronto das fontes.</div>';
 page.insertBefore(p,page.firstChild);
 $('puc3-report-preview-btn').onclick=()=>{audit();$('puc3-report-preview').innerHTML=$('puc3-result').innerHTML+[...selected].map(id=>window.PUCCorrelacao?.reportSection?.(id)||'').join('');};
 $('puc3-report-html-btn').onclick=()=>download(new Blob([reportHtml()],{type:'text/html;charset=utf-8'}),'RELATORIO_DOCUMENTAL_PUC_SEI_BALANCO_DOCAS.html');
}

function render(){refreshAttachmentStatus();renderSeiSelector();renderFiles();renderFindings();if($('puc3-result')?.dataset?.generated==='1')audit();window.PUCCorrelacao?.refresh?.()}
function simplifyDocuments(){
 const page=$('documentos');if(!page)return;
 const help=document.createElement('div');help.className='panel';help.innerHTML='<h2>Importação principal: Confronto das três fontes</h2><p class="muted">Para comparar dados entre <strong>SEI, Balanço e DOCAS</strong>, anexe os documentos na aba Confronto das Fontes. A biblioteca abaixo permanece disponível para consulta, reanálise e exclusão dos arquivos.</p><button type="button" class="btn" id="puc3-open-compare">Abrir Confronto das Fontes · SEI × Balanço × DOCAS</button>';
 page.insertBefore(help,page.firstChild);
 $('puc3-open-compare').onclick=()=>{document.querySelector('[data-page="comparacao"]')?.click();$('puc3-main')?.scrollIntoView({behavior:'smooth',block:'start'})};
 const standard=$('load-standard-csv')?.closest('.mini-panel'),schedule=$('schedule-import-panel');
 if(standard||schedule){
  const advanced=document.createElement('details');advanced.className='panel';advanced.id='puc3-advanced-imports';
  advanced.innerHTML='<summary>Importação avançada de CSV padronizado e cronogramas (opcional)</summary><p class="muted">Os modelos CSV permanecem disponíveis para usuários que já tenham extraído e conferido os dados. Para anexar ZIP/PDF/XLSX use a aba Confronto das Fontes.</p>';
  const container=standard?.parentElement||schedule?.parentElement;
  container.insertBefore(advanced,standard||schedule);
  if(standard)advanced.appendChild(standard);if(schedule)advanced.appendChild(schedule);
 }
}
function init(){
 const cmp=$('comparacao');if(!cmp)return;
 const oldMulti=$('puc-multi-panel');if(oldMulti)oldMulti.remove();
 const oldPanels=[...cmp.children].filter(x=>x.classList?.contains('panel'));
 const detail=document.createElement('details');detail.id='puc3-legacy';detail.className='panel';detail.innerHTML='<summary>Consulta auxiliar ao SIOP referencial e registros manuais antigos (não faz parte do confronto documental)</summary><p class="muted">Esta consulta permanece disponível para compatibilidade, mas os valores da base SIOP incorporada não são tratados como evidência confrontada.</p>';
 for(const x of oldPanels)detail.appendChild(x);cmp.appendChild(detail);
 const panel=document.createElement('div');panel.id='puc3-main';panel.className='panel';panel.innerHTML=
 '<h2>Confronto documental · SEI × Balanço × DOCAS</h2><p class="muted">Anexe as três fontes, selecione uma ou várias PUCs, revise os achados de cada arquivo e então confronte <strong>somente indicadores equivalentes, com período e corte comprovados</strong>. Os dados da Base SIOP não entram automaticamente nesta comparação documental.</p>'+
 '<div class="filters"><input id="puc3-search" placeholder="Buscar PUC / empreendimento" aria-label="Filtrar PUCs"><button type="button" id="puc3-all" class="btn secondary">Selecionar todas</button><button type="button" id="puc3-clear" class="btn secondary">Limpar</button><span id="puc3-selected" class="muted"></span></div><div id="puc3-projects" class="puc3-projects"></div>'+
 '<h3>1 · Anexar fontes documentais</h3><div class="puc3-uploads" id="puc3-uploads"></div><p id="puc3-status" class="statusline" role="status">Selecione PUCs e anexe os arquivos das três fontes.</p>'+
 '<details id="puc3-document-list" class="puc3-inventory-collapsed"><summary>Consultar e revisar documentos SEI / Balanço / SIOP (opcional)</summary><p class="muted">A relação detalhada permanece oculta por padrão. A análise dos arquivos e seus achados continuam disponíveis para conferência, sem integrar a impressão do relatório.</p><h3>Documentos extraídos</h3><div id="puc3-coverage" class="puc3-coverage"></div><p class="muted" id="puc3-doc-count"></p><div class="scroll"><table class="data-table"><thead><tr><th>Fonte / PUC</th><th>Documento</th><th>BM</th><th>Valores candidatos</th><th>Leitura e revisão</th><th>Ação</th></tr></thead><tbody id="puc3-files-rows"></tbody></table></div>'+
 '<div id="puc3-review" hidden class="puc3-review"><h3 id="puc3-review-title">Revisão documental</h3><p id="puc3-review-info" class="muted"></p><p class="muted">Valores abaixo são apenas candidatos. Confira o original antes de indicar conferência.</p><div id="puc3-candidates" class="two-actions"></div><input id="puc3-find-id" type="hidden"><div class="formgrid"><label>PUC efetivamente comprovada<select id="puc3-find-project"></select></label><label>Indicador / natureza<select id="puc3-find-indicator"></select></label><label>Valor comprovado (R$ ou %)<input type="text" inputmode="decimal" id="puc3-find-value" placeholder="Ex.: 1.234.567,89"></label><label>Competência (mês/ano)<input type="month" id="puc3-find-period"></label><label>Data de corte<input type="date" id="puc3-find-cutoff"></label><label>Apuração<select id="puc3-find-aggregation"><option value="ACUMULADO">Acumulado</option><option value="MENSAL">Mensal</option></select></label><label>Objeto / etapa<input id="puc3-find-object" placeholder="GLOBAL_PROJETO"></label><label>Contrato / referência<input id="puc3-find-contract" placeholder="Quando aplicável"></label><label>Número do BM, se aplicável<input id="puc3-find-bm" placeholder="Ex.: 05"></label><label style="grid-column:1/-1">Observações de conferência<textarea id="puc3-find-note" rows="2"></textarea></label><label style="grid-column:1/-1"><input type="checkbox" id="puc3-find-confirm"> Conferi este valor, objeto, período e documento original (não equivale à homologação SNP)</label></div><div class="two-actions"><button type="button" class="btn" id="puc3-find-save">Salvar achado</button><button type="button" class="btn secondary" id="puc3-find-delete">Excluir achado</button><button type="button" class="btn secondary" id="puc3-review-close">Fechar</button></div></div></details>'+
 '<h3>3 · Indicadores revisados por arquivo</h3><div class="scroll"><table class="data-table"><thead><tr><th>PUC</th><th>Fonte e documento</th><th>Indicador</th><th>Valor</th><th>Competência</th><th>Situação</th><th>Ação</th></tr></thead><tbody id="puc3-findings-rows"></tbody></table></div>'+
 '<h3>4 · Confrontar e gerar relatório</h3><div class="two-actions"><button type="button" class="btn" id="puc3-run">Confrontar fontes anexadas</button><button type="button" class="btn secondary" id="puc3-csv">Exportar achados CSV</button><button type="button" class="btn secondary" id="puc3-report">Gerar relatório documental</button></div><div id="puc3-result"></div>';
 cmp.insertBefore(panel,cmp.firstChild);
 const style=document.createElement('style');style.textContent='.puc3-projects{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:7px;margin:12px 0 20px}.puc3-choose{display:flex;gap:8px;align-items:start;border:1px solid #dbe5ed;border-radius:8px;padding:9px;font-size:12px;cursor:pointer}.puc3-choose small{display:block;color:#637a8e}.puc3-choose input{margin-top:3px}.puc3-uploads,.puc3-coverage{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0}.puc3-source,.puc3-kpi{padding:13px;border:1px solid #dce7ee;border-radius:10px;background:#f8fafc;min-width:0}.puc3-source label{display:grid;gap:4px;font-size:12px;margin:10px 0}.puc3-source input,.puc3-source select{width:100%;max-width:100%;padding:8px;border:1px solid #cedbe4;border-radius:7px}.puc3-source small,.puc3-kpi span{display:block;font-size:11px;color:#667d90;margin-top:8px}.puc3-kpi strong{font-size:21px;display:block}.puc3-inventory-collapsed{margin:16px 0;border:1px solid #dce7ee;border-radius:10px;background:#f8fafc;padding:12px 15px}.puc3-inventory-collapsed>summary{cursor:pointer;font-size:13px;font-weight:650;color:#245575}.puc3-inventory-collapsed[open]>summary{margin-bottom:12px}.puc3-review{padding:18px;border:1px solid #bcd6e3;background:#f5fafc;border-radius:11px;margin:16px 0}.puc3-review[hidden],#puc-docs-table[hidden]{display:none!important}#puc3-files-rows small,#puc3-findings-rows small,#puc3-result small{display:block;color:#667d90;margin-top:4px}#puc3-result{margin-top:18px}#puc3-legacy summary{cursor:pointer;font-weight:650}@media(max-width:850px){.puc3-uploads,.puc3-coverage{grid-template-columns:1fr}.puc3-projects{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.puc3-projects{grid-template-columns:1fr}.puc3-source{padding:11px}}';document.head.appendChild(style);
 sourceCards();renderChecks();render();initReportPage();simplifyDocuments();
 $('puc3-search').oninput=renderChecks;
 $('puc3-all').onclick=()=>{selected=new Set(projects.map(p=>p.id));renderChecks();render()};
 $('puc3-clear').onclick=()=>{selected.clear();renderChecks();render();$('puc3-result').innerHTML=''};
 $('puc3-find-save').onclick=save;$('puc3-find-delete').onclick=removeFinding;
 $('puc3-review-close').onclick=()=>$('puc3-review').hidden=true;
 $('puc3-run').onclick=audit;
 $('puc3-csv').onclick=()=>csv(lastRows.map(f=>({puc:f.project,fonte:f.source,documento:f.document,referencia:f.reference||'',indicador:label[f.indicator]||f.indicator,valor:f.value,unidade:units[f.indicator],competencia:f.period,data_corte:f.cutoff,objeto:f.object,contrato:f.contract,numero_bm:f.bmNumber,apuracao:f.aggregation,conferido:f.verified?'SIM':'NÃO',observacao:f.note})),'PUC_ACHADOS_DOCUMENTAIS_SEI_BALANCO_SIOP.csv');
 $('puc3-report').onclick=()=>download(new Blob([reportHtml()],{type:'text/html;charset=utf-8'}),'RELATORIO_DOCUMENTAL_PUC_SEI_BALANCO_DOCAS.html');
 document.addEventListener('puc-documents-updated',render);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();