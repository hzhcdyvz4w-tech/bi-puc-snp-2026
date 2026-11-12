# BI PUC — SEI: análise exclusiva dos Boletins de Medição

**Data:** 12/11/2026  
**Escopo:** seção *Documentos → SEI — Boletins de Medição do projeto*, biblioteca documental local e seus consumidores. **Não altera** a importação do Balanço, SIOP nem DOCAS/tokens.

## Regra nova de seleção

- Aceita, na origem SEI, **PDF com texto selecionável** e **XLSX contendo boletim, planilha ou quadro de medição**.
- **ZIP** é mantido somente como recipiente: o sistema inspeciona os nomes dos membros e **não descompacta** arquivos de imagem, HTML, ofícios, despachos, processos, pareceres, memorandos, notas técnicas, termos de referência, contratos e demais extensões fora do escopo de BM.
- Um nome genérico exportado do SEI (por exemplo `[113]-11498568_Anexo.pdf`) **pode ser aceito** quando o conteúdo textual identificar o próprio BM/medição. Mera menção a BM em documento processual não o torna elegível.
- PDF digitalizado sem texto extraível e arquivo de imagem **não entram na análise SEI**. Não há OCR nessa etapa; nenhuma porcentagem é inferida de imagens.
- Arquivos não elegíveis não entram na lista de seleção analítica, não compõem indicadores nem podem produzir novas evidências de confronto pela API da biblioteca.
- Anexos antigos fora do escopo são **preservados no IndexedDB local**, categorizados como fora da análise, e ficam indisponíveis às consultas analíticas. Não ocorre exclusão automática.

## Campos usados

Na origem SEI, os indicadores indexados ficam restritos aos campos de BM e medição:
- valor do contrato, valor da medição, valor acumulado, saldo contratual e percentuais do quadro de BM;
- valor medido no período / acumulado e execução física (%) ou financeira (%) quando claramente identificados.

**Não são indexados como evidência SEI de medição** dados de dotação, empenho, liquidação, pagamento ou PUC recebida/aplicada detectados incidentalmente nos anexos. Esses indicadores mantêm suas fontes próprias no BI.

## Fluxo

1. Anexar PDF(s), XLSX ou ZIP no painel **SEI — Boletins de Medição do projeto**.
2. O sistema filtra arquivos por extensão e espécie documental, antes de descompactar conteúdos desnecessários.
3. Os PDFs e planilhas permitidos passam por uma leitura textual inicial limitada às primeiras **8 páginas** no caso de PDF, para identificar possíveis BMs.
4. Somente os BMs reconhecidos ficam marcados para importação. O processamento integral dos BMs selecionados ocorre na biblioteca. A triagem informa quantos documentos foram ignorados.
5. A Curva S e as fichas recebem exclusivamente BMs elegíveis, conforme vínculos por PUC/contrato e conferência de valores; nenhum documento de outra natureza é usado para montar a série.
6. Os dados continuam candidatos até conferência técnica; texto de BM não equivale a homologação de execução física.

## Testes realizados

- Sintaxe JavaScript verificada para motor, biblioteca e painel SEI.
- Regras de elegibilidade simuladas com arquivos BM, planilha de medição, Anexo de nome genérico contendo BM, ofício, processo, termo de referência, imagem, HTML e PDF sem texto.
- ZIP sintético com 8 itens: **3 BMs/planilhas admitidos, 5 itens recusados sem descompactação**, com contagem verificável.
- Extração contextual simulada: mantém valor da medição, acumulado e execução física; retira dotação, empenho e valor pago.
- Testes de regressão guardados em `tests/sei-apenas-bms.test.mjs` para execução com `node --test tests/sei-apenas-bms.test.mjs`.
- O teste de interface ponta a ponta com os BMs armazenados no navegador do gestor deve ser realizado no próprio ambiente; dados reais não estão incluídos no repositório.

## Segurança e limitações

O BI estático é hospedado no GitHub Pages. Dados/documentos institucionais permanecem na biblioteca local do navegador. O ZIP pode conter documentos sigilosos: **não publique ZIPs, PDFs, dados SEI ou tokens de acesso no GitHub público**. O filtro atua na análise, não substitui política de controle documental, conferência nem análise jurídica.
