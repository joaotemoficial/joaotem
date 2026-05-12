export const RESERVED_HANDLES = [
	"admin",
	"dashboard",
	"api",
	"auth",
	"login",
	"signup",
	"logout",
	"negocio",
	"b",
	"categoria",
	"bairro",
	"cidade",
	"sobre",
	"contato",
	"termos",
	"privacidade",
	"app",
	"www",
	"static",
	"public",
	"assets",
	"supabase",
	"root",
	"settings",
	"help",
	"support",
	"feed",
	"search",
] as const;

export const HANDLE_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
export const WHATSAPP_REGEX = /^[0-9]{10,13}$/;

export const MAX_SHORT_DESCRIPTION = 180;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
] as const;

export const BUSINESS_STATUS_LABELS = {
	pending: "Pendente",
	approved: "Aprovado",
	rejected: "Rejeitado",
	suspended: "Suspenso",
} as const;

// Sunday-first to match JS Date.getDay() and Postgres extract(dow from ...).
// Index 0 = Sunday … index 6 = Saturday — same indexing as the recurrence_days bitmask.
export const DAY_LABELS = [
	"Domingo",
	"Segunda-feira",
	"Terça-feira",
	"Quarta-feira",
	"Quinta-feira",
	"Sexta-feira",
	"Sábado",
] as const;
export const DAY_SHORT_LABELS = [
	"Dom",
	"Seg",
	"Ter",
	"Qua",
	"Qui",
	"Sex",
	"Sáb",
] as const;
export const ALL_DAYS_MASK = 127;
