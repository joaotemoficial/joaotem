import {
	Building2,
	CreditCard,
	Inbox,
	PlusCircle,
	Replace,
	ToggleRight,
} from "lucide-react";
import { NavLink, Outlet, data, useLoaderData } from "react-router";
import { SiteHeader } from "~/components/nav/site-header";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	return data(
		{ user: { id: ctx.user.id, email: ctx.user.email ?? null } },
		{ headers: ctx.headers },
	);
}

const NAV_GROUPS = [
	{
		label: "Geral",
		items: [{ to: "/admin", label: "Pagamentos", icon: CreditCard, end: true }],
	},
	{
		label: "Negócios",
		items: [
			{ to: "/admin/businesses", label: "Todos os negócios", icon: Building2 },
			{ to: "/admin/businesses/new", label: "Novo negócio", icon: PlusCircle },
			{ to: "/admin/reclaims", label: "Reivindicações", icon: Inbox },
		],
	},
	{
		label: "Configurações",
		items: [
			{ to: "/admin/feature-flags", label: "Recursos", icon: ToggleRight },
			{ to: "/admin/search-synonyms", label: "Sinônimos", icon: Replace },
		],
	},
] as const;

export default function AdminLayout() {
	const { user } = useLoaderData<typeof loader>();
	return (
		<div className="min-h-svh bg-background">
			<SiteHeader user={user} role="admin" />
			<div className="border-b bg-muted/30">
				<nav
					aria-label="Navegação do administrador"
					className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2"
				>
					{NAV_GROUPS.map((group, index) => (
						<div key={group.label} className="flex items-center gap-1">
							{index > 0 ? (
								<span
									aria-hidden
									className="mx-1 hidden h-5 w-px bg-border sm:block"
								/>
							) : null}
							<span className="hidden pr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70 lg:inline">
								{group.label}
							</span>
							{group.items.map((item) => (
								<NavLink
									key={item.to}
									to={item.to}
									end={"end" in item ? item.end : false}
									className={({ isActive }) =>
										cn(
											"flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
											isActive
												? "bg-background text-foreground shadow-sm ring-1 ring-border"
												: "text-muted-foreground hover:bg-muted hover:text-foreground",
										)
									}
								>
									<item.icon className="size-4 shrink-0" aria-hidden />
									{item.label}
								</NavLink>
							))}
						</div>
					))}
				</nav>
			</div>
			<Outlet />
		</div>
	);
}
