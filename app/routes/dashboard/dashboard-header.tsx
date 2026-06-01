import { ChevronRight, ExternalLink, Globe, Plus } from "lucide-react"
import { Link, useLocation } from "react-router"

import { buttonVariants } from "~/components/ui/button"
import { SidebarTrigger } from "~/components/ui/sidebar"
import { cn } from "~/lib/utils"
import type { DashboardBusiness } from "./app-sidebar"

type Crumb = { label: string; to?: string }

function buildCrumbs(
  pathname: string,
  activeBusiness: DashboardBusiness | null,
): Crumb[] {
  const root: Crumb = { label: "Painel", to: "/dashboard" }

  if (pathname === "/dashboard") {
    return [{ label: "Meus negócios" }]
  }
  if (pathname.startsWith("/dashboard/businesses/new")) {
    return [root, { label: "Novo negócio" }]
  }
  if (pathname.startsWith("/dashboard/upgrade")) {
    return [root, { label: "Plano e upgrade" }]
  }

  if (activeBusiness) {
    const base = `/dashboard/businesses/${activeBusiness.id}`
    const crumbs: Crumb[] = [root, { label: activeBusiness.name, to: base }]
    const rest = pathname.slice(base.length)

    if (rest.startsWith("/products")) {
      crumbs.push({ label: "Produtos", to: `${base}/products` })
      if (rest.includes("/new")) crumbs.push({ label: "Novo produto" })
      else if (rest.split("/").length > 2) crumbs.push({ label: "Editar produto" })
    } else if (rest.startsWith("/promotions")) {
      crumbs.push({ label: "Promoções", to: `${base}/promotions` })
      if (rest.includes("/new")) crumbs.push({ label: "Nova promoção" })
      else if (rest.split("/").length > 2)
        crumbs.push({ label: "Editar promoção" })
    }
    return crumbs
  }

  return [root, { label: "Negócio" }]
}

function HeaderAction({
  pathname,
  activeBusiness,
}: {
  pathname: string
  activeBusiness: DashboardBusiness | null
}) {
  if (pathname === "/dashboard") {
    return (
      <Link
        to="/dashboard/businesses/new"
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        <Plus />
        <span className="hidden sm:inline">Novo negócio</span>
        <span className="sm:hidden">Novo</span>
      </Link>
    )
  }

  if (
    activeBusiness &&
    activeBusiness.status === "approved" &&
    activeBusiness.effective_tier !== null
  ) {
    return (
      <a
        href={`/negocio/${activeBusiness.handle}`}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <ExternalLink />
        <span className="hidden sm:inline">Ver página</span>
      </a>
    )
  }

  return (
    <Link
      to="/"
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      <Globe />
      <span className="hidden sm:inline">Ver site</span>
    </Link>
  )
}

export function DashboardHeader({
  activeBusiness,
}: {
  activeBusiness: DashboardBusiness | null
}) {
  const { pathname } = useLocation()
  const crumbs = buildCrumbs(pathname, activeBusiness)

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-background/75 px-3 backdrop-blur-md sm:px-4">
      <SidebarTrigger className="-ml-1 text-muted-foreground" />
      <span aria-hidden className="mr-1 h-5 w-px bg-border" />

      <nav aria-label="Trilha de navegação" className="flex min-w-0 items-center">
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
                {i > 0 ? (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                ) : null}
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="truncate rounded-md px-1 py-0.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate px-1 py-0.5",
                      isLast
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground",
                    )}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
        <HeaderAction pathname={pathname} activeBusiness={activeBusiness} />
      </div>
    </header>
  )
}
