import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export type CityInsert = Database["public"]["Tables"]["cities"]["Insert"];
export type CityUpdate = Database["public"]["Tables"]["cities"]["Update"];

export async function listActive({ supabase }: { supabase: Supabase }) {
	const { data, error: queryError } = await supabase
		.from("cities")
		.select("id, name, state, slug, sort_order")
		.eq("is_active", true)
		.order("sort_order", { ascending: true });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

export async function getBySlug({
	supabase,
	slug,
}: {
	supabase: Supabase;
	slug: string;
}) {
	const { data, error: queryError } = await supabase
		.from("cities")
		.select("id, name, state, slug")
		.eq("slug", slug)
		.eq("is_active", true)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data);
}

// Admin: all cities including inactive ones.
export async function listAllForAdmin({ supabase }: { supabase: Supabase }) {
	const { data, error: queryError } = await supabase
		.from("cities")
		.select("id, name, state, slug, sort_order, is_active")
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
	values: CityInsert;
}) {
	const { error: queryError } = await supabase.from("cities").insert(values);
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
	patch: CityUpdate;
}) {
	const { error: queryError } = await supabase
		.from("cities")
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
		.from("cities")
		.delete()
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

// Counts records that block a hard delete: child neighborhoods + businesses.
export async function countDependents({
	supabase,
	id,
}: {
	supabase: Supabase;
	id: string;
}) {
	const [neighborhoods, businesses] = await Promise.all([
		supabase
			.from("neighborhoods")
			.select("id", { count: "exact", head: true })
			.eq("city_id", id),
		supabase
			.from("businesses")
			.select("id", { count: "exact", head: true })
			.eq("city_id", id),
	]);
	if (neighborhoods.error) return error(neighborhoods.error.message);
	if (businesses.error) return error(businesses.error.message);
	return success({
		neighborhoods: neighborhoods.count ?? 0,
		businesses: businesses.count ?? 0,
	});
}
