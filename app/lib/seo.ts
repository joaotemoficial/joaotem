// Shared SEO meta builders. Pure (no server-only imports) so they can run in
// route `meta` functions on both server and client. Canonical/OG absolute URLs
// and images are passed in from loaders (see seo.server.ts → getSiteOrigin).

export const SITE_NAME = "João Tem";

type MetaDescriptor = Record<string, unknown>;

export function buildMeta({
	title,
	description,
	canonical,
	image,
	type = "website",
}: {
	title: string;
	description: string;
	canonical?: string;
	image?: string | null;
	type?: "website" | "article" | "profile";
}): MetaDescriptor[] {
	const tags: MetaDescriptor[] = [
		{ title },
		{ name: "description", content: description },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:type", content: type },
		{ property: "og:site_name", content: SITE_NAME },
		{ property: "og:locale", content: "pt_BR" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
		{
			name: "twitter:card",
			content: image ? "summary_large_image" : "summary",
		},
	];

	if (canonical) {
		tags.push({ tagName: "link", rel: "canonical", href: canonical });
		tags.push({ property: "og:url", content: canonical });
	}
	if (image) {
		tags.push({ property: "og:image", content: image });
		tags.push({ name: "twitter:image", content: image });
	}

	return tags;
}
