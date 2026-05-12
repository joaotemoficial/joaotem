import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, Link, redirect, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authSchema } from "~/lib/validation/business";
import { signUpWithPassword } from "~/repositories/auth";
import { isError } from "~/types";
import type { Route } from "./+types/signup";

export const meta: Route.MetaFunction = () => [
	{ title: "Cadastrar — JoaoTem" },
];

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema: authSchema });
	if (submission.status !== "success") return submission.reply();

	const result = await signUpWithPassword({
		email: submission.value.email,
		password: submission.value.password,
		request,
	});
	if (isError(result)) {
		return submission.reply({ formErrors: [result.error] });
	}

	throw redirect("/dashboard", { headers: result.success.headers });
}

export default function Signup({ actionData }: Route.ComponentProps) {
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
				<h1 className="text-xl font-semibold tracking-tight">Criar conta</h1>
				<p className="text-sm text-muted-foreground">
					Cadastre-se para criar e gerenciar seus negócios.
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
						autoComplete="new-password"
					/>
					<p className="text-xs text-muted-foreground">
						Mínimo 6 caracteres.
					</p>
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
					{submitting ? "Criando…" : "Criar conta"}
				</Button>

				<p className="pt-2 text-center text-sm text-muted-foreground">
					Já tem conta?{" "}
					<Link to="/login" className="font-medium text-foreground underline">
						Entrar
					</Link>
				</p>
			</Form>
		</main>
	);
}
