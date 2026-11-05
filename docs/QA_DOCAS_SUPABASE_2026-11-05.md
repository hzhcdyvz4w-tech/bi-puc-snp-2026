# BI PUC — verificação do portal externo DOCAS (05/11/2026)

## Verificações realizadas
- Conferência da planilha padrão simplificada: 19 campos reproduzidos na mesma ordem no formulário externo.
- Sintaxe do JavaScript verificada em ambiente local.
- Inspeção estática das regras SQL: perfis DOCA/gerente, habilitação de RLS, permissão de inserção por própria companhia e consulta/atualização apenas para gerente.
- Formulário externo não inclui menu, links ou arquivos da interface principal do BI.

## Pendências para homologação
- Supabase não conectado ao ChatGPT, apesar da confirmação de que o projeto foi criado/autorizado; por isso SQL, autenticação e gravacao central ainda não foram executados/testados no banco real.
- Cadastro de usuários e vinculação a perfis por DOCA pendente.
- Testes reais de RLS e integração formulário → Supabase → BI pendentes.
- Disponibilidade da rota no GitHub Pages não confirmada na presente sessão.
- GitHub Pages permanece público e não bloqueia acesso à raiz do BI. Para proteção integral, migrar gerenciador para hospedagem privada com autenticação na borda.

**Não enviar o endereço às DOCAS em produção antes da homologação pela TI.**
