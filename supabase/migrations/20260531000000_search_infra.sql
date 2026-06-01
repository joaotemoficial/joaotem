-- ============================================================================
-- JoaoTem — Busca textual flexível (infra de indexação)
--
-- A busca atual só faz `name ILIKE '%q%'`. Este arquivo monta a infraestrutura
-- para indexar nome + categoria + descrição + produtos + promoções com:
--   • FTS português + unaccent (ignora acentos, stemming de plural/gênero)
--   • trigram (pg_trgm) para substring ("mercado" em "Supermercado") e typos
--
-- A coluna `search_tsv` (hoje GENERATED, só name+short_description) é convertida
-- em coluna normal mantida por trigger, pois precisa agregar dados de OUTRAS
-- tabelas (categoria, produtos, promoções) — o que uma coluna gerada não pode.
-- Usamos ALTER COLUMN ... DROP EXPRESSION para preservar posição, dados e o
-- índice GIN existente `businesses_search_idx`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensões + configuração de busca em português que remove acentos.
--    Instaladas no schema `extensions` (convenção Supabase).
-- ----------------------------------------------------------------------------
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Config de FTS que aplica o dicionário unaccent antes do stemmer português.
-- Usar `to_tsvector('public.pt_unaccent', ...)` é IMMUTABLE (o Postgres trata
-- configs de busca como imutáveis), logo seguro em índices/expressões.
create text search configuration public.pt_unaccent ( copy = pg_catalog.portuguese );
alter text search configuration public.pt_unaccent
  alter mapping for hword, hword_part, word
  with extensions.unaccent, portuguese_stem;

-- Wrapper IMMUTABLE em volta da forma 2-args de unaccent (a forma 1-arg é só
-- STABLE). Usado para normalizar o blob de texto do trigram e a query.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public, extensions
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- ----------------------------------------------------------------------------
-- 2. Converte search_tsv (gerada) em coluna normal e adiciona o blob do trigram.
--    DROP EXPRESSION mantém a coluna, os dados e o índice businesses_search_idx.
-- ----------------------------------------------------------------------------
alter table public.businesses alter column search_tsv drop expression;
alter table public.businesses add column if not exists search_text text;

-- ----------------------------------------------------------------------------
-- 3. Função única que recalcula search_tsv (ponderada) + search_text (trigram)
--    de um negócio, agregando categoria + produtos + promoções ativos.
--    SECURITY DEFINER: garante índice completo mesmo quando a RLS do dono
--    esconderia linhas irmãs.
-- ----------------------------------------------------------------------------
create or replace function public.businesses_refresh_search(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name     text;
  v_short    text;
  v_cat      text;
  v_products text;
  v_promos   text;
begin
  select b.name, b.short_description, c.name
    into v_name, v_short, v_cat
    from public.businesses b
    join public.business_categories c on c.id = b.category_id
   where b.id = p_business_id;

  if not found then
    return;  -- negócio inexistente (ex.: meio de um delete); nada a fazer
  end if;

  select string_agg(coalesce(p.name, '') || ' ' || coalesce(p.description, ''), ' ')
    into v_products
    from public.business_products p
   where p.business_id = p_business_id
     and p.is_active = true
     and p.deleted_at is null;

  select string_agg(coalesce(pr.title, '') || ' ' || coalesce(pr.description, ''), ' ')
    into v_promos
    from public.business_promotions pr
   where pr.business_id = p_business_id
     and pr.is_active = true
     and pr.deleted_at is null;

  update public.businesses set
    search_tsv =
        setweight(to_tsvector('public.pt_unaccent', coalesce(v_name, '')),  'A')
     || setweight(to_tsvector('public.pt_unaccent', coalesce(v_cat, '')),   'B')
     || setweight(to_tsvector('public.pt_unaccent', coalesce(v_short, '')), 'C')
     || setweight(to_tsvector('public.pt_unaccent',
            coalesce(v_products, '') || ' ' || coalesce(v_promos, '')),     'D'),
    search_text = lower(public.f_unaccent(
        concat_ws(' ', v_name, v_cat, v_short, v_products, v_promos)))
  where id = p_business_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Triggers que mantêm o índice em dia.
-- ----------------------------------------------------------------------------

-- BUSINESSES: recalcula em insert/update de name|short_description|category_id.
-- O UPDATE feito pelo refresh só toca search_tsv/search_text (fora do `of`),
-- então NÃO re-dispara este trigger -> sem recursão.
create or replace function public.tg_businesses_search_refresh()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  perform public.businesses_refresh_search(new.id);
  return new;
end;
$$;

create trigger businesses_search_refresh
  after insert or update of name, short_description, category_id
  on public.businesses
  for each row execute function public.tg_businesses_search_refresh();

-- PRODUTOS / PROMOÇÕES: recalcula o negócio pai (e o antigo, se mudar de dono).
create or replace function public.tg_business_child_search_refresh()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  if tg_op = 'DELETE' then
    perform public.businesses_refresh_search(old.business_id);
    return old;
  end if;
  perform public.businesses_refresh_search(new.business_id);
  if tg_op = 'UPDATE' and new.business_id is distinct from old.business_id then
    perform public.businesses_refresh_search(old.business_id);
  end if;
  return new;
end;
$$;

create trigger business_products_search_refresh
  after insert or delete or update of name, description, is_active, deleted_at, business_id
  on public.business_products
  for each row execute function public.tg_business_child_search_refresh();

create trigger business_promotions_search_refresh
  after insert or delete or update of title, description, is_active, deleted_at, business_id
  on public.business_promotions
  for each row execute function public.tg_business_child_search_refresh();

-- CATEGORIA renomeada: recalcula todos os negócios dela (ação rara de admin).
create or replace function public.tg_category_search_refresh()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare r record;
begin
  if new.name is not distinct from old.name then
    return new;
  end if;
  for r in select id from public.businesses where category_id = new.id loop
    perform public.businesses_refresh_search(r.id);
  end loop;
  return new;
end;
$$;

create trigger business_categories_search_refresh
  after update of name on public.business_categories
  for each row execute function public.tg_category_search_refresh();

-- ----------------------------------------------------------------------------
-- 5. Índices. `businesses_search_idx` (GIN em search_tsv) já existe e é mantido.
--    Adiciona o GIN trigram para LIKE '%q%' (curinga à esquerda) e similarity().
-- ----------------------------------------------------------------------------
create index if not exists businesses_search_trgm_idx
  on public.businesses using gin (search_text extensions.gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 6. Backfill de todas as linhas existentes + atualiza estatísticas.
--    ⚠️ Import em massa de produtos dispara o refresh por linha. Para seed/ETL
--    em lote, use: `alter table business_products disable trigger
--    business_products_search_refresh;` ... insert em lote ...
--    `enable trigger;` e então chame businesses_refresh_search() uma vez por
--    negócio afetado.
-- ----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select id from public.businesses loop
    perform public.businesses_refresh_search(r.id);
  end loop;
end $$;

analyze public.businesses;
