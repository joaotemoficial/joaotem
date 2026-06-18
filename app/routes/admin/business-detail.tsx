import { parseWithZod } from "@conform-to/zod";
import {
	data,
	Form,
	Link,
	redirect,
	useActionData,
	useLoaderData,
	useNavigation,
} from "react-router";
import { FeatureOverridesFields } from "~/components/admin/feature-overrides-fields";
import { PlanFormFields } from "~/components/admin/plan-form";
import { PlanBadge } from "~/components/business/plan-badge";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { requireAdmin } from "~/lib/auth.server";
import {
	ACCEPTED_IMAGE_TYPES,
	BUSINESS_STATUS_LABELS,
	MAX_IMAGE_BYTES,
} from "~/lib/constants";
import {
	daysUntilExpiry,
	effectivePlanTier,
	planLabel,
} from "~/lib/plan";
import {
	getPublicUrl,
	uploadBusinessImage,
	type BusinessImageBucket,
} from "~/lib/storage.server";
import { planUpdateSchema } from "~/lib/validation/plan";
import * as adminRepo from "~/repositories/admin";
import * as businessesRepo from "~/repositories/businesses";
import * as featureFlagsRepo from "~/repositories/feature-flags";
import { type Either, isError } from "~/types";
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

	const effectiveTier = effectivePlanTier({
		plan_tier: b.plan_tier,
		plan_expires_at: b.plan_expires_at,
	});

	const flagsRes = await featureFlagsRepo.listAll({ supabase: ctx.supabase });
	if (isError(flagsRes)) throw new Response(flagsRes.error, { status: 500 });
	const overridesRes = await featureFlagsRepo.listOverridesForBusiness({
		supabase: ctx.supabase,
		businessId: params.id,
	});
	if (isError(overridesRes))
		throw new Response(overridesRes.error, { status: 500 });

	const overrideByKey = new Map(
		overridesRes.success.map((o) => [o.feature_key, o]),
	);
	// Only promotions and vitrine (showcase) items are meaningful to override
	// per-business; the remaining flags are not surfaced here.
	const OVERRIDABLE_KEYS = ["promocoes_semana", "vitrine_produtos"];
	const featureRows = flagsRes.success
		.filter((f) => OVERRIDABLE_KEYS.includes(f.key))
		.map((f) => {
			const ov = overrideByKey.get(f.key) ?? null;
			const planEnabled =
				effectiveTier === "ouro"
					? f.ouro_enabled
					: effectiveTier === "basico"
						? f.basico_enabled
						: false;
			const planLimit =
				effectiveTier === "ouro"
					? f.ouro_limit
					: effectiveTier === "basico"
						? f.basico_limit
						: null;
			return {
				key: f.key,
				label: f.label,
				flag_type: f.flag_type as "numeric" | "boolean",
				globallyEnabled: f.enabled,
				planEnabled,
				planLimit,
				effEnabled: !f.enabled ? false : (ov?.enabled ?? planEnabled),
				effLimit: !f.enabled ? 0 : (ov?.limit_override ?? planLimit),
				override: ov
					? {
							enabled: ov.enabled,
							limit_override: ov.limit_override,
							notes: ov.notes,
						}
					: null,
			};
		});

	return {
		business: {
			...b,
			logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
			cover_url: getPublicUrl(ctx.supabase, "business-covers", b.cover_path),
		},
		effectiveTier,
		daysUntilExpiry: daysUntilExpiry(b.plan_expires_at),
		featureRows,
	};
}

export async function action({ params, request }: Route.ActionArgs) {
	const ctx = await requireAdmin(request);
	const formData = await request.formData();
	const intent = formData.get("intent");
	const reason = formData.get("reason");

	let result: Either<string, unknown>;
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
		case "update-feature-overrides": {
			const keys = formData.getAll("key").map(String);
			const errors: string[] = [];
			for (const key of keys) {
				const enabledRaw = String(formData.get(`enabled_${key}`) ?? "");
				const enabled =
					enabledRaw === "on" ? true : enabledRaw === "off" ? false : null;

				const limitRaw = String(formData.get(`limit_${key}`) ?? "").trim();
				let limitOverride: number | null = null;
				if (limitRaw !== "") {
					const n = Number.parseInt(limitRaw, 10);
					if (Number.isNaN(n) || n < 0) {
						errors.push(`Limite inválido para "${key}"`);
						continue;
					}
					limitOverride = n;
				}

				const notesRaw = String(formData.get(`notes_${key}`) ?? "").trim();
				const notes = notesRaw === "" ? null : notesRaw.slice(0, 500);

				// Fully-inherit → remove the row; else upsert.
				if (enabled === null && limitOverride === null && notes === null) {
					const r = await featureFlagsRepo.deleteOverride({
						supabase: ctx.supabase,
						businessId: params.id,
						featureKey: key,
					});
					if (isError(r)) errors.push(r.error);
				} else {
					const r = await featureFlagsRepo.upsertOverride({
						supabase: ctx.supabase,
						row: {
							business_id: params.id,
							feature_key: key,
							enabled,
							limit_override: limitOverride,
							notes,
						},
					});
					if (isError(r)) errors.push(r.error);
				}
			}
			if (errors.length > 0) {
				return data({ featureErrors: errors }, { status: 400 });
			}
			throw redirect(`/admin/businesses/${params.id}`, { headers: ctx.headers });
		}
		case "update-images": {
			const businessRes = await adminRepo.getBusinessById({
				supabase: ctx.supabase,
				id: params.id,
			});
			if (isError(businessRes)) {
				return Response.json({ imageError: businessRes.error }, { status: 500 });
			}
			if (!businessRes.success) {
				return Response.json(
					{ imageError: "Negócio não encontrado" },
					{ status: 404 },
				);
			}
			const ownerId = businessRes.success.user_id;

			const validateImage = (file: File) => {
				if (file.size > MAX_IMAGE_BYTES) {
					return `Imagem deve ter no máximo ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`;
				}
				if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
					return "Formato de imagem não suportado";
				}
				return null;
			};

			const uploads: Array<{ field: string; bucket: BusinessImageBucket }> = [
				{ field: "logo", bucket: "business-logos" },
				{ field: "cover", bucket: "business-covers" },
			];
			const patch: { logo_path?: string; cover_path?: string } = {};
			for (const { field, bucket } of uploads) {
				const file = formData.get(field);
				if (!(file instanceof File) || file.size === 0) continue;
				const invalid = validateImage(file);
				if (invalid) {
					return Response.json({ imageError: invalid }, { status: 400 });
				}
				const upload = await uploadBusinessImage({
					supabase: ctx.supabase,
					bucket,
					userId: ownerId,
					businessId: params.id,
					file,
				});
				if (isError(upload)) {
					return Response.json({ imageError: upload.error }, { status: 500 });
				}
				if (field === "logo") patch.logo_path = upload.success.path;
				else patch.cover_path = upload.success.path;
			}

			if (Object.keys(patch).length === 0) {
				return Response.json(
					{ imageError: "Selecione ao menos uma imagem" },
					{ status: 400 },
				);
			}
			result = await businessesRepo.adminUpdate({
				supabase: ctx.supabase,
				id: params.id,
				values: patch,
			});
			break;
		}
		default:
			return Response.json({ error: "Ação inválida" }, { status: 400 });
	}

	if (isError(result)) {
		return Response.json({ error: result.error }, { status: 500 });
	}

	throw redirect(`/admin/businesses/${params.id}`, { headers: ctx.headers });
}

export default function AdminBusinessDetail() {
	const { business, effectiveTier, daysUntilExpiry, featureRows } =
		useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";
	const featureErrors =
		actionData && "featureErrors" in actionData
			? actionData.featureErrors
			: undefined;
	const imageError =
		actionData && "imageError" in actionData
			? String(actionData.imageError)
			: undefined;

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
				<div className="pb-3">
					<h2 className="text-base font-semibold">Imagens</h2>
					<p className="text-sm text-muted-foreground">
						Atualize o logo e a capa do negócio. Envie apenas o que quiser
						trocar.
					</p>
				</div>
				<Form
					method="post"
					encType="multipart/form-data"
					className="flex flex-col gap-4"
				>
					<input type="hidden" name="intent" value="update-images" />
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="logo-file">Logo</Label>
							<div className="flex items-center gap-3">
								<div className="size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
									{business.logo_url ? (
										<img
											src={business.logo_url}
											alt=""
											className="h-full w-full object-cover"
										/>
									) : null}
								</div>
								<input
									id="logo-file"
									type="file"
									name="logo"
									accept={ACCEPTED_IMAGE_TYPES.join(",")}
									className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
								/>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="cover-file">Capa</Label>
							<div className="flex flex-col gap-2">
								<div className="aspect-16/6 w-full overflow-hidden rounded-xl border border-border bg-muted">
									{business.cover_url ? (
										<img
											src={business.cover_url}
											alt=""
											className="h-full w-full object-cover"
										/>
									) : null}
								</div>
								<input
									id="cover-file"
									type="file"
									name="cover"
									accept={ACCEPTED_IMAGE_TYPES.join(",")}
									className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
								/>
							</div>
						</div>
					</div>
					{imageError ? (
						<p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{imageError}
						</p>
					) : null}
					<div>
						<Button type="submit" disabled={submitting} className="self-start">
							Salvar imagens
						</Button>
					</div>
				</Form>
			</section>

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
				<div className="pb-3">
					<h2 className="text-base font-semibold">Recursos (overrides)</h2>
					<p className="text-sm text-muted-foreground">
						"Herdar" usa o padrão do plano. Recursos desativados globalmente
						ficam off independentemente do override.
					</p>
				</div>
				<Form method="post" className="flex flex-col gap-3">
					<input
						type="hidden"
						name="intent"
						value="update-feature-overrides"
					/>
					<FeatureOverridesFields rows={featureRows} errors={featureErrors} />
					<div>
						<Button type="submit" disabled={submitting} className="self-start">
							Salvar recursos
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
