import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, Link, redirect, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authSchema } from "~/lib/validation/business";
import { signInWithPassword } from "~/repositories/auth";
import { isError } from "~/types";
import type { Route } from "./+types/login";

export const meta: Route.MetaFunction = () => [{ title: "Entrar — JoaoTem" }];

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema: authSchema });
	if (submission.status !== "success") return submission.reply();

	const result = await signInWithPassword({
		email: submission.value.email,
		password: submission.value.password,
		request,
	});
	if (isError(result)) {
		return submission.reply({ formErrors: [result.error] });
	}

	throw redirect("/dashboard", { headers: result.success.headers });
}

export default function Login({ actionData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const submitting = navigation.state !== "idle";

	const [form, fields] = useForm({
		lastResult: actionData,
		shouldRevalidate: "onBlur",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: authSchema });
		},
	});

	return (
		<main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-10">
			<div className="space-y-1.5 pb-6">
				<h1 className="text-xl font-semibold tracking-tight">Entrar</h1>
				<p className="text-sm text-muted-foreground">
					Acesse sua conta para gerenciar seus negócios.
				</p>
			</div>

			<Form
				method="post"
				{...getFormProps(form)}
				className="flex flex-col gap-4"
			>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={fields.email.id}>E-mail</Label>
					<Input
						{...getInputProps(fields.email, { type: "email" })}
						placeholder="voce@exemplo.com"
						autoComplete="email"
					/>
					{fields.email.errors ? (
						<p className="text-xs text-destructive">{fields.email.errors[0]}</p>
					) : null}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor={fields.password.id}>Senha</Label>
					<Input
						{...getInputProps(fields.password, { type: "password" })}
						autoComplete="current-password"
					/>
					{fields.password.errors ? (
						<p className="text-xs text-destructive">
							{fields.password.errors[0]}
						</p>
					) : null}
				</div>

				{form.errors ? (
					<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
						{form.errors[0]}
					</p>
				) : null}

				<Button type="submit" disabled={submitting}>
					{submitting ? "Entrando…" : "Entrar"}
				</Button>

				<p className="pt-2 text-center text-sm text-muted-foreground">
					Ainda não tem conta?{" "}
					<Link to="/signup" className="font-medium text-foreground underline">
						Cadastre-se
					</Link>
				</p>
			</Form>
		</main>
	);
}
