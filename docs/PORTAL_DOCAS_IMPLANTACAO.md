# Implantação do portal externo DOCAS — BI PUC 2026

Arquivos publicados: `docas-externo/index.html`, `docas-externo/portal.js`, `docas-externo/config.js`, `docas-externo/portal.css`. O script `assets/puc-docas-gerenciador.js` é carregado na aba **Documentos** do BI principal.

**Não está operacional** enquanto o banco central não for provisionado e autorizado. Passos:
1. Criar Supabase institucional isolado (privacidade, retenção, logs, backup e autorização da TI).
2. Executar `backend/PUC_DOCAS_supabase.sql` no editor SQL.
3. Cadastrar usuários em Authentication > Users, sem habilitar autocadastro público.
4. Cadastrar perfis `doca` e `gerente` com os UUIDs reais do Auth na tabela `puc_doca_perfis`.
5. Preencher a URL do projeto e chave *publishable* em `docas-externo/config.js`. Nunca colocar service_role/secret no front-end.
6. Testar: DOCA A só consegue inserir da própria companhia; não consegue SELECT, PATCH, DELETE ou gravar em nome da DOCA B. Gestor pode ler, exportar e conferir. Testar formulário, acessibilidade, HTTPS e recuperação.
7. Verificar publicação do GitHub Pages e homologar o caminho externo `/docas-externo/` antes de enviar link.

**Segurança:** o portal externo é um HTML independente sem links internos do BI. RLS exige credenciais e perfil. O gerenciador existente continua publicado em um repositório GitHub público; o fato de fornecer apenas a URL externa não impede alguém de descobrir a URL principal. Para bloquear **todos os acessos** à interface interna é necessário hospedar o BI em serviço privado com controle de identidade; o GitHub Pages não oferece essa barreira.

**Integração:** resposta enviada vira linha em `puc_doca_declaracoes`; aba Documentos consulta com o perfil gerente e exporta CSV dos 19 campos. Os dados são **declarações recebidas**, não execução homologada. A integração das declarações ao confronto SEI/SIOP/Balanço requer revisão técnica específica.
