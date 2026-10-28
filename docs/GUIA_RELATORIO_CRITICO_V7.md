# Especificação V7 — Relatório Crítico e filtro Docas

## Bases de origem

| Origem | Entradas | Campos para relatório | Situação |
|---|---|---|---|
| SIOP | Consulta SIOP 2, XLSX | ano, companhia, ação, PO, dotação, empenho, liquidação, pagamento | integrado, corte original não comprovado |
| SEI | Processo ZIP/PDF, BMs e cronograma | percentual medido, valor medido, pagamento de BM, contrato, etapas, cronograma e referência | anexação/inventário; importação tabulada após conferência |
| Balanço | arquivo externo | execução física %, execução financeira R$, valor do empreendimento R$, início, término previsto/efetivo | entrada mediante evidência/carga padronizada |
| Docas | formulários de preenchimento e anexos | físico %, recursos PUC recebidos, aplicados, contrato e cronograma | entrada manual ou CSV padronizado |
| Portal oficial | consulta suplementar | corroborar declarações/documentos | complementar, sem coleta automática |

## Indicadores normalizados

- `execucao_fisica` — %, `EXECUCAO_FISICA` (SEI BM, Balanço, Docas e eventuais relatórios de metas físicas SIOP, **não** presentes em Consulta SIOP 2).
- `execucao_fisica_prevista` — %, `META_FISICA_PREVISTA` (cronograma).
- `dotacao_atual`, `empenho_uniao`, `liquidacao_uniao`, `pagamento_uniao` — R$, `ORCAMENTO_UNIAO`.
- `medicao_bm` — R$, `MEDICAO_CONTRATUAL` (valor medido em BM).
- `pagamento_bm` — R$, `PAGAMENTO_CONTRATUAL` (pagamento vinculado ao BM).
- `aporte_puc_recebido` — R$, `TRANSFERENCIA_PUC`.
- `puc_aplicada` — R$, `APLICACAO_DOCA`.
- `execucao_financeira_balanco` — R$, `EXECUCAO_EMPREENDIMENTO`.
- `valor_empreendimento` — R$, `VALOR_GLOBAL_EMPREENDIMENTO`.
- `valor_contrato` — R$, `CONTRATO`.
- `financeiro_previsto` — R$, `CRONOGRAMA_FINANCEIRO`.

Cada registro importado requer identificação de investimento e fonte, indicador reconhecido, valor numérico, competência (AAAA-MM), unidade, natureza, apuração (`MENSAL` ou `ACUMULADO`), data de corte quando alegada, contrato/objeto, referência do documento e marcação de conferência se aplicável. Valores ausentes não equivalem a zero.

## Datas do empreendimento

O modelo `data/MODELO_CRONOGRAMA_PUC.csv` contém: `investimento;fonte;inicio;termino_previsto;termino_real;data_corte;contrato;objeto;referencia;conferido;observacao`.

Aceita entrada por formulário, CSV isolado ou ZIP com **um** arquivo `cronograma_puc.csv` em qualquer pasta. Não processa textos livres de PDFs, imagens ou planilhas Excel como cronograma estruturado. Registros com marcação `SIM` exigem data de corte e referência. Se início for posterior ao término planejado, ou término efetivo posterior ao planejado, o sistema sinaliza para verificação. Datas distintas entre Balanço e SEI requerem conciliar aditivos e versão de cronograma; sem conferência não há alerta conclusivo.

## Procedimento do Relatório Crítico

1. Identificação da companhia/empreendimento e chaves ação/PO.
2. Metodologia, fontes e data de corte comprovada.
3. Execução física — confrontos estritos de `%` para mesmo projeto/objeto/etapa, período e corte.
4. Execução financeira — diferenciação de orçamento da União, medição, pagamento, repasse, aplicação e valores globais.
5. Cronograma — início/término, metas previstas, valores e arquivos anexados.
6. Quadro de achados — diferença, não comparável, aguardando evidência, informação ausente, diferença de data e provável necessidade de diligência.
7. Conclusão preliminar — encaminhamento para validação/homologação pela SNP, sem conclusão automática de irregularidade.

## Não implementado

- Extração confiável de BMs/PDFs do SEI e cronogramas a partir de documentos não tabulados.
- Consulta automatizada por credenciais/API SIOP, integração direta com SEI.
- Acesso autenticado individual às Docas, gravação segura de dados e homologação no servidor.
- Comparação financeira direta entre rubricas de naturezas diferentes.

## Proteção de dados

Todas as evidências preenchidas localmente podem conter dados institucionais e não devem ser colocadas no GitHub público. O site não faz upload automático desses dados. A exportação JSON é um arquivo local que deve ser tratado como material controlado.
