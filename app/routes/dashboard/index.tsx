import { Link, data, useLoaderData } from "react-router";
import { PlanBadge } from "~/components/business/plan-badge";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { requireUser } from "~/lib/auth.server";
import { BUSINESS_STATUS_LABELS } from "~/lib/constants";
import {
	daysUntilExpiry,
	effectivePlanTier,
} from "~/lib/plan";
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
		effective_tier: effectivePlanTier({
			plan_tier: b.plan_tier,
			plan_expires_at: b.plan_expires_at,
		}),
		days_until_expiry: daysUntilExpiry(b.plan_expires_at),
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
								<div className="flex flex-col items-end gap-1">
									<Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>
										{BUSINESS_STATUS_LABELS[b.status]}
									</Badge>
									<PlanBadge tier={b.effective_tier} />
								</div>
							</div>
							{b.effective_tier === null ? (
								<div className="rounded-md bg-destructive/10 px-2.5 py-2 text-xs">
									<p className="font-semibold text-destructive">
										Plano inativo — seu negócio está oculto do site.
									</p>
									<p className="text-destructive/80">
										Solicite uma renovação para voltar a aparecer nas buscas.
									</p>
								</div>
							) : b.days_until_expiry != null && b.days_until_expiry <= 7 ? (
								<p className="text-xs text-amber-700">
									Expira em {b.days_until_expiry} dia(s) — considere renovar.
								</p>
							) : b.days_until_expiry != null ? (
								<p className="text-xs text-muted-foreground">
									Expira em {b.days_until_expiry} dia(s).
								</p>
							) : null}
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
							<div className="flex flex-wrap items-center gap-2">
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
								<Link
									to={`/dashboard/upgrade?business=${b.id}`}
									className={buttonVariants({ variant: "ghost", size: "sm" })}
								>
									{b.effective_tier === null
										? "Renovar plano"
										: b.effective_tier === "basico"
											? "Upgrade Ouro"
											: "Renovar"}
								</Link>
								{b.status === "approved" && b.effective_tier !== null ? (
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
