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
import * as productsRepo from "~/repositories/products";
import * as promotionsRepo from "~/repositories/promotions";
import { isError } from "~/types";
import type { Route } from "./+types/home";
import {
  Eye,
  Frown,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { CategoriesCarousel } from "~/components/categories/categories-carousel";

const HOW_IT_WORKS_STEPS = [
  {
    n: 1,
    Icon: Search,
    title: "Pesquise o que precisa",
    desc: "Digite o que você procura ou navegue pelas categorias",
  },
  {
    n: 2,
    Icon: Store,
    title: "Encontre negócios locais",
    desc: "Veja os melhores resultados da sua cidade e bairro",
  },
  {
    n: 3,
    Icon: Eye,
    title: "Veja a vitrine da loja",
    desc: "Explore produtos, serviços e informações do negócio",
  },
] as const;

const MARKETPLACE_FEATURES = [
  { Icon: HeartHandshake, title: "Apoie o comércio local" },
  { Icon: Search, title: "Encontre tudo em um só lugar" },
  { Icon: FaWhatsapp, title: "Fale direto no WhatsApp" },
  { Icon: MapPin, title: "Descubra negócios do seu bairro" },
] as const;

const HERO_FEATURES = [
  { Icon: Search, label: "Busque com facilidade" },
  { Icon: Store, label: "Descubra comércios locais" },
  { Icon: ShoppingBag, label: "Compre no Marketplace Local" },
  { Icon: MapPin, label: "Tudo da sua cidade em um só lugar" },
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

  const showcaseResult = await productsRepo.listBusinessIdsWithActiveProducts({
    supabase: ctx.supabase,
    businessIds: businesses.success.map((b) => b.id),
  });
  const businessesWithShowcase = isError(showcaseResult)
    ? new Set<string>()
    : showcaseResult.success;

  return {
    user: ctx.user ? { id: ctx.user.id, email: ctx.user.email ?? null } : null,
    profile: ctx.profile,
    businesses: businesses.success.map((b) => ({
      ...b,
      logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
      cover_url: getPublicUrl(ctx.supabase, "business-covers", b.cover_path),
      has_showcase_items: businessesWithShowcase.has(b.id),
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
              whatsapp: biz.whatsapp,
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
          style={{
            backgroundImage:
              "url(/WhatsApp%20Image%202026-05-25%20at%2015.01.17.jpeg)",
          }}
        />
        <div aria-hidden className="absolute inset-0 bg-[#102A43]/80" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
          <div className="mx-auto max-w-3xl mt-[-4rem]">
            <img
              src="/SVG2.svg"
              alt="João Tem"
              className="animate-in fade-in fill-mode-both mx-auto size-72 object-contain duration-700"
            />

            <h1 className="animate-in fade-in fill-mode-both mb-8 text-balance text-3xl font-bold leading-tight text-primary-foreground duration-700 [animation-delay:0.1s] sm:text-4xl lg:text-5xl">
              Encontre negócios e serviços da{" "}
              <span className="text-blue-400">sua cidade</span> em um só lugar
            </h1>

            <Form
              method="get"
              action="/negocios"
              className="animate-in fade-in fill-mode-both mx-auto max-w-2xl duration-700 [animation-delay:0.2s]"
            >
              <input type="hidden" name="city" value={defaultHeroCityId} />

              <div className="rounded-2xl bg-card p-2 shadow-xl">
                <div className="flex flex-col items-center gap-2 sm:flex-row">
                  <div className="relative w-full flex-1">
                    <input
                      type="text"
                      name="q"
                      placeholder="O que você está procurando?"
                      className="h-12 w-full rounded-xl bg-muted/50 px-4 text-center text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-14 sm:text-left"
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

            <div className="animate-in fade-in fill-mode-both mt-10 grid grid-cols-2 gap-y-8 duration-700 [animation-delay:0.3s] sm:flex sm:items-start sm:justify-center sm:divide-x sm:divide-primary-foreground/20">
              {HERO_FEATURES.map(({ Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-3 px-4 text-center sm:px-8"
                >
                  <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Icon className="size-5" />
                  </span>
                  <span className="max-w-[9rem] text-sm font-medium leading-snug text-primary-foreground/90">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="categorias" className="mx-auto max-w-6xl px-4 py-10">
        <div className="pb-5">
          <h2 className="text-2xl font-bold tracking-tight text-slate-700">
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
          <div className="space-y-1">
            <h1 className="text-2xl text-slate-700 font-bold tracking-tight">
              Negócios em destaque no JoãoTem
            </h1>

            <h2 className="text-gray-600 text-sm tracking-tight">
              Conheça os empreendedores locais que fazem parte da nossa
              comunidade
            </h2>
          </div>
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
                    hasShowcaseItems={b.has_showcase_items}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {promotions.length > 0 ? (
        <section id="promocoes" className=" mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-baseline justify-between gap-2 pb-3">
            <div className="space-y-1">
              <h1 className="text-2xl text-slate-700 font-bold tracking-tight">
                Promoções de hoje
              </h1>

              <h2 className="text-gray-600 text-sm tracking-tight">
                Confira todos os descontos e ofertas especiais disponíveis hoje
                em Orós!
              </h2>
            </div>
            <Link
              to="/promocoes"
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mt-4">
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
            <h2 className="text-3xl font-bold tracking-tight text-slate-700 sm:text-4xl">
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
            Em quatro passos simples você encontra o que precisa em Orós.
          </p>
        </div>

        <div className="mt-16 grid gap-y-12 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map(({ n, Icon, title, desc }) => (
            <div key={n} className="relative flex flex-col items-center pt-6">
              <span className="absolute top-0 z-10 grid size-10 place-items-center rounded-full bg-[#2563EB] text-sm font-bold text-white shadow-md">
                {n}
              </span>

              <div className="flex h-full w-full flex-col items-center rounded-2xl border border-border/60 bg-card p-6 pt-8 text-center shadow-sm">
                <span className="grid size-16 place-items-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                  <Icon className="size-7" />
                </span>
                <h3 className="mt-5 text-base font-bold tracking-tight text-slate-700 sm:text-lg">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-blue-900">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="cta-cadastro" className="mt-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid overflow-hidden rounded-2xl bg-linear-to-t from-sky-600 to-indigo-600 text-primary-foreground md:min-h-[420px] md:grid-cols-2">
            <div className="flex flex-col items-start justify-center gap-5 px-6 py-10 sm:px-10 md:py-12">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-xs font-medium tracking-wide uppercase backdrop-blur-sm">
                <Sparkles className="size-3.5" />
                Para empreendedores
              </span>
              <h2
                id="cta-cadastro"
                className="text-balance text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
              >
                Você é empreendedor? Faça parte do João Tem!
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
                Cadastre seu negócio e ganhe visibilidade na sua cidade. Seja
                encontrado por milhares de clientes em potencial.
              </p>
              <Link
                to="/planos"
                className="text-primary inline-flex h-11 items-center gap-2 rounded-lg bg-background px-5 text-sm font-semibold shadow-sm transition-colors hover:bg-background/90"
              >
                <Store className="size-4" />
                Cadastrar meu negócio
              </Link>
            </div>

            <div className="relative hidden md:block">
              <img
                src="/oros.jpg"
                alt="Orós - CE"
                className="absolute inset-0 size-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
