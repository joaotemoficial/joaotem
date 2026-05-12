import { Link, useLoaderData } from "react-router";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { requireAdmin } from "~/lib/auth.server";
import { getPublicUrl } from "~/lib/storage.server";
import * as adminRepo from "~/repositories/admin";
import { isError } from "~/types";
import type { Route } from "./+types/index";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — Pendentes" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	const result = await adminRepo.listBusinesses({
		supabase: ctx.supabase,
		status: "pending",
	});
	if (isError(result)) {
		throw new Response(result.error, { status: 500 });
	}

	return {
		items: result.success.map((b) => ({
			...b,
			logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
		})),
	};
}

export default function AdminPending() {
	const { items } = useLoaderData<typeof loader>();
	return (
		<main className="mx-auto max-w-5xl px-4 py-8">
			<div className="pb-6">
				<h1 className="text-xl font-semibold tracking-tight">
					Pendentes de aprovação
				</h1>
				<p className="text-sm text-muted-foreground">
					Negócios cadastrados aguardando análise.
				</p>
			</div>

			{items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">
						Nenhum negócio pendente. 🎉
					</p>
				</div>
			) : (
				<ul className="grid gap-3">
					{items.map((b) => (
						<li
							key={b.id}
							className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center"
						>
							<div className="size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
								{b.logo_url ? (
									<img
										src={b.logo_url}
										alt=""
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
										•
									</div>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<h2 className="truncate text-sm font-semibold">{b.name}</h2>
									<Badge variant="secondary">@{b.handle}</Badge>
								</div>
								<p className="truncate text-xs text-muted-foreground">
									{b.category?.name ?? "—"} · {b.neighborhood?.name ?? ""} ·{" "}
									{b.city?.name} - {b.city?.state}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{b.owner?.email ?? "?"} · WhatsApp {b.whatsapp}
								</p>
							</div>
							<Link
								to={`/admin/businesses/${b.id}`}
								className={buttonVariants({ variant: "default", size: "sm" })}
							>
								Analisar
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
