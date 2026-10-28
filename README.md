# BI Executivo PUC — V8.1 · Fichas de Obras / BMs / Curva S

Implementação incremental sobre a versão V7 do BI PUC: mantém filtros SIOP, carteira PUC, confronto auditável, Docas, Relatório Crítico e importações documentais.

**Novo módulo:** `Fichas e Curva S` — identificação de candidatos a BMs dentro de ZIP/PDF SEI, revisão obrigatória por linha, cruzamento com Balanço, histórico e Curva S física acumulada (prevista somente com cronograma importado), ficha imprimível e exportação de sessão.

## Abrir

Abra `index.html` diretamente ou pelo site GitHub Pages. Os arquivos `assets/ficha-bm.js` e `assets/ficha-bm.css` devem ficar na pasta `assets/` relativa ao HTML.

**PDFs:** o módulo tenta carregar PDF.js 3.11.174 via CDN. Internet/rede institucional pode bloquear a CDN; se isso ocorrer, importe CSV ou use o extrator local de `tools/extrair_bms_sei.py` (depende de PyMuPDF). PDFs digitalizados sem texto extraível exigem conferência manual.

**Importante:** não foram importados os processos SEI nem o Balanço com informações da obra: não há nesta conversa um ZIP contendo os BMs de um empreendimento específico para alimentá-lo. Valores da imagem de referência não são tratados como execução comprovada.

**Segurança:** GitHub Pages é público. Nenhum documento confidencial nem sessão privada deve ser versionado. Valores de BMs/Balanço só vivem em memória enquanto a página fica aberta e podem ser salvos em JSON local; restauração é ação manual. Bibliotecas externas executadas no navegador devem ser avaliadas antes de uso com documentos institucionais.

Consulte `docs/GUIA_FICHA_BM_V8.md` para fluxo, cálculos e limitações; modelos em `data/`.

## Atualização V8.1 — Inserir fontes junto aos filtros

Na página **Fichas e Curva S**, o botão **Inserir fontes** está na faixa superior, ao lado dos filtros de companhia e empreendimento. Um clique abre o painel com quatro tipos de entrada: processo SEI ZIP/PDF (identificação de candidatos a BMs), CSV de BMs, Balanço XLSX/CSV e cronograma físico acumulado CSV. Na página **Docas**, o botão **Inserir fontes (SEI · BMs · Balanço)** leva ao módulo de fichas preservando o empreendimento selecionado.

A área inferior fica reservada à conferência dos boletins, validação dos dados do Balanço e geração da curva S e da ficha. A extração identifica candidatos por texto/nome (PDF digitalizado pode exigir transcrição). Nenhuma medição entra na curva sem confirmação explícita; os dados são locais e não são publicados no repositório.
