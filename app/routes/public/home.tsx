import { Form, Link, useLoaderData } from "react-router";
import { BusinessCard } from "~/components/business/business-card";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import { PromotionCard } from "~/components/promotions/promotion-card";
import { buttonVariants } from "~/components/ui/button";
import { getSessionAndProfile } from "~/lib/auth.server";
import { PROMOTION_IMAGE_BUCKET, getPublicUrl } from "~/lib/storage.server";
import * as businessesRepo from "~/repositories/businesses";
import * as categoriesRepo from "~/repositories/categories";
import * as citiesRepo from "~/repositories/cities";
import * as promotionsRepo from "~/repositories/promotions";
import { isError } from "~/types";
import type { Route } from "./+types/home";
import {
  Frown,
  HeartHandshake,
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

const MARKETPLACE_FEATURES = [
  { Icon: HeartHandshake, title: "Apoie o comércio local" },
  { Icon: Search, title: "Encontre tudo em um só lugar" },
  { Icon: MessageCircle, title: "Fale direto no WhatsApp" },
  { Icon: MapPin, title: "Descubra negócios do seu bairro" },
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

  // Landing page: 6 random Ouro businesses + today's promotions feed.
  // Search/filtering lives on /negocios and /promocoes.
  const [businesses, categories, cities, promotions] = await Promise.all([
    businessesRepo.listPublic({
      supabase: ctx.supabase,
      limit: 6,
      random: true,
      planFilter: "ouro",
    }),
    categoriesRepo.listActive({ supabase: ctx.supabase }),
    citiesRepo.listActive({ supabase: ctx.supabase }),
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
  };
}

export default function Home() {
  const { user, profile, businesses, promotions, categories, cities } =
    useLoaderData<typeof loader>();

  const orosCity = cities.find((c) => c.name === "Orós" && c.state === "CE");
  const defaultHeroCityId = orosCity?.id ?? "";

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader user={user} role={profile?.role} />

      <section
        id="hero"
        className="relative overflow-hidden border-b border-border/60 py-16 sm:py-24 lg:py-32"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/oros.jpeg)" }}
        />
        <div aria-hidden className="absolute inset-0 bg-primary/90" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="animate-in fade-in fill-mode-both mb-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm duration-700">
              <span className="size-2 animate-pulse rounded-full bg-whatsapp" />
              <span className="text-sm font-medium text-primary-foreground/90">
                O marketplace da sua cidade
              </span>
            </div>

            <h1 className="animate-in fade-in fill-mode-both mb-6 text-balance text-3xl font-bold leading-tight text-primary-foreground duration-700 [animation-delay:0.1s] sm:text-4xl lg:text-5xl xl:text-6xl">
              Encontre negócios e serviços da sua cidade em um só lugar
            </h1>

            <p className="animate-in fade-in fill-mode-both mb-8 text-lg text-primary-foreground/85 duration-700 [animation-delay:0.2s] sm:text-xl">
              Compre, conheça e apoie empreendedores locais de forma simples e
              rápida.
            </p>

            <Form
              method="get"
              action="/negocios"
              className="animate-in fade-in fill-mode-both relative mx-auto max-w-2xl duration-700 [animation-delay:0.3s]"
            >
              <input type="hidden" name="city" value={defaultHeroCityId} />

              <div className="relative z-10 -mb-4 flex justify-center sm:hidden">
                <img
                  src="/Design%20sem%20nome%20(1).svg"
                  alt="Mascote João Tem"
                  className="size-24 object-contain"
                />
              </div>
              <div className="absolute -top-6 left-1 z-10 hidden sm:block">
                <img
                  src="/Design%20sem%20nome%20(1).svg"
                  alt="Mascote João Tem"
                  className="size-24 object-contain"
                />
              </div>

              <div className="rounded-2xl bg-card p-2 shadow-xl">
                <div className="flex flex-col items-center gap-2 sm:flex-row">
                  <div className="relative w-full flex-1">
                    <input
                      type="text"
                      name="q"
                      placeholder="O que você está procurando?"
                      className="h-12 w-full rounded-xl bg-muted/50 px-4 text-center text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-14 sm:pl-28 sm:text-left"
                    />
                  </div>
                  <button
                    type="submit"
                    className={buttonVariants({
                      variant: "default",
                      size: "lg",
                      className:
                        "h-12 w-full gap-2 rounded-xl px-8 text-base sm:h-14 sm:w-auto",
                    })}
                  >
                    <Search className="size-[18px]" />
                    Buscar
                  </button>
                </div>
              </div>
            </Form>

            <p className="animate-in fade-in fill-mode-both mt-4 text-sm text-primary-foreground/70 duration-700 [animation-delay:0.4s]">
              Ex: pizzaria, manicure, bolo, barbearia, pet shop…
            </p>
          </div>
        </div>
      </section>

      <section id="categorias" className="mx-auto max-w-6xl px-4 py-10">
        <div className="pb-5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Categorias populares
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore os negócios de Orós por categoria.
          </p>
        </div>
        <CategoriesCarousel categories={categories} />
      </section>

      <section
        id="empresas-em-destaque"
        className="mx-auto max-w-6xl px-4 py-8"
      >
        <div className="flex items-baseline justify-between gap-2 pb-3">
          <h2 className="text-lg text-slate-700 font-semibold tracking-tight">
            Empresas em Destaque
          </h2>
          <Link
            to="/negocios"
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>

        <div className="pt-6">
          {businesses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
              <span className="flex gap-2 text-muted-foreground items-center justify-center font-medium">
                OOPS! <Frown />
              </span>

              <p className="text-sm text-muted-foreground">
                Nenhuma empresa em destaque no momento.
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
            <Link
              to="/promocoes"
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {promotions.map((p) => (
              <li key={p.id}>
                <PromotionCard promotion={p} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        id="marketplace"
        className="border-y border-border/60 bg-secondary/40"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-20">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
              Marketplace da sua cidade
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              O João Tem conecta pessoas aos negócios da cidade
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Aqui você encontra lojas, serviços e empreendedores reais, perto
              de você. Uma grande vitrine digital para descobrir o melhor da sua
              cidade.
            </p>

            <ul className="grid gap-4 sm:grid-cols-2">
              {MARKETPLACE_FEATURES.map(({ Icon, title }) => (
                <li key={title} className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {title}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to="/signup"
              className={buttonVariants({
                variant: "default",
                size: "lg",
                className: "h-11 gap-2 px-6",
              })}
            >
              <Store className="size-4" />
              Cadastrar meu negócio
            </Link>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-border/60 shadow-xl">
              <img
                src="/oros.jpeg"
                alt="Comércio local de Orós"
                className="h-[420px] w-full object-cover"
              />
            </div>
            <div className="absolute -top-5 -right-5 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-lg">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <MessageCircle className="size-5" />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-foreground">Negócios reais</p>
                <p className="text-muted-foreground">perto de você</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
