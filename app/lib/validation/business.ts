import { z } from "zod";
import {
	ACCEPTED_IMAGE_TYPES,
	HANDLE_REGEX,
	MAX_IMAGE_BYTES,
	MAX_SHORT_DESCRIPTION,
	RESERVED_HANDLES,
	WHATSAPP_REGEX,
} from "~/lib/constants";

const reservedSet = new Set<string>(RESERVED_HANDLES);

const optionalImage = z
	.instanceof(File)
	.optional()
	.refine(
		(f) => !f || f.size === 0 || f.size <= MAX_IMAGE_BYTES,
		`Imagem deve ter no máximo ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`,
	)
	.refine(
		(f) =>
			!f ||
			f.size === 0 ||
			(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(f.type),
		"Formato de imagem não suportado",
	);

const handleSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3, "Mínimo 3 caracteres")
	.max(30, "Máximo 30 caracteres")
	.regex(HANDLE_REGEX, "Apenas letras minúsculas, números e hífen")
	.refine((v) => !v.includes("--"), "Não use hífens duplicados")
	.refine((v) => !reservedSet.has(v), "Este nome de usuário é reservado");

export const businessFormSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Informe o nome do negócio")
		.max(120, "Máximo 120 caracteres"),
	handle: handleSchema,
	category_id: z.string().uuid("Selecione uma categoria"),
	city_id: z.string().uuid("Selecione uma cidade"),
	neighborhood_id: z.string().uuid("Selecione um bairro"),
	short_description: z
		.string()
		.trim()
		.max(MAX_SHORT_DESCRIPTION, `Máximo ${MAX_SHORT_DESCRIPTION} caracteres`)
		.optional()
		.or(z.literal("")),
	whatsapp: z
		.string()
		.trim()
		.regex(WHATSAPP_REGEX, "Apenas números, com DDD (10–13 dígitos)"),
	instagram: z
		.string()
		.trim()
		.max(60, "Máximo 60 caracteres")
		.optional()
		.or(z.literal("")),
	offers_delivery: z
		.union([z.literal("on"), z.literal("true"), z.literal("")])
		.optional()
		.transform((v) => v === "on" || v === "true"),
	logo: optionalImage,
	cover: optionalImage,
});

export type BusinessFormValues = z.infer<typeof businessFormSchema>;

export const productFormSchema = z.object({
	name: z.string().trim().min(2, "Informe o nome do produto").max(120),
	description: z.string().trim().max(2000).optional().or(z.literal("")),
	price: z
		.string()
		.trim()
		.regex(/^\d+([.,]\d{1,2})?$/, "Preço inválido (use 0,00 ou 0.00)"),
	stock_quantity: z
		.string()
		.trim()
		.optional()
		.refine(
			(v) => !v || /^\d+$/.test(v),
			"Estoque deve ser um número inteiro",
		),
	is_active: z
		.union([z.literal("on"), z.literal("true"), z.literal("")])
		.optional()
		.transform((v) => v === "on" || v === "true"),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;

export const productImageSchema = z.object({
	image: z
		.instanceof(File)
		.refine(
			(f) => f.size > 0 && f.size <= MAX_IMAGE_BYTES,
			`Imagem deve ter entre 1 byte e ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`,
		)
		.refine(
			(f) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(f.type),
			"Formato de imagem não suportado",
		),
	alt_text: z.string().trim().max(160).optional().or(z.literal("")),
});

export const authSchema = z.object({
	email: z.string().trim().toLowerCase().email("E-mail inválido"),
	password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
export type AuthValues = z.infer<typeof authSchema>;

export const adminRejectSchema = z.object({
	rejection_reason: z
		.string()
		.trim()
		.min(3, "Informe o motivo da rejeição")
		.max(500),
});

export const adminSuspendSchema = z.object({
	rejection_reason: z
		.string()
		.trim()
		.min(3, "Informe o motivo da suspensão")
		.max(500),
});

export function priceToCents(input: string): number {
	const normalized = input.replace(",", ".");
	const num = Number.parseFloat(normalized);
	if (Number.isNaN(num) || num < 0) return 0;
	return Math.round(num * 100);
}

export function centsToPrice(cents: number): string {
	return (cents / 100).toFixed(2).replace(".", ",");
}

export function formatBRL(cents: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(cents / 100);
}

// 7-bit bitmask helpers. bit 0 = Sunday … bit 6 = Saturday.
export function daysToMask(days: number[]): number {
	return days.reduce(
		(m, d) => (d >= 0 && d <= 6 ? m | (1 << d) : m),
		0,
	);
}

export function maskToDays(mask: number): number[] {
	const out: number[] = [];
	for (let i = 0; i < 7; i++) {
		if ((mask & (1 << i)) > 0) out.push(i);
	}
	return out;
}

export const promotionFormSchema = z.object({
	title: z
		.string()
		.trim()
		.min(2, "Informe o título da promoção")
		.max(120, "Máximo 120 caracteres"),
	description: z.string().trim().max(2000).optional().or(z.literal("")),
	schedule_note: z.string().trim().max(280).optional().or(z.literal("")),
	// FormData repeats `days` keys — preprocess wraps single value into an array.
	days: z.preprocess(
		(v) => (Array.isArray(v) ? v : v != null && v !== "" ? [v] : []),
		z
			.array(z.coerce.number().int().min(0).max(6))
			.min(1, "Selecione pelo menos um dia"),
	),
	starts_at: z
		.string()
		.trim()
		.optional()
		.or(z.literal(""))
		.transform((v) => (v ? v : null)),
	ends_at: z
		.string()
		.trim()
		.optional()
		.or(z.literal(""))
		.transform((v) => (v ? v : null)),
	sort_order: z
		.union([z.coerce.number().int().min(0), z.literal("")])
		.optional()
		.transform((v) => (typeof v === "number" ? v : 0)),
	is_active: z
		.union([z.literal("on"), z.literal("true"), z.literal("")])
		.optional()
		.transform((v) => v === "on" || v === "true"),
});
export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

export const promotionImageSchema = z.object({
	image: z
		.instanceof(File)
		.refine(
			(f) => f.size > 0 && f.size <= MAX_IMAGE_BYTES,
			`Imagem deve ter entre 1 byte e ${MAX_IMAGE_BYTES / (1024 * 1024)}MB`,
		)
		.refine(
			(f) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(f.type),
			"Formato de imagem não suportado",
		),
	alt_text: z.string().trim().max(160).optional().or(z.literal("")),
});
