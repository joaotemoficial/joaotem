import { Link } from "react-router";

export type PromotionCardData = {
  id: string;
  title: string;
  description: string | null;
  schedule_note: string | null;
  cover_url: string | null;
  business: {
    handle: string;
    name: string;
    logo_url: string | null;
    city: { name: string; state: string } | null;
    neighborhood: { name: string } | null;
  } | null;
};

export function PromotionCard({ promotion }: { promotion: PromotionCardData }) {
  const p = promotion;
  return (
    <Link
      to={p.business ? `/negocio/${p.business.handle}` : "#"}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:border-foreground/20 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        {p.cover_url ? (
          <img
            src={p.cover_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
            sem imagem
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start gap-3">
          <div className="-mt-7 size-10 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
            {p.business?.logo_url ? (
              <img
                src={p.business.logo_url}
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
              {p.title}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {p.business?.name}
            </p>
          </div>
        </div>
        {p.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {p.description}
          </p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          {p.business?.neighborhood?.name}
          {p.business?.city
            ? ` · ${p.business.city.name} - ${p.business.city.state}`
            : ""}
          {p.schedule_note ? ` · ${p.schedule_note}` : ""}
        </p>
      </div>
    </Link>
  );
}
