import { parseWithZod } from "@conform-to/zod";
import type { PostHogContext } from "~/lib/posthog-middleware";
import { MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { data, Link, redirect, useLoaderData } from "react-router";
import { BusinessSuccess } from "~/components/business/business-success";
import {
	parseActiveBusinessId,
	resolveActiveBusinessId,
	serializeActiveBusinessId,
} from "~/lib/active-business.server";
import { requireUser } from "~/lib/auth.server";
import {
	daysUntilExpiry,
	effectivePlanTier,
	type PlanTier,
	renewalWhatsappHref,
	subscriptionStatus,
	supportWhatsappHref,
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

	const [businessesResult, requestsResult, cookieId] = await Promise.all([
		businessesRepo.listByUser({ supabase: ctx.supabase, userId: ctx.user.id }),
		planUpgradeRepo.listForOwner({
			supabase: ctx.supabase,
			userId: ctx.user.id,
		}),
		parseActiveBusinessId(request),
	]);
	if (isError(businessesResult))
		throw new Response(businessesResult.error, { status: 500 });

	const businessIds = businessesResult.success.map((b) => b.id);

	// A `?business=` may arrive from a dashboard card or feature callout. Consume
	// it once: persist the selection to the shared active-business cookie and
	// redirect to the clean URL, so the cookie is the single source of truth —
	// consistent with the rest of the dashboard.
	const paramBusinessId = url.searchParams.get("business");
	if (paramBusinessId && businessIds.includes(paramBusinessId)) {
		const headers = new Headers(ctx.headers);
		headers.append(
			"Set-Cookie",
			await serializeActiveBusinessId(paramBusinessId),
		);
		throw redirect("/dashboard/upgrade", { headers });
	}

	const selectedBusinessId =
		resolveActiveBusinessId({
			pathname: url.pathname,
			cookieId,
			businessIds,
		}) ?? "";

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
		status: subscriptionStatus({
			plan_tier: b.plan_tier,
			plan_started_at: b.plan_started_at,
			plan_expires_at: b.plan_expires_at,
		}),
		category_name: b.category?.name ?? undefined,
		neighborhood_name: b.neighborhood?.name ?? undefined,
	}));
	const recentRequests = isError(requestsResult) ? [] : requestsResult.success;

	// Most recent pending request per business — drives the plan shown to a
	// never-subscriber on the BusinessSuccess screen. The list is already
	// ordered by created_at desc, so the first pending row per business wins.
	const pendingPlanByBusiness: Record<string, PlanTier> = {};
	for (const r of recentRequests) {
		if (r.status === "pending" && !(r.business_id in pendingPlanByBusiness)) {
			pendingPlanByBusiness[r.business_id] = r.requested_plan;
		}
	}

	// Persist a self-healed selection (stale/empty cookie → first business) so it
	// sticks on the next navigation, mirroring the dashboard layout loader.
	let headers = ctx.headers;
	if (selectedBusinessId && selectedBusinessId !== cookieId) {
		headers = new Headers(ctx.headers);
		headers.append(
			"Set-Cookie",
			await serializeActiveBusinessId(selectedBusinessId),
		);
	}

	return data(
		{ myBusinesses, selectedBusinessId, pendingPlanByBusiness },
		{ headers },
	);
}

export async function action({ request, context }: Route.ActionArgs) {
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

	const posthog = (context as PostHogContext).posthog;
	if (posthog) {
		posthog.capture({
			distinctId: ctx.user.id,
			event: "plan_upgrade_requested",
			properties: {
				business_id: submission.value.business_id,
				requested_plan: submission.value.requested_plan,
			},
		});
	}

	throw redirect("/dashboard/upgrade?submitted=1", { headers: ctx.headers });
}

export default function DashboardUpgrade() {
	const { myBusinesses, selectedBusinessId, pendingPlanByBusiness } =
		useLoaderData<typeof loader>();

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

	// The active business comes from the shared cookie (resolved in the loader),
	// so it's always a business the owner owns. Switch business via the sidebar.
	const selected =
		myBusinesses.find((b) => b.id === selectedBusinessId) ?? myBusinesses[0];

	if (selected.status === "never") {
		const requestedPlan = pendingPlanByBusiness[selected.id] ?? "ouro";
		return (
			<main className="mx-auto max-w-3xl px-4 py-8">
				<BusinessSuccess
					name={selected.name}
					categoryName={selected.category_name}
					neighborhoodName={selected.neighborhood_name}
					requestedPlan={requestedPlan}
					editHref={`/dashboard/businesses/${selected.id}`}
					title="Ative seu negócio"
					subtitle="Seu negócio ainda não está ativo. Envie uma mensagem no WhatsApp para concluir o pagamento e aparecer no João Tem."
				/>
			</main>
		);
	}

	// Plan is active and fine — no form, just confirmation + a support contact.
	if (selected.status === "active") {
		const expiryNote =
			selected.days_until_expiry != null
				? ` Seu plano expira em ${selected.days_until_expiry} dia(s).`
				: "";
		return (
			<main className="mx-auto max-w-3xl px-4 py-8">
				<BusinessSuccess
					name={selected.name}
					categoryName={selected.category_name}
					neighborhoodName={selected.neighborhood_name}
					requestedPlan={selected.effective_tier ?? "ouro"}
					editHref={`/dashboard/businesses/${selected.id}`}
					title="Seu plano está ativo"
					subtitle={`Está tudo certo com o seu plano.${expiryNote} Se tiver qualquer dúvida, fale com o nosso suporte pelo WhatsApp.`}
					headerIcon={ShieldCheck}
					badgeLabel="Ativo"
					badgeTone="active"
					planCardLabel="Plano atual:"
					steps={[]}
					primaryLabel="Falar com o suporte"
					primaryHref={supportWhatsappHref(selected.name)}
					primaryIcon={MessageCircle}
					secondaryLabel="Editar negócio"
				/>
			</main>
		);
	}

	// Expired → renew directly through WhatsApp, same callout pattern as the
	// activation (never) and support (active) states.
	const renewPlan = selected.plan_tier ?? "ouro";
	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<BusinessSuccess
				name={selected.name}
				categoryName={selected.category_name}
				neighborhoodName={selected.neighborhood_name}
				requestedPlan={renewPlan}
				editHref={`/dashboard/businesses/${selected.id}`}
				title="Renove seu plano"
				subtitle="Seu plano expirou e seu negócio está oculto do site. Renove pelo WhatsApp para voltar a aparecer nas buscas."
				headerIcon={RefreshCw}
				badgeLabel="Plano expirado"
				badgeTone="expired"
				planCardLabel="Plano para renovar:"
				stepsTitle="Ao renovar:"
				primaryLabel="Renovar pelo WhatsApp"
				primaryHref={renewalWhatsappHref(selected.name, renewPlan)}
				primaryIcon={MessageCircle}
				secondaryLabel="Editar negócio"
			/>
		</main>
	);
}
