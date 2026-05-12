import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { redirect, useLoaderData, useNavigation } from "react-router";
import { BusinessForm } from "~/components/business/business-form";
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
	throw redirect("/dashboard", { headers: ctx.headers });
}

export default function BusinessNew({ actionData }: Route.ComponentProps) {
	const { categories, cities, neighborhoods } = useLoaderData<typeof loader>();
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
			<div className="pb-6">
				<h1 className="text-xl font-semibold tracking-tight">Cadastrar Negócio</h1>
				<p className="text-sm text-muted-foreground">
					Preencha os dados para iniciar seu cadastro. Após salvar, seu negócio
					ficará pendente até a aprovação de um administrador.
				</p>
			</div>
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
					offers_delivery: fields.offers_delivery,
					logo: fields.logo,
					cover: fields.cover,
				}}
				categories={categories}
				cities={cities}
				neighborhoods={neighborhoods}
				defaults={{}}
				submitting={submitting}
				submitLabel="Salvar e continuar"
			/>
		</main>
	);
}
