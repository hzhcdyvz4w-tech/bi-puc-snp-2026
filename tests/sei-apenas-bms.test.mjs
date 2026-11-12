// Regressão do filtro SEI — análise apenas de BMs, sem documentos administrativos ou imagens.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../assets/puc-document-engine.js',import.meta.url),'utf8');
const load=(window={})=>new Function('window','DOMParser',script+';return window.PUCDocEngine;')(window,undefined);
const bmText='BOLETIM DE MEDIÇÃO 12\nCONTRATO 26/2025\nVALOR DA MEDIÇÃO R$ 1.200,00\nPERCENTUAL FÍSICO ACUMULADO: 41,25%';
test('aceita boletins legíveis em PDF e planilhas de medição XLSX',()=>{
 const engine=load();
 for(const filename of ['BM_12.pdf','[113]-11498568_Anexo.pdf','Planilha_de_medicao_12.xlsx']){
  assert.equal(engine.seiBMDecision(filename,bmText,'TEXTO EXTRAÍDO (PDF)').eligible,true,filename);
 }
});
test('rejeita processos, ofícios, despachos, HTML, imagens e PDF sem texto',()=>{
 const engine=load();
 for(const name of ['Oficio_01_Sobre_BM.pdf','Processo_SEI_BM.pdf','Despacho_de_BM.pdf','Termo_Referencia.pdf','foto_BM.png','documento_BM.html','imagem_BM.jpg','Nota_Tecnica_BM.pdf']){
  assert.equal(engine.seiBMDecision(name,bmText,'TEXTO EXTRAÍDO (PDF)').eligible,false,name);
 }
 assert.equal(engine.seiBMDecision('BM_13.pdf','PÁGINA 1\n','PDF SEM TEXTO — OCR NECESSÁRIO').eligible,false);
 assert.equal(engine.seiBMDecision('Anexo_02.pdf','Conforme o BM 12, seguem informações.','TEXTO EXTRAÍDO (PDF)').eligible,false);
});
test('ZIP SEI só descompacta arquivos PDF e XLSX admitidos',async()=>{
 const called=[],files={};
 for(const name of ['BM_01.pdf','Planilha_de_medicao_02.xlsx','[113]-11498568_Anexo.pdf','Oficio_01_BM.pdf','PROCESSO_SEI.pdf','Foto.jpg','pagina.html','Termo_Referencia.pdf']){
  files[name]={name,dir:false,_data:{uncompressedSize:100,compressedSize:80},async:async()=>{called.push(name);return {size:100,arrayBuffer:async()=>new ArrayBuffer(1)}}};
 }
 const engine=load({JSZip:{loadAsync:async()=>({files})}});
 const parsed=await engine.unpack({name:'pacote.zip',arrayBuffer:async()=>new ArrayBuffer(1)},engine.seiBMFileAllowed);
 assert.deepEqual(parsed.map(x=>x.name),['BM_01.pdf','Planilha_de_medicao_02.xlsx','[113]-11498568_Anexo.pdf']);
 assert.deepEqual(called,parsed.map(x=>x.name));
 assert.equal(parsed.ignoredCount,5);
});


test('a extração SEI considera indicadores dos BMs, mas não dotação/empenho/pago',()=>{
 const engine=load();
 const raw='VALOR DA MEDIÇÃO (BM): R$ 1.200,00\nVALOR ACUMULADO (BM): R$ 6.200,00\nEXECUÇÃO FÍSICA: 44,55%\nDOTAÇÃO ATUAL: R$ 9.000,00\nEMPENHADO: R$ 7.500,00\nPAGO: R$ 2.000,00';
 const types=engine.seiBMIndicators(raw).map(x=>x.type);
 assert.ok(types.includes('Valor da Medição (BM)'));
 assert.ok(types.includes('Valor Acumulado (BM)'));
 assert.ok(types.includes('Execução física (%)'));
 assert.ok(!types.some(x=>/Dotação|Empenhado|Pago|Liquidado|PUC recebida/i.test(x)));
});
