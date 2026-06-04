import { CheckCircle2, FileText, Rocket, Settings } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

type PlanTier = "basico" | "ouro";

// Mirrors the public pricing page (app/routes/public/plans.tsx) so the
// confirmation screen shows the same plan name and price the owner picked.
const PLAN_DISPLAY: Record<PlanTier, { name: string; price: string }> = {
	ouro: { name: "Presença Completa", price: "R$ 47,90" },
	basico: { name: "Plano Básico", price: "R$ 7,90" },
};

// Activation goes through the João Tem WhatsApp where the team confirms
// payment and switches the business from "Rascunho" to active.
const ACTIVATION_WHATSAPP = "5588921822102";

const NEXT_STEPS = [
	"Seu negócio será ativado com os recursos do plano",
	"Ficará visível para clientes em toda a cidade",
	"Vitrine digital liberada",
] as const;

export function BusinessSuccess({
	name,
	categoryName,
	neighborhoodName,
	requestedPlan,
	editHref = "/dashboard/businesses/new",
}: {
	name: string;
	categoryName?: string;
	neighborhoodName?: string;
	requestedPlan: PlanTier;
	editHref?: string;
}) {
	const plan = PLAN_DISPLAY[requestedPlan] ?? PLAN_DISPLAY.ouro;

	const whatsappMessage = encodeURIComponent(
		`Olá! Quero ativar meu negócio "${name}" no João Tem (${plan.name} — ${plan.price}/mês).`,
	);
	const activationHref = `https://wa.me/${ACTIVATION_WHATSAPP}?text=${whatsappMessage}`;

	const subtitle = [categoryName, neighborhoodName].filter(Boolean).join(" • ");

	return (
		<section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
			<div className="flex flex-col items-center text-center">
				<span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-primary/20">
					<Rocket className="size-7" />
				</span>
				<h1 className="mt-5 text-2xl font-bold tracking-tight">
					Cadastro iniciado!
				</h1>
				<p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
					Ative seu negócio para aparecer no João Tem e começar a receber
					clientes.
				</p>
			</div>

			{/* Business summary */}
			<div className="mt-6 flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background p-4">
				<div className="min-w-0">
					<p className="truncate text-base font-bold tracking-tight">{name}</p>
					{subtitle ? (
						<p className="mt-0.5 truncate text-xs text-muted-foreground">
							{subtitle}
						</p>
					) : null}
				</div>
				<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
					<FileText className="size-3.5" />
					Rascunho
				</span>
			</div>

			{/* Selected plan */}
			<div className="mt-4 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
				<p className="text-xs font-medium text-muted-foreground">
					Plano selecionado:
				</p>
				<div className="mt-1 flex items-baseline justify-between gap-3">
					<span className="text-lg font-bold text-primary">{plan.name}</span>
					<span className="text-base font-bold">
						{plan.price}
						<span className="text-sm font-normal text-muted-foreground">
							/mês
						</span>
					</span>
				</div>
			</div>

			{/* Next steps */}
			<div className="mt-4 rounded-2xl border border-whatsapp/20 bg-whatsapp/5 p-4">
				<p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
					<CheckCircle2 className="size-4 text-whatsapp" />
					Ao concluir o pagamento:
				</p>
				<ul className="mt-2.5 flex flex-col gap-1.5">
					{NEXT_STEPS.map((step) => (
						<li
							key={step}
							className="flex items-start gap-2 text-sm text-foreground/80"
						>
							<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-whatsapp" />
							{step}
						</li>
					))}
				</ul>
			</div>

			{/* Actions */}
			<div className="mt-5 flex flex-col gap-3">
				<Button
					render={<a href={activationHref} target="_blank" rel="noreferrer" />}
					className="h-12 rounded-xl bg-whatsapp text-base text-whatsapp-foreground shadow-md shadow-whatsapp/20 hover:bg-whatsapp/90"
				>
					<Rocket className="size-4" />
					Ativar meu negócio
				</Button>
				<Button
					variant="outline"
					render={<Link to={editHref} />}
					className="h-12 rounded-xl text-base"
				>
					<Settings className="size-4" />
					Editar cadastro
				</Button>
			</div>

		</section>
	);
}
