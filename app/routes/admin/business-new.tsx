import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, redirect, useLoaderData, useNavigation } from "react-router";
import { BusinessForm } from "~/components/business/business-form";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { requireAdmin } from "~/lib/auth.server";
import { handleAdminBusinessCreate } from "~/lib/admin-business-action.server";
import { getPublicUrl } from "~/lib/storage.server";
import { businessFormSchema } from "~/lib/validation/business";
import * as adminRepo from "~/repositories/admin";
import * as businessesRepo from "~/repositories/businesses";
import * as categoriesRepo from "~/repositories/categories";
import * as citiesRepo from "~/repositories/cities";
import * as neighborhoodsRepo from "~/repositories/neighborhoods";
import { isError, unwrap } from "~/types";
import type { Route } from "./+types/business-new";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — Novo negócio" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	const [cats, cities, neighborhoods, system] = await Promise.all([
		categoriesRepo.listActive({ supabase: ctx.supabase }),
		citiesRepo.listActive({ supabase: ctx.supabase }),
		neighborhoodsRepo.listAll({ supabase: ctx.supabase }),
		businessesRepo.listSystemOwned({ supabase: ctx.supabase }),
	]);

	const systemRows = unwrap(system) as Array<{
		id: string;
		name: string;
		handle: string;
		status: string;
		created_at: string;
		whatsapp: string;
		logo_path: string | null;
		category: { name: string } | null;
		city: { name: string; state: string } | null;
		neighborhood: { name: string } | null;
	}>;
	return {
		categories: unwrap(cats) as Array<{ id: string; name: string }>,
		cities: unwrap(cities) as Array<{
			id: string;
			name: string;
			state: string;
		}>,
		neighborhoods: unwrap(neighborhoods) as Array<{
			id: string;
			name: string;
			city_id: string;
		}>,
		systemBusinesses: systemRows.map((b) => ({
			id: b.id,
			name: b.name,
			handle: b.handle,
			status: b.status,
			created_at: b.created_at,
			whatsapp: b.whatsapp,
			category_name: b.category?.name ?? null,
			city_name: b.city?.name ?? null,
			city_state: b.city?.state ?? null,
			neighborhood_name: b.neighborhood?.name ?? null,
			logo_url: getPublicUrl(ctx.supabase, "business-logos", b.logo_path),
		})),
	};
}

export async function action({ request }: Route.ActionArgs) {
	const ctx = await requireAdmin(request);
	const formData = await request.formData();
	const reassignBusinessId = formData.get("reassign_business_id");

	if (typeof reassignBusinessId === "string" && reassignBusinessId.length > 0) {
		const email = String(formData.get("owner_email") ?? "").trim();
		if (!email) {
			return {
				reassign: {
					business_id: reassignBusinessId,
					error: "Informe um email",
				},
			};
		}
		const profileResult = await adminRepo.findProfileByEmail({
			supabase: ctx.supabase,
			email,
		});
		if (isError(profileResult)) {
			return {
				reassign: {
					business_id: reassignBusinessId,
					error: profileResult.error,
				},
			};
		}
		if (!profileResult.success) {
			return {
				reassign: {
					business_id: reassignBusinessId,
					error: "Nenhum usuário com este email",
				},
			};
		}
		const updateResult = await adminRepo.reassignBusinessOwner({
			supabase: ctx.supabase,
			id: reassignBusinessId,
			newUserId: profileResult.success.id,
		});
		if (isError(updateResult)) {
			return {
				reassign: {
					business_id: reassignBusinessId,
					error: updateResult.error,
				},
			};
		}
		throw redirect("/admin/businesses/new", { headers: ctx.headers });
	}

	const result = await handleAdminBusinessCreate({
		formData,
		supabase: ctx.supabase,
		reviewerId: ctx.user.id,
	});
	if (!result.ok) return { submission: result.submission };
	throw redirect("/admin/businesses/new", { headers: ctx.headers });
}

export default function AdminBusinessNew({
	actionData,
}: Route.ComponentProps) {
	const { categories, cities, neighborhoods, systemBusinesses } =
		useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const [form, fields] = useForm({
		lastResult: actionData && "submission" in actionData ? actionData.submission : null,
		shouldRevalidate: "onBlur",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: businessFormSchema });
		},
	});

	const reassignError =
		actionData && "reassign" in actionData ? actionData.reassign : null;

	return (
		<main className="mx-auto max-w-5xl px-4 py-8">
			<div className="pb-6">
				<h1 className="text-xl font-semibold tracking-tight">
					Novo negócio (sem dono)
				</h1>
				<p className="text-sm text-muted-foreground">
					Crie um negócio sem vincular a um perfil. Ele será publicado imediatamente
					no site e poderá ser atribuído a um usuário real depois.
				</p>
			</div>

			<section className="pb-10">
				<BusinessForm
					form={form}
					fields={{
						name: fields.name,
						handle: fields.handle,
						category_id: fields.category_id,
						city_id: fields.city_id,
						neighborhood_id: fields.neighborhood_id,
						short_description: fields.short_description,
						whatsapp: fields.whatsapp,
						instagram: fields.instagram,
						offers_delivery: fields.offers_delivery,
						logo: fields.logo,
						cover: fields.cover,
					}}
					categories={categories}
					cities={cities}
					neighborhoods={neighborhoods}
					defaults={{}}
					submitting={submitting}
					submitLabel="Criar negócio"
				/>
			</section>

			<section>
				<div className="pb-4">
					<h2 className="text-base font-semibold tracking-tight">
						Negócios do sistema (sem dono)
					</h2>
					<p className="text-sm text-muted-foreground">
						Atribua um destes negócios a um usuário real informando o email
						cadastrado.
					</p>
				</div>

				{systemBusinesses.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
						<p className="text-sm text-muted-foreground">
							Nenhum negócio do sistema no momento.
						</p>
					</div>
				) : (
					<ul className="grid gap-3">
						{systemBusinesses.map((b) => {
							const rowError =
								reassignError && reassignError.business_id === b.id
									? reassignError.error
									: null;
							return (
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
											<h3 className="truncate text-sm font-semibold">
												{b.name}
											</h3>
											<Badge variant="secondary">@{b.handle}</Badge>
										</div>
										<p className="truncate text-xs text-muted-foreground">
											{b.category_name ?? "—"}
											{b.neighborhood_name ? ` · ${b.neighborhood_name}` : ""}
											{b.city_name ? ` · ${b.city_name} - ${b.city_state}` : ""}
										</p>
									</div>
									<Form
										method="post"
										className="flex flex-col gap-1 sm:flex-row sm:items-start"
									>
										<input
											type="hidden"
											name="reassign_business_id"
											value={b.id}
										/>
										<div className="flex flex-col gap-1">
											<div className="flex gap-2">
												<Input
													type="email"
													name="owner_email"
													placeholder="email@dominio.com"
													required
													className="w-56"
												/>
												<Button type="submit" size="sm">
													Atribuir
												</Button>
											</div>
											{rowError ? (
												<span className="text-xs text-destructive">
													{rowError}
												</span>
											) : null}
										</div>
									</Form>
								</li>
							);
						})}
					</ul>
				)}
			</section>
		</main>
	);
}
