import {
  Building2,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Shield,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";

const NAV_LINKS = [
  { to: "/", label: "Início" },
  { to: "/#categorias", label: "Categorias" },
  { to: "/#empresas-em-destaque", label: "Negócios" },
  { to: "/#promocoes", label: "Promoções" },
  { to: "/#planos", label: "Planos" },
  { to: "/#como-funciona", label: "Como funciona" },
] as const;

export function SiteHeader({
  user,
  role,
}: {
  user: { email: string | null | undefined } | null;
  role?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" aria-label="João Tem" className="flex items-center">
          <img
            src="/joao-tem-logo.svg"
            alt="João Tem"
            className="h-11 w-auto object-contain"
          />
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

        <nav className="hidden items-center gap-1.5 md:flex">
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
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary bg-transparent px-4 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
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
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary bg-transparent px-4 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Entrar
              </Link>
              <Link
                to="/planos"
                className={buttonVariants({
                  variant: "default",
                  size: "sm",
                  className: "h-auto px-6 py-2.5",
                })}
              >
                <Building2 />
                Cadastrar meu negócio
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menu"
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>

          <SheetContent
            side="top"
            showCloseButton={false}
            className="h-dvh w-full gap-0 p-0"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
              <SheetTitle className="flex items-center">
                <img
                  src="/joao-tem-logo.svg"
                  alt="João Tem"
                  className="h-11 w-auto object-contain"
                />
              </SheetTitle>
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Fechar menu"
                  />
                }
              >
                <X className="size-5" />
              </SheetClose>
            </div>

            <nav
              aria-label="Navegação principal"
              className="flex flex-1 flex-col overflow-y-auto px-4"
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={close}
                  className="py-4 text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}

              {user ? (
                <>
                  {role === "admin" ? (
                    <Link
                      to="/admin"
                      onClick={close}
                      className="flex items-center gap-3 py-4 text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Shield className="size-5" />
                      Admin
                    </Link>
                  ) : null}
                  <Link
                    to="/dashboard"
                    onClick={close}
                    className="flex items-center gap-3 py-4 text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <LayoutGrid className="size-5" />
                    Meu painel
                  </Link>
                </>
              ) : null}
            </nav>

            <div className="border-t border-border/60 p-4">
              {user ? (
                <form method="post" action="/logout">
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-12 w-full gap-2 border-destructive/40 text-base font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="size-5" />
                    Sair
                  </Button>
                </form>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={close}
                    className={buttonVariants({
                      variant: "outline",
                      className: "h-12 w-full gap-2 text-base font-semibold",
                    })}
                  >
                    <LogIn className="size-5" />
                    Entrar
                  </Link>
                  <Link
                    to="/planos"
                    onClick={close}
                    className={buttonVariants({
                      variant: "default",
                      className: "h-12 w-full gap-2 text-base font-semibold",
                    })}
                  >
                    <Building2 className="size-5" />
                    Cadastrar meu negócio
                  </Link>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
