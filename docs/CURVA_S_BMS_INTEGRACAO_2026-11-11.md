# BI PUC — Curva S integrada aos Boletins de Medição

**Implementado:** 11/11/2026 — repositório `hzhcdyvz4w-tech/bi-puc-snp-2026`, branch `main`.

## Fonte documental e seleção

- A única origem de BMs para a Curva S documental é **Documentos → SEI**, por meio da biblioteca local `window.PUCDocLibrary`.
- Apenas PDFs classificados como **BM IDENTIFICADO** ou **BM PROVÁVEL**, não excluídos da seleção e vinculados à **PUC escolhida** são elegíveis.
- O filtro de contrato restringe a série ao documento contratual correspondente; se o contrato não estiver identificável, o sistema não o considera automaticamente equivalente.
- A leitura utiliza PDF.js localmente. **Arquivos são mantidos no navegador**; documentos internos não são publicados no GitHub.

## Metodologia — duas fontes possíveis, uma única Curva S em tela

1. **BM com tabela histórica acumulada:** o módulo `assets/puc-curva-sei-v1.js` localiza BM 00, 01... no quadro do PDF e extrai apenas percentuais e valores presentes. Exibe previsto e realizado de acordo com a fonte, com identificação do contrato, contratada, ordem de serviço, objeto, BM de referência, página PDF e alertas. Exibição marcada **EXTRAÇÃO A CONFERIR — NÃO HOMOLOGADA**.
2. **BM sem histórico tabular reconhecido:** a tela exibe a ficha existente de `assets/ficha-bm.js`, cuja evolução física utiliza **somente BMs individualmente conferidos pelo operador**. O cronograma previsto só é confrontado quando estiver vinculado ao mesmo contrato e competência.
3. **Sem evidência:** a tela informa que não há pontos confiáveis. Não cria uma curva artificial, não distribui avanço linearmente e não confunde valores de medição/pagamento com percentuais físicos.

As duas curvas **não são exibidas ao mesmo tempo**: quando a tabela documental é identificada, a ficha legada é ocultada; quando não é, o sistema restaura a ficha de BMs conferidos.

## Proteções metodológicas

- Cada ponto contém seu número de BM e os percentuais individualmente extraídos do documento; dados repetidos não são somados.
- Valores percentuais fora de 0% a 100% são desconsiderados; conflitos entre páginas e redução de acumulados são sinalizados.
- Se a tabela contiver dias decorridos válidos e crescentes, usa-os no eixo X; caso contrário, utiliza a **sequência de BMs**, sem inventar datas.
- Ausências em uma das séries são **lacunas**, não valores interpolados.
- O desvio previsto × realizado só é mostrado quando existem percentuais comparáveis na mesma medição/competência.
- Tempo decorrido da vigência **não** é substituto do cronograma físico e não prova, isoladamente, atraso.

## Operação na interface

1. Abrir **Documentos → SEI**, anexar os BMs ao repositório local e confirmar o vínculo da PUC.
2. Abrir **Fichas e Curva S** e selecionar empreendimento, contrato e BM com Curva S.
3. Clicar **Atualizar ficha e curva S** ou **Atualizar Curva S dos BMs**.
4. Conferir o histórico, a ficha, os documentos de origem e os alertas.
5. Selecionar **Imprimir ficha / PDF**. A impressão contém somente a curva ativa.

## Testes executados

- JavaScript das duas implementações compilado sem erro de sintaxe.
- PDF sintético com quatro BMs conferido pelo parser: leitura correta de 0%, 25%, 50% previsto e 0%, 22%, 45% realizado; dias e valores monetários em notação brasileira.
- Teste do extrator usando PDF.js simulado confirmou identificação do contrato e preservação de valores.
- **Arquivo de testes reprodutíveis:** `tests/curva-s-documental.test.mjs` (executar com `node --test tests/curva-s-documental.test.mjs`).
- GitHub Pages: página principal e ambos os arquivos JavaScript publicados, com HTTP 200 e referências de versão atualizadas.

## Limitações de homologação

A validação **com PDFs reais de BMs em diferentes layouts** ainda depende de anexos institucionais selecionados no navegador; o PDF BM 21 que motivou o modelo não está incluído neste commit. Layouts digitalizados/imagens sem texto selecionável, ou quadros com geometria de colunas diferente, podem precisar de transcrição e conferência. Uma prévia extraída do BM não constitui atesto nem validação jurídica ou contratual.

A ficha de percentuais previstos só deve ser importada se o cronograma estiver documentado para o **mesmo contrato**, com referência verificável. A comparação com o Balanço e SIOP permanece subordinada à equivalência de objeto e competência.
