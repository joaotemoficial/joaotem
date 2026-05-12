import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

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
