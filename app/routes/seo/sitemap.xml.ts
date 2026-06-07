import { getSiteOrigin } from "~/lib/seo.server";
import * as businessesRepo from "~/repositories/businesses";
import * as categoriesRepo from "~/repositories/categories";
import * as neighborhoodsRepo from "~/repositories/neighborhoods";
import { isError } from "~/types";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import type { Route } from "./+types/sitemap.xml";

type Entry = { loc: string; changefreq?: string; priority?: string };

function xmlEscape(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

// Resource route → /sitemap.xml. Lists the public, indexable surface: static
// marketing pages, every active category and neighborhood landing page, and
// every public business profile. URLs are absolute (origin derived per-request)
// so the file is portable across environments.
export async function loader({ request }: Route.LoaderArgs) {
	const origin = getSiteOrigin(request);
	const { supabaseClient: supabase } = createSupabaseServerClient(request);

	const [businesses, categories, neighborhoods] = await Promise.all([
		businessesRepo.listPublic({ supabase, limit: 5000, planFilter: "any" }),
		categoriesRepo.listActive({ supabase }),
		neighborhoodsRepo.listAll({ supabase }),
	]);

	const entries: Entry[] = [
		{ loc: `${origin}/`, changefreq: "daily", priority: "1.0" },
		{ loc: `${origin}/negocios`, changefreq: "daily", priority: "0.9" },
		{ loc: `${origin}/promocoes`, changefreq: "daily", priority: "0.8" },
		{ loc: `${origin}/planos`, changefreq: "monthly", priority: "0.5" },
		{ loc: `${origin}/termos`, changefreq: "yearly", priority: "0.3" },
	];

	if (!isError(categories)) {
		for (const c of categories.success) {
			entries.push({
				loc: `${origin}/categoria/${c.slug}`,
				changefreq: "weekly",
				priority: "0.6",
			});
		}
	}

	if (!isError(neighborhoods)) {
		for (const n of neighborhoods.success) {
			const city = Array.isArray(n.cities) ? n.cities[0] : n.cities;
			if (!city?.slug) continue;
			entries.push({
				loc: `${origin}/bairro/${city.slug}/${n.slug}`,
				changefreq: "weekly",
				priority: "0.6",
			});
		}
	}

	if (!isError(businesses)) {
		for (const b of businesses.success) {
			entries.push({
				loc: `${origin}/negocio/${b.handle}`,
				changefreq: "weekly",
				priority: "0.7",
			});
		}
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(e) =>
			`  <url><loc>${xmlEscape(e.loc)}</loc>${
				e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ""
			}${e.priority ? `<priority>${e.priority}</priority>` : ""}</url>`,
	)
	.join("\n")}
</urlset>
`;

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
