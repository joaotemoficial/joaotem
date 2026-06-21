import { FaWhatsapp } from "react-icons/fa";
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
    whatsapp: string | null;
    city: { name: string; state: string } | null;
    neighborhood: { name: string } | null;
  } | null;
};

export function PromotionCard({
  promotion,
  whatsappMessage,
}: {
  promotion: PromotionCardData;
  /** When set, the WhatsApp button opens a chat pre-filled with this message. */
  whatsappMessage?: string;
}) {
  const p = promotion;
  const whatsappLink = p.business?.whatsapp
    ? `https://wa.me/55${p.business.whatsapp}${
        whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ""
      }`
    : null;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-all hover:border-foreground/20 hover:shadow-sm">
      <Link
        to={p.business ? `/negocio/${p.business.handle}` : "#"}
        className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-ring"
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
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary to-[hsl(219,50%,35%)] transition-transform duration-300 group-hover:scale-[1.02]">
              <span className="select-none text-4xl font-bold text-white/70">
                {p.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="relative z-10 flex flex-1 items-start gap-2 p-2.5">
          <div className="-mt-6 size-8 shrink-0 overflow-hidden rounded-lg border-2 border-card bg-background shadow-sm ring-1 ring-border/60">
            {p.business?.logo_url ? (
              <img
                src={p.business.logo_url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">
                •
              </div>
            )}
          </div>
          <h3 className="min-w-0 flex-1 line-clamp-2 text-xs font-semibold tracking-tight">
            {p.title}
          </h3>
        </div>
      </Link>
      {whatsappLink ? (
        <div className="px-2.5 pb-2.5">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-[#25D366] px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#1ebe5d]"
          >
            <FaWhatsapp className="size-3.5" />
            WhatsApp
          </a>
        </div>
      ) : null}
    </article>
  );
}
