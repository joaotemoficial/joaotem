import { Link, Outlet, data, useLoaderData } from "react-router";
import { SiteHeader } from "~/components/nav/site-header";
import { requireAdmin } from "~/lib/auth.server";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	return data(
		{ user: { id: ctx.user.id, email: ctx.user.email ?? null } },
		{ headers: ctx.headers },
	);
}

export default function AdminLayout() {
	const { user } = useLoaderData<typeof loader>();
	return (
		<div className="min-h-svh bg-background">
			<SiteHeader user={user} role="admin" />
			<div className="border-b bg-muted/30">
				<nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2 text-sm">
					<Link to="/admin" className="text-muted-foreground hover:text-foreground">
						Pagamentos
					</Link>
					<Link
						to="/admin/businesses"
						className="text-muted-foreground hover:text-foreground"
					>
						Todos os negócios
					</Link>
					<Link
						to="/admin/businesses/new"
						className="text-muted-foreground hover:text-foreground"
					>
						Novo negócio
					</Link>
					<Link
						to="/admin/reclaims"
						className="text-muted-foreground hover:text-foreground"
					>
						Reivindicações
					</Link>
					<Link
						to="/admin/feature-flags"
						className="text-muted-foreground hover:text-foreground"
					>
						Recursos
					</Link>
					<Link
						to="/admin/search-synonyms"
						className="text-muted-foreground hover:text-foreground"
					>
						Sinônimos
					</Link>
				</nav>
			</div>
			<Outlet />
		</div>
	);
}
