-- ============================================================================
-- JoaoTem — Sinônimos de busca (editáveis no admin)
--
-- Dá o salto "conceitual" que FTS/trigram não fazem sozinhos: buscar "mercado"
-- expande para "supermercado, atacarejo, atacado, mercearia…". Cada linha mapeia
-- um termo normalizado -> lista de termos relacionados.
--
-- O Postgres gerenciado (Supabase) não permite dicionário de tesauro nativo
-- (precisa de arquivos no servidor), então a expansão é feita por query.
-- ============================================================================

create table public.search_synonyms (
  id          uuid primary key default uuid_generate_v4(),
  term        text not null,                 -- normalizado (lower + sem acento) via trigger
  expansions  text[] not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create unique index search_synonyms_term_key on public.search_synonyms (term);

create trigger search_synonyms_updated
  before update on public.search_synonyms
  for each row execute function public.set_updated_at();

-- Normaliza o termo (lower + sem acento) em qualquer escrita, para casar com os
-- tokens da query (que também são normalizados). Garante o índice único correto.
create or replace function public.tg_search_synonyms_normalize()
returns trigger language plpgsql
set search_path = public, extensions as $$
begin
  new.term := lower(public.f_unaccent(btrim(new.term)));
  return new;
end;
$$;

create trigger search_synonyms_normalize
  before insert or update on public.search_synonyms
  for each row execute function public.tg_search_synonyms_normalize();

-- RLS: leitura pública dos ativos; escrita só admin (espelha feature_flags).
alter table public.search_synonyms enable row level security;

create policy "synonyms: anon read active" on public.search_synonyms
  for select using (is_active = true);
create policy "synonyms: admin all" on public.search_synonyms
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed inicial (ajustável depois no /admin/search-synonyms).
insert into public.search_synonyms (term, expansions) values
  ('mercado',  array['supermercado','atacarejo','atacado','mercearia','minimercado','hortifruti']),
  ('farmacia', array['drogaria','remedio','medicamento']),
  ('padaria',  array['panificadora','pao','confeitaria']),
  ('lanche',   array['lanchonete','hamburguer','hamburgueria','salgado','fast food']),
  ('pet',      array['petshop','veterinario','racao','animais']),
  ('salao',    array['cabelereiro','cabeleireiro','barbearia','beleza','estetica']),
  ('academia', array['ginastica','crossfit','musculacao','fitness']),
  ('restaurante', array['comida','almoco','marmita','self service','self-service']);

-- ----------------------------------------------------------------------------
-- build_search_tsquery: monta a tsquery de busca a partir da query do usuário.
-- A query original é casada via websearch (palavras com AND entre si), e os
-- sinônimos dos tokens que casam com um `term` ativo entram via OR (operador ||
-- de tsquery). Ex.: "mercado" -> ('merc') || ('atacarej' | 'supermerc' | ...).
-- Sem isso, juntar tudo numa string faria o websearch usar AND e nada casaria.
-- ----------------------------------------------------------------------------
create or replace function public.build_search_tsquery(p_q text)
returns tsquery
language sql
stable
security definer
set search_path = public, extensions
as $$
  with norm as (
    select lower(public.f_unaccent(btrim(coalesce(p_q, '')))) as q
  ),
  toks as (
    select q as tok from norm where q <> ''
    union
    select t from norm, unnest(regexp_split_to_array(q, '\s+')) as t where q <> ''
  ),
  syn as (
    -- expansões dos termos casados, unidas por " or " para o websearch fazer OR
    select string_agg(distinct lower(public.f_unaccent(e)), ' or ') as ored
      from public.search_synonyms s
      join toks t on t.tok = s.term
      cross join lateral unnest(s.expansions) as e
     where s.is_active
  )
  select case
    when (select q from norm) = '' then null::tsquery
    when (select ored from syn) is null
      then websearch_to_tsquery('public.pt_unaccent', (select q from norm))
    else websearch_to_tsquery('public.pt_unaccent', (select q from norm))
      || websearch_to_tsquery('public.pt_unaccent', (select ored from syn))
  end;
$$;

grant execute on function public.build_search_tsquery(text) to anon, authenticated;
