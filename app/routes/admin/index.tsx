import { parseWithZod } from "@conform-to/zod";
import { Form, Link, redirect, useLoaderData, useNavigation } from "react-router";
import { PlanBadge } from "~/components/business/plan-badge";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { requireAdmin } from "~/lib/auth.server";
import {
	daysUntilExpiry,
	effectivePlanTier,
	planLabel,
} from "~/lib/plan";
import { getPublicUrl } from "~/lib/storage.server";
import {
	planUpgradeApprovalSchema,
	planUpgradeRejectionSchema,
} from "~/lib/validation/plan";
import * as adminRepo from "~/repositories/admin";
import * as planUpgradeRepo from "~/repositories/plan-upgrade-requests";
import { isError } from "~/types";
import type { Route } from "./+types/index";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — Pagamentos" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	const [upgradeResult, noPlanResult] = await Promise.all([
		planUpgradeRepo.listPending({ supabase: ctx.supabase }),
		adminRepo.listBusinessesWithoutActivePlan({ supabase: ctx.supabase }),
	]);
	if (isError(upgradeResult))
		throw new Response(upgradeResult.error, { status: 500 });
	if (isError(noPlanResult))
		throw new Response(noPlanResult.error, { status: 500 });

	return {
		requests: upgradeResult.success,
		noPlan: noPlanResult.success.map((b) => ({
			id: b.id,
			name: b.name,
			handle: b.handle,
			plan_tier: b.plan_tier,
			plan_expires_at: b.plan_expires_at,
			owner_email: b.owner?.email ?? null,
			created_at: b.created_at,
			logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
			effective_tier: effectivePlanTier({
				plan_tier: b.plan_tier,
				plan_expires_at: b.plan_expires_at,
			}),
			days_until_expiry: daysUntilExpiry(b.plan_expires_at),
		})),
	};
}

export async function action({ request }: Route.ActionArgs) {
	const ctx = await requireAdmin(request);
	const formData = await request.formData();
	const intent = formData.get("intent");

	if (intent === "approve") {
		const submission = parseWithZod(formData, {
			schema: planUpgradeApprovalSchema,
		});
		if (submission.status !== "success") {
			return Response.json(
				{ error: "Verifique os campos da aprovação", details: submission.error },
				{ status: 400 },
			);
		}
		const v = submission.value;
		const result = await planUpgradeRepo.approve({
			supabase: ctx.supabase,
			id: v.request_id,
			reviewerId: ctx.user.id,
			startsAt: v.plan_started_at,
			expiresAt: v.plan_expires_at,
			notes: v.notes,
		});
		if (isError(result)) {
			return Response.json({ error: result.error }, { status: 500 });
		}
		throw redirect("/admin", { headers: ctx.headers });
	}

	if (intent === "reject") {
		const submission = parseWithZod(formData, {
			schema: planUpgradeRejectionSchema,
		});
		if (submission.status !== "success") {
			return Response.json(
				{ error: "Informe o motivo da rejeição", details: submission.error },
				{ status: 400 },
			);
		}
		const v = submission.value;
		const result = await planUpgradeRepo.reject({
			supabase: ctx.supabase,
			id: v.request_id,
			reviewerId: ctx.user.id,
			notes: v.notes,
		});
		if (isError(result)) {
			return Response.json({ error: result.error }, { status: 500 });
		}
		throw redirect("/admin", { headers: ctx.headers });
	}

	return Response.json({ error: "Ação inválida" }, { status: 400 });
}

export default function AdminPagamentos() {
	const { requests, noPlan } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const nothingPending = requests.length === 0 && noPlan.length === 0;

	return (
		<main className="mx-auto max-w-4xl px-4 py-8">
			<div className="pb-6">
				<h1 className="text-xl font-semibold tracking-tight">Pagamentos</h1>
				<p className="text-sm text-muted-foreground">
					Solicitações de plano pendentes e negócios sem assinatura ativa.
				</p>
			</div>

			{nothingPending ? (
				<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">
						Nada pendente por aqui.
					</p>
				</div>
			) : null}

			{requests.length > 0 ? (
				<section className="pb-10">
					<h2 className="pb-3 text-base font-semibold tracking-tight">
						Solicitações pendentes
					</h2>
					<ul className="grid gap-4">
						{requests.map((r) => {
							const biz = Array.isArray(r.business)
								? r.business[0]
								: r.business;
							const currentTier = biz
								? effectivePlanTier({
										plan_tier: biz.plan_tier,
										plan_expires_at: biz.plan_expires_at,
									})
								: null;
							return (
								<li
									key={r.id}
									className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5"
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div>
											<p className="font-semibold">
												{biz?.name ?? "Negócio"}
											</p>
											<p className="text-xs text-muted-foreground">
												@{biz?.handle} · solicitado por{" "}
												{r.requester?.email ?? "—"}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<span className="text-xs text-muted-foreground">
												Atual:
											</span>
											<PlanBadge tier={currentTier} />
											<span className="text-xs text-muted-foreground">→</span>
											<Badge>
												{r.requested_plan === "ouro" ? "Ouro" : "Básico"}
											</Badge>
										</div>
									</div>

									{r.message ? (
										<p className="rounded-md bg-muted/40 px-3 py-2 text-sm">
											{r.message}
										</p>
									) : null}

									<div className="grid gap-4 lg:grid-cols-2">
										<Form method="post" className="flex flex-col gap-2">
											<input type="hidden" name="intent" value="approve" />
											<input type="hidden" name="request_id" value={r.id} />
											<Label htmlFor={`expires-${r.id}`}>
												Aprovar — expira em
											</Label>
											<Input
												id={`expires-${r.id}`}
												name="plan_expires_at"
												type="date"
												required
											/>
											<Label htmlFor={`notes-${r.id}`}>Notas (opcional)</Label>
											<Textarea
												id={`notes-${r.id}`}
												name="notes"
												rows={2}
												maxLength={500}
											/>
											<div>
												<Button type="submit" disabled={submitting}>
													Aprovar
												</Button>
											</div>
										</Form>

										<Form method="post" className="flex flex-col gap-2">
											<input type="hidden" name="intent" value="reject" />
											<input type="hidden" name="request_id" value={r.id} />
											<Label htmlFor={`reject-${r.id}`}>
												Rejeitar — motivo
											</Label>
											<Textarea
												id={`reject-${r.id}`}
												name="notes"
												rows={3}
												minLength={3}
												maxLength={500}
												required
											/>
											<div>
												<Button
													type="submit"
													variant="destructive"
													disabled={submitting}
												>
													Rejeitar
												</Button>
											</div>
										</Form>
									</div>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}

			{noPlan.length > 0 ? (
				<section>
					<h2 className="pb-3 text-base font-semibold tracking-tight">
						Sem plano ativo
					</h2>
					<p className="pb-3 text-xs text-muted-foreground">
						Negócios aprovados que ainda não pagaram ou cuja assinatura
						expirou. Atribua um plano para que voltem a aparecer no site.
					</p>
					<ul className="grid gap-3">
						{noPlan.map((b) => (
							<li
								key={b.id}
								className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center"
							>
								<div className="size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
									{b.logo_url ? (
										<img
											src={b.logo_url}
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
									<div className="flex flex-wrap items-center gap-2">
										<h3 className="truncate text-sm font-semibold">
											{b.name}
										</h3>
										<Badge variant="secondary">@{b.handle}</Badge>
										<PlanBadge tier={b.effective_tier} />
									</div>
									<p className="truncate text-xs text-muted-foreground">
										{b.owner_email ?? "?"} ·{" "}
										{b.plan_tier === null
											? "nunca teve plano"
											: b.days_until_expiry != null && b.days_until_expiry < 0
												? `expirou há ${Math.abs(b.days_until_expiry)} dia(s)`
												: `plano ${planLabel(b.plan_tier)}`}
									</p>
								</div>
								<Link
									to={`/admin/businesses/${b.id}`}
									className={buttonVariants({ variant: "default", size: "sm" })}
								>
									Atribuir plano
								</Link>
							</li>
						))}
					</ul>
				</section>
			) : null}
		</main>
	);
}
