import { z } from "zod";

export const PLAN_TIERS = ["basico", "ouro"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

// Used by the standalone admin plan-edit form on the business detail page.
// `plan_tier` may be null (disable subscription); `plan_expires_at` is
// required for any non-null tier.
export const planUpdateSchema = z
	.object({
		plan_tier: z
			.union([z.enum(PLAN_TIERS), z.literal(""), z.literal("null")])
			.transform((v) => (v === "" || v === "null" ? null : v)),
		plan_started_at: z
			.string()
			.trim()
			.optional()
			.or(z.literal(""))
			.transform((v) => (v ? v : null)),
		plan_expires_at: z
			.string()
			.trim()
			.optional()
			.or(z.literal(""))
			.transform((v) => (v ? v : null)),
		plan_notes: z
			.string()
			.trim()
			.max(500, "Máximo 500 caracteres")
			.optional()
			.or(z.literal(""))
			.transform((v) => (v ? v : null)),
	})
	.refine(
		(v) => v.plan_tier === null || v.plan_expires_at !== null,
		{
			message: "Informe a data de expiração",
			path: ["plan_expires_at"],
		},
	);

export type PlanUpdateValues = z.infer<typeof planUpdateSchema>;

// Used by the admin "create business" form — plan + expiry are required at
// creation time (the user's explicit ask). Disables (null) aren't a choice.
export const planAtCreateSchema = z.object({
	plan_tier: z.enum(PLAN_TIERS, {
		errorMap: () => ({ message: "Selecione um plano" }),
	}),
	plan_expires_at: z
		.string()
		.trim()
		.min(1, "Informe a data de expiração"),
	plan_notes: z
		.string()
		.trim()
		.max(500, "Máximo 500 caracteres")
		.optional()
		.or(z.literal(""))
		.transform((v) => (v ? v : null)),
});

// Used by the owner's dashboard "request upgrade" form.
export const planUpgradeRequestSchema = z.object({
	business_id: z.string().uuid("Selecione um negócio"),
	requested_plan: z.enum(PLAN_TIERS, {
		errorMap: () => ({ message: "Selecione o plano desejado" }),
	}),
	message: z
		.string()
		.trim()
		.max(500, "Máximo 500 caracteres")
		.optional()
		.or(z.literal(""))
		.transform((v) => (v ? v : null)),
});

// Used by the admin "approve upgrade request" inline form.
export const planUpgradeApprovalSchema = z.object({
	request_id: z.string().uuid(),
	plan_expires_at: z
		.string()
		.trim()
		.min(1, "Informe a data de expiração"),
	plan_started_at: z
		.string()
		.trim()
		.optional()
		.or(z.literal(""))
		.transform((v) => (v ? v : null)),
	notes: z
		.string()
		.trim()
		.max(500, "Máximo 500 caracteres")
		.optional()
		.or(z.literal(""))
		.transform((v) => (v ? v : null)),
});

export const planUpgradeRejectionSchema = z.object({
	request_id: z.string().uuid(),
	notes: z
		.string()
		.trim()
		.min(3, "Informe o motivo da rejeição")
		.max(500, "Máximo 500 caracteres"),
});
