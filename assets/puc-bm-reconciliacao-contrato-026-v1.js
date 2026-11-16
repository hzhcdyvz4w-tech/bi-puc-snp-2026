/* Conciliação BM/SEI — Contrato CODERN 026/2025.
   Somente dados já presentes no IndexedDB do navegador. Sem upload externo.
   15 documentos = versões acumuladas, não 15 medições independentes.
   Reconcilia as rubricas 162W/162X/162V com os três objetos da carteira PUC,
   preservando base e reajuste em séries distintas. */
(function(w){
 'use strict';
 const map={
  '2434':{code:'V',puc:'PUC-01',label:'Instalação de Usina Fotovoltaica',rubrica:'162V'},
  '2435':{code:'W',puc:'PUC-02',label:'Reforma dos Armazéns 1 e 2',rubrica:'162W'},
  '2436':{code:'X',puc:'PUC-03',label:'Reforma dos Galpões 1 e 2',rubrica:'162X'}
 };
 const html=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
 const brl=x=>typeof x==='number'?(x/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não extraído';
 const clean=v=>String(v||'').trim().toUpperCase();
 const moneyTokens=/-?R\$\s*(?:[\d.]+,\d{2}|-)/g;
 const docNumber=d=>{const m=String(d.name||'').match(/-\s*(\d{7,10})_/);return m?Number(m[1]):0};
 const contractDoc=d=>d?.origin==='SEI'&&/CONTRATO\s*(?:N[º°.]?\s*)?026\/2025/i.test(String(d.text||'').slice(0,900))&&/PORTO DE NATAL/i.test(String(d.text||'').slice(0,900));
 function toCents(v){
  if(/R\$\s*-$/.test(v))return 0;
  const m=String(v).match(/(-?)R\$\s*([\d.]+),(\d{2})/);
  if(!m)return null;
  return (m[1]==='-'?-1:1)*(Number(m[2].replace(/\./g,''))*100+Number(m[3]));
 }
 function parseRow(d,letter){
  const lines=String(d.text||'').split('\n');
  const prefix='30.68212.26.784.3105.162'+letter;
  const pos=lines.findIndex(x=>x.trim().startsWith(prefix));
  if(pos<0)return null;
  let line=lines[pos];
  if(letter==='V'&&/Usina\s*$/.test(line))line+=' '+String(lines[pos+1]||'');
  if(!line.includes('R$')&&lines[pos+1])line+=' '+lines[pos+1];
  const percent=line.lastIndexOf('%');
  if(percent<0)return null;
  const tokens=line.slice(percent+1).match(moneyTokens)||[];
  const nums=tokens.map(toCents);
  if(nums.some(x=>x===null)||nums.length<4)return null;
  return {monthly:nums.slice(0,-2),acc:nums.at(-2),balance:nums.at(-1)};
 }
 let cacheKey='',cache=null;
 function compute(){
  const docs=(w.PUCDocLibrary?.list?.()||[]).filter(contractDoc);
  const signature=docs.map(d=>String(d.id)+'/'+String(d.hash||'')+'/'+String(d.text||'').length).sort().join('|');
  if(cacheKey===signature)return cache;
  cacheKey=signature;
  const sheets=docs.filter(d=>/Planilha\.pdf$/i.test(d.name||''));
  const regular=sheets.filter(d=>!/(VALORES MEDIDOS PARA O REAJUSTE|CONTRATO Nº 026\/2025\s*-\s*REAJUSTE)/i.test(String(d.text||'').slice(0,900))).sort((a,b)=>docNumber(b)-docNumber(a));
  const adjusted=sheets.filter(d=>/(VALORES MEDIDOS PARA O REAJUSTE|CONTRATO Nº 026\/2025\s*-\s*REAJUSTE)/i.test(String(d.text||'').slice(0,900))).sort((a,b)=>docNumber(b)-docNumber(a));
  if(!regular.length||!adjusted.length){cache={ok:false,reason:'Planilha base e/ou de reajuste do contrato 026/2025 indisponível',documents:docs.length};return cache;}
  const base=regular[0],reaj=adjusted[0],byCode={};
  for(const [id,def] of Object.entries(map)){
   const b=parseRow(base,def.code),r=parseRow(reaj,def.code);
   if(!b||!r||b.monthly.length<14||r.monthly.length<4){
    cache={ok:false,reason:'Rubrica '+def.rubrica+' incompleta',documents:docs.length};return cache;
   }
   const checked=(nums,acc)=>nums.reduce((x,y)=>x+y,0)===acc;
   if(!checked(b.monthly,b.acc)||!checked(r.monthly,r.acc)){
    cache={ok:false,reason:'Total do documento não confere para '+def.rubrica,documents:docs.length};return cache;
   }
   const entries=Array.from({length:14},(_,j)=>{
    const vBase=b.monthly[j]||0, vReaj=j>=10?(r.monthly[j-10]||0):0;
    return {bm:'BM'+String(j+1).padStart(2,'0'),number:j+1,baseCents:vBase,reajCents:vReaj,totalCents:vBase+vReaj,competencia:'Não identificada nas planilhas'};
   });
   byCode[id]={...def,idGoverna:id,baseCents:b.acc,reajCents:r.acc,totalCents:b.acc+r.acc,entries};
  }
  // Versiones históricas servem somente para conferir, não são somadas.
  let checkedValues=0,conflicts=[];
  for(const prev of regular.slice(1)){
   for(const [id,def] of Object.entries(map)){
    const old=parseRow(prev,def.code);
    if(!old)continue;
    for(let j=0;j<Math.min(14,old.monthly.length);j++){
     const n=old.monthly[j];
     if(n!==0){checkedValues++;if(n!==byCode[id].entries[j].baseCents)conflicts.push(prev.name+' '+def.rubrica+' BM'+(j+1));}
    }
   }
  }
  if(conflicts.length){cache={ok:false,reason:'Inconsistência entre versões: '+conflicts.slice(0,3).join(', '),documents:docs.length};return cache;}
  // BM03 detalhado, quando disponível, confirma o total do contrato naquela medição.
  const bm03=docs.find(d=>/Boletim\.pdf$/i.test(d.name||'')&&d.bmPeriod==='2025-11');
  let bm03Check='Sem documento individual identificado';
  if(bm03){
   const totals=(bm03.candidates||[]).filter(c=>c.type==='Valor da Medição (BM)').flatMap(c=>c.values||[]).map(v=>toCents('R$ '+v));
   const expected=Object.values(byCode).reduce((a,x)=>a+x.entries[2].baseCents,0);
   bm03Check=totals.includes(expected)?'Coincidente com o boletim individual da 3ª medição':'Sem comprovação adicional pelo BM individual';
  }
  const overall=Object.values(byCode).reduce((a,x)=>a+x.totalCents,0);
  cache={ok:true,contract:'026/2025',documents:docs.length,baseDocument:base.name,reajDocument:reaj.name,
   baseSEI:docNumber(base),reajSEI:docNumber(reaj),rows:byCode,checkedValues,
   bm03Check,overall,source:'Texto extraído de planilhas SEI locais. Associação por contrato, objeto e rubrica. Necessita homologação pela SNP.',
   status:'conciliação técnica documental, não homologada'};
  return cache;
 }
 function resolve(row){
  const id=String(row?.id||row?.id_governa||'').trim();
  if(clean(row?.uf)!=='RN'||!map[id])return null;
  const d=compute();return d?.ok?d.rows[id]:null;
 }
 function forProject(projectId){
  const d=compute();if(!d?.ok)return null;
  return Object.values(d.rows).find(x=>x.puc===projectId)||null;
 }
 function breakdown(x){
  return '<details class="puc-bm-reconciliado"><summary>14 medições por BM · base e reajuste separados</summary>'+
   '<div style="overflow-x:auto"><table class="data-table" style="min-width:530px"><thead><tr><th>BM</th><th>Base</th><th>Reajuste</th><th>Total medido</th></tr></thead><tbody>'+
   x.entries.map(v=>'<tr><td>'+html(v.bm)+'</td><td>'+brl(v.baseCents)+'</td><td>'+brl(v.reajCents)+'</td><td><b>'+brl(v.totalCents)+'</b></td></tr>').join('')+
   '</tbody></table></div></details>';
 }
 function cell(row){
  const x=resolve(row),d=compute();if(!x)return null;
  return '<div class="pucq-amount pucq-bm-conciliado"><strong>'+brl(x.totalCents)+'</strong>'+
   '<small><b>Contrato 026/2025 · '+html(x.rubrica)+'</b></small>'+
   '<small>Base BM01–BM14: '+brl(x.baseCents)+'</small>'+
   '<small>Reajuste BM11–BM14: '+brl(x.reajCents)+'</small>'+
   '<small>Fonte SEI: '+html(String(d.baseSEI))+' (base); '+html(String(d.reajSEI))+' (reajuste).</small>'+
   '<small><b>Conciliação documental pela rubrica/objeto; pendente de homologação SNP.</b> Não é valor pago.</small>'+
   breakdown(x)+'</div>';
 }
 function report(projectId){
  const x=forProject(projectId);if(!x)return '';
  const d=compute();
  return '<div class="puc-bm-evidencia"><p><b>Contrato CODERN 026/2025 — '+html(x.label)+
   '</b>. Rubrica documental '+html(x.rubrica)+'.</p><p>Valor base medido: <b>'+brl(x.baseCents)+
   '</b> · reajuste medido: <b>'+brl(x.reajCents)+
   '</b> · total documentado: <b>'+brl(x.totalCents)+'</b>.</p>'+
   '<p>SEI '+html(d.baseSEI)+' e '+html(d.reajSEI)+
   '; '+html(d.bm03Check)+'. Associação técnica por contrato, rubrica e objeto; comprovação administrativa pendente.</p>'+breakdown(x)+'</div>';
 }
 w.PUCBMReconciliado={compute,resolve,forProject,cell,report};
})(window);