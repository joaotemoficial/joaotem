-- ============================================================================
-- JoaoTem — Initial schema
-- Marketplace: profiles, categories, cities, neighborhoods, businesses,
-- business_products, business_product_images. Plus RLS, storage buckets,
-- and helper functions.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- Helpers
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Profiles + role
-- ============================================================================

create type public.user_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create trigger profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================================
-- Reference: business_categories
-- ============================================================================

create table public.business_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.business_categories (id, name, slug, sort_order) values
  ('5c6a74b8-3572-4af0-a039-beb85c97f8aa', 'Alimentação',         'alimentacao',         10),
  ('dd7221b9-66d7-4456-b240-1e600db2adde', 'Moda e Acessórios',    'moda-e-acessorios',    20),
  ('bd2b221e-c591-4b56-9499-a29d50c9ec7c', 'Beleza e Estética',    'beleza-e-estetica',    30),
  ('9dc7435a-83ab-4f13-aed7-ca7cdfe6fb47', 'Artesanato',          'artesanato',          40),
  ('4d690930-f012-4c35-b802-796e76071a3f', 'Serviços',            'servicos',            50),
  ('03d19250-4087-4202-8ade-6aeaacd9feff', 'Roupas',              'roupas',              60),
  ('5158464e-7f2f-426c-aa7d-6aa1442d61ba', 'Calçados',            'calcados',            70),
  ('178d631b-9bb5-4272-8336-eb0c14105dae', 'Petshop',             'petshop',             80),
  ('1725741b-624a-427a-96a3-d034ef552066', 'Automotivo',          'automotivo',          90),
  ('961f109f-121d-4d11-9380-596ca0fb053a', 'Papelaria',           'papelaria',           100),
  ('4498ba10-b3d0-48a8-bd76-22ecdb68b681', 'Eletricista',         'eletricista',         110),
  ('1bb57eaa-e1bc-4fb3-aaa3-5b999a5e52c4', 'Encanador',           'encanador',           120),
  ('ae925341-8b1b-4e07-8e04-b5a6086782bf', 'Cabelereiro',         'cabelereiro',         130),
  ('1dcda8c1-fc48-4b49-980b-fa6b84205a7d', 'Barbearia',           'barbearia',           140),
  ('e4368a57-50f2-4965-9f4f-1ce18e08eff2', 'Serviços Gerais',     'servicos-gerais',     150),
  ('64137cc2-8bb5-43df-be7a-9b5639155c67', 'Supermercado',        'supermercado',        160),
  ('88dfb97d-309f-45f3-aa0d-a378509af358', 'Farmácia',            'farmacia',            170),
  ('951ef015-8a2a-41c5-8a83-ae4832a75094', 'Influenciador',       'influenciador',       180),
  ('776fac53-6be4-4a8b-ae7d-7f1191afa430', 'Imobiliária',         'imobiliaria',         190),
  ('d5f32da0-161b-41fa-8962-bc41f16794ab', 'Saúde',               'saude',               200),
  ('7ee776da-887e-4953-92b6-13200b5c8662', 'Esportes',            'esportes',            210),
  ('f784efc1-60ad-40d3-951b-f21c7c2c1349', 'Outros',              'outros',              9999);

-- ============================================================================
-- Reference: cities + neighborhoods
-- ============================================================================

create table public.cities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  state text not null,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (name, state)
);

insert into public.cities (id, name, state, slug, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Feira de Santana', 'BA', 'feira-de-santana-ba', 10),
  ('22222222-2222-2222-2222-222222222222', 'Orós',             'CE', 'oros-ce',             20);

create table public.neighborhoods (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid not null references public.cities(id) on delete restrict,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (city_id, name),
  unique (city_id, slug)
);

create index neighborhoods_city_id_idx on public.neighborhoods (city_id);

insert into public.neighborhoods (city_id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Centro',                       'centro'),
  ('11111111-1111-1111-1111-111111111111', 'Aviário',                      'aviario'),
  ('11111111-1111-1111-1111-111111111111', 'Brasília',                     'brasilia'),
  ('11111111-1111-1111-1111-111111111111', 'Calumbi',                      'calumbi'),
  ('11111111-1111-1111-1111-111111111111', 'Capuchinhos',                  'capuchinhos'),
  ('11111111-1111-1111-1111-111111111111', 'Caseb',                        'caseb'),
  ('11111111-1111-1111-1111-111111111111', 'Cidade Nova',                  'cidade-nova'),
  ('11111111-1111-1111-1111-111111111111', 'Conceição',                    'conceicao'),
  ('11111111-1111-1111-1111-111111111111', 'Cruzeiro',                     'cruzeiro'),
  ('11111111-1111-1111-1111-111111111111', 'Estação Nova',                 'estacao-nova'),
  ('11111111-1111-1111-1111-111111111111', 'Gabriela',                     'gabriela'),
  ('11111111-1111-1111-1111-111111111111', 'George Américo',               'george-americo'),
  ('11111111-1111-1111-1111-111111111111', 'Jardim Acácia',                'jardim-acacia'),
  ('11111111-1111-1111-1111-111111111111', 'Jardim Cruzeiro',              'jardim-cruzeiro'),
  ('11111111-1111-1111-1111-111111111111', 'Mangabeira',                   'mangabeira'),
  ('11111111-1111-1111-1111-111111111111', 'Muchila',                      'muchila'),
  ('11111111-1111-1111-1111-111111111111', 'Olhos D''Água',                'olhos-dagua'),
  ('11111111-1111-1111-1111-111111111111', 'Pampalona',                    'pampalona'),
  ('11111111-1111-1111-1111-111111111111', 'Papagaio',                     'papagaio'),
  ('11111111-1111-1111-1111-111111111111', 'Parque Ipê',                   'parque-ipe'),
  ('11111111-1111-1111-1111-111111111111', 'Ponto Central',                'ponto-central'),
  ('11111111-1111-1111-1111-111111111111', 'Queimadinha',                  'queimadinha'),
  ('11111111-1111-1111-1111-111111111111', 'Rua Nova',                     'rua-nova'),
  ('11111111-1111-1111-1111-111111111111', 'Santa Mônica',                 'santa-monica'),
  ('11111111-1111-1111-1111-111111111111', 'Santo Antônio dos Prazeres',   'santo-antonio-dos-prazeres'),
  ('11111111-1111-1111-1111-111111111111', 'Sim',                          'sim'),
  ('11111111-1111-1111-1111-111111111111', 'Sobradinho',                   'sobradinho'),
  ('11111111-1111-1111-1111-111111111111', 'Subaé',                        'subae'),
  ('11111111-1111-1111-1111-111111111111', 'Tomba',                        'tomba'),
  ('11111111-1111-1111-1111-111111111111', 'Tanque da Nação',              'tanque-da-nacao'),
  ('11111111-1111-1111-1111-111111111111', 'Outro',                        'outro');

insert into public.neighborhoods (city_id, name, slug) values
  ('22222222-2222-2222-2222-222222222222', 'Centro',      'centro'),
  ('22222222-2222-2222-2222-222222222222', 'São Geraldo', 'sao-geraldo'),
  ('22222222-2222-2222-2222-222222222222', 'Alto',        'alto');

-- ============================================================================
-- Businesses
-- ============================================================================

create type public.business_status as enum ('pending', 'approved', 'rejected', 'suspended');

create table public.businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  handle text not null,
  name text not null,
  category_id uuid not null references public.business_categories(id) on delete restrict,
  city_id uuid not null references public.cities(id) on delete restrict,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete restrict,
  short_description text check (short_description is null or char_length(short_description) <= 180),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  instagram text,
  offers_delivery boolean not null default false,
  logo_path text,
  cover_path text,
  status public.business_status not null default 'pending',
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  search_tsv tsvector generated always as (
    setweight(to_tsvector('portuguese', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(short_description, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz,

  constraint handle_format check (
    handle ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$'
    and handle !~ '--'
  ),
  constraint handle_not_reserved check (handle not in (
    'admin','dashboard','api','auth','login','signup','logout','negocio','b',
    'categoria','bairro','cidade','sobre','contato','termos','privacidade','app','www',
    'static','public','assets','supabase','root','settings','help','support','feed','search'
  ))
);

create unique index businesses_handle_lower_idx on public.businesses (lower(handle));
create index businesses_user_id_idx on public.businesses (user_id);
create index businesses_category_id_idx on public.businesses (category_id);
create index businesses_city_id_idx on public.businesses (city_id);
create index businesses_neighborhood_id_idx on public.businesses (neighborhood_id);
create index businesses_status_visible_idx on public.businesses (status) where deleted_at is null;
create index businesses_search_idx on public.businesses using gin (search_tsv);

create or replace function public.enforce_neighborhood_city()
returns trigger language plpgsql as $$
declare
  nh_city uuid;
begin
  select city_id into nh_city from public.neighborhoods where id = new.neighborhood_id;
  if nh_city is null then
    raise exception 'neighborhood % not found', new.neighborhood_id;
  end if;
  if nh_city <> new.city_id then
    raise exception 'neighborhood % does not belong to city %', new.neighborhood_id, new.city_id;
  end if;
  return new;
end;
$$;

create trigger businesses_neighborhood_city
  before insert or update of neighborhood_id, city_id
  on public.businesses
  for each row execute function public.enforce_neighborhood_city();

create trigger businesses_updated
  before update on public.businesses
  for each row execute function public.set_updated_at();

create or replace function public.is_business_public(b_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses
    where id = b_id and status = 'approved' and deleted_at is null
  );
$$;

-- ============================================================================
-- Business products + images
-- ============================================================================

create table public.business_products (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null check (price_cents >= 0),
  stock_quantity int check (stock_quantity is null or stock_quantity >= 0),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create index business_products_business_id_idx on public.business_products (business_id);
create index business_products_active_idx on public.business_products (business_id, is_active)
  where deleted_at is null;

create trigger business_products_updated
  before update on public.business_products
  for each row execute function public.set_updated_at();

create table public.business_product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.business_products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index business_product_images_product_id_idx on public.business_product_images (product_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles                enable row level security;
alter table public.business_categories     enable row level security;
alter table public.cities                  enable row level security;
alter table public.neighborhoods           enable row level security;
alter table public.businesses              enable row level security;
alter table public.business_products       enable row level security;
alter table public.business_product_images enable row level security;

-- profiles
create policy "profiles: self read" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: self update" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());
create policy "profiles: admin all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- categories / cities / neighborhoods (anon read; admin write)
create policy "categories: anon read active" on public.business_categories
  for select using (is_active = true);
create policy "categories: admin all" on public.business_categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "cities: anon read active" on public.cities
  for select using (is_active = true);
create policy "cities: admin all" on public.cities
  for all using (public.is_admin()) with check (public.is_admin());

create policy "neighborhoods: anon read active" on public.neighborhoods
  for select using (is_active = true);
create policy "neighborhoods: admin all" on public.neighborhoods
  for all using (public.is_admin()) with check (public.is_admin());

-- businesses
create policy "businesses: public approved read" on public.businesses
  for select using (status = 'approved' and deleted_at is null);
create policy "businesses: owner read own" on public.businesses
  for select using (user_id = auth.uid());
create policy "businesses: owner insert own" on public.businesses
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and rejection_reason is null
    and reviewed_at is null
    and reviewed_by is null
  );
-- Owner can edit their own business but cannot self-modify moderation fields.
-- A separate trigger below blocks tampering; this WITH CHECK is the second line of defense.
create policy "businesses: owner update own" on public.businesses
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "businesses: owner delete own" on public.businesses
  for delete using (user_id = auth.uid());
create policy "businesses: admin all" on public.businesses
  for all using (public.is_admin()) with check (public.is_admin());

-- Block non-admins from changing status, rejection_reason, reviewed_at, reviewed_by
create or replace function public.protect_business_moderation_fields()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.rejection_reason is distinct from old.rejection_reason
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by then
    raise exception 'moderation fields are not editable by non-admins';
  end if;
  return new;
end;
$$;

create trigger businesses_protect_moderation
  before update on public.businesses
  for each row execute function public.protect_business_moderation_fields();

-- business_products
create policy "products: public read of approved business" on public.business_products
  for select using (
    is_active = true
    and deleted_at is null
    and public.is_business_public(business_id)
  );
create policy "products: owner read own" on public.business_products
  for select using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );
create policy "products: owner insert own" on public.business_products
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );
create policy "products: owner update own" on public.business_products
  for update using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );
create policy "products: owner delete own" on public.business_products
  for delete using (
    exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
  );
create policy "products: admin all" on public.business_products
  for all using (public.is_admin()) with check (public.is_admin());

-- business_product_images
create policy "product images: public read of public product" on public.business_product_images
  for select using (
    exists (
      select 1 from public.business_products p
      where p.id = product_id
        and p.is_active = true
        and p.deleted_at is null
        and public.is_business_public(p.business_id)
    )
  );
create policy "product images: owner read own" on public.business_product_images
  for select using (
    exists (
      select 1 from public.business_products p
      join public.businesses b on b.id = p.business_id
      where p.id = product_id and b.user_id = auth.uid()
    )
  );
create policy "product images: owner write own" on public.business_product_images
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
create policy "product images: admin all" on public.business_product_images
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Storage buckets
-- ============================================================================

insert into storage.buckets (id, name, public) values
  ('business-logos',          'business-logos',          true),
  ('business-covers',         'business-covers',         true),
  ('business-product-images', 'business-product-images', true)
on conflict (id) do nothing;

create policy "business-logos: anon read" on storage.objects
  for select using (bucket_id = 'business-logos');
create policy "business-logos: owner write" on storage.objects
  for insert with check (
    bucket_id = 'business-logos'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
create policy "business-logos: owner update" on storage.objects
  for update using (
    bucket_id = 'business-logos'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
create policy "business-logos: owner delete" on storage.objects
  for delete using (
    bucket_id = 'business-logos'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

create policy "business-covers: anon read" on storage.objects
  for select using (bucket_id = 'business-covers');
create policy "business-covers: owner write" on storage.objects
  for insert with check (
    bucket_id = 'business-covers'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
create policy "business-covers: owner update" on storage.objects
  for update using (
    bucket_id = 'business-covers'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
create policy "business-covers: owner delete" on storage.objects
  for delete using (
    bucket_id = 'business-covers'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

create policy "business-product-images: anon read" on storage.objects
  for select using (bucket_id = 'business-product-images');
create policy "business-product-images: owner write" on storage.objects
  for insert with check (
    bucket_id = 'business-product-images'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
create policy "business-product-images: owner update" on storage.objects
  for update using (
    bucket_id = 'business-product-images'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
create policy "business-product-images: owner delete" on storage.objects
  for delete using (
    bucket_id = 'business-product-images'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

-- ============================================================================
-- Promote first admin manually after signup, e.g.:
--   update public.profiles set role = 'admin' where email = 'icarofdiniz@gmail.com';
-- ============================================================================
