// "São João do Sul!" -> "sao-joao-do-sul"
export function slugify(input: string): string {
	return input
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "") // strip diacritics
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> hyphen
		.replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}
