import { type SubmissionResult, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { useLoaderData, useNavigation } from "react-router";
import { BusinessOnboardingForm } from "~/components/business/business-onboarding-form";
import { BusinessSuccess } from "~/components/business/business-success";
import { requireUser } from "~/lib/auth.server";
import { handleBusinessSubmission } from "~/lib/business-action.server";
import { businessFormSchema } from "~/lib/validation/business";
import * as categoriesRepo from "~/repositories/categories";
import * as citiesRepo from "~/repositories/cities";
import * as neighborhoodsRepo from "~/repositories/neighborhoods";
import { unwrap } from "~/types";
import type { Route } from "./+types/business-new";

export const meta: Route.MetaFunction = () => [
	{ title: "Cadastrar Negócio — JoaoTem" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await requireUser(request);
	const planParam = new URL(request.url).searchParams.get("plan");
	// `planLocked` means a valid plan came in via the URL — render it read-only
	// (the "PLANO SELECIONADO" card) instead of letting the owner pick one.
	const planLocked = planParam === "basico" || planParam === "ouro";
	const requestedPlan = planLocked ? (planParam as "basico" | "ouro") : "ouro";
	const [cats, cities, neighborhoods] = await Promise.all([
		categoriesRepo.listActive({ supabase: ctx.supabase }),
		citiesRepo.listActive({ supabase: ctx.supabase }),
		neighborhoodsRepo.listAll({ supabase: ctx.supabase }),
	]);
	return {
		categories: unwrap(cats) as Array<{ id: string; name: string }>,
		cities: unwrap(cities) as Array<{
			id: string;
			name: string;
			state: string;
		}>,
		neighborhoods: unwrap(neighborhoods) as Array<{
			id: string;
			name: string;
			city_id: string;
		}>,
		requestedPlan,
		planLocked,
	};
}

export async function action({ request }: Route.ActionArgs) {
	const ctx = await requireUser(request);
	const formData = await request.formData();
	const result = await handleBusinessSubmission({
		formData,
		supabase: ctx.supabase,
		userId: ctx.user.id,
	});
	if (!result.ok) return result.submission;
	// Instead of redirecting, hand back enough data to render the
	// "Cadastro iniciado!" confirmation screen with an activation CTA.
	const field = (key: string) => {
		const value = formData.get(key);
		return typeof value === "string" ? value : "";
	};
	return {
		ok: true as const,
		business: {
			id: result.id,
			name: field("name"),
			handle: result.handle,
			categoryId: field("category_id"),
			neighborhoodId: field("neighborhood_id"),
			requestedPlan:
				field("requested_plan") === "basico"
					? ("basico" as const)
					: ("ouro" as const),
		},
	};
}

export default function BusinessNew({ actionData }: Route.ComponentProps) {
	const { categories, cities, neighborhoods, requestedPlan, planLocked } =
		useLoaderData<typeof loader>();

	// On a successful submission the action returns the confirmation payload
	// (instead of redirecting) so we can render the "Cadastro iniciado!" screen.
	const success = actionData && "ok" in actionData ? actionData : null;
	// Everything below only concerns the form; isolate the SubmissionResult.
	const formResult = (success ? undefined : actionData) as
		| SubmissionResult<string[]>
		| undefined;

	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const [form, fields] = useForm({
		lastResult: formResult,
		shouldRevalidate: "onBlur",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: businessFormSchema });
		},
	});

	// Plan-picker errors come back keyed by their schema field names,
	// merged into the same submission.error map by handleBusinessSubmission.
	const submissionErrors =
		(formResult as { error?: Record<string, string[]> } | null)?.error ?? {};
	const planError = submissionErrors.requested_plan?.[0];
	const planMessageError = submissionErrors.plan_message?.[0];

	if (success) {
		const categoryName = categories.find(
			(c) => c.id === success.business.categoryId,
		)?.name;
		const neighborhoodName = neighborhoods.find(
			(n) => n.id === success.business.neighborhoodId,
		)?.name;
		return (
			<main className="mx-auto max-w-xl px-4 py-8">
				<BusinessSuccess
					name={success.business.name}
					categoryName={categoryName}
					neighborhoodName={neighborhoodName}
					requestedPlan={success.business.requestedPlan}
					editHref={`/dashboard/businesses/${success.business.id}`}
				/>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<BusinessOnboardingForm
				form={form}
				fields={{
					name: fields.name,
					handle: fields.handle,
					category_id: fields.category_id,
					city_id: fields.city_id,
					neighborhood_id: fields.neighborhood_id,
					short_description: fields.short_description,
					whatsapp: fields.whatsapp,
					instagram: fields.instagram,
					google_maps_url: fields.google_maps_url,
					offers_delivery: fields.offers_delivery,
					logo: fields.logo,
					cover: fields.cover,
				}}
				categories={categories}
				cities={cities}
				neighborhoods={neighborhoods}
				requestedPlan={requestedPlan}
				planLocked={planLocked}
				planError={planError}
				planMessageError={planMessageError}
				submitting={submitting}
			/>
		</main>
	);
}
