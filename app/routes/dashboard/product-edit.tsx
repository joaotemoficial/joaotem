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
	useFetcher,
	useLoaderData,
	useNavigation,
} from "react-router";
import { ProductOptionsFieldset } from "~/components/business/product-options-fieldset";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { requireUser } from "~/lib/auth.server";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "~/lib/constants";
import {
	PRODUCT_IMAGE_BUCKET,
	deleteFromBucket,
	getPublicUrl,
	uploadProductImage,
} from "~/lib/storage.server";
import {
	centsToPrice,
	normalizeProductOptionGroups,
	priceToCents,
	productFormSchema,
} from "~/lib/validation/business";
import * as businessesRepo from "~/repositories/businesses";
import * as productsRepo from "~/repositories/products";
import { isError } from "~/types";
import type { Route } from "./+types/product-edit";

export const meta: Route.MetaFunction = () => [
	{ title: "Editar produto — JoaoTem" },
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

	const productResult = await productsRepo.getByIdForOwner({
		supabase: ctx.supabase,
		id: params.productId,
		businessId: business.id,
	});
	if (isError(productResult)) {
		throw new Response(productResult.error, { status: 500 });
	}
	const product = productResult.success;
	if (!product) throw new Response("Produto não encontrado", { status: 404 });

	const images = (product.images ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((img) => ({
			id: img.id,
			alt_text: img.alt_text,
			storage_path: img.storage_path,
			url: getPublicUrl(ctx.supabase, PRODUCT_IMAGE_BUCKET, img.storage_path),
		}));

	const optionGroups = (product.option_groups ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((group) => ({
			name: group.name,
			values: (group.values ?? [])
				.slice()
				.sort((a, b) => a.sort_order - b.sort_order)
				.map((val) => ({
					value: val.value,
					price: val.price_cents !== null ? centsToPrice(val.price_cents) : "",
				})),
		}));

	return {
		business: { id: business.id, name: business.name },
		product: {
			id: product.id,
			name: product.name,
			description: product.description,
			price_cents: product.price_cents,
			stock_quantity: product.stock_quantity,
			is_active: product.is_active,
			images,
			optionGroups,
		},
	};
}

export async function action({ params, request }: Route.ActionArgs) {
	const ctx = await requireUser(request);
	const formData = await request.formData();
	const intent = formData.get("intent");

	const businessResult = await businessesRepo.getByIdForOwner({
		supabase: ctx.supabase,
		id: params.id,
		userId: ctx.user.id,
	});
	if (isError(businessResult) || !businessResult.success) {
		return Response.json(
			{ ok: false, error: "Negócio não encontrado" },
			{ status: 404 },
		);
	}

	if (intent === "delete-image") {
		const imageId = formData.get("image_id");
		const storagePath = formData.get("storage_path");
		if (typeof imageId === "string") {
			if (typeof storagePath === "string" && storagePath.length > 0) {
				await deleteFromBucket({
					supabase: ctx.supabase,
					bucket: PRODUCT_IMAGE_BUCKET,
					path: storagePath,
				});
			}
			await productsRepo.removeImage({
				supabase: ctx.supabase,
				imageId,
			});
		}
		return Response.json({ ok: true });
	}

	if (intent === "add-image") {
		const file = formData.get("image");
		if (!(file instanceof File) || file.size === 0) {
			return Response.json(
				{ ok: false, error: "Selecione uma imagem" },
				{ status: 400 },
			);
		}
		if (file.size > MAX_IMAGE_BYTES) {
			return Response.json(
				{ ok: false, error: "Imagem muito grande (máx. 5MB)" },
				{ status: 400 },
			);
		}
		if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
			return Response.json(
				{ ok: false, error: "Formato de imagem não suportado" },
				{ status: 400 },
			);
		}

		const productCheck = await productsRepo.getByIdForOwner({
			supabase: ctx.supabase,
			id: params.productId,
			businessId: businessResult.success.id,
		});
		if (isError(productCheck) || !productCheck.success) {
			return Response.json(
				{ ok: false, error: "Produto não encontrado" },
				{ status: 404 },
			);
		}

		const imageId = crypto.randomUUID();
		const upload = await uploadProductImage({
			supabase: ctx.supabase,
			userId: ctx.user.id,
			businessId: businessResult.success.id,
			productId: params.productId,
			imageId,
			file,
		});
		if (isError(upload)) {
			return Response.json(
				{ ok: false, error: upload.error },
				{ status: 500 },
			);
		}
		const sortOrder = (productCheck.success.images?.length ?? 0) + 1;
		await productsRepo.addImage({
			supabase: ctx.supabase,
			productId: params.productId,
			storagePath: upload.success.path,
			sortOrder,
		});
		return Response.json({ ok: true });
	}

	// Default intent: update product fields
	const submission = parseWithZod(formData, { schema: productFormSchema });
	if (submission.status !== "success") return submission.reply();

	const update = await productsRepo.update({
		supabase: ctx.supabase,
		id: params.productId,
		values: {
			name: submission.value.name,
			description: submission.value.description?.trim() || null,
			price_cents: priceToCents(submission.value.price),
			stock_quantity: submission.value.stock_quantity
				? Number.parseInt(submission.value.stock_quantity, 10)
				: null,
			is_active: submission.value.is_active,
		},
	});
	if (isError(update)) {
		return submission.reply({ formErrors: [update.error] });
	}

	const replace = await productsRepo.replaceOptionGroups({
		supabase: ctx.supabase,
		productId: params.productId,
		groups: normalizeProductOptionGroups(submission.value.option_groups),
	});
	if (isError(replace)) {
		return submission.reply({ formErrors: [replace.error] });
	}

	return submission.reply({ resetForm: false });
}

export default function ProductEdit({ actionData }: Route.ComponentProps) {
	const { business, product } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const lastResult =
		actionData && "status" in actionData ? actionData : undefined;

	const [form, fields] = useForm({
		lastResult,
		shouldRevalidate: "onBlur",
		defaultValue: {
			option_groups: product.optionGroups,
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: productFormSchema });
		},
	});

	const imageFetcher = useFetcher();
	const deleteFetcher = useFetcher();

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<div className="flex items-center justify-between gap-2 pb-6">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
					<p className="text-sm text-muted-foreground">{business.name}</p>
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
				className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5"
			>
				<Field label="Nome do produto *" error={fields.name.errors?.[0]}>
					<Input
						{...getInputProps(fields.name, { type: "text" })}
						defaultValue={product.name}
					/>
				</Field>

				<Field label="Descrição" error={fields.description.errors?.[0]}>
					<Textarea
						{...getTextareaProps(fields.description)}
						defaultValue={product.description ?? ""}
						rows={4}
					/>
				</Field>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Preço (R$) *" error={fields.price.errors?.[0]}>
						<Input
							{...getInputProps(fields.price, { type: "text" })}
							defaultValue={centsToPrice(product.price_cents)}
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
							defaultValue={product.stock_quantity?.toString() ?? ""}
							inputMode="numeric"
						/>
					</Field>
				</div>

				<div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2.5">
					<input
						{...getInputProps(fields.is_active, { type: "checkbox" })}
						defaultChecked={product.is_active}
						className="size-4"
					/>
					<Label htmlFor={fields.is_active.id}>Produto ativo (visível ao público)</Label>
				</div>

				<ProductOptionsFieldset form={form} fields={fields} />

				{form.errors ? (
					<p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{form.errors[0]}
					</p>
				) : null}

				<div className="flex items-center justify-end">
					<Button type="submit" disabled={submitting}>
						{submitting ? "Salvando…" : "Salvar alterações"}
					</Button>
				</div>
			</Form>

			<section className="mt-6 rounded-2xl border border-border/70 bg-card p-5">
				<div className="flex items-center justify-between gap-2 pb-3">
					<h2 className="text-base font-semibold">Imagens do produto</h2>
				</div>

				<imageFetcher.Form
					method="post"
					encType="multipart/form-data"
					className="mb-4 flex items-center gap-2"
				>
					<input type="hidden" name="intent" value="add-image" />
					<input
						type="file"
						name="image"
						accept="image/png,image/jpeg,image/webp,image/gif"
						required
						className="text-sm"
					/>
					<Button
						type="submit"
						size="sm"
						disabled={imageFetcher.state !== "idle"}
					>
						{imageFetcher.state !== "idle" ? "Enviando…" : "Adicionar imagem"}
					</Button>
				</imageFetcher.Form>

				{product.images.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Nenhuma imagem adicionada ainda.
					</p>
				) : (
					<ul className="grid gap-3 sm:grid-cols-3">
						{product.images.map((img) => (
							<li
								key={img.id}
								className="overflow-hidden rounded-xl border border-border bg-background"
							>
								<div className="aspect-square">
									{img.url ? (
										<img
											src={img.url}
											alt={img.alt_text ?? ""}
											className="h-full w-full object-cover"
										/>
									) : null}
								</div>
								<deleteFetcher.Form method="post" className="border-t p-2">
									<input
										type="hidden"
										name="intent"
										value="delete-image"
									/>
									<input type="hidden" name="image_id" value={img.id} />
									<input
										type="hidden"
										name="storage_path"
										value={img.storage_path}
									/>
									<Button
										type="submit"
										variant="destructive"
										size="sm"
										className="w-full"
										disabled={deleteFetcher.state !== "idle"}
									>
										Remover
									</Button>
								</deleteFetcher.Form>
							</li>
						))}
					</ul>
				)}
			</section>
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
