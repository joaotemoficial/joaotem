import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export type BusinessInsert = Database["public"]["Tables"]["businesses"]["Insert"];
export type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];
export type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];

const PUBLIC_BUSINESS_FIELDS = `
  id, handle, name, short_description, whatsapp, instagram,
  offers_delivery, logo_path, cover_path, status, created_at,
  category:business_categories!inner(id, name, slug),
  city:cities!inner(id, name, state, slug),
  neighborhood:neighborhoods!inner(id, name, slug, city_id)
`;

const OWNER_BUSINESS_FIELDS = `
  id, user_id, handle, name, short_description, whatsapp, instagram,
  offers_delivery, logo_path, cover_path, status, rejection_reason,
  reviewed_at, reviewed_by, created_at, updated_at, category_id, city_id,
  neighborhood_id,
  category:business_categories(id, name, slug),
  city:cities(id, name, state, slug),
  neighborhood:neighborhoods(id, name, slug, city_id)
`;

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

export async function listPublic({
	supabase,
	cityId,
	categoryId,
	neighborhoodId,
	q,
	limit = 24,
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
	let query = supabase
		.from("businesses")
		.select(PUBLIC_BUSINESS_FIELDS)
		.eq("status", "approved")
		.is("deleted_at", null);

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

export async function getByHandle({
	supabase,
	handle,
}: {
	supabase: Supabase;
	handle: string;
}) {
	const { data, error: queryError } = await supabase
		.from("businesses")
		.select(PUBLIC_BUSINESS_FIELDS)
		.eq("handle", handle.toLowerCase())
		.eq("status", "approved")
		.is("deleted_at", null)
		.maybeSingle();
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
