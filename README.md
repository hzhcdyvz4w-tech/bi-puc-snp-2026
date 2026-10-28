# BI Executivo PUC — SNP/MPOR · v5 (28/10/2026)

## Site
Página `index.html` responsiva com consulta SIOP 2026 (12 linhas de ação/PO) e 12 referências de investimentos PUC extraídas da matriz de controle. Filtros encadeados por companhia, ação, PO, UF, projeto e correspondência nas páginas Base SIOP e Projetos PUC, pesquisa livre, totais filtrados e exportação CSV.

## Base inicial e proveniência
- `data/base_siop_2026_publica.json` — valores por ação/PO extraídos da planilha `Consulta SIOP 2(1).xlsx`, aba `Document_CH78`, linhas 3 a 14. O total da linha 2 foi usado apenas para auditoria dos somatórios.
- `data/carteira_puc_referencial_publica.json` — apenas nome/empresa/UF e associação temática da matriz `Nova MATRIZ_PUC_2026_5_FONTES (1).xlsx` (aba `CONTROLE INVESTIMENTOS`); **não contém cifras ou informações internas da matriz**.
- A data de extração do SIOP não está informada no arquivo. Todos os vínculos carteira↔PO são **preliminares** e não constituem prova de repasse ou aplicação PUC.

## Atualização SIOP
Consulte o arquivo `docs/ROTINA_ATUALIZACAO_SIOP.md`. O botão Documentos permite importar, na sessão atual, nova planilha do mesmo leiaute. **Importações no navegador não alteram arquivos do repositório**; uma republicação exige commit/push ou integração de backend. Não há acesso automático à API do SIOP.

## GitHub Pages
Repositório público e site hospedado; tudo o que estiver embutido no HTML ou em `data/` será acessível publicamente. **Não enviar processos SEI, declarações das Docas, Balanço interno ou documentação com dados restritos.** Filtros e anexos locais não criam banco de dados remoto.

## Filtros encadeados V5
Em **Base SIOP**, Companhia → Ação → PO → UF vinculada (somente associação preliminar) → Projeto vinculado. Em **Projetos PUC**, Empresa → Ação → PO → UF → Projeto. Filtros de vínculo e busca textual são cumulativos. Botões permitem limpar filtros. Caso o projeto não esteja vinculado, a UF na Base SIOP será *Sem UF vinculada*, sem inferência indevida. Ao importar nova planilha SIOP, menus são reconstruídos.
