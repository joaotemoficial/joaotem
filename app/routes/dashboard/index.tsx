import { Link, data, useLoaderData } from "react-router";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { requireUser } from "~/lib/auth.server";
import { BUSINESS_STATUS_LABELS } from "~/lib/constants";
import { getPublicUrl } from "~/lib/storage.server";
import * as businesses from "~/repositories/businesses";
import { unwrap } from "~/types";
import type { Route } from "./+types/index";

export const meta: Route.MetaFunction = () => [
	{ title: "Meu painel — JoaoTem" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireUser(request);
	const result = await businesses.listByUser({
		supabase: ctx.supabase,
		userId: ctx.user.id,
	});
	const list = unwrap(result);
	const items = (Array.isArray(list) ? list : []).map((b) => ({
		...b,
		logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
	}));
	return data({ items }, { headers: ctx.headers });
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	pending: "secondary",
	approved: "default",
	rejected: "destructive",
	suspended: "outline",
};

export default function DashboardHome() {
	const { items } = useLoaderData<typeof loader>();
	return (
		<main className="mx-auto max-w-5xl px-4 py-8">
			<div className="flex items-center justify-between gap-2 pb-6">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">Meus negócios</h1>
					<p className="text-sm text-muted-foreground">
						Gerencie os negócios cadastrados na sua conta.
					</p>
				</div>
				<Link
					to="/dashboard/businesses/new"
					className={buttonVariants({ variant: "default", size: "default" })}
				>
					Novo negócio
				</Link>
			</div>

			{items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">
						Você ainda não cadastrou nenhum negócio.
					</p>
					<Link
						to="/dashboard/businesses/new"
						className={`mt-3 ${buttonVariants({ variant: "default", size: "default" })}`}
					>
						Cadastrar agora
					</Link>
				</div>
			) : (
				<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((b) => (
						<li
							key={b.id}
							className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4"
						>
							<div className="flex items-center gap-3">
								<div className="size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
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
									<h2 className="truncate text-sm font-semibold">{b.name}</h2>
									<p className="truncate text-xs text-muted-foreground">
										@{b.handle}
									</p>
								</div>
								<Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>
									{BUSINESS_STATUS_LABELS[b.status]}
								</Badge>
							</div>
							{b.status === "rejected" && b.rejection_reason ? (
								<p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
									Motivo: {b.rejection_reason}
								</p>
							) : null}
							{b.status === "suspended" && b.rejection_reason ? (
								<p className="rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
									Suspenso: {b.rejection_reason}
								</p>
							) : null}
							<div className="flex items-center gap-2">
								<Link
									to={`/dashboard/businesses/${b.id}`}
									className={buttonVariants({ variant: "outline", size: "sm" })}
								>
									Editar
								</Link>
								<Link
									to={`/dashboard/businesses/${b.id}/products`}
									className={buttonVariants({ variant: "ghost", size: "sm" })}
								>
									Produtos
								</Link>
								{b.status === "approved" ? (
									<Link
										to={`/negocio/${b.handle}`}
										className={buttonVariants({ variant: "ghost", size: "sm" })}
									>
										Ver página
									</Link>
								) : null}
							</div>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
