# BI PUC — Cadastro DOCAS baseado no Balanço MPOR (setembro/2026)

**Fonte:** recorte SNP da aba `BALANCO OBRAS SET26` da planilha derivada `Previsao_NE_Final_Exercicio_2026_ASINF_DPP_RAP_Revisada.xlsx`, extraída de `Balanço_2026_MPOR - Obras Públicas(8).xlsx` (aba `Setembro - 2026`).

**As chaves individuais dos convites não são publicadas no GitHub.** Foram entregues à SNP em arquivo separado.

| Código | Companhia / administração portuária | UF | Empreendimentos | Linhas do Balanço |
|---|---|:--:|---:|---|
| APPA | Administração dos Portos de Paranaguá e Antonina — APPA | PR | 1 | 124 |
| APS | Autoridade Portuária de Santos — APS | SP | 8 | 208, 219, 220, 263, 305, 310, 322, 324 |
| CDP | Companhia Docas do Pará — CDP | PA | 4 | 113, 115, 122, 123 |
| CDSA | Companhia Docas de Santana — CDSA | AP | 1 | 289 |
| CODEBA | Companhia das Docas do Estado da Bahia — CODEBA | BA | 3 | 44, 260, 323 |
| CODERN | Companhia Docas do Rio Grande do Norte | RN | 5 | 39, 128, 203, 204, 205 |
| DOCASPB | Companhia Docas da Paraíba | PB | 2 | 216, 259 |
| EMAP | Empresa Maranhense de Administração Portuária — EMAP | MA | 1 | 110 |
| PortosRio | PortosRio — Companhia Docas do Rio de Janeiro | RJ | 6 | 166, 167, 172, 173, 179, 183 |
| PORTOSRS | Portos RS | RS | 2 | 206, 207 |
| RECIFE | Porto do Recife S.A. | PE | 2 | 40, 196 |
| SCPAR | SCPar Porto de Imbituba | SC | 1 | 221 |
| SUAPE | Complexo Industrial Portuário de Suape | PE | 5 | 129, 132, 137, 138, 139 |

**Total:** 13 entidades, vinculadas a 41 referências de empreendimentos no recorte público, 8 convites adicionais mais 5 mantidos.

## Integração automatizada

- Convites restritos em `puc_internal.convites`, com token armazenado por hash SHA-256.
- Vínculo com o Balanço armazenado em `puc_internal.puc_balanco_mpor_set_2026`, por código, linha original, ID Governa e UF.
- Página HTML externa: `https://hzhcdyvz4w-tech.github.io/bi-puc-snp-2026/docas-externo/` acrescida do fragmento de convite individual (`#acesso=`).
- API Supabase: `puc-docas-externo` valida token/companhia e registra a declaração em `public.puc_doca_declaracoes`.
- Os dados são recebidos como declarados, sem homologação automática. A consulta gerencial exige conta de gestor e política RLS.

## Escopo, ressalvas e correção

- Incluídas empresas e administrações portuárias públicas executoras no recorte SNP. Arrendatárias privadas, terminais de uso privado e executores federais (DNIT e SNP) não foram convidados pelo formulário DOCAS.
- CODESA aparece no Balanço como concessão concluída e não foi tratada como DOCA pública destinatária da PUC.
- O formulário HTML pertence ao GitHub Pages; a função antiga `puc-docas-formulario` do Supabase responde redirecionamento 302 para o endereço correto.
- O BI principal ainda está publicado em GitHub Pages e não possui barreira institucional na URL raiz; esse risco permanece.
- A planilha original do Balanço não estava anexada nesta sessão; esta relação foi extraída da reprodução de setembro de 2026 presente na planilha derivada.
