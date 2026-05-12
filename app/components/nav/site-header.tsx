import { Link } from "react-router";
import { Button, buttonVariants } from "~/components/ui/button";

export function SiteHeader({
	user,
	role,
}: {
	user: { email: string | null | undefined } | null;
	role?: string | null;
}) {
	return (
		<header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
			<div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
				<Link
					to="/"
					className="text-base font-semibold tracking-tight"
					aria-label="JoaoTem"
				>
					JoaoTem
				</Link>

				<nav className="flex items-center gap-1.5">
					{user ? (
						<>
							{role === "admin" ? (
								<Link
									to="/admin"
									className={buttonVariants({ variant: "ghost", size: "sm" })}
								>
									Admin
								</Link>
							) : null}
							<Link
								to="/dashboard"
								className={buttonVariants({ variant: "ghost", size: "sm" })}
							>
								Meu painel
							</Link>
							<form method="post" action="/logout">
								<Button variant="ghost" size="sm" type="submit">
									Sair
								</Button>
							</form>
						</>
					) : (
						<>
							<Link
								to="/login"
								className={buttonVariants({ variant: "ghost", size: "sm" })}
							>
								Entrar
							</Link>
							<Link
								to="/signup"
								className={buttonVariants({ variant: "default", size: "sm" })}
							>
								Cadastrar
							</Link>
						</>
					)}
				</nav>
			</div>
		</header>
	);
}
