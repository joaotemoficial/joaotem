-- ============================================================================
-- JoaoTem — Plan upgrade / renewal requests
--
-- An owner submits a request from their dashboard ("Solicitar Ouro" or
-- "Renovar plano"). An admin reviews and approves with an expiry date,
-- which atomically updates the business's plan_tier + plan_started_at +
-- plan_expires_at via approve_plan_upgrade_request().
-- ============================================================================

create type public.plan_upgrade_status as enum (
  'pending',
  'approved',
  'rejected',
  'canceled'
);

create table public.plan_upgrade_requests (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  requested_by    uuid not null references auth.users(id) on delete cascade,
  requested_plan  public.plan_tier not null,
  message         text,
  status          public.plan_upgrade_status not null default 'pending',
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  review_notes    text,
  granted_starts_at  timestamptz,
  granted_expires_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

-- Only one pending request per business at a time.
create unique index plan_upgrade_requests_one_pending_idx
  on public.plan_upgrade_requests (business_id)
  where status = 'pending';

create index plan_upgrade_requests_status_idx
  on public.plan_upgrade_requests (status);

create index plan_upgrade_requests_business_idx
  on public.plan_upgrade_requests (business_id);

create trigger plan_upgrade_requests_updated
  before update on public.plan_upgrade_requests
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.plan_upgrade_requests enable row level security;

create policy "plan_upgrade: owner insert own" on public.plan_upgrade_requests
  for insert with check (
    requested_by = auth.uid()
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and exists (
      select 1 from public.businesses b
       where b.id = business_id
         and b.user_id = auth.uid()
         and b.deleted_at is null
    )
  );

create policy "plan_upgrade: owner read own" on public.plan_upgrade_requests
  for select using (requested_by = auth.uid());

-- Owner can cancel their own pending request; everything else is admin-only.
create policy "plan_upgrade: owner cancel own" on public.plan_upgrade_requests
  for update using (
    requested_by = auth.uid() and status = 'pending'
  ) with check (
    requested_by = auth.uid()
  );

create policy "plan_upgrade: admin all" on public.plan_upgrade_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Guard: only admin can flip status to approved/rejected and set reviewed_*.
-- An owner cancelling their own request can set status to 'canceled' only.
-- ============================================================================

create or replace function public.protect_plan_upgrade_decision_fields()
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
  -- Non-admins: only allowed transition is pending → canceled by the requester.
  if new.status is distinct from old.status then
    if not (
      new.requested_by = auth.uid()
      and old.status = 'pending'
      and new.status = 'canceled'
    ) then
      raise exception 'plan upgrade decision fields are not editable by non-admins';
    end if;
  end if;
  if new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.review_notes is distinct from old.review_notes
     or new.granted_starts_at is distinct from old.granted_starts_at
     or new.granted_expires_at is distinct from old.granted_expires_at
     or new.requested_plan is distinct from old.requested_plan then
    raise exception 'plan upgrade decision fields are not editable by non-admins';
  end if;
  return new;
end;
$$;

create trigger plan_upgrade_protect_decision
  before update on public.plan_upgrade_requests
  for each row execute function public.protect_plan_upgrade_decision_fields();

-- ============================================================================
-- RPC: approve a pending request atomically.
-- Sets the request's status + reviewed_* fields AND updates the parent
-- business's plan_tier / plan_started_at / plan_expires_at in one shot.
-- Service-role / admin only — checks public.is_admin() inside.
-- ============================================================================

create or replace function public.approve_plan_upgrade_request(
  p_request_id  uuid,
  p_reviewer_id uuid,
  p_starts_at   timestamptz,
  p_expires_at  timestamptz,
  p_notes       text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  r record;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'only admins can approve plan upgrade requests';
  end if;

  select id, business_id, requested_plan, status
    into r
    from public.plan_upgrade_requests
    where id = p_request_id
    for update;

  if not found then raise exception 'plan upgrade request not found'; end if;
  if r.status <> 'pending' then
    raise exception 'plan upgrade request is not pending';
  end if;

  update public.businesses
    set plan_tier        = r.requested_plan,
        plan_started_at  = coalesce(p_starts_at, now()),
        plan_expires_at  = p_expires_at,
        plan_notes       = coalesce(p_notes, plan_notes)
    where id = r.business_id;

  update public.plan_upgrade_requests
    set status            = 'approved',
        reviewed_at       = now(),
        reviewed_by       = p_reviewer_id,
        review_notes      = p_notes,
        granted_starts_at = coalesce(p_starts_at, now()),
        granted_expires_at = p_expires_at
    where id = r.id;
end;
$$;

grant execute on function public.approve_plan_upgrade_request(uuid, uuid, timestamptz, timestamptz, text)
  to authenticated;

-- ============================================================================
-- RPC: reject a pending request.
-- ============================================================================

create or replace function public.reject_plan_upgrade_request(
  p_request_id  uuid,
  p_reviewer_id uuid,
  p_notes       text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'only admins can reject plan upgrade requests';
  end if;

  update public.plan_upgrade_requests
    set status       = 'rejected',
        reviewed_at  = now(),
        reviewed_by  = p_reviewer_id,
        review_notes = p_notes
    where id = p_request_id
      and status = 'pending';

  if not found then
    raise exception 'plan upgrade request not found or not pending';
  end if;
end;
$$;

grant execute on function public.reject_plan_upgrade_request(uuid, uuid, text)
  to authenticated;
