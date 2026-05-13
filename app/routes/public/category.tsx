import { Link, useLoaderData } from "react-router";
import { BusinessCard } from "~/components/business/business-card";
import { SiteHeader } from "~/components/nav/site-header";
import { getSessionAndProfile } from "~/lib/auth.server";
import { getPublicUrl } from "~/lib/storage.server";
import * as businessesRepo from "~/repositories/businesses";
import * as categoriesRepo from "~/repositories/categories";
import { isError } from "~/types";
import type { Route } from "./+types/category";

export const meta: Route.MetaFunction = ({ data }) => {
	if (!data?.category) return [{ title: "Categoria — JoaoTem" }];
	return [{ title: `${data.category.name} — JoaoTem` }];
};

export async function loader({ params, request }: Route.LoaderArgs) {
	const ctx = await getSessionAndProfile(request);
	const categoryResult = await categoriesRepo.getBySlug({
		supabase: ctx.supabase,
		slug: params.slug,
	});
	if (isError(categoryResult))
		throw new Response(categoryResult.error, { status: 500 });
	if (!categoryResult.success)
		throw new Response("Categoria não encontrada", { status: 404 });

	const businesses = await businessesRepo.listPublicGoldFirstThenBasico({
		supabase: ctx.supabase,
		categoryId: categoryResult.success.id,
		limit: 60,
	});
	if (isError(businesses)) throw new Response(businesses.error, { status: 500 });

	return {
		user: ctx.user
			? { id: ctx.user.id, email: ctx.user.email ?? null }
			: null,
		profile: ctx.profile,
		category: categoryResult.success,
		businesses: businesses.success.map((b) => ({
			...b,
			logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
			cover_url: getPublicUrl(ctx.supabase, "business-covers", b.cover_path),
		})),
	};
}

export default function CategoryPage() {
	const { user, profile, category, businesses } = useLoaderData<typeof loader>();
	return (
		<div className="min-h-svh bg-background">
			<SiteHeader user={user} role={profile?.role} />
			<main className="mx-auto max-w-6xl px-4 py-8">
				<p className="text-xs uppercase tracking-wide text-muted-foreground">
					Categoria
				</p>
				<h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
				<div className="pt-6">
					{businesses.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
							<p className="text-sm text-muted-foreground">
								Nenhum negócio nesta categoria ainda.
							</p>
						</div>
					) : (
						<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{businesses.map((b) => (
								<li key={b.id}>
									<BusinessCard
										business={b}
										logoUrl={b.logo_url}
										coverUrl={b.cover_url}
									/>
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="pt-10 text-center">
					<Link
						to="/"
						className="text-sm text-muted-foreground underline-offset-4 hover:underline"
					>
						← Voltar à página inicial
					</Link>
				</div>
			</main>
		</div>
	);
}
