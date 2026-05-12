-- ============================================================================
-- JoaoTem — Promotions feature
-- Per-business promotions with day-of-week recurrency (7-bit mask), optional
-- date range, and an image gallery (cover = sort_order 0).
-- ============================================================================

create table public.business_promotions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  description text,
  schedule_note text,
  -- 7-bit mask: bit 0 = Sunday … bit 6 = Saturday.
  -- Matches JS Date.getDay() and Postgres extract(dow from ...) — no offset arithmetic.
  -- 0 = never (effectively hidden), 127 = every day.
  recurrence_days smallint not null default 0
    check (recurrence_days >= 0 and recurrence_days <= 127),
  starts_at date,
  ends_at date,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz,
  constraint promotions_date_range
    check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index business_promotions_active_idx
  on public.business_promotions (business_id, is_active)
  where deleted_at is null;

create trigger business_promotions_updated
  before update on public.business_promotions
  for each row execute function public.set_updated_at();

create table public.business_promotion_images (
  id uuid primary key default uuid_generate_v4(),
  promotion_id uuid not null references public.business_promotions(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index business_promotion_images_promotion_id_idx
  on public.business_promotion_images (promotion_id);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.business_promotions       enable row level security;
alter table public.business_promotion_images enable row level security;

-- Public read: parent business approved AND today within date range AND today's day-bit set
create policy "promotions: public read" on public.business_promotions
  for select using (
    is_active
    and deleted_at is null
    and public.is_business_public(business_id)
    and (starts_at is null or starts_at <= current_date)
    and (ends_at is null or ends_at >= current_date)
    and (recurrence_days & (1 << extract(dow from current_date)::int)) > 0
  );

create policy "promotions: owner read own" on public.business_promotions
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );
create policy "promotions: owner insert own" on public.business_promotions
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );
create policy "promotions: owner update own" on public.business_promotions
  for update using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );
create policy "promotions: owner delete own" on public.business_promotions
  for delete using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );
create policy "promotions: admin all" on public.business_promotions
  for all using (public.is_admin()) with check (public.is_admin());

-- Promotion images mirror the policy stack via chained exists through promo → business
create policy "promo images: public read" on public.business_promotion_images
  for select using (
    exists (
      select 1 from public.business_promotions p
      where p.id = promotion_id
        and p.is_active
        and p.deleted_at is null
        and public.is_business_public(p.business_id)
        and (p.starts_at is null or p.starts_at <= current_date)
        and (p.ends_at is null or p.ends_at >= current_date)
        and (p.recurrence_days & (1 << extract(dow from current_date)::int)) > 0
    )
  );
create policy "promo images: owner read own" on public.business_promotion_images
  for select using (
    exists (
      select 1 from public.business_promotions p
      join public.businesses b on b.id = p.business_id
      where p.id = promotion_id and b.user_id = auth.uid()
    )
  );
create policy "promo images: owner write own" on public.business_promotion_images
  for all using (
    exists (
      select 1 from public.business_promotions p
      join public.businesses b on b.id = p.business_id
      where p.id = promotion_id and b.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.business_promotions p
      join public.businesses b on b.id = p.business_id
      where p.id = promotion_id and b.user_id = auth.uid()
    )
  );
create policy "promo images: admin all" on public.business_promotion_images
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Storage bucket: business-promotion-images
-- Path convention: {user_id}/{business_id}/{promotion_id}/{image_id}.{ext}
-- ============================================================================

insert into storage.buckets (id, name, public) values
  ('business-promotion-images', 'business-promotion-images', true)
on conflict (id) do nothing;

create policy "business-promotion-images: anon read" on storage.objects
  for select using (bucket_id = 'business-promotion-images');
create policy "business-promotion-images: owner write" on storage.objects
  for insert with check (
    bucket_id = 'business-promotion-images'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
create policy "business-promotion-images: owner update" on storage.objects
  for update using (
    bucket_id = 'business-promotion-images'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
create policy "business-promotion-images: owner delete" on storage.objects
  for delete using (
    bucket_id = 'business-promotion-images'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
