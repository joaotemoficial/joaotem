import { ChevronLeft, ImageOff, ShoppingBag } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useMemo, useState } from "react";
import {
  Link,
  data,
  redirect,
  useFetcher,
  useLoaderData,
} from "react-router";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { getSessionAndProfile } from "~/lib/auth.server";
import { getBusinessCart, setBusinessCart } from "~/lib/cart.server";
import {
  type DeliveryInfo,
  type PaymentMethod,
  PAYMENT_METHODS,
  buildWhatsappOrderUrl,
} from "~/lib/checkout";
import {
  PRODUCT_IMAGE_BUCKET,
  getPublicUrl,
} from "~/lib/storage.server";
import { formatBRL } from "~/lib/validation/business";
import * as businessesRepo from "~/repositories/businesses";
import * as productsRepo from "~/repositories/products";
import { isError } from "~/types";
import type { Route } from "./+types/business-checkout";

export const meta: Route.MetaFunction = ({ data }) => {
  if (!data?.business) return [{ title: "Checkout — JoaoTem" }];
  return [{ title: `Finalizar pedido — ${data.business.name}` }];
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

  const storedCart = await getBusinessCart(request, params.handle);
  // Empty bag → nothing to check out; send the shopper back to the storefront.
  if (storedCart.length === 0) {
    throw redirect(`/negocio/${params.handle}`);
  }

  // Re-attach product thumbnails (not stored in the cookie) from a fresh fetch.
  const productsResult = await productsRepo.listPublicByBusiness({
    supabase: ctx.supabase,
    businessId: business.id,
  });
  const products = isError(productsResult) ? [] : productsResult.success;
  const imgById = new Map(
    products.map((p) => {
      const img = (p.images ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)[0];
      return [
        p.id,
        getPublicUrl(ctx.supabase, PRODUCT_IMAGE_BUCKET, img?.storage_path ?? null),
      ];
    }),
  );

  const items = storedCart.map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    selections: item.selections.map((s) => ({
      groupName: s.groupName,
      value: s.value,
    })),
    notes: item.notes,
    imageUrl: imgById.get(item.productId) ?? null,
  }));

  return {
    user: ctx.user ? { id: ctx.user.id, email: ctx.user.email ?? null } : null,
    profile: ctx.profile,
    business: {
      handle: business.handle,
      name: business.name,
      whatsapp: business.whatsapp,
      offers_delivery: business.offers_delivery,
      neighborhood: business.neighborhood?.name ?? null,
    },
    items,
  };
}

// Clears the bag for this business once the order is handed off to WhatsApp.
export async function action({ params, request }: Route.ActionArgs) {
  const setCookie = await setBusinessCart(request, params.handle, []);
  return data({ cleared: true }, { headers: { "Set-Cookie": setCookie } });
}

export default function BusinessCheckout() {
  const { user, profile, business, items } = useLoaderData<typeof loader>();
  const clearFetcher = useFetcher();

  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [mode, setMode] = useState<"delivery" | "pickup">(
    business.offers_delivery ? "delivery" : "pickup",
  );
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState(
    business.neighborhood ?? "",
  );
  const [reference, setReference] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [sent, setSent] = useState(false);

  const subtotalCents = useMemo(
    () => items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
    [items],
  );
  const totalCents = subtotalCents; // no coupon discount engine yet
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const nameMissing = customerName.trim().length === 0;
  const phoneMissing = customerPhone.replace(/\D/g, "").length < 10;
  const addressMissing =
    mode === "delivery" &&
    (street.trim().length === 0 ||
      number.trim().length === 0 ||
      neighborhood.trim().length === 0);
  const canSend = !nameMissing && !phoneMissing && !addressMissing;

  function applyCoupon() {
    const code = coupon.trim();
    // No coupon backend yet — the code is simply forwarded to the lojista in
    // the WhatsApp order so they can honor it manually.
    setCouponApplied(code.length > 0 ? code : null);
  }

  function sendOrder() {
    if (!canSend) return;
    const delivery: DeliveryInfo =
      mode === "delivery"
        ? { mode, street, number, neighborhood, reference }
        : { mode: "pickup" };

    const url = buildWhatsappOrderUrl({
      businessName: business.name,
      businessPhone: business.whatsapp,
      items,
      subtotalCents,
      totalCents,
      customerName,
      customerPhone,
      payment,
      delivery,
      notes,
      coupon: couponApplied ?? "",
    });

    window.open(url, "_blank", "noopener");
    // Hand-off done — clear the bag cookie and show the confirmation screen.
    clearFetcher.submit({}, { method: "post" });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-svh bg-background">
        <SiteHeader user={user} role={profile?.role} />
        <main className="mx-auto grid max-w-md place-items-center gap-4 px-4 py-24 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-[#25D366]/10 text-[#25D366]">
            <FaWhatsapp className="size-8" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Pedido enviado!
          </h1>
          <p className="text-sm text-muted-foreground">
            Você foi redirecionado para o WhatsApp de {business.name} para
            confirmar o pedido. Se a janela não abriu, verifique o bloqueador de
            pop-ups.
          </p>
          <Link
            to={`/negocio/${business.handle}`}
            className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
          >
            Voltar para a loja
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background pb-28">
      <SiteHeader user={user} role={profile?.role} />

      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link
          to={`/negocio/${business.handle}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ChevronLeft className="size-4" />
          Continuar comprando
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Finalizar pedido
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Você está comprando em{" "}
          <span className="font-medium text-foreground">{business.name}</span>
        </p>

        {/* Order summary */}
        <section className="mt-6 rounded-2xl border border-border/70 bg-card">
          <h2 className="border-b border-border/60 px-4 py-3 text-sm font-semibold">
            Resumo do pedido
          </h2>
          <ul className="divide-y divide-border/60">
            {items.map((item, i) => (
              <li
                key={`${item.productId}-${i}`}
                className="flex items-start gap-3 px-4 py-3"
              >
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
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
                  <p className="text-sm font-medium">
                    {item.quantity}x {item.name}
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
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatBRL(item.unitPriceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-border/60 px-4 py-3 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal ({itemCount} itens)</span>
              <span className="tabular-nums">{formatBRL(subtotalCents)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatBRL(totalCents)}</span>
            </div>
          </div>
        </section>

        {/* Coupon */}
        <section className="mt-4 rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="pb-2 text-sm font-semibold">Cupom de desconto</h2>
          <div className="flex gap-2">
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Digite seu cupom"
            />
            <Button type="button" variant="outline" onClick={applyCoupon}>
              Aplicar
            </Button>
          </div>
          {couponApplied ? (
            <p className="mt-2 text-xs text-emerald-600">
              Cupom “{couponApplied}” será enviado ao lojista para validação.
            </p>
          ) : null}
        </section>

        {/* Delivery */}
        <section className="mt-4 rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="pb-3 text-sm font-semibold">Entrega</h2>
          {business.offers_delivery ? (
            <div className="mb-3 inline-flex rounded-full border border-border/70 bg-background p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMode("delivery")}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  mode === "delivery"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Endereço de entrega
              </button>
              <button
                type="button"
                onClick={() => setMode("pickup")}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  mode === "pickup"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Retirar na loja
              </button>
            </div>
          ) : (
            <p className="mb-1 text-xs text-muted-foreground">
              Este negócio atende apenas com retirada na loja.
            </p>
          )}

          {mode === "delivery" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="block pb-1 text-xs font-medium">
                  Endereço (rua/avenida) *
                </span>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ex.: Rua das Flores"
                />
              </label>
              <label className="block">
                <span className="block pb-1 text-xs font-medium">Número *</span>
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="123"
                />
              </label>
              <label className="block">
                <span className="block pb-1 text-xs font-medium">Bairro *</span>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="block pb-1 text-xs font-medium">
                  Ponto de referência (opcional)
                </span>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex.: portão azul, ao lado da padaria"
                />
              </label>
            </div>
          ) : null}
        </section>

        {/* Customer */}
        <section className="mt-4 rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="pb-3 text-sm font-semibold">Suas informações</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block pb-1 text-xs font-medium">Nome *</span>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </label>
            <label className="block">
              <span className="block pb-1 text-xs font-medium">WhatsApp *</span>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                inputMode="tel"
                placeholder="(00) 00000-0000"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="block pb-1 text-xs font-medium">
                Observações (opcional)
              </span>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Alguma observação para o pedido?"
              />
            </label>
          </div>
        </section>

        {/* Payment */}
        <section className="mt-4 rounded-2xl border border-border/70 bg-card p-4">
          <h2 className="pb-3 text-sm font-semibold">Forma de pagamento</h2>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPayment(m.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  payment === m.value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border/70 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky checkout footer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between pb-2 text-sm">
            <span className="text-muted-foreground">Total do pedido</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatBRL(totalCents)}
            </span>
          </div>
          <button
            type="button"
            onClick={sendOrder}
            disabled={!canSend}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1ebe5d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaWhatsapp className="size-5" />
            Enviar pedido
          </button>
          <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
            <ShoppingBag className="size-3" />
            Ao enviar, você será redirecionado para o WhatsApp da loja.
          </p>
          {!canSend ? (
            <p className="mt-1 text-center text-[11px] text-destructive">
              {nameMissing
                ? "Informe seu nome."
                : phoneMissing
                  ? "Informe um WhatsApp válido."
                  : "Preencha o endereço de entrega."}
            </p>
          ) : null}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
