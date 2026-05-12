import { error, success } from "~/types";
import { createSupabaseServerClient } from "~/utils/supabase.server";

export async function signUpWithPassword({
	email,
	password,
	request,
}: {
	email: string;
	password: string;
	request: Request;
}) {
	const { supabaseClient, headers } = createSupabaseServerClient(request);

	const result = await supabaseClient.auth.signUp({ email, password });

	if (result.error) return error(result.error.message);

	return success({ headers, data: result.data });
}

export async function signInWithPassword({
	email,
	password,
	request,
}: {
	email: string;
	password: string;
	request: Request;
}) {
	const { supabaseClient, headers } = createSupabaseServerClient(request);

	const result = await supabaseClient.auth.signInWithPassword({
		email,
		password,
	});

	if (result.error) return error(result.error.message);

	return success({ headers, data: result.data });
}

export async function signOut({ request }: { request: Request }) {
	const { supabaseClient, headers } = createSupabaseServerClient(request);

	const result = await supabaseClient.auth.signOut();
	if (result.error) return error(result.error.message);

	return success(headers);
}
