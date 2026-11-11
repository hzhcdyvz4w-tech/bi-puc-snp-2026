// Teste da Curva S documental — sem dados institucionais.
// Rodar na raiz: node --test tests/curva-s-documental.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../assets/puc-curva-sei-v1.js',import.meta.url),'utf8');
const item=(str,x,y)=>({str,transform:[1,0,0,1,x,y]});
function pdfItems(){
 const result=[];
 for(let i=0;i<4;i++)result.push(item('BM '+String(i).padStart(2,'0'),180+i*170,750));
 for(let i=0;i<4;i++)result.push(item(String(i*30),180+i*170,742));
 const offsets=[34,61,88,115,150,178,206,232];
 const sets=[
  [0,100,200,300],[0,80,170,270],[0,100,300,600],[0,80,250,520],
  [0,10,15,25],[0,8,14,20],[0,10,25,50],[0,8,22,45]
 ];
 for(let row=0;row<sets.length;row++)for(let i=0;i<4;i++)
  result.push(item(String(sets[row][i]).replace('.',',')+(row>=4?'%':',00'),180+i*170,750-offsets[row]));
 return result;
}
function mock(items=pdfItems()){
 const docs=[
  {id:'one',name:'BM_21_Curva_S.pdf',project:'P1',projects:['P1'],origin:'SEI',bmStatus:'BM IDENTIFICADO',ref:'SEI 123'},
  {id:'two',name:'BM_21_OutroPorto.pdf',project:'P2',projects:['P2'],origin:'SEI',bmStatus:'BM IDENTIFICADO'},
  {id:'three',name:'BM_21_SemVinculo.pdf',origin:'SEI',bmStatus:'BM IDENTIFICADO'}
 ];
 const window={PUCDocLibrary:{
  list:()=>docs,
  getBlob:async()=>({size:500,arrayBuffer:async()=>new Uint8Array([37,80,68,70]).buffer})
 },pdfjsLib:{getDocument:()=>({promise:Promise.resolve({
  numPages:1,
  getPage:async()=>({getTextContent:async()=>({items})}),
  destroy:async()=>{}
 })})}};
 const document={readyState:'loading',addEventListener(){},getElementById(id){
   if(id==='ficha-project')return {value:'P1'};
   if(id==='ficha-contract')return {value:''};
   return null;
 }};
 const localStorage={getItem:()=>null};
 const api=new Function('window','document','localStorage',source+';return window.PUCCurvaSEI')(window,document,localStorage);
 return {api,docs};
}

test('BMs de outra PUC e BMs sem vínculo não integram seleção',()=>{
 const {api}=mock();
 assert.deepEqual(api.selected().map(x=>x.id),['one']);
});

test('previsto e realizado são obtidos da tabela do PDF, sem somar BMs',async()=>{
 const {api,docs}=mock();
 const result=await api.extract(docs[0]);
 assert.equal(result.points.length,4);
 assert.equal(result.points[2].percentualPrevistoAcumulado,25);
 assert.equal(result.points[2].percentualRealizadoAcumulado,22);
 assert.equal(result.points[3].percentualPrevistoAcumulado,50);
 assert.equal(result.points[3].percentualRealizadoAcumulado,45);
 assert.equal(result.points[3].day,90);
 assert.equal(result.warnings.length,0);
});

test('PDF sem tabela histórica não gera percentuais inventados',async()=>{
 const {api,docs}=mock([]);
 await assert.rejects(()=>api.extract(docs[0]),/histórico acumulado insuficiente/i);
});
