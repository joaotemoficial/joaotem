import {
	type FieldMetadata,
	type FormMetadata,
	getFormProps,
	getInputProps,
	getSelectProps,
	getTextareaProps,
} from "@conform-to/react";
import { Check, Crown, Rocket } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Form } from "react-router";
import {
	Field,
	ImageUpload,
	NativeSelect,
} from "~/components/business/business-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { MAX_SHORT_DESCRIPTION } from "~/lib/constants";
import { cn } from "~/lib/utils";

type Category = { id: string; name: string };
type City = { id: string; name: string; state: string };
type Neighborhood = { id: string; name: string; city_id: string };

type PlanTier = "basico" | "ouro";

// biome-ignore lint/suspicious/noExplicitAny: Conform field metadata is generic
type AnyField = FieldMetadata<any>;

// Display copy for the "PLANO SELECIONADO" card. Mirrors the public pricing
// page (app/routes/public/plans.tsx) so the onboarding flow stays consistent.
const PLAN_INFO: Record<
	PlanTier,
	{ name: string; tagline: string; features: string[] }
> = {
	ouro: {
		name: "Plano Ouro",
		tagline:
			"Mais destaque, mais visibilidade e mais chances de receber clientes.",
		features: [
			"Destaque nas buscas",
			"Vitrine de produtos",
			"Promoções e ofertas",
			"Selo Ouro",
		],
	},
	basico: {
		name: "Plano Básico",
		tagline:
			"A forma simples e acessível de colocar seu negócio na busca e ser encontrado.",
		features: [
			"Listagem nas buscas",
			"Página do negócio no portal",
			"Contato direto por WhatsApp",
		],
	},
};

export function BusinessOnboardingForm({
	form,
	fields,
	categories,
	cities,
	neighborhoods,
	requestedPlan,
	planLocked,
	planError,
	planMessageError,
	submitting,
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
	requestedPlan: PlanTier;
	/** When true the plan came from the URL — show it read-only, hide the select. */
	planLocked: boolean;
	planError?: string;
	planMessageError?: string;
	submitting?: boolean;
}) {
	const initialCity =
		(fields.city_id.initialValue as string | undefined) ??
		// With a single city, pre-select it so the neighborhood select isn't
		// stuck disabled (the browser auto-displays it but never fires onChange).
		(cities.length === 1 ? cities[0]?.id : undefined) ??
		"";

	// Track the selected city locally only to filter the neighborhoods list.
	// Both selects stay uncontrolled (Conform owns their state via getSelectProps).
	const [cityId, setCityId] = useState<string>(initialCity);

	const filteredNeighborhoods = useMemo(
		() => neighborhoods.filter((n) => n.city_id === cityId),
		[neighborhoods, cityId],
	);

	const descId = useId();
	const descLength =
		(fields.short_description.value as string | undefined)?.length ?? 0;

	const plan = PLAN_INFO[requestedPlan];

	return (
		<>
			<header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1f3a] via-[#0e2a4d] to-[#102a43] p-6 text-white sm:p-8">
				<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
					<div className="max-w-xl">
						<span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">
							Cadastro JoãoTem
						</span>
						<h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
							Cadastrar seu negócio
						</h1>
						<p className="mt-3 text-sm leading-relaxed text-blue-100/80">
							Preencha as informações abaixo para sua empresa aparecer no
							JoãoTem, ser encontrada nas buscas e receber mais clientes da sua
							cidade.
						</p>
					</div>
					<div className="shrink-0 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 sm:max-w-[240px]">
						<p className="flex items-center gap-1.5 text-sm font-semibold">
							<Rocket className="size-4 text-blue-300" />
							Fácil, rápido e profissional
						</p>
						<p className="mt-1.5 text-xs leading-relaxed text-blue-100/70">
							Seu negócio pronto para vender mais no digital.
						</p>
					</div>
				</div>
			</header>

			<Form
				method="post"
				encType="multipart/form-data"
				{...getFormProps(form)}
				className="mt-5 flex flex-col gap-5"
			>
				{planLocked ? (
					<section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-blue-50/70 p-5">
						<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-4">
								<span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-primary/20">
									<Crown className="size-7" />
								</span>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">
										Plano selecionado
									</p>
									<h2 className="text-lg font-bold tracking-tight">
										{plan.name}
									</h2>
									<p className="mt-0.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
										{plan.tagline}
									</p>
								</div>
							</div>
							<ul className="grid w-full gap-2 sm:max-w-xs">
								{plan.features.map((feature) => (
									<li
										key={feature}
										className="flex items-center gap-2 rounded-xl border border-primary/10 bg-card px-3 py-2 text-xs font-medium shadow-sm"
									>
										<Check className="size-3.5 shrink-0 text-whatsapp" />
										{feature}
									</li>
								))}
							</ul>
						</div>
						<input type="hidden" name="requested_plan" value={requestedPlan} />
					</section>
				) : (
					<section className="rounded-2xl border border-border/70 bg-card p-5">
						<h2 className="text-base font-semibold">Escolha um plano</h2>
						<p className="text-xs text-muted-foreground">
							O administrador vai analisar sua solicitação e confirmar o
							pagamento pelo WhatsApp.
						</p>
						<div className="mt-4 max-w-sm">
							<Field label="Plano desejado *" error={planError}>
								<NativeSelect
									id="requested_plan"
									name="requested_plan"
									defaultValue={requestedPlan}
									required
								>
									<option value="ouro">
										Ouro — destaque + produtos + promoções
									</option>
									<option value="basico">Básico — listagem em buscas</option>
								</NativeSelect>
							</Field>
						</div>
					</section>
				)}

				<section className="rounded-2xl border border-border/70 bg-card p-5">
					<SectionHeader
						n="01"
						title="Informações do negócio"
						desc="Preencha os dados principais para o cliente encontrar sua empresa"
					/>

					<div className="mt-5 grid gap-4 sm:grid-cols-2">
						<Field label="Nome do negócio *" error={fields.name.errors?.[0]}>
							<Input
								{...getInputProps(fields.name, { type: "text" })}
								placeholder="Meu Negócio"
								maxLength={120}
							/>
						</Field>

						<Field
							label="Nome de usuário *"
							error={fields.handle.errors?.[0]}
							hint="Letras minúsculas, números e hífen. Será usado na URL."
						>
							<Input
								{...getInputProps(fields.handle, { type: "text" })}
								placeholder="meu-negocio"
								maxLength={30}
							/>
						</Field>

						<Field label="Categoria *" error={fields.category_id.errors?.[0]}>
							<NativeSelect {...getSelectProps(fields.category_id)}>
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

						<div className="sm:col-span-2">
							<Field label="Bairro *" error={fields.neighborhood_id.errors?.[0]}>
								{/* Remount on city change so the uncontrolled select clears its DOM value */}
								<NativeSelect
									{...getSelectProps(fields.neighborhood_id)}
									key={cityId || "no-city"}
									disabled={!cityId}
								>
									<option value="" disabled>
										{cityId
											? "Selecione o bairro"
											: "Selecione a cidade primeiro"}
									</option>
									{filteredNeighborhoods.map((n) => (
										<option key={n.id} value={n.id}>
											{n.name}
										</option>
									))}
								</NativeSelect>
							</Field>
						</div>

						<div className="sm:col-span-2">
							<Field
								label="Descrição curta"
								error={fields.short_description.errors?.[0]}
								hint={`${descLength}/${MAX_SHORT_DESCRIPTION}`}
								hintId={descId}
							>
								<Textarea
									{...getTextareaProps(fields.short_description)}
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
								placeholder="11999999999"
								inputMode="numeric"
								pattern="[0-9]*"
								maxLength={13}
							/>
						</Field>

						<Field label="Instagram" error={fields.instagram.errors?.[0]}>
							<Input
								{...getInputProps(fields.instagram, { type: "text" })}
								placeholder="@seunegocio"
							/>
						</Field>

						<div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2.5 sm:col-span-2">
							<input
								{...getInputProps(fields.offers_delivery, { type: "checkbox" })}
								className="size-4"
							/>
							<Label htmlFor={fields.offers_delivery.id}>Oferece entrega</Label>
						</div>
					</div>
				</section>

				<section className="rounded-2xl border border-border/70 bg-card p-5">
					<SectionHeader
						n="02"
						title="Imagens do negócio"
						desc="Adicione sua logo e capa para deixar sua página mais profissional"
					/>
					<div className="mt-5 grid gap-4 sm:grid-cols-2">
						<ImageUpload
							name={fields.logo.name}
							label="Logo do negócio"
							currentUrl={null}
							error={fields.logo.errors?.[0]}
						/>
						<ImageUpload
							name={fields.cover.name}
							label="Imagem de capa"
							currentUrl={null}
							error={fields.cover.errors?.[0]}
						/>
					</div>
				</section>

				<section className="rounded-2xl border border-border/70 bg-card p-5">
					<SectionHeader
						n="03"
						title="Finalizar cadastro"
						desc="Revise as informações e envie seu cadastro para análise"
					/>
					<div className="mt-5">
						<Field
							label="Mensagem para o administrador (opcional)"
							error={planMessageError}
						>
							<Textarea
								id="plan_message"
								name="plan_message"
								rows={2}
								maxLength={500}
								placeholder="Algum detalhe que o administrador deva saber…"
							/>
						</Field>
					</div>

					{form.errors ? (
						<p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{form.errors[0]}
						</p>
					) : null}

					<div className="mt-5 flex justify-end">
						<Button
							type="submit"
							disabled={submitting}
							className="h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 px-5 text-base shadow-md shadow-primary/20 hover:from-blue-600 hover:to-indigo-700"
						>
							<Rocket className="size-4" />
							{submitting ? "Enviando…" : "Enviar e continuar"}
						</Button>
					</div>
				</section>
			</Form>
		</>
	);
}

function SectionHeader({
	n,
	title,
	desc,
}: {
	n: string;
	title: string;
	desc: string;
}) {
	return (
		<div className="flex items-start gap-3">
			<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
				{n}
			</span>
			<div>
				<h2 className="text-lg font-bold tracking-tight">{title}</h2>
				<p className="text-xs text-muted-foreground">{desc}</p>
			</div>
		</div>
	);
}
