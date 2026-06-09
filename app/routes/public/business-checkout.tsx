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
      <div className="min-h-svh bg-[#F5F7FA] text-[#1F2937]">
        <SiteHeader user={user} role={profile?.role} />
        <main className="mx-auto grid max-w-md place-items-center gap-4 px-4 py-24 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-[#25D366]/10 text-[#25D366]">
            <FaWhatsapp className="size-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#102A43]">
            Pedido enviado!
          </h1>
          <p className="text-sm text-slate-500">
            Você foi redirecionado para o WhatsApp de {business.name} para
            confirmar o pedido. Se a janela não abriu, verifique o bloqueador de
            pop-ups.
          </p>
          <Link
            to={`/negocio/${business.handle}`}
            className="mt-2 text-sm font-semibold text-[#2563EB] underline-offset-4 hover:underline"
          >
            Voltar para a loja
          </Link>
        </main>
        <SiteFooter className="mt-0 bg-[#F5F7FA]" />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[#F5F7FA] text-[#1F2937]">
      <SiteHeader user={user} role={profile?.role} />

      <main className="mx-auto max-w-[760px] px-4 pt-8 pb-36">
        <Link
          to={`/negocio/${business.handle}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-semibold text-[#102A43] transition-colors hover:border-[#cbd5e1]"
        >
          <ChevronLeft className="size-4" />
          Continuar comprando
        </Link>

        <h1 className="mt-6 text-[clamp(30px,5vw,40px)] font-[760] leading-[1.05] tracking-[-0.045em] text-[#102A43] after:mt-[11px] after:block after:h-[3px] after:w-[42px] after:rounded-full after:bg-[#2563EB] after:content-['']">
          Finalizar pedido
        </h1>
        <p className="mt-3 text-[15px] text-slate-500">
          Você está comprando em{" "}
          <span className="font-[650] text-[#102A43]">{business.name}</span>
        </p>

        {/* Order summary */}
        <section className="mt-[26px] overflow-hidden rounded-[22px] border border-[#E5E7EB] bg-white">
          <h2 className="border-b border-[#E5E7EB] px-[18px] py-4 text-sm font-[680] tracking-[-0.01em] text-[#102A43]">
            Resumo do pedido
          </h2>
          <ul className="divide-y divide-[#E5E7EB]">
            {items.map((item, i) => (
              <li
                key={`${item.productId}-${i}`}
                className="flex items-start gap-3 px-[18px] py-4"
              >
                <div className="size-[68px] shrink-0 overflow-hidden rounded-[17px] border border-[#E5E7EB] bg-[#EEF3F8]">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-slate-400">
                      <ImageOff className="size-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-[650] text-[#102A43]">
                    {item.quantity}x {item.name}
                  </p>
                  {item.selections.length > 0 ? (
                    <p className="line-clamp-1 text-xs text-slate-500">
                      {item.selections
                        .map((s) => `${s.groupName}: ${s.value}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {item.notes ? (
                    <p className="line-clamp-1 text-xs text-slate-500 italic">
                      Obs: {item.notes}
                    </p>
                  ) : null}
                </div>
                <span className="text-sm font-bold text-[#102A43] tabular-nums">
                  {formatBRL(item.unitPriceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[#E5E7EB] bg-[#F8FAFC] px-[18px] py-4 text-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span>Subtotal ({itemCount} itens)</span>
              <span className="tabular-nums">{formatBRL(subtotalCents)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-[#E5E7EB] pt-2 text-base font-[650] text-[#102A43]">
              <span>Total</span>
              <span className="tabular-nums">{formatBRL(totalCents)}</span>
            </div>
          </div>
        </section>

        {/* Coupon */}
        <section className="mt-4 rounded-[22px] border border-[#E5E7EB] bg-white p-4">
          <h2 className="pb-2 text-sm font-[680] tracking-[-0.01em] text-[#102A43]">
            Cupom de desconto
          </h2>
          <div className="flex gap-2">
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Digite seu cupom"
              className="h-11 rounded-[14px] border-[#E5E7EB] bg-white"
            />
            <Button
              type="button"
              variant="outline"
              onClick={applyCoupon}
              className="h-11 rounded-[14px] border-[1.5px] border-[#2563EB] bg-transparent px-4 font-[650] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
            >
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
        <section className="mt-4 rounded-[22px] border border-[#E5E7EB] bg-white p-4">
          <h2 className="pb-3 text-sm font-[680] tracking-[-0.01em] text-[#102A43]">
            Entrega
          </h2>
          {business.offers_delivery ? (
            <div className="mb-3 inline-flex rounded-full border border-[#E5E7EB] bg-[#F5F7FA] p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMode("delivery")}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  mode === "delivery"
                    ? "bg-[#2563EB] text-white"
                    : "text-slate-500"
                }`}
              >
                Endereço de entrega
              </button>
              <button
                type="button"
                onClick={() => setMode("pickup")}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  mode === "pickup"
                    ? "bg-[#2563EB] text-white"
                    : "text-slate-500"
                }`}
              >
                Retirar na loja
              </button>
            </div>
          ) : (
            <p className="mb-1 text-xs text-slate-500">
              Este negócio atende apenas com retirada na loja.
            </p>
          )}

          {mode === "delivery" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="block pb-1 text-xs font-semibold text-[#102A43]">
                  Endereço (rua/avenida) *
                </span>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ex.: Rua das Flores"
                  className="h-11 rounded-[14px] border-[#E5E7EB] bg-white"
                />
              </label>
              <label className="block">
                <span className="block pb-1 text-xs font-semibold text-[#102A43]">
                  Número *
                </span>
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="123"
                  className="h-11 rounded-[14px] border-[#E5E7EB] bg-white"
                />
              </label>
              <label className="block">
                <span className="block pb-1 text-xs font-semibold text-[#102A43]">
                  Bairro *
                </span>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  className="h-11 rounded-[14px] border-[#E5E7EB] bg-white"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="block pb-1 text-xs font-semibold text-[#102A43]">
                  Ponto de referência (opcional)
                </span>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex.: portão azul, ao lado da padaria"
                  className="h-11 rounded-[14px] border-[#E5E7EB] bg-white"
                />
              </label>
            </div>
          ) : null}
        </section>

        {/* Customer */}
        <section className="mt-4 rounded-[22px] border border-[#E5E7EB] bg-white p-4">
          <h2 className="pb-3 text-sm font-[680] tracking-[-0.01em] text-[#102A43]">
            Suas informações
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block pb-1 text-xs font-semibold text-[#102A43]">
                Nome *
              </span>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Seu nome completo"
                className="h-11 rounded-[14px] border-[#E5E7EB] bg-white"
              />
            </label>
            <label className="block">
              <span className="block pb-1 text-xs font-semibold text-[#102A43]">
                WhatsApp *
              </span>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                inputMode="tel"
                placeholder="(00) 00000-0000"
                className="h-11 rounded-[14px] border-[#E5E7EB] bg-white"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="block pb-1 text-xs font-semibold text-[#102A43]">
                Observações (opcional)
              </span>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Alguma observação para o pedido?"
                className="min-h-[84px] rounded-[14px] border-[#E5E7EB] bg-white"
              />
            </label>
          </div>
        </section>

        {/* Payment */}
        <section className="mt-4 rounded-[22px] border border-[#E5E7EB] bg-white p-4">
          <h2 className="pb-3 text-sm font-[680] tracking-[-0.01em] text-[#102A43]">
            Forma de pagamento
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPayment(m.value)}
                className={`h-12 rounded-[15px] border px-3 text-sm font-semibold transition-colors ${
                  payment === m.value
                    ? "border-[#2563EB] bg-[#2563EB]/[0.08] text-[#102A43]"
                    : "border-[#E5E7EB] bg-white text-slate-500 hover:bg-[#F8FAFC]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky checkout footer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E7EB] bg-[#F5F7FA]/95 backdrop-blur-md">
        <div className="mx-auto max-w-[760px] px-4 py-3">
          <div className="flex items-center justify-between pb-2 text-sm">
            <span className="text-slate-500">Total do pedido</span>
            <span className="text-lg font-bold tracking-[-0.02em] text-[#102A43] tabular-nums">
              {formatBRL(totalCents)}
            </span>
          </div>
          <button
            type="button"
            onClick={sendOrder}
            disabled={!canSend}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#25D366] text-sm font-bold text-white transition-colors hover:bg-[#1ebe5d] disabled:cursor-not-allowed disabled:bg-[#94A3B8] disabled:opacity-[0.58]"
          >
            <FaWhatsapp className="size-5" />
            Enviar pedido
          </button>
          <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-slate-500">
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

      <SiteFooter className="mt-0 bg-[#F5F7FA]" />
    </div>
  );
}
