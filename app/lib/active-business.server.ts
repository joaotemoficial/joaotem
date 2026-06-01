import { createCookie } from "react-router";

// Remembers which business the owner is currently working on so the dashboard
// sidebar keeps a business selected across pages (overview, upgrade, etc.),
// not just on /dashboard/businesses/:id routes.
export const activeBusinessCookie = createCookie("jt_active_business", {
	path: "/",
	httpOnly: true,
	sameSite: "lax",
	secure: process.env.NODE_ENV === "production",
	maxAge: 60 * 60 * 24 * 365,
});

// Pull the business id out of a dashboard pathname, ignoring the
// `/businesses/new` creation route. Returns null when no business is in scope.
export function businessIdFromPathname(pathname: string): string | null {
	const match = pathname.match(/^\/dashboard\/businesses\/([^/]+)/);
	if (!match) return null;
	return match[1] === "new" ? null : match[1];
}

export async function parseActiveBusinessId(
	request: Request,
): Promise<string | null> {
	const value = await activeBusinessCookie.parse(request.headers.get("Cookie"));
	return typeof value === "string" ? value : null;
}

export function serializeActiveBusinessId(id: string): Promise<string> {
	return activeBusinessCookie.serialize(id);
}

// Pick the active business with priority URL → cookie → first business,
// keeping only ids that actually belong to the user (so a stale cookie or a
// not-owned URL id self-heals to a valid selection).
export function resolveActiveBusinessId({
	pathname,
	cookieId,
	businessIds,
}: {
	pathname: string;
	cookieId: string | null;
	businessIds: string[];
}): string | null {
	const owned = new Set(businessIds);
	const candidates = [businessIdFromPathname(pathname), cookieId, businessIds[0]];
	for (const candidate of candidates) {
		if (candidate && owned.has(candidate)) return candidate;
	}
	return null;
}
