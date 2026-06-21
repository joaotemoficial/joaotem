import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  MapPin,
  Minus,
  Navigation,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { useMemo, useState } from "react";
import { Form, Link, data, useFetcher, useLoaderData } from "react-router";
import { PlanBadge } from "~/components/business/plan-badge";
import { PromotionCard } from "~/components/promotions/promotion-card";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { getSessionAndProfile } from "~/lib/auth.server";
import {
  cartItemsSchema,
  getBusinessCart,
  setBusinessCart,
} from "~/lib/cart.server";
import { SITE_NAME, buildMeta } from "~/lib/seo";
import { canonicalFor, getSiteOrigin } from "~/lib/seo.server";
import {
  hasFeature,
  resolveFlagsForBusiness,
} from "~/lib/feature-flags.server";
import { buildDirectionsUrl } from "~/lib/maps";
import { effectivePlanTier } from "~/lib/plan";
import {
  PRODUCT_IMAGE_BUCKET,
  PROMOTION_IMAGE_BUCKET,
  getPublicUrl,
} from "~/lib/storage.server";
import { SYSTEM_USER_ID } from "~/lib/system-user";
import { formatBRL } from "~/lib/validation/business";
import * as businessesRepo from "~/repositories/businesses";
import * as productsRepo from "~/repositories/products";
import * as promotionsRepo from "~/repositories/promotions";
import * as reclaimsRepo from "~/repositories/reclaims";
import { isError } from "~/types";
import type { Route } from "./+types/business-detail";

export const meta: Route.MetaFunction = ({ data }) => {
  const business = data?.business;
  if (!business) return [{ title: `Negócio — ${SITE_NAME}` }];

  const category = business.category?.name;
  const city = business.city
    ? `${business.city.name} - ${business.city.state}`
    : null;
  const locationLabel = [category, city ? `em ${city}` : null]
    .filter(Boolean)
    .join(" ");

  const title = locationLabel
    ? `${business.name} — ${locationLabel} | ${SITE_NAME}`
    : `${business.name} — ${SITE_NAME}`;

  const description =
    business.short_description ??
    [
      business.name,
      category ? `· ${category}` : null,
      city ? `em ${city}` : null,
      "Veja produtos, promoções e fale direto pelo WhatsApp no João Tem.",
    ]
      .filter(Boolean)
      .join(" ");

  const ldAddress = business.city
    ? {
        "@type": "PostalAddress",
        addressLocality: business.city.name,
        addressRegion: business.city.state,
        ...(business.neighborhood?.name
          ? { streetAddress: business.neighborhood.name }
          : {}),
        addressCountry: "BR",
      }
    : undefined;

  const instagramHandle = business.instagram?.replace(/^@/, "");

  return [
    ...buildMeta({
      title,
      description,
      canonical: data?.canonical,
      image: business.cover_url ?? business.logo_url,
      type: "profile",
    }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: business.name,
        ...(business.short_description
          ? { description: business.short_description }
          : {}),
        ...(data?.canonical ? { url: data.canonical } : {}),
        ...(business.logo_url ? { image: business.logo_url } : {}),
        ...(business.whatsapp ? { telephone: `+55${business.whatsapp}` } : {}),
        ...(ldAddress ? { address: ldAddress } : {}),
        ...(instagramHandle
          ? { sameAs: [`https://instagram.com/${instagramHandle}`] }
          : {}),
      },
    },
  ];
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const ctx = await getSessionAndProfile(request);
  const businessResult = await businessesRepo.getByHandle({
    supabase: ctx.supabase,
    handle: params.handle,
  });
  if (isError(businessResult))
    throw new Response(businessResult.error, { status: 500 });
  if (!businessResult.success)
    throw new Response("Negócio não encontrado", { status: 404 });

  const business = businessResult.success;

  const ownerResult = await businessesRepo.getOwnerIdByHandle({
    supabase: ctx.supabase,
    handle: params.handle,
  });
  const isSystemOwned =
    !isError(ownerResult) && ownerResult.success?.user_id === SYSTEM_USER_ID;

  const effTier = effectivePlanTier(business);
  // Only Ouro businesses have a public profile page. Básico (or expired/no
  // plan) businesses are not browsable by handle and must 404.
  if (effTier !== "ouro") {
    throw new Response("Negócio não encontrado", { status: 404 });
  }

  const flags = await resolveFlagsForBusiness({
    supabase: ctx.supabase,
    businessId: business.id,
    planTier: effTier,
  });
  const showProducts = hasFeature(flags, "vitrine_produtos");
  const showPromotions = hasFeature(flags, "promocoes_semana");
  const showSeloOuro = hasFeature(flags, "selo_ouro");

  const [productsResult, promotionsResult] = await Promise.all([
    showProducts
      ? productsRepo.listPublicByBusiness({
        supabase: ctx.supabase,
        businessId: business.id,
      })
      : Promise.resolve({ success: [] as never[] }),
    showPromotions
      ? promotionsRepo.listPublicActiveToday({
        supabase: ctx.supabase,
        businessId: business.id,
      })
      : Promise.resolve({ success: [] as never[] }),
  ]);
  const products = isError(productsResult) ? [] : productsResult.success;
  const promotions = isError(promotionsResult) ? [] : promotionsResult.success;

  let alreadyRequested = false;
  if (ctx.user && isSystemOwned) {
    const mine = await reclaimsRepo.listMineForBusiness({
      supabase: ctx.supabase,
      businessId: business.id,
      userId: ctx.user.id,
    });
    if (!isError(mine)) {
      alreadyRequested = mine.success.some((r) => r.status === "pending");
    }
  }

  // Cart is persisted in the `jt_cart` cookie, keyed by business handle.
  // Re-attach imageUrl from the freshly loaded products/promotions (not stored
  // in the cookie to keep it small); items for other businesses are untouched.
  const imgById = new Map(
    (products ?? []).map((p) => {
      const img = (p.images ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)[0];
      return [
        p.id,
        getPublicUrl(
          ctx.supabase,
          PRODUCT_IMAGE_BUCKET,
          img?.storage_path ?? null,
        ),
      ];
    }),
  );
  for (const p of promotions ?? []) {
    const cover = (p.images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    if (cover) {
      imgById.set(
        p.id,
        getPublicUrl(ctx.supabase, PROMOTION_IMAGE_BUCKET, cover.storage_path),
      );
    }
  }
  const storedCart = await getBusinessCart(request, params.handle);
  const initialCart = storedCart.map((item) => ({
    ...item,
    imageUrl: imgById.get(item.productId) ?? null,
  }));

  return {
    canonical: canonicalFor(request, `/negocio/${business.handle}`),
    origin: getSiteOrigin(request),
    user: ctx.user ? { id: ctx.user.id, email: ctx.user.email ?? null } : null,
    profile: ctx.profile,
    isSystemOwned,
    alreadyRequested,
    showSeloOuro,
    initialCart,
    business: {
      ...business,
      logo_url: getPublicUrl(
        ctx.supabase,
        "business-logos",
        business.logo_path,
      ),
      cover_url: getPublicUrl(
        ctx.supabase,
        "business-covers",
        business.cover_path,
      ),
    },
    promotions: promotions.map((p) => {
      const cover = (p.images ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)[0];
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        schedule_note: p.schedule_note,
        cover_url: cover
          ? getPublicUrl(
            ctx.supabase,
            PROMOTION_IMAGE_BUCKET,
            cover.storage_path,
          )
          : null,
      };
    }),
    products: products?.map((p) => ({
      ...p,
      images: (p.images ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((img) => ({
          id: img.id,
          url: getPublicUrl(
            ctx.supabase,
            PRODUCT_IMAGE_BUCKET,
            img.storage_path,
          ),
          alt_text: img.alt_text,
        })),
      optionGroups: (p.option_groups ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((group) => ({
          id: group.id,
          name: group.name,
          values: (group.values ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((val) => ({
              id: val.id,
              value: val.value,
              price_cents: val.price_cents,
            })),
        })),
    })),
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Cart persistence — no auth required (anonymous shoppers included).
  if (intent === "cart") {
    let raw: unknown = [];
    try {
      raw = JSON.parse(String(formData.get("cart") ?? "[]"));
    } catch {
      raw = [];
    }
    const parsed = cartItemsSchema.safeParse(raw);
    const items = parsed.success ? parsed.data : [];
    const setCookie = await setBusinessCart(request, params.handle, items);
    return data({ cartOk: true }, { headers: { "Set-Cookie": setCookie } });
  }

  const ctx = await getSessionAndProfile(request);
  if (!ctx.user) {
    return { reclaimError: "Faça login para reivindicar este negócio." };
  }

  if (intent !== "reclaim") {
    return { reclaimError: "Ação inválida." };
  }

  const ownerResult = await businessesRepo.getOwnerIdByHandle({
    supabase: ctx.supabase,
    handle: params.handle,
  });
  if (isError(ownerResult) || !ownerResult.success) {
    return { reclaimError: "Negócio não encontrado." };
  }
  if (ownerResult.success.user_id !== SYSTEM_USER_ID) {
    return { reclaimError: "Este negócio já tem um dono." };
  }

  const message = String(formData.get("message") ?? "").trim();
  const result = await reclaimsRepo.create({
    supabase: ctx.supabase,
    businessId: ownerResult.success.id,
    userId: ctx.user.id,
    message: message.length > 0 ? message : null,
  });
  if (isError(result)) {
    return { reclaimError: result.error };
  }
  return { reclaimOk: true };
}

// ---------------- types ----------------

type OptionValue = {
  id: string;
  value: string;
  price_cents: number | null;
};

type OptionGroup = {
  id: string;
  name: string;
  values: OptionValue[];
};

type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  images: {
    id: string;
    url: string | null;
    alt_text: string | null;
  }[];
  optionGroups: OptionGroup[];
};

type CartSelection = {
  groupId: string;
  groupName: string;
  valueId: string;
  value: string;
  priceCents: number;
};

type CartItem = {
  // Stable key built from productId + sorted selection valueIds + notes hash
  // so that identical selections merge into a single line.
  key: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  selections: CartSelection[];
  notes: string;
  quantity: number;
};

// ---------------- helpers ----------------

function valuePrice(value: OptionValue): number {
  return value.price_cents ?? 0;
}

function cheapestValue(group: OptionGroup): OptionValue {
  return group.values.reduce(
    (min, v) => (valuePrice(v) < valuePrice(min) ? v : min),
    group.values[0],
  );
}

function computeUnitPrice(
  product: PublicProduct,
  selectedValueIds: Record<string, string>,
): number {
  const anyPriced = product.optionGroups.some((g) =>
    g.values.some((v) => v.price_cents !== null),
  );
  if (!anyPriced) return product.price_cents;
  return product.optionGroups.reduce((sum, g) => {
    const selectedId = selectedValueIds[g.id];
    const v = g.values.find((x) => x.id === selectedId) ?? g.values[0];
    return sum + valuePrice(v);
  }, 0);
}

function buildCartKey(
  productId: string,
  selections: CartSelection[],
  notes: string,
): string {
  const ids = selections
    .map((s) => s.valueId)
    .sort()
    .join(",");
  return `${productId}|${ids}|${notes.trim()}`;
}

// ---------------- page ----------------

export default function BusinessDetail({ actionData }: Route.ComponentProps) {
  const {
    user,
    profile,
    business,
    products,
    promotions,
    isSystemOwned,
    alreadyRequested,
    showSeloOuro,
    initialCart,
  } = useLoaderData<typeof loader>();

  const whatsappLink = `https://wa.me/55${business.whatsapp}`;
  const instagramHandle = business.instagram?.replace(/^@/, "");
  const instagramLink = instagramHandle
    ? `https://instagram.com/${instagramHandle}`
    : null;
  const directionsLink = buildDirectionsUrl(business.google_maps_url);

  const [openProduct, setOpenProduct] = useState<PublicProduct | null>(null);
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Persist cart changes to the `jt_cart` cookie via the route action.
  // Local state stays the source of truth for instant UI; this just syncs.
  const persistFetcher = useFetcher();
  function persist(next: CartItem[]) {
    persistFetcher.submit(
      { intent: "cart", cart: JSON.stringify(next) },
      { method: "post" },
    );
  }

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const haystack = `${p.name} ${p.description ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, products]);

  function addToCart(item: CartItem) {
    const existing = cart.find((i) => i.key === item.key);
    const next = existing
      ? cart.map((i) =>
        i.key === item.key
          ? { ...i, quantity: i.quantity + item.quantity }
          : i,
      )
      : [...cart, item];
    setCart(next);
    persist(next);
    // Mirror seufeira: adding an item immediately opens the bag.
    setCartOpen(true);
  }

  function updateQty(key: string, delta: number) {
    const next = cart
      .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
      .filter((i) => i.quantity > 0);
    setCart(next);
    persist(next);
  }

  function removeFromCart(key: string) {
    const next = cart.filter((i) => i.key !== key);
    setCart(next);
    persist(next);
  }

  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotalCents = cart.reduce(
    (s, i) => s + i.unitPriceCents * i.quantity,
    0,
  );

  return (
    <div className="min-h-svh bg-[#F5F7FA] text-[#1F2937]">
      <SiteHeader user={user} role={profile?.role} />

      {/* Cover */}
      <div className="relative h-[198px] w-full overflow-hidden bg-[#102A43] sm:h-[255px]">
        {business.cover_url ? (
          <img
            src={business.cover_url}
            alt={`Foto de capa de ${business.name}`}
            fetchPriority="high"
            className="h-full w-full object-cover saturate-[1.05] contrast-[1.02]"
          />
        ) : null}
        {/* Navy gradient darkening toward the bottom */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#102A43]/75 via-[#102A43]/40 to-[#102A43]/5" />
      </div>

      {/* Business header */}
      <header className="relative z-[5] mx-auto -mt-11 max-w-[1180px] px-3 pb-[18px] sm:-mt-[54px] sm:px-4">
        <div className="rounded-[20px] border border-[#E5E7EB]/85 bg-white/[0.88] p-3.5 backdrop-blur-[14px] sm:rounded-3xl sm:p-[18px]">
          <div className="flex flex-row items-center gap-4">
            <div className="size-[76px] shrink-0 overflow-hidden rounded-[18px] border-[3px] border-white bg-[#EEF3F8] sm:size-[90px] sm:rounded-[22px]">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={`Logo de ${business.name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-semibold text-muted-foreground">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-[-0.04em] text-[#102A43]">
                  {business.name}
                </h1>
                {showSeloOuro ? (
                  <PlanBadge tier="ouro" variant="solid" />
                ) : null}
              </div>
              {/* Accent underline */}
              <div className="mt-[7px] h-[3px] w-[38px] rounded-full bg-[#2563EB]" />
              <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-[#64748B]">
                {business.category?.name ? (
                  <span className="font-semibold text-[#102A43]">
                    {business.category.name}
                  </span>
                ) : null}
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {business.neighborhood?.name}, {business.city?.name} -{" "}
                  {business.city?.state}
                </span>
              </p>
              {business.offers_delivery ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-emerald-50 text-emerald-700"
                  >
                    <Truck className="size-3.5" />
                    Faz entrega
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {business.short_description ? (
          <p className="mt-4 ml-2 text-sm text-[#64748B]">
            {business.short_description}
          </p>
        ) : null}

        <div className="mt-4 ml-2 flex flex-wrap items-center gap-2">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1ebe5d]"
          >
            <FaWhatsapp className="size-4" />
            WhatsApp
          </a>
          {instagramLink ? (
            <a
              href={instagramLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-linear-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] px-3 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <FaInstagram className="size-4" />
              Instagram
            </a>
          ) : null}
          {directionsLink ? (
            <a
              href={directionsLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#102A43] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1b3a5c]"
            >
              <Navigation className="size-4" />
              Como chegar
            </a>
          ) : null}
        </div>

        {isSystemOwned ? (
          <ReclaimSection
            handle={business.handle}
            loggedIn={!!user}
            alreadyRequested={alreadyRequested}
            actionData={actionData}
          />
        ) : null}
      </header>

      <main className="mx-auto max-w-[1180px] px-3 pt-1.5 pb-[120px] sm:px-4">
        {products.length > 0 ? (
          <div className="pt-6">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#64748B]" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produto…"
                className="h-12 rounded-2xl border-[#E5E7EB] bg-white pl-9 focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/10"
              />
            </div>
          </div>
        ) : null}

        <section id="cardapio" className="scroll-mt-28 pt-[18px]">
          {/* Storefront title */}
          <div className="mb-4">
            <span className="inline-flex items-center rounded-full bg-[#2563EB]/[0.09] px-2.5 py-1.5 text-[11px] font-extrabold tracking-[0.04em] text-[#2563EB] uppercase">
              Vitrine da loja
            </span>
            <h2 className="mt-2.5 text-[clamp(22px,4vw,32px)] leading-none font-black tracking-[-0.05em] text-[#102A43]">
              Produtos disponíveis
            </h2>
            <p className="mt-2 max-w-[560px] text-sm text-[#64748B]">
              Veja os produtos da loja e adicione à sacola para finalizar o
              pedido direto pelo João Tem.
            </p>
          </div>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-10 text-center">
              <p className="text-sm text-[#64748B]">
                Este negócio ainda não cadastrou produtos.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-10 text-center">
              <p className="text-sm text-[#64748B]">
                Nenhum produto encontrado para "{query.trim()}".
              </p>
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={() => setOpenProduct(p)}
                />
              ))}
            </ul>
          )}
        </section>

        {promotions.length > 0 ? (
          <section id="promocoes" className="scroll-mt-28 pt-12">
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full bg-[#2563EB]/[0.09] px-2.5 py-1.5 text-[11px] font-extrabold tracking-[0.04em] text-[#2563EB] uppercase">
                Ofertas
              </span>
              <h2 className="mt-2.5 text-[clamp(22px,4vw,32px)] leading-none font-black tracking-[-0.05em] text-[#102A43]">
                Promoções de hoje
              </h2>
              <p className="mt-2 max-w-[560px] text-sm text-[#64748B]">
                Aproveite as ofertas da loja e chame no WhatsApp para garantir a
                sua.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {promotions.map((p) => (
                <li key={p.id}>
                  <PromotionCard
                    promotion={{
                      id: p.id,
                      title: p.title,
                      description: p.description,
                      schedule_note: p.schedule_note,
                      cover_url: p.cover_url,
                      business: {
                        handle: business.handle,
                        name: business.name,
                        logo_url: business.logo_url,
                        whatsapp: business.whatsapp,
                        city: business.city,
                        neighborhood: business.neighborhood,
                      },
                    }}
                    whatsappMessage={`Olá! Tenho interesse na promoção "${p.title}" da ${business.name}. Pode me passar mais detalhes? 😊`}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="pt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            <ChevronLeft className="size-4" />
            Ver mais negócios
          </Link>
        </div>
      </main>

      <BusinessResponsibilityFooter business={business} />
      <SiteFooter />

      {/* Product modal */}
      <Dialog
        open={!!openProduct}
        onOpenChange={(v) => !v && setOpenProduct(null)}
      >
        {openProduct ? (
          <ProductDetailModal
            product={openProduct}
            onClose={() => setOpenProduct(null)}
            onAdd={(item) => {
              addToCart(item);
              setOpenProduct(null);
            }}
          />
        ) : null}
      </Dialog>

      {/* Cart modal */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <CartModal
          items={cart}
          subtotalCents={subtotalCents}
          businessHandle={business.handle}
          onIncrement={(k) => updateQty(k, +1)}
          onDecrement={(k) => updateQty(k, -1)}
          onRemove={removeFromCart}
          onClose={() => setCartOpen(false)}
        />
      </Dialog>

      {/* Floating cart bar */}
      {itemCount > 0 ? (
        <FloatingCartBar
          itemCount={itemCount}
          subtotalCents={subtotalCents}
          onOpen={() => setCartOpen(true)}
        />
      ) : null}
    </div>
  );
}

// ---------------- product row ----------------

function ProductCard({
  product,
  onClick,
}: {
  product: PublicProduct;
  onClick: () => void;
}) {
  const cover = product.images[0];
  const anyPriced = product.optionGroups.some((g) =>
    g.values.some((v) => v.price_cents !== null),
  );
  const variantPrices = product.optionGroups
    .flatMap((g) => g.values.map((v) => v.price_cents))
    .filter((p): p is number => p !== null);
  const minPrice = anyPriced
    ? Math.min(
      ...(variantPrices.length ? variantPrices : [product.price_cents]),
    )
    : product.price_cents;
  const showFrom =
    anyPriced && variantPrices.length > 1 && new Set(variantPrices).size > 1;

  return (
    <li className="group flex flex-col overflow-hidden rounded-[17px] border border-[#E5E7EB] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2563EB]/45 sm:rounded-[20px]">
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 flex-col text-left"
      >
        <div className="aspect-square w-full overflow-hidden bg-[#EEF3F8]">
          {cover?.url ? (
            <img
              src={cover.url}
              alt={cover.alt_text ?? product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2563EB] to-[hsl(219,50%,35%)] transition-transform duration-300 group-hover:scale-[1.03]">
              <span className="select-none text-5xl font-bold text-white/70">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          <p className="line-clamp-1 text-xs font-extrabold tracking-[-0.02em] text-[#1F2937] sm:text-[13px]">
            {product.name}
          </p>
          {product.description ? (
            <p className="line-clamp-2 text-xs text-[#64748B]">
              {product.description}
            </p>
          ) : null}
          <p className="mt-auto pt-1 text-sm font-black text-[#2563EB] sm:text-[15px]">
            {showFrom ? (
              <span className="text-xs font-normal text-[#64748B]">
                a partir de{" "}
              </span>
            ) : null}
            {formatBRL(minPrice)}
          </p>
        </div>
      </button>
      <div className="px-2.5 pb-2.5">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-[34px] w-full items-center justify-center gap-1 rounded-[13px] border-[1.5px] border-[#2563EB] bg-transparent px-1.5 text-[11px] font-extrabold text-[#2563EB] transition-all duration-200 hover:bg-[#2563EB] hover:text-white sm:h-[37px] sm:text-sm"
        >
          <Plus className="size-4" />
          Adicionar
        </button>
      </div>
    </li>
  );
}

// ---------------- product detail modal ----------------

function ProductDetailModal({
  product,
  onClose,
  onAdd,
}: {
  product: PublicProduct;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}) {
  const cover = product.images[0];

  const staticGroups = product.optionGroups.filter(
    (g) => g.values.length === 1,
  );
  const selectableGroups = product.optionGroups.filter(
    (g) => g.values.length >= 2,
  );

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of selectableGroups) init[g.id] = cheapestValue(g).id;
    return init;
  });
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const allSelections: Record<string, string> = useMemo(() => {
    const all: Record<string, string> = { ...selected };
    for (const g of staticGroups) all[g.id] = g.values[0].id;
    return all;
  }, [selected, staticGroups]);

  const unitPrice = computeUnitPrice(product, allSelections);
  const total = unitPrice * quantity;

  function handleAdd() {
    const selections: CartSelection[] = product.optionGroups
      .filter((g) => g.values.length >= 2 || g.values[0]?.price_cents !== null)
      .map((g) => {
        const v =
          g.values.find((x) => x.id === allSelections[g.id]) ?? g.values[0];
        return {
          groupId: g.id,
          groupName: g.name,
          valueId: v.id,
          value: v.value,
          priceCents: v.price_cents ?? 0,
        };
      });
    const item: CartItem = {
      key: buildCartKey(product.id, selections, notes),
      productId: product.id,
      name: product.name,
      imageUrl: cover?.url ?? null,
      unitPriceCents: unitPrice,
      selections,
      notes: notes.trim(),
      quantity,
    };
    onAdd(item);
  }

  return (
    <DialogContent
      showCloseButton={false}
      className="max-w-lg overflow-hidden p-0 sm:max-w-lg"
    >
      <DialogTitle className="sr-only">{product.name}</DialogTitle>

      <div className="relative">
        <div className="aspect-video w-full overflow-hidden bg-muted">
          {cover?.url ? (
            <img
              src={cover.url}
              alt={cover.alt_text ?? product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <ImageOff className="size-8" />
            </div>
          )}
        </div>
        <DialogClose
          render={
            <button
              type="button"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
              aria-label="Fechar"
            />
          }
        >
          <X className="size-4" />
        </DialogClose>
      </div>

      <div className="max-h-[60svh] space-y-4 overflow-y-auto px-5 pt-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            {product.name}
          </h3>
          {product.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {product.description}
            </p>
          ) : null}
        </div>

        {staticGroups.length > 0 ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {staticGroups.map((g) => (
              <div key={g.id} className="contents">
                <dt className="font-medium">{g.name}:</dt>
                <dd>{g.values[0].value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {selectableGroups.map((group) => (
          <fieldset key={group.id}>
            <legend className="pb-2 text-sm font-semibold">{group.name}</legend>
            <div className="flex flex-col gap-1 overflow-hidden rounded-xl border border-border/70">
              {group.values.map((value) => {
                const checked = value.id === selected[group.id];
                return (
                  <label
                    key={value.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors ${checked ? "bg-primary/5" : "hover:bg-muted/40"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name={`group-${group.id}`}
                        value={value.id}
                        checked={checked}
                        onChange={() =>
                          setSelected((prev) => ({
                            ...prev,
                            [group.id]: value.id,
                          }))
                        }
                        className="size-4 accent-primary"
                      />
                      <span>{value.value}</span>
                    </span>
                    {value.price_cents !== null ? (
                      <span className="text-sm font-medium text-muted-foreground">
                        {formatBRL(value.price_cents)}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div>
          <label
            htmlFor="product-notes"
            className="block pb-1.5 text-sm font-semibold"
          >
            Alguma observação?
          </label>
          <Textarea
            id="product-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Adicione alguma informação sobre o pedido"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border/60 bg-background p-4">
        <div className="inline-flex items-center rounded-full border border-border/70">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="grid size-9 place-items-center rounded-l-full text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            aria-label="Diminuir quantidade"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="grid size-9 place-items-center rounded-r-full text-foreground transition-colors hover:bg-muted"
            aria-label="Aumentar quantidade"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <Button
          onClick={handleAdd}
          className="h-11 flex-1 rounded-full text-sm"
          size="lg"
        >
          Adicionar · {formatBRL(total)}
        </Button>
      </div>
    </DialogContent>
  );
}

// ---------------- floating cart bar ----------------

function FloatingCartBar({
  itemCount,
  subtotalCents,
  onOpen,
}: {
  itemCount: number;
  subtotalCents: number;
  onOpen: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={onOpen}
          className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-[18px] bg-[#2563EB] px-4 py-3 text-white transition-all hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
        >
          <span className="inline-flex items-center gap-2.5">
            <span className="relative">
              <ShoppingBag className="size-5" />
              <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-white text-[10px] font-semibold text-[#2563EB]">
                {itemCount}
              </span>
            </span>
            <span className="text-sm font-semibold">Ver sacola</span>
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatBRL(subtotalCents)}
            <ChevronRight className="ml-1 inline size-4" />
          </span>
        </button>
      </div>
    </div>
  );
}

// ---------------- cart modal ----------------

function CartModal({
  items,
  subtotalCents,
  businessHandle,
  onIncrement,
  onDecrement,
  onRemove,
  onClose,
}: {
  items: CartItem[];
  subtotalCents: number;
  businessHandle: string;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onRemove: (key: string) => void;
  onClose: () => void;
}) {
  const isEmpty = items.length === 0;

  return (
    <DialogContent
      showCloseButton={false}
      className="flex max-h-[90svh] max-w-lg flex-col overflow-hidden p-0 duration-300 ease-out data-open:zoom-in-95 data-open:slide-in-from-bottom-4 data-closed:zoom-out-95 data-closed:slide-out-to-bottom-2 sm:max-w-lg"
    >
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
          <ShoppingBag className="size-4" />
          Sua sacola
        </DialogTitle>
        <DialogClose
          render={
            <button
              type="button"
              aria-label="Fechar"
              className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            />
          }
        >
          <X className="size-4" />
        </DialogClose>
      </div>

      {isEmpty ? (
        <div className="grid place-items-center gap-3 px-6 py-12 text-center">
          <ShoppingBag className="size-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Sua sacola está vazia</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Escolha itens no cardápio para começar seu pedido.
            </p>
          </div>
          <Button variant="outline" onClick={onClose} className="mt-2">
            Voltar ao cardápio
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border/60 overflow-y-auto">
            {items.map((item) => (
              <li key={item.key} className="flex items-start gap-3 px-5 py-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <ImageOff className="size-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">
                    {item.name}
                  </p>
                  {item.selections.length > 0 ? (
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {item.selections
                        .map((s) => `${s.groupName}: ${s.value}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {item.notes ? (
                    <p className="line-clamp-1 text-xs text-muted-foreground italic">
                      Obs: {item.notes}
                    </p>
                  ) : null}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-full border border-border/70">
                      <button
                        type="button"
                        onClick={() =>
                          item.quantity > 1
                            ? onDecrement(item.key)
                            : onRemove(item.key)
                        }
                        className="grid size-7 place-items-center text-foreground hover:bg-muted"
                        aria-label="Diminuir"
                      >
                        {item.quantity > 1 ? (
                          <Minus className="size-3.5" />
                        ) : (
                          <Trash2 className="size-3.5 text-destructive" />
                        )}
                      </button>
                      <span className="w-6 text-center text-xs font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onIncrement(item.key)}
                        className="grid size-7 place-items-center text-foreground hover:bg-muted"
                        aria-label="Aumentar"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatBRL(item.unitPriceCents * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-3 border-t border-border/60 bg-muted/30 px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="text-base font-semibold tabular-nums">
                {formatBRL(subtotalCents)}
              </span>
            </div>

            <Link
              to={`/negocio/${businessHandle}/checkout`}
              onClick={onClose}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1ebe5d]"
            >
              <FaWhatsapp className="size-4" />
              Finalizar pedido
            </Link>
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full rounded-full"
            >
              Continuar comprando
            </Button>
          </div>
        </>
      )}
    </DialogContent>
  );
}

// ---------------- reclaim ----------------

function ReclaimSection({
  handle,
  loggedIn,
  alreadyRequested,
  actionData,
}: {
  handle: string;
  loggedIn: boolean;
  alreadyRequested: boolean;
  actionData:
  | { reclaimOk?: boolean; reclaimError?: string; cartOk?: boolean }
  | undefined;
}) {
  if (!loggedIn) {
    return (
      <section className="mt-6 rounded-2xl border border-border/70 bg-card p-4">
        <p className="text-sm font-medium">É este o seu negócio?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Faça login para reivindicar a propriedade deste cadastro.
        </p>
        <Link
          to={`/login?next=${encodeURIComponent(`/negocio/${handle}`)}`}
          className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3`}
        >
          Entrar para reivindicar
        </Link>
      </section>
    );
  }

  if (alreadyRequested || actionData?.reclaimOk) {
    return (
      <section className="mt-6 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4">
        <p className="text-sm font-medium">Solicitação enviada</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Sua reivindicação está em análise. Você será notificado quando um
          administrador revisar.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-sm font-medium">É este o seu negócio?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Envie uma reivindicação para que um administrador atribua este cadastro
        à sua conta.
      </p>
      <Form method="post" className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="intent" value="reclaim" />
        <Textarea
          name="message"
          rows={3}
          maxLength={500}
          placeholder="Mensagem opcional (ex.: prove que é o dono)…"
        />
        {actionData?.reclaimError ? (
          <p className="text-xs text-destructive">{actionData.reclaimError}</p>
        ) : null}
        <div>
          <Button type="submit" size="sm">
            Reclamar este negócio
          </Button>
        </div>
      </Form>
    </section>
  );
}

// ---------------- responsibility subfooter ----------------

// Brazilian phone digits → (DD) 9XXXX-XXXX / (DD) XXXX-XXXX.
function formatBrPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

type SubfooterBusiness = {
  name: string;
  whatsapp: string;
  neighborhood: { name: string } | null;
  city: { name: string; state: string } | null;
};

function BusinessResponsibilityFooter({
  business,
}: {
  business: SubfooterBusiness;
}) {
  const location = [
    business.neighborhood?.name,
    business.city ? `${business.city.name} - ${business.city.state}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="border-t border-[#E5E7EB] bg-[#F5F7FA] px-4 py-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-wide text-[#2563EB]">
          Dados do lojista responsável pela venda
        </p>
        <div className="mt-3 space-y-1.5">
          <p className="flex items-center justify-center gap-1.5 text-base text-foreground">
            <Store className="size-4 text-muted-foreground" />
            {business.name}
          </p>
          {location ? (
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {location}
            </p>
          ) : null}
          {business.whatsapp ? (
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="size-4" />
              {formatBrPhone(business.whatsapp)}
            </p>
          ) : null}
        </div>
        <p className="mx-auto mt-5 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
          O JoaoTem é uma plataforma de divulgação e conexão digital entre
          consumidores e lojistas parceiros. A venda, o pagamento, a entrega e a
          responsabilidade pelos produtos são exclusivamente do lojista
          identificado acima.
        </p>
      </div>
    </section>
  );
}
