import type { Supabase } from "~/lib/storage.server";
import type { PlanTier } from "~/lib/plan";
import * as featureFlagsRepo from "~/repositories/feature-flags";
import { isError } from "~/types";

export type ResolvedFlag = {
	enabled: boolean;
	limit: number | null; // null = N/A (boolean flag) or unlimited
};

export type ResolvedFlags = Record<string, ResolvedFlag>;

// Resolve effective feature flags for a single business by merging the plan
// defaults from `feature_flags` with any per-business rows in
// `business_feature_overrides`. Always per-request — callers in loaders read
// this once and pass the resolved object down to the render tree. No caching
// across requests, since admin edits would otherwise serve stale flags.
export async function resolveFlagsForBusiness({
	supabase,
	businessId,
	planTier,
}: {
	supabase: Supabase;
	businessId: string | null;
	planTier: PlanTier | null;
}): Promise<ResolvedFlags> {
	const flagsResult = await featureFlagsRepo.listAll({ supabase });
	if (isError(flagsResult)) return {};
	const flags = flagsResult.success;

	const overridesResult = businessId
		? await featureFlagsRepo.listOverridesForBusiness({ supabase, businessId })
		: null;
	const overrides = overridesResult && !isError(overridesResult)
		? overridesResult.success
		: [];
	const overrideByKey = new Map(overrides.map((o) => [o.feature_key, o]));

	const out: ResolvedFlags = {};
	for (const f of flags) {
		// Master kill switch — if a flag is globally disabled, no plan grants it.
		if (!f.enabled) {
			out[f.key] = { enabled: false, limit: 0 };
			continue;
		}
		const planEnabled = planTier === "ouro"
			? f.ouro_enabled
			: planTier === "basico"
				? f.basico_enabled
				: false;
		const planLimit = planTier === "ouro"
			? f.ouro_limit
			: planTier === "basico"
				? f.basico_limit
				: null;
		const ov = overrideByKey.get(f.key);
		out[f.key] = {
			enabled: ov?.enabled ?? planEnabled,
			limit: ov?.limit_override ?? planLimit,
		};
	}
	return out;
}

export function hasFeature(flags: ResolvedFlags, key: string): boolean {
	return flags[key]?.enabled === true;
}

export function featureLimit(flags: ResolvedFlags, key: string): number | null {
	return flags[key]?.limit ?? null;
}

// Check if a numeric-quota feature has room for one more. Returns:
//   • true  → may create
//   • false → over quota
// When the flag is disabled entirely, returns false. When the limit is null
// (unlimited), returns true.
export function withinQuota(
	flags: ResolvedFlags,
	key: string,
	currentCount: number,
): boolean {
	const f = flags[key];
	if (!f || !f.enabled) return false;
	if (f.limit === null) return true;
	return currentCount < f.limit;
}
