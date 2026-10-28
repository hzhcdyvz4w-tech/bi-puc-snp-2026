# BI Executivo PUC — V7 · Relatório crítico por empreendimento

**SNP/MPOR — 28 de outubro de 2026**

## Módulos

1. **Visão Geral** — execução da União segundo a Consulta SIOP 2, identificada por ação e plano orçamentário.
2. **Base SIOP** — filtros encadeados, pesquisa, exportação e importação posterior de consulta XLSX no mesmo leiaute.
3. **Projetos PUC** — carteira referencial, com vínculos SIOP classificados como preliminares.
4. **Confronto das fontes** — comparação DE/PARA estrita de indicadores equivalentes; formulário de evidências conferidas, cronograma com início/fim, salvamento/restauração JSON.
5. **Docas** — filtros encadeados Companhia → Empreendimento, busca, origem dos registros, documentos e atalho para relatório.
6. **Relatório Crítico** — execução física, execução financeira, datas, valores do empreendimento, achados e conclusão *preliminar*. Impressão e exportação CSV.
7. **Documentos** — anexação e inventário de arquivos locais, CSV de evidências normalizadas e CSV/ZIP contendo `cronograma_puc.csv`.

## Fluxo de uso

1. Abra `index.html` no navegador ou GitHub Pages.
2. Em **Docas**, escolha a Companhia e o Empreendimento; use **Relatório** para abrir a ficha crítica.
3. Em **Confronto das fontes**, informe as execuções físicas (%) observadas nos BMs/SEI, Balanço ou declaração da Docas; informe valores medidos/pagos pelos BMs, execução financeira do Balanço e valor global do empreendimento com referência documental e data de corte.
4. Em **Confronto das fontes → Registrar datas e cronograma**, informe início, término previsto e término efetivo; ou importe o modelo CSV no menu **Documentos**. Cronogramas no SEI ZIP somente são convertidos automaticamente quando o ZIP contém um arquivo `cronograma_puc.csv` com as colunas esperadas.
5. Acesse **Relatório Crítico** → Companhia → Empreendimento → **Gerar relatório**. Use **Exportar achados CSV** ou **Imprimir / salvar PDF** do navegador. A conclusão permanece não homologada pela SNP.
6. Para preservar dados informados na sessão, clique em **Confronto das fontes → Salvar sessão auditável (JSON)** e armazene o arquivo de forma autorizada e protegida. Não carregue esse JSON em repositório público.

## Distinções necessárias

- **SIOP**: a planilha `Consulta SIOP 2(1).xlsx` incorpora dotação, empenho, liquidação e pagamento, mas **não execução física**. Data de corte original não informada.
- **BMs no SEI**: valores medidos e pagamentos contratuais são distintos de execução orçamentária e financeira da União.
- **Balanço**: percentual físico, execução financeira, valor global, datas de início/término são campos a comprovar; a base referencial não equivale a recursos PUC efetivamente recebidos.
- **Docas**: declaração de valores recebidos/aplicados deve ser registrada por projeto, competência, natureza e documento.
- **DE/PARA**: números divergentes só geram classificação de diferença quando indicadores, unidades, escopos, cortes, competências, contratos e etapas coincidem e os documentos foram conferidos.
- **Cronograma**: a comparação de datas exige comprovação documental e o mesmo contrato/objeto. Divergência de datas pode decorrer de aditivos ou versões distintas.

## Segurança e limites

O repositório e o GitHub Pages são **públicos**. Não publique planilhas do Balanço interno, relatórios SEI, formulários preenchidos das Docas, anexos ou backups de sessões sem avaliação e autorização institucional. O `index.html` processa informações do operador **apenas em memória**, não tem login, banco de dados, backend, extração certificada de PDF, nem conexão automática às APIs SIOP ou SEI. O upload de PDF, DOCX e ZIP bruto (fora do CSV padronizado) apenas inventaria arquivos e não gera automaticamente dados comprovados.

**Homologação técnica, financeira e jurídica da SNP: pendente.**

Consulte `docs/GUIA_RELATORIO_CRITICO_V7.md` para campos, fontes e mapeamento dos indicadores.
