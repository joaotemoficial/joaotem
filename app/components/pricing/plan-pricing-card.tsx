import { Check, Crown, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { PlanBadge } from "~/components/business/plan-badge";
import { buttonVariants } from "~/components/ui/button";
import type { PlanTier } from "~/lib/plan";
import { cn } from "~/lib/utils";

export type PlanPricingCardProps = {
	tier: PlanTier;
	name: string;
	price: string;
	period: string;
	tagline: string;
	features: string[];
	premiumFeatures?: string[];
	highlight?: boolean;
	badge?: string;
	ctaLabel: string;
	ctaHref: string;
};

export function PlanPricingCard({
	tier,
	name,
	price,
	period,
	tagline,
	features,
	premiumFeatures,
	highlight = false,
	badge,
	ctaLabel,
	ctaHref,
}: PlanPricingCardProps) {
	return (
		<div
			className={cn(
				"relative flex flex-col rounded-2xl border bg-card p-6 transition-all sm:p-8",
				highlight
					? "border-primary/40 shadow-lg ring-2 ring-primary/60"
					: "border-border/60 shadow-sm hover:shadow-md",
			)}
		>
			{badge ? (
				<span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
					<Sparkles className="size-3.5" />
					{badge}
				</span>
			) : null}

			<div className="flex items-center gap-2">
				<PlanBadge tier={tier} variant="solid" />
				<h3 className="text-lg font-semibold tracking-tight text-foreground">
					{name}
				</h3>
			</div>

			<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
				{tagline}
			</p>

			<div className="mt-5 flex items-end gap-1">
				<span className="text-4xl font-bold tracking-tight text-foreground">
					{price}
				</span>
				<span className="pb-1 text-sm text-muted-foreground">{period}</span>
			</div>

			<Link
				to={ctaHref}
				className={buttonVariants({
					variant: highlight ? "default" : "outline",
					size: "lg",
					className: "mt-6 h-11 w-full text-base",
				})}
			>
				{ctaLabel}
			</Link>

			<ul className="mt-6 flex flex-col gap-3">
				{features.map((feature) => (
					<li key={feature} className="flex items-start gap-2.5 text-sm">
						<Check className="mt-0.5 size-4 shrink-0 text-whatsapp" />
						<span className="text-foreground/90">{feature}</span>
					</li>
				))}
			</ul>

			{premiumFeatures && premiumFeatures.length > 0 ? (
				<div className="mt-6 border-t border-border/60 pt-5">
					<p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-600 uppercase">
						<Crown className="size-3.5" />
						Visibilidade Premium
					</p>
					<ul className="flex flex-col gap-3">
						{premiumFeatures.map((feature) => (
							<li key={feature} className="flex items-start gap-2.5 text-sm">
								<Check className="mt-0.5 size-4 shrink-0 text-amber-500" />
								<span className="text-foreground/90">{feature}</span>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}
