import { Form, Link, useLoaderData } from "react-router";
import { BusinessCard } from "~/components/business/business-card";
import { SiteHeader } from "~/components/nav/site-header";
import { buttonVariants } from "~/components/ui/button";
import { getSessionAndProfile } from "~/lib/auth.server";
import { PROMOTION_IMAGE_BUCKET, getPublicUrl } from "~/lib/storage.server";
import * as businessesRepo from "~/repositories/businesses";
import * as categoriesRepo from "~/repositories/categories";
import * as citiesRepo from "~/repositories/cities";
import * as neighborhoodsRepo from "~/repositories/neighborhoods";
import * as promotionsRepo from "~/repositories/promotions";
import { isError } from "~/types";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
	{
		title: "JoaoTem — Marketplace de negócios locais",
	},
	{
		name: "description",
		content:
			"Descubra negócios locais em Feira de Santana - BA e Orós - CE. Cadastre o seu também.",
	},
];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await getSessionAndProfile(request);
	const url = new URL(request.url);
	const cityId = url.searchParams.get("city") ?? undefined;
	const categoryId = url.searchParams.get("category") ?? undefined;
	const neighborhoodId = url.searchParams.get("neighborhood") ?? undefined;
	const q = url.searchParams.get("q") ?? undefined;

	const [businesses, categories, cities, neighborhoods, promotions] =
		await Promise.all([
			businessesRepo.listPublic({
				supabase: ctx.supabase,
				cityId: cityId || undefined,
				categoryId: categoryId || undefined,
				neighborhoodId: neighborhoodId || undefined,
				q: q || undefined,
				limit: 36,
			}),
			categoriesRepo.listActive({ supabase: ctx.supabase }),
			citiesRepo.listActive({ supabase: ctx.supabase }),
			neighborhoodsRepo.listAll({ supabase: ctx.supabase }),
			promotionsRepo.listPublicTodayFeed({
				supabase: ctx.supabase,
				limit: 12,
			}),
		]);
	if (isError(businesses)) throw new Response(businesses.error, { status: 500 });
	if (isError(categories)) throw new Response(categories.error, { status: 500 });
	if (isError(cities)) throw new Response(cities.error, { status: 500 });
	if (isError(neighborhoods))
		throw new Response(neighborhoods.error, { status: 500 });
	const promotionsList = isError(promotions) ? [] : promotions.success;

	return {
		user: ctx.user
			? { id: ctx.user.id, email: ctx.user.email ?? null }
			: null,
		profile: ctx.profile,
		businesses: businesses.success.map((b) => ({
			...b,
			logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
			cover_url: getPublicUrl(ctx.supabase, "business-covers", b.cover_path),
		})),
		promotions: promotionsList.map((p) => {
			const cover = (p.images ?? []).slice().sort(
				(a, b) => a.sort_order - b.sort_order,
			)[0];
			const biz = Array.isArray(p.business) ? p.business[0] : p.business;
			const bizCity = biz?.city
				? Array.isArray(biz.city)
					? biz.city[0]
					: biz.city
				: null;
			const bizNeighborhood = biz?.neighborhood
				? Array.isArray(biz.neighborhood)
					? biz.neighborhood[0]
					: biz.neighborhood
				: null;
			return {
				id: p.id,
				title: p.title,
				description: p.description,
				schedule_note: p.schedule_note,
				cover_url: cover
					? getPublicUrl(ctx.supabase, PROMOTION_IMAGE_BUCKET, cover.storage_path)
					: null,
				business: biz
					? {
						handle: biz.handle,
						name: biz.name,
						logo_url: getPublicUrl(
							ctx.supabase,
							"business-logos",
							biz.logo_path,
						),
						city: bizCity,
						neighborhood: bizNeighborhood,
					}
					: null,
			};
		}),
		categories: categories.success,
		cities: cities.success,
		neighborhoods: neighborhoods.success,
		filters: {
			cityId: cityId ?? "",
			categoryId: categoryId ?? "",
			neighborhoodId: neighborhoodId ?? "",
			q: q ?? "",
		},
	};
}

export default function Home() {
	const {
		user,
		profile,
		businesses,
		promotions,
		categories,
		cities,
		neighborhoods,
		filters,
	} = useLoaderData<typeof loader>();

	const filteredNeighborhoods = filters.cityId
		? neighborhoods.filter((n) => n.city_id === filters.cityId)
		: neighborhoods;

	return (
		<div className="min-h-svh bg-background">
			<SiteHeader user={user} role={profile?.role} />

			<section className="border-b border-border/60 bg-gradient-to-b from-muted/40 to-background">
				<div className="mx-auto max-w-6xl px-4 py-12">
					<div className="max-w-2xl">
						<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
							Negócios locais perto de você
						</h1>
						<p className="mt-2 text-sm text-muted-foreground sm:text-base">
							Descubra comércios, serviços e produtores em Feira de Santana - BA
							e Orós - CE. Cadastre o seu negócio gratuitamente.
						</p>
						<div className="mt-4 flex items-center gap-2">
							<Link
								to="/signup"
								className={buttonVariants({ variant: "default", size: "default" })}
							>
								Cadastrar negócio
							</Link>
						</div>
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-4 py-8">
				<Form
					method="get"
					className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-4"
				>
					<input
						name="q"
						defaultValue={filters.q}
						placeholder="Buscar por nome…"
						className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm sm:col-span-2"
					/>
					<select
						name="city"
						defaultValue={filters.cityId}
						className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
					>
						<option value="">Todas as cidades</option>
						{cities.map((c) => (
							<option key={c.id} value={c.id}>
								{c.name} - {c.state}
							</option>
						))}
					</select>
					<select
						name="category"
						defaultValue={filters.categoryId}
						className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
					>
						<option value="">Todas as categorias</option>
						{categories.map((c) => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>
					<select
						name="neighborhood"
						defaultValue={filters.neighborhoodId}
						className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
					>
						<option value="">Todos os bairros</option>
						{filteredNeighborhoods.map((n) => (
							<option key={n.id} value={n.id}>
								{n.name}
							</option>
						))}
					</select>
					<button
						type="submit"
						className={`${buttonVariants({ variant: "default", size: "default" })} sm:col-span-1`}
					>
						Filtrar
					</button>
				</Form>

				<div className="pt-6">
					{businesses.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
							<p className="text-sm text-muted-foreground">
								Nenhum negócio encontrado para os filtros selecionados.
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
			</section>

			{promotions.length > 0 ? (
				<section className=" mx-auto max-w-6xl px-4 py-8">
					<div className="flex items-baseline justify-between gap-2 pb-3">
						<h2 className="text-lg font-semibold tracking-tight">
							Promoções de hoje
						</h2>
						<span className="text-xs text-muted-foreground">
							{promotions.length}{" "}
							{promotions.length === 1 ? "promoção ativa" : "promoções ativas"}
						</span>
					</div>
					<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{promotions.map((p) => (
							<li key={p.id}>
								<Link
									to={
										p.business
											? `/negocio/${p.business.handle}`
											: "#"
									}
									className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:border-foreground/20 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
								>
									<div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
										{p.cover_url ? (
											<img
												src={p.cover_url}
												alt=""
												className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
												loading="lazy"
											/>
										) : (
											<div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
												sem imagem
											</div>
										)}
									</div>
									<div className="flex flex-1 flex-col gap-2 p-3">
										<div className="flex items-start gap-3">
											<div className="-mt-7 size-10 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
												{p.business?.logo_url ? (
													<img
														src={p.business.logo_url}
														alt=""
														className="h-full w-full object-cover"
														loading="lazy"
													/>
												) : (
													<div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
														•
													</div>
												)}
											</div>
											<div className="min-w-0 flex-1">
												<h3 className="truncate text-sm font-semibold tracking-tight">
													{p.title}
												</h3>
												<p className="truncate text-xs text-muted-foreground">
													{p.business?.name}
												</p>
											</div>
										</div>
										{p.description ? (
											<p className="line-clamp-2 text-xs text-muted-foreground">
												{p.description}
											</p>
										) : null}
										<p className="text-[11px] text-muted-foreground">
											{p.business?.neighborhood?.name}
											{p.business?.city
												? ` · ${p.business.city.name} - ${p.business.city.state}`
												: ""}
											{p.schedule_note ? ` · ${p.schedule_note}` : ""}
										</p>
									</div>
								</Link>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
				JoaoTem — marketplace local
			</footer>
		</div>
	);
}
