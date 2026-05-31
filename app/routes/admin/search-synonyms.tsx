import {
	Form,
	data,
	redirect,
	useActionData,
	useLoaderData,
	useNavigation,
} from "react-router";
import { Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { requireAdmin } from "~/lib/auth.server";
import * as synonymsRepo from "~/repositories/synonyms";
import { isError } from "~/types";
import type { Route } from "./+types/search-synonyms";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — Sinônimos de busca" },
];

// "atacarejo, atacado\nmercearia" -> ["atacarejo", "atacado", "mercearia"]
function parseExpansions(raw: string): string[] {
	return Array.from(
		new Set(
			raw
				.split(/[,\n]/)
				.map((s) => s.trim())
				.filter((s) => s.length > 0),
		),
	);
}

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	const result = await synonymsRepo.listAll({ supabase: ctx.supabase });
	if (isError(result)) throw new Response(result.error, { status: 500 });
	return { synonyms: result.success };
}

export async function action({ request }: Route.ActionArgs) {
	const ctx = await requireAdmin(request);
	const formData = await request.formData();
	const intent = String(formData.get("intent") ?? "");

	if (intent === "delete") {
		const id = String(formData.get("id") ?? "");
		const result = await synonymsRepo.remove({ supabase: ctx.supabase, id });
		if (isError(result)) return data({ error: result.error }, { status: 400 });
		throw redirect("/admin/search-synonyms", { headers: ctx.headers });
	}

	const term = String(formData.get("term") ?? "").trim();
	const expansions = parseExpansions(String(formData.get("expansions") ?? ""));
	const isActive = formData.get("is_active") === "on";

	if (!term) {
		return data({ error: "Informe o termo." }, { status: 400 });
	}

	if (intent === "create") {
		const result = await synonymsRepo.create({
			supabase: ctx.supabase,
			values: { term, expansions, is_active: isActive },
		});
		if (isError(result)) return data({ error: result.error }, { status: 400 });
	} else if (intent === "update") {
		const id = String(formData.get("id") ?? "");
		const result = await synonymsRepo.update({
			supabase: ctx.supabase,
			id,
			patch: { term, expansions, is_active: isActive },
		});
		if (isError(result)) return data({ error: result.error }, { status: 400 });
	} else {
		return data({ error: "Ação inválida" }, { status: 400 });
	}

	throw redirect("/admin/search-synonyms", { headers: ctx.headers });
}

export default function AdminSearchSynonyms() {
	const { synonyms } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	return (
		<main className="mx-auto max-w-4xl px-4 py-8">
			<div className="pb-4">
				<h1 className="text-xl font-semibold tracking-tight">Sinônimos de busca</h1>
				<p className="text-sm text-muted-foreground">
					Mapeie um termo para palavras relacionadas. Ao buscar o termo, os negócios
					que casam com qualquer sinônimo também aparecem. Ex.:{" "}
					<span className="font-medium">mercado</span> → supermercado, atacarejo,
					atacado. Os termos são normalizados (sem acento, minúsculas)
					automaticamente.
				</p>
			</div>

			{actionData?.error ? (
				<p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{actionData.error}
				</p>
			) : null}

			{/* Novo sinônimo */}
			<Form
				method="post"
				className="mb-6 grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
			>
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Termo</span>
					<Input name="term" placeholder="mercado" required />
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Sinônimos (vírgula ou linha)</span>
					<textarea
						name="expansions"
						placeholder="supermercado, atacarejo, atacado"
						className="min-h-9 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
					/>
				</label>
				<input type="hidden" name="is_active" value="on" />
				<Button type="submit" name="intent" value="create" disabled={submitting}>
					Adicionar
				</Button>
			</Form>

			{/* Lista de sinônimos */}
			<div className="flex flex-col gap-3">
				{synonyms.length === 0 ? (
					<p className="text-sm text-muted-foreground">Nenhum sinônimo cadastrado.</p>
				) : (
					synonyms.map((s) => (
						<Form
							key={s.id}
							method="post"
							className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
						>
							<input type="hidden" name="id" value={s.id} />
							<label className="flex flex-col gap-1 text-sm">
								<span className="font-medium">Termo</span>
								<Input name="term" defaultValue={s.term} required />
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span className="font-medium">Sinônimos</span>
								<textarea
									name="expansions"
									defaultValue={s.expansions.join(", ")}
									className="min-h-9 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
								/>
							</label>
							<div className="flex items-center gap-2">
								<label className="flex items-center gap-1.5 text-sm text-muted-foreground">
									<input
										type="checkbox"
										name="is_active"
										defaultChecked={s.is_active}
										className="size-4"
									/>
									Ativo
								</label>
								<Button type="submit" name="intent" value="update" disabled={submitting}>
									Salvar
								</Button>
								<Button
									type="submit"
									name="intent"
									value="delete"
									variant="ghost"
									size="icon"
									disabled={submitting}
									aria-label="Excluir"
								>
									<Trash2 className="size-4 text-destructive" />
								</Button>
							</div>
						</Form>
					))
				)}
			</div>
		</main>
	);
}
