import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "~/database.types";

const SUPABASE_URL = process.env.API_URL;
const SUPABASE_ANON_KEY = process.env.ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error(
		"Missing Supabase env vars. Required: API_URL, ANON_KEY, SERVICE_ROLE_KEY",
	);
}

function parseCookieHeader(header: string | null) {
	if (!header) return [] as { name: string; value: string }[];
	return header.split(/;\s*/).flatMap((pair) => {
		const eq = pair.indexOf("=");
		if (eq < 0) return [];
		const name = pair.slice(0, eq).trim();
		if (!name) return [];
		return [{ name, value: decodeURIComponent(pair.slice(eq + 1).trim()) }];
	});
}

function serializeCookie(name: string, value: string, options: CookieOptions) {
	const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
	if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
	if (options.domain) parts.push(`Domain=${options.domain}`);
	if (options.path) parts.push(`Path=${options.path}`);
	if (options.expires)
		parts.push(`Expires=${options.expires.toUTCString()}`);
	if (options.httpOnly) parts.push("HttpOnly");
	if (options.secure) parts.push("Secure");
	if (options.sameSite) {
		const v =
			typeof options.sameSite === "string"
				? options.sameSite
				: options.sameSite
					? "Strict"
					: "Lax";
		parts.push(`SameSite=${v}`);
	}
	return parts.join("; ");
}

export const createSupabaseServerClient = (request: Request, admin = false) => {
	const cookies = parseCookieHeader(request.headers.get("Cookie"));
	const headers = new Headers();
	const supabaseClient = createServerClient<Database>(
		SUPABASE_URL,
		admin ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => cookies,
				setAll: (toSet) => {
					for (const { name, value, options } of toSet) {
						headers.append(
							"Set-Cookie",
							serializeCookie(name, value, options ?? {}),
						);
					}
				},
			},
		},
	);

	return { supabaseClient, headers };
};
