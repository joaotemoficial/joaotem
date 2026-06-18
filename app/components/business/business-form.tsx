import {
	type FormMetadata,
	type FieldMetadata,
	getFormProps,
	getInputProps,
	getSelectProps,
	getTextareaProps,
} from "@conform-to/react";
import {
	AtSign,
	ChevronDown,
	ImageIcon,
	ImagePlus,
	MapPin,
	Navigation,
	Phone,
	Store,
	Tag,
	Truck,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { MAX_SHORT_DESCRIPTION } from "~/lib/constants";
import { cn } from "~/lib/utils";

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
	google_maps_url?: string | null;
	offers_delivery?: boolean | null;
	logo_url?: string | null;
	cover_url?: string | null;
};

// biome-ignore lint/suspicious/noExplicitAny: Conform field metadata is generic
type AnyField = FieldMetadata<any>;

// Formats a raw phone string into the Brazilian mask "(11) 9.9999-9999".
// Works progressively as the user types and tolerates already-masked input.
function formatWhatsapp(value: string): string {
	const d = value.replace(/\D/g, "").slice(0, 11);
	if (d.length === 0) return "";
	if (d.length <= 2) return `(${d}`;
	const ddd = d.slice(0, 2);
	const rest = d.slice(2);
	if (rest.length <= 4) return `(${ddd}) ${rest}`;
	// 11 digits → mobile with the leading "9." the user asked for.
	if (d.length === 11) {
		return `(${ddd}) ${rest.slice(0, 1)}.${rest.slice(1, 5)}-${rest.slice(5)}`;
	}
	// 10 digits (landline) or partial → "(11) 9999-9999".
	return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
}

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
		google_maps_url: AnyField;
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
		// With a single city, pre-select it so the neighborhood select isn't
		// stuck disabled (the browser auto-displays it but never fires onChange).
		(cities.length === 1 ? cities[0]?.id : undefined) ??
		"";

	// Track the selected city locally only to filter the neighborhoods list.
	// Both selects remain uncontrolled (Conform owns their state via getSelectProps).
	const [cityId, setCityId] = useState<string>(initialCity);

	// WhatsApp is a controlled, masked input. We submit the masked string and
	// the Zod schema strips it back to digits before persisting.
	const [whatsapp, setWhatsapp] = useState(() =>
		formatWhatsapp(defaults.whatsapp ?? ""),
	);
	const { defaultValue: _whatsappDefault, ...whatsappProps } = getInputProps(
		fields.whatsapp,
		{ type: "tel" },
	);

	const filteredNeighborhoods = useMemo(
		() => neighborhoods.filter((n) => n.city_id === cityId),
		[neighborhoods, cityId],
	);

	const descId = useId();
	const descLength =
		(fields.short_description.value as string | undefined)?.length ?? 0;

	return (
		<Form
			method="post"
			encType="multipart/form-data"
			{...getFormProps(form)}
			className="flex flex-col gap-6"
		>
			<FormSection
				icon={Store}
				title="Informações do Negócio"
				description="Campos com * são obrigatórios"
			>
				<div className="grid gap-5 sm:grid-cols-2">
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
						<InputWithIcon icon={AtSign}>
							<Input
								{...getInputProps(fields.handle, { type: "text" })}
								defaultValue={defaults.handle ?? ""}
								placeholder="meu-negocio"
								maxLength={30}
								className="pl-9"
							/>
						</InputWithIcon>
					</Field>

					<Field label="Categoria *" error={fields.category_id.errors?.[0]}>
						<NativeSelect
							icon={Tag}
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
							icon={MapPin}
							{...getSelectProps(fields.city_id)}
							defaultValue={initialCity}
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

					<Field label="Bairro *" error={fields.neighborhood_id.errors?.[0]}>
						{/* Remount when city changes so the uncontrolled select clears its DOM value */}
						<NativeSelect
							icon={MapPin}
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

					<Field label="WhatsApp *" error={fields.whatsapp.errors?.[0]}>
						<InputWithIcon icon={Phone}>
							<Input
								{...whatsappProps}
								value={whatsapp}
								onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
								placeholder="(11) 9.9999-9999"
								inputMode="tel"
								autoComplete="tel"
								className="pl-9"
							/>
						</InputWithIcon>
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

					<div className="sm:col-span-2">
						<Field label="Instagram" error={fields.instagram.errors?.[0]}>
							<InputWithIcon icon={AtSign}>
								<Input
									{...getInputProps(fields.instagram, { type: "text" })}
									defaultValue={defaults.instagram ?? ""}
									placeholder="@seunegocio"
									className="pl-9"
								/>
							</InputWithIcon>
						</Field>
					</div>

					<div className="sm:col-span-2">
						<Field
							label="Link do Google Maps"
							error={fields.google_maps_url.errors?.[0]}
							hint="Abra o local no Google Maps e cole o link aqui para mostrar o botão “Como chegar”."
						>
							<InputWithIcon icon={Navigation}>
								<Input
									{...getInputProps(fields.google_maps_url, { type: "url" })}
									defaultValue={defaults.google_maps_url ?? ""}
									placeholder="https://www.google.com/maps/place/..."
									className="pl-9"
								/>
							</InputWithIcon>
						</Field>
					</div>

					<label className="group sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5 has-checked:border-primary/50 has-checked:bg-primary/5">
						<input
							{...getInputProps(fields.offers_delivery, { type: "checkbox" })}
							defaultChecked={defaults.offers_delivery ?? false}
							className="size-4 accent-primary"
						/>
						<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-has-checked:bg-primary/15 group-has-checked:text-primary">
							<Truck className="size-4" />
						</span>
						<span className="flex flex-col">
							<span className="text-sm font-medium">Oferece entrega</span>
							<span className="text-xs text-muted-foreground">
								Mostra um selo de entrega no seu perfil
							</span>
						</span>
					</label>
				</div>
			</FormSection>

			<FormSection
				icon={ImageIcon}
				title="Imagens"
				description="Logo e capa ajudam seu negócio a se destacar"
			>
				<div className="grid gap-5 sm:grid-cols-2">
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
				</div>
			</FormSection>

			{extra ? (
				<section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
					{extra}
				</section>
			) : null}

			{form.errors ? (
				<p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{form.errors[0]}
				</p>
			) : null}

			<div className="flex items-center justify-end gap-3">
				<Button type="submit" size="lg" disabled={submitting}>
					{submitting ? "Salvando…" : submitLabel}
				</Button>
			</div>
		</Form>
	);
}

function FormSection({
	icon: Icon,
	title,
	description,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
			<header className="flex items-center gap-3 border-b border-border/50 bg-muted/30 px-5 py-4">
				<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
					<Icon className="size-4.5" />
				</span>
				<div className="min-w-0">
					<h2 className="text-sm font-semibold">{title}</h2>
					{description ? (
						<p className="text-xs text-muted-foreground">{description}</p>
					) : null}
				</div>
			</header>
			<div className="p-5">{children}</div>
		</section>
	);
}

export function Field({
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
				<span className="text-xs font-medium text-destructive">{error}</span>
			) : hint ? (
				<span className="text-xs text-muted-foreground" id={hintId}>
					{hint}
				</span>
			) : null}
		</label>
	);
}

// Wraps an <Input> with a decorative leading icon. The child input should add
// `pl-9` to leave room for it.
function InputWithIcon({
	icon: Icon,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	children: React.ReactNode;
}) {
	return (
		<div className="relative">
			<Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			{children}
		</div>
	);
}

export function NativeSelect({
	className,
	children,
	icon: Icon,
	...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
	icon?: React.ComponentType<{ className?: string }>;
}) {
	return (
		<div className="relative">
			{Icon ? (
				<Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			) : null}
			<select
				className={cn(
					"h-9 w-full appearance-none rounded-lg border border-input bg-transparent pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30",
					Icon ? "pl-9" : "pl-2.5",
					className,
				)}
				{...props}
			>
				{children}
			</select>
			<ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
		</div>
	);
}

export function ImageUpload({
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
			<label className="group flex items-center gap-3 rounded-xl border border-dashed border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer">
				<div className="size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
					{preview ? (
						<img
							src={preview}
							alt=""
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="grid h-full w-full place-items-center text-muted-foreground">
							<ImagePlus className="size-6" />
						</div>
					)}
				</div>
				<div className="flex min-w-0 flex-col">
					<span className="text-sm font-medium text-foreground">
						{preview ? "Trocar imagem" : "Selecionar arquivo"}
					</span>
					<span className="text-xs text-muted-foreground">
						PNG, JPG, WEBP ou GIF
					</span>
				</div>
				<input
					type="file"
					name={name}
					accept="image/png,image/jpeg,image/webp,image/gif"
					onChange={onChange}
					className="sr-only"
				/>
			</label>
			{error ? <span className="text-xs text-destructive">{error}</span> : null}
		</div>
	);
}
