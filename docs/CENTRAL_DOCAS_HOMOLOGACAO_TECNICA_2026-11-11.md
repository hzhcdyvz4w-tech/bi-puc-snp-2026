# BI PUC — Central DOCAS — entrega técnica 11/11/2026

## Fluxo único

- **Gestor da SNP:** menu `Docas` → `Central DOCAS — Gestão SNP` → acesso com a conta gerencial do Supabase Auth (e-mail/senha) → `Formulários recebidos` ou `Gerar / revogar acessos`. A identidade é verificada no Supabase e a autorização vem de `public.puc_doca_perfis` com `papel='gerente'` e `ativo=true`.
- **DOCAS externas:** apenas o link individual `https://hzhcdyvz4w-tech.github.io/bi-puc-snp-2026/docas-externo/#acesso=<token>`, sem login. Formulário de 19 campos e gravação no Supabase por `puc-docas-externo`.
- **Central gerencial:** recebimentos são consultados diretamente em `public.puc_doca_declaracoes` (RLS), com filtro, análise, atualização a cada 30 segundos em aba aberta e exportação CSV.
- **Convites:** função autenticada `public.puc_doca_gerencia`, auditada em `puc_internal.auditoria_acessos_docas`. `listar` retorna somente empresas constantes do Balanço MPOR. `renovar` emite novo link secreto e invalida o anterior. `revogar` desativa o convite sem apagar respostas.
- **Sem duplicidade:** o antigo painel de token administrativo foi retirado. `assets/puc-docas-automatico.js` mantém apenas o atalho na área Documentos e a apresentação auxiliar no Confronto das fontes.

## Verificações executadas

- 13 companhias do recorte de setembro/2026 do Balanço MPOR; 41 referências de empreendimentos. Os três códigos `TESTE_DOCAS_*` ficaram inativos, registros históricos preservados.
- API do convite CODERN confirmou a companhia e retornou HTTP 200.
- `puc_portal_convite('enviar')`: inserção aceita em transação revertida; nenhum novo registro de teste foi mantido.
- `puc_doca_gerencia('renovar'/'revogar')`: ambas as ações aprovadas em transação revertida; nenhuma chave real foi alterada.
- Conta gerencial existente: perfil ativo, identidade por e-mail e senha, e-mail confirmado.
- Consultas a dados de declarações por `anon`: negadas. Usuário autenticado sem perfil gerencial: gestão negada.
- Função administrativa antiga `puc-docas-gestao-token` responde HTTP 410. RPC legada removida; token legado desativado.
- GitHub Pages: `index.html`, JS gerencial, JS documental, CSS responsivo e formulário externo retornaram HTTP 200. A versão do índice contém `gerenciador.js?v=20261111-2`.

## Limites de homologação

Os testes de integração HTTP e SQL foram concluídos sem expor credenciais. **Não foi realizado o acesso no navegador com a senha real do gestor**, nem confirmação visual em todos os dispositivos; essa verificação depende da sessão autorizada. A estrutura responsiva foi publicada.

A aplicação principal continua publicada no **GitHub Pages público**. A proteção efetiva por RLS abrange os recebimentos DOCAS e suas operações administrativas, mas o conteúdo estático da página principal e quaisquer dados já embutidos no HTML continuam publicamente acessíveis. Caso o requisito institucional inclua privacidade do BI inteiro, será necessário migrar a interface gerencial para hospedagem privada com controle de acesso na borda.

O Supabase Security Advisor sinaliza proteção contra senhas vazadas desativada (configurável no Auth, dependendo do plano). Recomenda-se habilitar quando disponível.

**Não publicar tokens, credenciais administrativas nem links individuais no repositório.**
