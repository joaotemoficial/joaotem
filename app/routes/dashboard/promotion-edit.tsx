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
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { requireUser } from "~/lib/auth.server";
import {
	ACCEPTED_IMAGE_TYPES,
	DAY_LABELS,
	MAX_IMAGE_BYTES,
} from "~/lib/constants";
import {
	PROMOTION_IMAGE_BUCKET,
	deleteFromBucket,
	getPublicUrl,
	uploadPromotionImage,
} from "~/lib/storage.server";
import {
	daysToMask,
	maskToDays,
	promotionFormSchema,
} from "~/lib/validation/business";
import * as businessesRepo from "~/repositories/businesses";
import * as promotionsRepo from "~/repositories/promotions";
import { isError } from "~/types";
import type { Route } from "./+types/promotion-edit";

export const meta: Route.MetaFunction = () => [
	{ title: "Editar promoção — JoaoTem" },
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

	const promotionResult = await promotionsRepo.getByIdForOwner({
		supabase: ctx.supabase,
		id: params.promotionId,
		businessId: business.id,
	});
	if (isError(promotionResult)) {
		throw new Response(promotionResult.error, { status: 500 });
	}
	const promotion = promotionResult.success;
	if (!promotion)
		throw new Response("Promoção não encontrada", { status: 404 });

	const images = (promotion.images ?? [])
		.slice()
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((img) => ({
			id: img.id,
			alt_text: img.alt_text,
			storage_path: img.storage_path,
			sort_order: img.sort_order,
			url: getPublicUrl(ctx.supabase, PROMOTION_IMAGE_BUCKET, img.storage_path),
		}));

	return {
		business: { id: business.id, name: business.name },
		promotion: {
			id: promotion.id,
			title: promotion.title,
			description: promotion.description,
			schedule_note: promotion.schedule_note,
			recurrence_days: promotion.recurrence_days,
			active_days: maskToDays(promotion.recurrence_days),
			starts_at: promotion.starts_at,
			ends_at: promotion.ends_at,
			is_active: promotion.is_active,
			images,
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
					bucket: PROMOTION_IMAGE_BUCKET,
					path: storagePath,
				});
			}
			await promotionsRepo.removeImage({
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

		const promotionCheck = await promotionsRepo.getByIdForOwner({
			supabase: ctx.supabase,
			id: params.promotionId,
			businessId: businessResult.success.id,
		});
		if (isError(promotionCheck) || !promotionCheck.success) {
			return Response.json(
				{ ok: false, error: "Promoção não encontrada" },
				{ status: 404 },
			);
		}

		const imageId = crypto.randomUUID();
		const upload = await uploadPromotionImage({
			supabase: ctx.supabase,
			userId: ctx.user.id,
			businessId: businessResult.success.id,
			promotionId: params.promotionId,
			imageId,
			file,
		});
		if (isError(upload)) {
			return Response.json(
				{ ok: false, error: upload.error },
				{ status: 500 },
			);
		}
		const sortOrder = promotionCheck.success.images?.length ?? 0;
		await promotionsRepo.addImage({
			supabase: ctx.supabase,
			promotionId: params.promotionId,
			storagePath: upload.success.path,
			sortOrder,
		});
		return Response.json({ ok: true });
	}

	// Default intent: update fields via Conform/Zod
	const submission = parseWithZod(formData, { schema: promotionFormSchema });
	if (submission.status !== "success") return submission.reply();

	const update = await promotionsRepo.update({
		supabase: ctx.supabase,
		id: params.promotionId,
		values: {
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
	if (isError(update)) {
		return submission.reply({ formErrors: [update.error] });
	}

	return submission.reply({ resetForm: false });
}

export default function PromotionEdit({ actionData }: Route.ComponentProps) {
	const { business, promotion } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const lastResult =
		actionData && "status" in actionData ? actionData : undefined;

	const [form, fields] = useForm({
		lastResult,
		shouldRevalidate: "onBlur",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: promotionFormSchema });
		},
	});

	const imageFetcher = useFetcher();
	const deleteFetcher = useFetcher();

	const activeDaysSet = new Set(promotion.active_days);

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<div className="flex items-center justify-between gap-2 pb-6">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">{promotion.title}</h1>
					<p className="text-sm text-muted-foreground">{business.name}</p>
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
				className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5"
			>
				<Field label="Título *" error={fields.title.errors?.[0]}>
					<Input
						{...getInputProps(fields.title, { type: "text" })}
						defaultValue={promotion.title}
					/>
				</Field>

				<Field label="Descrição" error={fields.description.errors?.[0]}>
					<Textarea
						{...getTextareaProps(fields.description)}
						defaultValue={promotion.description ?? ""}
						rows={4}
					/>
				</Field>

				<Field
					label="Observação de horário"
					error={fields.schedule_note.errors?.[0]}
					hint="Ex: 'das 18h às 22h'"
				>
					<Input
						{...getInputProps(fields.schedule_note, { type: "text" })}
						defaultValue={promotion.schedule_note ?? ""}
					/>
				</Field>

				<fieldset className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background p-4">
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
									defaultChecked={activeDaysSet.has(i)}
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
					<Field label="Início" error={fields.starts_at.errors?.[0]}>
						<Input
							{...getInputProps(fields.starts_at, { type: "date" })}
							defaultValue={promotion.starts_at ?? ""}
						/>
					</Field>
					<Field label="Término" error={fields.ends_at.errors?.[0]}>
						<Input
							{...getInputProps(fields.ends_at, { type: "date" })}
							defaultValue={promotion.ends_at ?? ""}
						/>
					</Field>
				</div>

				<div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2.5">
					<input
						{...getInputProps(fields.is_active, { type: "checkbox" })}
						defaultChecked={promotion.is_active}
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
						{submitting ? "Salvando…" : "Salvar alterações"}
					</Button>
				</div>
			</Form>

			<section className="mt-6 rounded-2xl border border-border/70 bg-card p-5">
				<div className="flex items-center justify-between gap-2 pb-3">
					<h2 className="text-base font-semibold">Imagens da promoção</h2>
					<span className="text-xs text-muted-foreground">
						A primeira imagem é usada como capa.
					</span>
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

				{promotion.images.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Nenhuma imagem adicionada ainda.
					</p>
				) : (
					<ul className="grid gap-3 sm:grid-cols-3">
						{promotion.images.map((img, idx) => (
							<li
								key={img.id}
								className="overflow-hidden rounded-xl border border-border bg-background"
							>
								<div className="relative aspect-square">
									{img.url ? (
										<img
											src={img.url}
											alt={img.alt_text ?? ""}
											className="h-full w-full object-cover"
										/>
									) : null}
									{idx === 0 ? (
										<span className="absolute left-2 top-2 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-background">
											Capa
										</span>
									) : null}
								</div>
								<deleteFetcher.Form method="post" className="border-t p-2">
									<input type="hidden" name="intent" value="delete-image" />
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
