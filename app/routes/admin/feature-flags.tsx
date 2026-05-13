import { Form, redirect, useLoaderData, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { requireAdmin } from "~/lib/auth.server";
import * as featureFlagsRepo from "~/repositories/feature-flags";
import { isError } from "~/types";
import type { Route } from "./+types/feature-flags";

export const meta: Route.MetaFunction = () => [
	{ title: "Admin — Recursos" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireAdmin(request);
	const result = await featureFlagsRepo.listAll({ supabase: ctx.supabase });
	if (isError(result)) throw new Response(result.error, { status: 500 });
	return { flags: result.success };
}

export async function action({ request }: Route.ActionArgs) {
	const ctx = await requireAdmin(request);
	const formData = await request.formData();

	const intent = formData.get("intent");
	if (intent !== "save") {
		return Response.json({ error: "Ação inválida" }, { status: 400 });
	}

	const keys = formData.getAll("key").map(String);
	const errors: string[] = [];
	for (const key of keys) {
		const enabled = formData.get(`enabled_${key}`) === "on";
		const basicoEnabled = formData.get(`basico_enabled_${key}`) === "on";
		const ouroEnabled = formData.get(`ouro_enabled_${key}`) === "on";
		const basicoLimitRaw = String(formData.get(`basico_limit_${key}`) ?? "").trim();
		const ouroLimitRaw = String(formData.get(`ouro_limit_${key}`) ?? "").trim();
		const basicoLimit =
			basicoLimitRaw === "" ? null : Number.parseInt(basicoLimitRaw, 10);
		const ouroLimit =
			ouroLimitRaw === "" ? null : Number.parseInt(ouroLimitRaw, 10);
		if (basicoLimit !== null && Number.isNaN(basicoLimit)) {
			errors.push(`Limite inválido para Básico em "${key}"`);
			continue;
		}
		if (ouroLimit !== null && Number.isNaN(ouroLimit)) {
			errors.push(`Limite inválido para Ouro em "${key}"`);
			continue;
		}
		const result = await featureFlagsRepo.updateFlag({
			supabase: ctx.supabase,
			key,
			patch: {
				enabled,
				basico_enabled: basicoEnabled,
				ouro_enabled: ouroEnabled,
				basico_limit: basicoLimit,
				ouro_limit: ouroLimit,
			},
		});
		if (isError(result)) errors.push(result.error);
	}

	if (errors.length > 0) {
		return Response.json({ errors }, { status: 400 });
	}
	throw redirect("/admin/feature-flags", { headers: ctx.headers });
}

export default function AdminFeatureFlags() {
	const { flags } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	return (
		<main className="mx-auto max-w-5xl px-4 py-8">
			<div className="pb-4">
				<h1 className="text-xl font-semibold tracking-tight">Recursos</h1>
				<p className="text-sm text-muted-foreground">
					Configure quais funcionalidades cada plano oferece. Limites
					numéricos vazios significam "ilimitado".
				</p>
			</div>

			<Form method="post" className="flex flex-col gap-4">
				<input type="hidden" name="intent" value="save" />
				<div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
							<tr>
								<th className="px-3 py-2.5">Recurso</th>
								<th className="px-3 py-2.5 text-center">Ativo</th>
								<th className="px-3 py-2.5 text-center">Básico</th>
								<th className="px-3 py-2.5">Limite Básico</th>
								<th className="px-3 py-2.5 text-center">Ouro</th>
								<th className="px-3 py-2.5">Limite Ouro</th>
							</tr>
						</thead>
						<tbody>
							{flags.map((f) => (
								<tr key={f.key} className="border-t border-border/60">
									<td className="px-3 py-2.5">
										<input type="hidden" name="key" value={f.key} />
										<p className="font-medium">{f.label}</p>
										<p className="text-xs text-muted-foreground">
											{f.key} · {f.flag_type === "numeric" ? "numérico" : "booleano"}
										</p>
									</td>
									<td className="px-3 py-2.5 text-center">
										<input
											type="checkbox"
											name={`enabled_${f.key}`}
											defaultChecked={f.enabled}
											className="size-4"
										/>
									</td>
									<td className="px-3 py-2.5 text-center">
										<input
											type="checkbox"
											name={`basico_enabled_${f.key}`}
											defaultChecked={f.basico_enabled}
											className="size-4"
										/>
									</td>
									<td className="px-3 py-2.5">
										<Input
											type="number"
											name={`basico_limit_${f.key}`}
											defaultValue={f.basico_limit ?? ""}
											placeholder={f.flag_type === "numeric" ? "0" : "—"}
											disabled={f.flag_type !== "numeric"}
											min={0}
											className="h-8 w-24"
										/>
									</td>
									<td className="px-3 py-2.5 text-center">
										<input
											type="checkbox"
											name={`ouro_enabled_${f.key}`}
											defaultChecked={f.ouro_enabled}
											className="size-4"
										/>
									</td>
									<td className="px-3 py-2.5">
										<Input
											type="number"
											name={`ouro_limit_${f.key}`}
											defaultValue={f.ouro_limit ?? ""}
											placeholder={f.flag_type === "numeric" ? "—" : "—"}
											disabled={f.flag_type !== "numeric"}
											min={0}
											className="h-8 w-24"
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="flex justify-end">
					<Button type="submit" disabled={submitting}>
						Salvar alterações
					</Button>
				</div>
			</Form>
		</main>
	);
}
