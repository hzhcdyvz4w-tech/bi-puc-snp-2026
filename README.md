# BI Executivo PUC — SNP/MPOR

Versão inicial do painel Web de monitoramento dos investimentos PUC. Interface responsiva, filtros, visão de projetos, comparativo SIOP × SEI × Balanço × Docas e importação **local** da planilha SIOP no formato `Consulta SIOP 2.xlsx`.

## Abrir a página

- Abra `index.html` no navegador do computador; a interface funciona como arquivo local.
- No GitHub, a versão publicada será acessível por GitHub Pages **somente após ativar Pages e cumprir os requisitos do plano**.
- O repositório é **privado**. Isso não garante que um site publicado por GitHub Pages seja privado: não carregue dados sigilosos em arquivos publicados na Web.

## Segurança e limites

Esta entrega contém somente a interface de demonstração, **sem planilhas internas nem documentos SEI**. Os anexos e importações ficam na sessão local do navegador, não são enviados automaticamente ao GitHub. Não há autenticação, banco de dados ou sincronização automática com SIOP e SEI.

## Próximos passos

1. Testar a importação da planilha SIOP autorizada no navegador.
2. Implementar conciliação de chaves projeto/ação/PO/competência, com proveniência das quatro fontes.
3. Definir backend autorizado e perfis de acesso para dados internos das Docas.
4. Avaliar hospedagem com autenticação corporativa para uso privado real.

**Referência:** Projeto PUCs, 28/10/2026.
