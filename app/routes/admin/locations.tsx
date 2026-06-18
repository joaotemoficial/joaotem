import { ChevronRight, Trash2 } from "lucide-react";
import {
	Form,
	Link,
	data,
	redirect,
	useActionData,
	useLoaderData,
	useNavigation,
} from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { requireAdmin } from "~/lib/auth.server";
import { slugify } from "~/lib/slug";
import * as citiesRepo from "~/repositories/cities";
import * as neighborhoodsRepo from "~/repositories/neighborhoods";
import { isError } from "~/types";
import type { Route } from "./+types/locations";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — Cidades e bairros" },
];

type AdminCtx = Awaited<ReturnType<typeof requireAdmin>>;

// FormData values are `string | File`; coerce to a plain string safely.
function field(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value : "";
}

function parseSortOrder(raw: string): number {
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) ? n : 0;
}

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	const url = new URL(request.url);
	const selectedCityId = url.searchParams.get("city");

	const citiesResult = await citiesRepo.listAllForAdmin({
		supabase: ctx.supabase,
	});
	if (isError(citiesResult))
		throw new Response(citiesResult.error, { status: 500 });
	const cities = citiesResult.success;

	const selectedCity =
		(selectedCityId && cities.find((c) => c.id === selectedCityId)) || null;

	const nResult = selectedCity
		? await neighborhoodsRepo.listAllByCityForAdmin({
				supabase: ctx.supabase,
				cityId: selectedCity.id,
			})
		: null;
	if (nResult && isError(nResult))
		throw new Response(nResult.error, { status: 500 });
	const neighborhoods = nResult ? nResult.success : [];

	return { cities, selectedCity, neighborhoods };
}

const badRequest = (error: string) => data({ error }, { status: 400 });

async function deleteCity(formData: FormData, ctx: AdminCtx) {
	const id = field(formData, "id");
	const deps = await citiesRepo.countDependents({ supabase: ctx.supabase, id });
	if (isError(deps)) return badRequest(deps.error);
	const blocking = deps.success.neighborhoods + deps.success.businesses;
	if (blocking > 0) {
		return badRequest(
			`Não é possível excluir: ${deps.success.neighborhoods} bairro(s) e ${deps.success.businesses} negócio(s) usam esta cidade. Desative-a em vez de excluir.`,
		);
	}
	const result = await citiesRepo.remove({ supabase: ctx.supabase, id });
	if (isError(result)) return badRequest(result.error);
	throw redirect("/admin/locations", { headers: ctx.headers });
}

async function upsertCity(intent: string, formData: FormData, ctx: AdminCtx) {
	const name = field(formData, "name").trim();
	const state = field(formData, "state").trim().toUpperCase().slice(0, 2);
	const slug = slugify(field(formData, "slug") || name);
	const isActive = formData.get("is_active") === "on";

	if (!name) return badRequest("Informe o nome da cidade.");
	if (!state) return badRequest("Informe o estado (UF).");
	if (!slug) return badRequest("Não foi possível gerar o slug.");

	const values = {
		name,
		state,
		slug,
		sort_order: parseSortOrder(field(formData, "sort_order")),
		is_active: isActive,
	};

	if (intent === "city-create") {
		const result = await citiesRepo.create({ supabase: ctx.supabase, values });
		if (isError(result)) return badRequest(result.error);
		throw redirect("/admin/locations", { headers: ctx.headers });
	}

	const id = field(formData, "id");
	const result = await citiesRepo.update({ supabase: ctx.supabase, id, patch: values });
	if (isError(result)) return badRequest(result.error);
	throw redirect(`/admin/locations?city=${encodeURIComponent(id)}`, {
		headers: ctx.headers,
	});
}

async function deleteNeighborhood(formData: FormData, ctx: AdminCtx, backTo: string) {
	const id = field(formData, "id");
	const deps = await neighborhoodsRepo.countBusinesses({
		supabase: ctx.supabase,
		id,
	});
	if (isError(deps)) return badRequest(deps.error);
	if (deps.success > 0) {
		return badRequest(
			`Não é possível excluir: ${deps.success} negócio(s) usam este bairro. Desative-o em vez de excluir.`,
		);
	}
	const result = await neighborhoodsRepo.remove({ supabase: ctx.supabase, id });
	if (isError(result)) return badRequest(result.error);
	throw redirect(backTo, { headers: ctx.headers });
}

async function upsertNeighborhood(
	intent: string,
	formData: FormData,
	ctx: AdminCtx,
	cityId: string,
	backTo: string,
) {
	if (!cityId) return badRequest("Selecione uma cidade.");

	const name = field(formData, "name").trim();
	const slug = slugify(field(formData, "slug") || name);
	const isActive = formData.get("is_active") === "on";

	if (!name) return badRequest("Informe o nome do bairro.");
	if (!slug) return badRequest("Não foi possível gerar o slug.");

	const sortOrder = parseSortOrder(field(formData, "sort_order"));

	if (intent === "neighborhood-create") {
		const result = await neighborhoodsRepo.create({
			supabase: ctx.supabase,
			values: { city_id: cityId, name, slug, sort_order: sortOrder, is_active: isActive },
		});
		if (isError(result)) return badRequest(result.error);
		throw redirect(backTo, { headers: ctx.headers });
	}

	const id = field(formData, "id");
	const result = await neighborhoodsRepo.update({
		supabase: ctx.supabase,
		id,
		patch: { name, slug, sort_order: sortOrder, is_active: isActive },
	});
	if (isError(result)) return badRequest(result.error);
	throw redirect(backTo, { headers: ctx.headers });
}

export async function action({ request }: Route.ActionArgs) {
	const ctx = await requireAdmin(request);
	const formData = await request.formData();
	const intent = field(formData, "intent");

	if (intent === "city-delete") return deleteCity(formData, ctx);
	if (intent === "city-create" || intent === "city-update")
		return upsertCity(intent, formData, ctx);

	if (intent.startsWith("neighborhood-")) {
		const cityId = field(formData, "city_id");
		const backTo = cityId
			? `/admin/locations?city=${encodeURIComponent(cityId)}`
			: "/admin/locations";
		if (intent === "neighborhood-delete")
			return deleteNeighborhood(formData, ctx, backTo);
		return upsertNeighborhood(intent, formData, ctx, cityId, backTo);
	}

	return badRequest("Ação inválida");
}

export default function AdminLocations() {
	const { cities, selectedCity, neighborhoods } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	return (
		<main className="mx-auto max-w-4xl px-4 py-8">
			<div className="pb-4">
				<h1 className="text-xl font-semibold tracking-tight">Cidades e bairros</h1>
				<p className="text-sm text-muted-foreground">
					Gerencie as cidades atendidas e seus bairros. O slug é gerado
					automaticamente a partir do nome (pode ser editado). Desative em vez de
					excluir quando houver negócios vinculados.
				</p>
			</div>

			{actionData?.error ? (
				<p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{actionData.error}
				</p>
			) : null}

			{/* ---- Cities ---- */}
			<section className="pb-10">
				<h2 className="pb-3 text-base font-semibold tracking-tight">Cidades</h2>

				{/* Nova cidade */}
				<Form
					method="post"
					className="mb-6 grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-[2fr_auto_2fr_auto_auto] sm:items-end"
				>
					<label className="flex flex-col gap-1 text-sm">
						<span className="font-medium">Nome</span>
						<Input name="name" placeholder="São Paulo" required />
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span className="font-medium">UF</span>
						<Input
							name="state"
							placeholder="SP"
							maxLength={2}
							className="w-16 uppercase"
							required
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span className="font-medium">Slug (opcional)</span>
						<Input name="slug" placeholder="sao-paulo" />
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span className="font-medium">Ordem</span>
						<Input
							name="sort_order"
							type="number"
							defaultValue={0}
							className="w-20"
						/>
					</label>
					<input type="hidden" name="is_active" value="on" />
					<Button
						type="submit"
						name="intent"
						value="city-create"
						disabled={submitting}
					>
						Adicionar
					</Button>
				</Form>

				{/* Lista de cidades */}
				<div className="flex flex-col gap-3">
					{cities.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nenhuma cidade cadastrada.
						</p>
					) : (
						cities.map((c) => {
							const isSelected = selectedCity?.id === c.id;
							return (
								<Form
									key={c.id}
									method="post"
									className={`grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[2fr_auto_2fr_auto_auto] sm:items-end ${
										isSelected
											? "border-foreground/30 ring-1 ring-border"
											: "border-border/70"
									}`}
								>
									<input type="hidden" name="id" value={c.id} />
									<label className="flex flex-col gap-1 text-sm">
										<span className="font-medium">Nome</span>
										<Input name="name" defaultValue={c.name} required />
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span className="font-medium">UF</span>
										<Input
											name="state"
											defaultValue={c.state}
											maxLength={2}
											className="w-16 uppercase"
											required
										/>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span className="font-medium">Slug</span>
										<Input name="slug" defaultValue={c.slug} required />
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span className="font-medium">Ordem</span>
										<Input
											name="sort_order"
											type="number"
											defaultValue={c.sort_order}
											className="w-20"
										/>
									</label>
									<div className="flex items-center gap-2">
										<label className="flex items-center gap-1.5 text-sm text-muted-foreground">
											<input
												type="checkbox"
												name="is_active"
												defaultChecked={c.is_active}
												className="size-4"
											/>
											Ativa
										</label>
										<Button
											type="submit"
											name="intent"
											value="city-update"
											disabled={submitting}
										>
											Salvar
										</Button>
										<Button
											type="submit"
											name="intent"
											value="city-delete"
											variant="ghost"
											size="icon"
											disabled={submitting}
											aria-label="Excluir cidade"
										>
											<Trash2 className="size-4 text-destructive" />
										</Button>
									</div>
									<div className="sm:col-span-5">
										<Link
											to={`/admin/locations?city=${encodeURIComponent(c.id)}`}
											className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
										>
											Gerenciar bairros
											<ChevronRight className="size-4" />
										</Link>
									</div>
								</Form>
							);
						})
					)}
				</div>
			</section>

			{/* ---- Neighborhoods ---- */}
			<section>
				<h2 className="pb-1 text-base font-semibold tracking-tight">
					Bairros
					{selectedCity ? (
						<span className="text-muted-foreground">
							{" "}
							— {selectedCity.name}/{selectedCity.state}
						</span>
					) : null}
				</h2>

				{selectedCity ? (
					<>
						{/* Novo bairro */}
						<Form
							method="post"
							className="mb-6 mt-3 grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-[2fr_2fr_auto_auto] sm:items-end"
						>
							<input type="hidden" name="city_id" value={selectedCity.id} />
							<label className="flex flex-col gap-1 text-sm">
								<span className="font-medium">Nome</span>
								<Input name="name" placeholder="Centro" required />
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span className="font-medium">Slug (opcional)</span>
								<Input name="slug" placeholder="centro" />
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span className="font-medium">Ordem</span>
								<Input
									name="sort_order"
									type="number"
									defaultValue={0}
									className="w-20"
								/>
							</label>
							<input type="hidden" name="is_active" value="on" />
							<Button
								type="submit"
								name="intent"
								value="neighborhood-create"
								disabled={submitting}
							>
								Adicionar
							</Button>
						</Form>

						{/* Lista de bairros */}
						<div className="flex flex-col gap-3">
							{neighborhoods.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Nenhum bairro cadastrado para esta cidade.
								</p>
							) : (
								neighborhoods.map((n) => (
									<Form
										key={n.id}
										method="post"
										className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-[2fr_2fr_auto_auto] sm:items-end"
									>
										<input type="hidden" name="id" value={n.id} />
										<input
											type="hidden"
											name="city_id"
											value={selectedCity.id}
										/>
										<label className="flex flex-col gap-1 text-sm">
											<span className="font-medium">Nome</span>
											<Input name="name" defaultValue={n.name} required />
										</label>
										<label className="flex flex-col gap-1 text-sm">
											<span className="font-medium">Slug</span>
											<Input name="slug" defaultValue={n.slug} required />
										</label>
										<label className="flex flex-col gap-1 text-sm">
											<span className="font-medium">Ordem</span>
											<Input
												name="sort_order"
												type="number"
												defaultValue={n.sort_order}
												className="w-20"
											/>
										</label>
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1.5 text-sm text-muted-foreground">
												<input
													type="checkbox"
													name="is_active"
													defaultChecked={n.is_active}
													className="size-4"
												/>
												Ativo
											</label>
											<Button
												type="submit"
												name="intent"
												value="neighborhood-update"
												disabled={submitting}
											>
												Salvar
											</Button>
											<Button
												type="submit"
												name="intent"
												value="neighborhood-delete"
												variant="ghost"
												size="icon"
												disabled={submitting}
												aria-label="Excluir bairro"
											>
												<Trash2 className="size-4 text-destructive" />
											</Button>
										</div>
									</Form>
								))
							)}
						</div>
					</>
				) : (
					<p className="text-sm text-muted-foreground">
						Selecione uma cidade acima (em "Gerenciar bairros") para ver e editar
						os bairros dela.
					</p>
				)}
			</section>
		</main>
	);
}
