/* Diagnóstico funcional local: gera ZIP fictício em memória, não envia dados. */
(function(){'use strict';
const el=id=>document.getElementById(id);
async function run(){
 const target=el('puc-selftest-results'),btn=el('puc-selftest-btn');
 btn.disabled=true;target.textContent='Verificando carteira, motor documental e ZIP de teste…';
 const checks=[],add=(name,pass,detail)=>checks.push({name,pass:!!pass,detail:detail||''});
 try{
  const projects=JSON.parse(el('embedded-data')?.textContent||'{}').projetos||[];
  add('Carteira de PUCs carregada',projects.length>=12,projects.length+' investimentos');
  const central=document.querySelector('#documentos #puc3-central-files');
  add('Anexos concentrados em Documentos',!!central);
  const up=['puc3-files-SEI','puc3-files-BALANCO','puc3-files-SIOP'];
  add('Três campos SEI, Balanço e SIOP em Documentos',up.every(id=>!!document.getElementById(id)&&central?.contains(document.getElementById(id))),up.length+' entradas previstas');
  const other=[...document.querySelectorAll('input[type=file]')].filter(e=>!central?.contains(e)).filter(e=>{const style=getComputedStyle(e),label=e.closest('label'),sLabel=label?getComputedStyle(label):null;return style.display!=='none'&&sLabel?.display!=='none'&&!e.closest('[hidden]')});
  add('Sem anexos concorrentes nas outras abas',other.length===0,other.length+' campos extras visíveis');
  add('IDs de anexação únicos',up.every(id=>document.querySelectorAll('#'+id).length===1));
  add('Confronto sem quadro de upload',!el('comparacao')?.contains(el('puc3-uploads')));
  add('Biblioteca IndexedDB inicializada',Array.isArray(window.PUCDocLibrary?.list?.()));
  const engine=window.PUCDocEngine;add('Leitor de documentos',!!engine);
  add('Leitor de arquivos ZIP',typeof window.JSZip==='function');
  if(engine&&window.JSZip){
   const zip=new JSZip();
   zip.file('BM_05_Medicao.html','<html><head><style>.x{display:none}</style></head><body><h1>Boletim de Medição nº 05</h1><p>Valor medido: R$ 1.234,56</p></body></html>');
   zip.file('Despacho_323.html','<html><body><p>Despacho: referência ao Boletim de Medição 05.</p></body></html>');
   const inner=new JSZip();inner.file('Planilha_de_Medicao_06.txt','Boletim de Medição 06\nValor medido acumulado: R$ 2.000,00');
   zip.file('anexo_interno.zip',await inner.generateAsync({type:'blob'}));
   const docx=new JSZip();docx.file('word/document.xml','<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Boletim de Medição 07</w:t></w:r></w:p></w:body></w:document>');
   zip.file('BM_07.docx',await docx.generateAsync({type:'blob'}));
   const xlsx=new JSZip();xlsx.file('xl/sharedStrings.xml','<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Empenhado</t></si><si><t>Pago</t></si></sst>');xlsx.file('xl/worksheets/sheet1.xml','<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2"><v>1200</v></c><c r="B2"><v>1000</v></c></row></sheetData></worksheet>');
   zip.file('SIOP_teste.xlsx',await xlsx.generateAsync({type:'blob'}));
   const file=new File([await zip.generateAsync({type:'blob'})],'PROCESSO_SEI_TESTE.zip',{type:'application/zip'});
   const unpacked=await engine.unpack(file);add('ZIP com documentos de vários tipos',unpacked.length===5,unpacked.length+' itens descompactados');
   const bm=unpacked.find(x=>/BM_05/.test(x.name));
   const txt=bm?await engine.read(bm):{text:''};add('Leitura do HTML sem código CSS',txt.text.includes('Boletim de Medição')&&!txt.text.includes('display:none'));
   add('Reconhecimento de BM real',engine.bmClass(bm?.name,txt.text).startsWith('BM IDENTIFICADO'));
   add('Extração de valor como candidato',engine.indicators(txt.text).some(c=>c.values.includes('1.234,56')));
   const despacho=unpacked.find(x=>/Despacho/.test(x.name)),dText=despacho?await engine.read(despacho):{text:''};
   add('Despacho que apenas cita BM não vira boletim',engine.bmClass(despacho?.name,dText.text)==='BM MENCIONADO');
   add('ZIP aninhado',unpacked.some(x=>/Planilha_de_Medicao_06/.test(x.name)));
   const docxEntry=unpacked.find(x=>/BM_07\.docx/.test(x.name));const docxText=await engine.read(docxEntry);add('DOCX dentro do ZIP SEI',docxText.text.includes('Boletim de Medição 07'),docxText.quality);
   const xlsxEntry=unpacked.find(x=>/SIOP_teste\.xlsx/.test(x.name));const xlsxText=await engine.read(xlsxEntry);add('XLSX dentro do ZIP SEI',xlsxText.text.includes('Empenhado')&&xlsxText.text.includes('1200'),xlsxText.quality);
   const old=await engine.read({name:'legado.xls',blob:new Blob(['teste'])});add('XLS legado sinalizado sem leitura fictícia',old.quality.includes('LEGADO')&&!old.text,old.quality);
  }
  add('Leitor PDF disponível',!!window.pdfjsLib,window.pdfjsLib?'PDF.js carregado':'PDF.js indisponível neste navegador; PDFs não textuais precisarão de outro tratamento');
 }catch(e){add('Execução do autodiagnóstico',false,e.message)}
 target.innerHTML=checks.map(c=>'<div style="padding:5px 0;color:'+(c.pass?'#167852':'#aa472e')+'"><strong>'+(c.pass?'✓ ':'⚠ ')+c.name+'</strong>'+(c.detail?' — '+String(c.detail).replace(/</g,'&lt;'):'')+'</div>').join('');
 btn.disabled=false;
}
function init(){
 const section=el('documentos');if(!section)return;
 const div=document.createElement('div');div.className='panel';div.id='puc-selftest';div.innerHTML='<div class="section-header"><h2>Diagnóstico de funcionamento do BI PUC</h2><button type="button" id="puc-selftest-btn" class="btn secondary">Executar autodiagnóstico</button></div><p class="muted">Teste de carteira, ZIP com documentos internos, reconhecimento de BMs, exclusão de CSS e leitura de valores candidatos. Utiliza apenas dados artificiais, sem alterar anexos ou observações.</p><div id="puc-selftest-results" class="statusline" role="status">Clique para verificar o funcionamento neste navegador.</div>';
 section.insertBefore(div,document.getElementById('puc3-central-files')?.nextSibling||section.firstChild);
 el('puc-selftest-btn').onclick=run;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();