/* BI PUC - motor documental V10: SEI ZIP, HTML, PDF, DOCX e XLSX.
   Toda extração é preliminar; não homologa fatos ou pagamentos. */
(function(w){'use strict';
const extension=n=>String(n||'').split('.').pop().toLowerCase();
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function xml(str){const doc=new DOMParser().parseFromString(str,'application/xml');if(doc.querySelector('parsererror'))throw Error('XML malformado');return doc}
const nodes=(n,tag)=>Array.from(n.getElementsByTagNameNS('*',tag));
function cleanHTML(raw){
 const doc=new DOMParser().parseFromString(String(raw||''),'text/html');
 doc.querySelectorAll('head,style,script,template,noscript,svg,iframe').forEach(n=>n.remove());
 return (doc.body?.textContent||'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()
}
function bmClass(name,text){
 const n=normal(name),head=normal(String(text||'').slice(0,4500));
 if(/(?:^|[/ _\[-])(?:bm[\s._-]*\d{1,4}|boletim(?:[\s_-]+de)?[\s_-]+medic(?:ao|oes)|planilha[\s_-]+de[\s_-]+medic(?:ao|oes)|relatorio[\s_-]+de[\s_-]+medic(?:ao|oes))(?=$|[^a-z0-9])/.test(n))return 'BM IDENTIFICADO';
 if(/(?:^|\n)\s*(?:boletim\s+de\s+medic(?:ao|oes)|bm\s*(?:n[ºo.]?\s*)?\d+|planilha\s+de\s+medic(?:ao|oes))\s*(?:n[ºo.]?\s*|:|-)?\d{0,4}/m.test(head))return 'BM PROVÁVEL';
 if(/\b(?:boletim\s+de\s+medic(?:ao|oes)|bm\s*(?:n[ºo.]?\s*)?\d{1,3})\b/.test(head))return 'BM MENCIONADO';
 return 'SEM INDICAÇÃO DE BM'
}
function bmNumber(name,text){
 const m=(String(name||'')+'\n'+String(text||'').slice(0,2200)).match(/(?:boletim\s*(?:de\s*)?medi[cç][aã]o|(?:^|[^\w])BM)\s*(?:n[ºo.°]?\s*)?([0-9]{1,4}(?:[\/-][0-9]{2,4})?)/im);return m?m[1]:''
}
function bmPeriod(name,text){
 const m=(String(text||'').slice(0,6000)+'\n'+name).match(/(?:compet[eê]ncia|m[eê]s\s+de\s+refer[eê]ncia|per[ií]odo|refer[eê]ncia)\s*[:\-]?\s*(0?[1-9]|1[0-2])[\-/](20\d{2})/i);
 return m?m[2]+'-'+m[1].padStart(2,'0'):''
}
function indicators(text){
 const out=[],t=String(text||'');
 const patterns=[
 ['Valor medido (período)',/(?:valor\s+(?:da\s+)?medi[cç][aã]o\s+(?:no\s+)?per[ií]odo|valor\s+medido\s+no\s+per[ií]odo)\s*[:=–-]?\s*(R\$\s*)?(\d[\d.]*,\d{2})/gi],
 ['Valor medido (acumulado)',/(?:valor\s+(?:medido|executado)\s+acumulado|total\s+medido\s+at[eé]\s+(?:o\s+)?per[ií]odo)\s*[:=–-]?\s*(R\$\s*)?(\d[\d.]*,\d{2})/gi],
 ['Valor medido (apuração não determinada)',/(?:valor\s+(?:total\s+)?medido|total\s+d[ao]\s+medi[cç][aã]o)\s*[:=–-]?\s*(R\$\s*)?(\d[\d.]*,\d{2})/gi],
 ['Valor pago (não comprova OB)',/(?:valor\s+(?:total\s+)?pago|total\s+de\s+pagamentos)\s*[:=–-]?\s*(R\$\s*)?(\d[\d.]*,\d{2})/gi],
 ['Execução física (%)',/(?:execu[cç][aã]o\s+f[ií]sica|avan[cç]o\s+f[ií]sico)\s*[:=–-]?\s*(\d{1,3}(?:,\d{1,2})?)\s*%/gi]
 ];
 for(const [type,rx] of patterns){let m;while((m=rx.exec(t))&&out.length<50){let value=m[2]||m[1];out.push({type,values:[value],excerpt:t.slice(Math.max(0,m.index-60),Math.min(t.length,m.index+m[0].length+65)).replace(/\s+/g,' ').slice(0,270),line:t.slice(0,m.index).split('\n').length,status:'CANDIDATO — EXIGE CONFERÊNCIA'});}}
 return out
}
async function unpack(file){
 if(typeof w.JSZip==='undefined')throw Error('Leitor ZIP indisponível');
 const results=[],limits={entries:0,bytes:0,maxEntries:550,maxBytes:120*1024*1024};
 async function walk(item,container,depth){
  if(limits.entries>=limits.maxEntries)throw Error('ZIP com mais de 550 documentos');
  const name=item.name||'anexo';
  if(extension(name)==='zip'&&depth<2){
   const archive=await w.JSZip.loadAsync(await item.arrayBuffer());
   for(const entry of Object.values(archive.files)){if(entry.dir||/(^|\/)(?:__MACOSX|\.)/.test(entry.name)||entry.name.includes('..')||entry.name.startsWith('/'))continue;
    const blob=await entry.async('blob');limits.bytes+=blob.size;if(limits.bytes>limits.maxBytes)throw Error('ZIP descompactado acima de 120 MB');limits.entries++;
    await walk({name:entry.name,blob,arrayBuffer:()=>blob.arrayBuffer()},(container?container+' / ':'')+name,depth+1);
   }return;
  }
  results.push({name,blob:item.blob||item,container});
 }
 await walk(file,'',0);return results;
}
async function read(item){
 const ext=extension(item.name),blob=item.blob;
 if(['html','htm'].includes(ext))return {text:cleanHTML(await blob.text()),quality:'TEXTO EXTRAÍDO (HTML)'};
 if(['txt','csv','json','xml','md'].includes(ext))return {text:(await blob.text()).slice(0,300000),quality:'TEXTO EXTRAÍDO'};
 if(ext==='docx'){
  try{let z=await w.JSZip.loadAsync(await blob.arrayBuffer());let part=z.file('word/document.xml');if(!part)throw Error('document.xml ausente');let d=xml(await part.async('string'));
   let ps=nodes(d,'p').map(p=>nodes(p,'t').map(t=>t.textContent).join('')).filter(Boolean);return {text:ps.join('\n').slice(0,300000),quality:'TEXTO EXTRAÍDO (DOCX)'}
  }catch(e){return {text:'',quality:'DOCX NÃO EXTRAÍDO: '+e.message}}
 }
 if(ext==='xlsx'){
  try{const z=await w.JSZip.loadAsync(await blob.arrayBuffer());let ss=[];if(z.file('xl/sharedStrings.xml')){let d=xml(await z.file('xl/sharedStrings.xml').async('string'));ss=nodes(d,'si').map(x=>nodes(x,'t').map(t=>t.textContent).join(''))}
   let result=[];for(const [name,part] of Object.entries(z.files)){if(!/^xl\/worksheets\/sheet\d+\.xml$/i.test(name)||result.length>12)continue;let d=xml(await part.async('string'));const lines=[];
    for(const row of nodes(d,'row').slice(0,3500)){const vals=[];for(const c of nodes(row,'c').slice(0,80)){let v=nodes(c,'v')[0]?.textContent||'';let t=c.getAttribute('t');if(t==='s')v=ss[Number(v)]||'';if(t==='inlineStr')v=nodes(c,'t').map(x=>x.textContent).join('');if(v)vals.push(v)}if(vals.length)lines.push(vals.join(' | '))}
    result.push(name+'\n'+lines.join('\n'));
   }return {text:result.join('\n').slice(0,300000),quality:result.length?'TABELA EXTRAÍDA (XLSX)':'XLSX SEM PLANILHAS LEGÍVEIS'};
  }catch(e){return {text:'',quality:'XLSX NÃO EXTRAÍDO: '+e.message}}
 }
 if(ext==='pdf'){
  if(!w.pdfjsLib)return {text:'',quality:'PDF NÃO EXTRAÍDO: leitor PDF.js indisponível'};
  try{let pdf=await w.pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise,lines=[];let cap=Math.min(70,pdf.numPages);
   for(let p=1;p<=cap;p++){let page=await pdf.getPage(p);let content=await page.getTextContent();lines.push('PÁGINA '+p+'\n'+content.items.map(i=>i.str||'').join(' '))}
   const text=lines.join('\n').slice(0,300000);
   return {text,quality:text.replace(/PÁGINA \d+/g,'').trim()?'TEXTO EXTRAÍDO (PDF)':'PDF SEM TEXTO — OCR NECESSÁRIO'};
  }catch(e){return {text:'',quality:'PDF NÃO EXTRAÍDO: '+e.message}}
 }
 return {text:'',quality:ext==='xls'?'XLS LEGADO: ANEXADO, LEITURA NÃO DISPONÍVEL':'FORMATO ANEXADO, SEM LEITURA TEXTUAL'};
}
w.PUCDocEngine={extension,bmClass,bmNumber,bmPeriod,indicators,unpack,read,cleanHTML};
})(window);