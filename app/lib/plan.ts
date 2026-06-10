import type { Database } from "~/database.types";

export type PlanTier = Database["public"]["Enums"]["plan_tier"];

// JS mirror of public.effective_plan_tier(). Returns null when:
//   • the business has no subscription (plan_tier is null), or
//   • the paid window has elapsed (plan_expires_at < now).
export function effectivePlanTier(business: {
	plan_tier: PlanTier | null;
	plan_expires_at: string | null;
}): PlanTier | null {
	if (business.plan_tier == null) return null;
	if (business.plan_expires_at) {
		const expires = Date.parse(business.plan_expires_at);
		if (!Number.isNaN(expires) && expires < Date.now()) return null;
	}
	return business.plan_tier;
}

export function isSubscriptionActive(business: {
	plan_tier: PlanTier | null;
	plan_expires_at: string | null;
}): boolean {
	return effectivePlanTier(business) !== null;
}

export type SubscriptionStatus = "active" | "expired" | "never";

// Three-way status that distinguishes a lapsed subscriber from one who never
// subscribed. `plan_started_at` is set only when an upgrade request is approved
// (see approve_plan_upgrade_request RPC), so its absence — together with a null
// plan_tier — marks a business that has never had a paid window.
export function subscriptionStatus(business: {
	plan_tier: PlanTier | null;
	plan_started_at: string | null;
	plan_expires_at: string | null;
}): SubscriptionStatus {
	if (isSubscriptionActive(business)) return "active";
	if (business.plan_tier != null || business.plan_started_at != null) {
		return "expired";
	}
	return "never";
}

// Shared plan display copy (mirrors the public pricing page) and the WhatsApp
// activation link, used by both the onboarding success screen and the dashboard
// "never subscribed" callout so there's a single source of truth.
export const ACTIVATION_WHATSAPP = "5588921822102";

export const PLAN_PRICING: Record<PlanTier, { name: string; price: string }> = {
	ouro: { name: "Plano Ouro", price: "R$ 79,90" },
	basico: { name: "Plano Básico", price: "R$ 29,90" },
};

export function activationWhatsappHref(
	businessName: string,
	tier: PlanTier,
): string {
	const p = PLAN_PRICING[tier];
	const msg = encodeURIComponent(
		`Olá! Quero ativar meu negócio "${businessName}" no João Tem (${p.name} — ${p.price}/mês).`,
	);
	return `https://wa.me/${ACTIVATION_WHATSAPP}?text=${msg}`;
}

// Renewal contact for owners whose plan has expired — reuses the same WhatsApp
// number and mirrors the activation message wording.
export function renewalWhatsappHref(
	businessName: string,
	tier: PlanTier,
): string {
	const p = PLAN_PRICING[tier];
	const msg = encodeURIComponent(
		`Olá! Quero renovar o plano do meu negócio "${businessName}" no João Tem (${p.name} — ${p.price}/mês).`,
	);
	return `https://wa.me/${ACTIVATION_WHATSAPP}?text=${msg}`;
}

// Generic support contact for owners whose plan is already active and just have
// a question — reuses the same João Tem WhatsApp number.
export function supportWhatsappHref(businessName: string): string {
	const msg = encodeURIComponent(
		`Olá! Preciso de ajuda com o meu negócio "${businessName}" no João Tem.`,
	);
	return `https://wa.me/${ACTIVATION_WHATSAPP}?text=${msg}`;
}

export function planLabel(tier: PlanTier | null): string {
	if (tier === "ouro") return "Ouro";
	if (tier === "basico") return "Básico";
	return "Sem plano";
}

// Days remaining until the subscription expires. Negative when expired.
// Null when there's no expiry set.
export function daysUntilExpiry(expiresAt: string | null): number | null {
	if (!expiresAt) return null;
	const expires = Date.parse(expiresAt);
	if (Number.isNaN(expires)) return null;
	const diffMs = expires - Date.now();
	return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
