# BI Executivo PUC — Implantação automatizada do canal DOCAS (05/11/2026)

## Situação implantada

- **Banco central**: Supabase `agweqgryqldhxqzbuqyo`, tabelas `public.puc_doca_perfis` e `public.puc_doca_declaracoes`, autorização por RLS e `puc_internal.convites`.
- **Formulário externo em HTML**: `https://hzhcdyvz4w-tech.github.io/bi-puc-snp-2026/docas-externo/?v=corrigido-20261105-1#acesso=<chave-individual>` (a chave completa NÃO deve constar no GitHub).
- **API de recebimento**: Supabase Edge Function `puc-docas-externo`, autorizada por token de convite, sem e-mail/senha para as Docas; associa a companhia no servidor, sem confiar no navegador.
- **Cinco convites individuais ativos**: CDP, CODEBA, CODERN, PortosRio e SUAPE; expiram em 04/01/2027 (UTC); até 300 envios por convite, além de limite de frequência entre envios.
- **Acesso gerencial**: conta única existente, previamente autenticada e com e-mail confirmado, associada ao perfil `gerente`; a autenticação da SNP permanece obrigatória para consultar os dados.
- **Sincronização**: código da aba Documentos consulta o Supabase ao entrar, a cada 30 segundos enquanto o BI estiver aberto e quando a conexão ou janela retorna. Renova sessões autenticadas conforme necessário.
- **Confronto**: exibe as declarações recebidas como **dados declarados, não homologados**, sem transformá-los automaticamente em execução física/financeira comprovada.
- **Importação local legada**: campos de JSON e instruções de envio manual de declarações DOCAS ocultados na interface gerencial; fontes SEI/BM e Balanço preservadas para conferência.
- **Links antigos**: o endereço da função `puc-docas-formulario` no Supabase responde HTTP 302 para o formulário HTML no GitHub Pages; a URL do GitHub não redireciona ao Supabase. O backend continua no Supabase.

## Verificações executadas

1. O Supabase registrou ao menos **uma declaração real**, origem `convite`, com status `recebida`.
2. Um teste transacional temporário verificou armazenamento e vínculo da companhia pela chave de convite; o teste foi revertido.
3. Simulação de usuário gerente autenticado consultou uma declaração pelo RLS.
4. Simulação de pessoa autenticada sem perfil gerencial retornou zero declarações.
5. Teste transacional temporário confirmou que o gerente pode registrar conferência; alterações revertidas.
6. Código JavaScript do gerenciador, da automação documental e do formulário conferido quanto à sintaxe.
7. Edge Functions `puc-docas-externo` e `puc-docas-formulario` publicadas com estado ACTIVE.

## Limites e ressalvas

- A URL do formulário deve ser distribuída por companhia, sem divulgar a relação integral dos convites. O portador do link possui capacidade de enviar declarações daquela companhia; o link **não comprova identidade pessoal**.
- **O BI principal continua hospedado em GitHub Pages público.** O endereço isolado do Supabase não dá acesso aos registros gerenciais, mas não torna privada a página pública original do BI. Proteção completa da interface interna exige hospedar o BI em infraestrutura com autenticação na borda (ex.: serviço institucional privado).
- A atualização automática do *painel aberto* não significa execução em segundo plano do navegador quando fechado; as declarações permanecem disponíveis no banco central e aparecem na próxima abertura autenticada.
- Os dados inseridos pelas Docas continuam sujeitos à análise documental: SEI, Boletins de Medição, Balanço, SIOP e matriz PUC.
- A função de formulário isolado foi publicada; nesta sessão não foi possível executar teste HTTP GET completo via navegador automatizado no host Supabase. Portanto, embora a API original tenha comprovação de recebimento real, o endereço HTML do GitHub Pages e seus arquivos estáticos foram comprovados por testes HTTP 200; cinco chaves deram HTTP 200 e identificação correta da Companhia pela API. O teste real de preenchimento foi comprovado por uma declaração recebida anteriormente. A infraestrutura interna do BI continua pública e exige proteção adicional.

## Endereços

- Portal externo, **sem chave**: `https://agweqgryqldhxqzbuqyo.supabase.co/functions/v1/puc-docas-formulario/` (o preenchimento exige o convite individual no fragmento `#acesso=...`).
- BI gerencial: `https://hzhcdyvz4w-tech.github.io/bi-puc-snp-2026/`.
- Documentos no GitHub: `assets/puc-docas-gerenciador.js`, `assets/puc-docas-automatico.js`, `docas-externo/`.

Nenhuma senha, chave secreta de serviço ou token de convite é armazenado neste documento.

## Errata de URLs — 05/11/2026

- O Supabase Edge Functions devolve `text/plain` ao tentar hospedar HTML; não utilizá-lo como site de formulário sem domínio personalizado. Consultar [documentação oficial](https://supabase.com/docs/guides/functions/development-tips).
- Foram observados HTTP 404 no roteador da versão inicial do Supabase. A função foi alterada para HTTP 302, confirmado em logs do servidor; a página HTML válida é a rota `docas-externo/` do GitHub.
- HTTP: HTML, JS, configuração e CSS com 200; convites CDP, CODEBA, CODERN, PortosRio e SUAPE validados com HTTP 200 na API, sem gerar novas declarações.
- **Restrição permanente:** o GitHub Pages publica o BI gerencial sem autenticação na borda. O portal de formulário não contém outros módulos, mas o site principal continua acessível por URL direta. Essa privacidade completa ainda não está resolvida.
