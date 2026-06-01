import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export type SearchSynonymRow =
	Database["public"]["Tables"]["search_synonyms"]["Row"];
export type SearchSynonymInsert =
	Database["public"]["Tables"]["search_synonyms"]["Insert"];
export type SearchSynonymUpdate =
	Database["public"]["Tables"]["search_synonyms"]["Update"];

export async function listAll({ supabase }: { supabase: Supabase }) {
	const { data, error: queryError } = await supabase
		.from("search_synonyms")
		.select("*")
		.order("term", { ascending: true });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

export async function create({
	supabase,
	values,
}: {
	supabase: Supabase;
	values: SearchSynonymInsert;
}) {
	const { error: queryError } = await supabase
		.from("search_synonyms")
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
	patch: SearchSynonymUpdate;
}) {
	const { error: queryError } = await supabase
		.from("search_synonyms")
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
		.from("search_synonyms")
		.delete()
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}
