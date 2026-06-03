import { Check, Crown, Sparkles, Star, X } from "lucide-react";
import { Link } from "react-router";
import { buttonVariants } from "~/components/ui/button";
import type { PlanTier } from "~/lib/plan";
import { cn } from "~/lib/utils";

export type PlanPricingCardProps = {
	tier: PlanTier;
	name: string;
	price: string;
	period: string;
	tagline: string;
	/** Base features included in this plan (rendered with a check). */
	features: string[];
	/** Base features NOT included in this plan (rendered muted, with an ✕). */
	excludedFeatures?: string[];
	/** Premium ("Visibilidade Premium") features. */
	premiumFeatures?: string[];
	/** When true, the premium block is shown as a locked/unavailable upsell. */
	premiumLocked?: boolean;
	premiumSubtitle?: string;
	highlight?: boolean;
	badge?: string;
	ctaLabel: string;
	ctaHref: string;
};

export function PlanPricingCard({
	name,
	price,
	period,
	tagline,
	features,
	excludedFeatures,
	premiumFeatures,
	premiumLocked = false,
	premiumSubtitle,
	highlight = false,
	badge,
	ctaLabel,
	ctaHref,
}: PlanPricingCardProps) {
	return (
		<div
			className={cn(
				"relative flex h-full flex-col rounded-3xl border bg-card p-6 transition-all sm:p-8",
				highlight
					? "border-primary/50 shadow-xl ring-1 ring-primary/30"
					: "border-border/70 shadow-sm hover:shadow-md",
			)}
		>
			{badge ? (
				<span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
					<Sparkles className="size-3.5" />
					{badge}
				</span>
			) : null}

			{/* Header */}
			<div className="text-center">
				<h3 className="text-xl font-bold tracking-tight text-foreground">
					{name}
				</h3>
				<p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-primary">
					{tagline}
				</p>
				<div className="mt-5 flex items-end justify-center gap-1">
					<span className="text-4xl font-bold tracking-tight text-foreground">
						{price}
					</span>
					<span className="pb-1.5 text-sm text-muted-foreground">{period}</span>
				</div>
			</div>

			{/* Base features */}
			<ul className="mt-7 flex flex-col gap-3.5 border-t border-border/60 pt-6">
				{features.map((feature) => (
					<li key={feature} className="flex items-start gap-2.5 text-sm">
						<Check className="mt-0.5 size-4 shrink-0 text-whatsapp" />
						<span className="text-foreground/90">{feature}</span>
					</li>
				))}
				{excludedFeatures?.map((feature) => (
					<li
						key={feature}
						className="flex items-start gap-2.5 text-sm text-muted-foreground/70"
					>
						<X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
						<span className="line-through decoration-muted-foreground/30">
							{feature}
						</span>
					</li>
				))}
			</ul>

			{/* Premium block */}
			{premiumFeatures && premiumFeatures.length > 0 ? (
				<div
					className={cn(
						"mt-6 rounded-2xl border p-4",
						premiumLocked
							? "border-dashed border-border/70 bg-muted/40"
							: "border-amber-200 bg-amber-50/60",
					)}
				>
					<p
						className={cn(
							"inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase",
							premiumLocked ? "text-muted-foreground" : "text-amber-600",
						)}
					>
						<Crown className="size-3.5" />
						Visibilidade Premium
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{premiumLocked
							? "Disponível no plano Ouro"
							: (premiumSubtitle ??
								"Mais exposição e destaque no ecossistema João Tem.")}
					</p>
					<ul className="mt-3 flex flex-col gap-2.5">
						{premiumFeatures.map((feature) => (
							<li
								key={feature}
								className={cn(
									"flex items-start gap-2.5 text-sm",
									premiumLocked && "text-muted-foreground/70",
								)}
							>
								<Star
									className={cn(
										"mt-0.5 size-4 shrink-0",
										premiumLocked
											? "text-muted-foreground/40"
											: "fill-amber-400 text-amber-500",
									)}
								/>
								<span className={premiumLocked ? "" : "text-foreground/90"}>
									{feature}
								</span>
							</li>
						))}
					</ul>
				</div>
			) : null}

			{/* CTA */}
			<Link
				to={ctaHref}
				className={cn(
					buttonVariants({ variant: "outline", size: "lg" }),
					"mt-6 h-12 w-full rounded-xl text-base",
					highlight
						? "border-transparent bg-orange-500 text-white hover:bg-orange-600"
						: "border-primary/30 text-primary hover:bg-primary/5 hover:text-primary",
				)}
			>
				{ctaLabel}
			</Link>
		</div>
	);
}
