# BI PUC — Relatório Analítico por fonte (SEI, Balanço e DOCAS)

**Data de implantação:** 16/11/2026  
**Local:** menu **Relatório Analítico** da página principal.  
**Arquivos:** `index.html` e `assets/puc-relatorio-fontes-v1.js`.

## Seletor de fontes

O operador escolhe a Companhia, o empreendimento e uma das opções:

- **Todas as fontes — relatório consolidado**: SEI/BMs, Balanço e DOCAS, com SIOP somente como referência orçamentária;
- **Processos SEI — Boletins de Medição**: documentos principais elegíveis, indicadores extraídos, BMs vinculados à PUC e status de conferência;
- **Balanço — execução do empreendimento**: ficha estruturada e arquivos do Balanço vinculados, além das possíveis correspondências identificadas com a ressalva de que similaridade textual não comprova vínculo;
- **DOCAS — formulários recebidos**: respostas carregadas pela Central DOCAS mediante token de gestor autenticado, vinculadas pela Companhia, UF e identificação exata do empreendimento ou ID GOV/PAC comprovado.

Os blocos SEI e Balanço podem reunir documentos armazenados na biblioteca IndexedDB do **mesmo navegador**. A área DOCAS recebe dados da variável gerencial sincronizada pelo próprio módulo autenticado do Supabase; **o relatório não possui endpoint público nem token de acesso em sua implementação**.

## Estrutura do relatório

O gerador apresenta:
1. Identificação, objeto, Companhia, UF, ação/PO e recorte;
2. Escopo e metodologia;
3. Análise documental por fonte, com tabelas de dados, identificadores, comprovantes e situação de conferência;
4. Execução física; 
5. Valores do investimento, medições e execução financeira;
6. Cronogramas e marcos documentais;
7. Confrontos admissíveis, pendências e lacunas;
8. Fundamentação normativa — **pendente de vinculação** dos textos legais fornecidos pelo usuário;
9. Conclusão analítica preliminar e sugestões de providências.

O operador pode imprimir/salvar o relatório em PDF pelo botão que já existia. A exportação de achados em CSV respeita a fonte selecionada.

## Critérios de evidência e segurança

- Nunca usar dados da PUC-03 para a PUC-02 com base somente em proximidade de nome.
- SEI analisa exclusivamente os BMs e planilhas principais já admitidos pelo filtro de biblioteca, sem anexos processuais.
- Os registros associados à ficha são classificados como **conferidos** ou **a conferir**, e valores candidatos da extração documental são identificados como tais.
- As possíveis correspondências do Balanço são exibidas **separadamente**, como hipóteses de vínculo.
- DOCAS só mostra os detalhes de respostas externas se a Central DOCAS estiver autorizada; ao encerrar a sessão, o gerenciador limpa os dados das respostas.
- Comparações entre fontes exigem equivalência de objeto, contrato, competência, unidade, indicador, agregação e data de corte. Dotação, empenho e pagamento da União não comprovam execução física nem desembolso realizado pela Docas.
- A ausência de dados carregados é registrada como pendência de evidência, **não como inexistência do documento**.
- Nenhum parecer jurídico, artigo, dever, prazo legal ou sanção é criado automaticamente.

## Pendência: legislações a receber

O usuário informou que encaminhará a legislação de suporte posteriormente. Por isso, a seção normativa é exibida como **pendente** e não cita artigos não verificados. A próxima etapa é examinar os textos exatos e ligar a cada achado: norma, redação aplicável, artigo, condição de incidência, referência oficial e eventual diligência administrativa.

## Testes realizados

- Teste de sintaxe do script JavaScript.
- Testes com fontes fictícias: opção SEI, Balanço, DOCAS e consolidado.
- Documento de PUC externa foi excluído de todos os resultados.
- Acesso DOCAS autorizado exibiu apenas o protocolo correspondente a Companhia, UF e empreendimento; sessão não autorizada impediu leitura da declaração externa.
- Exportação por fonte testada em simulação.
- Código de regressão registrado em `tests/relatorio-fontes-analiticas.test.mjs`.
- GitHub Pages respondeu **HTTP 200** para a página principal e o script, com o novo seletor no HTML e o módulo disponível.

**Limite:** os testes usaram dados fictícios. A homologação com o acervo real (BM, Balanço e protocolos recebidos da Central DOCAS), sobretudo identificação de contratos e dados de legislação ainda não enviada, deve ser realizada na sessão do gestor.
