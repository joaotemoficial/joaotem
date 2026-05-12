import { Outlet, data, useLoaderData } from "react-router";
import { SiteHeader } from "~/components/nav/site-header";
import { requireUser } from "~/lib/auth.server";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireUser(request);
	const { data: profile } = await ctx.supabase
		.from("profiles")
		.select("id, email, full_name, role")
		.eq("id", ctx.user.id)
		.maybeSingle();
	return data(
		{ user: { id: ctx.user.id, email: ctx.user.email ?? null }, profile },
		{ headers: ctx.headers },
	);
}

export default function DashboardLayout() {
	const { user, profile } = useLoaderData<typeof loader>();
	return (
		<div className="min-h-svh bg-background">
			<SiteHeader user={user} role={profile?.role} />
			<Outlet />
		</div>
	);
}
