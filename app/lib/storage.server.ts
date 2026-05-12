import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/database.types";
import { error, success } from "~/types";

export type Supabase = SupabaseClient<Database>;
export type BusinessImageBucket = "business-logos" | "business-covers";
export const PRODUCT_IMAGE_BUCKET = "business-product-images" as const;
export const PROMOTION_IMAGE_BUCKET = "business-promotion-images" as const;

function extFromMime(mime: string): string {
	switch (mime) {
		case "image/png":
			return "png";
		case "image/jpeg":
			return "jpg";
		case "image/webp":
			return "webp";
		case "image/gif":
			return "gif";
		default:
			return "bin";
	}
}

export async function uploadBusinessImage({
	supabase,
	bucket,
	userId,
	businessId,
	file,
}: {
	supabase: Supabase;
	bucket: BusinessImageBucket;
	userId: string;
	businessId: string;
	file: File;
}) {
	const ext = extFromMime(file.type);
	const path = `${userId}/${businessId}.${ext}`;
	const { error: uploadError } = await supabase.storage
		.from(bucket)
		.upload(path, file, { upsert: true, contentType: file.type });
	if (uploadError) return error(uploadError.message);
	const { data } = supabase.storage.from(bucket).getPublicUrl(path);
	return success({ path, publicUrl: data.publicUrl });
}

export async function uploadProductImage({
	supabase,
	userId,
	businessId,
	productId,
	imageId,
	file,
}: {
	supabase: Supabase;
	userId: string;
	businessId: string;
	productId: string;
	imageId: string;
	file: File;
}) {
	const ext = extFromMime(file.type);
	const path = `${userId}/${businessId}/${productId}/${imageId}.${ext}`;
	const { error: uploadError } = await supabase.storage
		.from(PRODUCT_IMAGE_BUCKET)
		.upload(path, file, { upsert: true, contentType: file.type });
	if (uploadError) return error(uploadError.message);
	const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
	return success({ path, publicUrl: data.publicUrl });
}

export async function uploadPromotionImage({
	supabase,
	userId,
	businessId,
	promotionId,
	imageId,
	file,
}: {
	supabase: Supabase;
	userId: string;
	businessId: string;
	promotionId: string;
	imageId: string;
	file: File;
}) {
	const ext = extFromMime(file.type);
	const path = `${userId}/${businessId}/${promotionId}/${imageId}.${ext}`;
	const { error: uploadError } = await supabase.storage
		.from(PROMOTION_IMAGE_BUCKET)
		.upload(path, file, { upsert: true, contentType: file.type });
	if (uploadError) return error(uploadError.message);
	const { data } = supabase.storage.from(PROMOTION_IMAGE_BUCKET).getPublicUrl(path);
	return success({ path, publicUrl: data.publicUrl });
}

export async function deleteFromBucket({
	supabase,
	bucket,
	path,
}: {
	supabase: Supabase;
	bucket: string;
	path: string;
}) {
	const { error: deleteError } = await supabase.storage
		.from(bucket)
		.remove([path]);
	if (deleteError) return error(deleteError.message);
	return success(true);
}

export function getPublicUrl(
	supabase: Supabase,
	bucket: string,
	path: string | null,
): string | null {
	if (!path) return null;
	const { data } = supabase.storage.from(bucket).getPublicUrl(path);
	return data.publicUrl;
}
