# Rotina replicável — Consulta SIOP × BI PUC

1. No SIOP, refazer a **mesma consulta orçamentária** utilizada em `Consulta SIOP 2(1).xlsx` (quando autorizado), no mesmo exercício ou exercício de interesse, com **Ano; Órgão Orçamentário; Função; Unidade Orçamentária; Programa; Ação; Plano Orçamentário; Grupo de Despesa; Resultado Primário; Objetivo; Projeto de Lei; Dotação Inicial; Dotação Atual; Empenhado; Liquidado; Pago**. Manter o desdobramento por ação/PO e NÃO confundir LOA ou empenho com PUC recebida.
2. Exportar para XLSX, anotar **data e horário da extração**, bem como exercício, eventuais filtros aplicados e identidade da fonte oficial. A planilha inicial NÃO informa essa data; não inventar.
3. Na página, abrir **Documentos → SIOP — nova planilha Excel → Selecionar arquivo → Importar**. O importador local faz validação das colunas e rejeita IDs duplicados, atualizando a sessão do navegador. Não usa credenciais do SIOP.
4. Examinar os filtros encadeados: **Base SIOP** Empresa → Ação → PO → UF vinculada → Projeto; **Projetos PUC** Empresa → Ação → PO → UF → Projeto; vínculo e pesquisa livre refinam a seleção. Use **Limpar filtros** para retornar ao conjunto completo. Os vínculos são **preliminares**, mesmo quando a ação/PO parece coincidir.
5. Conferir os totais com a linha Total do relatório; rastrear cada registro pela aba e linha do XLSX. Comparar versões por data de extração e código Ano+Ação+PO. Nunca somar registros repetidos.
6. Para publicação permanente: encaminhar XLSX atualizado para revisão, regenerar o JSON público e o `index.html` e enviar por commit ao GitHub. Não publicar fontes SEI, arquivos do Balanço restrito, anexos das Docas ou suas observações operacionais sem autorização.
7. Uma consulta **automática em tempo real ao SIOP** exigirá integração técnica autorizada (API, credenciais, backend e controle de acesso). Esse recurso **não está implementado**.

## Mapa ação/empresa da primeira consulta
- `00V4` — CODERN
- `00V6` — PortosRio
- `00V7` — CDP
- `00WJ` — CODEBA

A matriz cadastral inicial inclui 12 investimentos e oito correspondências temáticas propostas. Os quatro POs sem vínculo cadastral continuam na Base SIOP, e os registros da matriz sem PO equivalente continuam em Projetos PUC.

## Controle de manutenção dos filtros
Nas consultas futuras, a lista de companhias, ações e POs é recalculada a partir dos registros efetivamente importados. A carteira vem da matriz de identificação revisada; vínculos fixos da primeira consulta exigem auditoria humana quando surgem novas ações/POs. Não presumir que o mesmo PO equivale ao mesmo investimento entre ações ou exercícios diferentes.
