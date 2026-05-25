import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { SYSTEM_USER_ID } from "~/lib/system-user";
import { error, success } from "~/types";

export type BusinessInsert = Database["public"]["Tables"]["businesses"]["Insert"];
export type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];
export type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
export type PlanTier = Database["public"]["Enums"]["plan_tier"];

const PUBLIC_BUSINESS_FIELDS = `
  id, handle, name, short_description, whatsapp, instagram,
  offers_delivery, logo_path, cover_path, status, created_at,
  plan_tier, plan_expires_at,
  category:business_categories!inner(id, name, slug),
  city:cities!inner(id, name, state, slug),
  neighborhood:neighborhoods!inner(id, name, slug, city_id)
`;

const OWNER_BUSINESS_FIELDS = `
  id, user_id, handle, name, short_description, whatsapp, instagram,
  offers_delivery, logo_path, cover_path, status, rejection_reason,
  reviewed_at, reviewed_by, created_at, updated_at, category_id, city_id,
  neighborhood_id,
  plan_tier, plan_started_at, plan_expires_at, plan_notes,
  category:business_categories(id, name, slug),
  city:cities(id, name, state, slug),
  neighborhood:neighborhoods(id, name, slug, city_id)
`;

// A business is "publicly visible" only while its subscription is active.
// effective_plan_tier (SQL) returns NULL when plan_tier is null OR expiry has
// passed; we mirror that here so PostgREST queries get the same filter
// without needing a separate RPC.
function applyActiveSubscriptionFilter<
	// biome-ignore lint/suspicious/noExplicitAny: PostgREST query builder is generic
	Q extends { not: (...args: any[]) => Q; or: (...args: any[]) => Q },
>(query: Q): Q {
	return query
		.not("plan_tier", "is", null)
		.or("plan_expires_at.is.null,plan_expires_at.gt.now()");
}

export async function listByUser({
	supabase,
	userId,
}: {
	supabase: Supabase;
	userId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("businesses")
		.select(OWNER_BUSINESS_FIELDS)
		.eq("user_id", userId)
		.is("deleted_at", null)
		.order("created_at", { ascending: false });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

function publicListingQuery(supabase: Supabase) {
	return supabase
		.from("businesses")
		.select(PUBLIC_BUSINESS_FIELDS)
		.eq("status", "approved")
		.is("deleted_at", null);
}

export async function listPublic({
	supabase,
	cityId,
	categoryId,
	neighborhoodId,
	q,
	limit = 24,
	offset = 0,
	random = false,
	planFilter = "any",
}: {
	supabase: Supabase;
	cityId?: string;
	categoryId?: string;
	neighborhoodId?: string;
	q?: string;
	limit?: number;
	offset?: number;
	random?: boolean;
	planFilter?: "ouro" | "basico" | "any";
}) {
	const baseQuery = publicListingQuery(supabase);

	// Ouro + random: delegate to the SQL RPC so ordering uses server-side
	// random(). It already filters by effective_plan_tier = 'ouro' (active
	// subscription required). We chain `.select(...)` so PostgREST embeds the
	// same joined columns as the typed builder.
	if (random && planFilter === "ouro") {
		// biome-ignore lint/suspicious/noExplicitAny: rpc embeds aren't expressible in Database types
		const { data, error: rpcError } = (await (supabase.rpc as any)(
			"random_featured_businesses",
			{
				p_limit: limit,
				p_city_id: cityId ?? null,
				p_category_id: categoryId ?? null,
				p_neighborhood_id: neighborhoodId ?? null,
				p_q: q && q.trim().length > 0 ? q.trim() : null,
			},
		).select(PUBLIC_BUSINESS_FIELDS)) as Awaited<typeof baseQuery>;
		if (rpcError) return error(rpcError.message);
		return success(data ?? []);
	}

	let query = baseQuery;
	query = applyActiveSubscriptionFilter(query);

	if (planFilter === "ouro") query = query.eq("plan_tier", "ouro");
	if (planFilter === "basico") query = query.eq("plan_tier", "basico");

	if (cityId) query = query.eq("city_id", cityId);
	if (categoryId) query = query.eq("category_id", categoryId);
	if (neighborhoodId) query = query.eq("neighborhood_id", neighborhoodId);
	if (q && q.trim().length > 0) {
		query = query.ilike("name", `%${q.trim()}%`);
	}

	const { data, error: queryError } = await query
		.order("created_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

// Paginated public listing with an exact total count, for the all-businesses
// page. Returns { items, total } so the page can render pagination controls.
// Items are Gold-first (Ouro random, then Básico alphabetical) via the
// search_businesses_ranked RPC; the total is a parallel exact-count query with
// the equivalent active-subscription + filter predicate.
export async function listPublicPaginated({
	supabase,
	cityId,
	categoryId,
	neighborhoodId,
	q,
	limit = 20,
	offset = 0,
}: {
	supabase: Supabase;
	cityId?: string;
	categoryId?: string;
	neighborhoodId?: string;
	q?: string;
	limit?: number;
	offset?: number;
}) {
	const trimmedQ = q && q.trim().length > 0 ? q.trim() : null;

	const baseQuery = publicListingQuery(supabase);
	// biome-ignore lint/suspicious/noExplicitAny: rpc embeds aren't expressible in Database types
	const itemsPromise = (supabase.rpc as any)("search_businesses_ranked", {
		p_q: trimmedQ,
		p_city_id: cityId ?? null,
		p_category_id: categoryId ?? null,
		p_neighborhood_id: neighborhoodId ?? null,
		p_limit: limit,
		p_offset: offset,
	}).select(PUBLIC_BUSINESS_FIELDS) as Promise<Awaited<typeof baseQuery>>;

	let countQuery = supabase
		.from("businesses")
		.select(PUBLIC_BUSINESS_FIELDS, { count: "exact", head: true })
		.eq("status", "approved")
		.is("deleted_at", null);
	countQuery = applyActiveSubscriptionFilter(countQuery);
	if (cityId) countQuery = countQuery.eq("city_id", cityId);
	if (categoryId) countQuery = countQuery.eq("category_id", categoryId);
	if (neighborhoodId)
		countQuery = countQuery.eq("neighborhood_id", neighborhoodId);
	if (trimmedQ) countQuery = countQuery.ilike("name", `%${trimmedQ}%`);

	const [itemsResult, countResult] = await Promise.all([
		itemsPromise,
		countQuery,
	]);

	if (itemsResult.error) return error(itemsResult.error.message);
	if (countResult.error) return error(countResult.error.message);
	return success({
		items: itemsResult.data ?? [],
		total: countResult.count ?? 0,
	});
}

// Search: Ouro businesses first (random order), then Básico (alphabetical).
// Both tiers exclude inactive subscriptions. Powered by the
// search_businesses_ranked() SQL RPC for atomic ordering.
export async function listPublicForSearch({
	supabase,
	q,
	cityId,
	categoryId,
	neighborhoodId,
	limit = 24,
}: {
	supabase: Supabase;
	q?: string;
	cityId?: string;
	categoryId?: string;
	neighborhoodId?: string;
	limit?: number;
}) {
	const baseQuery = publicListingQuery(supabase);
	// biome-ignore lint/suspicious/noExplicitAny: rpc embeds aren't expressible in Database types
	const { data, error: rpcError } = (await (supabase.rpc as any)(
		"search_businesses_ranked",
		{
			p_q: q && q.trim().length > 0 ? q.trim() : null,
			p_city_id: cityId ?? null,
			p_category_id: categoryId ?? null,
			p_neighborhood_id: neighborhoodId ?? null,
			p_limit: limit,
		},
	).select(PUBLIC_BUSINESS_FIELDS)) as Awaited<typeof baseQuery>;
	if (rpcError) return error(rpcError.message);
	return success(data ?? []);
}

// Browse listing for category / neighborhood pages: same Gold-first ordering
// as search but without a name filter.
export async function listPublicGoldFirstThenBasico({
	supabase,
	cityId,
	categoryId,
	neighborhoodId,
	limit = 60,
}: {
	supabase: Supabase;
	cityId?: string;
	categoryId?: string;
	neighborhoodId?: string;
	limit?: number;
}) {
	const baseQuery = publicListingQuery(supabase);
	// biome-ignore lint/suspicious/noExplicitAny: rpc embeds aren't expressible in Database types
	const { data, error: rpcError } = (await (supabase.rpc as any)(
		"list_businesses_gold_first",
		{
			p_city_id: cityId ?? null,
			p_category_id: categoryId ?? null,
			p_neighborhood_id: neighborhoodId ?? null,
			p_limit: limit,
		},
	).select(PUBLIC_BUSINESS_FIELDS)) as Awaited<typeof baseQuery>;
	if (rpcError) return error(rpcError.message);
	return success(data ?? []);
}

export async function getByHandle({
	supabase,
	handle,
}: {
	supabase: Supabase;
	handle: string;
}) {
	let query = supabase
		.from("businesses")
		.select(PUBLIC_BUSINESS_FIELDS)
		.eq("handle", handle.toLowerCase())
		.eq("status", "approved")
		.is("deleted_at", null);

	query = applyActiveSubscriptionFilter(query);

	const { data, error: queryError } = await query.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function getByIdForOwner({
	supabase,
	id,
	userId,
}: {
	supabase: Supabase;
	id: string;
	userId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("businesses")
		.select(OWNER_BUSINESS_FIELDS)
		.eq("id", id)
		.eq("user_id", userId)
		.is("deleted_at", null)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function getOwnerIdByHandle({
	supabase,
	handle,
}: {
	supabase: Supabase;
	handle: string;
}) {
	const { data, error: queryError } = await supabase
		.from("businesses")
		.select("id, user_id")
		.ilike("handle", handle.toLowerCase())
		.is("deleted_at", null)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function checkHandleAvailable({
	supabase,
	handle,
	excludeBusinessId,
}: {
	supabase: Supabase;
	handle: string;
	excludeBusinessId?: string;
}) {
	let query = supabase
		.from("businesses")
		.select("id", { head: true, count: "exact" })
		.ilike("handle", handle.toLowerCase());
	if (excludeBusinessId) query = query.neq("id", excludeBusinessId);
	const { count, error: queryError } = await query;
	if (queryError) return error(queryError.message);
	return success((count ?? 0) === 0);
}

export async function create({
	supabase,
	values,
}: {
	supabase: Supabase;
	values: BusinessInsert;
}) {
	const { data, error: queryError } = await supabase
		.from("businesses")
		.insert(values)
		.select("id, handle")
		.single();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function update({
	supabase,
	id,
	userId,
	values,
}: {
	supabase: Supabase;
	id: string;
	userId: string;
	values: BusinessUpdate;
}) {
	const { data, error: queryError } = await supabase
		.from("businesses")
		.update(values)
		.eq("id", id)
		.eq("user_id", userId)
		.select("id, handle")
		.single();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function adminUpdate({
	supabase,
	id,
	values,
}: {
	supabase: Supabase;
	id: string;
	values: BusinessUpdate;
}) {
	const { data, error: queryError } = await supabase
		.from("businesses")
		.update(values)
		.eq("id", id)
		.select("id, handle")
		.single();
	if (queryError) return error(queryError.message);
	return success(data);
}

// Admin-only: assign or change a business's subscription plan + expiry.
// Pass plan = null to disable the subscription (cron also calls into the
// same column via a separate path).
export async function updateBusinessPlan({
	supabase,
	id,
	planTier,
	startedAt,
	expiresAt,
	notes,
}: {
	supabase: Supabase;
	id: string;
	planTier: PlanTier | null;
	startedAt?: string | null;
	expiresAt?: string | null;
	notes?: string | null;
}) {
	const patch: BusinessUpdate = { plan_tier: planTier };
	if (startedAt !== undefined) patch.plan_started_at = startedAt;
	if (expiresAt !== undefined) patch.plan_expires_at = expiresAt;
	if (notes !== undefined) patch.plan_notes = notes;

	const { error: queryError } = await supabase
		.from("businesses")
		.update(patch)
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function listSystemOwned({ supabase }: { supabase: Supabase }) {
	const { data, error: queryError } = await supabase
		.from("businesses")
		.select(OWNER_BUSINESS_FIELDS)
		.eq("user_id", SYSTEM_USER_ID)
		.is("deleted_at", null)
		.order("created_at", { ascending: false });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

export async function softDelete({
	supabase,
	id,
	userId,
}: {
	supabase: Supabase;
	id: string;
	userId: string;
}) {
	const { error: queryError } = await supabase
		.from("businesses")
		.update({ deleted_at: new Date().toISOString() })
		.eq("id", id)
		.eq("user_id", userId);
	if (queryError) return error(queryError.message);
	return success(true);
}
