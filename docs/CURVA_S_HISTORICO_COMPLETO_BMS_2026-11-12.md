# BI PUC — Consolidação do histórico completo da Curva S

**Publicado:** 12/11/2026  
**Módulos alterados:** `assets/puc-curva-sei-v1.js`, `index.html`, testes documentais. **DOCAS permanece inalterado.**

## Problema reproduzido na interface

No caso observado da CODERN, o sistema mostrava 7 BMs associados, 0 conferidos e 33 outros documentos sem vínculo confirmado, porém a Curva S permanecia vazia.

O leitor anterior tentava encontrar toda a série prevista e realizada **dentro de um único PDF** escolhido, enquanto o segundo gráfico aceitava exclusivamente BMs individuais **conferidos pelo operador**. Os documentos já classificados e anexados nem sempre resultavam em uma prévia documental, apesar de conterem dados candidatos.

## Alteração de metodologia

1. O seletor do relatório inicia em **Consolidar histórico de todos os BMs vinculados**. Continua possível inspecionar um BM isoladamente.
2. O consolidado utiliza a biblioteca **Documentos → SEI** e a associação com `ficha-project` e `ficha-contract`, inclusive os BMs vinculados pelo operador à ficha. Documentos de outro empreendimento são excluídos.
3. Para cada BM elegível o sistema:
   - tenta extrair a tabela histórica de percentuais previstos e realizados acumulados do PDF;
   - combina essa tabela, quando disponível, com o **percentual físico acumulado individual** identificado na biblioteca ou na conferência da ficha;
   - reconhece **BM 00** e numera os pontos pela sequência de medição;
   - não converte valores financeiros ou percentuais financeiros em execução física;
   - preserva o nome do documento e o estado de conferência;
   - identifica quando não foi possível reconhecer percentuais ou a tabela do histórico.
4. A série é organizada por **número de BM**, sem somar percentuais acumulados, sem estimar pontos ausentes e sem interpolar intervalos.
5. Valores discordantes para um mesmo BM são sinalizados e o percentual conflitante é omitido até esclarecimento.
6. Se houver contratos distintos entre os PDFs e nenhum contrato for escolhido, a consolidação é bloqueada com mensagem clara; arquivos sem contrato reconhecido não são agregados a um contrato específico.
7. Uma **prévia documental não homologada** pode exibir percentuais extraídos de BMs pendentes, com identificação expressa; somente os BMs conferidos são tratados como tal na ficha gerencial anterior.
8. O relatório apresenta uma auditoria dos arquivos percorridos: BM, arquivo, contrato, físico identificado, histórico tabular e status. PDFs com mais de 65 páginas são identificados como examinados parcialmente, em vez de aparentar completude.
9. A impressão continua com a Curva S ativa e a ficha documental. O leitor mantém cache dos PDFs ao confirmar valores para evitar novas leituras desnecessárias.

## O que não se pode afirmar sem os PDFs reais

- Que a CODERN tenha efetivamente 7 BMs com percentuais físicos utilizáveis.
- Que os 33 arquivos sem vínculo pertençam ao empreendimento selecionado.
- Que um percentual candidato da tabela seja necessariamente a **execução física acumulada homologada**.
- Que todos os layouts digitalizados ou PDFs exclusivamente em imagem sejam lidos sem transcrição.

O BI não inventa a Curva S quando os PDFs não contêm dados textuais identificáveis. O operador deverá conferir data, contrato, percentual e fonte no painel de BMs.

## Verificações

- Testes JavaScript sintéticos: inclusão de BMs de um mesmo contrato, ordenação, não criação de 0% falso para BM sem valor, tratamento de lacunas, exclusão de BMs de outras PUCs e omissão de duplicidades conflitantes.
- Simulação de **dois PDFs com tabelas históricas sobrepostas**: consolidado com quatro pontos únicos BM 00 a BM 03, previsto acumulado 0%, 11%, 22%, 33% e realizado acumulado 0%, 10%, 20%, 30%, sem contagem em dobro.
- A página principal e os arquivos JavaScript atualizados responderam HTTP 200 no GitHub Pages.
- Testes de regressão documentados em `tests/curva-s-documental.test.mjs`.

**Homologação final com os arquivos reais do navegador do gestor ainda pendente**. Os BMs continuam armazenados em IndexedDB no navegador, e o repositório GitHub não recebe o acervo.

## Procedimento no BI

1. No menu **Documentos → SEI**, confira se os PDFs estão anexados e associados corretamente.
2. Em **Fichas e Curva S**, selecione Companhia → Empreendimento → Contrato. Mantenha **Consolidar histórico de todos os BMs vinculados**.
3. Clique **Atualizar Curva S dos BMs**; observe o progresso e a tabela de rastreabilidade.
4. Para documentos sem percentual, clique **Conferir BMs**, examine o documento original e confirme os dados sem inventar informações.
5. Repita a atualização. Use o relatório como prévia até validação técnica pela SNP.
