import { Form, Link, redirect, useLoaderData } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { requireAdmin } from "~/lib/auth.server";
import { getPublicUrl } from "~/lib/storage.server";
import * as reclaimsRepo from "~/repositories/reclaims";
import { isError } from "~/types";
import type { Route } from "./+types/reclaims";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — Reivindicações" },
];

const STATUSES = ["pending", "approved", "rejected", "all"] as const;
type Status = (typeof STATUSES)[number];

function parseStatus(value: string | null): Status {
	return (STATUSES as readonly string[]).includes(value ?? "")
		? (value as Status)
		: "pending";
}

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	const url = new URL(request.url);
	const status = parseStatus(url.searchParams.get("status"));

	const result = await reclaimsRepo.listForAdmin({
		supabase: ctx.supabase,
		status,
	});
	if (isError(result)) {
		throw new Response(result.error, { status: 500 });
	}

	return {
		status,
		items: result.success.map((r) => ({
			id: r.id,
			business_id: r.business_id,
			message: r.message,
			status: r.status,
			created_at: r.created_at,
			decision_note: r.decision_note,
			business: r.business
				? {
					id: r.business.id,
					name: r.business.name,
					handle: r.business.handle,
					logo_url: getPublicUrl(
						ctx.supabase,
						"business-logos",
						r.business.logo_path,
					),
				}
				: null,
			requester: r.requester,
		})),
	};
}

export async function action({ request }: Route.ActionArgs) {
	const ctx = await requireAdmin(request);
	const formData = await request.formData();
	const intent = String(formData.get("intent") ?? "");
	const reclaimId = String(formData.get("reclaim_id") ?? "");

	if (!reclaimId) {
		return { error: "ID inválido." };
	}

	if (intent === "approve") {
		const result = await reclaimsRepo.approveById({
			supabase: ctx.supabase,
			id: reclaimId,
			reviewerId: ctx.user.id,
		});
		if (isError(result)) return { error: result.error };
		throw redirect("/admin/reclaims", { headers: ctx.headers });
	}

	if (intent === "reject") {
		const note = String(formData.get("note") ?? "").trim();
		const result = await reclaimsRepo.rejectById({
			supabase: ctx.supabase,
			id: reclaimId,
			reviewerId: ctx.user.id,
			note: note.length > 0 ? note : null,
		});
		if (isError(result)) return { error: result.error };
		throw redirect("/admin/reclaims", { headers: ctx.headers });
	}

	return { error: "Ação inválida." };
}

const STATUS_LABEL: Record<Status, string> = {
	pending: "Pendentes",
	approved: "Aprovadas",
	rejected: "Rejeitadas",
	all: "Todas",
};

export default function AdminReclaims({ actionData }: Route.ComponentProps) {
	const { items, status } = useLoaderData<typeof loader>();
	const error = actionData && "error" in actionData ? actionData.error : null;

	return (
		<main className="mx-auto max-w-5xl px-4 py-8">
			<div className="pb-6">
				<h1 className="text-xl font-semibold tracking-tight">
					Reivindicações de negócios
				</h1>
				<p className="text-sm text-muted-foreground">
					Aprove uma reivindicação para transferir a propriedade do negócio ao
					solicitante.
				</p>
			</div>

			<nav className="mb-4 flex flex-wrap gap-2">
				{STATUSES.map((s) => (
					<Link
						key={s}
						to={`/admin/reclaims?status=${s}`}
						className={`rounded-full border px-3 py-1 text-xs ${
							status === s
								? "border-foreground bg-foreground text-background"
								: "border-border text-muted-foreground hover:text-foreground"
						}`}
					>
						{STATUS_LABEL[s]}
					</Link>
				))}
			</nav>

			{error ? (
				<p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{error}
				</p>
			) : null}

			{items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">
						Nenhuma reivindicação {STATUS_LABEL[status].toLowerCase()}.
					</p>
				</div>
			) : (
				<ul className="grid gap-3">
					{items.map((r) => (
						<li
							key={r.id}
							className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4"
						>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
								<div className="size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
									{r.business?.logo_url ? (
										<img
											src={r.business.logo_url}
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
										<h2 className="truncate text-sm font-semibold">
											{r.business?.name ?? "(removido)"}
										</h2>
										{r.business ? (
											<Badge variant="secondary">@{r.business.handle}</Badge>
										) : null}
										<StatusBadge status={r.status} />
									</div>
									<p className="truncate text-xs text-muted-foreground">
										Solicitante:{" "}
										{r.requester?.full_name
											? `${r.requester.full_name} <${r.requester.email}>`
											: (r.requester?.email ?? r.id)}
									</p>
									<p className="text-xs text-muted-foreground">
										Enviada em{" "}
										{new Date(r.created_at).toLocaleString("pt-BR")}
									</p>
								</div>
							</div>

							{r.message ? (
								<p className="rounded-md bg-muted/40 px-3 py-2 text-sm">
									{r.message}
								</p>
							) : null}

							{r.decision_note ? (
								<p className="text-xs text-muted-foreground">
									Nota da decisão: {r.decision_note}
								</p>
							) : null}

							{r.status === "pending" ? (
								<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
									<Form
										method="post"
										className="flex flex-col gap-2 sm:flex-row sm:items-center"
									>
										<input type="hidden" name="reclaim_id" value={r.id} />
										<input type="hidden" name="intent" value="reject" />
										<Input
											name="note"
											placeholder="Motivo (opcional)"
											className="w-56"
										/>
										<Button
											type="submit"
											variant="outline"
											size="sm"
										>
											Rejeitar
										</Button>
									</Form>
									<Form method="post">
										<input type="hidden" name="reclaim_id" value={r.id} />
										<input type="hidden" name="intent" value="approve" />
										<Button type="submit" size="sm">
											Aprovar e transferir
										</Button>
									</Form>
								</div>
							) : null}
						</li>
					))}
				</ul>
			)}
		</main>
	);
}

function StatusBadge({ status }: { status: string }) {
	const variant: "default" | "secondary" | "destructive" | "outline" =
		status === "approved"
			? "default"
			: status === "rejected"
				? "destructive"
				: "secondary";
	const label =
		status === "pending"
			? "Pendente"
			: status === "approved"
				? "Aprovada"
				: status === "rejected"
					? "Rejeitada"
					: status;
	return <Badge variant={variant}>{label}</Badge>;
}
