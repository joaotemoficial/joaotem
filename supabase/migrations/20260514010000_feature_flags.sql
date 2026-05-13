-- ============================================================================
-- JoaoTem — Feature flags
--
-- Admin-controlled toggles + numeric quotas that gate per-plan features.
-- Each flag has plan defaults (Básico/Ouro) and an optional per-business
-- override row in business_feature_overrides.
--
-- Seeds the 11 features shown on the public pricing comparison.
-- ============================================================================

create table public.feature_flags (
  key            text primary key,
  label          text not null,
  description    text,
  flag_type      text not null check (flag_type in ('boolean', 'numeric')),
  enabled        boolean not null default true,            -- master kill switch
  basico_enabled boolean not null default false,
  basico_limit   int     null,                              -- numeric quota; null = n/a or unlimited
  ouro_enabled   boolean not null default true,
  ouro_limit     int     null,
  sort_order     int     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create trigger feature_flags_updated
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

create table public.business_feature_overrides (
  business_id    uuid not null references public.businesses(id) on delete cascade,
  feature_key    text not null references public.feature_flags(key) on delete cascade,
  enabled        boolean null,        -- null = inherit from plan
  limit_override int     null,        -- null = inherit from plan
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz,
  primary key (business_id, feature_key)
);

create trigger business_feature_overrides_updated
  before update on public.business_feature_overrides
  for each row execute function public.set_updated_at();

create index business_feature_overrides_business_id_idx
  on public.business_feature_overrides (business_id);

-- ============================================================================
-- RLS
-- Both tables are read-only to the public surface (anon + authenticated)
-- so the SSR loaders can resolve flags. Writes are admin-only.
-- ============================================================================

alter table public.feature_flags                enable row level security;
alter table public.business_feature_overrides   enable row level security;

create policy "feature_flags: anon read" on public.feature_flags
  for select using (true);
create policy "feature_flags: admin all" on public.feature_flags
  for all using (public.is_admin()) with check (public.is_admin());

create policy "feature_overrides: anon read" on public.business_feature_overrides
  for select using (true);
create policy "feature_overrides: admin all" on public.business_feature_overrides
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Seed: the 11 features from the public pricing image
-- ============================================================================

insert into public.feature_flags
  (key, label, flag_type, basico_enabled, ouro_enabled, basico_limit, ouro_limit, sort_order)
values
  ('cadastro_no_guia',         'Cadastro no guia',          'boolean', true,  true,  null, null,  10),
  ('whatsapp',                 'WhatsApp',                  'boolean', true,  true,  null, null,  20),
  ('instagram',                'Instagram',                 'boolean', true,  true,  null, null,  30),
  ('categoria_loja',           'Categoria da loja',         'boolean', true,  true,  null, null,  40),
  ('destaque_buscas',          'Destaque nas buscas',       'boolean', false, true,  null, null,  50),
  ('vitrine_produtos',         'Vitrine de produtos',       'numeric', false, true,  0,    50,    60),
  ('promocoes_semana',         'Promoções da semana',       'numeric', false, true,  0,    8,     70),
  ('selo_ouro',                'Selo Ouro',                 'boolean', false, true,  null, null,  80),
  ('reposts_instagram',        'Reposts no Instagram',      'boolean', false, true,  null, null,  90),
  ('divulgacao_extra',         'Divulgação extra',          'boolean', false, true,  null, null, 100),
  ('prioridade_visibilidade',  'Prioridade de visibilidade','boolean', false, true,  null, null, 110);
