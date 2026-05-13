import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export type PromotionInsert =
	Database["public"]["Tables"]["business_promotions"]["Insert"];
export type PromotionUpdate =
	Database["public"]["Tables"]["business_promotions"]["Update"];

const PROMOTION_FIELDS = `
  id, business_id, title, description, schedule_note,
  recurrence_days, starts_at, ends_at, sort_order, is_active,
  created_at, updated_at,
  images:business_promotion_images(id, storage_path, alt_text, sort_order)
`;

export async function listByBusiness({
	supabase,
	businessId,
}: {
	supabase: Supabase;
	businessId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("business_promotions")
		.select(PROMOTION_FIELDS)
		.eq("business_id", businessId)
		.is("deleted_at", null)
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: false });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

// "Active today" predicate. Applied in JS because RLS layers OR-merge — when an
// owner or admin is signed in, their broader read policies bypass the day-bit
// filter on "public read". Filtering in the application layer makes this
// watertight regardless of who is viewing.
function isActiveToday<
	T extends {
		is_active: boolean;
		deleted_at: string | null;
		recurrence_days: number;
		starts_at: string | null;
		ends_at: string | null;
	},
>(p: T): boolean {
	if (!p.is_active || p.deleted_at) return false;
	const now = new Date();
	const todayDow = now.getUTCDay(); // 0=Sun..6=Sat (matches Postgres extract(dow))
	const todayIso = now.toISOString().slice(0, 10);
	if (p.starts_at && p.starts_at > todayIso) return false;
	if (p.ends_at && p.ends_at < todayIso) return false;
	if ((p.recurrence_days & (1 << todayDow)) === 0) return false;
	return true;
}

const PROMOTION_FIELDS_WITH_GATING = `
  id, business_id, title, description, schedule_note,
  recurrence_days, starts_at, ends_at, sort_order, is_active,
  deleted_at, created_at, updated_at,
  images:business_promotion_images(id, storage_path, alt_text, sort_order)
`;

export async function listPublicActiveToday({
	supabase,
	businessId,
}: {
	supabase: Supabase;
	businessId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("business_promotions")
		.select(PROMOTION_FIELDS_WITH_GATING)
		.eq("business_id", businessId)
		.eq("is_active", true)
		.is("deleted_at", null)
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: false });
	if (queryError) return error(queryError.message);
	return success((data ?? []).filter(isActiveToday));
}

// Today's active promotions across all approved Ouro businesses (homepage feed).
// Promoções da semana is an Ouro-only feature, so the inner join filters on
// plan_tier = 'ouro' AND an active (non-expired) subscription. Explicit
// filters at the query and application layer — RLS alone is not sufficient
// here because owner/admin policies bypass the day-of-week filter.
export async function listPublicTodayFeed({
	supabase,
	limit = 24,
}: {
	supabase: Supabase;
	limit?: number;
}) {
	const { data, error: queryError } = await supabase
		.from("business_promotions")
		.select(
			`
				id, title, description, schedule_note,
				recurrence_days, starts_at, ends_at, is_active, deleted_at,
				business:businesses!inner(id, handle, name, logo_path, status, deleted_at, plan_tier, plan_expires_at, city_id, neighborhood_id, city:cities(name, state), neighborhood:neighborhoods(name)),
				images:business_promotion_images(id, storage_path, alt_text, sort_order)
			`,
		)
		.eq("is_active", true)
		.is("deleted_at", null)
		.eq("business.status", "approved")
		.is("business.deleted_at", null)
		.eq("business.plan_tier", "ouro")
		.or("plan_expires_at.is.null,plan_expires_at.gt.now()", {
			foreignTable: "business",
		})
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: false })
		.limit(limit * 4); // over-fetch to keep `limit` rows after JS filter
	if (queryError) return error(queryError.message);
	return success((data ?? []).filter(isActiveToday).slice(0, limit));
}

// Number of non-deleted promotions on a business — for owner-side quota.
export async function countByBusiness({
	supabase,
	businessId,
}: {
	supabase: Supabase;
	businessId: string;
}) {
	const { count, error: queryError } = await supabase
		.from("business_promotions")
		.select("id", { head: true, count: "exact" })
		.eq("business_id", businessId)
		.is("deleted_at", null);
	if (queryError) return error(queryError.message);
	return success(count ?? 0);
}

export async function getByIdForOwner({
	supabase,
	id,
	businessId,
}: {
	supabase: Supabase;
	id: string;
	businessId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("business_promotions")
		.select(PROMOTION_FIELDS)
		.eq("id", id)
		.eq("business_id", businessId)
		.is("deleted_at", null)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function create({
	supabase,
	values,
}: {
	supabase: Supabase;
	values: PromotionInsert;
}) {
	const { data, error: queryError } = await supabase
		.from("business_promotions")
		.insert(values)
		.select("id")
		.single();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function update({
	supabase,
	id,
	values,
}: {
	supabase: Supabase;
	id: string;
	values: PromotionUpdate;
}) {
	const { error: queryError } = await supabase
		.from("business_promotions")
		.update(values)
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function softDelete({
	supabase,
	id,
}: {
	supabase: Supabase;
	id: string;
}) {
	const { error: queryError } = await supabase
		.from("business_promotions")
		.update({ deleted_at: new Date().toISOString(), is_active: false })
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function addImage({
	supabase,
	promotionId,
	storagePath,
	altText,
	sortOrder,
}: {
	supabase: Supabase;
	promotionId: string;
	storagePath: string;
	altText?: string | null;
	sortOrder?: number;
}) {
	const { data, error: queryError } = await supabase
		.from("business_promotion_images")
		.insert({
			promotion_id: promotionId,
			storage_path: storagePath,
			alt_text: altText ?? null,
			sort_order: sortOrder ?? 0,
		})
		.select("id")
		.single();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function removeImage({
	supabase,
	imageId,
}: {
	supabase: Supabase;
	imageId: string;
}) {
	const { error: queryError } = await supabase
		.from("business_promotion_images")
		.delete()
		.eq("id", imageId);
	if (queryError) return error(queryError.message);
	return success(true);
}
