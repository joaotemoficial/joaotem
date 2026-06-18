import type { SubmissionResult } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
	uploadBusinessImage,
	type BusinessImageBucket,
	type Supabase,
} from "~/lib/storage.server";
import { businessFormSchema } from "~/lib/validation/business";
import { planSelectionSchema } from "~/lib/validation/plan";
import * as businesses from "~/repositories/businesses";
import * as planUpgradeRepo from "~/repositories/plan-upgrade-requests";
import { isError } from "~/types";

export type BusinessActionResult =
	| { ok: true; id: string; handle: string }
	| { ok: false; submission: SubmissionResult<string[]> };

export async function handleBusinessSubmission({
	formData,
	supabase,
	userId,
	businessId,
}: {
	formData: FormData;
	supabase: Supabase;
	userId: string;
	businessId?: string;
}): Promise<BusinessActionResult> {
	const submission = parseWithZod(formData, { schema: businessFormSchema });
	if (submission.status !== "success") {
		return { ok: false, submission: submission.reply() };
	}

	// On create, the owner must also pick a plan tier — the business won't
	// appear on the site until the admin approves the resulting upgrade
	// request. On edit (businessId provided), plan fields are not part of
	// the form.
	const isCreate = !businessId;
	const planSubmission = isCreate
		? parseWithZod(formData, { schema: planSelectionSchema })
		: null;
	if (planSubmission && planSubmission.status !== "success") {
		const fieldErrors: Record<string, string[]> = {};
		for (const [key, errs] of Object.entries(planSubmission.error ?? {})) {
			if (Array.isArray(errs) && errs.length > 0) fieldErrors[key] = errs;
		}
		return { ok: false, submission: submission.reply({ fieldErrors }) };
	}

	const v = submission.value;

	const handleAvailability = await businesses.checkHandleAvailable({
		supabase,
		handle: v.handle,
		excludeBusinessId: businessId,
	});
	if (isError(handleAvailability)) {
		return {
			ok: false,
			submission: submission.reply({ formErrors: [handleAvailability.error] }),
		};
	}
	if (!handleAvailability.success) {
		return {
			ok: false,
			submission: submission.reply({
				fieldErrors: { handle: ["Este nome de usuário já está em uso"] },
			}),
		};
	}

	let resultId = businessId;
	let resultHandle = v.handle;

	if (businessId) {
		const updateResult = await businesses.update({
			supabase,
			id: businessId,
			userId,
			values: {
				handle: v.handle,
				name: v.name,
				category_id: v.category_id,
				city_id: v.city_id,
				neighborhood_id: v.neighborhood_id,
				short_description: v.short_description?.trim() || null,
				whatsapp: v.whatsapp,
				instagram: v.instagram?.trim() || null,
				google_maps_url: v.google_maps_url?.trim() || null,
				offers_delivery: v.offers_delivery,
			},
		});
		if (isError(updateResult)) {
			return {
				ok: false,
				submission: submission.reply({ formErrors: [updateResult.error] }),
			};
		}
		resultId = updateResult.success.id;
		resultHandle = updateResult.success.handle;
	} else {
		const createResult = await businesses.create({
			supabase,
			values: {
				user_id: userId,
				handle: v.handle,
				name: v.name,
				category_id: v.category_id,
				city_id: v.city_id,
				neighborhood_id: v.neighborhood_id,
				short_description: v.short_description?.trim() || null,
				whatsapp: v.whatsapp,
				instagram: v.instagram?.trim() || null,
				google_maps_url: v.google_maps_url?.trim() || null,
				offers_delivery: v.offers_delivery,
			},
		});
		if (isError(createResult)) {
			return {
				ok: false,
				submission: submission.reply({ formErrors: [createResult.error] }),
			};
		}
		resultId = createResult.success.id;
		resultHandle = createResult.success.handle;
	}

	if (!resultId) {
		return {
			ok: false,
			submission: submission.reply({
				formErrors: ["Falha ao salvar o negócio"],
			}),
		};
	}

	const uploadFile = async (
		file: File | undefined,
		bucket: BusinessImageBucket,
	) => {
		if (!file || file.size === 0) return null;
		const upload = await uploadBusinessImage({
			supabase,
			bucket,
			userId,
			businessId: resultId as string,
			file,
		});
		if (isError(upload)) return null;
		return upload.success.path;
	};

	const logoPath = await uploadFile(v.logo, "business-logos");
	const coverPath = await uploadFile(v.cover, "business-covers");

	if (logoPath || coverPath) {
		const patchValues: { logo_path?: string; cover_path?: string } = {};
		if (logoPath) patchValues.logo_path = logoPath;
		if (coverPath) patchValues.cover_path = coverPath;
		await businesses.update({
			supabase,
			id: resultId,
			userId,
			values: patchValues,
		});
	}

	// On create, queue the upgrade request the owner picked in the form.
	// Best-effort: if the request insert fails, the business is still created
	// and admin will see it under "Sem plano ativo" on /admin.
	if (isCreate && planSubmission && planSubmission.status === "success") {
		await planUpgradeRepo.create({
			supabase,
			values: {
				business_id: resultId,
				requested_by: userId,
				requested_plan: planSubmission.value.requested_plan,
				message: planSubmission.value.plan_message,
			},
		});
	}

	return { ok: true, id: resultId, handle: resultHandle };
}
