import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Crown,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Plus,
  Quote,
  Repeat,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "~/components/ui/carousel";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import { PlanPricingCard } from "~/components/pricing/plan-pricing-card";
import { getSessionAndProfile } from "~/lib/auth.server";
import * as featureFlagsRepo from "~/repositories/feature-flags";
import type { FeatureFlagRow } from "~/repositories/feature-flags";
import { isError } from "~/types";
import type { Route } from "./+types/plans";

const ctaOrange =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90";
const ctaOutline =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-card px-7 text-base font-semibold text-primary transition-colors hover:bg-primary/5";
const ctaWhite =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-base font-semibold text-[#2563EB] shadow-sm transition-colors hover:bg-white/90";

const PLAN_DISPLAY = {
  basico: {
    tier: "basico",
    name: "Plano Básico",
    price: "R$ 29,90",
    period: "/mês",
    tagline:
      "O jeito mais simples e acessível de colocar seu negócio na busca do WhatsApp e no portal de Orós, para ser encontrado por quem já está procurando.",
    cta: "Ativar plano Básico",
  },
  ouro: {
    tier: "ouro",
    name: "Plano Ouro",
    price: "R$ 79,90",
    period: "/mês",
    tagline:
      "Vá além do cadastro: vitrine online com produtos, destaque nas buscas e mais chances de receber contatos e pedidos pelo WhatsApp.",
    badge: "Mais vendas",
    cta: "Ativar plano Ouro",
  },
} as const;

const SHOWCASE_CARDS = [
  {
    Card: DemoSearch,
    title: "Busca no João Tem",
    desc: "O cliente pesquisa por nome, categoria ou bairro e encontra seu negócio em segundos.",
  },
  {
    Card: DemoBusinessCard,
    title: "Sua vitrine online",
    desc: "Apresente seus produtos, informações e facilite o contato direto com o cliente.",
  },
  {
    Card: DemoInstagram,
    title: "Divulgação e visibilidade",
    desc: "Ganhe destaque com divulgação nas redes do João Tem e mais presença digital local.",
  },
] as const;

const VALUE_PROPS = [
  {
    Icon: MessageCircle,
    title: "Encontrado no WhatsApp",
    desc: "Seu negócio aparece na hora em que o cliente pesquisa pelo WhatsApp do João Tem. Rápido e sem complicação.",
  },
  {
    Icon: Store,
    title: "Vitrine online",
    desc: "Uma página com seus produtos, fotos e descrições — e o pedido pronto chega direto no seu WhatsApp.",
  },
  {
    Icon: Eye,
    title: "Destaque na cidade",
    desc: "Mais exposição nas buscas e divulgação nas redes do João Tem para o seu negócio aparecer mais em Orós.",
  },
  {
    Icon: Users,
    title: "Vitrine em Rede",
    desc: "Sua vitrine aparece dentro das vitrines de outros negócios da cidade, multiplicando as chances de descoberta.",
  },
] as const;

const ECOSYSTEM_STEPS = [
  {
    Icon: MessageCircle,
    label: "WhatsApp",
    desc: "O cliente busca e encontra você",
  },
  { Icon: Store, label: "Vitrine", desc: "Vê seus produtos e monta o pedido" },
  {
    Icon: TrendingUp,
    label: "Divulgação",
    desc: "Seu negócio nas redes e no portal",
  },
  { Icon: Users, label: "Vitrine em Rede", desc: "Descoberta entre negócios" },
] as const;

const NETWORK_POINTS = [
  {
    title: "Negócios que se apoiam",
    desc: "Empreendedores de Orós se recomendam e fazem clientes circularem entre si, em vez de competir sozinhos.",
  },
  {
    title: "Sua vitrine em mais lugares",
    desc: "Ela aparece dentro das vitrines parceiras, multiplicando as chances de alguém te encontrar.",
  },
  {
    title: "Descoberta natural",
    desc: "Quem chega para conhecer um negócio parceiro pode descobrir o seu no mesmo caminho.",
  },
  {
    title: "Quanto maior a rede, melhor",
    desc: "Cada novo negócio aumenta o alcance e a circulação de clientes para todo mundo na cidade.",
  },
] as const;

const TRUST_STATS = [
  {
    Icon: MapPin,
    value: "Feito para Orós",
    label: "Um projeto 100% dedicado à cidade e ao comércio local",
  },
  {
    Icon: Users,
    value: "Em comunidade",
    label: "Negócios reais da cidade crescendo juntos no João Tem",
  },
  {
    Icon: TrendingUp,
    value: "Em expansão",
    label: "Crescendo com ações locais e divulgação digital",
  },
  {
    Icon: ShieldCheck,
    value: "Sem comissão",
    label: "O que você vender é 100% seu — sem taxa por venda",
  },
] as const;

const USE_CASES = [
  "Quem quer passar mais profissionalismo para o cliente",
  "Quem quer ser encontrado com facilidade pela cidade",
  "Quem quer fazer parte da rede local de descoberta",
  "Quem quer presença digital além do Instagram",
] as const;

const TESTIMONIALS = [
  {
    quote:
      "Antes eu só vendia pra quem já me conhecia. Agora tenho clientes novos toda semana pelo João Tem!",
    name: "Ana Paula",
    business: "Doces da Ana",
    initials: "AP",
  },
  {
    quote:
      "Montei minha vitrine em 10 minutos e já no primeiro dia recebi pedidos pelo WhatsApp.",
    name: "Carlos Eduardo",
    business: "Hortifruti do Seu Carlos",
    initials: "CE",
  },
  {
    quote:
      "O melhor é que não preciso de site nem aplicativo. Tudo vem pelo WhatsApp, do jeito que eu já trabalho.",
    name: "Maria Silva",
    business: "Artesanato da Maria",
    initials: "MS",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "Como recebo os pedidos?",
    a: "Direto no seu WhatsApp. O cliente monta o carrinho na sua vitrine e te envia a mensagem já pronta, é só confirmar a entrega.",
  },
  {
    q: "O João Tem cobra comissão por venda?",
    a: "Não. Você paga só a mensalidade do plano escolhido — o que vender é 100% seu, sem taxa e sem intermediário.",
  },
  {
    q: "Posso mudar de plano depois?",
    a: "Sim. Você pode subir para o Plano Ouro ou voltar para o Básico quando quiser, sem burocracia.",
  },
  {
    q: "O que muda no Plano Ouro?",
    a: "O Plano Ouro acrescenta vitrine com seus produtos, destaque nas buscas, promoções da semana e mais divulgação nas redes do João Tem.",
  },
  {
    q: "O que é a Vitrine em Rede?",
    a: "É a conexão entre negócios de Orós: sua vitrine aparece dentro das vitrines parceiras, ampliando o alcance de todo mundo.",
  },
] as const;

// Demo products used by the live sacola components below — real photos and
// copy from a João Tem vitrine, so the example mirrors the real experience.
const DEMO_ACAI = [
  {
    img: "/screenshots/acai-ferrero.jpg",
    name: "Especial: Ferrero Rocher",
    desc: "Copo 500ml: açaí, Nutella original, castanha granulada, leite ninho e bombom Ferrero Rocher.",
    priceCents: 2999,
  },
  {
    img: "/screenshots/acai-copo.jpg",
    name: "Especial: Copo Prime",
    desc: "Copo 500ml: açaí, morango, leite ninho, Kit Kat e cobertura especial.",
    priceCents: 2799,
  },
] as const;

function brl(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

// Illustrative results for the website-search showcase card.
const SEARCH_RESULTS = [
  {
    img: "/screenshots/acai-copo.jpg",
    name: "Prime Açaí",
    cat: "Alimentação · Centro",
  },
  {
    img: "/screenshots/acai-ferrero.jpg",
    name: "Açaí da Praça",
    cat: "Sobremesas · Centro",
  },
] as const;

// Live, hoverable replicas of the real vitrine product card, "Sua sacola"
// cart and checkout summary — same markup/styles as business-detail.tsx and
// business-checkout.tsx, so the example behaves like the real product.
function DemoVitrine() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5 px-0.5">
        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#2563EB] text-sm font-black text-white">
          AÇ
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-extrabold tracking-[-0.02em] text-[#1F2937]">
            Açaí da Praça
          </p>
          <p className="line-clamp-1 text-xs text-[#64748B]">
            Sobremesas · Centro, Orós
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#16A34A]/10 px-2 py-0.5 text-[11px] font-bold text-[#16A34A]">
          Aberto
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-2.5">
      {DEMO_ACAI.map((p) => (
        <li
          key={p.name}
          className="group flex flex-col overflow-hidden rounded-[17px] border border-[#E5E7EB] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2563EB]/45 hover:shadow-md"
        >
          <div className="flex flex-1 flex-col text-left">
            <div className="aspect-square w-full overflow-hidden bg-[#EEF3F8]">
              <img
                src={p.img}
                alt={p.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-2.5">
              <p className="line-clamp-1 text-xs font-extrabold tracking-[-0.02em] text-[#1F2937]">
                {p.name}
              </p>
              <p className="line-clamp-2 text-xs text-[#64748B]">{p.desc}</p>
              <p className="mt-auto pt-1 text-sm font-black text-[#2563EB]">
                {brl(p.priceCents)}
              </p>
            </div>
          </div>
          <div className="px-2.5 pb-2.5">
            <span className="inline-flex h-[34px] w-full cursor-pointer items-center justify-center gap-1 rounded-[13px] border-[1.5px] border-[#2563EB] bg-transparent px-1.5 text-[11px] font-extrabold text-[#2563EB] transition-all duration-200 hover:bg-[#2563EB] hover:text-white">
              <Plus className="size-4" />
              Adicionar
            </span>
          </div>
        </li>
      ))}
      </ul>
    </div>
  );
}

function DemoSacola() {
  const [qty, setQty] = useState<number[]>([1, 1]);
  const adjust = (i: number, delta: number) =>
    setQty((q) => q.map((n, idx) => (idx === i ? Math.max(1, n + delta) : n)));
  const subtotal = DEMO_ACAI.reduce(
    (sum, p, i) => sum + p.priceCents * qty[i],
    0,
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
        <span className="flex items-center gap-2 text-base font-semibold text-foreground">
          <ShoppingBag className="size-4" />
          Sua sacola
        </span>
        <span className="grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted">
          <X className="size-4" />
        </span>
      </div>

      <ul className="divide-y divide-border/60">
        {DEMO_ACAI.map((p, i) => (
          <li key={p.name} className="flex items-start gap-3 px-5 py-3">
            <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              <img
                src={p.img}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-medium text-foreground">
                {p.name}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="inline-flex items-center rounded-full border border-border/70">
                  <button
                    type="button"
                    onClick={() => adjust(i, -1)}
                    aria-label="Diminuir"
                    className="grid size-7 place-items-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                    disabled={qty[i] <= 1}
                  >
                    {qty[i] > 1 ? (
                      <Minus className="size-3.5" />
                    ) : (
                      <Trash2 className="size-3.5 text-destructive" />
                    )}
                  </button>
                  <span className="w-6 text-center text-xs font-semibold tabular-nums">
                    {qty[i]}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjust(i, 1)}
                    aria-label="Aumentar"
                    className="grid size-7 place-items-center text-foreground transition-colors hover:bg-muted"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {brl(p.priceCents * qty[i])}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-3 border-t border-border/60 bg-muted/30 px-5 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="text-base font-semibold tabular-nums text-foreground">
            {brl(subtotal)}
          </span>
        </div>
        <span className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1ebe5d]">
          <MessageCircle className="size-4" />
          Finalizar pedido
        </span>
        <span className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-border/70 bg-card text-sm font-semibold text-foreground transition-colors hover:bg-muted">
          Continuar comprando
        </span>
      </div>
    </div>
  );
}

function DemoResumo() {
  const subtotal = DEMO_ACAI.reduce((sum, p) => sum + p.priceCents, 0);
  return (
    <section className="overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white">
      <h3 className="border-b border-[#E5E7EB] px-[18px] py-4 text-sm font-bold tracking-[-0.01em] text-[#102A43]">
        Resumo do pedido
      </h3>
      <ul className="divide-y divide-[#E5E7EB]">
        {DEMO_ACAI.map((p) => (
          <li key={p.name} className="flex items-start gap-3 px-[18px] py-4">
            <div className="size-[68px] shrink-0 overflow-hidden rounded-[17px] border border-[#E5E7EB] bg-[#EEF3F8]">
              <img
                src={p.img}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#102A43]">
                1x {p.name}
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums text-[#102A43]">
              {brl(p.priceCents)}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-[#E5E7EB] bg-[#F8FAFC] px-[18px] py-4 text-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span>Subtotal (2 itens)</span>
          <span className="tabular-nums">{brl(subtotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-dashed border-[#E5E7EB] pt-2 text-base font-semibold text-[#102A43]">
          <span>Total</span>
          <span className="tabular-nums">{brl(subtotal)}</span>
        </div>
      </div>
    </section>
  );
}

// Steps for the "Sua vitrine na prática" flow — carousel on mobile, grid on desktop.
const VITRINE_STEPS = [
  {
    Demo: DemoVitrine,
    wrap: "rounded-2xl border border-border/60 bg-[#FBFBF8] p-3 shadow-sm",
    title: "1. Escolhe os produtos",
    desc: "O cliente navega pela sua vitrine e adiciona os itens à sacola.",
  },
  {
    Demo: DemoSacola,
    wrap: "overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
    title: "2. Monta a sacola",
    desc: "Ajusta as quantidades e confere o total antes de finalizar.",
  },
  {
    Demo: DemoResumo,
    wrap: "rounded-2xl border border-border/60 bg-[#FBFBF8] p-3 shadow-sm",
    title: "3. Envia o pedido",
    desc: "Confere o resumo e o pedido chega pronto no seu WhatsApp.",
  },
] as const;

// ---- Section A: coded showcase cards (site search, vitrine, repost) ----
function DemoSearch() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="space-y-2.5 bg-[#102A43] p-4">
        <p className="text-xs font-medium text-white/70">Busca do João Tem</p>
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm text-foreground">açaí no centro</span>
          <span className="ml-0.5 h-4 w-px animate-pulse bg-primary" />
        </div>
        <span className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary/90">
          <Search className="size-4" /> Buscar
        </span>
      </div>
      <div className="flex-1 space-y-2.5 p-4">
        <p className="text-xs font-medium text-muted-foreground">
          2 negócios encontrados
        </p>
        {SEARCH_RESULTS.map((r) => (
          <div
            key={r.name}
            className="flex items-center gap-3 rounded-2xl border border-border/60 p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <img
              src={r.img}
              alt=""
              loading="lazy"
              className="size-11 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-foreground">
                  {r.name}
                </p>
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  <Crown className="size-2.5" /> Ouro
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">{r.cat}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoBusinessCard() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-36 overflow-hidden">
        <img
          src="/screenshots/acai-copo.jpg"
          alt="Prime Açaí"
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#102A43] shadow-sm">
          Açaí & Sobremesas
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-base font-bold text-foreground">Prime Açaí</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" /> Centro, Orós - CE
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Açaí premium, copos especiais e sobremesas. Peça pelo WhatsApp e
          receba em casa.
        </p>
        <div className="mt-4 flex gap-2">
          <span className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5d]">
            <MessageCircle className="size-4" /> WhatsApp
          </span>
          <span className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-primary/30 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
            <Eye className="size-4" /> Ver vitrine
          </span>
        </div>
      </div>
    </div>
  );
}

function DemoInstagram() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <img
          src="/screenshots/acai-ferrero.jpg"
          alt=""
          loading="lazy"
          className="size-9 rounded-full object-cover ring-1 ring-border"
        />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-semibold text-foreground">primeacai</p>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Repeat className="size-3" /> Repostado por joaotem
          </p>
        </div>
        <MoreHorizontal className="size-5 text-muted-foreground" />
      </div>
      <div className="relative">
        <img
          src="/screenshots/acai-ferrero.jpg"
          alt="Publicação do Prime Açaí"
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
        <span className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          Repostado
        </span>
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-[#25D366] px-2.5 py-1 text-[11px] font-semibold text-white shadow">
          <Check className="size-3" /> Recomendado
        </span>
      </div>
      <div className="flex items-center gap-4 px-4 py-3 text-foreground">
        <Heart className="size-5" />
        <MessageCircle className="size-5" />
        <Send className="size-5" />
        <Bookmark className="ml-auto size-5" />
      </div>
    </div>
  );
}

export const meta: Route.MetaFunction = () => [
  { title: "Planos — João Tem" },
  {
    name: "description",
    content:
      "Escolha o plano ideal para o seu negócio em Orós aparecer na busca do WhatsApp, ter vitrine online e vender mais no João Tem.",
  },
];

function featureLabel(flag: FeatureFlagRow, tier: "basico" | "ouro"): string {
  const limit = tier === "ouro" ? flag.ouro_limit : flag.basico_limit;
  if (flag.flag_type === "numeric" && limit != null && limit > 0) {
    return `${flag.label}: até ${limit}`;
  }
  return flag.label;
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await getSessionAndProfile(request);
  const flags = await featureFlagsRepo.listAll({ supabase: ctx.supabase });
  if (isError(flags)) {
    console.error("[plans.loader] feature_flags:", flags.error);
    throw new Response(flags.error, { status: 500 });
  }

  return {
    user: ctx.user ? { id: ctx.user.id, email: ctx.user.email ?? null } : null,
    profile: ctx.profile,
    flags: flags.success,
  };
}

export default function Plans() {
  const { user, profile, flags } = useLoaderData<typeof loader>();

  const activeFlags = flags.filter((f) => f.enabled);
  const basicoFeatures = activeFlags
    .filter((f) => f.basico_enabled)
    .map((f) => featureLabel(f, "basico"));
  const ouroBaseFeatures = activeFlags
    .filter((f) => f.ouro_enabled && f.basico_enabled)
    .map((f) => featureLabel(f, "ouro"));
  const ouroPremiumFeatures = activeFlags
    .filter((f) => f.ouro_enabled && !f.basico_enabled)
    .map((f) => featureLabel(f, "ouro"));

  const basicoSet = new Set(basicoFeatures);
  const ouroExtraBase = ouroBaseFeatures.filter((f) => !basicoSet.has(f));
  const ouroFeatures = ["Tudo do plano Básico", ...ouroExtraBase];

  return (
    <div className="min-h-svh bg-[#FBFBF8]">
      <SiteHeader user={user} role={profile?.role} />

      <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url(/WhatsApp%20Image%202026-05-25%20at%2015.01.17.jpeg)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(16,42,67,0.95) 0%, rgba(16,42,67,0.88) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <div className="animate-in fade-in fill-mode-both mb-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 backdrop-blur-sm duration-700">
            <span className="size-2 animate-pulse rounded-full bg-whatsapp" />
            <span className="text-sm font-medium text-primary-foreground/90">
              O seu negócio mais perto de quem busca em Orós
            </span>
          </div>

          <h1 className="animate-in fade-in fill-mode-both mb-6 text-balance text-3xl font-bold leading-tight text-primary-foreground duration-700 [animation-delay:0.1s] sm:text-4xl lg:text-5xl">
            Seja encontrado, divulgado e venda mais — tudo em um só lugar.
          </h1>

          <p className="animate-in fade-in fill-mode-both mx-auto mb-8 max-w-2xl text-lg text-primary-foreground/85 duration-700 [animation-delay:0.2s] sm:text-xl">
            No João Tem, seu negócio ou serviço aparece na busca do WhatsApp e
            pode ativar o Plano Ouro, com vitrine online, mais destaque e mais
            chances de vender em Orós.
          </p>

          <div className="animate-in fade-in fill-mode-both flex justify-center duration-700 [animation-delay:0.3s]">
            <Link to="#planos" className={ctaWhite}>
              <Store className="size-[18px]" />
              Cadastrar meu negócio
              <ArrowRight className="size-[18px]" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Da busca ao pedido, do jeito que o cliente já usa.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Veja como o cliente encontra, conhece e fecha com o seu negócio.
          </p>
        </div>

        <Carousel
          opts={{ align: "start" }}
          className="mt-12 -mx-4 px-4 lg:hidden"
        >
          <CarouselContent className="ml-0 items-stretch gap-6">
            {SHOWCASE_CARDS.map(({ Card, title, desc }) => (
              <CarouselItem
                key={title}
                className="basis-[82%] pl-0 sm:basis-[60%]"
              >
                <div className="flex h-full flex-col">
                  <Card />
                  <div className="mt-5 px-1 text-center">
                    <h3 className="text-sm font-semibold text-foreground">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {desc}
                    </p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="mt-12 hidden gap-x-6 gap-y-8 lg:grid lg:grid-cols-3">
          {SHOWCASE_CARDS.map(({ Card, title, desc }) => (
            <div key={title} className="flex flex-col">
              <Card />
              <div className="mt-5 px-1 text-left">
                <h3 className="text-sm font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link to="#planos" className={ctaOutline}>
            Quero aparecer assim
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Mais que um cadastro: uma presença local de verdade
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Busca no WhatsApp, vitrine online, divulgação e descoberta entre
            negócios — tudo reunido para o seu negócio aparecer mais e ser a
            escolha do cliente.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link to="#planos" className={ctaOutline}>
            Quero fazer parte
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Como o João Tem leva clientes até o seu negócio
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Seu negócio não fica parado em uma página. Ele entra em um caminho
              pensado para gerar descoberta e circulação de clientes em Orós.
            </p>
          </div>

          <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-2">
            {ECOSYSTEM_STEPS.map(({ Icon, label, desc }, i) => (
              <div
                key={label}
                className="flex flex-col items-center gap-6 sm:flex-row sm:gap-2"
              >
                <div className="flex max-w-[10rem] flex-col items-center gap-2 text-center">
                  <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-7" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {label}
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">
                    {desc}
                  </span>
                </div>
                {i < ECOSYSTEM_STEPS.length - 1 ? (
                  <ArrowRight className="size-5 rotate-90 text-primary/40 sm:mb-8 sm:rotate-0" />
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link to="#planos" className={ctaOutline}>
              Cadastrar meu negócio
              <ArrowRight className="size-[18px]" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Sua vitrine na prática, do produto ao pedido
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Veja como o cliente navega na vitrine, monta a sacola e envia o
            pedido pronto para o seu WhatsApp.
          </p>
        </div>

        <Carousel
          opts={{ align: "start" }}
          className="mt-12 -mx-4 px-4 lg:hidden"
        >
          <CarouselContent className="ml-0 items-start gap-6">
            {VITRINE_STEPS.map(({ Demo, wrap, title, desc }) => (
              <CarouselItem
                key={title}
                className="basis-[82%] pl-0 sm:basis-[60%]"
              >
                <div className={wrap}>
                  <Demo />
                </div>
                <div className="mt-4 px-1 text-center">
                  <h3 className="text-sm font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {desc}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="mt-12 hidden items-start gap-6 lg:grid lg:grid-cols-3">
          {VITRINE_STEPS.map(({ Demo, wrap, title, desc }) => (
            <div key={title}>
              <div className={wrap}>
                <Demo />
              </div>
              <div className="mt-4 px-1 text-left">
                <h3 className="text-sm font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
          {[
            "Cadastre seus produtos ou serviços",
            "Receba pedidos direto no WhatsApp",
            "Venda de forma simples, sem complicação",
          ].map((point) => (
            <span
              key={point}
              className="inline-flex items-center gap-2 text-sm text-foreground"
            >
              <Check className="size-4 shrink-0 text-whatsapp" />
              {point}
            </span>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link to="#planos" className={ctaOutline}>
            Quero minha vitrine no João Tem
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section
        className="relative overflow-hidden py-16 sm:py-20"
        style={{
          background: "#102A43",
        }}
      >
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
              Sua vitrine não fica sozinha. Ela entra em rede.
            </h2>
            <p className="mt-3 text-sm text-primary-foreground/85 sm:text-base">
              No João Tem, os negócios com vitrine geram descoberta uns para os
              outros — e cada novo cliente que chega à rede pode acabar
              encontrando você.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {NETWORK_POINTS.map((point) => (
              <div
                key={point.title}
                className="flex items-start gap-3 rounded-2xl bg-primary-foreground/10 p-5 backdrop-blur-sm"
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary-foreground/20 text-primary-foreground">
                  <Check className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-primary-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-primary-foreground/80">
                    {point.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link to="#planos" className={ctaWhite}>
              Cadastrar meu negócio
              <ArrowRight className="size-[18px]" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Um projeto real, local e em crescimento
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            O João Tem é um ecossistema construído para fortalecer o comércio
            local com presença digital, visibilidade e conexão entre negócios.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_STATS.map(({ Icon, value, label }) => (
            <div
              key={value}
              className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm"
            >
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" />
              </span>
              <p className="mt-4 text-base font-bold tracking-tight text-foreground">
                {value}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="planos"
        className="scroll-mt-20 border-y border-border/60 bg-card/60"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Escolha o plano ideal para você
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Coloque seu negócio na busca do WhatsApp com o Básico ou ative o
              Plano Ouro para ganhar vitrine e destaque na cidade.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl items-stretch gap-6 sm:grid-cols-2">
            <PlanPricingCard
              tier={PLAN_DISPLAY.basico.tier}
              name={PLAN_DISPLAY.basico.name}
              price={PLAN_DISPLAY.basico.price}
              period={PLAN_DISPLAY.basico.period}
              tagline={PLAN_DISPLAY.basico.tagline}
              features={basicoFeatures}
              premiumFeatures={ouroPremiumFeatures}
              premiumLocked
              ctaLabel={PLAN_DISPLAY.basico.cta}
              ctaHref="/signup?plan=basico"
            />
            <PlanPricingCard
              tier={PLAN_DISPLAY.ouro.tier}
              name={PLAN_DISPLAY.ouro.name}
              price={PLAN_DISPLAY.ouro.price}
              period={PLAN_DISPLAY.ouro.period}
              tagline={PLAN_DISPLAY.ouro.tagline}
              features={ouroFeatures}
              premiumFeatures={ouroPremiumFeatures}
              premiumSubtitle="Mais exposição no WhatsApp e Instagram do João Tem."
              highlight
              badge={PLAN_DISPLAY.ouro.badge}
              ctaLabel={PLAN_DISPLAY.ouro.cta}
              ctaHref="/signup?plan=ouro"
            />
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
            Após o cadastro, nossa equipe entra em contato pelo WhatsApp para
            finalizar o pagamento e ativar o seu plano.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Para quem quer mais do que só estar cadastrado
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            O Plano Ouro é para negócios e prestadores de serviços que querem
            uma vitrine profissional, mais destaque e uma presença digital
            local mais forte dentro do João Tem.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {USE_CASES.map((text) => (
            <div
              key={text}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Check className="size-5" />
              </span>
              <span className="text-sm font-medium text-foreground">
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dúvidas Frequentes
          </h2>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground">
                {item.q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter className="mt-0" />
    </div>
  );
}
