-- ============================================================================
-- JoaoTem — Sinônimos bidirecionais
--
-- Antes: build_search_tsquery só casava o token no `term` e expandia para
-- `expansions`. Ou seja, "mercado" -> {supermercado,...} funcionava, mas buscar
-- "supermercado" NÃO voltava para "mercado". Direção única, frágil no admin.
--
-- Agora: o token casa tanto no `term` quanto em qualquer item de `expansions`,
-- e a expansão é o GRUPO inteiro (term + expansions). Todos os termos de uma
-- linha viram sinônimos entre si, nos dois sentidos. Ex.: buscar "sacole" acha
-- "dindin" e vice-versa, sem precisar duplicar a linha.
-- ============================================================================
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
    -- bidirecional: casa o token no term OU em qualquer expansion (normalizados),
    -- e expande para o grupo inteiro (term + expansions), unido por " or ".
    select string_agg(distinct lower(public.f_unaccent(e)), ' or ') as ored
      from public.search_synonyms s
      join toks t
        on t.tok = s.term
        or t.tok = any (select lower(public.f_unaccent(x)) from unnest(s.expansions) as x)
      cross join lateral unnest(array_append(s.expansions, s.term)) as e
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
