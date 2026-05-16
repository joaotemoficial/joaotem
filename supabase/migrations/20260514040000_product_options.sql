-- ============================================================================
-- JoaoTem — Product options (multi-axis groups + values)
-- A product has option GROUPS (axes: "Peso", "Sabor", "Validade"). Each group
-- has option VALUES ("300g", "Chocolate"). The customer picks one value per
-- group. A value may carry an optional price_cents; the product's effective
-- price is the sum of the selected values' prices (falling back to
-- business_products.price_cents when no value is priced). A group with a single
-- value renders as a static attribute; with two or more, as a selectable picker.
-- Stock stays at the parent product level.
-- ============================================================================

create table public.business_product_option_groups (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.business_products(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index business_product_option_groups_product_id_idx
  on public.business_product_option_groups (product_id);

create table public.business_product_option_values (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.business_product_option_groups(id) on delete cascade,
  value text not null,
  price_cents int check (price_cents is null or price_cents >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index business_product_option_values_group_id_idx
  on public.business_product_option_values (group_id);

-- ============================================================================
-- RLS — mirrors business_product_images, with an extra join hop for values.
-- ============================================================================

alter table public.business_product_option_groups enable row level security;
alter table public.business_product_option_values enable row level security;

-- Option groups ---------------------------------------------------------------

create policy "option groups: public read of public product" on public.business_product_option_groups
  for select using (
    exists (
      select 1 from public.business_products p
      where p.id = product_id
        and p.is_active = true
        and p.deleted_at is null
        and public.is_business_public(p.business_id)
    )
  );

create policy "option groups: owner read own" on public.business_product_option_groups
  for select using (
    exists (
      select 1 from public.business_products p
      join public.businesses b on b.id = p.business_id
      where p.id = product_id and b.user_id = auth.uid()
    )
  );

create policy "option groups: owner write own" on public.business_product_option_groups
  for all using (
    exists (
      select 1 from public.business_products p
      join public.businesses b on b.id = p.business_id
      where p.id = product_id and b.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.business_products p
      join public.businesses b on b.id = p.business_id
      where p.id = product_id and b.user_id = auth.uid()
    )
  );

create policy "option groups: admin all" on public.business_product_option_groups
  for all using (public.is_admin()) with check (public.is_admin());

-- Option values ---------------------------------------------------------------

create policy "option values: public read of public product" on public.business_product_option_values
  for select using (
    exists (
      select 1 from public.business_product_option_groups g
      join public.business_products p on p.id = g.product_id
      where g.id = group_id
        and p.is_active = true
        and p.deleted_at is null
        and public.is_business_public(p.business_id)
    )
  );

create policy "option values: owner read own" on public.business_product_option_values
  for select using (
    exists (
      select 1 from public.business_product_option_groups g
      join public.business_products p on p.id = g.product_id
      join public.businesses b on b.id = p.business_id
      where g.id = group_id and b.user_id = auth.uid()
    )
  );

create policy "option values: owner write own" on public.business_product_option_values
  for all using (
    exists (
      select 1 from public.business_product_option_groups g
      join public.business_products p on p.id = g.product_id
      join public.businesses b on b.id = p.business_id
      where g.id = group_id and b.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.business_product_option_groups g
      join public.business_products p on p.id = g.product_id
      join public.businesses b on b.id = p.business_id
      where g.id = group_id and b.user_id = auth.uid()
    )
  );

create policy "option values: admin all" on public.business_product_option_values
  for all using (public.is_admin()) with check (public.is_admin());
