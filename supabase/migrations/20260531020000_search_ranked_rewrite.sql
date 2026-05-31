-- ============================================================================
-- JoaoTem — Reescrita da busca para usar a nova infra (FTS + trigram + sinônimos)
--
-- Antes: `name ILIKE '%q%'`. Agora o predicado de match (OR) combina:
--   • FTS + sinônimos:  search_tsv @@ build_search_tsquery(q)
--   • substring (trgm): search_text LIKE '%q%'
--   • typo (trgm):      word_similarity(q, search_text) > 0.4
--
-- Ordenação preserva a regra de negócio: Ouro antes de Básico. Sem query, Ouro
-- continua aleatório (comportamento atual). Com query, dentro do tier ordena por
-- relevância. Usamos `select b.*` para não depender da ordem das colunas.
--
-- IMPORTANTE: o predicado é duplicado em search_businesses_ranked,
-- count_businesses_ranked e random_featured_businesses — manter os três em sync.
--
-- Drop em ordem de dependência (list_businesses_gold_first depende da busca).
-- ============================================================================

drop function if exists public.list_businesses_gold_first(uuid, uuid, uuid, int);
drop function if exists public.search_businesses_ranked(text, uuid, uuid, uuid, int, int);

-- ----------------------------------------------------------------------------
-- Busca paginada e ranqueada.
-- ----------------------------------------------------------------------------
create or replace function public.search_businesses_ranked(
  p_q               text default null,
  p_city_id         uuid default null,
  p_category_id     uuid default null,
  p_neighborhood_id uuid default null,
  p_limit           int  default 24,
  p_offset          int  default 0
)
returns setof public.businesses
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_raw  text   := nullif(btrim(coalesce(p_q, '')), '');
  v_norm text;
  v_tsq  tsquery;
begin
  if v_raw is not null then
    v_norm := lower(public.f_unaccent(v_raw));
    -- build_search_tsquery faz a query original (AND) OR sinônimos (OR).
    v_tsq  := public.build_search_tsquery(v_raw);
  end if;

  return query
  with matches as (
    select b.id,
           public.effective_plan_tier(b.plan_tier, b.plan_expires_at) as eff_tier,
           case
             when v_raw is null then 0::real
             else coalesce(ts_rank_cd(b.search_tsv, v_tsq), 0)
                + coalesce(extensions.word_similarity(v_norm, b.search_text), 0)
                + case when b.search_text like v_norm || '%' then 0.5 else 0 end
           end as score
      from public.businesses b
     where b.status = 'approved'
       and b.deleted_at is null
       and public.effective_plan_tier(b.plan_tier, b.plan_expires_at) is not null
       and (p_city_id         is null or b.city_id = p_city_id)
       and (p_category_id     is null or b.category_id = p_category_id)
       and (p_neighborhood_id is null or b.neighborhood_id = p_neighborhood_id)
       and (
         v_raw is null
         or (v_tsq is not null and b.search_tsv @@ v_tsq)
         or b.search_text like '%' || v_norm || '%'
         or extensions.word_similarity(v_norm, b.search_text) > 0.4
       )
  )
  select b.*
    from public.businesses b
    join matches m on m.id = b.id
   order by
     case when m.eff_tier = 'ouro' then 0 else 1 end,
     case when m.eff_tier = 'ouro' and v_raw is null then random() end,
     m.score desc,
     case when m.eff_tier = 'basico' then b.name end
   offset greatest(p_offset, 0)
   limit  greatest(p_limit, 1);
end;
$$;

grant execute on function public.search_businesses_ranked(text, uuid, uuid, uuid, int, int)
  to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Contagem exata com o MESMO predicado (mantém total alinhado com a lista).
-- ----------------------------------------------------------------------------
create or replace function public.count_businesses_ranked(
  p_q               text default null,
  p_city_id         uuid default null,
  p_category_id     uuid default null,
  p_neighborhood_id uuid default null
)
returns int
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_raw  text := nullif(btrim(coalesce(p_q, '')), '');
  v_norm text;
  v_tsq  tsquery;
  v_n    int;
begin
  if v_raw is not null then
    v_norm := lower(public.f_unaccent(v_raw));
    v_tsq  := public.build_search_tsquery(v_raw);
  end if;

  select count(*) into v_n
    from public.businesses b
   where b.status = 'approved'
     and b.deleted_at is null
     and public.effective_plan_tier(b.plan_tier, b.plan_expires_at) is not null
     and (p_city_id         is null or b.city_id = p_city_id)
     and (p_category_id     is null or b.category_id = p_category_id)
     and (p_neighborhood_id is null or b.neighborhood_id = p_neighborhood_id)
     and (
       v_raw is null
       or (v_tsq is not null and b.search_tsv @@ v_tsq)
       or b.search_text like '%' || v_norm || '%'
       or extensions.word_similarity(v_norm, b.search_text) > 0.4
     );
  return v_n;
end;
$$;

grant execute on function public.count_businesses_ranked(text, uuid, uuid, uuid)
  to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Browse sem busca: delega para a busca com p_q = null (Ouro random, Básico alfa).
-- ----------------------------------------------------------------------------
create or replace function public.list_businesses_gold_first(
  p_city_id         uuid default null,
  p_category_id     uuid default null,
  p_neighborhood_id uuid default null,
  p_limit           int  default 60
)
returns setof public.businesses
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.search_businesses_ranked(
    null, p_city_id, p_category_id, p_neighborhood_id, p_limit
  );
$$;

grant execute on function public.list_businesses_gold_first(uuid, uuid, uuid, int)
  to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Feed aleatório da home: mesmo predicado de match (q normalmente é null).
-- ----------------------------------------------------------------------------
create or replace function public.random_featured_businesses(
  p_limit           int    default 6,
  p_city_id         uuid   default null,
  p_category_id     uuid   default null,
  p_neighborhood_id uuid   default null,
  p_q               text   default null
)
returns setof public.businesses
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_raw  text := nullif(btrim(coalesce(p_q, '')), '');
  v_norm text;
  v_tsq  tsquery;
begin
  if v_raw is not null then
    v_norm := lower(public.f_unaccent(v_raw));
    v_tsq  := public.build_search_tsquery(v_raw);
  end if;

  return query
  select b.*
    from public.businesses b
   where b.status = 'approved'
     and b.deleted_at is null
     and public.effective_plan_tier(b.plan_tier, b.plan_expires_at) = 'ouro'
     and (p_city_id         is null or b.city_id = p_city_id)
     and (p_category_id     is null or b.category_id = p_category_id)
     and (p_neighborhood_id is null or b.neighborhood_id = p_neighborhood_id)
     and (
       v_raw is null
       or (v_tsq is not null and b.search_tsv @@ v_tsq)
       or b.search_text like '%' || v_norm || '%'
       or extensions.word_similarity(v_norm, b.search_text) > 0.4
     )
   order by random()
   limit greatest(p_limit, 1);
end;
$$;

grant execute on function public.random_featured_businesses(int, uuid, uuid, uuid, text)
  to anon, authenticated;
