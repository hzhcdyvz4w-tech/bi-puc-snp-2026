# Ficha de obra e Curva S — V8

## Fluxo operacional

1. Abrir **Fichas e Curva S** e escolher Companhia Docas e empreendimento cadastrado (a carteira PUC não é ampliada automaticamente).
2. Selecionar o ZIP exportado do SEI ou PDFs individuais; clicar em **Localizar BMs no processo**. São exibidos **candidatos** identificados por nome do arquivo e/ou texto do PDF. PDFs sem texto pesquisável são sinalizados; não há OCR.
3. Conferir **cada BM** com o original: número, data, contrato, evolução física *acumulada*, valor medido no período, medido acumulado e documento SEI; clicar em **Conferir**. Um BM não conferido não alimenta a curva.
4. Inserir **Balanço externo** via XLSX/CSV (escolhendo a aba/linha sugerida) ou formulário: valor global do empreendimento, execução física, execução financeira, início, término previsto/efetivo, corte e referência. Conferir antes de gravar.
5. Opcional: importar CSV do cronograma físico aprovado, com competência e percentual acumulado previsto. A curva S não é forçada a assumir um perfil desejado: mostra a série real disponível, sem interpolação de meses ausentes.
6. Examinar a ficha e alertas: percentuais, tempo de vigência consumido, BMs, histórico, referência documental. Para PDF, use **Imprimir ficha / PDF**.
7. Salvar **Sessão da ficha (JSON)** em local autorizado. A importação, os BMs e o Balanço não são persistidos no servidor nem sincronizados com GitHub.

## Regras da Curva S

- O eixo x corresponde à **competência da medição** (AAAA-MM); o eixo y, à execução física acumulada de 0% a 100%.
- Cada ponto real depende de BM com data e percentual acumulado **conferidos pelo operador**; os valores não são inferidos de empenhos/pagamentos SIOP nem dos financeiros dos BMs.
- A série prevista aparece apenas se os percentuais acumulados forem informados em CSV, conforme cronograma oficial; não há planejamento linear inventado.
- Quando dois contratos têm BMs diferentes, deve-se selecionar um contrato; nunca se somam percentuais físicos de contratos diferentes.
- Dois BMs com mesmo contrato, número e data exigem revisar eventual retificação; BMs do mesmo mês são sinalizados.
- Se o BM apresentar regressão do percentual acumulado, o gráfico preserva o valor informado e o sistema indica anomalia. Falta de medições não vira execução zero.
- O somatório de BMs da sessão é classificado como **parcial**, a menos que a completude seja comprovada externamente.

## Balanço × SEI × SIOP

| Indicador | Origem | Uso |
|---|---|---|
| Executado físico acumulado (%) | BM do SEI | Curva S real, por contrato |
| Medido no período e medido acumulado (R$) | BM do SEI | Execução contratual, não pagamento da União |
| Valor global da obra | Balanço | Contexto financeiro do empreendimento |
| Físico executado (%) | Balanço | Comparação **indicativa** com último BM, apenas se mesmo escopo e mesma competência, fontes conferidas |
| Financeiro executado (%) | Balanço | Indicador independente; não representa avanço físico |
| Início/fim da obra | Balanço | Cálculo do percentual de tempo decorrido, se houver data de corte |
| Dotação/empenho/liquidação/pago | Consulta SIOP 2 | Dados orçamentários, não substituem medição física ou pagamento contratual |

**Registro de referência visual:** planilha-modelo de Suape recebida na conversa. Seus números não são importados automaticamente, pois a imagem não substitui o documento oficial e Suape não deve ser cadastrado na carteira PUC por mera referência visual.

## Implementação e segurança

O repositório e o site GitHub Pages são **públicos**. O JavaScript de processamento da ficha é estático e trata arquivos selecionados **no navegador**, sem requisição ao GitHub. **PDF.js 3.11.174** é carregado por CDN (script de terceiros); em ambiente institucional, seu uso requer autorização da área de TI. Caso a CDN esteja bloqueada, PDFs com texto comprimido não serão extraídos automaticamente; use o extrator **local** `tools/extrair_bms_sei.py`, que exige Python + PyMuPDF, e importe seu CSV candidato no sistema. Nunca envie ZIP SEI, CSVs preenchidos, JSONs de sessão, Balanços privados ou documentos oficiais sem autorização institucional.

O extrator não realiza OCR, não atesta veracidade de BM e limita arquivos/páginas para evitar sobrecarga. A identificação é **heurística** e pode deixar de reconhecer BMs de PDF sem marcação ou formulários atípicos. Conferência humana e homologação técnica/financeira da SNP continuam obrigatórias.
