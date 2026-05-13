import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export type PlanUpgradeRow =
	Database["public"]["Tables"]["plan_upgrade_requests"]["Row"];
export type PlanUpgradeInsert =
	Database["public"]["Tables"]["plan_upgrade_requests"]["Insert"];
export type PlanTier = Database["public"]["Enums"]["plan_tier"];

const ADMIN_FIELDS = `
  id, business_id, requested_by, requested_plan, message, status,
  reviewed_by, reviewed_at, review_notes,
  granted_starts_at, granted_expires_at,
  created_at, updated_at,
  business:businesses!inner(
    id, name, handle, plan_tier, plan_expires_at, user_id
  )
`;

const OWNER_FIELDS = `
  id, business_id, requested_plan, message, status,
  reviewed_at, review_notes,
  granted_starts_at, granted_expires_at,
  created_at
`;

async function attachRequesters<
	T extends { requested_by: string },
>(supabase: Supabase, rows: T[]) {
	if (rows.length === 0) return rows.map((r) => ({ ...r, requester: null }));
	const userIds = Array.from(new Set(rows.map((r) => r.requested_by)));
	const { data } = await supabase
		.from("profiles")
		.select("id, email, full_name")
		.in("id", userIds);
	const byId = new Map((data ?? []).map((p) => [p.id, p]));
	return rows.map((r) => ({ ...r, requester: byId.get(r.requested_by) ?? null }));
}

export async function listPending({ supabase }: { supabase: Supabase }) {
	const { data, error: queryError } = await supabase
		.from("plan_upgrade_requests")
		.select(ADMIN_FIELDS)
		.eq("status", "pending")
		.order("created_at", { ascending: false });
	if (queryError) return error(queryError.message);
	return success(await attachRequesters(supabase, data ?? []));
}

export async function listForOwner({
	supabase,
	userId,
}: {
	supabase: Supabase;
	userId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("plan_upgrade_requests")
		.select(OWNER_FIELDS)
		.eq("requested_by", userId)
		.order("created_at", { ascending: false });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

export async function hasPendingForBusiness({
	supabase,
	businessId,
}: {
	supabase: Supabase;
	businessId: string;
}) {
	const { count, error: queryError } = await supabase
		.from("plan_upgrade_requests")
		.select("id", { head: true, count: "exact" })
		.eq("business_id", businessId)
		.eq("status", "pending");
	if (queryError) return error(queryError.message);
	return success((count ?? 0) > 0);
}

export async function create({
	supabase,
	values,
}: {
	supabase: Supabase;
	values: PlanUpgradeInsert;
}) {
	const { data, error: queryError } = await supabase
		.from("plan_upgrade_requests")
		.insert(values)
		.select("id")
		.single();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function cancelOwn({
	supabase,
	id,
	userId,
}: {
	supabase: Supabase;
	id: string;
	userId: string;
}) {
	const { error: queryError } = await supabase
		.from("plan_upgrade_requests")
		.update({ status: "canceled" })
		.eq("id", id)
		.eq("requested_by", userId)
		.eq("status", "pending");
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function approve({
	supabase,
	id,
	reviewerId,
	startsAt,
	expiresAt,
	notes,
}: {
	supabase: Supabase;
	id: string;
	reviewerId: string;
	startsAt: string | null;
	expiresAt: string;
	notes?: string | null;
}) {
	// biome-ignore lint/suspicious/noExplicitAny: rpc args aren't expressible in Database types
	const { error: rpcError } = await (supabase.rpc as any)(
		"approve_plan_upgrade_request",
		{
			p_request_id: id,
			p_reviewer_id: reviewerId,
			p_starts_at: startsAt,
			p_expires_at: expiresAt,
			p_notes: notes ?? null,
		},
	);
	if (rpcError) return error(rpcError.message);
	return success(true);
}

export async function reject({
	supabase,
	id,
	reviewerId,
	notes,
}: {
	supabase: Supabase;
	id: string;
	reviewerId: string;
	notes?: string | null;
}) {
	// biome-ignore lint/suspicious/noExplicitAny: rpc args aren't expressible in Database types
	const { error: rpcError } = await (supabase.rpc as any)(
		"reject_plan_upgrade_request",
		{
			p_request_id: id,
			p_reviewer_id: reviewerId,
			p_notes: notes ?? null,
		},
	);
	if (rpcError) return error(rpcError.message);
	return success(true);
}
