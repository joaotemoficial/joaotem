import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";

// One feature row as prepared by the admin business-detail loader: the flag's
// definition merged with this business's override (if any) and the plan
// default / effective value computed for the business's effective tier.
export type FeatureRow = {
	key: string;
	label: string;
	flag_type: "numeric" | "boolean";
	globallyEnabled: boolean; // master kill switch on the flag itself
	planEnabled: boolean;
	planLimit: number | null;
	effEnabled: boolean;
	effLimit: number | null;
	override: {
		enabled: boolean | null;
		limit_override: number | null;
		notes: string | null;
	} | null;
};

// Renders the per-business feature-override table. Stateless — the surrounding
// <Form> (in admin/business-detail) owns the hidden intent and submission.
// Mirrors the admin feature-flags table; each row carries a hidden `key` so the
// action can iterate with formData.getAll("key").
export function FeatureOverridesFields({
	rows,
	errors,
}: {
	rows: FeatureRow[];
	errors?: string[];
}) {
	if (rows.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				Nenhum recurso configurado.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{errors && errors.length > 0 ? (
				<ul className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{errors.map((e) => (
						<li key={e}>{e}</li>
					))}
				</ul>
			) : null}

			<div className="overflow-x-auto rounded-2xl border border-border/70">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
						<tr>
							<th className="px-3 py-2.5">Recurso</th>
							<th className="px-3 py-2.5">Override</th>
							<th className="px-3 py-2.5">Limite</th>
							<th className="px-3 py-2.5">Notas</th>
							<th className="px-3 py-2.5">Padrão / efetivo</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr key={row.key} className="border-t border-border/60 align-top">
								<td className="px-3 py-2.5">
									<input type="hidden" name="key" value={row.key} />
									<p className="font-medium">{row.label}</p>
									<p className="text-xs text-muted-foreground">
										{row.key} ·{" "}
										{row.flag_type === "numeric" ? "numérico" : "booleano"}
									</p>
									{!row.globallyEnabled ? (
										<Badge variant="outline" className="mt-1">
											Desativado globalmente
										</Badge>
									) : null}
								</td>
								<td className="px-3 py-2.5">
									<select
										name={`enabled_${row.key}`}
										defaultValue={
											row.override?.enabled == null
												? ""
												: row.override.enabled
													? "on"
													: "off"
										}
										className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
									>
										<option value="">Herdar (plano)</option>
										<option value="on">Ativar</option>
										<option value="off">Desativar</option>
									</select>
								</td>
								<td className="px-3 py-2.5">
									<Input
										type="number"
										name={`limit_${row.key}`}
										defaultValue={row.override?.limit_override ?? ""}
										disabled={row.flag_type !== "numeric"}
										min={0}
										placeholder="herdar"
										className="h-8 w-24"
									/>
								</td>
								<td className="px-3 py-2.5">
									<Input
										name={`notes_${row.key}`}
										defaultValue={row.override?.notes ?? ""}
										maxLength={500}
										placeholder="—"
										className="h-8 min-w-40"
									/>
								</td>
								<td className="px-3 py-2.5 text-xs text-muted-foreground">
									{!row.globallyEnabled ? (
										<span>Forçado off (kill switch)</span>
									) : (
										<>
											<div>
												Plano: {row.planEnabled ? "Ativo" : "Inativo"}
												{row.flag_type === "numeric" && row.planLimit != null
													? ` · ${row.planLimit}`
													: ""}
											</div>
											<div>
												Efetivo: {row.effEnabled ? "Ativo" : "Inativo"}
												{row.flag_type === "numeric" && row.effLimit != null
													? ` · ${row.effLimit}`
													: ""}
											</div>
										</>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
