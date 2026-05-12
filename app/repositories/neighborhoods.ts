import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

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
