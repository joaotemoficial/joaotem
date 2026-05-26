import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { redirect, useLoaderData, useNavigation } from "react-router";
import { BusinessForm } from "~/components/business/business-form";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
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
	const requestedPlan =
		planParam === "basico" || planParam === "ouro" ? planParam : "ouro";
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
	const { categories, cities, neighborhoods, requestedPlan } =
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

	// Plan-picker errors come back keyed by their schema field names,
	// merged into the same submission.error map by handleBusinessSubmission.
	const submissionErrors =
		(actionData as { error?: Record<string, string[]> } | null)?.error ?? {};
	const planError = submissionErrors.requested_plan?.[0];
	const planMessageError = submissionErrors.plan_message?.[0];

	return (
		<main className="mx-auto max-w-3xl px-4 py-8">
			<div className="pb-6">
				<h1 className="text-xl font-semibold tracking-tight">Cadastrar Negócio</h1>
				<p className="text-sm text-muted-foreground">
					Preencha os dados do negócio e escolha o plano. Após enviar, um
					administrador entra em contato para confirmar o pagamento e ativar a
					assinatura.
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
				extra={
					<>
						<h2 className="text-base font-semibold">Escolha um plano</h2>
						<p className="pb-3 text-xs text-muted-foreground">
							O administrador vai analisar sua solicitação e confirmar o
							pagamento pelo WhatsApp.
						</p>
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="flex flex-col gap-1.5 text-sm sm:col-span-1">
								<Label htmlFor="requested_plan">Plano desejado *</Label>
								<select
									id="requested_plan"
									name="requested_plan"
									defaultValue={requestedPlan}
									required
									className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<option value="ouro">
										Ouro — destaque + produtos + promoções
									</option>
									<option value="basico">
										Básico — listagem em buscas
									</option>
								</select>
								{planError ? (
									<span className="text-xs text-destructive">{planError}</span>
								) : null}
							</label>
							<label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
								<Label htmlFor="plan_message">Mensagem (opcional)</Label>
								<Textarea
									id="plan_message"
									name="plan_message"
									rows={2}
									maxLength={500}
									placeholder="Algum detalhe que o administrador deva saber…"
								/>
								{planMessageError ? (
									<span className="text-xs text-destructive">
										{planMessageError}
									</span>
								) : null}
							</label>
						</div>
					</>
				}
			/>
		</main>
	);
}
