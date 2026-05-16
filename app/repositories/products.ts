import type { Database } from "~/database.types";
import type { Supabase } from "~/lib/storage.server";
import { error, success } from "~/types";

export type ProductInsert = Database["public"]["Tables"]["business_products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["business_products"]["Update"];

export type ProductOptionGroupInput = {
	name: string;
	sort_order: number;
	values: { value: string; price_cents: number | null; sort_order: number }[];
};

const PRODUCT_FIELDS = `
  id, business_id, name, description, price_cents, stock_quantity,
  sort_order, is_active, created_at, updated_at,
  images:business_product_images(id, storage_path, alt_text, sort_order),
  option_groups:business_product_option_groups(
    id, name, sort_order,
    values:business_product_option_values(id, value, price_cents, sort_order)
  )
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

// Replaces the full set of option groups (and their values) for a product. The
// form always re-submits every group, so diffing would just add complexity —
// delete + insert keeps the code simple and matches the form contract. Group
// IDs are generated client-side so values can reference them in one bulk insert
// without depending on insert-return ordering.
export async function replaceOptionGroups({
	supabase,
	productId,
	groups,
}: {
	supabase: Supabase;
	productId: string;
	groups: ProductOptionGroupInput[];
}) {
	// Values cascade-delete with their parent group.
	const { error: deleteError } = await supabase
		.from("business_product_option_groups")
		.delete()
		.eq("product_id", productId);
	if (deleteError) return error(deleteError.message);

	if (groups.length === 0) return success(true);

	const groupRows = groups.map((group) => ({
		id: crypto.randomUUID(),
		product_id: productId,
		name: group.name,
		sort_order: group.sort_order,
	}));
	const { error: groupError } = await supabase
		.from("business_product_option_groups")
		.insert(groupRows);
	if (groupError) return error(groupError.message);

	const valueRows = groups.flatMap((group, index) =>
		group.values.map((val) => ({
			group_id: groupRows[index].id,
			value: val.value,
			price_cents: val.price_cents,
			sort_order: val.sort_order,
		})),
	);
	if (valueRows.length === 0) return success(true);

	const { error: valueError } = await supabase
		.from("business_product_option_values")
		.insert(valueRows);
	if (valueError) return error(valueError.message);
	return success(true);
}
