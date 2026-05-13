import { parseWithZod } from "@conform-to/zod";
import {
	Form,
	Link,
	redirect,
	useLoaderData,
	useNavigation,
} from "react-router";
import { PlanFormFields } from "~/components/admin/plan-form";
import { PlanBadge } from "~/components/business/plan-badge";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { requireAdmin } from "~/lib/auth.server";
import { BUSINESS_STATUS_LABELS } from "~/lib/constants";
import {
	daysUntilExpiry,
	effectivePlanTier,
	planLabel,
} from "~/lib/plan";
import { getPublicUrl } from "~/lib/storage.server";
import { planUpdateSchema } from "~/lib/validation/plan";
import * as adminRepo from "~/repositories/admin";
import * as businessesRepo from "~/repositories/businesses";
import { isError } from "~/types";
import type { Route } from "./+types/business-detail";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — Negócio" },
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	pending: "secondary",
	approved: "default",
	rejected: "destructive",
	suspended: "outline",
};

export async function loader({ params, request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	const result = await adminRepo.getBusinessById({
		supabase: ctx.supabase,
		id: params.id,
	});
	if (isError(result)) throw new Response(result.error, { status: 500 });
	if (!result.success) throw new Response("Não encontrado", { status: 404 });
	const b = result.success;
	return {
		business: {
			...b,
			logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
			cover_url: getPublicUrl(ctx.supabase, "business-covers", b.cover_path),
		},
		effectiveTier: effectivePlanTier({
			plan_tier: b.plan_tier,
			plan_expires_at: b.plan_expires_at,
		}),
		daysUntilExpiry: daysUntilExpiry(b.plan_expires_at),
	};
}

export async function action({ params, request }: Route.ActionArgs) {
	const ctx = await requireAdmin(request);
	const formData = await request.formData();
	const intent = formData.get("intent");
	const reason = formData.get("reason");

	let result;
	switch (intent) {
		case "update-plan": {
			const submission = parseWithZod(formData, { schema: planUpdateSchema });
			if (submission.status !== "success") {
				return Response.json(
					{ planError: submission.error },
					{ status: 400 },
				);
			}
			const v = submission.value;
			result = await businessesRepo.updateBusinessPlan({
				supabase: ctx.supabase,
				id: params.id,
				planTier: v.plan_tier,
				startedAt:
					v.plan_started_at ??
					(v.plan_tier !== null ? new Date().toISOString() : null),
				expiresAt: v.plan_expires_at,
				notes: v.plan_notes,
			});
			break;
		}
		case "approve":
			result = await adminRepo.approveBusiness({
				supabase: ctx.supabase,
				id: params.id,
				reviewerId: ctx.user.id,
			});
			break;
		case "reject":
			if (typeof reason !== "string" || reason.trim().length < 3) {
				return Response.json(
					{ error: "Informe o motivo da rejeição (mín. 3 caracteres)" },
					{ status: 400 },
				);
			}
			result = await adminRepo.rejectBusiness({
				supabase: ctx.supabase,
				id: params.id,
				reviewerId: ctx.user.id,
				reason: reason.trim(),
			});
			break;
		case "suspend":
			if (typeof reason !== "string" || reason.trim().length < 3) {
				return Response.json(
					{ error: "Informe o motivo da suspensão (mín. 3 caracteres)" },
					{ status: 400 },
				);
			}
			result = await adminRepo.suspendBusiness({
				supabase: ctx.supabase,
				id: params.id,
				reviewerId: ctx.user.id,
				reason: reason.trim(),
			});
			break;
		case "reinstate":
			result = await adminRepo.reinstateBusiness({
				supabase: ctx.supabase,
				id: params.id,
				reviewerId: ctx.user.id,
			});
			break;
		case "reopen":
			result = await adminRepo.reopenBusiness({
				supabase: ctx.supabase,
				id: params.id,
				reviewerId: ctx.user.id,
			});
			break;
		default:
			return Response.json({ error: "Ação inválida" }, { status: 400 });
	}

	if (isError(result)) {
		return Response.json({ error: result.error }, { status: 500 });
	}

	throw redirect(`/admin/businesses/${params.id}`, { headers: ctx.headers });
}

export default function AdminBusinessDetail() {
	const { business, effectiveTier, daysUntilExpiry } =
		useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const expiryLabel =
		daysUntilExpiry == null
			? "—"
			: daysUntilExpiry < 0
				? `Expirou há ${Math.abs(daysUntilExpiry)} dia(s)`
				: `Em ${daysUntilExpiry} dia(s)`;

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<div className="flex items-center gap-2 pb-4">
				<Link
					to="/admin/businesses"
					className={buttonVariants({ variant: "ghost", size: "sm" })}
				>
					← Voltar
				</Link>
			</div>

			{business.cover_url ? (
				<div className="overflow-hidden rounded-2xl border border-border/70">
					<img
						src={business.cover_url}
						alt=""
						className="aspect-[16/6] w-full object-cover"
					/>
				</div>
			) : null}

			<div className="mt-4 flex items-start gap-3">
				<div className="-mt-10 size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-background bg-muted shadow">
					{business.logo_url ? (
						<img
							src={business.logo_url}
							alt=""
							className="h-full w-full object-cover"
						/>
					) : null}
				</div>
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-semibold tracking-tight">
							{business.name}
						</h1>
						<Badge variant={STATUS_VARIANT[business.status] ?? "secondary"}>
							{BUSINESS_STATUS_LABELS[business.status]}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">@{business.handle}</p>
				</div>
			</div>

			<dl className="mt-6 grid gap-3 rounded-2xl border border-border/70 bg-card p-5 sm:grid-cols-2 text-sm">
				<Item label="Proprietário">
					{business.owner?.email ?? "—"}
				</Item>
				<Item label="WhatsApp">{business.whatsapp}</Item>
				<Item label="Instagram">{business.instagram ?? "—"}</Item>
				<Item label="Categoria">{business.category?.name ?? "—"}</Item>
				<Item label="Cidade">
					{business.city?.name} - {business.city?.state}
				</Item>
				<Item label="Bairro">{business.neighborhood?.name ?? "—"}</Item>
				<Item label="Entrega">
					{business.offers_delivery ? "Sim" : "Não"}
				</Item>
				<Item label="Criado em">
					{new Date(business.created_at).toLocaleString("pt-BR")}
				</Item>
				{business.short_description ? (
					<div className="sm:col-span-2">
						<dt className="text-xs uppercase tracking-wide text-muted-foreground">
							Descrição
						</dt>
						<dd className="mt-1">{business.short_description}</dd>
					</div>
				) : null}
				{business.rejection_reason ? (
					<div className="sm:col-span-2">
						<dt className="text-xs uppercase tracking-wide text-muted-foreground">
							Motivo
						</dt>
						<dd className="mt-1 rounded-md bg-destructive/10 px-2.5 py-1.5 text-destructive">
							{business.rejection_reason}
						</dd>
					</div>
				) : null}
			</dl>

			<section className="mt-6 rounded-2xl border border-border/70 bg-card p-5">
				<div className="flex flex-wrap items-center justify-between gap-3 pb-3">
					<div className="flex items-center gap-2">
						<h2 className="text-base font-semibold">Plano</h2>
						<PlanBadge tier={effectiveTier} />
						<span className="text-xs text-muted-foreground">
							{planLabel(business.plan_tier)}
						</span>
					</div>
					<span className="text-xs text-muted-foreground">
						Expira: {expiryLabel}
					</span>
				</div>
				<Form method="post" className="flex flex-col gap-3">
					<input type="hidden" name="intent" value="update-plan" />
					<PlanFormFields
						allowNullTier
						defaults={{
							plan_tier: business.plan_tier,
							plan_started_at: business.plan_started_at,
							plan_expires_at: business.plan_expires_at,
							plan_notes: business.plan_notes,
						}}
						idPrefix="edit-plan"
					/>
					<div>
						<Button type="submit" disabled={submitting} className="self-start">
							Salvar plano
						</Button>
					</div>
				</Form>
			</section>

			<section className="mt-6 rounded-2xl border border-border/70 bg-card p-5">
				<h2 className="pb-3 text-base font-semibold">Ações</h2>

				{business.status === "pending" ? (
					<div className="flex flex-col gap-3">
						<Form method="post">
							<input type="hidden" name="intent" value="approve" />
							<Button type="submit" disabled={submitting}>
								Aprovar
							</Button>
						</Form>
						<Form method="post" className="flex flex-col gap-2">
							<input type="hidden" name="intent" value="reject" />
							<Label htmlFor="reject-reason">Motivo da rejeição</Label>
							<Textarea id="reject-reason" name="reason" rows={3} required />
							<Button
								type="submit"
								variant="destructive"
								disabled={submitting}
								className="self-start"
							>
								Rejeitar
							</Button>
						</Form>
					</div>
				) : null}

				{business.status === "approved" ? (
					<Form method="post" className="flex flex-col gap-2">
						<input type="hidden" name="intent" value="suspend" />
						<Label htmlFor="suspend-reason">Motivo da suspensão</Label>
						<Textarea id="suspend-reason" name="reason" rows={3} required />
						<Button
							type="submit"
							variant="destructive"
							disabled={submitting}
							className="self-start"
						>
							Suspender
						</Button>
					</Form>
				) : null}

				{business.status === "suspended" ? (
					<Form method="post">
						<input type="hidden" name="intent" value="reinstate" />
						<Button type="submit" disabled={submitting}>
							Reativar
						</Button>
					</Form>
				) : null}

				{business.status === "rejected" ? (
					<Form method="post">
						<input type="hidden" name="intent" value="reopen" />
						<Button type="submit" variant="outline" disabled={submitting}>
							Reabrir para análise
						</Button>
					</Form>
				) : null}
			</section>
		</main>
	);
}

function Item({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<dt className="text-xs uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="mt-0.5">{children}</dd>
		</div>
	);
}
