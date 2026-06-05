import { formatBRL } from "~/lib/validation/business";

// Shared, client-safe checkout helpers used by both the storefront bag
// (business-detail.tsx) and the dedicated checkout route
// (business-checkout.tsx). The "order" is never persisted server-side — like
// seufeira, the formatted WhatsApp message *is* the order.

export type CheckoutSelection = { groupName: string; value: string };

export type CheckoutItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  selections: CheckoutSelection[];
  notes: string;
  imageUrl: string | null;
};

export const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "credito", label: "Cartão de Crédito" },
  { value: "debito", label: "Cartão de Débito" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export function paymentLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

export type DeliveryInfo =
  | { mode: "pickup" }
  | {
      mode: "delivery";
      street: string;
      number: string;
      neighborhood: string;
      reference: string;
    };

// Builds the WhatsApp order message (uses *bold* / _italic_ markup that
// WhatsApp renders) and returns the full wa.me deep link.
export function buildWhatsappOrderUrl(args: {
  businessName: string;
  businessPhone: string;
  items: CheckoutItem[];
  subtotalCents: number;
  totalCents: number;
  customerName: string;
  customerPhone: string;
  payment: PaymentMethod;
  delivery: DeliveryInfo;
  notes: string;
  coupon: string;
}): string {
  const {
    businessName,
    businessPhone,
    items,
    subtotalCents,
    totalCents,
    customerName,
    customerPhone,
    payment,
    delivery,
    notes,
    coupon,
  } = args;

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const lines: string[] = [];

  lines.push(`Olá! Meu nome é *${customerName.trim()}*`);
  lines.push("");
  lines.push(`Gostaria de fazer o pedido abaixo em *${businessName}*:`);
  lines.push("");
  lines.push("------------");
  for (const item of items) {
    const opts =
      item.selections.length > 0
        ? ` (${item.selections
            .map((s) => `${s.groupName}: ${s.value}`)
            .join(", ")})`
        : "";
    lines.push(`*${item.name}*${opts}`);
    lines.push(`*Quantidade:* ${item.quantity}`);
    lines.push(
      `*Valor:* ${formatBRL(item.unitPriceCents * item.quantity)}`,
    );
    if (item.notes) lines.push(`_Obs: ${item.notes}_`);
    lines.push("------------");
  }
  lines.push("");
  lines.push(`*Total de itens:* ${itemCount}`);
  if (coupon.trim()) lines.push(`*Cupom:* ${coupon.trim()}`);
  if (subtotalCents !== totalCents)
    lines.push(`*Subtotal:* ${formatBRL(subtotalCents)}`);
  lines.push(`*Valor total:* ${formatBRL(totalCents)}`);
  lines.push(`*Pagamento:* ${paymentLabel(payment)}`);
  if (notes.trim()) {
    lines.push("*Observação:*");
    lines.push(notes.trim());
  }
  lines.push("");
  lines.push("*Entrega:*");
  if (delivery.mode === "pickup") {
    lines.push("Retirar na loja");
  } else {
    lines.push(
      `${delivery.street.trim()}, ${delivery.number.trim()} - ${delivery.neighborhood.trim()}`,
    );
    if (delivery.reference.trim())
      lines.push(`Referência: ${delivery.reference.trim()}`);
  }
  lines.push("");
  lines.push(`*Telefone:* ${customerPhone.trim()}`);

  return `https://wa.me/55${businessPhone}?text=${encodeURIComponent(
    lines.join("\n"),
  )}`;
}
