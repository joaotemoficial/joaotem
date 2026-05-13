import { Crown, ImageOff, MapPin, Truck } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import type { PlanTier } from "~/lib/plan";

type BusinessCardData = {
  handle: string;
  name: string;
  short_description: string | null;
  logo_path: string | null;
  cover_path: string | null;
  offers_delivery: boolean;
  plan_tier?: PlanTier | null;
  plan_expires_at?: string | null;
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
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center gap-1 text-xs text-muted-foreground">
            <ImageOff className="size-6 opacity-50" />
            Sem capa
          </div>
        )}
        {business.offers_delivery ? (
          <Badge
            className="absolute right-3 top-3 gap-1 border-transparent bg-background/95 px-2 py-1 text-foreground shadow-sm backdrop-blur"
            variant="secondary"
          >
            <Truck className="size-3.5" />
            Entrega
          </Badge>
        ) : null}
        {business.plan_tier === "ouro" ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-[11px] font-semibold text-amber-950 shadow-sm">
            <Crown className="size-3.5" />
            Ouro
          </span>
        ) : null}
      </div>

      <div className="relative px-4">
        <div className="-mt-9 size-16 overflow-hidden rounded-2xl border-2 border-card bg-background shadow-sm ring-1 ring-border/60">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-sm font-medium text-muted-foreground">
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pt-2 pb-4">
        <h3 className="line-clamp-1 text-base font-semibold tracking-tight">
          {business.name}
        </h3>

        <div className="flex flex-wrap items-center gap-1.5">
          {business.category?.name ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {business.category.name}
            </span>
          ) : null}
          {business.neighborhood?.name ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {business.neighborhood.name}
            </span>
          ) : null}
        </div>

        {business.short_description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {business.short_description}
          </p>
        ) : null}

        {business.city ? (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {business.city.name} - {business.city.state}
          </p>
        ) : null}

        <span className="mt-auto inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors group-hover:bg-primary/90">
          Ver empresa
        </span>
      </div>
    </Link>
  );
}
