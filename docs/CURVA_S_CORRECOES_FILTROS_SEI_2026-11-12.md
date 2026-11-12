# BI PUC — Correção integrada dos filtros e da Curva S

**Data:** 12/11/2026  
**Entrega:** branch principal, sem alterações no módulo de tokens ou DOCAS.

## Causas efetivamente corrigidas

1. **Companhia e empreendimento:** o seletor da Companhia passa a limitar os empreendimentos exibidos. O contrato é filtrado pelos BMs da obra e não mistura percentuais de contratos diferentes.
2. **Biblioteca documental SEI:** os BMs com vínculo explícito ao empreendimento são automaticamente incorporados **como candidatos pendentes** à ficha, sem duplicação. Os BMs sem vínculo permanecem disponíveis para conferência e associação expressa do operador, enquanto BMs associados a outra PUC são recusados.
3. **Conferência acessível:** o bloco de revisão foi reposicionado entre os filtros e o relatório, com botão visível **Conferir BMs (n pendentes)**, pesquisa por BM, nome do arquivo, processo e objeto, e acesso aos documentos SEI.
4. **Integração da Curva S:** o módulo de leitura documental também reconhece PDFs que tenham sido associados à obra pelo operador dentro da ficha (por `sourceDocId`), sem exigir um segundo upload ou alterar documentos de outra obra.
5. **Atualização automática:** seleção de empreendimento, eventos de mudança da biblioteca, alterações na seleção SEI e conferência dos BMs atualizam os candidatos e os indicadores da Curva S.
6. **Metodologia:** documentos vinculados não são homologados automaticamente. O histórico tabular extraído do PDF permanece identificado como sujeito à conferência; a série dos BMs individuais é montada somente com percentuais físicos efetivamente conferidos, por contrato e competência. Nenhuma medição é inventada para preencher lacunas.

## Operação no BI

1. Abra **Documentos → SEI** e inclua ou verifique os BMs na biblioteca local. Caso o arquivo não tenha PUC vinculada, confira o objeto e processo.
2. Em **Fichas e Curva S**, selecione **Companhia → Empreendimento → Contrato**. BMs vinculados surgem como candidatos.
3. Clique **Conferir BMs** e revise, se necessário, **data, contrato e físico acumulado**. Para BMs sem vínculo, marque somente os documentos da obra e use **Carregar candidatos à ficha**; confirme a associação quando solicitado.
4. Escolha um PDF histórico no seletor **BM com Curva S** quando houver série prevista/realizada no documento. Use **Atualizar ficha e curva S**.
5. Se não houver tabela histórica utilizável, a curva física exibirá somente BMs individualmente conferidos. Caso não existam, a tela indicará precisamente o que falta.
6. Imprima a ficha ou relatório apenas após verificar os dados documentais.

## Testes

- 7/7 verificações de integração aprovadas: sintaxe dos dois módulos, inclusão automática de BM vinculado, prevenção de duplicação, recusa de BM de outra obra, exibição da conferência e reconhecimento de associação manual na Curva S.
- GitHub Pages respondeu **HTTP 200** para o HTML principal e ambos os arquivos JavaScript atualizados; a página referencia `ficha-bm.js?v=7-integracao-sei-20261112` e `puc-curva-sei-v1.js?v=6-filtros-sei-20261112`.

## Condições de validade e limites

- Os BMs e seus PDFs são armazenados **localmente no navegador**; a implantação no GitHub não tem acesso ao conjunto de documentos de outra sessão/computador.
- Não é possível demonstrar uma Curva S do empreendimento da Ilha de Tatuoca sem BMs correspondentes a essa obra, com histórico tabular utilizável ou medições físicas confirmadas.
- O teste de interface completo com a biblioteca real de PDFs do usuário ainda precisa ser feito naquela sessão de navegador. Dados sem vínculo comprovado nunca serão associados automaticamente apenas por similaridade de nome.

**Não publicar PDFs institucionais, dados sigilosos ou tokens privados no repositório GitHub Pages.**
