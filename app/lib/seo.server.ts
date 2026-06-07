// Resolve the public site origin (scheme + host, no trailing slash) used to
// build absolute canonical/OG URLs and sitemap entries. Prefers the SITE_URL
// env var (set this in production behind a proxy/CDN where request.url may be
// the internal origin); falls back to the incoming request origin for local
// dev and preview deploys.
export function getSiteOrigin(request: Request): string {
	const fromEnv = process.env.SITE_URL?.replace(/\/+$/, "");
	if (fromEnv) return fromEnv;
	return new URL(request.url).origin;
}

// Absolute canonical URL for the current request path (query string dropped —
// canonicals should point at the clean, indexable URL).
export function canonicalFor(request: Request, pathname?: string): string {
	const origin = getSiteOrigin(request);
	const path = pathname ?? new URL(request.url).pathname;
	return `${origin}${path}`;
}
