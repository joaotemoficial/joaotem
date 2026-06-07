import { getSiteOrigin } from "~/lib/seo.server";
import type { Route } from "./+types/robots.txt";

// Resource route → /robots.txt. Allows public crawling, blocks private/app
// areas, and points crawlers at the sitemap (absolute URL, derived per-request
// so it works across dev/preview/prod without hardcoding the domain).
export function loader({ request }: Route.LoaderArgs) {
	const origin = getSiteOrigin(request);
	const body = [
		"User-agent: *",
		"Allow: /",
		"Disallow: /dashboard",
		"Disallow: /admin",
		"Disallow: /login",
		"Disallow: /signup",
		"Disallow: /logout",
		"Disallow: /*/checkout",
		"",
		`Sitemap: ${origin}/sitemap.xml`,
		"",
	].join("\n");

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
