import { parseWithZod } from "@conform-to/zod";
import { Form, redirect, useLoaderData, useNavigation } from "react-router";
import { PlanBadge } from "~/components/business/plan-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { requireAdmin } from "~/lib/auth.server";
import { effectivePlanTier } from "~/lib/plan";
import {
	planUpgradeApprovalSchema,
	planUpgradeRejectionSchema,
} from "~/lib/validation/plan";
import * as planUpgradeRepo from "~/repositories/plan-upgrade-requests";
import { isError } from "~/types";
import type { Route } from "./+types/upgrade-requests";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — Solicitações de plano" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	const result = await planUpgradeRepo.listPending({ supabase: ctx.supabase });
	if (isError(result)) throw new Response(result.error, { status: 500 });
	return { requests: result.success };
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
		throw redirect("/admin/upgrade-requests", { headers: ctx.headers });
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
		throw redirect("/admin/upgrade-requests", { headers: ctx.headers });
	}

	return Response.json({ error: "Ação inválida" }, { status: 400 });
}

export default function AdminUpgradeRequests() {
	const { requests } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	return (
		<main className="mx-auto max-w-4xl px-4 py-8">
			<div className="pb-4">
				<h1 className="text-xl font-semibold tracking-tight">
					Solicitações de plano
				</h1>
				<p className="text-sm text-muted-foreground">
					Aprove ou rejeite pedidos de upgrade/renovação. A aprovação atualiza
					o plano e a data de expiração do negócio automaticamente.
				</p>
			</div>

			{requests.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">
						Nenhuma solicitação pendente.
					</p>
				</div>
			) : (
				<ul className="grid gap-4">
					{requests.map((r) => {
						const biz = Array.isArray(r.business) ? r.business[0] : r.business;
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
										<p className="font-semibold">{biz?.name ?? "Negócio"}</p>
										<p className="text-xs text-muted-foreground">
											@{biz?.handle} · solicitado por{" "}
											{r.requester?.email ?? "—"}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-xs text-muted-foreground">Atual:</span>
										<PlanBadge tier={currentTier} />
										<span className="text-xs text-muted-foreground">→</span>
										<Badge>{r.requested_plan === "ouro" ? "Ouro" : "Básico"}</Badge>
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
										<Label htmlFor={`expires-${r.id}`}>Aprovar — expira em</Label>
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
										<Label htmlFor={`reject-${r.id}`}>Rejeitar — motivo</Label>
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
			)}
		</main>
	);
}
