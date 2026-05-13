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
