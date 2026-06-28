import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
} from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
	Form,
	Link,
	redirect,
	useLoaderData,
	useNavigation,
} from "react-router";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { requireUser } from "~/lib/auth.server";
import { DAY_LABELS } from "~/lib/constants";
import {
	featureLimit,
	hasFeature,
	resolveFlagsForBusiness,
} from "~/lib/feature-flags.server";
import { effectivePlanTier } from "~/lib/plan";
import {
	daysToMask,
	promotionFormSchema,
} from "~/lib/validation/business";
import type { PostHogContext } from "~/lib/posthog-middleware";
import * as businessesRepo from "~/repositories/businesses";
import * as promotionsRepo from "~/repositories/promotions";
import { isError } from "~/types";
import type { Route } from "./+types/promotion-new";

export const meta: Route.MetaFunction = () => [
	{ title: "Nova promoção — JoaoTem" },
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
	return { business: { id: business.id, name: business.name } };
}

export async function action({ params, request, context }: Route.ActionArgs) {
	const ctx = await requireUser(request);
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema: promotionFormSchema });
	if (submission.status !== "success") return submission.reply();

	const businessResult = await businessesRepo.getByIdForOwner({
		supabase: ctx.supabase,
		id: params.id,
		userId: ctx.user.id,
	});
	if (isError(businessResult) || !businessResult.success) {
		return submission.reply({ formErrors: ["Negócio não encontrado"] });
	}
	const business = businessResult.success;

	// Defense in depth: enforce the per-plan quota server-side as well.
	const effTier = effectivePlanTier({
		plan_tier: business.plan_tier,
		plan_expires_at: business.plan_expires_at,
	});
	const flags = await resolveFlagsForBusiness({
		supabase: ctx.supabase,
		businessId: business.id,
		planTier: effTier,
	});
	if (!hasFeature(flags, "promocoes_semana")) {
		return submission.reply({
			formErrors: [
				"Seu plano atual não permite cadastrar promoções. Faça upgrade para Ouro.",
			],
		});
	}
	const limit = featureLimit(flags, "promocoes_semana");
	if (limit !== null) {
		const countResult = await promotionsRepo.countByBusiness({
			supabase: ctx.supabase,
			businessId: business.id,
		});
		const current = !isError(countResult) ? countResult.success : 0;
		if (current >= limit) {
			return submission.reply({
				formErrors: [
					`Você atingiu o limite de ${limit} promoções no seu plano.`,
				],
			});
		}
	}

	const created = await promotionsRepo.create({
		supabase: ctx.supabase,
		values: {
			business_id: business.id,
			title: submission.value.title,
			description: submission.value.description?.trim() || null,
			schedule_note: submission.value.schedule_note?.trim() || null,
			recurrence_days: daysToMask(submission.value.days),
			starts_at: submission.value.starts_at,
			ends_at: submission.value.ends_at,
			sort_order: submission.value.sort_order ?? 0,
			is_active: submission.value.is_active,
		},
	});
	if (isError(created)) {
		return submission.reply({ formErrors: [created.error] });
	}

	const posthog = (context as PostHogContext).posthog;
	if (posthog) {
		posthog.capture({
			distinctId: ctx.user.id,
			event: "promotion_created",
			properties: {
				business_id: business.id,
				promotion_id: created.success.id,
				promotion_title: submission.value.title,
				plan_tier: effTier,
			},
		});
	}

	throw redirect(
		`/dashboard/businesses/${params.id}/promotions/${created.success.id}`,
		{ headers: ctx.headers },
	);
}

export default function PromotionNew({ actionData }: Route.ComponentProps) {
	const { business } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const [form, fields] = useForm({
		lastResult: actionData,
		shouldRevalidate: "onBlur",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: promotionFormSchema });
		},
	});

	return (
		<main className="mx-auto max-w-2xl px-4 py-8">
			<div className="flex items-center justify-between gap-2 pb-6">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">
						Nova promoção
					</h1>
					<p className="text-sm text-muted-foreground">
						{business.name} — selecione os dias em que a promoção deve aparecer.
					</p>
				</div>
				<Link
					to={`/dashboard/businesses/${business.id}/promotions`}
					className={buttonVariants({ variant: "ghost", size: "sm" })}
				>
					Voltar
				</Link>
			</div>

			<Form
				method="post"
				{...getFormProps(form)}
				className="flex flex-col gap-4"
			>
				<Field label="Título *" error={fields.title.errors?.[0]}>
					<Input
						{...getInputProps(fields.title, { type: "text" })}
						placeholder="ex: Pizza em dobro"
					/>
				</Field>

				<Field label="Descrição" error={fields.description.errors?.[0]}>
					<Textarea
						{...getTextareaProps(fields.description)}
						rows={4}
						placeholder="Detalhes da promoção"
					/>
				</Field>

				<Field
					label="Observação de horário (opcional)"
					error={fields.schedule_note.errors?.[0]}
					hint="Ex: 'das 18h às 22h'. Use para detalhes que os dias da semana não capturam."
				>
					<Input
						{...getInputProps(fields.schedule_note, { type: "text" })}
						placeholder="ex: das 18h às 22h"
					/>
				</Field>

				<fieldset className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-4">
					<legend className="px-1 text-sm font-medium">Dias da semana *</legend>
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						{DAY_LABELS.map((label, i) => (
							<label
								key={label}
								className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm"
							>
								<input
									type="checkbox"
									name={fields.days.name}
									value={i}
									className="size-4"
								/>
								<span>{label}</span>
							</label>
						))}
					</div>
					{fields.days.errors ? (
						<p className="text-xs text-destructive">{fields.days.errors[0]}</p>
					) : null}
				</fieldset>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field
						label="Início (opcional)"
						error={fields.starts_at.errors?.[0]}
					>
						<Input {...getInputProps(fields.starts_at, { type: "date" })} />
					</Field>
					<Field
						label="Término (opcional)"
						error={fields.ends_at.errors?.[0]}
					>
						<Input {...getInputProps(fields.ends_at, { type: "date" })} />
					</Field>
				</div>

				<div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5">
					<input
						{...getInputProps(fields.is_active, { type: "checkbox" })}
						defaultChecked
						className="size-4"
					/>
					<Label htmlFor={fields.is_active.id}>
						Promoção ativa (visível ao público nos dias selecionados)
					</Label>
				</div>

				{form.errors ? (
					<p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{form.errors[0]}
					</p>
				) : null}

				<div className="flex items-center justify-end">
					<Button type="submit" disabled={submitting}>
						{submitting ? "Salvando…" : "Salvar promoção"}
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">
					Após salvar, você poderá adicionar imagens à promoção.
				</p>
			</Form>
		</main>
	);
}

function Field({
	label,
	error,
	hint,
	children,
}: {
	label: string;
	error?: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<label className="flex flex-col gap-1.5 text-sm">
			<span className="font-medium">{label}</span>
			{children}
			{error ? (
				<span className="text-xs text-destructive">{error}</span>
			) : hint ? (
				<span className="text-xs text-muted-foreground">{hint}</span>
			) : null}
		</label>
	);
}
