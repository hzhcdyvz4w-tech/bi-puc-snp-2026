# BI Executivo PUC — revisão do confronto V6 (28/10/2026)

## Situação anterior

A versão V5 exibia SIOP e permitia registros manuais, mas a comparação não exigia todas as dimensões do consolidado, nem a data de corte e comprovação documental. O upload bruto de Balanço/Docas/SEI servia apenas ao inventário. A planilha SIOP inicial não informa data de extração.

## O que foi implementado

- Registros separados por empreendimento, fonte, indicador, natureza, competência, agregação, unidade, data de corte, contrato e objeto.
- Confronto de registros de fontes diferentes somente quando o indicador é idêntico.
- Status **NÃO COMPARÁVEL** para divergências de atributos (corte, competência, contrato, recorte, agregação, natureza), sem calcular diferença.
- Status **AGUARDANDO EVIDÊNCIA** quando os metadados correspondem mas falta evidência conferida de uma das fontes.
- **DIVERGÊNCIA NUMÉRICA** / **SEM DIVERGÊNCIA NUMÉRICA** apenas para registros conferidos e plenamente equivalentes; tolerância R$ 0,01 ou 0,1 ponto percentual.
- Identificação de ausência de fonte, tabelas de dados e de cruzamentos, exportação CSV DE/PARA e backup/restauração JSON.
- Importação de CSV normalizado dos dados extraídos de Balanço, Docas, SEI e portais oficiais. Valores de terceiros não são publicados no GitHub.
- O SIOP **não** passa a ter data de corte automaticamente: o operador deve conferir e declarar a referência no painel.
- Homologação SNP sempre marcada PENDENTE; nenhuma divergência significa irregularidade automaticamente.

## Limitações deliberadas

- PDFs/ZIP SEI e XLSX brutos do Balanço/Docas continuam inventariados, pois não há extração e mapeamento documental integral em ambiente autorizado.
- A data de extração da Consulta SIOP 2(1).xlsx não é conhecida pelo sistema. Não inventar data.
- Nenhuma sincronização de arquivos locais ou dados de órgãos/Docas ao GitHub. O site é público.
- A validação documental, jurídica e homologação institucional permanecem manuais.

## Formato CSV de importação

Cabeçalho em `MODELO_DEPARA_PUC_5_FONTES.csv`: investimento;fonte;indicador;valor;competencia;unidade;natureza;apuracao;data_corte;contrato;objeto;referencia;conferido;observacao.

Fonte: `SEI`, `BALANCO`, `DOCAS` ou `PORTAL`. Campos obrigatórios: empreendimento existente (`PUC-01` etc.), indicador normalizado, valor numérico, competência `AAAA-MM`, unidade `R$` ou `%`, natureza conforme indicador, apuração `MENSAL` ou `ACUMULADO` e referência. Data de corte e referência são exigidas para marcar `conferido=SIM`. Contrato vazio significa escopo global e só pode ser comparado a outro vazio.

## Critérios e referências

Roteiro de Implantação BI PUC (28/10/2026), Consolidador PUC 5 Fontes (abas DEPARA 4 FONTES e REGRAS 5 FONTES) e script `comparar_5_fontes.py` do Kit de 5 Fontes.
