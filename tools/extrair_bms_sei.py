#!/usr/bin/env python3
"""Leitor auxiliar LOCAL de BMs em ZIP do SEI; saída CSV para revisão humana.

Usar SOMENTE em computador/ambiente autorizado. Não conecta ao GitHub/Internet.
Os campos propostos são heurísticos e nunca representam validação técnica.
Dependência: pip install pymupdf
Uso: python extrair_bms_sei.py processo_sei.zip PUC-01 --saida bms_para_conferencia.csv
"""
from __future__ import annotations
import argparse
import csv
import io
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
try:
 import fitz
except ImportError:
 print('PyMuPDF não instalado. Execute: pip install pymupdf',file=sys.stderr)
 raise SystemExit(2)

def norm(v: str) -> str:
 return ''.join(c for c in unicodedata.normalize('NFKD', v) if not unicodedata.combining(c)).upper()

def is_bm_name(name: str) -> bool:
 return bool(re.search(r'(^|[^A-Z0-9])BM[ _.-]*(?:N[O.]*)?[ _.-]*\d{1,4}([^A-Z0-9]|$)|BOLETIM[ _.-]*DE[ _.-]*MEDI|RELATORIO[ _.-]*DE[ _.-]*MEDI',norm(name)))

def is_bm_text(txt: str) -> bool:
 return bool(re.search(r'BOLETIM\s+DE\s+MEDI[CÇ][AÃ]O|\bBM\s*N?[º°. ]*\d{1,4}\b|RELAT[OÓ]RIO\s+DE\s+MEDI[CÇ][AÃ]O',txt,re.I))

def find(text: str,*patterns: str) -> str:
 for rexp in patterns:
  m=re.search(rexp,text,re.I)
  if m: return m.group(1).strip()
 return ''

def date_iso(v: str) -> str:
 m=re.search(r'(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})',v)
 return f'{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}' if m else ''

def fields(text: str,name: str,ref: str) -> dict[str,str]:
 body=' '.join(text.split())
 m=re.search(r'(?i)(?:boletim\s+de\s+medi[cç][aã]o|\bBM)\s*(?:n[º°o.]*)?\s*[:\-]?\s*(\d{1,4})',body)
 num=m.group(1) if m else find(name,r'BM[ _.\-]*(\d{1,4})')
 return {'numero_bm':num,'data_medicao':date_iso(find(body,r'(?:data\s+da\s+medi[cç][aã]o|data\s+do\s+boletim|refer[eê]ncia)\s*[:\-]?\s*(\d{1,2}[/.\-]\d{1,2}[/.\-]20\d{2})')),
  'contrato':find(body,r'contrato\s*(?:n[º°o.]*(?::)?|n[úu]mero|:)\s*([\d./\-A-Z]{3,32})'),
  'fisico_acumulado_pct':find(body,r'(?:execu[cç][aã]o\s+f[ií]sica\s+(?:total\s+)?acumulada|avan[cç]o\s+f[ií]sico\s+acumulado|percentual\s+(?:f[ií]sico\s+)?acumulado|f[ií]sico\s+acumulado)\s*[:\-=]?\s*(\d{1,3}(?:[,.]\d{1,3})?)\s*%'),
  'valor_medido_periodo':find(body,r'(?:valor\s+(?:desta|da|do)\s+medi[cç][aã]o|valor\s+medido\s+(?:no\s+)?per[ií]odo)\s*[:\-]?\s*(?:R\$\s*)?([\d.,]+)'),
  'valor_medido_acumulado':find(body,r'(?:valor\s+(?:medido\s+)?acumulado)\s*[:\-]?\s*(?:R\$\s*)?([\d.,]+)'),
  'documento_sei':ref,
 }

def main():
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('zip',type=Path)
 ap.add_argument('investimento',help='ID do BI PUC, exemplo PUC-01')
 ap.add_argument('--saida',type=Path,default=Path('bms_para_conferencia.csv'))
 ap.add_argument('--scan-genericos',action='store_true',help='Verificar texto de PDFs sem BM no nome')
 args=ap.parse_args()
 if not args.zip.is_file(): ap.error('ZIP do SEI não encontrado')
 names=['investimento','numero_bm','data_medicao','contrato','fisico_acumulado_pct','valor_medido_periodo','valor_medido_acumulado','documento_sei']
 result=[];skipped=0;scanned=0
 with zipfile.ZipFile(args.zip) as z:
  pdfs=[info for info in z.infolist() if not info.is_dir() and info.filename.lower().endswith('.pdf')]
  if len(pdfs)>350: print('Atenção: análise limitada a 350 PDFs',file=sys.stderr)
  for info in pdfs[:350]:
   candidate=is_bm_name(info.filename)
   if not candidate and not args.scan_genericos: skipped+=1;continue
   if info.file_size>24*1024*1024: print('Ignorado PDF >24 MB:',info.filename,file=sys.stderr);skipped+=1;continue
   try:
    with z.open(info) as fh: blob=fh.read(24*1024*1024+1)
    doc=fitz.open(stream=blob,filetype='pdf');pages=[]
    for page in list(doc)[:10]: pages.append(page.get_text('text'))
    txt='\n'.join(pages);doc.close();scanned+=1
    if not candidate and not is_bm_text(txt): skipped+=1;continue
    row=fields(txt,info.filename,f'{args.zip.name}!{info.filename}')
    result.append({'investimento':args.investimento,**row})
   except Exception as exc:
    print(f'PDF não processado ({info.filename}): {exc}',file=sys.stderr)
 args.saida.parent.mkdir(parents=True,exist_ok=True)
 with args.saida.open('w',newline='',encoding='utf-8-sig') as f:
  writer=csv.DictWriter(f,fieldnames=names,delimiter=';');writer.writeheader();writer.writerows(result)
 print(f'PDFs examinados: {scanned}; BMs candidatos: {len(result)}; ignorados: {skipped}.')
 print(f'CSV criado em {args.saida.resolve()}. Revise todos os campos antes de usar o BI. PDFs digitalizados exigem análise manual.')
if __name__=='__main__':main()
