import { Form, Link, useLoaderData, useSearchParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { requireAdmin } from "~/lib/auth.server";
import { BUSINESS_STATUS_LABELS } from "~/lib/constants";
import { getPublicUrl } from "~/lib/storage.server";
import * as adminRepo from "~/repositories/admin";
import * as citiesRepo from "~/repositories/cities";
import { isError } from "~/types";
import type { Route } from "./+types/businesses-index";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — Negócios" },
];

const STATUSES = ["all", "pending", "approved", "rejected", "suspended"] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	pending: "secondary",
	approved: "default",
	rejected: "destructive",
	suspended: "outline",
};

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	const url = new URL(request.url);
	const statusParam = url.searchParams.get("status");
	const status = (
		STATUSES as readonly string[]
	).includes(statusParam ?? "")
		? (statusParam as StatusFilter)
		: "all";
	const cityId = url.searchParams.get("city") ?? undefined;

	const [items, cities] = await Promise.all([
		adminRepo.listBusinesses({
			supabase: ctx.supabase,
			status: status === "all" ? "all" : status,
			cityId: cityId || undefined,
		}),
		citiesRepo.listActive({ supabase: ctx.supabase }),
	]);

	if (isError(items)) throw new Response(items.error, { status: 500 });
	if (isError(cities)) throw new Response(cities.error, { status: 500 });

	return {
		items: items.success.map((b) => ({
			...b,
			logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
		})),
		cities: cities.success,
		filters: { status, cityId: cityId ?? "" },
	};
}

export default function AdminBusinesses() {
	const { items, cities, filters } = useLoaderData<typeof loader>();
	const [params] = useSearchParams();

	return (
		<main className="mx-auto max-w-6xl px-4 py-8">
			<div className="pb-4">
				<h1 className="text-xl font-semibold tracking-tight">Todos os negócios</h1>
			</div>

			<Form method="get" className="flex flex-wrap items-end gap-3 pb-6">
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Status</span>
					<select
						name="status"
						defaultValue={filters.status}
						className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
					>
						{STATUSES.map((s) => (
							<option key={s} value={s}>
								{s === "all" ? "Todos" : BUSINESS_STATUS_LABELS[s]}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Cidade</span>
					<select
						name="city"
						defaultValue={filters.cityId}
						className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
					>
						<option value="">Todas</option>
						{cities.map((c) => (
							<option key={c.id} value={c.id}>
								{c.name} - {c.state}
							</option>
						))}
					</select>
				</label>
				<button
					type="submit"
					className={buttonVariants({ variant: "default", size: "sm" })}
				>
					Filtrar
				</button>
				{params.toString() ? (
					<Link
						to="/admin/businesses"
						className={buttonVariants({ variant: "ghost", size: "sm" })}
					>
						Limpar
					</Link>
				) : null}
			</Form>

			{items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">Nenhum negócio encontrado.</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
							<tr>
								<th className="px-3 py-2.5">Negócio</th>
								<th className="px-3 py-2.5">Categoria</th>
								<th className="px-3 py-2.5">Cidade / Bairro</th>
								<th className="px-3 py-2.5">Status</th>
								<th className="px-3 py-2.5"></th>
							</tr>
						</thead>
						<tbody>
							{items.map((b) => (
								<tr key={b.id} className="border-t border-border/60">
									<td className="px-3 py-2.5">
										<div className="flex items-center gap-2">
											<div className="size-8 shrink-0 overflow-hidden rounded-md border border-border bg-background">
												{b.logo_url ? (
													<img
														src={b.logo_url}
														alt=""
														className="h-full w-full object-cover"
													/>
												) : null}
											</div>
											<div className="min-w-0">
												<p className="truncate font-medium">{b.name}</p>
												<p className="truncate text-xs text-muted-foreground">
													@{b.handle}
												</p>
											</div>
										</div>
									</td>
									<td className="px-3 py-2.5 text-muted-foreground">
										{b.category?.name ?? "—"}
									</td>
									<td className="px-3 py-2.5 text-muted-foreground">
										{b.city?.name} - {b.city?.state} · {b.neighborhood?.name}
									</td>
									<td className="px-3 py-2.5">
										<Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>
											{BUSINESS_STATUS_LABELS[b.status]}
										</Badge>
									</td>
									<td className="px-3 py-2.5 text-right">
										<Link
											to={`/admin/businesses/${b.id}`}
											className={buttonVariants({
												variant: "outline",
												size: "sm",
											})}
										>
											Abrir
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</main>
	);
}
