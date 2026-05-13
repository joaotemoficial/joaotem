import { parseWithZod } from "@conform-to/zod";
import { Form, Link, redirect, useLoaderData, useNavigation } from "react-router";
import { PlanBadge } from "~/components/business/plan-badge";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { requireUser } from "~/lib/auth.server";
import {
	daysUntilExpiry,
	effectivePlanTier,
	planLabel,
} from "~/lib/plan";
import { planUpgradeRequestSchema } from "~/lib/validation/plan";
import * as businessesRepo from "~/repositories/businesses";
import * as planUpgradeRepo from "~/repositories/plan-upgrade-requests";
import { isError } from "~/types";
import type { Route } from "./+types/upgrade";

export const meta: Route.MetaFunction = () => [
	{ title: "Solicitar plano — JoaoTem" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireUser(request);
	const url = new URL(request.url);
	const selectedBusinessId = url.searchParams.get("business") ?? "";

	const [businessesResult, requestsResult] = await Promise.all([
		businessesRepo.listByUser({ supabase: ctx.supabase, userId: ctx.user.id }),
		planUpgradeRepo.listForOwner({
			supabase: ctx.supabase,
			userId: ctx.user.id,
		}),
	]);
	if (isError(businessesResult))
		throw new Response(businessesResult.error, { status: 500 });
	const myBusinesses = businessesResult.success.map((b) => ({
		id: b.id,
		name: b.name,
		handle: b.handle,
		plan_tier: b.plan_tier,
		plan_expires_at: b.plan_expires_at,
		effective_tier: effectivePlanTier({
			plan_tier: b.plan_tier,
			plan_expires_at: b.plan_expires_at,
		}),
		days_until_expiry: daysUntilExpiry(b.plan_expires_at),
	}));
	const recentRequests = isError(requestsResult) ? [] : requestsResult.success;

	return { myBusinesses, recentRequests, selectedBusinessId };
}

export async function action({ request }: Route.ActionArgs) {
	const ctx = await requireUser(request);
	const formData = await request.formData();

	const intent = formData.get("intent");
	if (intent === "cancel") {
		const requestId = String(formData.get("request_id") ?? "");
		if (!requestId) {
			return Response.json({ error: "ID inválido" }, { status: 400 });
		}
		const result = await planUpgradeRepo.cancelOwn({
			supabase: ctx.supabase,
			id: requestId,
			userId: ctx.user.id,
		});
		if (isError(result)) {
			return Response.json({ error: result.error }, { status: 500 });
		}
		throw redirect("/dashboard/upgrade", { headers: ctx.headers });
	}

	const submission = parseWithZod(formData, { schema: planUpgradeRequestSchema });
	if (submission.status !== "success") {
		return { submission: submission.reply() };
	}

	const existing = await planUpgradeRepo.hasPendingForBusiness({
		supabase: ctx.supabase,
		businessId: submission.value.business_id,
	});
	if (!isError(existing) && existing.success) {
		return {
			submission: submission.reply({
				formErrors: [
					"Já existe uma solicitação pendente para este negócio. Aguarde a análise.",
				],
			}),
		};
	}

	const result = await planUpgradeRepo.create({
		supabase: ctx.supabase,
		values: {
			business_id: submission.value.business_id,
			requested_by: ctx.user.id,
			requested_plan: submission.value.requested_plan,
			message: submission.value.message,
		},
	});
	if (isError(result)) {
		return {
			submission: submission.reply({ formErrors: [result.error] }),
		};
	}

	throw redirect("/dashboard/upgrade?submitted=1", { headers: ctx.headers });
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
	pending: "Pendente",
	approved: "Aprovada",
	rejected: "Rejeitada",
	canceled: "Cancelada",
};

export default function DashboardUpgrade({
	actionData,
}: Route.ComponentProps) {
	const { myBusinesses, recentRequests, selectedBusinessId } =
		useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";
	const formErrors =
		actionData && "submission" in actionData
			? (actionData.submission as { error?: Record<string, string[]> } | null)
					?.error ?? {}
			: {};
	const justSubmitted =
		typeof window !== "undefined" &&
		window.location.search.includes("submitted=1");

	if (myBusinesses.length === 0) {
		return (
			<main className="mx-auto max-w-3xl px-4 py-8">
				<h1 className="text-xl font-semibold tracking-tight">
					Solicitar plano
				</h1>
				<div className="mt-6 rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">
						Você ainda não tem negócios cadastrados.
					</p>
					<Link
						to="/dashboard/businesses/new"
						className="mt-3 inline-block text-sm underline-offset-4 hover:underline"
					>
						Cadastrar um negócio →
					</Link>
				</div>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<div className="pb-6">
				<h1 className="text-xl font-semibold tracking-tight">
					Solicitar / renovar plano
				</h1>
				<p className="text-sm text-muted-foreground">
					Envie uma solicitação. Um administrador vai entrar em contato pelo
					WhatsApp para finalizar o pagamento e ativar/renovar seu plano.
				</p>
			</div>

			{justSubmitted ? (
				<div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
					Solicitação enviada. Aguarde o contato do administrador.
				</div>
			) : null}

			<Form method="post" className="flex flex-col gap-4">
				<label className="flex flex-col gap-1.5 text-sm">
					<Label htmlFor="business-select">Negócio *</Label>
					<select
						id="business-select"
						name="business_id"
						defaultValue={selectedBusinessId}
						required
						className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<option value="" disabled>
							Selecione um negócio
						</option>
						{myBusinesses.map((b) => (
							<option key={b.id} value={b.id}>
								{b.name} ({planLabel(b.effective_tier)})
							</option>
						))}
					</select>
					{formErrors.business_id?.[0] ? (
						<span className="text-xs text-destructive">
							{formErrors.business_id[0]}
						</span>
					) : null}
				</label>

				<label className="flex flex-col gap-1.5 text-sm">
					<Label htmlFor="plan-select">Plano desejado *</Label>
					<select
						id="plan-select"
						name="requested_plan"
						defaultValue="ouro"
						required
						className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<option value="ouro">Ouro — destaque + produtos + promoções</option>
						<option value="basico">Básico — listagem em buscas</option>
					</select>
					{formErrors.requested_plan?.[0] ? (
						<span className="text-xs text-destructive">
							{formErrors.requested_plan[0]}
						</span>
					) : null}
				</label>

				<label className="flex flex-col gap-1.5 text-sm">
					<Label htmlFor="message">Mensagem (opcional)</Label>
					<Textarea
						id="message"
						name="message"
						rows={3}
						maxLength={500}
						placeholder="Algum detalhe sobre o pedido…"
					/>
					{formErrors.message?.[0] ? (
						<span className="text-xs text-destructive">
							{formErrors.message[0]}
						</span>
					) : null}
				</label>

				{formErrors[""]?.[0] ? (
					<p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{formErrors[""][0]}
					</p>
				) : null}

				<div>
					<Button type="submit" disabled={submitting}>
						{submitting ? "Enviando…" : "Enviar solicitação"}
					</Button>
				</div>
			</Form>

			{recentRequests.length > 0 ? (
				<section className="mt-10">
					<h2 className="pb-3 text-base font-semibold tracking-tight">
						Suas solicitações
					</h2>
					<ul className="flex flex-col gap-3">
						{recentRequests.map((r) => (
							<li
								key={r.id}
								className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 text-sm"
							>
								<div>
									<div className="flex items-center gap-2">
										<PlanBadge tier={r.requested_plan} />
										<span className="text-xs text-muted-foreground">
											{new Date(r.created_at).toLocaleString("pt-BR")}
										</span>
									</div>
									{r.message ? (
										<p className="mt-1 text-xs text-muted-foreground">
											{r.message}
										</p>
									) : null}
									{r.review_notes ? (
										<p className="mt-1 rounded-md bg-muted px-2 py-1 text-xs">
											Resposta: {r.review_notes}
										</p>
									) : null}
								</div>
								<div className="flex items-center gap-2">
									<span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
										{REQUEST_STATUS_LABELS[r.status] ?? r.status}
									</span>
									{r.status === "pending" ? (
										<Form method="post">
											<input type="hidden" name="intent" value="cancel" />
											<input type="hidden" name="request_id" value={r.id} />
											<Button
												type="submit"
												variant="ghost"
												size="sm"
												disabled={submitting}
											>
												Cancelar
											</Button>
										</Form>
									) : null}
								</div>
							</li>
						))}
					</ul>
				</section>
			) : null}
		</main>
	);
}
