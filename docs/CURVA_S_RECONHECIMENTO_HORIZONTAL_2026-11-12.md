# BI PUC — Curva S: leitor de BMs horizontais e gráfico acumulado

**Data:** 12/11/2026  
**Versão do frontend:** `puc-curva-sei-v1.js?v=10-curva-s-documental-20261112`.

## Correção principal

O leitor anterior buscava percentuais de Curva S em posições verticais fixas do PDF. Esse método deixava o relatório vazio quando os BMs estavam dispostos em uma tabela horizontal longa, com colunas lado a lado e repartição por entidades (ex.: **SUAPE / MPOR**). A versão v10 mantém o reconhecimento do layout tradicional e acrescenta uma leitura por posições horizontais extraídas de `PDF.js.getTextContent()`.

## Funcionamento

1. A lista da Curva S só oferece os PDFs da biblioteca **Documentos → SEI** vinculados ao empreendimento e, quando aplicável, ao contrato. Documentos de outra PUC ficam excluídos.
2. O usuário pode marcar **vários BMs simultaneamente**. A seleção filtrada permanece enquanto ele pesquisa outros arquivos.
3. Para PDFs de tabela horizontal, o leitor procura os cabeçalhos **BM 00...BM 999**, localiza as linhas com percentuais e apresenta as amostras por linha e por subcoluna, sem combinar os percentuais de SUAPE/MPOR.
4. Quando a identificação do **previsto físico acumulado** ou do **realizado físico acumulado** estiver explícita no texto do documento, o leitor pode vinculá-la. Se o cabeçalho da linha for ambíguo ou não houver rótulo, o BI oferece duas listas de seleção para indicar as linhas do quadro. **Não** presume que a primeira linha numérica ou a cor da célula corresponda ao avanço físico.
5. Após selecionar a linha correspondente no PDF, o mesmo gráfico apresenta previsto acumulado (azul), realizado acumulado (verde) e rótulos de percentuais em pontos selecionados.
6. O histórico reúne os BMs pelos seus números, com identificação do documento de origem. Não soma percentuais acumulados, não interpola lacunas, não presume dados financeiros como avanço físico e omite percentuais conflitantes para conferência.

## PDFs digitalizados / em imagem

Se o PDF for composto exclusivamente por imagens, o PDF.js pode não retornar textos numéricos. Nesse caso, **não existe extração numérica automática garantida**. O painel inclui a alternativa recolhida **PDF digitalizado sem texto? Inserir percentuais conferidos do documento**.

O operador informa a referência do documento SEI e cola colunas da tabela oficial:

```
BM;Previsto;Realizado
25;55,00%;48,70%
26;58,00%;51,27%
```

Os valores do exemplo acima ilustram apenas a **sintaxe de entrada**, não são dados atestados de empreendimento. Os percentuais válidos devem ser copiados e conferidos com o BM real. O sistema rejeita números de BM duplicados, valores acima de 100% e ausência de referência; usa somente dados fornecidos. A prévia fica identificada como **TRANSCRIÇÃO A CONFERIR — NÃO HOMOLOGADA**, com os dados apenas na sessão local.

## Testes de regressão

- O leitor tradicional continua extraindo série prevista e realizada de quatro BMs no template anterior.
- Um quadro horizontal sintético com **BM 25 a BM 33**, colunas separadas e quatro linhas percentuais foi analisado: foram identificadas quatro linhas candidatas; após mapear a linha física prevista e realizada, o gráfico gerou **nove medições e duas curvas SVG**.
- O gráfico passou a mostrar os percentuais próximos aos pontos sem gerar posições inválidas (NaN).
- A transcrição em formato pt-BR passou por verificações de referência, duplicidade de BM e limites de 0% a 100%.
- A página e o script no GitHub Pages foram consultados e responderam **HTTP 200**, com a versão v10 referenciada no HTML principal.
- Esses são testes **sintéticos**; não substituem homologação visual com os PDFs reais de cada Companhia.

## Observações

A seleção manual de linhas **não equivale a homologação**: os documentos, dados e rótulos precisam ser comparados com os originais antes de decisões administrativas. O acervo de PDFs fica na biblioteca local do navegador, não no GitHub Pages. O módulo DOCAS e a gestão de tokens não foram alterados.
