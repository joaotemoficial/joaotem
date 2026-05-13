import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export type FeatureFlagRow =
	Database["public"]["Tables"]["feature_flags"]["Row"];
export type FeatureFlagUpdate =
	Database["public"]["Tables"]["feature_flags"]["Update"];
export type FeatureOverrideRow =
	Database["public"]["Tables"]["business_feature_overrides"]["Row"];
export type FeatureOverrideInsert =
	Database["public"]["Tables"]["business_feature_overrides"]["Insert"];

export async function listAll({ supabase }: { supabase: Supabase }) {
	const { data, error: queryError } = await supabase
		.from("feature_flags")
		.select("*")
		.order("sort_order", { ascending: true });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

export async function getByKey({
	supabase,
	key,
}: {
	supabase: Supabase;
	key: string;
}) {
	const { data, error: queryError } = await supabase
		.from("feature_flags")
		.select("*")
		.eq("key", key)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function updateFlag({
	supabase,
	key,
	patch,
}: {
	supabase: Supabase;
	key: string;
	patch: FeatureFlagUpdate;
}) {
	const { error: queryError } = await supabase
		.from("feature_flags")
		.update(patch)
		.eq("key", key);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function listOverridesForBusiness({
	supabase,
	businessId,
}: {
	supabase: Supabase;
	businessId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("business_feature_overrides")
		.select("*")
		.eq("business_id", businessId);
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

export async function upsertOverride({
	supabase,
	row,
}: {
	supabase: Supabase;
	row: FeatureOverrideInsert;
}) {
	const { error: queryError } = await supabase
		.from("business_feature_overrides")
		.upsert(row, { onConflict: "business_id,feature_key" });
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function deleteOverride({
	supabase,
	businessId,
	featureKey,
}: {
	supabase: Supabase;
	businessId: string;
	featureKey: string;
}) {
	const { error: queryError } = await supabase
		.from("business_feature_overrides")
		.delete()
		.eq("business_id", businessId)
		.eq("feature_key", featureKey);
	if (queryError) return error(queryError.message);
	return success(true);
}
