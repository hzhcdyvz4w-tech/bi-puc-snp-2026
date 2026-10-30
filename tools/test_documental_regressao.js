/* Testes de regressão do núcleo documental. Executar: node tools/test_documental_regressao.js
   Somente dados sintéticos; não lê nem altera anexos reais do usuário. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');
const engineCode=read('assets/puc-document-engine.js');
const compareCode=read('assets/confronto-documental-v13.js');
const libraryCode=read('assets/biblioteca-puc.js');
const centralCode=read('assets/centralizar-documentos-v16.js');
const html=read('index.html');
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.message)}}
const win={};new Function('window',engineCode)(win);
const engine=win.PUCDocEngine;
test('Classificação de BM efetivo',()=>assert.equal(engine.bmClass('BM_05.pdf','Boletim de Medição nº 05'),'BM IDENTIFICADO'));
test('Despacho que apenas menciona BM não vira BM',()=>assert.equal(engine.bmClass('Despacho.pdf','Despacho menciona Boletim de Medição 05'),'BM MENCIONADO'));
test('Número e competência do BM',()=>{assert.equal(engine.bmNumber('BM_05.pdf','Boletim de Medição nº 05'),'05');assert.equal(engine.bmPeriod('BM_05.pdf','Competência 09/2026'),'2026-09')});
test('Execução financeira percentual não vira reais',()=>{const v=engine.indicators('Execução financeira: 55,3%');assert.equal(v.length,1);assert.equal(v[0].type,'Execução financeira (%)')});
test('Execução financeira monetária explícita',()=>{const v=engine.indicators('Execução financeira: R$ 1.234.567,89');assert.equal(v.length,1);assert.equal(v[0].type,'Execução financeira (R$ candidato)')});
test('Arquivos e seleção PUC centralizados em Documentos',()=>{assert.ok(centralCode.includes('central.appendChild(header)'));assert.ok(centralCode.includes('central.appendChild(select)'));assert.ok(centralCode.includes('central.appendChild(uploads)'));assert.ok(centralCode.includes('docs.insertBefore(central,docs.firstElementChild)'))});
test('Apenas três origens no confronto documental',()=>assert.ok(compareCode.includes("const sources=['SEI','BALANCO','SIOP']")));
test('Importação distinta por origem e confirmação da transação IndexedDB',()=>{assert.ok(libraryCode.includes('x.origin===origin'));assert.ok(libraryCode.includes('tx.oncomplete=()=>resolve(result)'))});
test('Carteira de 12 PUCs sem duplicidade',()=>{const raw=html.match(/<script id="embedded-data" type="application\/json">([\s\S]*?)<\/script>/);assert.ok(raw);const p=JSON.parse(raw[1]).projetos;assert.equal(p.length,12);assert.equal(new Set(p.map(x=>x.id)).size,12)});
const from=compareCode.indexOf('function audit(){'),to=compareCode.indexOf('\nfunction exportReport()',from);
assert.ok(from>=0&&to>from,'Função audit não localizada');
const auditSource=compareCode.slice(from,to).replace('lastPairs=pairs;','setPairs(pairs);');
const els={'puc3-result':{innerHTML:'',dataset:{}}},$=id=>els[id];
const sources=['SEI','BALANCO','SIOP'],projects=[{id:'PUC-01',empreendimento:'Teste sintético'}];
const units={medicao_bm:'R$',execucao_fisica:'%'},label={medicao_bm:'Valor medido',execucao_fisica:'Físico'};
const selected=new Set(['PUC-01']),rows=[],filesForReview=()=>[],esc=x=>String(x),val=x=>String(x),status=()=>{};
let pairs=[];
const audit=new Function('$','sources','projects','units','label','esc','val','selected','filesForReview','status','lastRows','setPairs',auditSource+';return audit')($,sources,projects,units,label,esc,val,selected,filesForReview,status,rows,x=>pairs=x);
const base={project:'PUC-01',indicator:'medicao_bm',value:100,period:'2026-09',cutoff:'2026-09-30',aggregation:'MENSAL',object:'GLOBAL_PROJETO',contract:'123',bmNumber:'05',verified:true,document:'BM05.pdf',reference:'SEI 123'};
function pairTest(name,expected,a,b){test(name,()=>{rows.splice(0,rows.length,a,b);const result=audit().pairs;assert.equal(result[0]?.state||null,expected)})}
pairTest('Valores e escopo iguais: correspondência','CORRESPONDÊNCIA',{...base,source:'SEI'},{...base,source:'BALANCO',bmNumber:'5'});
pairTest('Valor diferente: divergência','DIVERGÊNCIA',{...base,source:'SEI'},{...base,source:'BALANCO',value:150});
pairTest('Número de BM diferente: não comparável','NÃO COMPARÁVEL',{...base,source:'SEI'},{...base,source:'BALANCO',bmNumber:'06'});
pairTest('Data de corte diferente: não comparável','NÃO COMPARÁVEL',{...base,source:'SEI'},{...base,source:'BALANCO',cutoff:'2026-10-01'});
pairTest('Sem conferência: não comparável','NÃO COMPARÁVEL',{...base,source:'SEI',verified:false},{...base,source:'BALANCO'});
pairTest('BM não pode ser confrontado com SIOP','NÃO COMPARÁVEL',{...base,source:'SEI'},{...base,source:'SIOP'});
pairTest('DOCAS antiga não integra as três fontes',null,{...base,source:'SEI'},{...base,source:'DOCAS'});
pairTest('Indicadores distintos não geram par',null,{...base,source:'SEI'},{...base,source:'BALANCO',indicator:'execucao_fisica'});
test('Sem PUC selecionada não gera conclusão',()=>{selected.clear();rows.splice(0,rows.length,{...base,source:'SEI'},{...base,source:'BALANCO'});assert.equal(audit().pairs.length,0);selected.add('PUC-01')});
console.log('Resultado:',passed,'aprovados;',failed,'falhas');
if(failed)process.exitCode=1;