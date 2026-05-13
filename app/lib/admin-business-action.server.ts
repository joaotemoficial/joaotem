import type { SubmissionResult } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
	uploadBusinessImage,
	type BusinessImageBucket,
	type Supabase,
} from "~/lib/storage.server";
import { SYSTEM_USER_ID } from "~/lib/system-user";
import { businessFormSchema } from "~/lib/validation/business";
import { planAtCreateSchema } from "~/lib/validation/plan";
import * as businesses from "~/repositories/businesses";
import { isError } from "~/types";

export type AdminBusinessActionResult =
	| { ok: true; id: string; handle: string }
	| { ok: false; submission: SubmissionResult<string[]> };

export async function handleAdminBusinessCreate({
	formData,
	supabase,
	reviewerId,
}: {
	formData: FormData;
	supabase: Supabase;
	reviewerId: string;
}): Promise<AdminBusinessActionResult> {
	const submission = parseWithZod(formData, { schema: businessFormSchema });
	if (submission.status !== "success") {
		return { ok: false, submission: submission.reply() };
	}

	const planSubmission = parseWithZod(formData, { schema: planAtCreateSchema });
	if (planSubmission.status !== "success") {
		// Replay plan-field errors on the same submission object so the form
		// renders them next to the business-form fields.
		const fieldErrors: Record<string, string[]> = {};
		for (const [key, errs] of Object.entries(planSubmission.error ?? {})) {
			if (Array.isArray(errs) && errs.length > 0) fieldErrors[key] = errs;
		}
		return {
			ok: false,
			submission: submission.reply({ fieldErrors }),
		};
	}

	const v = submission.value;
	const plan = planSubmission.value;

	const handleAvailability = await businesses.checkHandleAvailable({
		supabase,
		handle: v.handle,
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

	const createResult = await businesses.create({
		supabase,
		values: {
			user_id: SYSTEM_USER_ID,
			handle: v.handle,
			name: v.name,
			category_id: v.category_id,
			city_id: v.city_id,
			neighborhood_id: v.neighborhood_id,
			short_description: v.short_description?.trim() || null,
			whatsapp: v.whatsapp,
			instagram: v.instagram?.trim() || null,
			offers_delivery: v.offers_delivery,
			status: "approved",
			reviewed_at: new Date().toISOString(),
			reviewed_by: reviewerId,
			plan_tier: plan.plan_tier,
			plan_started_at: new Date().toISOString(),
			plan_expires_at: plan.plan_expires_at,
			plan_notes: plan.plan_notes,
		},
	});
	if (isError(createResult)) {
		return {
			ok: false,
			submission: submission.reply({ formErrors: [createResult.error] }),
		};
	}

	const businessId = createResult.success.id;

	const uploadFile = async (
		file: File | undefined,
		bucket: BusinessImageBucket,
	) => {
		if (!file || file.size === 0) return null;
		const upload = await uploadBusinessImage({
			supabase,
			bucket,
			userId: SYSTEM_USER_ID,
			businessId,
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
		await businesses.adminUpdate({
			supabase,
			id: businessId,
			values: patchValues,
		});
	}

	return {
		ok: true,
		id: businessId,
		handle: createResult.success.handle,
	};
}
