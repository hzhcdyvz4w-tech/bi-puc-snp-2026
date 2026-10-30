# BI Executivo PUC — V17 · Documentos, Confronto e Relatório

**Atualização técnica de 30/10/2026.** O fluxo vigente centraliza a anexação exclusivamente na aba **Documentos**, em três quadros: **SEI (BMs)**, **Balanço** e **SIOP**. A seleção das 12 PUCs também está em Documentos. As abas **Confronto das Fontes** e **Relatório Crítico** usam somente arquivos anexados e achados revisados; a base SIOP embutida é **referencial** e não constitui confronto documental.

**Testes realizados:** 18 testes sintéticos de regressão aprovados e verificação de sintaxe dos módulos. **Pendente:** teste completo em navegador real e homologação documental dos processos e valores oficiais. Ver [relatório da auditoria](docs/AUDITORIA_INTEGRAL_2026-10-30.md). Executar regressões locais com `node tools/test_documental_regressao.js`.

**Segurança:** anexos institucionais permanecem no armazenamento IndexedDB do navegador usado e não devem ser enviados ao repositório público. PDFs digitalizados exigem OCR/transcrição externa; XLS legado pode ser arquivado sem extração textual. Não confundir valores de BM, pagamento da União, PUC recebida e execução da Docas.

---

## Histórico de versões anteriores (fluxos de importação substituídos pela V17)

### V8.1 · Fichas de Obras / BMs / Curva S

Implementação incremental sobre a versão V7 do BI PUC: mantém filtros SIOP, carteira PUC, confronto auditável, Docas, Relatório Crítico e importações documentais.

**Novo módulo:** `Fichas e Curva S` — identificação de candidatos a BMs dentro de ZIP/PDF SEI, revisão obrigatória por linha, cruzamento com Balanço, histórico e Curva S física acumulada (prevista somente com cronograma importado), ficha imprimível e exportação de sessão.

## Abrir

Abra `index.html` diretamente ou pelo site GitHub Pages. Os arquivos `assets/ficha-bm.js` e `assets/ficha-bm.css` devem ficar na pasta `assets/` relativa ao HTML.

**PDFs:** o módulo tenta carregar PDF.js 3.11.174 via CDN. Internet/rede institucional pode bloquear a CDN; se isso ocorrer, importe CSV ou use o extrator local de `tools/extrair_bms_sei.py` (depende de PyMuPDF). PDFs digitalizados sem texto extraível exigem conferência manual.

**Importante:** não foram importados os processos SEI nem o Balanço com informações da obra: não há nesta conversa um ZIP contendo os BMs de um empreendimento específico para alimentá-lo. Valores da imagem de referência não são tratados como execução comprovada.

**Segurança (histórico V8.1):** GitHub Pages é público. Nenhum documento confidencial nem sessão privada deve ser versionado. Na V17, a biblioteca de anexos usa IndexedDB local; o módulo legado da Ficha mantém dados de sessão em memória e sua importação própria foi ocultada para evitar anexações duplicadas. Bibliotecas externas executadas no navegador devem ser avaliadas antes de uso com documentos institucionais.

Consulte `docs/GUIA_FICHA_BM_V8.md` para fluxo, cálculos e limitações; modelos em `data/`.

## Histórico V8.1 — Inserir fontes junto aos filtros (substituído pela V17)

Na página **Fichas e Curva S**, o botão **Inserir fontes** está na faixa superior, ao lado dos filtros de companhia e empreendimento. Um clique abre o painel com quatro tipos de entrada: processo SEI ZIP/PDF (identificação de candidatos a BMs), CSV de BMs, Balanço XLSX/CSV e cronograma físico acumulado CSV. Na página **Docas**, o botão **Inserir fontes (SEI · BMs · Balanço)** leva ao módulo de fichas preservando o empreendimento selecionado.

A área inferior fica reservada à conferência dos boletins, validação dos dados do Balanço e geração da curva S e da ficha. A extração identifica candidatos por texto/nome (PDF digitalizado pode exigir transcrição). Nenhuma medição entra na curva sem confirmação explícita; os dados são locais e não são publicados no repositório.


## V9 — Minuta/documentação por ETAPA

Menu **Minutas / E-mail**, com 54 requisitos da aba MATRIZ DOCUMENTAL, seleção e confirmação de ETAPA, checklist de aplicabilidade, classificação jurídica e FONTE/URL, consulta aos achados verificados SIOP × SEI/BMs × Balanço × Docas e geração local de rascunho editável (TXT / .EML). Sem envio automático, sem exposição de documentos SEI no GitHub. Guia: `docs/GUIA_MINUTAS_MATRIZ_V9.md`.
