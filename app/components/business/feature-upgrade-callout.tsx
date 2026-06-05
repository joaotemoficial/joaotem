import { Crown, MessageCircle, RefreshCw } from "lucide-react";
import { Link } from "react-router";
import { buttonVariants } from "~/components/ui/button";
import { activationWhatsappHref, type SubscriptionStatus } from "~/lib/plan";
import { cn } from "~/lib/utils";

type Tone = "amber" | "destructive";

const TONE: Record<
	Tone,
	{ container: string; title: string; body: string }
> = {
	amber: {
		container: "border-amber-300 bg-amber-50",
		title: "text-amber-900",
		body: "text-amber-800",
	},
	destructive: {
		container: "border-destructive/30 bg-destructive/10",
		title: "text-destructive",
		body: "text-destructive/80",
	},
};

/**
 * Status-aware upsell banner for Ouro-gated features (produtos, promoções).
 *
 * The copy and call-to-action adapt to the business's subscription status:
 *  - `never`   → not activated yet; send a WhatsApp message to pay (Ouro).
 *  - `expired` → plan lapsed; request a renewal.
 *  - `active`  → on Básico (locked) or at the plan limit; request an upgrade.
 */
export function FeatureUpgradeCallout({
	business,
	status,
	feature,
	action,
	itemPlural,
	limit,
}: {
	business: { id: string; name: string };
	status: SubscriptionStatus;
	/** Noun for the gated feature, e.g. "Vitrine de produtos". */
	feature: string;
	/** Verb phrase, e.g. "publicar produtos". */
	action: string;
	/** Plural noun for the limit message, e.g. "produtos". */
	itemPlural: string;
	/** When set, renders the "limit reached" variant instead of the locked one. */
	limit?: number;
}) {
	const upgradeHref = `/dashboard/upgrade?business=${business.id}`;

	let tone: Tone = "amber";
	let title: string;
	let body: string;
	let cta: { label: string; href: string; external?: boolean; tone: Tone };

	if (limit != null) {
		// Has the feature but hit the plan's cap.
		title = `Você atingiu o limite de ${limit} ${itemPlural}`;
		body = `Faça upgrade do seu plano para cadastrar mais ${itemPlural}.`;
		cta = { label: "Solicitar upgrade", href: upgradeHref, tone: "amber" };
	} else if (status === "never") {
		title = `Ative seu negócio para usar ${feature.toLowerCase()}`;
		body = `Seu negócio ainda está em rascunho. Conclua o pagamento pelo WhatsApp para ativar o Plano Ouro e ${action}.`;
		cta = {
			label: "Quero pagar",
			href: activationWhatsappHref(business.name, "ouro"),
			external: true,
			tone: "amber",
		};
	} else if (status === "expired") {
		tone = "destructive";
		title = "Seu plano expirou";
		body = `Renove seu plano para voltar a ${action} na sua página.`;
		cta = {
			label: "Solicitar renovação",
			href: upgradeHref,
			tone: "destructive",
		};
	} else {
		// Active on Básico — the feature is Ouro-only.
		title = `${feature} é um recurso Ouro`;
		body = `Faça upgrade para o plano Ouro e comece a ${action}.`;
		cta = { label: "Solicitar upgrade", href: upgradeHref, tone: "amber" };
	}

	const t = TONE[tone];
	let Icon = Crown;
	if (cta.tone === "destructive") Icon = RefreshCw;
	else if (cta.external) Icon = MessageCircle;

	return (
		<div
			className={cn(
				"mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3",
				t.container,
			)}
		>
			<div>
				<p className={cn("text-sm font-semibold", t.title)}>{title}</p>
				<p className={cn("text-xs", t.body)}>{body}</p>
			</div>
			{cta.external ? (
				<a
					href={cta.href}
					target="_blank"
					rel="noreferrer"
					className={cn(
						buttonVariants({ size: "sm" }),
						"gap-1.5 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90",
					)}
				>
					<Icon className="size-4" />
					{cta.label}
				</a>
			) : (
				<Link
					to={cta.href}
					className={buttonVariants({
						variant: cta.tone === "destructive" ? "destructive" : "default",
						size: "sm",
						className: "gap-1.5",
					})}
				>
					<Icon className="size-4" />
					{cta.label}
				</Link>
			)}
		</div>
	);
}
