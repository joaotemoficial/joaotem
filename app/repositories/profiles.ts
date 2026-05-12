import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export async function getProfile({
	supabase,
	userId,
}: {
	supabase: Supabase;
	userId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("profiles")
		.select("id, email, full_name, role, created_at")
		.eq("id", userId)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function isAdmin({
	supabase,
	userId,
}: {
	supabase: Supabase;
	userId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("profiles")
		.select("role")
		.eq("id", userId)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data?.role === "admin");
}
