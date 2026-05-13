-- ============================================================================
-- JoaoTem — Subscription plans (Básico / Ouro)
--
-- Adds a paid-subscription tier to businesses. `plan_tier IS NULL` means
-- "no active subscription → business is hidden from every public surface".
-- A separate cron will flip the column to NULL when `plan_expires_at < now()`;
-- read-side, `effective_plan_tier()` already returns NULL the instant expiry
-- passes, so reads self-heal even before the cron runs.
--
-- Replaces the old `random_businesses()` RPC with `random_featured_businesses()`
-- which returns only Ouro businesses with an active subscription.
-- ============================================================================

create type public.plan_tier as enum ('basico', 'ouro');

alter table public.businesses
  add column plan_tier        public.plan_tier null,        -- null = inactive subscription
  add column plan_started_at  timestamptz null,
  add column plan_expires_at  timestamptz null,
  add column plan_notes       text null;

create index businesses_plan_tier_idx
  on public.businesses (plan_tier)
  where deleted_at is null
    and status = 'approved'
    and plan_tier is not null;

create index businesses_plan_expires_at_idx
  on public.businesses (plan_expires_at)
  where deleted_at is null and plan_tier is not null;

-- Effective tier for read paths. Returns NULL when:
--   • the business never had a subscription (plan_tier is null), or
--   • the paid window has elapsed (plan_expires_at < now()).
-- Otherwise returns the stored plan_tier verbatim.
--
-- Marked STABLE (not IMMUTABLE) because it reads now().
create or replace function public.effective_plan_tier(
  plan public.plan_tier,
  expires_at timestamptz
)
returns public.plan_tier
language sql stable as $$
  select case
    when plan is null then null::public.plan_tier
    when expires_at is not null and expires_at < now() then null::public.plan_tier
    else plan
  end
$$;

-- ============================================================================
-- Moderation trigger: extend protect_business_moderation_fields() so non-admin
-- owners can't tamper with their own plan_* fields either.
-- ============================================================================

create or replace function public.protect_business_moderation_fields()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.rejection_reason is distinct from old.rejection_reason
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by then
    raise exception 'moderation fields are not editable by non-admins';
  end if;
  if new.plan_tier is distinct from old.plan_tier
     or new.plan_started_at is distinct from old.plan_started_at
     or new.plan_expires_at is distinct from old.plan_expires_at
     or new.plan_notes is distinct from old.plan_notes then
    raise exception 'plan fields are not editable by non-admins';
  end if;
  return new;
end;
$$;

-- ============================================================================
-- Random feed for the home page.
-- Replaces random_businesses() — same JSON shape so PostgREST embed queries
-- keep working; filter is "approved + active Ouro subscription" only.
-- ============================================================================

drop function if exists public.random_businesses(int, uuid, uuid, uuid, text);

create or replace function public.random_featured_businesses(
  p_limit           int    default 6,
  p_city_id         uuid   default null,
  p_category_id     uuid   default null,
  p_neighborhood_id uuid   default null,
  p_q               text   default null
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
     and public.effective_plan_tier(b.plan_tier, b.plan_expires_at) = 'ouro'
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

grant execute on function public.random_featured_businesses(int, uuid, uuid, uuid, text)
  to anon, authenticated;

-- ============================================================================
-- Search RPC: matching businesses with Ouro first (random within tier),
-- then Básico (alphabetical). Inactive subscriptions are excluded entirely.
-- ============================================================================

create or replace function public.search_businesses_ranked(
  p_q               text   default null,
  p_city_id         uuid   default null,
  p_category_id     uuid   default null,
  p_neighborhood_id uuid   default null,
  p_limit           int    default 24
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
   limit greatest(p_limit, 1);
$$;

grant execute on function public.search_businesses_ranked(text, uuid, uuid, uuid, int)
  to anon, authenticated;

-- ============================================================================
-- Browse RPC: same ranking as search but without name match — for category /
-- neighborhood pages where the client asked for "Gold first, then Básico".
-- ============================================================================

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
