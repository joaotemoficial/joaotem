import { Form, Link, useLoaderData } from "react-router";
import { ArrowLeft, ChevronDown, Frown, Search, Truck, X } from "lucide-react";
import { BusinessCard } from "~/components/business/business-card";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import { Pagination } from "~/components/ui/pagination";
import { buttonVariants } from "~/components/ui/button";
import { getSessionAndProfile } from "~/lib/auth.server";
import { getPublicUrl } from "~/lib/storage.server";
import * as businessesRepo from "~/repositories/businesses";
import * as categoriesRepo from "~/repositories/categories";
import * as citiesRepo from "~/repositories/cities";
import * as neighborhoodsRepo from "~/repositories/neighborhoods";
import { isError } from "~/types";
import type { Route } from "./+types/businesses-index";

const PAGE_SIZE = 20;

export const meta: Route.MetaFunction = () => [
  { title: "Empresas — JoaoTem" },
  {
    name: "description",
    content: "Veja todas as empresas cadastradas no João Tem.",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await getSessionAndProfile(request);
  const url = new URL(request.url);
  const cityId = url.searchParams.get("city") ?? undefined;
  const categoryId = url.searchParams.get("category") ?? undefined;
  const neighborhoodId = url.searchParams.get("neighborhood") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const delivery = url.searchParams.get("delivery") === "1";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [businesses, categories, cities, neighborhoods] = await Promise.all([
    businessesRepo.listPublicPaginated({
      supabase: ctx.supabase,
      q,
      cityId: cityId || undefined,
      categoryId: categoryId || undefined,
      neighborhoodId: neighborhoodId || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    categoriesRepo.listActive({ supabase: ctx.supabase }),
    citiesRepo.listActive({ supabase: ctx.supabase }),
    neighborhoodsRepo.listAll({ supabase: ctx.supabase }),
  ]);
  if (isError(businesses)) {
    console.error("[businesses-index.loader] businesses:", businesses.error);
    throw new Response(businesses.error, { status: 500 });
  }
  if (isError(categories))
    throw new Response(categories.error, { status: 500 });
  if (isError(cities)) throw new Response(cities.error, { status: 500 });
  if (isError(neighborhoods))
    throw new Response(neighborhoods.error, { status: 500 });

  const total = businesses.success.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  let items = businesses.success.items.map((b) => ({
    ...b,
    logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
    cover_url: getPublicUrl(ctx.supabase, "business-covers", b.cover_path),
  }));

  if (delivery) items = items.filter((b) => b.offers_delivery);

  const selectedCategory =
    categories.success.find((c) => c.id === categoryId) ?? null;

  return {
    user: ctx.user ? { id: ctx.user.id, email: ctx.user.email ?? null } : null,
    profile: ctx.profile,
    businesses: items,
    categories: categories.success,
    cities: cities.success,
    neighborhoods: neighborhoods.success,
    selectedCategoryName: selectedCategory?.name ?? null,
    filters: {
      cityId: cityId ?? "",
      categoryId: categoryId ?? "",
      neighborhoodId: neighborhoodId ?? "",
      q: q ?? "",
      delivery,
    },
    page,
    total: delivery ? items.length : total,
    totalPages,
    deliveryActive: delivery,
  };
}

function autoSubmit(e: { currentTarget: { form: HTMLFormElement | null } }) {
  e.currentTarget.form?.requestSubmit();
}

function FilterSelect({
  name,
  defaultValue,
  ariaLabel,
  children,
}: {
  name: string;
  defaultValue: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        name={name}
        defaultValue={defaultValue}
        aria-label={ariaLabel}
        onChange={autoSubmit}
        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-input bg-card pl-3.5 pr-9 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export default function BusinessesIndex() {
  const {
    user,
    profile,
    businesses,
    categories,
    cities,
    neighborhoods,
    selectedCategoryName,
    filters,
    page,
    total,
    totalPages,
    deliveryActive,
  } = useLoaderData<typeof loader>();

  const filteredNeighborhoods = filters.cityId
    ? neighborhoods.filter((n) => n.city_id === filters.cityId)
    : neighborhoods;

  const hasActiveFilters = Boolean(
    filters.q ||
    filters.cityId ||
    filters.categoryId ||
    filters.neighborhoodId ||
    filters.delivery,
  );

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader user={user} role={profile?.role} />

      <Form method="get" className="flex-1">
        <section className="bg-[#102841]">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="size-3.5" />
              Voltar
            </Link>
            <h1 className="mt-4 max-w-2xl text-balance text-2xl font-bold leading-tight text-white sm:text-3xl">
              {selectedCategoryName ? (
                <>
                  Negócios em{" "}
                  <span className="text-blue-400">{selectedCategoryName}</span>
                </>
              ) : (
                <>
                  Encontre negócios{" "}
                  <span className="text-blue-400">perto de você</span>
                </>
              )}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-blue-100/80">
              Procure por bairro, categoria ou nome e fale direto com o comércio
              da sua cidade.
            </p>
          </div>
        </section>

        <main className="mx-auto w-full max-w-6xl px-4 py-6">
          <div className="mb-6 -mx-4 border-b border-border/70 px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border sm:px-4 sm:shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  name="q"
                  defaultValue={filters.q}
                  placeholder="Procure por bairro, categoria ou nome"
                  className="h-12 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                className={buttonVariants({
                  variant: "default",
                  size: "lg",
                  className: "h-12 shrink-0 gap-2 rounded-xl px-8",
                })}
              >
                <Search className="size-[18px]" />
                Buscar
              </button>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
                <FilterSelect
                  name="category"
                  defaultValue={filters.categoryId}
                  ariaLabel="Categoria"
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </FilterSelect>

                {cities.length > 1 ? (
                  <FilterSelect
                    name="city"
                    defaultValue={filters.cityId}
                    ariaLabel="Cidade"
                  >
                    <option value="">Todas as cidades</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.state}
                      </option>
                    ))}
                  </FilterSelect>
                ) : null}

                <FilterSelect
                  name="neighborhood"
                  defaultValue={filters.neighborhoodId}
                  ariaLabel="Bairro"
                >
                  <option value="">Todos os bairros</option>
                  {filteredNeighborhoods.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </FilterSelect>

                <label className="inline-flex h-10 cursor-pointer select-none items-center gap-2 rounded-xl border border-input bg-card px-3.5 text-sm font-medium text-muted-foreground shadow-xs transition-colors hover:border-primary/40 has-checked:border-whatsapp has-checked:bg-whatsapp/10 has-checked:text-[#0f7a3d]">
                  <input
                    type="checkbox"
                    name="delivery"
                    value="1"
                    defaultChecked={filters.delivery}
                    onChange={autoSubmit}
                    className="sr-only"
                  />
                  <Truck className="size-4" />
                  Faz entrega
                </label>

                {hasActiveFilters ? (
                  <Link
                    to="/negocios"
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                    Limpar
                  </Link>
                ) : null}
              </div>

              <span className="shrink-0 text-sm text-muted-foreground lg:text-right">
                <strong className="font-semibold text-foreground">
                  {total}
                </strong>{" "}
                {total === 1 ? "negócio encontrado" : "negócios encontrados"}
              </span>
            </div>
          </div>

          {businesses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
              <span className="flex items-center justify-center gap-2 font-medium text-muted-foreground">
                OOPS! <Frown />
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                Não encontramos negócios com os filtros selecionados.
              </p>
              {hasActiveFilters ? (
                <Link
                  to="/negocios"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "mt-4 gap-1.5",
                  })}
                >
                  <X className="size-4" />
                  Limpar filtros
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((b) => (
                <li key={b.id}>
                  <BusinessCard
                    business={b}
                    logoUrl={b.logo_url}
                    coverUrl={b.cover_url}
                  />
                </li>
              ))}
            </ul>
          )}

          {deliveryActive ? null : (
            <Pagination page={page} totalPages={totalPages} />
          )}
        </main>
      </Form>

      <SiteFooter />
    </div>
  );
}
