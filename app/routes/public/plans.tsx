import {
	ArrowRight,
	Check,
	ChevronDown,
	Crown,
	Heart,
	Megaphone,
	MessageCircle,
	ShieldCheck,
	ShoppingBag,
	Sparkles,
	Store,
	TrendingUp,
	Users,
} from "lucide-react";
import { Link, useLoaderData } from "react-router";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import { PlanBadge } from "~/components/business/plan-badge";
import { PlanPricingCard } from "~/components/pricing/plan-pricing-card";
import { buttonVariants } from "~/components/ui/button";
import { getSessionAndProfile } from "~/lib/auth.server";
import * as featureFlagsRepo from "~/repositories/feature-flags";
import type { FeatureFlagRow } from "~/repositories/feature-flags";
import { isError } from "~/types";
import type { Route } from "./+types/plans";

const PLAN_DISPLAY = {
	basico: {
		tier: "basico",
		name: "Básico",
		price: "R$ 7,90",
		period: "/mês",
		tagline:
			"O essencial para aparecer nas buscas e ter a página do seu negócio no portal.",
		cta: "Começar no Básico",
	},
	ouro: {
		tier: "ouro",
		name: "Ouro",
		price: "R$ 47,90",
		period: "/mês",
		tagline:
			"Mais visibilidade, vitrine de produtos e divulgação para vender todos os dias.",
		badge: "Mais visibilidade",
		cta: "Ativar plano Ouro",
	},
} as const;

const VALUE_PROPS = [
	{
		Icon: MessageCircle,
		title: "Busca no WhatsApp",
		desc: "Seus clientes encontram seu negócio onde já conversam todos os dias.",
	},
	{
		Icon: Store,
		title: "Sua vitrine online",
		desc: "Uma página com seus produtos, preços e contatos, pronta para compartilhar.",
	},
	{
		Icon: Megaphone,
		title: "Divulgação e visibilidade",
		desc: "Apareça em destaque nas buscas e alcance mais gente da sua cidade.",
	},
] as const;

const ECOSYSTEM_STEPS = [
	{ Icon: MessageCircle, label: "WhatsApp" },
	{ Icon: Store, label: "Vitrine" },
	{ Icon: TrendingUp, label: "Visibilidade" },
	{ Icon: Users, label: "Vitrine em Rede" },
] as const;

const NETWORK_POINTS = [
	"Negócios da cidade se apoiam e crescem juntos",
	"Mais alcance para a sua vitrine sem gastar com anúncio",
	"Indicações entre lojistas da mesma região",
] as const;

// Números reais de prova social — substitua os "—" pelos valores atuais.
const TRUST_STATS = [
	{ value: "0%", label: "de comissão por venda" },
	{ value: "—", label: "negócios cadastrados" },
	{ value: "—", label: "cidades atendidas" },
] as const;

const USE_CASES = [
	{
		Icon: Store,
		title: "Lojas e comércios",
		desc: "Quem tem ponto físico e quer ser encontrado por mais clientes.",
	},
	{
		Icon: ShoppingBag,
		title: "Vendas por encomenda",
		desc: "Quem vende doces, salgados, marmitas e produtos sob pedido.",
	},
	{
		Icon: Sparkles,
		title: "Serviços e autônomos",
		desc: "Manicures, barbeiros, eletricistas e outros profissionais.",
	},
	{
		Icon: Heart,
		title: "Quem quer profissionalizar",
		desc: "Negócios que querem passar mais credibilidade para o cliente.",
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
		q: "Como ativo meu plano?",
		a: "Faça seu cadastro e escolha o plano. Nossa equipe entra em contato pelo WhatsApp para finalizar o pagamento e ativar.",
	},
] as const;

// Exemplo ilustrativo de vitrine — não representa um negócio real.
const SHOWCASE = {
	store: "Doces da Rita",
	items: [
		{ name: "Brigadeiro gourmet", price: "R$ 4,00" },
		{ name: "Bolo de chocolate", price: "R$ 65,00" },
	],
	total: "R$ 69,00",
} as const;

export const meta: Route.MetaFunction = () => [
	{ title: "Planos — JoaoTem" },
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

	return (
		<div className="min-h-svh bg-background">
			<SiteHeader user={user} role={profile?.role} />

			{/* Hero */}
			<section className="relative overflow-hidden border-b border-border/60 py-16 sm:py-24 lg:py-28">
				<div
					aria-hidden
					className="absolute inset-0 bg-cover bg-center bg-no-repeat"
					style={{ backgroundImage: "url(/oros.jpeg)" }}
				/>
				<div aria-hidden className="absolute inset-0 bg-primary/90" />

				<div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
					<div className="animate-in fade-in fill-mode-both mb-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm duration-700">
						<span className="size-2 animate-pulse rounded-full bg-whatsapp" />
						<span className="text-sm font-medium text-primary-foreground/90">
							Planos João Tem
						</span>
					</div>

					<h1 className="animate-in fade-in fill-mode-both mb-6 text-balance text-3xl font-bold leading-tight text-primary-foreground duration-700 [animation-delay:0.1s] sm:text-4xl lg:text-5xl">
						O ecossistema local do seu negócio
					</h1>

					<p className="animate-in fade-in fill-mode-both mb-8 text-lg text-primary-foreground/85 duration-700 [animation-delay:0.2s] sm:text-xl">
						Apareça nas buscas, ganhe uma vitrine online e venda mais para os
						clientes da sua cidade.
					</p>

					<div className="animate-in fade-in fill-mode-both flex flex-col items-center justify-center gap-3 duration-700 [animation-delay:0.3s] sm:flex-row">
						<a
							href="#planos"
							className={buttonVariants({
								variant: "default",
								size: "lg",
								className:
									"h-12 w-full gap-2 rounded-xl bg-background px-6 text-base text-primary hover:bg-background/90 sm:w-auto",
							})}
						>
							<Store className="size-[18px] text-amber-600" />
							Cadastrar meu negócio
						</a>
					</div>
				</div>
			</section>

			{/* Propostas de valor */}
			<section className="mx-auto max-w-6xl px-4 py-16">
				<div className="mx-auto max-w-2xl text-center">
					<span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
						Como o João Tem ajuda
					</span>
					<h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						Tudo que o seu negócio precisa para ser encontrado
					</h2>
				</div>

				<div className="mt-12 grid gap-6 sm:grid-cols-3">
					{VALUE_PROPS.map(({ Icon, title, desc }) => (
						<div
							key={title}
							className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
						>
							<span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
								<Icon className="size-6" />
							</span>
							<h3 className="mt-4 text-base font-semibold tracking-tight text-foreground sm:text-lg">
								{title}
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								{desc}
							</p>
						</div>
					))}
				</div>
			</section>

			{/* Diagrama do ecossistema */}
			<section className="border-y border-border/60 bg-secondary/40">
				<div className="mx-auto max-w-6xl px-4 py-16">
					<div className="mx-auto max-w-2xl text-center">
						<h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
							Como o ecossistema funciona
						</h2>
						<p className="mt-3 text-sm text-muted-foreground sm:text-base">
							Do primeiro contato à indicação entre negócios da cidade.
						</p>
					</div>

					<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-2">
						{ECOSYSTEM_STEPS.map(({ Icon, label }, i) => (
							<div
								key={label}
								className="flex flex-col items-center gap-4 sm:flex-row sm:gap-2"
							>
								<div className="flex flex-col items-center gap-2">
									<span className="grid size-16 place-items-center rounded-2xl bg-card text-primary shadow-sm ring-1 ring-border/60">
										<Icon className="size-7" />
									</span>
									<span className="text-sm font-medium text-foreground">
										{label}
									</span>
								</div>
								{i < ECOSYSTEM_STEPS.length - 1 ? (
									<ArrowRight className="size-5 rotate-90 text-muted-foreground sm:rotate-0" />
								) : null}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Vitrine de exemplo */}
			<section className="mx-auto max-w-6xl px-4 py-16">
				<div className="grid items-center gap-10 lg:grid-cols-2">
					<div className="space-y-6">
						<span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
							Sua vitrine
						</span>
						<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
							Uma loja online pronta para vender
						</h2>
						<p className="max-w-xl text-base leading-relaxed text-muted-foreground">
							Cadastre seus produtos com foto e preço. O cliente monta o pedido
							e envia direto para o seu WhatsApp — simples assim.
						</p>
						<Link
							to="/signup"
							className={buttonVariants({
								variant: "default",
								size: "lg",
								className: "h-11 gap-2 px-6",
							})}
						>
							<Store className="size-4" />
							Criar minha vitrine
						</Link>
					</div>

					<div className="relative">
						<div className="mx-auto max-w-sm rounded-3xl border border-border/60 bg-card p-5 shadow-xl">
							<div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
								<span className="font-semibold text-foreground">
									{SHOWCASE.store}
								</span>
								<PlanBadge tier="ouro" variant="solid" />
							</div>
							<ul className="mt-3 flex flex-col gap-3">
								{SHOWCASE.items.map((item) => (
									<li
										key={item.name}
										className="flex items-center justify-between gap-3"
									>
										<span className="flex items-center gap-2 text-sm text-foreground">
											<span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
												<ShoppingBag className="size-4" />
											</span>
											{item.name}
										</span>
										<span className="text-sm font-medium text-foreground">
											{item.price}
										</span>
									</li>
								))}
							</ul>
							<div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
								<span className="text-sm text-muted-foreground">Total</span>
								<span className="text-base font-bold text-foreground">
									{SHOWCASE.total}
								</span>
							</div>
							<div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-2.5 text-sm font-semibold text-whatsapp-foreground">
								<MessageCircle className="size-4" />
								Enviar pedido no WhatsApp
							</div>
							<p className="mt-3 text-center text-[11px] text-muted-foreground">
								Exemplo ilustrativo
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Vitrine em Rede */}
			<section className="border-y border-border/60 bg-secondary/40">
				<div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2">
					<div className="space-y-6">
						<span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
							Vitrine em Rede
						</span>
						<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
							Negócios que crescem juntos
						</h2>
						<p className="max-w-xl text-base leading-relaxed text-muted-foreground">
							Quando um negócio aparece, todos ganham. A Vitrine em Rede conecta
							lojistas da mesma cidade para ampliar o alcance de cada um.
						</p>
						<ul className="grid gap-3">
							{NETWORK_POINTS.map((point) => (
								<li key={point} className="flex items-start gap-2.5">
									<Check className="mt-0.5 size-5 shrink-0 text-whatsapp" />
									<span className="text-sm font-medium text-foreground">
										{point}
									</span>
								</li>
							))}
						</ul>
					</div>

					<div className="relative">
						<div className="grid grid-cols-3 gap-4">
							{[Store, ShoppingBag, Sparkles, Heart, Megaphone, Users].map(
								(Icon, i) => (
									<span
										key={i}
										className="grid aspect-square place-items-center rounded-2xl border border-border/60 bg-card text-primary shadow-sm"
									>
										<Icon className="size-7" />
									</span>
								),
							)}
						</div>
						<div className="absolute -top-4 -right-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-2.5 shadow-lg">
							<TrendingUp className="size-5 text-whatsapp" />
							<span className="text-sm font-semibold text-foreground">
								Mais visibilidade
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* Indicadores de confiança */}
			<section className="mx-auto max-w-6xl px-4 py-12">
				<div className="grid gap-6 rounded-3xl border border-border/60 bg-card px-6 py-8 shadow-sm sm:grid-cols-3">
					{TRUST_STATS.map((stat) => (
						<div key={stat.label} className="text-center">
							<p className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
								{stat.value}
							</p>
							<p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
						</div>
					))}
				</div>
			</section>

			{/* Planos */}
			<section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
				<div className="mx-auto max-w-2xl text-center">
					<span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Planos e preços
					</span>
					<h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						Escolha o plano do seu negócio
					</h2>
					<p className="mt-3 text-sm text-muted-foreground sm:text-base">
						Sem comissão por venda. Cancele ou mude de plano quando quiser.
					</p>
				</div>

				<div className="mx-auto mt-12 grid max-w-4xl items-start gap-6 sm:grid-cols-2">
					<PlanPricingCard
						tier={PLAN_DISPLAY.basico.tier}
						name={PLAN_DISPLAY.basico.name}
						price={PLAN_DISPLAY.basico.price}
						period={PLAN_DISPLAY.basico.period}
						tagline={PLAN_DISPLAY.basico.tagline}
						features={basicoFeatures}
						ctaLabel={PLAN_DISPLAY.basico.cta}
						ctaHref="/signup?plan=basico"
					/>
					<PlanPricingCard
						tier={PLAN_DISPLAY.ouro.tier}
						name={PLAN_DISPLAY.ouro.name}
						price={PLAN_DISPLAY.ouro.price}
						period={PLAN_DISPLAY.ouro.period}
						tagline={PLAN_DISPLAY.ouro.tagline}
						features={ouroBaseFeatures}
						premiumFeatures={ouroPremiumFeatures}
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
			</section>

			{/* Para quem é */}
			<section className="border-y border-border/60 bg-secondary/40">
				<div className="mx-auto max-w-6xl px-4 py-16">
					<div className="mx-auto max-w-2xl text-center">
						<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
							Para quem é o João Tem
						</h2>
						<p className="mt-3 text-sm text-muted-foreground sm:text-base">
							Feito para quem vende e quer ser encontrado na cidade.
						</p>
					</div>

					<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{USE_CASES.map(({ Icon, title, desc }) => (
							<div
								key={title}
								className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
							>
								<span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
									<Icon className="size-5" />
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
				</div>
			</section>

			{/* Depoimentos (placeholder) */}
			<section className="mx-auto max-w-6xl px-4 py-16">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						O que dizem por aí
					</h2>
					<p className="mt-3 text-sm text-muted-foreground sm:text-base">
						Em breve, histórias reais de quem usa o João Tem.
					</p>
				</div>

				{/* TODO: substituir pelos depoimentos reais (nome, foto e negócio). */}
				<div className="mt-12 grid gap-6 sm:grid-cols-3">
					{[0, 1, 2].map((i) => (
						<div
							key={i}
							className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-6"
						>
							<p className="text-sm italic leading-relaxed text-muted-foreground">
								"Espaço reservado para o depoimento de um cliente."
							</p>
							<div className="mt-5 flex items-center gap-3">
								<span className="size-10 shrink-0 rounded-full bg-muted" />
								<div>
									<p className="text-sm font-semibold text-foreground">
										Cliente João Tem
									</p>
									<p className="text-xs text-muted-foreground">Negócio local</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* FAQ */}
			<section className="border-t border-border/60 bg-secondary/40">
				<div className="mx-auto max-w-3xl px-4 py-16">
					<div className="text-center">
						<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
							Perguntas frequentes
						</h2>
					</div>

					<div className="mt-10 flex flex-col gap-3">
						{FAQ_ITEMS.map((item) => (
							<details
								key={item.q}
								className="group rounded-2xl border border-border/60 bg-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
							>
								<summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground">
									{item.q}
									<ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
								</summary>
								<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
									{item.a}
								</p>
							</details>
						))}
					</div>
				</div>
			</section>

			{/* CTA final */}
			<section className="py-16">
				<div className="mx-auto max-w-6xl px-4">
					<div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-linear-to-t from-sky-600 to-indigo-600 px-6 py-6 text-primary-foreground sm:flex-row sm:items-center sm:px-8">
						<div className="space-y-1">
							<h2 className="text-lg font-semibold tracking-tight sm:text-xl">
								Comece hoje e amplie a visibilidade do seu negócio
							</h2>
							<p className="text-sm text-primary-foreground/85">
								Cadastre-se em minutos e escolha o plano ideal para você.
							</p>
						</div>
						<Link
							to="/signup"
							className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-background px-5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-background/90"
						>
							<ShieldCheck className="size-4" />
							Cadastrar meu negócio
						</Link>
					</div>
				</div>
			</section>

			<SiteFooter />
		</div>
	);
}
