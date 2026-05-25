import { Crown } from "lucide-react";
import type { PlanTier } from "~/lib/plan";

type Variant = "pill" | "solid" | "inactive";

export function PlanBadge({
	tier,
	variant = "pill",
	className,
}: {
	tier: PlanTier | null;
	variant?: Variant;
	className?: string;
}) {
	if (tier === null) {
		return (
			<span
				className={[
					"inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive",
					className ?? "",
				]
					.filter(Boolean)
					.join(" ")}
			>
				Plano inativo
			</span>
		);
	}

	if (tier === "ouro") {
		if (variant === "solid") {
			return (
				<span
					className={[
						"inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-950 shadow-sm",
						className ?? "",
					]
						.filter(Boolean)
						.join(" ")}
				>
					<Crown className="size-3.5" />
					Ouro
				</span>
			);
		}
		return (
			<span
				className={[
					"inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2 py-0.5 text-[11px] font-semibold text-amber-950 shadow-sm",
					className ?? "",
				]
					.filter(Boolean)
					.join(" ")}
			>
				<Crown className="size-3" />
				Ouro
			</span>
		);
	}

	return (
		<span
			className={[
				"inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground",
				className ?? "",
			]
				.filter(Boolean)
				.join(" ")}
		>
			Básico
		</span>
	);
}
