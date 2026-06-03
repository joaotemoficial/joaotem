import {
	ArrowRight,
	Check,
	ChevronDown,
	Eye,
	MapPin,
	MessageCircle,
	Minus,
	Plus,
	Quote,
	ShieldCheck,
	ShoppingBag,
	Store,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import { Link, useLoaderData } from "react-router";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import { PlanPricingCard } from "~/components/pricing/plan-pricing-card";
import { getSessionAndProfile } from "~/lib/auth.server";
import * as featureFlagsRepo from "~/repositories/feature-flags";
import type { FeatureFlagRow } from "~/repositories/feature-flags";
import { isError } from "~/types";
import type { Route } from "./+types/plans";

// Reusable call-to-action button styles. Orange is the conversion accent,
// the primary blue outline is the secondary action — mirroring the reference.
const ctaOrange =
	"inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-600";
const ctaOutline =
	"inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-card px-7 text-base font-semibold text-primary transition-colors hover:bg-primary/5";

const PLAN_DISPLAY = {
	basico: {
		tier: "basico",
		name: "Plano Básico",
		price: "R$ 7,90",
		period: "/mês",
		tagline:
			"A forma mais simples e acessível de colocar seu negócio na busca do WhatsApp e no portal, para ser encontrado com mais facilidade.",
		cta: "Ativar plano Básico",
	},
	ouro: {
		tier: "ouro",
		name: "Presença Completa",
		price: "R$ 47,90",
		period: "/mês",
		tagline:
			"Para quem quer ir além do básico e dar ao negócio mais visibilidade, presença e chances de receber contatos e pedidos.",
		badge: "Mais visibilidade",
		cta: "Ativar plano Ouro",
	},
} as const;

// Mockup cards in the "Mais destaque" showcase row.
const SHOWCASE_CAPTIONS = [
	{
		title: "Busca no WhatsApp",
		desc: "Seu negócio pode ser encontrado de forma simples dentro da busca do João Tem.",
	},
	{
		title: "Sua vitrine online",
		desc: "Apresente seus produtos, informações e facilite o contato com o cliente.",
	},
	{
		title: "Divulgação e visibilidade",
		desc: "Fortaleça sua presença digital com mais exposição dentro do ecossistema João Tem.",
	},
] as const;

const VALUE_PROPS = [
	{
		Icon: MessageCircle,
		title: "Busca no WhatsApp",
		desc: "Seu negócio aparece quando clientes pesquisam pelo WhatsApp do João Tem. Simples, fácil e rápido.",
	},
	{
		Icon: Store,
		title: "Vitrine online",
		desc: "Tenha uma página do seu negócio com produtos, descrições, fotos e pedidos direto pelo WhatsApp.",
	},
	{
		Icon: Eye,
		title: "Mais visibilidade",
		desc: "Ganhe destaque no ecossistema João Tem com divulgação nas redes sociais e presença digital local.",
	},
	{
		Icon: Users,
		title: "Rede de negócios",
		desc: "Participe da Vitrine em Rede e aumente suas chances de ser descoberto por novos clientes da cidade.",
	},
] as const;

const ECOSYSTEM_STEPS = [
	{
		Icon: MessageCircle,
		label: "WhatsApp",
		desc: "Cliente busca e encontra seu negócio",
	},
	{ Icon: Store, label: "Vitrine", desc: "Vê seus produtos e monta o pedido" },
	{
		Icon: TrendingUp,
		label: "Visibilidade",
		desc: "Divulgação nas redes e no portal",
	},
	{ Icon: Users, label: "Vitrine em Rede", desc: "Descoberta entre negócios" },
] as const;

const NETWORK_POINTS = [
	{
		title: "Apoio entre negócios da cidade",
		desc: "Negócios parceiros se ajudam a crescer, recomendando e gerando circulação de clientes entre si.",
	},
	{
		title: "Mais visibilidade para sua vitrine",
		desc: "Sua vitrine aparece dentro de outras vitrines parceiras, aumentando as chances de ser encontrado.",
	},
	{
		title: "Clientes circulando entre vitrines",
		desc: "Clientes que acessam vitrines parceiras podem descobrir o seu negócio de forma natural.",
	},
	{
		title: "Mais chances de descoberta e vendas",
		desc: "Quanto mais negócios na rede, maior é o alcance e a circulação de clientes para todos.",
	},
] as const;

const TRUST_STATS = [
	{
		Icon: MapPin,
		value: "Comércio local",
		label: "Projeto 100% focado na cidade e no comércio local",
	},
	{
		Icon: Users,
		value: "Em comunidade",
		label: "Negócios reais crescendo no ecossistema João Tem",
	},
	{
		Icon: TrendingUp,
		value: "Crescimento real",
		label: "Projeto em expansão com ações locais e digitais",
	},
	{
		Icon: ShieldCheck,
		value: "Sem comissão",
		label: "Sem taxas por venda, sem intermediários",
	},
] as const;

const USE_CASES = [
	"Quem quer parecer mais profissional para seus clientes",
	"Quem quer ser encontrado com mais facilidade na cidade",
	"Quem quer participar de uma rede local de descoberta",
	"Quem quer mais presença digital além do Instagram",
] as const;

// Depoimentos ilustrativos — substitua por histórias reais (nome, negócio e foto).
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
		a: "Os pedidos chegam direto no seu WhatsApp. O cliente monta o carrinho na sua vitrine e envia a mensagem pronta para você confirmar.",
	},
	{
		q: "O João Tem cobra comissão por venda?",
		a: "Não. Você paga apenas a mensalidade do plano escolhido — o que vender é 100% seu.",
	},
	{
		q: "Posso mudar de plano depois?",
		a: "Sim. Você pode subir ou voltar de plano quando quiser, sem burocracia.",
	},
	{
		q: "O que muda no plano Ouro?",
		a: "O Ouro adiciona destaque nas buscas, vitrine de produtos, promoções da semana e mais divulgação para o seu negócio.",
	},
	{
		q: "O que é a Vitrine em Rede?",
		a: "É a conexão entre negócios da mesma cidade: sua vitrine aparece dentro de vitrines parceiras, ampliando o alcance de todo mundo.",
	},
] as const;

// Exemplo ilustrativo de vitrine — não representa um negócio real.
const DEMO_PRODUCTS = [
	{ name: "Brigadeiro Gourmet", price: "R$ 4,00" },
	{ name: "Bolo de Chocolate", price: "R$ 65,00" },
] as const;

const DEMO_CART = [
	{ name: "Brownie com Nozes", price: "R$ 8,00", qty: 2 },
	{ name: "Torta de Limão", price: "R$ 38,00", qty: 1 },
	{ name: "Brigadeiro Gourmet", price: "R$ 4,00", qty: 3 },
] as const;

const DEMO_SUMMARY = [
	{ label: "2x Brownie com Nozes", value: "R$ 16,00" },
	{ label: "1x Torta de Limão", value: "R$ 38,00" },
	{ label: "3x Brigadeiro Gourmet", value: "R$ 12,00" },
] as const;

export const meta: Route.MetaFunction = () => [
	{ title: "Planos — João Tem" },
	{
		name: "description",
		content:
			"Escolha o plano ideal para o seu negócio aparecer nas buscas, ter vitrine online e vender mais no João Tem.",
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

			{/* Hero */}
			<section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
				<div
					aria-hidden
					className="absolute inset-0 bg-cover bg-center bg-no-repeat"
					style={{ backgroundImage: "url(/oros.jpeg)" }}
				/>
				<div
					aria-hidden
					className="absolute inset-0"
					style={{
						background:
							"linear-gradient(135deg, rgba(37,99,235,0.95) 0%, rgba(59,130,246,0.88) 100%)",
					}}
				/>

				<div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
					<div className="animate-in fade-in fill-mode-both mb-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-2 backdrop-blur-sm duration-700">
						<span className="size-2 animate-pulse rounded-full bg-whatsapp" />
						<span className="text-sm font-medium text-primary-foreground/90">
							A presença local do seu negócio
						</span>
					</div>

					<h1 className="animate-in fade-in fill-mode-both mb-6 text-balance text-3xl font-bold leading-tight text-primary-foreground duration-700 [animation-delay:0.1s] sm:text-4xl lg:text-5xl">
						Seu negócio em um só lugar para ser encontrado, divulgado e vender
						mais.
					</h1>

					<p className="animate-in fade-in fill-mode-both mx-auto mb-8 max-w-2xl text-lg text-primary-foreground/85 duration-700 [animation-delay:0.2s] sm:text-xl">
						No João Tem, seu negócio ou serviço pode aparecer na busca do
						WhatsApp ou ativar sua presença completa com vitrine online, mais
						destaque e mais chances de vender na cidade.
					</p>

					<div className="animate-in fade-in fill-mode-both flex justify-center duration-700 [animation-delay:0.3s]">
						<Link to="/signup" className={`${ctaOrange} w-full sm:w-auto`}>
							<Store className="size-[18px]" />
							Cadastrar meu negócio
							<ArrowRight className="size-[18px]" />
						</Link>
					</div>
				</div>
			</section>

			{/* Showcase: mockups */}
			<section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Mais destaque, mais visibilidade e mais pedidos para o seu negócio.
					</h2>
					<p className="mt-3 text-sm text-muted-foreground sm:text-base">
						Descoberta, visibilidade e vendas — tudo em um só lugar.
					</p>
				</div>

				<div className="mt-12 grid gap-x-6 gap-y-8 lg:grid-cols-3">
					{/* Card 1: busca no WhatsApp */}
					<div className="flex flex-col">
						<div className="flex flex-1 flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
							<div className="flex items-center gap-2 border-b border-border/60 pb-3">
								<span className="grid size-9 place-items-center rounded-full bg-whatsapp/15 text-whatsapp">
									<MessageCircle className="size-5" />
								</span>
								<div className="leading-tight">
									<p className="text-sm font-semibold text-foreground">João Tem</p>
									<p className="text-[11px] text-whatsapp">online</p>
								</div>
							</div>
							<div className="mt-4 flex flex-col gap-2.5">
								<div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-xs text-primary-foreground">
									doces para festa no centro
								</div>
								<div className="mr-auto max-w-[88%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-xs text-foreground">
									<p className="font-medium">💚 Encontrei 2 opções para você:</p>
									<p className="mt-1">🍰 Doces da Ana — Centro</p>
									<p className="mt-2 text-[11px] text-muted-foreground">
										✨ Quer ver mais opções? Digite: ver mais
									</p>
								</div>
							</div>
						</div>
						<div className="mt-5 px-1 text-center lg:text-left">
							<h3 className="text-sm font-semibold text-foreground">
								{SHOWCASE_CAPTIONS[0].title}
							</h3>
							<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
								{SHOWCASE_CAPTIONS[0].desc}
							</p>
						</div>
					</div>

					{/* Card 2: vitrine */}
					<div className="flex flex-col">
						<div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
							<div className="grid h-28 place-items-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary/50">
								<ShoppingBag className="size-9" />
							</div>
							<div className="p-4">
								<div className="flex items-center justify-between gap-2">
									<p className="font-semibold text-foreground">Doces da Ana</p>
									<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
										Negócio local
									</span>
								</div>
								<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
									Doces artesanais para festas e eventos. Bolos, brigadeiros e
									sobremesas.
								</p>
								<div className="mt-3 flex gap-2">
									<span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-whatsapp px-3 py-2 text-xs font-semibold text-whatsapp-foreground">
										<MessageCircle className="size-3.5" />
										WhatsApp
									</span>
									<span className="inline-flex flex-1 items-center justify-center rounded-lg border border-primary/30 px-3 py-2 text-xs font-semibold text-primary">
										Ver vitrine
									</span>
								</div>
							</div>
						</div>
						<div className="mt-5 px-1 text-center lg:text-left">
							<h3 className="text-sm font-semibold text-foreground">
								{SHOWCASE_CAPTIONS[1].title}
							</h3>
							<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
								{SHOWCASE_CAPTIONS[1].desc}
							</p>
						</div>
					</div>

					{/* Card 3: divulgação */}
					<div className="flex flex-col">
						<div className="flex flex-1 flex-col rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
							<div className="flex items-center gap-2">
								<span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
									<Store className="size-4" />
								</span>
								<div className="leading-tight">
									<p className="text-xs font-semibold text-foreground">
										docesdaana
									</p>
									<p className="text-[10px] text-muted-foreground">
										Repostado por joaotem
									</p>
								</div>
							</div>
							<div className="mt-3 grid grid-cols-3 gap-1.5">
								{[0, 1, 2, 3, 4, 5].map((i) => (
									<span
										key={i}
										className="grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-muted to-muted/40 text-muted-foreground/50"
									>
										<ShoppingBag className="size-4" />
									</span>
								))}
							</div>
						</div>
						<div className="mt-5 px-1 text-center lg:text-left">
							<h3 className="text-sm font-semibold text-foreground">
								{SHOWCASE_CAPTIONS[2].title}
							</h3>
							<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
								{SHOWCASE_CAPTIONS[2].desc}
							</p>
						</div>
					</div>
				</div>

				<div className="mt-12 flex justify-center">
					<Link to="/signup" className={ctaOutline}>
						Quero aparecer assim
						<ArrowRight className="size-4" />
					</Link>
				</div>
			</section>

			{/* Value props */}
			<section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Mais que um cadastro: uma presença local mais forte para o seu
						negócio
					</h2>
					<p className="mt-3 text-sm text-muted-foreground sm:text-base">
						O João Tem reúne busca no WhatsApp, vitrine online, visibilidade
						digital e descoberta entre negócios para ajudar sua empresa a
						aparecer mais e ter mais chances de ser escolhida.
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
					<Link to="/signup" className={ctaOutline}>
						Quero fazer parte
						<ArrowRight className="size-4" />
					</Link>
				</div>
			</section>

			{/* Ecosystem */}
			<section className="border-y border-border/60 bg-card/60">
				<div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
					<div className="mx-auto max-w-3xl text-center">
						<h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
							O João Tem conecta seu negócio a um ecossistema de descoberta e
							visibilidade
						</h2>
						<p className="mt-3 text-sm text-muted-foreground sm:text-base">
							Seu negócio não fica parado em uma página. Ele entra em uma
							estrutura criada para aumentar presença, descoberta e circulação
							dentro da cidade.
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
						<Link to="/signup" className={ctaOrange}>
							Cadastrar meu negócio
							<ArrowRight className="size-[18px]" />
						</Link>
					</div>
				</div>
			</section>

			{/* Vitrine demo */}
			<section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Veja como funciona a vitrine completa na prática
					</h2>
					<p className="mt-3 text-sm text-muted-foreground sm:text-base">
						Exemplo de como o cliente visualiza sua vitrine, conhece seus
						produtos e segue para o WhatsApp.
					</p>
				</div>

				<div className="mt-12 grid gap-5 lg:grid-cols-3">
					{/* Store */}
					<div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
						<div className="grid h-24 place-items-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary/40">
							<ShoppingBag className="size-8" />
						</div>
						<div className="p-4">
							<div className="flex items-center justify-between gap-2">
								<p className="font-semibold text-foreground">Doces da Paula</p>
								<span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
									★ 4.8{" "}
									<span className="text-muted-foreground">(22)</span>
								</span>
							</div>
							<div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
								<span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
									Negócio local
								</span>
								<span>Alimentação · Centro</span>
							</div>
							<p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								Produtos
							</p>
							<ul className="mt-2 flex flex-col gap-2">
								{DEMO_PRODUCTS.map((item) => (
									<li
										key={item.name}
										className="flex items-center gap-3 rounded-xl border border-border/50 p-2"
									>
										<span className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground/60">
											<ShoppingBag className="size-4" />
										</span>
										<div className="min-w-0 flex-1">
											<p className="truncate text-xs font-medium text-foreground">
												{item.name}
											</p>
											<p className="text-xs text-muted-foreground">
												{item.price}
											</p>
										</div>
										<span className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-2 py-1 text-[11px] font-semibold text-primary">
											<Plus className="size-3" />
											Adicionar
										</span>
									</li>
								))}
							</ul>
						</div>
					</div>

					{/* Cart */}
					<div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
						<div className="flex items-center justify-between border-b border-border/60 pb-3">
							<span className="inline-flex items-center gap-2 font-semibold text-foreground">
								<ShoppingBag className="size-4 text-primary" />
								Sua sacola
							</span>
							<X className="size-4 text-muted-foreground" />
						</div>
						<ul className="mt-3 flex flex-col gap-3">
							{DEMO_CART.map((item) => (
								<li key={item.name} className="flex items-center gap-3">
									<span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground/60">
										<ShoppingBag className="size-4" />
									</span>
									<div className="min-w-0 flex-1">
										<p className="truncate text-xs font-medium text-foreground">
											{item.name}
										</p>
										<p className="text-xs font-semibold text-primary">
											{item.price}
										</p>
									</div>
									<div className="flex items-center gap-1.5">
										<span className="grid size-6 place-items-center rounded-md border border-border/60 text-muted-foreground">
											<Minus className="size-3" />
										</span>
										<span className="w-4 text-center text-xs font-medium text-foreground">
											{item.qty}
										</span>
										<span className="grid size-6 place-items-center rounded-md border border-border/60 text-muted-foreground">
											<Plus className="size-3" />
										</span>
									</div>
								</li>
							))}
						</ul>
						<div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
							<span className="text-sm text-muted-foreground">Total</span>
							<span className="text-base font-bold text-foreground">
								R$ 66,00
							</span>
						</div>
						<div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
							Finalizar pedido
						</div>
						<div className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-semibold text-primary">
							Continuar comprando
						</div>
					</div>

					{/* Summary */}
					<div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 shadow-sm">
						<p className="text-[11px] text-muted-foreground">
							Você está comprando em:
						</p>
						<p className="mt-0.5 inline-flex items-center gap-1.5 font-semibold text-foreground">
							<Store className="size-4 text-primary" />
							Doces da Paula
						</p>
						<p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
							Resumo do Pedido
						</p>
						<ul className="mt-2 flex flex-col gap-2">
							{DEMO_SUMMARY.map((row) => (
								<li
									key={row.label}
									className="flex items-center justify-between text-xs"
								>
									<span className="text-muted-foreground">{row.label}</span>
									<span className="font-medium text-foreground">
										{row.value}
									</span>
								</li>
							))}
						</ul>
						<div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
							<span className="text-sm font-medium text-foreground">Total</span>
							<span className="text-base font-bold text-primary">R$ 66,00</span>
						</div>
						<p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
							Ao enviar o pedido, você será redirecionado para o WhatsApp da loja
							para confirmar entrega e finalizar a compra.
						</p>
						<div className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-2.5 text-sm font-semibold text-whatsapp-foreground">
							<MessageCircle className="size-4" />
							Enviar pedido
						</div>
					</div>
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
					<Link to="/signup" className={ctaOutline}>
						Quero minha vitrine no João Tem
						<ArrowRight className="size-4" />
					</Link>
				</div>
			</section>

			{/* Vitrine em Rede */}
			<section
				className="relative overflow-hidden py-16 sm:py-20"
				style={{
					background:
						"linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
				}}
			>
				<div className="mx-auto max-w-5xl px-4">
					<div className="mx-auto max-w-3xl text-center">
						<h2 className="text-balance text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
							Sua vitrine não fica sozinha. Ela entra em rede.
						</h2>
						<p className="mt-3 text-sm text-primary-foreground/85 sm:text-base">
							No João Tem, negócios com vitrine ajudam a gerar descoberta entre
							si, aumentando a visibilidade e criando mais chances de novos
							clientes conhecerem sua empresa.
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
						<Link to="/signup" className={ctaOrange}>
							Cadastrar meu negócio
							<ArrowRight className="size-[18px]" />
						</Link>
					</div>
				</div>
			</section>

			{/* Trust stats */}
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

			{/* Plans */}
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
							Coloque seu negócio na busca do WhatsApp ou ative sua presença
							completa para ganhar mais visibilidade na cidade.
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

			{/* Use cases */}
			<section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Para quem quer mais do que só estar cadastrado
					</h2>
					<p className="mt-3 text-sm text-muted-foreground sm:text-base">
						O plano Ouro foi feito para negócios e prestadores de serviços que
						querem fortalecer sua presença digital local, ganhar mais
						visibilidade e ter uma vitrine profissional dentro do ecossistema
						João Tem.
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
							<span className="text-sm font-medium text-foreground">{text}</span>
						</div>
					))}
				</div>
			</section>

			{/* Testimonials */}
			<section className="border-y border-border/60 bg-card/60">
				<div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
					<div className="mx-auto max-w-2xl text-center">
						<span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
							<Users className="size-4" />
							Comunidade João Tem
						</span>
						<h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
							Veja o que dizem nossos clientes
						</h2>
						<p className="mt-3 text-sm text-muted-foreground sm:text-base">
							Histórias reais de quem já está vendendo mais pelo João Tem.
						</p>
					</div>

					<div className="mt-12 grid gap-6 sm:grid-cols-3">
						{TESTIMONIALS.map((t) => (
							<div
								key={t.name}
								className="flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
							>
								<Quote className="size-7 text-primary/25" />
								<p className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
									{t.quote}
								</p>
								<div className="mt-5 flex items-center gap-3">
									<span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
										{t.initials}
									</span>
									<div>
										<p className="text-sm font-semibold text-foreground">
											{t.name}
										</p>
										<p className="text-xs text-muted-foreground">{t.business}</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* FAQ */}
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

			{/* Final CTA */}
			<section
				className="relative overflow-hidden py-16 sm:py-20"
				style={{
					background:
						"linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
				}}
			>
				<div className="mx-auto max-w-2xl px-4 text-center">
					<h2 className="text-balance text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
						Comece hoje e amplie a visibilidade do seu negócio no João Tem
					</h2>
					<p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/85 sm:text-base">
						Seu negócio pode começar na busca do WhatsApp e evoluir para uma
						presença mais forte, mais visível e mais conectada dentro da cidade.
					</p>
					<div className="mt-8 flex justify-center">
						<Link to="/signup" className={ctaOrange}>
							<ShieldCheck className="size-[18px]" />
							Cadastrar meu negócio
							<ArrowRight className="size-[18px]" />
						</Link>
					</div>
				</div>
			</section>

			<SiteFooter />
		</div>
	);
}
