# BI PUCs — Seleção conjunta de empreendimentos da mesma Companhia

**Data:** 12/11/2026  
**Escopo:** Fichas e Curva S, sem alterações em DOCAS/tokens, SIOP, Balanço e formulários externos.

## Objetivo

Permitir selecionar mais de um empreendimento no mesmo acompanhamento, especialmente o exemplo da CODERN:

- PUC-01 — Melhoria e Recuperação das instalações elétricas (Energia Solar) — Natal/RN
- PUC-02 — Recuperação estrutural dos Armazéns nº 1 e 2 — Natal/RN
- PUC-03 — Recuperação estrutural dos Galpões nº 1 e 2 — Natal/RN

A declaração de que esses empreendimentos integram um mesmo projeto é uma **seleção operacional do usuário**, não uma prova automática de compartilhamento de contrato, objeto, cronograma ou valores.

## Interface

1. Selecione a Companhia e o **Empreendimento principal** como antes.
2. No painel, aberto por padrão, **Incluir outras PUCs do mesmo projeto**, marque outras PUCs daquela Companhia. A marcação permite selecionar várias PUCs sem o uso de Ctrl/Shift.
3. É exibida a relação dos códigos selecionados. PUCs de outra Companhia não podem ser incluídas nesse conjunto.
4. O filtro de contrato fica automaticamente desabilitado durante a seleção conjunta, com a mensagem **Contratos individuais por PUC (sem soma)**.
5. **Conferir BMs** mostra as medições de todas as PUCs selecionadas, cada linha identificando a respectiva PUC.
6. A área de fichas apresenta **fichas independentes**, cada uma preservando seu Balanço, valores, evidências e avisos.

## Curva S e rastreabilidade

- A lista de BMs da Curva S passa a considerar a união dos documentos **efetivamente vinculados** às PUCs selecionadas.
- Documentos de outras PUCs ou de outras Companhias não são incluídos.
- A consolidação é **separada por PUC** e, quando necessário, separada novamente por contrato de cada PUC.
- O número BM 01 da PUC-01 não se confunde com BM 01 da PUC-02. Os percentuais acumulados, saldos e valores contratuais **não são somados, ponderados nem interpolados**.
- Se faltar documento ou percentual utilizável para uma PUC, aparece uma pendência naquela PUC, sem fabricar uma curva.
- Os relatórios e gráficos ficam visíveis na mesma tela e podem integrar a impressão da seleção.
- A alternativa de transcrição manual de tabela digitalizada permanece disponível **somente quando uma PUC estiver selecionada**, evitando atribuição ambígua de valores.

## Comportamento documental

- Os BMs já vinculados à respectiva PUC podem ser incorporados à conferência como candidatos pendentes.
- Um BM associado a uma PUC selecionada é mantido no âmbito dessa PUC.
- BMs sem vínculo só podem ser atribuídos **ao empreendimento principal após confirmação expressa**; os documentos de PUCs fora da seleção não podem ser reaproveitados.
- Continuam vigentes os filtros de SEI: somente BMs principais legíveis em PDF/XLSX; anexos de BMs, imagens, HTML e documentos processuais genéricos não entram na análise.

## Testes executados

- Compilação JavaScript dos módulos Fichas BM e Curva S: sem erro.
- Seleção simulada de PUC-01, PUC-02 e PUC-03 com uma PUC de outra Companhia: a quarta PUC foi recusada.
- Simulação de seis BMs, dois por PUC, com contratos distintos e mesmo número de BM nas três PUCs: **três relatórios e três Curvas S independentes** gerados.
- A listagem documental da Curva S incluiu somente os seis BMs vinculados às três PUCs.
- Código de regressão em `tests/curva-s-grupo-pucs.test.mjs`.

**Limite de homologação:** os resultados acima são testes simulados. O acervo real dos BMs está na biblioteca local do navegador e exige validação no ambiente do gestor antes de utilizar os dados em relatório institucional.
