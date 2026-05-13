import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export type ProductInsert = Database["public"]["Tables"]["business_products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["business_products"]["Update"];

const PRODUCT_FIELDS = `
  id, business_id, name, description, price_cents, stock_quantity,
  sort_order, is_active, created_at, updated_at,
  images:business_product_images(id, storage_path, alt_text, sort_order)
`;

export async function listByBusiness({
	supabase,
	businessId,
}: {
	supabase: Supabase;
	businessId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("business_products")
		.select(PRODUCT_FIELDS)
		.eq("business_id", businessId)
		.is("deleted_at", null)
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: false });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

export async function listPublicByBusiness({
	supabase,
	businessId,
}: {
	supabase: Supabase;
	businessId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("business_products")
		.select(PRODUCT_FIELDS)
		.eq("business_id", businessId)
		.eq("is_active", true)
		.is("deleted_at", null)
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: false });
	if (queryError) return error(queryError.message);
	return success(data ?? []);
}

// Number of non-deleted products on a business. Used by the owner dashboard
// to enforce the per-plan quota for "Vitrine de produtos" (feature_flags).
export async function countByBusiness({
	supabase,
	businessId,
}: {
	supabase: Supabase;
	businessId: string;
}) {
	const { count, error: queryError } = await supabase
		.from("business_products")
		.select("id", { head: true, count: "exact" })
		.eq("business_id", businessId)
		.is("deleted_at", null);
	if (queryError) return error(queryError.message);
	return success(count ?? 0);
}

export async function getByIdForOwner({
	supabase,
	id,
	businessId,
}: {
	supabase: Supabase;
	id: string;
	businessId: string;
}) {
	const { data, error: queryError } = await supabase
		.from("business_products")
		.select(PRODUCT_FIELDS)
		.eq("id", id)
		.eq("business_id", businessId)
		.is("deleted_at", null)
		.maybeSingle();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function create({
	supabase,
	values,
}: {
	supabase: Supabase;
	values: ProductInsert;
}) {
	const { data, error: queryError } = await supabase
		.from("business_products")
		.insert(values)
		.select("id")
		.single();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function update({
	supabase,
	id,
	values,
}: {
	supabase: Supabase;
	id: string;
	values: ProductUpdate;
}) {
	const { error: queryError } = await supabase
		.from("business_products")
		.update(values)
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function softDelete({
	supabase,
	id,
}: {
	supabase: Supabase;
	id: string;
}) {
	const { error: queryError } = await supabase
		.from("business_products")
		.update({ deleted_at: new Date().toISOString(), is_active: false })
		.eq("id", id);
	if (queryError) return error(queryError.message);
	return success(true);
}

export async function addImage({
	supabase,
	productId,
	storagePath,
	altText,
	sortOrder,
}: {
	supabase: Supabase;
	productId: string;
	storagePath: string;
	altText?: string | null;
	sortOrder?: number;
}) {
	const { data, error: queryError } = await supabase
		.from("business_product_images")
		.insert({
			product_id: productId,
			storage_path: storagePath,
			alt_text: altText ?? null,
			sort_order: sortOrder ?? 0,
		})
		.select("id")
		.single();
	if (queryError) return error(queryError.message);
	return success(data);
}

export async function removeImage({
	supabase,
	imageId,
}: {
	supabase: Supabase;
	imageId: string;
}) {
	const { error: queryError } = await supabase
		.from("business_product_images")
		.delete()
		.eq("id", imageId);
	if (queryError) return error(queryError.message);
	return success(true);
}
