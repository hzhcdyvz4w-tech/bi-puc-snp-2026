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
  const engine=window.PUCDocEngine;add('Leitor de documentos',!!engine);
  add('Leitor de arquivos ZIP',typeof window.JSZip==='function');
  if(engine&&window.JSZip){
   const zip=new JSZip();
   zip.file('BM_05_Medicao.html','<html><head><style>.x{display:none}</style></head><body><h1>Boletim de Medição nº 05</h1><p>Valor medido: R$ 1.234,56</p></body></html>');
   zip.file('Despacho_323.html','<html><body><p>Despacho: referência ao Boletim de Medição 05.</p></body></html>');
   const inner=new JSZip();inner.file('Planilha_de_Medicao_06.txt','Boletim de Medição 06\nValor medido acumulado: R$ 2.000,00');
   zip.file('anexo_interno.zip',await inner.generateAsync({type:'blob'}));
   const file=new File([await zip.generateAsync({type:'blob'})],'PROCESSO_SEI_TESTE.zip',{type:'application/zip'});
   const unpacked=await engine.unpack(file);add('ZIP com documentos de vários tipos',unpacked.length===3,unpacked.length+' itens descompactados');
   const bm=unpacked.find(x=>/BM_05/.test(x.name));
   const txt=bm?await engine.read(bm):{text:''};add('Leitura do HTML sem código CSS',txt.text.includes('Boletim de Medição')&&!txt.text.includes('display:none'));
   add('Reconhecimento de BM real',engine.bmClass(bm?.name,txt.text).startsWith('BM IDENTIFICADO'));
   add('Extração de valor como candidato',engine.indicators(txt.text).some(c=>c.values.includes('1.234,56')));
   const despacho=unpacked.find(x=>/Despacho/.test(x.name)),dText=despacho?await engine.read(despacho):{text:''};
   add('Despacho que apenas cita BM não vira boletim',engine.bmClass(despacho?.name,dText.text)==='BM MENCIONADO');
   add('ZIP aninhado',unpacked.some(x=>/Planilha_de_Medicao_06/.test(x.name)));
  }
  add('Leitor PDF disponível',!!window.pdfjsLib,window.pdfjsLib?'PDF.js carregado':'PDF.js indisponível neste navegador; PDFs não textuais precisarão de outro tratamento');
 }catch(e){add('Execução do autodiagnóstico',false,e.message)}
 target.innerHTML=checks.map(c=>'<div style="padding:5px 0;color:'+(c.pass?'#167852':'#aa472e')+'"><strong>'+(c.pass?'✓ ':'⚠ ')+c.name+'</strong>'+(c.detail?' — '+String(c.detail).replace(/</g,'&lt;'):'')+'</div>').join('');
 btn.disabled=false;
}
function init(){
 const section=el('documentos');if(!section)return;
 const div=document.createElement('div');div.className='panel';div.id='puc-selftest';div.innerHTML='<div class="section-header"><h2>Diagnóstico de funcionamento do BI PUC</h2><button type="button" id="puc-selftest-btn" class="btn secondary">Executar autodiagnóstico</button></div><p class="muted">Teste de carteira, ZIP com documentos internos, reconhecimento de BMs, exclusão de CSS e leitura de valores candidatos. Utiliza apenas dados artificiais, sem alterar anexos ou observações.</p><div id="puc-selftest-results" class="statusline" role="status">Clique para verificar o funcionamento neste navegador.</div>';
 section.insertBefore(div,section.firstChild);
 el('puc-selftest-btn').onclick=run;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();