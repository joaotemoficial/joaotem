import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

type Status = Database["public"]["Enums"]["business_status"];

const ADMIN_BUSINESS_FIELDS = `
  id, user_id, handle, name, short_description, whatsapp, instagram,
  offers_delivery, logo_path, cover_path, status, rejection_reason,
  reviewed_at, reviewed_by, created_at, updated_at,
  plan_tier, plan_started_at, plan_expires_at, plan_notes,
  category:business_categories(id, name, slug),
  city:cities(id, name, state, slug),
  neighborhood:neighborhoods(id, name, slug)
`;

async function attachOwners<T extends { user_id: string }>(
	supabase: Supabase,
	rows: T[],
) {
	if (rows.length === 0) return rows.map((r) => ({ ...r, owner: null }));
	const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
	const { data: owners } = await supabase
		.from("profiles")
		.select("id, email, full_name")
		.in("id", userIds);
	const byId = new Map((owners ?? []).map((o) => [o.id, o]));
	return rows.map((r) => ({
		...r,
		owner: byId.get(r.user_id) ?? null,
	}));
}

export async function listBusinesses({
	supabase,
	status,
	cityId,
	q,
	page = 1,
	perPage,
}: {
	supabase: Supabase;
	status?: Status | "all";
	cityId?: string;
	q?: string;
	page?: number;
	perPage?: number;
}) {
	let query = supabase
		.from("businesses")
		.select(ADMIN_BUSINESS_FIELDS, { count: "exact" })
		.is("deleted_at", null);
	if (status && status !== "all") query = query.eq("status", status);
	if (cityId) query = query.eq("city_id", cityId);
	const term = q?.trim();
	if (term) query = query.or(`name.ilike.%${term}%,handle.ilike.%${term}%`);

	query = query.order("created_at", { ascending: false });
	if (perPage && perPage > 0) {
		const offset = (Math.max(1, page) - 1) * perPage;
		query = query.range(offset, offset + perPage - 1);
	}

	const { data, error: queryError, count } = await query;
	if (queryError) return error(queryError.message);
	return success({
		items: await attachOwners(supabase, data ?? []),
		total: count ?? 0,
	});
}

// Approved businesses whose subscription is either missing or expired.
// Surfaced on the admin Pagamentos dashboard so admins can proactively
// assign a plan without waiting for the owner to submit an upgrade request.
export async function listBusinessesWithoutActivePlan({
	supabase,
}: { supabase: Supabase }) {
	const { data, error: queryError } = await supabase
		.from("businesses")
		.select(ADMIN_BUSINESS_FIELDS)
		.eq("status", "approved")
		.is("deleted_at", null)
		.or("plan_tier.is.null,plan_expires_at.lt.now()")
		.order("created_at", { ascending: false });
	if (queryError) return error(queryError.message);
	return success(await attachOwners(supabase, data ?? []));
}

export async function getBusinessById({
	supabase,
	id,
}: {
	supabase: Supabase;
	id: string;
}) {
	const { data, error: queryError } = await supabase
		.from("businesses")
		.select(ADMIN_BUSINESS_FIELDS)
		.eq("id", id)
		.is("deleted_at", null)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	if (!data) return success(null);
	const [withOwner] = await attachOwners(supabase, [data]);
	return success(withOwner);
}

export async function approveBusiness({
	supabase,
	id,
	reviewerId,
}: {
	supabase: Supabase;
	id: string;
	reviewerId: string;
}) {
	const { error: queryError } = await supabase
		.from("businesses")
		.update({
			status: "approved",
			rejection_reason: null,
			reviewed_at: new Date().toISOString(),
			reviewed_by: reviewerId,
		})
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function rejectBusiness({
	supabase,
	id,
	reviewerId,
	reason,
}: {
	supabase: Supabase;
	id: string;
	reviewerId: string;
	reason: string;
}) {
	const { error: queryError } = await supabase
		.from("businesses")
		.update({
			status: "rejected",
			rejection_reason: reason,
			reviewed_at: new Date().toISOString(),
			reviewed_by: reviewerId,
		})
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function suspendBusiness({
	supabase,
	id,
	reviewerId,
	reason,
}: {
	supabase: Supabase;
	id: string;
	reviewerId: string;
	reason: string;
}) {
	const { error: queryError } = await supabase
		.from("businesses")
		.update({
			status: "suspended",
			rejection_reason: reason,
			reviewed_at: new Date().toISOString(),
			reviewed_by: reviewerId,
		})
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function reinstateBusiness({
	supabase,
	id,
	reviewerId,
}: {
	supabase: Supabase;
	id: string;
	reviewerId: string;
}) {
	const { error: queryError } = await supabase
		.from("businesses")
		.update({
			status: "approved",
			rejection_reason: null,
			reviewed_at: new Date().toISOString(),
			reviewed_by: reviewerId,
		})
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function findProfileByEmail({
	supabase,
	email,
}: {
	supabase: Supabase;
	email: string;
}) {
	const { data, error: queryError } = await supabase
		.from("profiles")
		.select("id, email, full_name")
		.ilike("email", email.trim())
		.limit(1)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function reassignBusinessOwner({
	supabase,
	id,
	newUserId,
}: {
	supabase: Supabase;
	id: string;
	newUserId: string;
}) {
	const { error: queryError } = await supabase
		.from("businesses")
		.update({ user_id: newUserId })
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function reopenBusiness({
	supabase,
	id,
	reviewerId,
}: {
	supabase: Supabase;
	id: string;
	reviewerId: string;
}) {
	const { error: queryError } = await supabase
		.from("businesses")
		.update({
			status: "pending",
			rejection_reason: null,
			reviewed_at: new Date().toISOString(),
			reviewed_by: reviewerId,
		})
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}
