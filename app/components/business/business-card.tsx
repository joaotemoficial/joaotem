import { Crown, Eye, MapPin, Truck, UserRoundCheck } from "lucide-react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router";
import { GoogleMapsPin } from "~/components/icons/google-maps-pin";
import { Badge } from "~/components/ui/badge";
import { buildDirectionsUrl } from "~/lib/maps";
import type { PlanTier } from "~/lib/plan";
import { SYSTEM_USER_ID } from "~/lib/system-user";

type BusinessCardData = {
  user_id?: string | null;
  handle: string;
  name: string;
  short_description: string | null;
  logo_path: string | null;
  cover_path: string | null;
  offers_delivery: boolean;
  plan_tier?: PlanTier | null;
  plan_expires_at?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  google_maps_url?: string | null;
  category: { name: string; slug: string } | null;
  city: { name: string; state: string; slug: string } | null;
  neighborhood: { name: string; slug: string } | null;
};

export function BusinessCard({
  business,
  logoUrl,
  coverUrl,
  hasShowcaseItems = true,
}: {
  business: BusinessCardData;
  logoUrl: string | null;
  coverUrl: string | null;
  // Whether the business has at least one item published in its vitrine.
  // An Ouro card only links to the vitrine when there's something to show;
  // otherwise it falls back to Instagram.
  hasShowcaseItems?: boolean;
}) {
  const isOuro = business.plan_tier === "ouro";
  // Only Ouro businesses have a public profile page. Básico cards must not
  // navigate anywhere on click — they expose only the WhatsApp/Instagram CTAs.
  const businessLink = `/negocio/${business.handle}`;
  const whatsappLink = business.whatsapp
    ? `https://wa.me/55${business.whatsapp}`
    : null;
  const instagramHandle = business.instagram?.replace(/^@/, "");
  const instagramLink = instagramHandle
    ? `https://instagram.com/${instagramHandle}`
    : null;
  const directionsLink = buildDirectionsUrl(business.google_maps_url);
  // Unclaimed (system-owned) businesses can be claimed by their real owner.
  const isClaimable = business.user_id === SYSTEM_USER_ID;

  // Ouro cards link to the public profile; Básico cards are inert containers.
  const wrapperClass =
    "flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-ring";
  const inner = (
    <>
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary to-[hsl(219,50%,35%)] transition-transform duration-500 group-hover:scale-105">
              <span className="select-none text-6xl font-bold text-white/70">
                {business.name.charAt(0).toUpperCase()}
              </span>
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
          {isOuro ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-[11px] font-semibold text-amber-950 shadow-sm">
              <Crown className="size-3.5" />
              Ouro
            </span>
          ) : null}
          {isClaimable || directionsLink ? (
            <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2">
              {isClaimable ? (
                <Link
                  to={`/negocio/${business.handle}/sou-dono`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-sm transition-colors hover:bg-amber-300"
                >
                  <UserRoundCheck className="size-3.5" />
                  Sou dono
                </Link>
              ) : null}
              {directionsLink ? (
                <a
                  href={directionsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#4285F4] bg-white px-3 py-1.5 text-xs font-medium text-[#4285F4] shadow-sm transition-colors"
                >
                  <GoogleMapsPin className="size-4" />
                  Como chegar
                </a>
              ) : null}
            </div>
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

        <div className="flex flex-1 flex-col gap-2 px-4 pt-2 pb-3">
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
        </div>
    </>
  );

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
      <div className={`${wrapperClass} relative`}>
        {/* Stretched link: only Ouro cards navigate to the profile. Kept as an
            empty overlay (not wrapping `inner`) so the directions chip — which
            sits above it at z-20 — stays an independent, valid anchor. */}
        {isOuro ? (
          <Link
            to={businessLink}
            aria-label={business.name}
            className="absolute inset-0 z-10"
          />
        ) : null}
        {inner}
      </div>

      <div className="flex items-stretch gap-2 px-4 pb-4">
        {whatsappLink ? (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1ebe5d]"
          >
            <FaWhatsapp className="size-4" />
            WhatsApp
          </a>
        ) : null}
        {isOuro && hasShowcaseItems ? (
          <Link
            to={businessLink}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary bg-transparent px-3 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Eye className="size-4" />
            Ver vitrine
          </Link>
        ) : instagramLink ? (
          <a
            href={instagramLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] px-3 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <FaInstagram className="size-4" />
            Instagram
          </a>
        ) : null}
      </div>
    </article>
  );
}
