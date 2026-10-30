# Auditoria integral do BI Executivo PUC — 30/10/2026

**Escopo:** repositório `hzhcdyvz4w-tech/bi-puc-snp-2026`, interface pública e módulos documentais. **Natureza:** revisão técnica de código, testes unitários e teste funcional em Chrome headless com arquivos sintéticos, sem homologação dos dados de execução da SNP/MPOR.

## Regras preservadas
- Anexação visível **exclusivamente em Documentos**, com três fontes: **SEI/BMs**, **Balanço** e **SIOP anexado**. Seleção de uma, várias ou todas as 12 PUCs nesse mesmo painel.
- Confronto e relatório **somente** a partir de arquivos locais registrados na biblioteca e achados revisados. Base SIOP embutida continua **referencial**, não é confrontada automaticamente.
- Comparação exige mesma PUC, indicador, competência, data de corte, apuração e objeto; para BMs exige número e contrato. Indicadores não orçamentários não são atribuídos ao SIOP como evidência equivalente.
- Documentos reais não são enviados ao GitHub. O repositório recebe somente código, documentação técnica e dados sintéticos de teste.

## Problemas corrigidos nesta auditoria
1. **Feedback invisível no Confronto:** mensagens de erro e sucesso eram exibidas apenas em Documentos após a mudança dos anexos. Adicionado status também no Confronto.
2. **Ajuda contraditória:** orientação antiga mandava anexar na aba Confronto. Painel antigo ocultado; navegação e textos da Ficha/Docas passam a apontar para Documentos.
3. **Armazenamento IndexedDB:** gravação e exclusão passam a aguardar a conclusão da transação; o mesmo arquivo de fontes distintas não é mais eliminado como duplicata da mesma origem.
4. **Falhas de importação:** anexos ignorados por erro, limite ou duplicidade passam a ser indicados no retorno da importação, sem serem contabilizados como importados.
5. **Classificação de achados:** indicador não é pré-selecionado como BM sem comprovação; conferência exige competência e corte, além de contrato e número nos indicadores BM. Percentual fora de 0–100 é recusado.
6. **Equivalência:** número de BM com zero à esquerda é normalizado; objetos ausentes, escopo físico de BM sem contrato, datas distintas, métricas distintas e SIOP sem natureza orçamentária impedem falsa correspondência.
7. **Unidades:** execução financeira em **%** separada de execução financeira em **R$**. Um percentual do Balanço não pode ser interpretado como valor monetário.
8. **Rastreabilidade:** pares e relatórios passaram a apresentar nome de documento, referência, competência, corte, objeto, contrato e número de BM; CSV inclui número de BM e sanitização contra fórmulas.
9. **ZIP/PDF:** pré-verificação de expansão anormal e limite de 120 MB descompactados; leitura PDF acima de 70 páginas sinalizada como parcial, sem alegar extração integral.
10. **Diagnóstico:** testes sintéticos locais ampliados para HTML, DOCX, XLSX, ZIP aninhado, XLS legado, IDs únicos e exclusividade dos três anexos.

## Testes efetivamente executados
- **18 testes de regressão do núcleo documental: 18 aprovados, 0 falhas** — `tools/test_documental_regressao.js`. Incluem classificação de BMs, distinção percentual/R$, carteira, regras de correspondência/divergência/não comparabilidade, exclusão de origem antiga e ausência de seleção.
- **27 testes funcionais em Chrome headless: 27 aprovados, 0 falhas** — `tools/browser_smoke.html` e `tools/browser_smoke_cdp.js`, executados em GitHub Actions com servidor HTTP local e dados inteiramente sintéticos. Abrangem as três fontes, responsividade mobile, seleção de PUCs, ZIP SEI, DOCX/XLSX, Balanço/SIOP, correspondência/divergência/BM incompatível, prévia do relatório, persistência IndexedDB após recarga, navegação e exclusão. Execução: https://github.com/hzhcdyvz4w-tech/bi-puc-snp-2026/actions/workflows/bi-puc-smoke.yml
- **12 verificações de sintaxe JavaScript:** 12 aprovadas, incluindo módulos ativos, auxiliares e scripts embutidos no HTML.
- **Coerência das bases:** 12 PUCs no HTML e 12 na carteira referencial, sem divergência dos campos comparados; 12 registros SIOP coerentes nos campos comparados com o JSON público.
- **Matriz documental:** 54 requisitos no CSV e 54 regras no módulo de minutas; códigos, etapas, documentos e classificações jurídicas coincidem. **Não equivale a verificação jurídica da vigência dos dispositivos.**

## Limitações e homologação pendente
- **Teste funcional em navegador realizado em ambiente automatizado local:** Chrome headless aprovou 27 cenários sintéticos. **Ainda pendente** homologação no navegador/rede institucional de destino e conferência da versão efetivamente entregue pelo GitHub Pages ao usuário.
- **Sem processos SEI, BMs ou Balanços oficiais privados nesta execução:** não houve teste de leitura de documentos reais, conferência de valores, cortes, contratos, execução física ou financeira.
- **PDF digitalizado:** sem OCR; é marcado como necessitando leitura/transcrição humana. **XLS legado e DOC antigo:** anexados com aviso, sem leitura textual garantida.
- **Ficha e Curva S:** o módulo legado mantém dados e controles de conferência; a sincronização anterior não alimenta automaticamente o novo confronto documental. Campos antigos de upload foram ocultados para manter as três fontes em Documentos; restauração da sessão da Ficha por campo próprio também não está exposta nessa versão.
- **Segurança:** dados ficam em IndexedDB do navegador local, sujeito a limpeza, cota e política institucional. Não usar GitHub Pages para armazenar documentos institucionais.
- **Legislação e números oficiais:** é indispensável confrontar a matriz normativa e cada PUC com documentos oficiais atualizados, inclusive competência e data de corte, antes de qualquer manifestação administrativa.

## Roteiro mínimo de homologação
1. Abrir o site com recarga forçada; em **Documentos**, confirmar exatamente três campos de arquivo, filtros de PUC, botões e ausência de uploads em outras abas.
2. Executar **Diagnóstico de funcionamento** com dados sintéticos; conferir cada resultado.
3. Em navegador institucional autorizado, anexar ZIP SEI de teste (com BM e despacho), Balanço e consulta SIOP; verificar quantidade, origem, processo, PUC e qualidade da leitura.
4. Registrar dois achados conferidos do mesmo indicador e mesmo contexto; validar correspondência e divergência. Repetir com BM, corte e contrato diferentes para obter **NÃO COMPARÁVEL**.
5. Recarregar a página e verificar persistência; excluir um arquivo e verificar remoção do documento e dos achados vinculados.
6. Exportar CSV e relatório HTML; conferir referências, datas, BM, unidade e ausência de valores SIOP pré-carregados.

**Situação:** código revisado, 18 testes de regressão e 27 testes de navegador sintéticos aprovados; homologação em ambiente institucional e homologação documental pela SNP **pendentes**.
