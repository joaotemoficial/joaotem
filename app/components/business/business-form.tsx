import {
	type FormMetadata,
	type FieldMetadata,
	getFormProps,
	getInputProps,
	getSelectProps,
	getTextareaProps,
} from "@conform-to/react";
import { useId, useMemo, useState } from "react";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { MAX_SHORT_DESCRIPTION } from "~/lib/constants";

type Category = { id: string; name: string };
type City = { id: string; name: string; state: string };
type Neighborhood = { id: string; name: string; city_id: string };

type Defaults = {
	name?: string | null;
	handle?: string | null;
	category_id?: string | null;
	city_id?: string | null;
	neighborhood_id?: string | null;
	short_description?: string | null;
	whatsapp?: string | null;
	instagram?: string | null;
	offers_delivery?: boolean | null;
	logo_url?: string | null;
	cover_url?: string | null;
};

// biome-ignore lint/suspicious/noExplicitAny: Conform field metadata is generic
type AnyField = FieldMetadata<any>;

export function BusinessForm({
	form,
	fields,
	categories,
	cities,
	neighborhoods,
	defaults,
	submitting,
	submitLabel = "Salvar",
	extra,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: Conform form metadata is generic
	form: FormMetadata<any>;
	fields: {
		name: AnyField;
		handle: AnyField;
		category_id: AnyField;
		city_id: AnyField;
		neighborhood_id: AnyField;
		short_description: AnyField;
		whatsapp: AnyField;
		instagram: AnyField;
		offers_delivery: AnyField;
		logo: AnyField;
		cover: AnyField;
	};
	categories: Category[];
	cities: City[];
	neighborhoods: Neighborhood[];
	defaults: Defaults;
	submitting?: boolean;
	submitLabel?: string;
	// Optional slot for callers that need to inject extra fields into the
	// same <Form>. Rendered just before the submit button — used by the
	// admin business-create flow to embed the plan picker.
	extra?: React.ReactNode;
}) {
	const initialCity =
		(fields.city_id.initialValue as string | undefined) ??
		defaults.city_id ??
		"";

	// Track the selected city locally only to filter the neighborhoods list.
	// Both selects remain uncontrolled (Conform owns their state via getSelectProps).
	const [cityId, setCityId] = useState<string>(initialCity);

	const filteredNeighborhoods = useMemo(
		() => neighborhoods.filter((n) => n.city_id === cityId),
		[neighborhoods, cityId],
	);

	const descId = useId();
	const descLength = (fields.short_description.value as string | undefined)?.length ?? 0;

	return (
		<Form
			method="post"
			encType="multipart/form-data"
			{...getFormProps(form)}
			className="flex flex-col gap-5"
		>
			<section className="rounded-2xl border border-border/70 bg-card p-5">
				<h2 className="text-base font-semibold">Informações do Negócio</h2>
				<p className="text-xs text-muted-foreground">
					Campos com * são obrigatórios
				</p>

				<div className="mt-4 grid gap-4 sm:grid-cols-2">
					<Field label="Nome do negócio *" error={fields.name.errors?.[0]}>
						<Input
							{...getInputProps(fields.name, { type: "text" })}
							defaultValue={defaults.name ?? ""}
							placeholder="Meu Negócio"
							maxLength={120}
						/>
					</Field>

					<Field
						label="Nome de usuário (handle) *"
						error={fields.handle.errors?.[0]}
						hint="Letras minúsculas, números e hífen. Será usado na URL."
					>
						<Input
							{...getInputProps(fields.handle, { type: "text" })}
							defaultValue={defaults.handle ?? ""}
							placeholder="meu-negocio"
							maxLength={30}
						/>
					</Field>

					<Field
						label="Categoria *"
						error={fields.category_id.errors?.[0]}
					>
						<NativeSelect
							{...getSelectProps(fields.category_id)}
							defaultValue={defaults.category_id ?? ""}
						>
							<option value="" disabled>
								Selecione a categoria
							</option>
							{categories.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</NativeSelect>
					</Field>

					<Field label="Cidade *" error={fields.city_id.errors?.[0]}>
						<NativeSelect
							{...getSelectProps(fields.city_id)}
							onChange={(e) => setCityId(e.target.value)}
						>
							<option value="" disabled>
								Selecione a cidade
							</option>
							{cities.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name} - {c.state}
								</option>
							))}
						</NativeSelect>
					</Field>

					<Field
						label="Bairro *"
						error={fields.neighborhood_id.errors?.[0]}
					>
						{/* Remount when city changes so the uncontrolled select clears its DOM value */}
						<NativeSelect
							{...getSelectProps(fields.neighborhood_id)}
							key={cityId || "no-city"}
							disabled={!cityId}
						>
							<option value="" disabled>
								{cityId ? "Selecione o bairro" : "Selecione a cidade primeiro"}
							</option>
							{filteredNeighborhoods.map((n) => (
								<option key={n.id} value={n.id}>
									{n.name}
								</option>
							))}
						</NativeSelect>
					</Field>

					<div className="sm:col-span-2">
						<Field
							label={`Descrição curta (máx. ${MAX_SHORT_DESCRIPTION} caracteres)`}
							error={fields.short_description.errors?.[0]}
							hint={`${descLength}/${MAX_SHORT_DESCRIPTION}`}
							hintId={descId}
						>
							<Textarea
								{...getTextareaProps(fields.short_description)}
								defaultValue={defaults.short_description ?? ""}
								maxLength={MAX_SHORT_DESCRIPTION}
								rows={3}
								placeholder="Descreva seu negócio em poucas palavras…"
								aria-describedby={descId}
							/>
						</Field>
					</div>

					<Field
						label="WhatsApp *"
						error={fields.whatsapp.errors?.[0]}
						hint="Apenas números, com DDD"
					>
						<Input
							{...getInputProps(fields.whatsapp, { type: "tel" })}
							defaultValue={defaults.whatsapp ?? ""}
							placeholder="11999999999"
							inputMode="numeric"
							pattern="[0-9]*"
							maxLength={13}
						/>
					</Field>

					<Field label="Instagram" error={fields.instagram.errors?.[0]}>
						<Input
							{...getInputProps(fields.instagram, { type: "text" })}
							defaultValue={defaults.instagram ?? ""}
							placeholder="@seunegocio"
						/>
					</Field>

					<div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2.5">
						<input
							{...getInputProps(fields.offers_delivery, { type: "checkbox" })}
							defaultChecked={defaults.offers_delivery ?? false}
							className="size-4"
						/>
						<Label htmlFor={fields.offers_delivery.id}>Oferece entrega</Label>
					</div>
				</div>
			</section>

			<section className="grid gap-4 rounded-2xl border border-border/70 bg-card p-5 sm:grid-cols-2">
				<ImageUpload
					name={fields.logo.name}
					label="Logo do negócio"
					currentUrl={defaults.logo_url ?? null}
					error={fields.logo.errors?.[0]}
				/>
				<ImageUpload
					name={fields.cover.name}
					label="Imagem de capa"
					currentUrl={defaults.cover_url ?? null}
					error={fields.cover.errors?.[0]}
				/>
			</section>

			{extra ? (
				<section className="rounded-2xl border border-border/70 bg-card p-5">
					{extra}
				</section>
			) : null}

			{form.errors ? (
				<p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{form.errors[0]}
				</p>
			) : null}

			<div className="flex items-center justify-end">
				<Button type="submit" disabled={submitting}>
					{submitting ? "Salvando…" : submitLabel}
				</Button>
			</div>
		</Form>
	);
}

function Field({
	label,
	error,
	hint,
	hintId,
	children,
}: {
	label: string;
	error?: string;
	hint?: string;
	hintId?: string;
	children: React.ReactNode;
}) {
	return (
		<label className="flex flex-col gap-1.5 text-sm">
			<span className="font-medium">{label}</span>
			{children}
			{error ? (
				<span className="text-xs text-destructive">{error}</span>
			) : hint ? (
				<span className="text-xs text-muted-foreground" id={hintId}>
					{hint}
				</span>
			) : null}
		</label>
	);
}

function NativeSelect({
	className,
	children,
	...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
			{...props}
		>
			{children}
		</select>
	);
}

function ImageUpload({
	name,
	label,
	currentUrl,
	error,
}: {
	name: string;
	label: string;
	currentUrl: string | null;
	error?: string;
}) {
	const [preview, setPreview] = useState<string | null>(currentUrl);

	function onChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) {
			setPreview(currentUrl);
			return;
		}
		const url = URL.createObjectURL(file);
		setPreview(url);
	}

	return (
		<div className="flex flex-col gap-2">
			<span className="text-sm font-medium">{label}</span>
			<div className="flex items-center gap-3">
				<div className="size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
					{preview ? (
						<img
							src={preview}
							alt=""
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
							sem imagem
						</div>
					)}
				</div>
				<label className="relative inline-flex items-center justify-center rounded-md border border-input bg-background px-2.5 py-1.5 text-sm hover:bg-muted cursor-pointer">
					<input
						type="file"
						name={name}
						accept="image/png,image/jpeg,image/webp,image/gif"
						onChange={onChange}
						className="absolute inset-0 cursor-pointer opacity-0"
					/>
					Selecionar arquivo
				</label>
			</div>
			{error ? <span className="text-xs text-destructive">{error}</span> : null}
		</div>
	);
}
