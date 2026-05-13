import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { PlanTier } from "~/lib/plan.server";

type FieldErrors = Partial<Record<
	"plan_tier" | "plan_started_at" | "plan_expires_at" | "plan_notes",
	string[] | undefined
>>;

// Renders the plan_tier / expiry / notes fields. Stateless — the surrounding
// <Form> owns submission. Used at admin business-create, admin
// business-detail (plan card), and admin upgrade-request approval rows.
export function PlanFormFields({
	defaults,
	allowNullTier = false,
	errors,
	idPrefix = "plan",
}: {
	defaults?: {
		plan_tier?: PlanTier | null;
		plan_started_at?: string | null;
		plan_expires_at?: string | null;
		plan_notes?: string | null;
	};
	// When true, the select includes a "Sem plano (desativar)" option that
	// submits as an empty string → schema transforms to null.
	allowNullTier?: boolean;
	errors?: FieldErrors;
	idPrefix?: string;
}) {
	const tierId = `${idPrefix}-tier`;
	const startId = `${idPrefix}-start`;
	const expiresId = `${idPrefix}-expires`;
	const notesId = `${idPrefix}-notes`;

	const initialTier = defaults?.plan_tier ?? "";
	const initialStart = toDateInput(defaults?.plan_started_at ?? null);
	const initialExpires = toDateInput(defaults?.plan_expires_at ?? null);

	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<label className="flex flex-col gap-1.5 text-sm sm:col-span-1">
				<Label htmlFor={tierId}>Plano *</Label>
				<select
					id={tierId}
					name="plan_tier"
					defaultValue={initialTier}
					className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					{allowNullTier ? (
						<option value="">Sem plano (desativar)</option>
					) : (
						<option value="" disabled>
							Selecione um plano
						</option>
					)}
					<option value="basico">Básico</option>
					<option value="ouro">Ouro</option>
				</select>
				{errors?.plan_tier?.[0] ? (
					<span className="text-xs text-destructive">{errors.plan_tier[0]}</span>
				) : null}
			</label>

			<label className="flex flex-col gap-1.5 text-sm sm:col-span-1">
				<Label htmlFor={expiresId}>Expira em *</Label>
				<Input
					id={expiresId}
					name="plan_expires_at"
					type="date"
					defaultValue={initialExpires}
				/>
				{errors?.plan_expires_at?.[0] ? (
					<span className="text-xs text-destructive">
						{errors.plan_expires_at[0]}
					</span>
				) : null}
			</label>

			<label className="flex flex-col gap-1.5 text-sm sm:col-span-1">
				<Label htmlFor={startId}>Início (opcional)</Label>
				<Input
					id={startId}
					name="plan_started_at"
					type="date"
					defaultValue={initialStart}
				/>
				{errors?.plan_started_at?.[0] ? (
					<span className="text-xs text-destructive">
						{errors.plan_started_at[0]}
					</span>
				) : null}
			</label>

			<label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
				<Label htmlFor={notesId}>Notas (opcional)</Label>
				<Textarea
					id={notesId}
					name="plan_notes"
					rows={2}
					defaultValue={defaults?.plan_notes ?? ""}
					maxLength={500}
				/>
				{errors?.plan_notes?.[0] ? (
					<span className="text-xs text-destructive">{errors.plan_notes[0]}</span>
				) : null}
			</label>
		</div>
	);
}

// HTML <input type="date"> wants YYYY-MM-DD. Postgres timestamptz comes back
// as ISO. Strip the time component.
function toDateInput(value: string | null): string {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const yyyy = date.getUTCFullYear();
	const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(date.getUTCDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}
