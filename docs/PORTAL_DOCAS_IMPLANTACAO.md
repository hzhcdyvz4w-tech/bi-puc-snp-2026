> **ATUALIZAÇÃO 05/11/2026 — correção dos links:** o formulário HTML público foi restaurado em `https://hzhcdyvz4w-tech.github.io/bi-puc-snp-2026/docas-externo/?v=corrigido-20261105-1#acesso=<chave>`. Não usar a função Supabase como hospedagem HTML. O Supabase recebe os dados por `puc-docas-externo`; a função antiga `puc-docas-formulario` somente redireciona (302). As chaves devem ser entregues individualmente fora do repositório. Cinco convites foram testados por HTTP 200; a página e três arquivos estáticos por HTTP 200. A conta gerencial já foi associada, e há um recebimento no banco. As instruções históricas abaixo descrevem etapas anteriores, já superadas.

# BI Executivo PUC — DOCAS sem login (implantação 05/11/2026)

## O que foi alterado
- Página exclusiva `docas-externo/index.html` com 19 campos da planilha padrão, sem e-mail, senha ou menus internos.
- Cada Companhia recebe **convite individual** com chave aleatória em fragmento da URL: `#acesso=<chave>`. O navegador apaga o fragmento da barra após carregar.
- Apenas a Edge Function `puc-docas-externo` recebe essa chave e chama a função SQL `public.puc_portal_convite` com credencial do servidor. Nenhuma chave secreta é publicada no repositório.
- A função SQL valida o hash SHA-256, companhia cadastrada, validade, limites e bloqueia repetição rápida. Os dados são gravados em `public.puc_doca_declaracoes`, status `recebida`, origem `convite`.
- Dados de companhia vêm do token no servidor e não podem ser alterados na declaração.
- RLS mantém bloqueadas as tabelas para visitantes anônimos e restringe a leitura/validação dos recebimentos ao perfil `gerente`.

## Convites já criados
CDP, CODEBA, CODERN, PortosRio e SUAPE. As **chaves completas não estão no GitHub**: constam somente no arquivo privado entregue ao gestor. Os convites expiram em **04/01/2027**, podem ser revogados, com limite de 300 envios cada.

## Como operar
1. Encaminhar somente o link da Companhia correta ao destinatário autorizado; não enviar a relação completa às empresas.
2. O usuário abre o link, preenche o formulário e guarda o protocolo. Não precisa de login.
3. O gerente institucional acessa a aba **Documentos** do BI PUC com sua própria identidade de gestor, consulta `Recebimentos externos`, confere e altera o status.
4. Para revogar um convite, atualizar `puc_internal.convites.ativo = false` no Supabase para a Companhia em questão (sem divulgar a chave).
5. Ao expirar, gerar outra chave aleatória e armazenar somente o hash SHA-256; nunca incluir tokens nos arquivos do GitHub.

## Segurança e limitações
- **Um link portador NÃO comprova a identidade de quem preencheu.** Quem tiver uma cópia poderá enviar dados à Companhia associada. Conferência pela SNP é obrigatória.
- O GitHub Pages é público. A página externa não contém links internos, mas **não torna a interface principal do BI privada**. Exigência de bloqueio absoluto dos demais módulos demanda hospedagem privada e autenticação no gerenciador.
- Cinco convites ativos, nenhuma declaração oficial recebida e nenhum perfil gerente cadastrado no banco ao término da configuração inicial.
- Teste transacional no PostgreSQL validou a gravacão, o vínculo imutável com CODERN e a negativa de privilégios diretos para `anon`; o teste foi revertido.
- A Edge Function foi implantada e consta como ACTIVE. Ainda não foi executado um ciclo HTTP externo completo em navegador nesta sessão; homologação operacional depende dessa evidência, além do teste de perfil gerente e validação institucional dos dados.
- Dois avisos de auditoria do Supabase: tabela privada de convites com RLS propositalmente sem políticas (negação padrão) e proteção contra senhas vazadas desligada no Auth (ativar para contas gerenciais).

---

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
