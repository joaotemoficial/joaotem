import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Link, redirect, useLoaderData, useNavigation } from "react-router";
import { BusinessForm } from "~/components/business/business-form";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { requireUser } from "~/lib/auth.server";
import { handleBusinessSubmission } from "~/lib/business-action.server";
import { BUSINESS_STATUS_LABELS } from "~/lib/constants";
import { getPublicUrl } from "~/lib/storage.server";
import { businessFormSchema } from "~/lib/validation/business";
import * as businessesRepo from "~/repositories/businesses";
import * as categoriesRepo from "~/repositories/categories";
import * as citiesRepo from "~/repositories/cities";
import * as neighborhoodsRepo from "~/repositories/neighborhoods";
import { isError, unwrap } from "~/types";
import type { Route } from "./+types/business-edit";

export const meta: Route.MetaFunction = () => [
	{ title: "Editar Negócio — JoaoTem" },
];

export async function loader({ params, request }: Route.LoaderArgs) {
	const ctx = await requireUser(request);
	const businessResult = await businessesRepo.getByIdForOwner({
		supabase: ctx.supabase,
		id: params.id,
		userId: ctx.user.id,
	});
	if (isError(businessResult)) {
		throw new Response(businessResult.error, { status: 500 });
	}
	const business = businessResult.success;
	if (!business) {
		throw new Response("Negócio não encontrado", { status: 404 });
	}

	const [cats, cities, neighborhoods] = await Promise.all([
		categoriesRepo.listActive({ supabase: ctx.supabase }),
		citiesRepo.listActive({ supabase: ctx.supabase }),
		neighborhoodsRepo.listAll({ supabase: ctx.supabase }),
	]);

	return {
		business: {
			...business,
			logo_url: getPublicUrl(ctx.supabase, "business-logos", business.logo_path),
			cover_url: getPublicUrl(
				ctx.supabase,
				"business-covers",
				business.cover_path,
			),
		},
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
	};
}

export async function action({ params, request }: Route.ActionArgs) {
	const ctx = await requireUser(request);
	const formData = await request.formData();
	const result = await handleBusinessSubmission({
		formData,
		supabase: ctx.supabase,
		userId: ctx.user.id,
		businessId: params.id,
	});
	if (!result.ok) return result.submission;
	throw redirect("/dashboard", { headers: ctx.headers });
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	pending: "secondary",
	approved: "default",
	rejected: "destructive",
	suspended: "outline",
};

export default function BusinessEdit({ actionData }: Route.ComponentProps) {
	const { business, categories, cities, neighborhoods } =
		useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const [form, fields] = useForm({
		lastResult: actionData,
		shouldRevalidate: "onBlur",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: businessFormSchema });
		},
	});

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<div className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-semibold tracking-tight">
							{business.name}
						</h1>
						<Badge variant={STATUS_VARIANT[business.status] ?? "secondary"}>
							{BUSINESS_STATUS_LABELS[business.status]}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">
						Edite as informações do seu negócio.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link
						to={`/dashboard/businesses/${business.id}/products`}
						className={buttonVariants({ variant: "outline", size: "default" })}
					>
						Gerenciar produtos
					</Link>
					<Link
						to={`/dashboard/businesses/${business.id}/promotions`}
						className={buttonVariants({ variant: "outline", size: "default" })}
					>
						Gerenciar promoções
					</Link>
				</div>
			</div>

			{business.status === "rejected" && business.rejection_reason ? (
				<div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
					Motivo da rejeição: {business.rejection_reason}
				</div>
			) : null}

			<BusinessForm
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
				defaults={{
					name: business.name,
					handle: business.handle,
					category_id: business.category_id,
					city_id: business.city_id,
					neighborhood_id: business.neighborhood_id,
					short_description: business.short_description,
					whatsapp: business.whatsapp,
					instagram: business.instagram,
					google_maps_url: business.google_maps_url,
					offers_delivery: business.offers_delivery,
					logo_url: business.logo_url,
					cover_url: business.cover_url,
				}}
				submitting={submitting}
				submitLabel="Salvar alterações"
			/>
		</main>
	);
}
