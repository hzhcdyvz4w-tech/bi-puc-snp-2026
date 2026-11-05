-- BI PUC 2026: banco de declaracoes DOCAS, RLS e perfis de acesso.
-- Aplicar em projeto Supabase aprovado pela TI. Nao publicar credenciais.
create extension if not exists pgcrypto;
create table if not exists public.puc_doca_perfis(
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 companhia_codigo text not null,
 companhia_nome text not null,
 papel text not null check(papel in ('doca','gerente')),
 ativo boolean not null default true,
 criado_em timestamptz not null default now()
);
create table if not exists public.puc_doca_declaracoes(
 id uuid primary key default gen_random_uuid(),
 protocolo uuid not null unique,
 usuario_id uuid not null default auth.uid() references auth.users(id),
 companhia_codigo text not null,
 companhia_nome text not null,
 data_atualizacao date not null,
 uf char(2) not null,
 empreendimento text not null,
 id_gov_pac text,
 objetivo_descricao text,
 investimento_total numeric(18,2) check(investimento_total is null or investimento_total>=0),
 origem_recursos text,
 inicio date,
 conclusao_prevista date,
 situacao text,
 fase text,
 execucao_fisica numeric(5,2) check(execucao_fisica is null or execucao_fisica between 0 and 100),
 execucao_financeira numeric(5,2) check(execucao_financeira is null or execucao_financeira between 0 and 100),
 contratos_principais text,
 resultados_entregas text,
 restricoes_pendencias text,
 providencias_proximos_marcos text,
 responsavel_preenchimento text not null,
 status text not null default 'recebida' check(status in ('recebida','em_analise','validada','devolvida')),
 analise text,
 enviado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 constraint uf_valida check(uf in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
 constraint empreend_nonblank check(length(trim(empreendimento)) between 2 and 250),
 constraint responsavel_nonblank check(length(trim(responsavel_preenchimento)) between 2 and 180)
);
create index if not exists idx_puc_docas_companhia_data on public.puc_doca_declaracoes(companhia_codigo,enviado_em desc);
create schema if not exists puc_internal;
revoke all on schema puc_internal from public;
grant usage on schema puc_internal to authenticated;
create or replace function puc_internal.is_puc_doca_gerente()
returns boolean language sql stable security definer set search_path=''
as $ select (select auth.uid()) is not null and exists (
  select 1 from public.puc_doca_perfis p
  where p.usuario_id=(select auth.uid()) and p.papel='gerente' and p.ativo=true
) $;
revoke all on function puc_internal.is_puc_doca_gerente() from public,anon;
grant execute on function puc_internal.is_puc_doca_gerente() to authenticated;
alter table public.puc_doca_perfis enable row level security;
alter table public.puc_doca_declaracoes enable row level security;
revoke all on public.puc_doca_perfis from public,anon,authenticated;
revoke all on public.puc_doca_declaracoes from public,anon,authenticated;
grant select on public.puc_doca_perfis to authenticated;
grant select on public.puc_doca_declaracoes to authenticated;
grant insert(protocolo,companhia_codigo,companhia_nome,data_atualizacao,uf,empreendimento,
id_gov_pac,objetivo_descricao,investimento_total,origem_recursos,inicio,conclusao_prevista,
situacao,fase,execucao_fisica,execucao_financeira,contratos_principais,resultados_entregas,
restricoes_pendencias,providencias_proximos_marcos,responsavel_preenchimento)
on public.puc_doca_declaracoes to authenticated;
grant update(status,analise) on public.puc_doca_declaracoes to authenticated;
drop policy if exists puc_perfil_visivel on public.puc_doca_perfis;
create policy puc_perfil_visivel on public.puc_doca_perfis for select to authenticated
using(usuario_id=auth.uid() or puc_internal.is_puc_doca_gerente());
drop policy if exists puc_declaracoes_doca_insert on public.puc_doca_declaracoes;
create policy puc_declaracoes_doca_insert on public.puc_doca_declaracoes for insert to authenticated
with check(usuario_id=auth.uid() and status='recebida' and exists(
select 1 from public.puc_doca_perfis p where p.usuario_id=auth.uid()
and p.papel='doca' and p.ativo=true and p.companhia_codigo=puc_doca_declaracoes.companhia_codigo
and p.companhia_nome=puc_doca_declaracoes.companhia_nome));
drop policy if exists puc_declaracoes_gerente_select on public.puc_doca_declaracoes;
create policy puc_declaracoes_gerente_select on public.puc_doca_declaracoes
for select to authenticated using(puc_internal.is_puc_doca_gerente());
drop policy if exists puc_declaracoes_gerente_update on public.puc_doca_declaracoes;
create policy puc_declaracoes_gerente_update on public.puc_doca_declaracoes
for update to authenticated using(puc_internal.is_puc_doca_gerente())
with check(puc_internal.is_puc_doca_gerente());
create or replace function puc_internal.puc_doca_marca_atualizacao()
returns trigger language plpgsql set search_path=public,pg_temp
as $$begin new.atualizado_em=now();return new;end$$;
drop trigger if exists trg_puc_doca_marca_atualizacao on public.puc_doca_declaracoes;
create trigger trg_puc_doca_marca_atualizacao before update on public.puc_doca_declaracoes
for each row execute function puc_internal.puc_doca_marca_atualizacao();
-- Em Authentication > Users, criar previamente uma conta para cada DOCA e para o gestor.
-- Em SQL (substituir UUID autentico):
-- insert into public.puc_doca_perfis(usuario_id,companhia_codigo,companhia_nome,papel)
-- values('UUID_DA_DOCA','CODERN','Companhia Docas do Rio Grande do Norte','doca');
-- insert into public.puc_doca_perfis(usuario_id,companhia_codigo,companhia_nome,papel)
-- values('UUID_DO_GESTOR','SNP','Secretaria Nacional de Portos','gerente');
-- Nenhuma credencial, chave de servico ou lista de emails deve ser commitada.
