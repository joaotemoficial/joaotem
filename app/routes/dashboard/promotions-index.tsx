import { Link, useLoaderData } from "react-router";
import { FeatureUpgradeCallout } from "~/components/business/feature-upgrade-callout";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { requireUser } from "~/lib/auth.server";
import { DAY_SHORT_LABELS } from "~/lib/constants";
import {
	featureLimit,
	hasFeature,
	resolveFlagsForBusiness,
} from "~/lib/feature-flags.server";
import { effectivePlanTier, subscriptionStatus } from "~/lib/plan";
import { PROMOTION_IMAGE_BUCKET, getPublicUrl } from "~/lib/storage.server";
import { maskToDays } from "~/lib/validation/business";
import * as businessesRepo from "~/repositories/businesses";
import * as promotionsRepo from "~/repositories/promotions";
import { isError, unwrap } from "~/types";
import type { Route } from "./+types/promotions-index";

export const meta: Route.MetaFunction = () => [
	{ title: "Promoções — JoaoTem" },
];

export async function loader({ params, request }: Route.LoaderArgs) {
	const ctx = await requireUser(request);
	const businessResult = await businessesRepo.getByIdForOwner({
		supabase: ctx.supabase,
		id: params.id,
		userId: ctx.user.id,
	});
	if (isError(businessResult)) {
		throw new Response(businessResult.error, { status: 500 });
	}
	const business = businessResult.success;
	if (!business) throw new Response("Negócio não encontrado", { status: 404 });

	const promotionsResult = await promotionsRepo.listByBusiness({
		supabase: ctx.supabase,
		businessId: business.id,
	});
	const promotions = unwrap(promotionsResult) as Array<{
		id: string;
		title: string;
		description: string | null;
		schedule_note: string | null;
		recurrence_days: number;
		starts_at: string | null;
		ends_at: string | null;
		is_active: boolean;
		images: { id: string; storage_path: string; sort_order: number }[];
	}>;

	const effTier = effectivePlanTier({
		plan_tier: business.plan_tier,
		plan_expires_at: business.plan_expires_at,
	});
	const flags = await resolveFlagsForBusiness({
		supabase: ctx.supabase,
		businessId: business.id,
		planTier: effTier,
	});
	const canUsePromotions = hasFeature(flags, "promocoes_semana");
	const promotionLimit = featureLimit(flags, "promocoes_semana");
	const currentCount = promotions.length;
	const atLimit = promotionLimit !== null && currentCount >= promotionLimit;

	return {
		business: { id: business.id, name: business.name, handle: business.handle },
		subscriptionStatus: subscriptionStatus({
			plan_tier: business.plan_tier,
			plan_started_at: business.plan_started_at,
			plan_expires_at: business.plan_expires_at,
		}),
		canUsePromotions,
		promotionLimit,
		currentCount,
		atLimit,
		promotions: promotions.map((p) => {
			const cover = [...(p.images ?? [])].sort(
				(a, b) => a.sort_order - b.sort_order,
			)[0];
			return {
				...p,
				cover_url: cover
					? getPublicUrl(ctx.supabase, PROMOTION_IMAGE_BUCKET, cover.storage_path)
					: null,
				active_days: maskToDays(p.recurrence_days),
			};
		}),
	};
}

export async function action({ request }: Route.ActionArgs) {
	const ctx = await requireUser(request);
	const formData = await request.formData();
	const intent = formData.get("intent");
	const promotionId = formData.get("promotion_id");
	if (intent === "delete" && typeof promotionId === "string") {
		await promotionsRepo.softDelete({ supabase: ctx.supabase, id: promotionId });
	}
	return null;
}

function formatDateRange(starts: string | null, ends: string | null): string | null {
	if (!starts && !ends) return null;
	const fmt = (d: string) =>
		new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
		});
	if (starts && ends) return `${fmt(starts)} – ${fmt(ends)}`;
	if (starts) return `a partir de ${fmt(starts)}`;
	if (ends) return `até ${fmt(ends as string)}`;
	return null;
}

export default function PromotionsIndex() {
	const {
		business,
		subscriptionStatus: status,
		promotions,
		canUsePromotions,
		promotionLimit,
		currentCount,
		atLimit,
	} = useLoaderData<typeof loader>();
	const newPromotionDisabled = !canUsePromotions || atLimit;
	return (
		<main className="mx-auto max-w-5xl px-4 py-8">
			<div className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">
						Promoções de {business.name}
					</h1>
					<p className="text-sm text-muted-foreground">
						Promoções aparecem na página pública apenas nos dias selecionados.
						{promotionLimit !== null
							? ` (${currentCount}/${promotionLimit})`
							: null}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link
						to={`/dashboard/businesses/${business.id}`}
						className={buttonVariants({ variant: "ghost", size: "default" })}
					>
						Voltar ao negócio
					</Link>
					{newPromotionDisabled ? (
						<span
							className={buttonVariants({
								variant: "default",
								size: "default",
								className: "pointer-events-none opacity-50",
							})}
							aria-disabled
						>
							Nova promoção
						</span>
					) : (
						<Link
							to={`/dashboard/businesses/${business.id}/promotions/new`}
							className={buttonVariants({ variant: "default", size: "default" })}
						>
							Nova promoção
						</Link>
					)}
				</div>
			</div>

			{!canUsePromotions ? (
				<FeatureUpgradeCallout
					business={business}
					status={status}
					feature="Promoções da semana"
					action="divulgar promoções"
					itemPlural="promoções"
				/>
			) : atLimit ? (
				<FeatureUpgradeCallout
					business={business}
					status={status}
					feature="Promoções da semana"
					action="divulgar promoções"
					itemPlural="promoções"
					limit={promotionLimit ?? undefined}
				/>
			) : null}

			{promotions.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">
						Você ainda não cadastrou nenhuma promoção.
					</p>
				</div>
			) : (
				<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{promotions.map((p) => {
						const dateRange = formatDateRange(p.starts_at, p.ends_at);
						return (
							<li
								key={p.id}
								className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4"
							>
								<div className="flex items-start gap-3">
									<div className="size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
										{p.cover_url ? (
											<img
												src={p.cover_url}
												alt=""
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
												•
											</div>
										)}
									</div>
									<div className="min-w-0 flex-1">
										<h2 className="truncate text-sm font-semibold">{p.title}</h2>
										{dateRange ? (
											<p className="truncate text-xs text-muted-foreground">
												{dateRange}
											</p>
										) : null}
									</div>
									{p.is_active ? null : <Badge variant="outline">Inativo</Badge>}
								</div>

								<div className="flex flex-wrap gap-1">
									{p.active_days.length === 0 ? (
										<span className="text-xs text-muted-foreground">
											Nenhum dia selecionado
										</span>
									) : (
										p.active_days.map((d) => (
											<Badge key={d} variant="secondary">
												{DAY_SHORT_LABELS[d]}
											</Badge>
										))
									)}
								</div>

								{p.description ? (
									<p className="line-clamp-2 text-xs text-muted-foreground">
										{p.description}
									</p>
								) : null}

								<div className="flex items-center gap-2">
									<Link
										to={`/dashboard/businesses/${business.id}/promotions/${p.id}`}
										className={buttonVariants({ variant: "outline", size: "sm" })}
									>
										Editar
									</Link>
									<form method="post" className="inline">
										<input type="hidden" name="intent" value="delete" />
										<input type="hidden" name="promotion_id" value={p.id} />
										<Button variant="ghost" size="sm" type="submit">
											Excluir
										</Button>
									</form>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</main>
	);
}
