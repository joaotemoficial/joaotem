import { Building2, Store } from "lucide-react";
import { Link } from "react-router";
import { Button, buttonVariants } from "~/components/ui/button";

const NAV_LINKS = [
  { to: "/", label: "Início" },
  { to: "/#categorias", label: "Categorias" },
  { to: "/negocios", label: "Negócios" },
  { to: "/promocoes", label: "Promoções" },
  { to: "/planos", label: "Planos" },
  { to: "/#como-funciona", label: "Como funciona" },
] as const;

export function SiteHeader({
  user,
  role,
}: {
  user: { email: string | null | undefined } | null;
  role?: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
          aria-label="JoaoTem"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-4" />
          </span>
          <span>
            João<span className="text-primary">Tem</span>
          </span>
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-1 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

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
                to="/planos"
                className={buttonVariants({ variant: "default", size: "sm" })}
              >
                <Building2 />
                Cadastrar meu negócio
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
