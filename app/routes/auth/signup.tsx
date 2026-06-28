import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, Link, redirect, useLoaderData, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PasswordInput } from "~/components/ui/password-input";
import type { PostHogContext } from "~/lib/posthog-middleware";
import { signupSchema } from "~/lib/validation/business";
import { signUpWithPassword } from "~/repositories/auth";
import { isError } from "~/types";
import type { Route } from "./+types/signup";

export const meta: Route.MetaFunction = () => [
	{ title: "Cadastrar — JoaoTem" },
];

export async function loader({ request }: Route.LoaderArgs) {
	const plan = new URL(request.url).searchParams.get("plan");
	return { plan: plan === "basico" || plan === "ouro" ? plan : null };
}

export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema: signupSchema });
	if (submission.status !== "success") return submission.reply();

	const result = await signUpWithPassword({
		email: submission.value.email,
		password: submission.value.password,
		request,
	});
	if (isError(result)) {
		return submission.reply({ formErrors: [result.error] });
	}

	const posthog = (context as PostHogContext).posthog;
	if (posthog && result.success.data.user) {
		posthog.capture({
			distinctId: result.success.data.user.id,
			event: "user_signed_up",
			properties: { email: submission.value.email },
		});
	}

	const plan = formData.get("plan");
	const dest =
		plan === "basico" || plan === "ouro"
			? `/dashboard/businesses/new?plan=${plan}`
			: "/dashboard";
	throw redirect(dest, { headers: result.success.headers });
}

export default function Signup({ actionData }: Route.ComponentProps) {
	const { plan } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const [form, fields] = useForm({
		lastResult: actionData,
		shouldRevalidate: "onBlur",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: signupSchema });
		},
	});

	return (
		<main className="mx-auto flex min-h-svh flex-col items-center justify-center bg-secondary px-6 py-12">
			<div className="w-full rounded-[28px] max-w-[520px]  border border-border bg-card p-9 shadow-[0_20px_50px_rgba(16,42,67,0.08)]">
				<img
					src="/joao-tem-logo.svg"
					alt="João Tem"
					className="mx-auto mb-5 h-11 w-auto object-contain"
				/>

				<h1 className="text-center text-3xl font-black tracking-tighter text-accent">
					Criar conta
				</h1>
				<p className="mt-2 mb-8 text-center text-[15px] leading-relaxed text-muted-foreground">
					Crie sua conta para cadastrar e gerenciar seus negócios no João Tem.
				</p>

				<Form
					method="post"
					{...getFormProps(form)}
					className="flex flex-col gap-[18px]"
				>
					{plan ? <input type="hidden" name="plan" value={plan} /> : null}
					<div className="flex flex-col gap-2">
						<Label htmlFor={fields.email.id} className="text-sm font-extrabold">
							E-mail
						</Label>
						<Input
							{...getInputProps(fields.email, { type: "email" })}
							placeholder="voce@exemplo.com"
							autoComplete="email"
							className="h-[52px] rounded-2xl px-4 text-[15px]"
						/>
						{fields.email.errors ? (
							<p className="text-xs text-destructive">
								{fields.email.errors[0]}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-2">
						<Label
							htmlFor={fields.password.id}
							className="text-sm font-extrabold"
						>
							Senha
						</Label>
						<PasswordInput
							{...getInputProps(fields.password, { type: "password" })}
							placeholder="Digite sua senha"
							autoComplete="new-password"
							className="h-[52px] rounded-2xl px-4 text-[15px]"
						/>
						<p className="text-xs text-muted-foreground">
							Mínimo de 6 caracteres.
						</p>
						{fields.password.errors ? (
							<p className="text-xs text-destructive">
								{fields.password.errors[0]}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-2">
						<div className="flex items-start gap-2.5">
							<input
								{...getInputProps(fields.terms, { type: "checkbox" })}
								className="mt-0.5 size-4 accent-primary"
							/>
							<Label
								htmlFor={fields.terms.id}
								className="text-sm font-normal leading-snug text-muted-foreground"
							>
								Li e aceito os{" "}
								<Link
									to="/termos"
									target="_blank"
									className="font-bold text-primary"
								>
									Termos de Uso
								</Link>
								.
							</Label>
						</div>
						{fields.terms.errors ? (
							<p className="text-xs text-destructive">
								{fields.terms.errors[0]}
							</p>
						) : null}
					</div>

					{form.errors ? (
						<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
							{form.errors[0]}
						</p>
					) : null}

					<Button
						type="submit"
						disabled={submitting}
						className="mt-1.5 h-[54px] rounded-2xl text-[15px] font-black hover:bg-accent"
					>
						{submitting ? "Criando…" : "Criar conta"}
					</Button>

					<p className="pt-3 text-center text-sm text-muted-foreground">
						Já possui conta?{" "}
						<Link to="/login" className="font-extrabold text-primary">
							Entrar
						</Link>
					</p>
				</Form>
			</div>
		</main>
	);
}
