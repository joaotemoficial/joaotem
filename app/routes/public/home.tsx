import { Form, Link, useLoaderData } from "react-router";
import { BusinessCard } from "~/components/business/business-card";
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
import { Building2, Mail, MapPin, MessageCircle, Search } from "lucide-react";
import { CategoriesCarousel } from "~/components/categories/categories-carousel";

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

  const [businesses, categories, cities, neighborhoods, promotions] =
    await Promise.all([
      businessesRepo.listPublic({
        supabase: ctx.supabase,
        cityId: cityId || undefined,
        categoryId: categoryId || undefined,
        neighborhoodId: neighborhoodId || undefined,
        q: q || undefined,
        limit: 6,
        random: true,
      }),
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
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
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
                  <Search />
                  Buscar agora
                </button>
                <Link
                  to="/signup"
                  className={buttonVariants({
                    variant: "secondary",
                    size: "lg",
                    className: "h-11 gap-2 px-5",
                  })}
                >
                  <Building2 />
                  Cadastrar negócio
                </Link>
              </div>
            </Form>
          </div>
        </div>
      </section>

      <section id="categorias" className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-lg font-semibold tracking-tight pb-3">
          Categorias
        </h2>
        <CategoriesCarousel categories={categories} />
      </section>

      <section
        id="empresas-em-destaque"
        className="mx-auto max-w-6xl px-4 py-8"
      >
        <h2 className="text-lg font-semibold tracking-tight pb-3">
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

      <footer className="mt-12 border-t border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3 sm:col-span-2 lg:col-span-1">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-lg font-bold tracking-tight"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </span>
                JoaoTem
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                O guia comercial online de Orós - CE. Encontre empresas,
                produtos e promoções perto de você.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold tracking-tight">
                Navegação
              </h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/"
                    className="transition-colors hover:text-foreground"
                  >
                    Início
                  </Link>
                </li>
                <li>
                  <Link
                    to="/#categorias"
                    className="transition-colors hover:text-foreground"
                  >
                    Categorias
                  </Link>
                </li>
                <li>
                  <Link
                    to="/#empresas-em-destaque"
                    className="transition-colors hover:text-foreground"
                  >
                    Empresas
                  </Link>
                </li>
                <li>
                  <Link
                    to="/signup"
                    className="transition-colors hover:text-foreground"
                  >
                    Cadastrar negócio
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold tracking-tight">
                Contato
              </h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <a
                    href="https://wa.me/55"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                  >
                    <MessageCircle className="size-4 text-green-600" />
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contato@joaotem.com.br"
                    className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                  >
                    <Mail className="size-4" />
                    contato@joaotem.com.br
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold tracking-tight">
                Siga-nos
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href="#"
                  aria-label="Instagram"
                  className="grid size-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                    aria-hidden
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="grid size-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                    aria-hidden
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a
                  href="https://wa.me/55"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="WhatsApp"
                  className="grid size-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  <MessageCircle className="size-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} JoaoTem. Todos os direitos
              reservados.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="#" className="transition-colors hover:text-foreground">
                Termos de uso
              </Link>
              <span className="h-3 w-px bg-border" />
              <Link to="#" className="transition-colors hover:text-foreground">
                Privacidade
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
