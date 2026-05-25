-- ============================================================================
-- search_businesses_ranked gains p_offset so it can drive offset/limit
-- pagination on the /negocios listing. Ordering is unchanged: Ouro random
-- first, then Básico alphabetical. Body copied from 20260514000000_plans.sql
-- with `offset` added.
--
-- Adding a defaulted param creates a new signature, and list_businesses_gold_first
-- depends on search_businesses_ranked, so drop both first (dependency order),
-- then recreate and re-grant.
-- ============================================================================

drop function if exists public.list_businesses_gold_first(uuid, uuid, uuid, int);
drop function if exists public.search_businesses_ranked(text, uuid, uuid, uuid, int);

create or replace function public.search_businesses_ranked(
  p_q               text   default null,
  p_city_id         uuid   default null,
  p_category_id     uuid   default null,
  p_neighborhood_id uuid   default null,
  p_limit           int    default 24,
  p_offset          int    default 0
)
returns setof public.businesses
language sql
stable
security invoker
set search_path = public
as $$
  with matches as (
    select b.*,
           public.effective_plan_tier(b.plan_tier, b.plan_expires_at) as eff_tier
      from public.businesses b
     where b.status = 'approved'
       and b.deleted_at is null
       and public.effective_plan_tier(b.plan_tier, b.plan_expires_at) is not null
       and (p_city_id is null or b.city_id = p_city_id)
       and (p_category_id is null or b.category_id = p_category_id)
       and (p_neighborhood_id is null or b.neighborhood_id = p_neighborhood_id)
       and (
         p_q is null
         or btrim(p_q) = ''
         or b.name ilike '%' || btrim(p_q) || '%'
       )
  )
  select id, user_id, handle, name, category_id, city_id, neighborhood_id,
         short_description, whatsapp, instagram, offers_delivery,
         logo_path, cover_path, status, rejection_reason, reviewed_at, reviewed_by,
         search_tsv, created_at, updated_at, deleted_at,
         plan_tier, plan_started_at, plan_expires_at, plan_notes
    from matches
   order by
     case when eff_tier = 'ouro' then 0 else 1 end,
     case when eff_tier = 'ouro' then random() end,
     case when eff_tier = 'basico' then name end
   offset greatest(p_offset, 0)
   limit greatest(p_limit, 1);
$$;

grant execute on function public.search_businesses_ranked(text, uuid, uuid, uuid, int, int)
  to anon, authenticated;

-- Recreate the no-q browse wrapper unchanged (the 5-positional-arg call resolves
-- to the new function with p_offset defaulting to 0).
create or replace function public.list_businesses_gold_first(
  p_city_id         uuid   default null,
  p_category_id     uuid   default null,
  p_neighborhood_id uuid   default null,
  p_limit           int    default 60
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
