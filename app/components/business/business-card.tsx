import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";

type BusinessCardData = {
	handle: string;
	name: string;
	short_description: string | null;
	logo_path: string | null;
	cover_path: string | null;
	offers_delivery: boolean;
	category: { name: string; slug: string } | null;
	city: { name: string; state: string; slug: string } | null;
	neighborhood: { name: string; slug: string } | null;
};

export function BusinessCard({
	business,
	logoUrl,
	coverUrl,
}: {
	business: BusinessCardData;
	logoUrl: string | null;
	coverUrl: string | null;
}) {
	return (
		<Link
			to={`/negocio/${business.handle}`}
			className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:border-foreground/20 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
		>
			<div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
				{coverUrl ? (
					<img
						src={coverUrl}
						alt=""
						className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
						loading="lazy"
					/>
				) : (
					<div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
						Sem capa
					</div>
				)}
				{business.offers_delivery ? (
					<Badge className="absolute left-2 top-2" variant="secondary">
						Entrega
					</Badge>
				) : null}
			</div>

			<div className="flex flex-1 flex-col gap-2 p-3">
				<div className="flex items-start gap-3">
					<div className="-mt-7 size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
						{logoUrl ? (
							<img
								src={logoUrl}
								alt=""
								className="h-full w-full object-cover"
								loading="lazy"
							/>
						) : (
							<div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
								•
							</div>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<h3 className="truncate text-sm font-semibold tracking-tight">
							{business.name}
						</h3>
						<p className="truncate text-xs text-muted-foreground">
							{business.category?.name ?? "—"} •{" "}
							{business.neighborhood?.name ?? ""}
						</p>
					</div>
				</div>
				{business.short_description ? (
					<p className="line-clamp-2 text-xs text-muted-foreground">
						{business.short_description}
					</p>
				) : null}
				<p className="text-[11px] text-muted-foreground">
					{business.city?.name} - {business.city?.state}
				</p>
			</div>
		</Link>
	);
}
