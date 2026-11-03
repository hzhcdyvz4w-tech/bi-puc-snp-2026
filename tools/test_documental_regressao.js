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

const valuesCode=read('assets/puc-quadro-valores-v18.js');
const vwin={},vdoc={readyState:'loading',addEventListener(){}};
new Function('window','document',valuesCode)(vwin,vdoc);
test('Quadro das quatro fontes preserva ID_governa, UF e natureza de cada valor',()=>{
 const pucs=[{id:'PUC-01',id_governa:'2434',uf:'RN',empreendimento:'Energia Solar Natal'}];
 const docs=[
  {origin:'SEI',name:'Anexo_BM01.pdf',project:'PUC-01',bmNumber:'01',bmStatus:'BM IDENTIFICADO',candidates:[{type:'Valor da Medição (BM)',values:['149.864,28']},{type:'Valor da Medição (%) BM',values:['1,99%']}]},
  {origin:'DOCAS',name:'Declaracao.json',text:JSON.stringify({schema:'BI_PUC_DOCAS_V1',cadastro:{id_governa:'2434',uf:'RN'},grupos:{contratos:[{numero:'123',medido:'149.864,28'}]}})}
 ];
 const result=vwin.PUCQuadroValores.build({balancos:[{id:'2434',uf:'RN',empreendimento:'Energia Solar Natal',valor_global:'7.527.632,53'}],pucs,orcamento:[{id_puc:'PUC-01',empenhado:425959,acao:'00V4',po:'0003'}],documentos:docs});
 assert.equal(result.length,1);
 assert.equal(result[0].id,'2434');
 assert.equal(result[0].uf,'RN');
 assert.equal(result[0].bms[0].amount,'149.864,28');
 assert.equal(result[0].bms[0].pct,'1,99%');
 assert.equal(result[0].balanco.value,'7.527.632,53');
 assert.equal(result[0].siop[0].value,425959);
 assert.equal(result[0].docas[0].value,'149.864,28');
});
test('Sem vínculo por ID ou nome/UF, BM e SIOP não são atribuídos ao empreendimento',()=>{
 const docs=[{origin:'SEI',name:'BM02.pdf',project:'PUC-01',bmStatus:'BM IDENTIFICADO',candidates:[{type:'Valor da Medição (BM)',values:['800,00']}]}];
 const rows=vwin.PUCQuadroValores.build({balancos:[{id:'136989',uf:'RN',empreendimento:'Dragagem do Porto de Natal/RN',valor_global:'25.000.000,00'}],
 pucs:[{id:'PUC-01',uf:'RN',empreendimento:'Energia Solar Natal',id_governa:'2434'}],orcamento:[{id_puc:'PUC-01',empenhado:1000}],documentos:docs});
 assert.equal(rows[0].project,'');assert.equal(rows[0].bms.length,0);assert.equal(rows[0].siop.length,0);
});
test('Valores financeiros só aparecem quando parseáveis, sem coerção de vazio para zero',()=>{
 assert.equal(vwin.PUCQuadroValores.parseMoney('R$ 7.527.632,53'),7527632.53);
 assert.equal(vwin.PUCQuadroValores.parseMoney(''),null);
 assert.equal(vwin.PUCQuadroValores.parseMoney('a conferir'),null);
});

const engine=win.PUCDocEngine;
test('Classificação de BM efetivo',()=>assert.equal(engine.bmClass('BM_05.pdf','Boletim de Medição nº 05'),'BM IDENTIFICADO'));
test('Despacho que apenas menciona BM não vira BM',()=>assert.equal(engine.bmClass('Despacho.pdf','Despacho menciona Boletim de Medição 05'),'BM MENCIONADO'));

test('Cabeçalho de BM em coordenadas PDF: contrato, medição, acumulado e saldo com percentuais',()=>{
 const pdfItems=[
  {str:'VALOR DO CONTRATO',transform:[1,0,0,1,110,720],width:110},
  {str:'VALOR DA MEDIÇÃO',transform:[1,0,0,1,300,720],width:120},
  {str:'VALOR ACUMULADO',transform:[1,0,0,1,510,720],width:130},
  {str:'SALDO DO CONTRATO',transform:[1,0,0,1,735,720],width:130},
  ...[['R$',80],['7.527.632,53',117],['R$',275],['149.864,28',310],['1,99%',448],['R$',495],['149.864,28',535],['1,99%',680],['R$',720],['7.377.768,25',755],['98,01%',900]].map(([str,x])=>({str,transform:[1,0,0,1,x,681],width:String(str).length*7}))
 ];
 const out=engine.bmHeaderFromPDFItems(pdfItems);
 const candidates=engine.indicators(out.lines.join('\n'));
 const values=Object.fromEntries(candidates.map(x=>[x.type,x.values[0]]));
 assert.equal(values['Valor do Contrato (BM)'],'7.527.632,53');
 assert.equal(values['Valor da Medição (BM)'],'149.864,28');
 assert.equal(values['Valor Acumulado (BM)'],'149.864,28');
 assert.equal(values['Saldo do Contrato (BM)'],'7.377.768,25');
 assert.equal(values['Valor da Medição (%) BM'],'1,99%');
 assert.equal(values['Valor Acumulado (%) BM'],'1,99%');
 assert.equal(values['Saldo do Contrato (%) BM'],'98,01%');
});
test('Valores financeiros de BM não são inventados sem quadro contratual identificável',()=>{
 const result=engine.bmHeaderFromPDFItems([{str:'R$ 149.864,28',transform:[1,0,0,1,240,670],width:95}]);
 assert.equal(result.lines.length,0);
});
test('Número e competência do BM',()=>{assert.equal(engine.bmNumber('BM_05.pdf','Boletim de Medição nº 05'),'05');assert.equal(engine.bmPeriod('BM_05.pdf','Competência 09/2026'),'2026-09')});
test('Números de BM em anexos exportados do SEI',()=>{
 for(const [file,number] of [['[065]-10870234_Anexo_BM06_2.pdf','06'],['[064]-10870212_Anexo_BM06_1.pdf','06'],['[018]-10369072_Anexo_2_BM02.pdf','02'],['[010]-10270106_Anexo_4_BM1.pdf','1']])assert.equal(engine.bmNumber(file,''),number,file);
 assert.equal(engine.bmNumber('[145]-11961894_Nota.pdf',''),'','Documento sem BM não recebe número');
 assert.equal(engine.bmPeriod('Anexo_BM06.pdf',''),'','Sem competência explícita, não inventar mês');
});
test('Relação documental mantém seleção do usuário e não inclui quantidade no processo',()=>{
 assert.ok(!compareCode.includes("filterMessage+=' | '+seiZipSelected.size+' documento(s) selecionado(s)'"));
 assert.ok(libraryCode.includes('assignBMContext'));
 assert.ok(libraryCode.includes("(!project||x.project===project)"));
});
test('Execução financeira percentual não vira reais',()=>{const v=engine.indicators('Execução financeira: 55,3%');assert.equal(v.length,1);assert.equal(v[0].type,'Execução financeira (%)')});
test('Execução financeira monetária explícita',()=>{const v=engine.indicators('Execução financeira: R$ 1.234.567,89');assert.equal(v.length,1);assert.equal(v[0].type,'Execução financeira (R$ candidato)')});
test('Documentos sem a seleção de PUCs; seletor opcional no Confronto',()=>{assert.ok(centralCode.includes('projectPicker.appendChild(header)'));assert.ok(centralCode.includes('projectPicker.appendChild(select)'));assert.ok(centralCode.includes('central.appendChild(uploads)'));assert.ok(centralCode.includes('cmp.insertBefore(projectPicker,main)'));assert.ok(centralCode.includes('docs.insertBefore(central,docs.firstElementChild)'))});
test('Apenas três origens no confronto documental',()=>assert.ok(compareCode.includes("const sources=['SEI','BALANCO','DOCAS']")));
test('Importação distinta por origem e confirmação da transação IndexedDB',()=>{assert.ok(libraryCode.includes('x.origin===origin'));assert.ok(libraryCode.includes('tx.oncomplete=()=>resolve(result)'))});
test('Carteira de 12 PUCs sem duplicidade',()=>{const raw=html.match(/<script id="embedded-data" type="application\/json">([\s\S]*?)<\/script>/);assert.ok(raw);const p=JSON.parse(raw[1]).projetos;assert.equal(p.length,12);assert.equal(new Set(p.map(x=>x.id)).size,12)});
const from=compareCode.indexOf('function audit(){'),to=compareCode.indexOf('\nfunction exportReport()',from);
assert.ok(from>=0&&to>from,'Função audit não localizada');
const auditSource=compareCode.slice(from,to).replace('lastPairs=pairs;','setPairs(pairs);');
const els={'puc3-result':{innerHTML:'',dataset:{}}},$=id=>els[id];
const sources=['SEI','BALANCO','DOCAS'],projects=[{id:'PUC-01',empreendimento:'Teste sintético'}];
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
pairTest('SIOP anexado não integra o confronto',null,{...base,source:'SEI'},{...base,source:'SIOP'});
pairTest('DOCAS agora integra o confronto auditável','CORRESPONDÊNCIA',{...base,source:'SEI'},{...base,source:'DOCAS'});
pairTest('Indicadores distintos não geram par',null,{...base,source:'SEI'},{...base,source:'BALANCO',indicator:'execucao_fisica'});
test('Sem PUC selecionada não gera conclusão',()=>{selected.clear();rows.splice(0,rows.length,{...base,source:'SEI'},{...base,source:'BALANCO'});assert.equal(audit().pairs.length,0);selected.add('PUC-01')});
console.log('Resultado:',passed,'aprovados;',failed,'falhas');
if(failed)process.exitCode=1;