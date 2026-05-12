-- System user used as the owner of admin-created businesses that have no
-- real user attached. Admins can later reassign these businesses to a real
-- user once one signs up.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'system@joaotem.local',
  now(),
  now(),
  now(),
  '{"provider":"system","providers":["system"]}'::jsonb,
  '{}'::jsonb,
  false
) on conflict (id) do nothing;

-- Reclaim requests: logged-in users can ask to take ownership of a
-- system-owned business. Admins approve via the approve_business_reclaim
-- RPC, which atomically reassigns the business and auto-rejects siblings.
create type public.reclaim_status as enum ('pending', 'approved', 'rejected');

create table public.business_reclaim_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status public.reclaim_status not null default 'pending',
  decision_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index business_reclaim_requests_unique_pending
  on public.business_reclaim_requests (business_id, user_id)
  where status = 'pending';

create index business_reclaim_requests_status_idx
  on public.business_reclaim_requests (status);

create index business_reclaim_requests_business_idx
  on public.business_reclaim_requests (business_id);

alter table public.business_reclaim_requests enable row level security;

create policy "reclaims: user insert own" on public.business_reclaim_requests
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.user_id = '00000000-0000-0000-0000-000000000001'::uuid
        and b.deleted_at is null
    )
  );

create policy "reclaims: user read own" on public.business_reclaim_requests
  for select using (user_id = auth.uid());

create policy "reclaims: admin all" on public.business_reclaim_requests
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.protect_reclaim_decision_fields()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if public.is_admin() then return new; end if;
  if new.status is distinct from old.status
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.decision_note is distinct from old.decision_note then
    raise exception 'reclaim decision fields are not editable by non-admins';
  end if;
  return new;
end;
$$;

create trigger reclaims_protect_decision
  before update on public.business_reclaim_requests
  for each row execute function public.protect_reclaim_decision_fields();

create or replace function public.approve_business_reclaim(
  reclaim_id uuid,
  reviewer_id uuid
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  r record;
begin
  if not public.is_admin() then
    raise exception 'only admins can approve reclaims';
  end if;

  select id, business_id, user_id, status
    into r
    from public.business_reclaim_requests
    where id = reclaim_id
    for update;

  if not found then raise exception 'reclaim not found'; end if;
  if r.status <> 'pending' then raise exception 'reclaim is not pending'; end if;

  update public.businesses
    set user_id = r.user_id
    where id = r.business_id;

  update public.business_reclaim_requests
    set status = 'approved',
        reviewed_at = now(),
        reviewed_by = reviewer_id,
        updated_at = now()
    where id = r.id;

  update public.business_reclaim_requests
    set status = 'rejected',
        decision_note = coalesce(decision_note, 'Negócio reivindicado por outro usuário'),
        reviewed_at = now(),
        reviewed_by = reviewer_id,
        updated_at = now()
    where business_id = r.business_id
      and id <> r.id
      and status = 'pending';
end;
$$;
