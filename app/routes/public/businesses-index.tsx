import { Form, Link, useLoaderData } from "react-router";
import { Frown } from "lucide-react";
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
  if (isError(categories)) throw new Response(categories.error, { status: 500 });
  if (isError(cities)) throw new Response(cities.error, { status: 500 });
  if (isError(neighborhoods))
    throw new Response(neighborhoods.error, { status: 500 });

  const total = businesses.success.total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    user: ctx.user ? { id: ctx.user.id, email: ctx.user.email ?? null } : null,
    profile: ctx.profile,
    businesses: businesses.success.items.map((b) => ({
      ...b,
      logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
      cover_url: getPublicUrl(ctx.supabase, "business-covers", b.cover_path),
    })),
    categories: categories.success,
    cities: cities.success,
    neighborhoods: neighborhoods.success,
    filters: {
      cityId: cityId ?? "",
      categoryId: categoryId ?? "",
      neighborhoodId: neighborhoodId ?? "",
      q: q ?? "",
    },
    page,
    total,
    totalPages,
  };
}

export default function BusinessesIndex() {
  const {
    user,
    profile,
    businesses,
    categories,
    cities,
    neighborhoods,
    filters,
    page,
    total,
    totalPages,
  } = useLoaderData<typeof loader>();

  const filteredNeighborhoods = filters.cityId
    ? neighborhoods.filter((n) => n.city_id === filters.cityId)
    : neighborhoods;

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader user={user} role={profile?.role} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-baseline justify-between gap-2 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-700">
            Empresas
          </h1>
          <span className="text-xs text-muted-foreground">
            {total} {total === 1 ? "empresa" : "empresas"}
          </span>
        </div>

        <Form
          method="get"
          className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-4"
        >
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Buscar por nome…"
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm sm:col-span-2"
          />
          <select
            name="city"
            defaultValue={filters.cityId}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todas as cidades</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.state}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={filters.categoryId}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="neighborhood"
            defaultValue={filters.neighborhoodId}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todos os bairros</option>
            {filteredNeighborhoods.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className={`${buttonVariants({ variant: "default", size: "default" })} sm:col-span-1`}
          >
            Filtrar
          </button>
        </Form>

        <div className="pt-6">
          {businesses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
              <span className="flex gap-2 text-muted-foreground items-center justify-center font-medium">
                OOPS! <Frown />
              </span>
              <p className="text-sm text-muted-foreground">
                Nenhum negócio encontrado para os filtros selecionados.
              </p>
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
        </div>

        <Pagination page={page} totalPages={totalPages} />

        <div className="pt-10 text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Voltar à página inicial
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
