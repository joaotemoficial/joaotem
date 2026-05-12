-- Random feed for the home page. PostgREST can't express `order by random()`
-- through the query language, so we wrap it in an RPC. The function returns
-- `setof public.businesses`, which lets the client still chain `.select(...)`
-- to embed category/city/neighborhood joins.
create or replace function public.random_businesses(
  p_limit       int    default 6,
  p_city_id     uuid   default null,
  p_category_id uuid   default null,
  p_neighborhood_id uuid default null,
  p_q           text   default null
)
returns setof public.businesses
language sql
stable
security invoker
set search_path = public
as $$
  select b.*
    from public.businesses b
   where b.status = 'approved'
     and b.deleted_at is null
     and (p_city_id is null or b.city_id = p_city_id)
     and (p_category_id is null or b.category_id = p_category_id)
     and (p_neighborhood_id is null or b.neighborhood_id = p_neighborhood_id)
     and (
       p_q is null
       or btrim(p_q) = ''
       or b.name ilike '%' || btrim(p_q) || '%'
     )
   order by random()
   limit greatest(p_limit, 1);
$$;

grant execute on function public.random_businesses(int, uuid, uuid, uuid, text) to anon, authenticated;
