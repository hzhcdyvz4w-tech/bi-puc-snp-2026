// Regressão: três PUCs da mesma Companhia em um conjunto de acompanhamento.
// Rodar: node --test tests/curva-s-grupo-pucs.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const curva=readFileSync(new URL('../assets/puc-curva-sei-v1.js',import.meta.url),'utf8');
const ficha=readFileSync(new URL('../assets/ficha-bm.js',import.meta.url),'utf8');
const projects=[
 {id:'PUC-01',empresa:'CODERN',uf:'RN',empreendimento:'Energia solar em Natal'},
 {id:'PUC-02',empresa:'CODERN',uf:'RN',empreendimento:'Armazéns de Natal'},
 {id:'PUC-03',empresa:'CODERN',uf:'RN',empreendimento:'Galpões de Natal'},
 {id:'PUC-99',empresa:'SUAPE',uf:'PE',empreendimento:'Outra Companhia'}
];
test('múltiplas PUCs restringem a seleção à Companhia da PUC principal',()=>{
 const start=ficha.indexOf('const extraProjects=new Set();');
 const end=ficha.indexOf('function updateProjects(){',start);
 assert.ok(start>=0&&end>start);
 const source=ficha.slice(start,end);
 const f=new Function('data','$f','ef','document','CustomEvent',source+
  '; extraProjects.add("PUC-02"); extraProjects.add("PUC-03"); extraProjects.add("PUC-99"); return selectedProjectIds();');
 const ids=f({projetos:projects},id=>id==='ficha-project'?{value:'PUC-01'}:null,
  String,{},function(){});
 assert.deepEqual(ids,['PUC-01','PUC-02','PUC-03']);
});

test('a mesma tela produz curvas distintas e não mistura contratos de PUCs diferentes',async()=>{
 const chosen=['PUC-01','PUC-02','PUC-03'],docs=[],bmRows=[];
 chosen.forEach((id,i)=>{
  for(let n=1;n<=2;n++){
   const did=id+'-'+n,contract='0'+(i+1)+'/2025';
   docs.push({id:did,name:'BM '+n+' '+id+'.pdf',project:id,
    origin:'SEI',bmStatus:'BM IDENTIFICADO',bmNumber:String(n),text:'CONTRATO: '+contract});
   bmRows.push({project:id,sourceDocId:did,number:String(n),contract,
    physical:10*(i+1)+n*3,status:'confirmado',date:'2026-0'+(n+3)+'-01'});
  }
 });
 docs.push({id:'foreign',name:'BM 01 SUAPE.pdf',project:'PUC-99',origin:'SEI',bmStatus:'BM IDENTIFICADO'});
 const fields={
  'ficha-project':{value:'PUC-01'},'ficha-contract':{value:''},
  'puc-curva-documental':{innerHTML:'',replaceChildren(){this.innerHTML=''}},
  'puc-curva-document-status':{textContent:''},
  'puc-curva-bms-counter':{textContent:''},
  'puc-curva-bms-list':{innerHTML:''},
  'puc-curva-bms-search':{value:''},
  'ficha-print-area':{hidden:false},
  'embedded-data':{textContent:JSON.stringify({projetos:projects})}
 };
 const window={
  PUCDocLibrary:{list:()=>docs,getBlob:async()=>null},
  PUCFichasBM:{selectedProjectIds:()=>chosen,getState:()=>({bmRows}),
    parseBmText:()=>({})}
 };
 const document={readyState:'loading',addEventListener(){},
  getElementById:id=>fields[id]||null};
 const api=new Function('window','document','localStorage',
  curva+';return window.PUCCurvaSEI;')(window,document,{getItem:()=>null});
 assert.equal(api.selected().length,6,'não selecionar o documento de outra Companhia');
 await api.render();
 const html=fields['puc-curva-documental'].innerHTML;
 assert.equal((html.match(/class="puc-curva-report"/g)||[]).length,3);
 assert.equal((html.match(/<svg class="puc-curva-svg"/g)||[]).length,3);
 for(const id of chosen)assert.ok(html.includes(id));
 assert.ok(!html.includes('SUAPE'));
 assert.ok(html.includes('não são somados'));
 assert.match(fields['puc-curva-document-status'].textContent,/3 curva\(s\)/);
});
