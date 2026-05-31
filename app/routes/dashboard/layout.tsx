import { Outlet, data, useLoaderData } from "react-router";
import {
	parseActiveBusinessId,
	resolveActiveBusinessId,
	serializeActiveBusinessId,
} from "~/lib/active-business.server";
import { requireUser } from "~/lib/auth.server";
import { effectivePlanTier } from "~/lib/plan";
import { getPublicUrl } from "~/lib/storage.server";
import * as businessesRepo from "~/repositories/businesses";
import { isError } from "~/types";
import { SidebarProvider } from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";
import type { Route } from "./+types/layout";
import { AppSidebar, type DashboardBusiness } from "./app-sidebar";
import { DashboardHeader } from "./dashboard-header";

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireUser(request);
	const [profileResult, businessesResult, cookieId] = await Promise.all([
		ctx.supabase
			.from("profiles")
			.select("id, email, full_name, role")
			.eq("id", ctx.user.id)
			.maybeSingle(),
		businessesRepo.listByUser({ supabase: ctx.supabase, userId: ctx.user.id }),
		parseActiveBusinessId(request),
	]);

	const list = isError(businessesResult) ? [] : businessesResult.success;
	const businesses: DashboardBusiness[] = list.map((b) => ({
		id: b.id,
		name: b.name,
		handle: b.handle,
		logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
		status: b.status,
		effective_tier: effectivePlanTier({
			plan_tier: b.plan_tier,
			plan_expires_at: b.plan_expires_at,
		}),
	}));

	const resolvedId = resolveActiveBusinessId({
		pathname: new URL(request.url).pathname,
		cookieId,
		businessIds: businesses.map((b) => b.id),
	});
	const activeBusiness =
		businesses.find((b) => b.id === resolvedId) ?? null;

	let headers = ctx.headers;
	if (resolvedId && resolvedId !== cookieId) {
		headers = new Headers(ctx.headers);
		headers.append("Set-Cookie", await serializeActiveBusinessId(resolvedId));
	}

	return data(
		{
			user: { id: ctx.user.id, email: ctx.user.email ?? null },
			profile: profileResult.data,
			businesses,
			activeBusiness,
		},
		{ headers },
	);
}

export default function DashboardLayout() {
	const { user, profile, businesses, activeBusiness } =
		useLoaderData<typeof loader>();

	return (
		<TooltipProvider delay={120}>
			<SidebarProvider>
				<AppSidebar
					user={user}
					profile={profile}
					businesses={businesses}
					activeBusiness={activeBusiness}
				/>
				<div className="relative flex min-h-svh w-full flex-1 flex-col bg-background">
					<DashboardHeader activeBusiness={activeBusiness} />
					<Outlet />
				</div>
			</SidebarProvider>
		</TooltipProvider>
	);
}
