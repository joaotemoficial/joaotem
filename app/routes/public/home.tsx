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
  Building2,
  Frown,
  Handshake,
  Heart,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { CategoriesCarousel } from "~/components/categories/categories-carousel";

// Outline icons matched to the JoãoTem reference design (24x24, currentColor).
const WHY_FEATURES = [
  {
    paths: <path d="M4 10h16M6 6h12M7 14h10M9 18h6" />,
    title: "Mais rápido para encontrar",
    desc: "O cliente encontra lojas, serviços, promoções e contatos sem precisar procurar em vários lugares.",
  },
  {
    paths: <path d="M4 20V10l8-6 8 6v10M9 20v-6h6v6" />,
    title: "Mais visibilidade para vender",
    desc: "Empresas ganham uma vitrine organizada para divulgar sua marca, produtos e diferenciais.",
  },
  {
    paths: (
      <>
        <path d="M12 21s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    title: "Mais força para a cidade",
    desc: "Cada busca valoriza os empreendedores locais e incentiva as pessoas a comprarem em Orós.",
  },
  {
    paths: (
      <>
        <path d="M12 3 4 7v6c0 5 3.5 7.5 8 8 4.5-.5 8-3 8-8V7l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    title: "Mais confiança para escolher",
    desc: "Perfis com informações, fotos e categorias ajudam o cliente a decidir com mais segurança.",
  },
];

const STEPS = [
  {
    n: 1,
    paths: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
    title: "Busque pelo que precisa",
    desc: "Digite uma loja, serviço, produto ou escolha uma categoria.",
  },
  {
    n: 2,
    paths: (
      <>
        <path d="M3 9.5 5 4h14l2 5.5" />
        <path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Z" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
    title: "Compare opções locais",
    desc: "Veja empresas, categorias, destaques e promoções da cidade.",
  },
  {
    n: 3,
    paths: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8" />
        <path d="M8 13h6" />
        <path d="M8 17h4" />
      </>
    ),
    title: "Abra a vitrine",
    desc: "Confira fotos, informações, descrição e detalhes do negócio.",
  },
  {
    n: 4,
    paths: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
    title: "Fale e resolva",
    desc: "Entre em contato direto com o negócio e faça seu pedido.",
  },
];

const HERO_FEATURES = [
  { Icon: Search, label: "Busque com facilidade" },
  { Icon: Store, label: "Descubra comércios locais" },
  { Icon: ShoppingBag, label: "Compre no Marketplace Local" },
  { Icon: MapPin, label: "Tudo da sua cidade em um só lugar" },
] as const;

function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-xs font-black tracking-[2px] text-primary uppercase">
        {eyebrow}
      </span>
      <h2 className="mt-2.5 text-3xl font-black tracking-tight text-[#102A43] sm:text-4xl">
        {title}
      </h2>
      <span className="mt-3 h-1.5 w-23 rounded-full bg-gradient-to-r from-primary to-[#60A5FA] shadow-[0_8px_18px_rgba(37,99,235,0.22)]" />
      <p className="mt-3 max-w-xl text-base text-[#64748B]">{subtitle}</p>
    </div>
  );
}

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
          <div className="relative isolate mx-auto max-w-3xl mt-[-4rem]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-[34px] -z-10 mx-auto h-[220px] w-[520px] max-w-[90vw] animate-jt-hero-glow rounded-[60px] bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(96,165,250,0.35),rgba(37,99,235,0.18))] blur-[50px]"
            />
            <img
              src="/SVG2.svg"
              alt="João Tem"
              className="mx-auto size-72 animate-jt-hero-logo object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.24)]"
              style={{ marginBottom: "-18px" }}
            />

            <h1 className="animate-in fade-in fill-mode-both mb-8 text-balance text-3xl font-bold leading-tight text-primary-foreground duration-700 [animation-delay:0.1s] sm:text-4xl lg:text-5xl">
              Tudo que você procura em <span className="text-blue-400">Orós</span>
              , reunido no João Tem
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
                  className="group flex flex-col items-center gap-3 px-4 text-center transition-transform duration-300 hover:-translate-y-2 sm:px-8"
                >
                  <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-[#2563EB] group-hover:shadow-[0_18px_30px_rgba(37,99,235,0.25)]">
                    <Icon className="size-5 transition-transform duration-300 group-hover:-rotate-[8deg]" />
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
        <div className="pb-6">
          <SectionHead
            eyebrow="Explorar"
            title="Categorias populares"
            subtitle="Explore os negócios de Orós por categoria."
          />
        </div>
        <CategoriesCarousel categories={categories} />
      </section>

      <section
        id="patrocinador-oficial"
        className="mx-auto max-w-6xl px-4 py-7"
      >
        <div className="relative grid items-center gap-8 overflow-hidden rounded-[2.25rem] bg-[#102A43] p-6 text-white shadow-[0_22px_60px_rgba(16,42,67,0.22)] sm:p-8 lg:min-h-[390px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3.5 py-2 text-xs font-black tracking-wider uppercase backdrop-blur">
              ⭐ Patrocinador oficial
            </span>
            <h2 className="my-4 max-w-[620px] text-[2.35rem] font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Coloque sua marca no ponto mais{" "}
              <span className="text-[#93C5FD]">estratégico</span> do João Tem
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-white/85">
              Um espaço fixo logo após as categorias, criado para empresas que
              querem ser vistas primeiro, ganhar autoridade local e aparecer
              como referência para quem entra procurando onde comprar.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {[
                "Visibilidade premium",
                "Loja fixa em destaque",
                "Chamada direta para contato",
              ].map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-[13px] font-bold"
                >
                  ✓ {p}
                </span>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/planos"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-white px-5.5 text-sm font-black text-[#102A43] shadow-[0_16px_34px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:brightness-95 sm:w-auto"
              >
                Quero ser patrocinador →
              </Link>
              <div className="w-full text-center text-[13px] font-bold text-white/80 sm:w-auto sm:text-left">
                Apareça antes dos destaques comuns
              </div>
            </div>
          </div>

          <div className="relative z-10 flex justify-center">
            <div className="w-full max-w-[390px] overflow-hidden rounded-[1.75rem] border border-white/20 bg-white text-[#102A43] shadow-[0_24px_65px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(0,0,0,0.32)]">
              <div className="relative h-36 bg-[linear-gradient(rgba(16,42,67,0.12),rgba(16,42,67,0.22)),url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(16,42,67,0.45)]"
                />
                <div className="absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#FACC15] px-2.5 py-1.5 text-[11px] font-black text-[#713F12]">
                  👑 Ouro fixo
                </div>
                <div className="absolute right-3.5 top-3.5 z-10 rounded-full bg-white/90 px-2.5 py-1.5 text-[11px] font-black text-[#102A43]">
                  Destaque
                </div>
              </div>
              <div className="px-4.5 pb-4.5">
                <div className="relative z-10 -mt-[34px] grid size-[68px] place-items-center rounded-[1.25rem] border-[3px] border-white bg-white text-xl font-black text-[#2563EB] shadow-[0_10px_24px_rgba(16,42,67,0.14)]">
                  LOGO
                </div>
                <h3 className="mt-3 mb-1.5 text-lg font-black text-[#102A43]">
                  Sua loja aqui
                </h3>
                <p className="mb-3 text-[13px] leading-relaxed text-[#64748B]">
                  Perfil premium com capa, logo, descrição, vitrine e botão
                  direto para atendimento.
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {["Categoria", "Centro", "Patrocinador"].map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-bold text-[#2563EB]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <span className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#2563EB] text-sm font-black text-white">
                  💬 Chamar no WhatsApp
                </span>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[ShoppingBag, Tag, Star].map((Icon, i) => (
                    <div
                      key={i}
                      className="grid h-[54px] place-items-center rounded-[14px] border border-[#E5E7EB] bg-[#F5F7FA] text-primary"
                    >
                      <Icon className="size-5" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="empresas-em-destaque"
        className="mx-auto max-w-6xl px-4 py-8"
      >
        <div className="relative pb-3">
          <SectionHead
            eyebrow="Destaques"
            title="Negócios em destaque no João Tem"
            subtitle="Conheça os empreendedores locais que fazem parte da nossa comunidade"
          />
          <Link
            to="/negocios"
            className="mt-3 block text-center text-sm font-black text-primary hover:underline sm:absolute sm:right-0 sm:top-0 sm:mt-0"
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
          <div className="relative pb-3">
            <SectionHead
              eyebrow="Ofertas"
              title="Promoções de hoje"
              subtitle="Confira todos os descontos e ofertas especiais disponíveis hoje em Orós!"
            />
            <Link
              to="/promocoes"
              className="mt-3 block text-center text-sm font-black text-primary hover:underline sm:absolute sm:right-0 sm:top-0 sm:mt-0"
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

      <section id="marketplace" className="py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-2">
          <div className="min-w-0">
            <span className="text-[13px] font-black tracking-[1.4px] text-primary uppercase">
              Por que escolher
            </span>
            <h2 className="mt-3.5 mb-4 text-3xl font-black leading-[1.08] tracking-tight text-[#102A43] sm:text-4xl lg:text-5xl">
              Por que usar o <span className="text-primary">João Tem?</span>
            </h2>
            <p className="mb-7 max-w-xl text-base leading-relaxed text-[#64748B] sm:text-lg">
              Porque ele aproxima quem procura, quem vende e a cidade. Um jeito
              simples de encontrar negócios locais, divulgar marcas e fortalecer
              o comércio de Orós.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {WHY_FEATURES.map(({ paths, title, desc }) => (
                <div
                  key={title}
                  className="group flex gap-3.5 rounded-2xl p-4 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_40px_rgba(16,42,67,0.08)]"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EAF2FF] text-primary ring-1 ring-[#DBEAFE] transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-6"
                    >
                      {paths}
                    </svg>
                  </span>
                  <div>
                    <h3 className="mb-1 text-base font-black text-[#102A43]">
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#64748B]">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/planos"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 text-sm font-black text-white shadow-[0_14px_34px_rgba(37,99,235,0.24)] transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Quero cadastrar meu negócio →
            </Link>
          </div>

          <div className="min-w-0 rounded-[2.125rem] border border-border bg-white p-6 shadow-[0_18px_50px_rgba(16,42,67,0.08)] sm:p-8">
            <div className="relative aspect-square min-h-[340px] sm:min-h-[420px]">
              <svg
                aria-hidden
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 z-0 size-full"
              >
                {[
                  { x: 50, y: 12, dur: "2s" },
                  { x: 85, y: 30, dur: "2.5s" },
                  { x: 82, y: 70, dur: "3s" },
                  { x: 50, y: 88, dur: "2.2s" },
                  { x: 15, y: 30, dur: "2.8s" },
                  { x: 18, y: 70, dur: "3.2s" },
                ].map(({ x, y, dur }, i) => (
                  <line
                    key={i}
                    x1="50"
                    y1="50"
                    x2={x}
                    y2={y}
                    stroke="#2563EB"
                    strokeWidth="0.55"
                    strokeDasharray="3 3"
                    opacity="0.28"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="20"
                      to="0"
                      dur={dur}
                      repeatCount="indefinite"
                    />
                  </line>
                ))}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-[82%] animate-jt-spin-slow items-center justify-center rounded-full border border-dashed border-primary/20">
                  <div className="size-[70%] rounded-full border-2 border-primary/15" />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/SVG2.svg"
                  alt="João Tem"
                  className="w-[68%] max-w-[285px] animate-jt-float object-contain drop-shadow-[0_24px_36px_rgba(16,42,67,0.18)]"
                />
              </div>

              {[
                { Icon: Store, pos: "top-[8%] left-1/2" },
                { Icon: Building2, pos: "top-[29%] left-[86.4%]" },
                { Icon: Users, pos: "top-[71%] left-[86.4%]" },
                { Icon: Handshake, pos: "top-[92%] left-1/2" },
                { Icon: ShoppingBag, pos: "top-[29%] left-[13.6%]" },
                { Icon: Heart, pos: "top-[71%] left-[13.6%]" },
              ].map(({ Icon, pos }, i) => (
                <div
                  key={i}
                  className={`absolute z-10 grid size-13 -translate-x-1/2 -translate-y-1/2 animate-jt-float-badge place-items-center rounded-[1.125rem] border border-border bg-white text-primary shadow-[0_14px_34px_rgba(16,42,67,0.12)] ${pos}`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                >
                  <Icon className="size-6" />
                </div>
              ))}

              <div className="absolute right-0 top-0 z-20 rounded-2xl bg-primary px-3.5 py-2.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(16,42,67,0.12)]">
                Guia local
              </div>
              <div className="absolute bottom-0 left-0 z-20 rounded-2xl bg-white px-3.5 py-2.5 text-xs font-black text-[#102A43] shadow-[0_12px_28px_rgba(16,42,67,0.12)]">
                Orós conectado
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-[#102A43] sm:text-4xl">
              Como funciona o <span className="text-primary">João Tem?</span>
            </h2>
            <p className="mt-3 text-sm text-[#64748B] sm:text-base">
              Um caminho simples para encontrar negócios locais e falar direto
              com quem vende.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ n, paths, title, desc }) => (
              <div
                key={n}
                className="group relative flex flex-col items-center rounded-3xl border border-border bg-white px-5 pt-9 pb-6 text-center shadow-[0_12px_34px_rgba(16,42,67,0.06)] transition-all hover:-translate-y-1.5 hover:border-[#BFDBFE] hover:shadow-[0_20px_48px_rgba(16,42,67,0.12)]"
              >
                <span className="absolute -top-3.5 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full bg-primary text-[13px] font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]">
                  {n}
                </span>
                <span className="mt-2 mb-[18px] grid size-[68px] place-items-center rounded-[22px] bg-[#EFF6FF] text-primary ring-1 ring-[#DBEAFE] transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-[30px]"
                  >
                    {paths}
                  </svg>
                </span>
                <h3 className="text-[17px] font-black text-[#102A43]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                  {desc}
                </p>
                {n < STEPS.length ? (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -right-[18px] hidden h-0.5 w-[18px] bg-[#D8E2EF] lg:block"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="cta-cadastro"
        className="px-3.5 py-9 sm:px-6 sm:pt-12 sm:pb-14"
      >
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#102A43] shadow-[0_20px_60px_rgba(16,42,67,0.15)] sm:rounded-[2rem] md:min-h-[330px] md:grid-cols-2">
          <div className="flex flex-col items-start justify-center px-[22px] py-[30px] text-white sm:p-9">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-black tracking-wide text-white uppercase">
              <Sparkles className="size-3.5" />
              Para empreendedores
            </span>
            <h2
              id="cta-cadastro"
              className="mt-4 text-balance text-3xl font-black leading-[1.02] tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              Seu negócio merece ser{" "}
              <span className="text-[#60A5FA]">encontrado</span>
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-white/85">
              Cadastre sua empresa no João Tem e apareça para clientes que já
              estão procurando produtos e serviços na sua cidade.
            </p>
            <div className="mt-5 space-y-2.5">
              {[
                "Página exclusiva para divulgar sua marca",
                "Mais visibilidade para seu negócio",
                "Promoções e destaque para atrair clientes",
              ].map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-2.5 text-sm font-bold text-white/90"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-white">
                    ✓
                  </span>
                  {t}
                </div>
              ))}
            </div>
            <Link
              to="/planos"
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-black text-white shadow-[0_14px_32px_rgba(37,99,235,0.25)] transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Cadastrar meu negócio →
            </Link>
          </div>

          <div className="relative hidden min-h-[330px] overflow-hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1556740749-887f6717d7e4?q=80&w=1200&auto=format&fit=crop"
              alt="Empreendedor local"
              className="absolute inset-0 size-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(90deg,#102A43_0%,rgba(16,42,67,0.35)_15%,transparent_52%)]"
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
