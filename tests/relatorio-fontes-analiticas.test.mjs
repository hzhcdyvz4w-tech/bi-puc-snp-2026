// BI PUC — regressão do relatório por fonte (SEI, Balanço, DOCAS).
// Rodar com: node --test tests/relatorio-fontes-analiticas.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../assets/puc-relatorio-fontes-v1.js',import.meta.url),'utf8');
function fixture(){
 const nodes={
  'report-project':{value:'PUC-02'},
  'report-source':{value:'TODAS'},
  'critical-report':{innerHTML:''},
  'report-summary':{textContent:''},
  'pdc-admin':{hidden:false},
  'relatorio':{classList:{contains:()=>false}}
 };
 const doc={getElementById:id=>nodes[id]||null};
 const w={
  addEventListener(){},
  PUCDocLibrary:{list:()=>[
   {id:'sei',origin:'SEI',project:'PUC-02',name:'BM 01.pdf',bmStatus:'BM IDENTIFICADO',ref:'EVIDENCIA-SEI'},
   {id:'foreign',origin:'SEI',project:'PUC-03',name:'BM indevido.pdf',bmStatus:'BM IDENTIFICADO',ref:'NUNCA_EXIBIR'},
   {id:'balance',origin:'BALANCO',project:'PUC-02',name:'Balanço oficial.xlsx',ref:'EVIDENCIA-BALANCO'}
  ]},
  PUCFichasBM:{getState:()=>({bmRows:[{project:'PUC-02',number:'01',status:'confirmado',physical:20,evidence:'EVIDENCIA-SEI'}],
   balances:{'PUC-02':{global:100,physical:20,evidence:'EVIDENCIA-BALANCO'}}})},
  PUC_DOCAS_DECLARACOES_EXTERNAS:[
   {companhia_codigo:'CODERN',companhia_nome:'Companhia Docas do Rio Grande do Norte',
    uf:'RN',empreendimento:'Recuperação Armazéns',protocolo:'EVIDENCIA-DOCAS',status:'recebida'},
   {companhia_codigo:'CDP',companhia_nome:'Companhia Docas do Pará',uf:'PA',
    empreendimento:'Outra obra',protocolo:'NUNCA_EXIBIR'}
  ],PUCCorrelacao:{balancoRows:()=>[],projectSuggestions:()=>[]}
 };
 const ctx={
  buildCritical:()=>({p:{id:'PUC-02',empresa:'CODERN',uf:'RN',empreendimento:'Recuperação Armazéns'},
   rows:['SEI','BALANCO','DOCAS','SIOP'].map(source=>({source,indicator:'execucao_fisica'})),
   audits:[{source_a:'SEI',source_b:'BALANCO',indicator:'execucao_fisica',
    status:'NÃO COMPARÁVEL',reason:'Cortes diferentes'}],slist:[],files:[],findings:[]}),
  renderRecords:rr=>'<p>'+rr.map(x=>x.source).join(', ')+'</p>',
  renderAudit:arr=>'<p>'+arr.length+' confronto(s)</p>',
  renderSchedules:()=>'<p>Nenhum cronograma</p>',
  sourceLabel:s=>s,REPORT_PHYSICAL:['execucao_fisica'],
  REPORT_FINANCIAL:[],csvDownload:()=>{}
 };
 const api=new Function('window','document',src+';return window.PUCRelatorioFontes')(w,doc);
 return {nodes,api,ctx};
}
test('SEI exibe somente documentos da PUC e fonte selecionada',()=>{
 const f=fixture();f.nodes['report-source'].value='SEI';
 const r=f.api.render(f.ctx),html=f.nodes['critical-report'].innerHTML;
 assert.deepEqual(r.r.selected,['SEI']);
 assert.deepEqual(r.r.filteredRows.map(x=>x.source),['SEI']);
 assert.ok(html.includes('EVIDENCIA-SEI'));
 assert.ok(!html.includes('EVIDENCIA-BALANCO'));
 assert.ok(!html.includes('EVIDENCIA-DOCAS'));
 assert.ok(!html.includes('NUNCA_EXIBIR'));
});
test('Balanço limita-se ao arquivo e aos dados vinculados',()=>{
 const f=fixture();f.nodes['report-source'].value='BALANCO';
 const r=f.api.render(f.ctx),html=f.nodes['critical-report'].innerHTML;
 assert.deepEqual(r.r.filteredRows.map(x=>x.source),['BALANCO']);
 assert.ok(html.includes('EVIDENCIA-BALANCO'));
 assert.ok(!html.includes('EVIDENCIA-SEI'));
 assert.ok(!html.includes('EVIDENCIA-DOCAS'));
});
test('DOCAS exige autorização de gestor e vínculo institucional preciso',()=>{
 const f=fixture();f.nodes['report-source'].value='DOCAS';
 f.api.render(f.ctx);
 assert.ok(f.nodes['critical-report'].innerHTML.includes('EVIDENCIA-DOCAS'));
 assert.ok(!f.nodes['critical-report'].innerHTML.includes('NUNCA_EXIBIR'));
 f.nodes['pdc-admin'].hidden=true;
 f.api.render(f.ctx);
 assert.ok(!f.nodes['critical-report'].innerHTML.includes('EVIDENCIA-DOCAS'));
 assert.match(f.nodes['critical-report'].innerHTML,/token gerencial/i);
});
test('relatório consolidado reúne origens sem somar valores indevidamente',()=>{
 const f=fixture();f.nodes['report-source'].value='TODAS';
 const r=f.api.render(f.ctx),html=f.nodes['critical-report'].innerHTML;
 assert.deepEqual(r.r.selected,['SEI','BALANCO','DOCAS','SIOP']);
 for(const evidence of ['EVIDENCIA-SEI','EVIDENCIA-BALANCO','EVIDENCIA-DOCAS'])
  assert.ok(html.includes(evidence));
 assert.ok(!html.includes('NUNCA_EXIBIR'));
 assert.match(html,/Fundamentação normativa/i);
 assert.match(html,/PENDENTE/);
});
