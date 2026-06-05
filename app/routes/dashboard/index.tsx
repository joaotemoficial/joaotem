import { Link, data, useLoaderData, useRouteLoaderData } from "react-router";
import { PlanBadge } from "~/components/business/plan-badge";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { requireUser } from "~/lib/auth.server";
import { BUSINESS_STATUS_LABELS } from "~/lib/constants";
import {
	activationWhatsappHref,
	daysUntilExpiry,
	effectivePlanTier,
	type PlanTier,
	type SubscriptionStatus,
	subscriptionStatus,
} from "~/lib/plan";
import { getPublicUrl } from "~/lib/storage.server";
import { cn } from "~/lib/utils";
import * as businesses from "~/repositories/businesses";
import * as planUpgradeRepo from "~/repositories/plan-upgrade-requests";
import { isError, unwrap } from "~/types";
import {
	CircleAlert,
	Crown,
	ExternalLink,
	Megaphone,
	MessageCircle,
	Pencil,
	Plus,
	ShoppingBag,
	Sparkles,
	Store,
} from "lucide-react";
import type { Route } from "./+types/index";
import type { loader as layoutLoader } from "./layout";

export const meta: Route.MetaFunction = () => [{ title: "Meu painel — JoaoTem" }];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireUser(request);
	const [result, requestsResult] = await Promise.all([
		businesses.listByUser({ supabase: ctx.supabase, userId: ctx.user.id }),
		planUpgradeRepo.listForOwner({
			supabase: ctx.supabase,
			userId: ctx.user.id,
		}),
	]);
	const list = unwrap(result);

	// Most recent pending request per business — used to suggest a plan in the
	// "never subscribed" WhatsApp activation message. Already ordered desc.
	const pendingPlanByBusiness: Record<string, PlanTier> = {};
	if (!isError(requestsResult)) {
		for (const r of requestsResult.success) {
			if (r.status === "pending" && !(r.business_id in pendingPlanByBusiness)) {
				pendingPlanByBusiness[r.business_id] = r.requested_plan;
			}
		}
	}

	const items = (Array.isArray(list) ? list : []).map((b) => ({
		...b,
		logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
		cover_url: getPublicUrl(ctx.supabase, "business-covers", b.cover_path),
		effective_tier: effectivePlanTier({
			plan_tier: b.plan_tier,
			plan_expires_at: b.plan_expires_at,
		}),
		days_until_expiry: daysUntilExpiry(b.plan_expires_at),
		subscription_status: subscriptionStatus({
			plan_tier: b.plan_tier,
			plan_started_at: b.plan_started_at,
			plan_expires_at: b.plan_expires_at,
		}),
		requested_plan: pendingPlanByBusiness[b.id] ?? ("ouro" as PlanTier),
	}));
	return data({ items }, { headers: ctx.headers });
}

// Label for the plan action button, given the subscription status and the
// active tier. "never" is handled separately (WhatsApp CTA) and never reaches
// this function.
function planActionLabel(
	status: SubscriptionStatus,
	effectiveTier: PlanTier | null,
): string {
	switch (status) {
		case "expired":
			return "Solicitar renovação";
		case "active":
			return effectiveTier === "basico" ? "Upgrade" : "Plano";
		default:
			return "Plano";
	}
}

const STATUS_VARIANT: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	pending: "secondary",
	approved: "default",
	rejected: "destructive",
	suspended: "outline",
};

type OwnerBusiness = Route.ComponentProps["loaderData"]["items"][number];

function firstName(fullName?: string | null, email?: string | null): string {
	const name = (fullName ?? "").trim();
	if (name) return name.split(/\s+/)[0];
	const local = (email ?? "").split("@")[0];
	if (local) return local.charAt(0).toUpperCase() + local.slice(1);
	return "lojista";
}

export default function DashboardHome() {
	const { items } = useLoaderData<typeof loader>();
	const layoutData = useRouteLoaderData<typeof layoutLoader>(
		"routes/dashboard/layout",
	);
	const greeting = firstName(
		layoutData?.profile?.full_name,
		layoutData?.profile?.email ?? layoutData?.user.email,
	);

	const total = items.length;
	const approved = items.filter((b) => b.status === "approved").length;
	const ouro = items.filter((b) => b.effective_tier === "ouro").length;
	const needsAttention = items.filter(
		(b) =>
			b.effective_tier === null ||
			(b.days_until_expiry != null && b.days_until_expiry <= 7),
	).length;

	const stats = [
		{ label: "Negócios", value: total, Icon: Store, tone: "primary" as const },
		{
			label: "Aprovados",
			value: approved,
			Icon: Sparkles,
			tone: "emerald" as const,
		},
		{ label: "Plano Ouro", value: ouro, Icon: Crown, tone: "amber" as const },
		{
			label: "Atenção",
			value: needsAttention,
			Icon: CircleAlert,
			tone: needsAttention > 0 ? ("rose" as const) : ("muted" as const),
		},
	];

	return (
		<main className="flex flex-1 flex-col">
			{/* Hero band */}
			<section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-secondary/70 via-background to-background">
				<div
					aria-hidden
					className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/10 blur-3xl"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute -left-20 top-10 size-56 rounded-full bg-primary/10 blur-3xl"
				/>
				<div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div className="min-w-0">
							<span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
								<Store className="size-3" />
								Painel do lojista
							</span>
							<h1 className="mt-3 text-2xl font-bold tracking-tight text-accent sm:text-3xl">
								Olá, {greeting}
								<span className="ml-1.5 inline-block origin-[70%_70%] motion-safe:animate-[wave_2.4s_ease-in-out_1]">
									👋
								</span>
							</h1>
							<p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
								Gerencie os negócios cadastrados na sua conta, atualize
								produtos e crie promoções para vender mais.
							</p>
						</div>
						<Link
							to="/dashboard/businesses/new"
							className={buttonVariants({
								variant: "default",
								size: "lg",
								className: "gap-1.5 shadow-sm shadow-primary/20",
							})}
						>
							<Plus />
							Novo negócio
						</Link>
					</div>

					{/* Stats */}
					<dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
						{stats.map(({ label, value, Icon, tone }, i) => (
							<div
								key={label}
								style={{ animationDelay: `${i * 60}ms` }}
								className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-xs backdrop-blur-sm transition-colors hover:border-border motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500"
							>
								<span
									className={cn(
										"grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition-transform group-hover:scale-105",
										TONE_CLASS[tone],
									)}
								>
									<Icon className="size-[18px]" />
								</span>
								<div className="min-w-0">
									<dd className="text-xl font-bold leading-none tracking-tight text-foreground tabular-nums">
										{value}
									</dd>
									<dt className="mt-1 truncate text-xs font-medium text-muted-foreground">
										{label}
									</dt>
								</div>
							</div>
						))}
					</dl>
				</div>
			</section>

			{/* Business list */}
			<section className="mx-auto w-full max-w-5xl px-4 py-8">
				{items.length === 0 ? (
					<EmptyState />
				) : (
					<>
						<div className="flex items-baseline justify-between gap-2 pb-5">
							<h2 className="text-base font-semibold tracking-tight text-foreground">
								Seus negócios
							</h2>
							<span className="text-xs font-medium text-muted-foreground tabular-nums">
								{total} {total === 1 ? "cadastrado" : "cadastrados"}
							</span>
						</div>
						<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{items.map((b, i) => (
								<OwnerBusinessCard key={b.id} business={b} index={i} />
							))}
						</ul>
					</>
				)}
			</section>
		</main>
	);
}

const TONE_CLASS: Record<string, string> = {
	primary: "bg-primary/10 text-primary ring-primary/15",
	emerald: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15",
	amber: "bg-amber-400/15 text-amber-600 ring-amber-500/20",
	rose: "bg-rose-500/10 text-rose-600 ring-rose-500/15",
	muted: "bg-muted text-muted-foreground ring-border",
};

function OwnerBusinessCard({
	business: b,
	index,
}: {
	business: OwnerBusiness;
	index: number;
}) {
	const base = `/dashboard/businesses/${b.id}`;
	const showPublicLink = b.status === "approved" && b.effective_tier !== null;
	const tileCls =
		"flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

	return (
		<li
			style={{ animationDelay: `${index * 70}ms` }}
			className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500"
		>
			<div className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-border">
				{/* Cover */}
				<div className="relative h-24 w-full shrink-0 overflow-hidden bg-gradient-to-br from-primary/20 via-sky-100 to-secondary">
					{b.cover_url ? (
						<img
							src={b.cover_url}
							alt=""
							className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
					) : (
						<div
							aria-hidden
							className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,var(--color-primary)_1px,transparent_0)] [background-size:14px_14px]"
						/>
					)}
					<div className="absolute inset-0 bg-gradient-to-t from-card/30 to-transparent" />
				</div>

				{/* Identity: logo, then name + handle below it */}
				<div className="relative z-10 -mt-9 px-4">
					<div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-background shadow-md ring-4 ring-card">
						{b.logo_url ? (
							<img
								src={b.logo_url}
								alt=""
								className="h-full w-full object-cover"
							/>
						) : (
							<div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary to-sky-400 text-lg font-bold text-primary-foreground">
								{b.name.charAt(0).toUpperCase()}
							</div>
						)}
					</div>
					<div className="mt-2.5">
						<h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
							{b.name}
						</h3>
						<p className="truncate text-xs text-muted-foreground">
							@{b.handle}
						</p>
					</div>
				</div>

				{/* Body */}
				<div className="flex flex-1 flex-col px-4 pb-4 pt-3">
					{/* Status + plan, on a readable card background */}
					<div className="flex flex-wrap items-center gap-1.5">
						<Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>
							{BUSINESS_STATUS_LABELS[b.status]}
						</Badge>
						<PlanBadge tier={b.effective_tier} />
					</div>

					{/* Plan / status notices */}
					{b.subscription_status === "never" ? (
						<div className="mt-3 rounded-lg bg-amber-400/10 px-2.5 py-2 text-xs">
							<p className="font-semibold text-amber-700">
								Negócio em rascunho — oculto do site.
							</p>
							<p className="text-amber-700/80">
								Envie uma mensagem no WhatsApp dizendo que quer pagar para
								ativar.
							</p>
						</div>
					) : b.subscription_status === "expired" ? (
						<div className="mt-3 rounded-lg bg-destructive/10 px-2.5 py-2 text-xs">
							<p className="font-semibold text-destructive">
								Plano inativo — oculto do site.
							</p>
							<p className="text-destructive/80">
								Renove para voltar a aparecer nas buscas.
							</p>
						</div>
					) : b.days_until_expiry != null && b.days_until_expiry <= 7 ? (
						<p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-2 text-xs font-medium text-amber-700">
							<CircleAlert className="size-3.5 shrink-0" />
							Expira em {b.days_until_expiry} dia(s) — considere renovar.
						</p>
					) : b.days_until_expiry != null ? (
						<p className="mt-3 text-xs text-muted-foreground">
							Plano ativo · expira em {b.days_until_expiry} dia(s).
						</p>
					) : null}

					{b.status === "rejected" && b.rejection_reason ? (
						<p className="mt-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
							Motivo: {b.rejection_reason}
						</p>
					) : null}
					{b.status === "suspended" && b.rejection_reason ? (
						<p className="mt-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
							Suspenso: {b.rejection_reason}
						</p>
					) : null}

					{/* Actions */}
					<div className="mt-4 flex flex-1 flex-col justify-end gap-2 border-t border-border/60 pt-3">
						<div className="grid grid-cols-3 gap-1.5">
							<Link to={base} className={tileCls}>
								<Pencil className="size-4" />
								Editar
							</Link>
							<Link to={`${base}/products`} className={tileCls}>
								<ShoppingBag className="size-4" />
								Produtos
							</Link>
							<Link to={`${base}/promotions`} className={tileCls}>
								<Megaphone className="size-4" />
								Promoções
							</Link>
						</div>
						<div className="flex items-center gap-1">
							{b.subscription_status === "never" ? (
								<a
									href={activationWhatsappHref(b.name, b.requested_plan)}
									target="_blank"
									rel="noreferrer"
									className={buttonVariants({
										variant: "ghost",
										size: "sm",
										className: "gap-1 text-whatsapp hover:text-whatsapp",
									})}
								>
									<MessageCircle />
									Quero pagar
								</a>
							) : (
								<Link
									to={`/dashboard/upgrade?business=${b.id}`}
									className={buttonVariants({
										variant: "ghost",
										size: "sm",
										className:
											b.subscription_status === "expired"
												? "gap-1 text-destructive hover:text-destructive"
												: "gap-1 text-muted-foreground",
									})}
								>
									<Sparkles />
									{planActionLabel(b.subscription_status, b.effective_tier)}
								</Link>
							)}
							{showPublicLink ? (
								<a
									href={`/negocio/${b.handle}`}
									target="_blank"
									rel="noreferrer"
									className={buttonVariants({
										variant: "ghost",
										size: "sm",
										className: "ml-auto gap-1 text-primary hover:text-primary",
									})}
								>
									<ExternalLink />
									Ver
								</a>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</li>
	);
}

function EmptyState() {
	return (
		<div className="relative overflow-hidden rounded-3xl border border-dashed border-border bg-gradient-to-b from-secondary/50 to-card px-6 py-14 text-center">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 w-40 rounded-full bg-primary/10 blur-3xl"
			/>
			<div className="relative mx-auto flex max-w-sm flex-col items-center">
				<span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-sky-400 text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-inset ring-white/25">
					<Store className="size-8" strokeWidth={2} />
				</span>
				<h2 className="mt-5 text-lg font-bold tracking-tight text-foreground">
					Cadastre seu primeiro negócio
				</h2>
				<p className="mt-1.5 text-sm text-muted-foreground">
					Crie a página do seu negócio para aparecer nas buscas, divulgar
					produtos e publicar promoções na sua cidade.
				</p>
				<Link
					to="/dashboard/businesses/new"
					className={buttonVariants({
						variant: "default",
						size: "lg",
						className: "mt-6 gap-1.5",
					})}
				>
					<Plus />
					Cadastrar agora
				</Link>
			</div>
		</div>
	);
}
