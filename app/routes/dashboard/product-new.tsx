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
import {
	featureLimit,
	hasFeature,
	resolveFlagsForBusiness,
} from "~/lib/feature-flags.server";
import { effectivePlanTier } from "~/lib/plan";
import {
	priceToCents,
	productFormSchema,
} from "~/lib/validation/business";
import * as businessesRepo from "~/repositories/businesses";
import * as productsRepo from "~/repositories/products";
import { isError } from "~/types";
import type { Route } from "./+types/product-new";

export const meta: Route.MetaFunction = () => [
	{ title: "Novo produto — JoaoTem" },
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
	return {
		business: { id: business.id, name: business.name },
	};
}

export async function action({ params, request }: Route.ActionArgs) {
	const ctx = await requireUser(request);
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema: productFormSchema });
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
	if (!hasFeature(flags, "vitrine_produtos")) {
		return submission.reply({
			formErrors: [
				"Seu plano atual não permite cadastrar produtos. Faça upgrade para Ouro.",
			],
		});
	}
	const limit = featureLimit(flags, "vitrine_produtos");
	if (limit !== null) {
		const countResult = await productsRepo.countByBusiness({
			supabase: ctx.supabase,
			businessId: business.id,
		});
		const current = !isError(countResult) ? countResult.success : 0;
		if (current >= limit) {
			return submission.reply({
				formErrors: [`Você atingiu o limite de ${limit} produtos no seu plano.`],
			});
		}
	}

	const created = await productsRepo.create({
		supabase: ctx.supabase,
		values: {
			business_id: business.id,
			name: submission.value.name,
			description: submission.value.description?.trim() || null,
			price_cents: priceToCents(submission.value.price),
			stock_quantity: submission.value.stock_quantity
				? Number.parseInt(submission.value.stock_quantity, 10)
				: null,
			is_active: submission.value.is_active,
		},
	});
	if (isError(created)) {
		return submission.reply({ formErrors: [created.error] });
	}

	throw redirect(
		`/dashboard/businesses/${params.id}/products/${created.success.id}`,
		{ headers: ctx.headers },
	);
}

export default function ProductNew({ actionData }: Route.ComponentProps) {
	const { business } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const [form, fields] = useForm({
		lastResult: actionData,
		shouldRevalidate: "onBlur",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: productFormSchema });
		},
	});

	return (
		<main className="mx-auto max-w-2xl px-4 py-8">
			<div className="flex items-center justify-between gap-2 pb-6">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">Novo produto</h1>
					<p className="text-sm text-muted-foreground">
						{business.name} — adicione um produto à sua loja.
					</p>
				</div>
				<Link
					to={`/dashboard/businesses/${business.id}/products`}
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
				<Field label="Nome do produto *" error={fields.name.errors?.[0]}>
					<Input
						{...getInputProps(fields.name, { type: "text" })}
						placeholder="Bolo de chocolate"
					/>
				</Field>

				<Field label="Descrição" error={fields.description.errors?.[0]}>
					<Textarea
						{...getTextareaProps(fields.description)}
						rows={4}
						placeholder="Opcional"
					/>
				</Field>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field
						label="Preço (R$) *"
						error={fields.price.errors?.[0]}
						hint="Use vírgula ou ponto"
					>
						<Input
							{...getInputProps(fields.price, { type: "text" })}
							placeholder="0,00"
							inputMode="decimal"
						/>
					</Field>

					<Field
						label="Estoque"
						error={fields.stock_quantity.errors?.[0]}
						hint="Opcional"
					>
						<Input
							{...getInputProps(fields.stock_quantity, { type: "text" })}
							placeholder="ex: 10"
							inputMode="numeric"
						/>
					</Field>
				</div>

				<div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5">
					<input
						{...getInputProps(fields.is_active, { type: "checkbox" })}
						defaultChecked
						className="size-4"
					/>
					<Label htmlFor={fields.is_active.id}>Produto ativo (visível ao público)</Label>
				</div>

				{form.errors ? (
					<p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{form.errors[0]}
					</p>
				) : null}

				<div className="flex items-center justify-end">
					<Button type="submit" disabled={submitting}>
						{submitting ? "Salvando…" : "Salvar produto"}
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">
					Após salvar, você poderá adicionar imagens ao produto.
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
