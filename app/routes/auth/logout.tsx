import { redirect } from "react-router";
import { signOut } from "~/repositories/auth";
import { isError } from "~/types";
import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
	const result = await signOut({ request });
	const headers = isError(result) ? new Headers() : result.success;
	throw redirect("/", { headers });
}

export async function loader() {
	throw redirect("/");
}

export default function Logout() {
	return null;
}
