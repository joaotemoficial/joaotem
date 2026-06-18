import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Form, Link, redirect, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PasswordInput } from "~/components/ui/password-input";
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
		<main className="mx-auto flex min-h-svh flex-col items-center justify-center bg-secondary px-6 py-12">
			<div className="w-full max-w-[520px] rounded-[28px] border border-border bg-card p-9 shadow-[0_20px_50px_rgba(16,42,67,0.08)]">
				<img
					src="/joao-tem-logo.svg"
					alt="João Tem"
					className="mx-auto mb-5 h-11 w-auto object-contain"
				/>

				<h1 className="text-center text-3xl font-black tracking-tighter text-accent">
					Entrar
				</h1>
				<p className="mt-2 mb-8 text-center text-[15px] leading-relaxed text-muted-foreground">
					Acesse sua conta para gerenciar seus negócios no João Tem.
				</p>

				<Form
					method="post"
					{...getFormProps(form)}
					className="flex flex-col gap-[18px]"
				>
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
							autoComplete="current-password"
							className="h-[52px] rounded-2xl px-4 text-[15px]"
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

					<Button
						type="submit"
						disabled={submitting}
						className="mt-1.5 h-[54px] rounded-2xl text-[15px] font-black hover:bg-accent"
					>
						{submitting ? "Entrando…" : "Entrar"}
					</Button>

					<p className="pt-3 text-center text-sm text-muted-foreground">
						Ainda não tem conta?{" "}
						<Link to="/signup" className="font-extrabold text-primary">
							Cadastre-se
						</Link>
					</p>
				</Form>
			</div>
		</main>
	);
}
