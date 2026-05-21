import { Form, Link, useLoaderData } from "react-router";
import { BusinessCard } from "~/components/business/business-card";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import { buttonVariants } from "~/components/ui/button";
import { getSessionAndProfile } from "~/lib/auth.server";
import { PROMOTION_IMAGE_BUCKET, getPublicUrl } from "~/lib/storage.server";
import * as businessesRepo from "~/repositories/businesses";
import * as categoriesRepo from "~/repositories/categories";
import * as citiesRepo from "~/repositories/cities";
import * as neighborhoodsRepo from "~/repositories/neighborhoods";
import * as promotionsRepo from "~/repositories/promotions";
import { isError } from "~/types";
import type { Route } from "./+types/home";
import {
  Building2,
  Frown,
  MapPin,
  MessageCircle,
  Search,
  Store,
} from "lucide-react";
import { CategoriesCarousel } from "~/components/categories/categories-carousel";

const HOW_IT_WORKS_STEPS = [
  {
    n: 1,
    Icon: Search,
    title: "Encontre o que precisa",
    desc: "Pesquise empresas, produtos e serviços em Orós.",
  },
  {
    n: 2,
    Icon: Store,
    title: "Escolha uma empresa",
    desc: "Veja informações das empresas e os serviços que elas oferecem.",
  },
  {
    n: 3,
    Icon: MessageCircle,
    title: "Entre em contato",
    desc: "Fale com as empresas pelos contatos disponíveis.",
  },
] as const;

export const meta: Route.MetaFunction = () => [
  {
    title: "JoaoTem — Marketplace de negócios locais",
  },
  {
    name: "description",
    content:
      "Descubra negócios locais em Feira de Santana - BA e Orós - CE. Cadastre o seu também.",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await getSessionAndProfile(request);
  const url = new URL(request.url);
  const cityId = url.searchParams.get("city") ?? undefined;
  const categoryId = url.searchParams.get("category") ?? undefined;
  const neighborhoodId = url.searchParams.get("neighborhood") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  const hasQuery = !!(q && q.trim().length > 0);
  // No query → landing-page rotation (only 6 random Ouro businesses).
  // Has query → search results with Ouro first, then Básico (the only place
  // Básico businesses become visible).
  const businessesPromise = hasQuery
    ? businessesRepo.listPublicForSearch({
        supabase: ctx.supabase,
        q,
        cityId: cityId || undefined,
        categoryId: categoryId || undefined,
        neighborhoodId: neighborhoodId || undefined,
        limit: 24,
      })
    : businessesRepo.listPublic({
        supabase: ctx.supabase,
        cityId: cityId || undefined,
        categoryId: categoryId || undefined,
        neighborhoodId: neighborhoodId || undefined,
        limit: 6,
        random: true,
        planFilter: "ouro",
      });

  const [businesses, categories, cities, neighborhoods, promotions] =
    await Promise.all([
      businessesPromise,
      categoriesRepo.listActive({ supabase: ctx.supabase }),
      citiesRepo.listActive({ supabase: ctx.supabase }),
      neighborhoodsRepo.listAll({ supabase: ctx.supabase }),
      promotionsRepo.listPublicTodayFeed({
        supabase: ctx.supabase,
        limit: 12,
      }),
    ]);
  if (isError(businesses)) {
    console.error("[home.loader] businesses:", businesses.error);
    throw new Response(businesses.error, { status: 500 });
  }
  if (isError(categories)) {
    console.error("[home.loader] categories:", categories.error);
    throw new Response(categories.error, { status: 500 });
  }
  if (isError(cities)) {
    console.error("[home.loader] cities:", cities.error);
    throw new Response(cities.error, { status: 500 });
  }
  if (isError(neighborhoods)) {
    console.error("[home.loader] neighborhoods:", neighborhoods.error);
    throw new Response(neighborhoods.error, { status: 500 });
  }
  const promotionsList = isError(promotions) ? [] : promotions.success;

  return {
    user: ctx.user ? { id: ctx.user.id, email: ctx.user.email ?? null } : null,
    profile: ctx.profile,
    businesses: businesses.success.map((b) => ({
      ...b,
      logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
      cover_url: getPublicUrl(ctx.supabase, "business-covers", b.cover_path),
    })),
    promotions: promotionsList.map((p) => {
      const cover = (p.images ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)[0];
      const biz = Array.isArray(p.business) ? p.business[0] : p.business;
      const bizCity = biz?.city
        ? Array.isArray(biz.city)
          ? biz.city[0]
          : biz.city
        : null;
      const bizNeighborhood = biz?.neighborhood
        ? Array.isArray(biz.neighborhood)
          ? biz.neighborhood[0]
          : biz.neighborhood
        : null;
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        schedule_note: p.schedule_note,
        cover_url: cover
          ? getPublicUrl(
              ctx.supabase,
              PROMOTION_IMAGE_BUCKET,
              cover.storage_path,
            )
          : null,
        business: biz
          ? {
              handle: biz.handle,
              name: biz.name,
              logo_url: getPublicUrl(
                ctx.supabase,
                "business-logos",
                biz.logo_path,
              ),
              city: bizCity,
              neighborhood: bizNeighborhood,
            }
          : null,
      };
    }),
    categories: categories.success,
    cities: cities.success,
    neighborhoods: neighborhoods.success,
    filters: {
      cityId: cityId ?? "",
      categoryId: categoryId ?? "",
      neighborhoodId: neighborhoodId ?? "",
      q: q ?? "",
    },
  };
}

export default function Home() {
  const {
    user,
    profile,
    businesses,
    promotions,
    categories,
    cities,
    neighborhoods,
    filters,
  } = useLoaderData<typeof loader>();

  const filteredNeighborhoods = filters.cityId
    ? neighborhoods.filter((n) => n.city_id === filters.cityId)
    : neighborhoods;

  const orosCity = cities.find((c) => c.name === "Orós" && c.state === "CE");
  const defaultHeroCityId = orosCity?.id ?? "";

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader user={user} role={profile?.role} />

      <section
        id="hero"
        className="relative overflow-hidden border-b border-border/60"
      >
        <img
          src="/oros.jpeg"
          alt="Vista de Orós - CE"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 " />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-24 lg:py-32">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl font-bold text-slate-700 leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Encontre tudo em{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary">Orós</span>
              </span>{" "}
              em um so lugar
            </h1>
            <p className="max-w-xl text-base leading-relaxed  sm:text-lg">
              O João Tem é o seu guia comercial online de Orós. Busque empresas,
              produtos, serviços e promoções perto de você.
            </p>

            <Form
              method="get"
              action="/#empresas-em-destaque"
              className="flex flex-wrap items-center gap-x-3 gap-y-4 pt-4"
            >
              <div className="flex flex-1 flex-wrap items-center gap-1 rounded-xl border border-white/20 bg-white/95 p-1 shadow-lg backdrop-blur-md sm:flex-nowrap">
                <div className="relative flex min-w-[200px] flex-1 items-center">
                  <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                  <input
                    name="q"
                    placeholder="O que você procura?"
                    className="h-10 w-full rounded-lg border-0 bg-transparent pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <div className="hidden h-6 w-px bg-border sm:block" />
                <div className="relative flex items-center">
                  <MapPin className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                  <select
                    name="city"
                    defaultValue={defaultHeroCityId}
                    className="h-10 rounded-lg border-0 bg-transparent pr-3 pl-9 text-sm text-foreground focus:outline-none"
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className={buttonVariants({
                    variant: "default",
                    size: "lg",
                    className: "h-11 gap-2 px-5",
                  })}
                >
                  <Building2 />
                  Cadastrar negócio
                </button>
                <Link
                  to="/signup"
                  className={buttonVariants({
                    variant: "secondary",
                    size: "lg",
                    className: "h-11 gap-2 px-5",
                  })}
                >
                  <Search />
                  Buscar agora
                </Link>
              </div>
            </Form>
          </div>
        </div>
      </section>

      <section id="categorias" className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-lg  text-slate-700 font-semibold tracking-tight pb-3">
          Categorias
        </h2>
        <CategoriesCarousel categories={categories} />
      </section>

      <section
        id="empresas-em-destaque"
        className="mx-auto max-w-6xl px-4 py-8"
      >
        <h2 className="text-lg text-slate-700 font-semibold tracking-tight pb-3">
          Empresas em Destaque
        </h2>

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
      </section>

      {promotions.length > 0 ? (
        <section className=" mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-baseline justify-between gap-2 pb-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Promoções de hoje
            </h2>
            <span className="text-xs text-muted-foreground">
              {promotions.length}{" "}
              {promotions.length === 1 ? "promoção ativa" : "promoções ativas"}
            </span>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {promotions.map((p) => (
              <li key={p.id}>
                <Link
                  to={p.business ? `/negocio/${p.business.handle}` : "#"}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:border-foreground/20 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                    {p.cover_url ? (
                      <img
                        src={p.cover_url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                        sem imagem
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="flex items-start gap-3">
                      <div className="-mt-7 size-10 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                        {p.business?.logo_url ? (
                          <img
                            src={p.business.logo_url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                            •
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold tracking-tight">
                          {p.title}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.business?.name}
                        </p>
                      </div>
                    </div>
                    {p.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">
                      {p.business?.neighborhood?.name}
                      {p.business?.city
                        ? ` · ${p.business.city.name} - ${p.business.city.state}`
                        : ""}
                      {p.schedule_note ? ` · ${p.schedule_note}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Passo a passo
          </span>
          <h2 className="mt-4 text-slate-700 text-3xl font-bold tracking-tight sm:text-4xl">
            Como funciona?
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Em três passos simples você encontra o que precisa em Orós.
          </p>
        </div>

        <div className="relative mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          <div
            aria-hidden
            className="pointer-events-none absolute top-8 left-[16.67%] right-[16.67%] hidden border-t-2 border-dashed border-border sm:block"
          />

          {HOW_IT_WORKS_STEPS.map(({ n, Icon, title, desc }) => (
            <div
              key={n}
              className="group relative flex flex-col items-center rounded-2xl border border-transparent bg-card/40 p-6 text-center transition-all hover:border-border hover:bg-card hover:shadow-sm"
            >
              <div className="relative z-10 grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-8 ring-background transition-transform group-hover:scale-105">
                <Icon className="size-7" />
                <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border-2 border-background bg-sky-600 text-xs font-bold text-background">
                  {n}
                </span>
              </div>
              <h3 className="mt-5 text-slate-700 text-base font-semibold tracking-tight sm:text-lg">
                {title}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="cta-cadastro" className="mt-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-linear-to-t from-sky-600 to-indigo-600 px-6 py-5 text-primary-foreground sm:flex-row sm:items-center sm:px-8">
            <div className="space-y-1">
              <h2
                id="cta-cadastro"
                className="text-lg font-semibold tracking-tight sm:text-xl"
              >
                Cadastre sua empresa no João Tem
              </h2>
              <p className="text-sm text-primary-foreground/85">
                Apareça para clientes de Orós e venda mais todos os dias.
              </p>
            </div>
            <Link
              to="/signup"
              className="text-primary inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-background px-5 text-sm font-semibold shadow-sm transition-colors hover:bg-background/90"
            >
              <Store className="size-4" />
              Quero cadastrar minha empresa
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
