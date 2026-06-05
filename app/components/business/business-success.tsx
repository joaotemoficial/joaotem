import {
	CheckCircle2,
	CircleAlert,
	FileText,
	type LucideIcon,
	Rocket,
	Settings,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
	activationWhatsappHref,
	PLAN_PRICING,
	type PlanTier,
} from "~/lib/plan";
import { cn } from "~/lib/utils";

const NEXT_STEPS = [
	"Seu negócio será ativado com os recursos do plano",
	"Ficará visível para clientes em toda a cidade",
	"Vitrine digital liberada",
] as const;

// A versatile status card. The defaults render the onboarding "Cadastro
// iniciado!" screen, but every label/action can be overridden so the same shell
// covers the upgrade-page variants (never subscribed → pay; active → support).
export function BusinessSuccess({
	name,
	categoryName,
	neighborhoodName,
	requestedPlan,
	editHref = "/dashboard/businesses/new",
	title = "Cadastro iniciado!",
	subtitle = "Ative seu negócio para aparecer no João Tem e começar a receber clientes.",
	headerIcon: HeaderIcon = Rocket,
	badgeLabel = "Rascunho",
	badgeTone = "draft",
	planCardLabel = "Plano selecionado:",
	steps = NEXT_STEPS,
	stepsTitle = "Ao concluir o pagamento:",
	primaryLabel = "Ativar meu negócio",
	primaryHref,
	primaryIcon: PrimaryIcon = Rocket,
	secondaryLabel = "Editar cadastro",
}: {
	name: string;
	categoryName?: string;
	neighborhoodName?: string;
	requestedPlan: PlanTier;
	editHref?: string;
	title?: string;
	subtitle?: string;
	headerIcon?: LucideIcon;
	badgeLabel?: string;
	badgeTone?: "draft" | "active" | "expired";
	planCardLabel?: string;
	/** Pass an empty array to hide the steps block. */
	steps?: readonly string[];
	stepsTitle?: string;
	primaryLabel?: string;
	/** Defaults to the WhatsApp activation link for `requestedPlan`. */
	primaryHref?: string;
	primaryIcon?: LucideIcon;
	secondaryLabel?: string;
}) {
	const plan = PLAN_PRICING[requestedPlan] ?? PLAN_PRICING.ouro;

	const primaryActionHref =
		primaryHref ?? activationWhatsappHref(name, requestedPlan);

	const metaLine = [categoryName, neighborhoodName].filter(Boolean).join(" • ");

	const badge = {
		draft: { Icon: FileText, className: "bg-muted text-muted-foreground" },
		active: { Icon: CheckCircle2, className: "bg-whatsapp/15 text-whatsapp" },
		expired: {
			Icon: CircleAlert,
			className: "bg-destructive/15 text-destructive",
		},
	}[badgeTone];
	const BadgeIcon = badge.Icon;

	return (
		<section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
			<div className="flex flex-col items-center text-center">
				<span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-primary/20">
					<HeaderIcon className="size-7" />
				</span>
				<h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
				<p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
					{subtitle}
				</p>
			</div>

			{/* Business summary */}
			<div className="mt-6 flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background p-4">
				<div className="min-w-0">
					<p className="truncate text-base font-bold tracking-tight">{name}</p>
					{metaLine ? (
						<p className="mt-0.5 truncate text-xs text-muted-foreground">
							{metaLine}
						</p>
					) : null}
				</div>
				<span
					className={cn(
						"inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
						badge.className,
					)}
				>
					<BadgeIcon className="size-3.5" />
					{badgeLabel}
				</span>
			</div>

			{/* Plan */}
			<div className="mt-4 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
				<p className="text-xs font-medium text-muted-foreground">
					{planCardLabel}
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

			{/* Steps */}
			{steps.length > 0 ? (
				<div className="mt-4 rounded-2xl border border-whatsapp/20 bg-whatsapp/5 p-4">
					<p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
						<CheckCircle2 className="size-4 text-whatsapp" />
						{stepsTitle}
					</p>
					<ul className="mt-2.5 flex flex-col gap-1.5">
						{steps.map((step) => (
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
			) : null}

			{/* Actions */}
			<div className="mt-5 flex flex-col gap-3">
				<Button
					render={
						<a href={primaryActionHref} target="_blank" rel="noreferrer" />
					}
					className="h-12 rounded-xl bg-whatsapp text-base text-whatsapp-foreground shadow-md shadow-whatsapp/20 hover:bg-whatsapp/90"
				>
					<PrimaryIcon className="size-4" />
					{primaryLabel}
				</Button>
				<Button
					variant="outline"
					render={<Link to={editHref} />}
					className="h-12 rounded-xl text-base"
				>
					<Settings className="size-4" />
					{secondaryLabel}
				</Button>
			</div>
		</section>
	);
}
