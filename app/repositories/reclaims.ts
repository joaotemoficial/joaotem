import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export type ReclaimStatus = "pending" | "approved" | "rejected";

export type ReclaimRow = {
	id: string;
	business_id: string;
	user_id: string;
	message: string | null;
	status: ReclaimStatus;
	decision_note: string | null;
	reviewed_at: string | null;
	reviewed_by: string | null;
	created_at: string;
	updated_at: string;
};

const RECLAIM_FIELDS =
	"id, business_id, user_id, message, status, decision_note, reviewed_at, reviewed_by, created_at, updated_at";

// biome-ignore lint/suspicious/noExplicitAny: bypass supabase generic inference for table not yet present in Database types
type AnySupabase = any;

export async function create({
	supabase,
	businessId,
	userId,
	message,
}: {
	supabase: Supabase;
	businessId: string;
	userId: string;
	message: string | null;
}) {
	const { data, error: queryError } = await (supabase as AnySupabase)
		.from("business_reclaim_requests")
		.insert({ business_id: businessId, user_id: userId, message })
		.select(RECLAIM_FIELDS)
		.single();
	if (queryError) return error(queryError.message);
	return success(data as ReclaimRow);
}

export async function listMineForBusiness({
	supabase,
	businessId,
	userId,
}: {
	supabase: Supabase;
	businessId: string;
	userId: string;
}) {
	const { data, error: queryError } = await (supabase as AnySupabase)
		.from("business_reclaim_requests")
		.select(RECLAIM_FIELDS)
		.eq("business_id", businessId)
		.eq("user_id", userId)
		.order("created_at", { ascending: false });
	if (queryError) return error(queryError.message);
	return success((data ?? []) as ReclaimRow[]);
}

export type AdminReclaimRow = ReclaimRow & {
	business: {
		id: string;
		name: string;
		handle: string;
		logo_path: string | null;
	} | null;
	requester: {
		id: string;
		email: string | null;
		full_name: string | null;
	} | null;
};

export async function listForAdmin({
	supabase,
	status = "pending",
}: {
	supabase: Supabase;
	status?: ReclaimStatus | "all";
}) {
	let query = (supabase as AnySupabase)
		.from("business_reclaim_requests")
		.select(
			`${RECLAIM_FIELDS},
			 business:businesses(id, name, handle, logo_path)`,
		)
		.order("created_at", { ascending: false });
	if (status !== "all") query = query.eq("status", status);
	const { data, error: queryError } = await query;
	if (queryError) return error(queryError.message);

	const rows = (data ?? []) as Array<
		ReclaimRow & { business: AdminReclaimRow["business"] }
	>;
	if (rows.length === 0) return success<AdminReclaimRow[]>([]);

	const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
	const { data: profiles } = await supabase
		.from("profiles")
		.select("id, email, full_name")
		.in("id", userIds);
	const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

	return success(
		rows.map((r) => ({
			...r,
			requester: byId.get(r.user_id) ?? null,
		})) as AdminReclaimRow[],
	);
}

export async function approveById({
	supabase,
	id,
	reviewerId,
}: {
	supabase: Supabase;
	id: string;
	reviewerId: string;
}) {
	const { error: rpcError } = await (supabase as AnySupabase).rpc(
		"approve_business_reclaim",
		{ reclaim_id: id, reviewer_id: reviewerId },
	);
	if (rpcError) return error(rpcError.message);
	return success(true);
}

export async function rejectById({
	supabase,
	id,
	reviewerId,
	note,
}: {
	supabase: Supabase;
	id: string;
	reviewerId: string;
	note: string | null;
}) {
	const { error: queryError } = await (supabase as AnySupabase)
		.from("business_reclaim_requests")
		.update({
			status: "rejected",
			decision_note: note,
			reviewed_at: new Date().toISOString(),
			reviewed_by: reviewerId,
		})
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}
