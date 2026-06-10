import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export type NeighborhoodInsert =
	Database["public"]["Tables"]["neighborhoods"]["Insert"];
export type NeighborhoodUpdate =
	Database["public"]["Tables"]["neighborhoods"]["Update"];

export async function listAll({ supabase }: { supabase: Supabase }) {
	const { data, error: queryError } = await supabase
		.from("neighborhoods")
		.select("id, city_id, name, slug, sort_order, cities(name, state, slug)")
		.eq("is_active", true)
		.order("sort_order", { ascending: true })
		.order("name", { ascending: true });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

export async function listByCity({
	supabase,
	cityId,
}: {
	supabase: Supabase;
	cityId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("neighborhoods")
		.select("id, name, slug, sort_order")
		.eq("city_id", cityId)
		.eq("is_active", true)
		.order("sort_order", { ascending: true })
		.order("name", { ascending: true });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

export async function getBySlug({
	supabase,
	citySlug,
	neighborhoodSlug,
}: {
	supabase: Supabase;
	citySlug: string;
	neighborhoodSlug: string;
}) {
	const { data, error: queryError } = await supabase
		.from("neighborhoods")
		.select("id, name, slug, city_id, cities!inner(name, state, slug)")
		.eq("slug", neighborhoodSlug)
		.eq("cities.slug", citySlug)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data);
}

// Admin: all neighborhoods of a city, including inactive ones.
export async function listAllByCityForAdmin({
	supabase,
	cityId,
}: {
	supabase: Supabase;
	cityId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("neighborhoods")
		.select("id, name, slug, sort_order, is_active")
		.eq("city_id", cityId)
		.order("sort_order", { ascending: true })
		.order("name", { ascending: true });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

export async function create({
	supabase,
	values,
}: {
	supabase: Supabase;
	values: NeighborhoodInsert;
}) {
	const { error: queryError } = await supabase
		.from("neighborhoods")
		.insert(values);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function update({
	supabase,
	id,
	patch,
}: {
	supabase: Supabase;
	id: string;
	patch: NeighborhoodUpdate;
}) {
	const { error: queryError } = await supabase
		.from("neighborhoods")
		.update(patch)
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function remove({
	supabase,
	id,
}: {
	supabase: Supabase;
	id: string;
}) {
	const { error: queryError } = await supabase
		.from("neighborhoods")
		.delete()
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

// Counts businesses that block a hard delete of this neighborhood.
export async function countBusinesses({
	supabase,
	id,
}: {
	supabase: Supabase;
	id: string;
}) {
	const { count, error: queryError } = await supabase
		.from("businesses")
		.select("id", { count: "exact", head: true })
		.eq("neighborhood_id", id);
	if (queryError) return error(queryError.message);
	return success(count ?? 0);
}
