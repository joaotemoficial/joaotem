import {
  ChevronsUpDown,
  ExternalLink,
  Globe,
  LayoutGrid,
  LogOut,
  Megaphone,
  Plus,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react"
import { Link, useLocation } from "react-router"

import { PlanBadge } from "~/components/business/plan-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"
import type { PlanTier } from "~/lib/plan"
import { cn } from "~/lib/utils"

export type DashboardBusiness = {
  id: string
  name: string
  handle: string
  logo_url: string | null
  status: "pending" | "approved" | "rejected" | "suspended"
  effective_tier: PlanTier | null
}

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: "user" | "admin"
} | null

function initials(name?: string | null, email?: string | null): string {
  const source = (name ?? "").trim()
  if (source) {
    const parts = source.split(/\s+/)
    const first = parts[0]?.[0] ?? ""
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : ""
    return (first + last).toUpperCase() || source[0].toUpperCase()
  }
  return (email?.[0] ?? "U").toUpperCase()
}

function BusinessGlyph({
  business,
  className,
}: {
  business: DashboardBusiness | null
  className?: string
}) {
  if (business?.logo_url) {
    return (
      <img
        src={business.logo_url}
        alt=""
        className={cn(
          "size-8 shrink-0 rounded-lg object-cover ring-1 ring-border",
          className,
        )}
      />
    )
  }
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-sky-400 text-[11px] font-bold text-primary-foreground shadow-sm ring-1 ring-inset ring-white/25",
        className,
      )}
    >
      {business ? (
        initials(business.name)
      ) : (
        <Store className="size-4" strokeWidth={2.25} />
      )}
    </span>
  )
}

const TRIGGER_CLASS =
  "flex h-12 w-full items-center gap-2.5 overflow-hidden rounded-xl px-2 text-left outline-hidden ring-sidebar-ring transition-colors hover:bg-sidebar-accent focus-visible:ring-2 aria-expanded:bg-sidebar-accent data-[popup-open]:bg-sidebar-accent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"

export function AppSidebar({
  user,
  profile,
  businesses,
  activeBusiness,
}: {
  user: { id: string; email: string | null }
  profile: Profile
  businesses: DashboardBusiness[]
  activeBusiness: DashboardBusiness | null
}) {
  const { pathname } = useLocation()
  const displayName = profile?.full_name?.trim() || "Minha conta"
  const displayEmail = profile?.email ?? user.email ?? ""
  const isAdmin = profile?.role === "admin"

  const businessBase = activeBusiness
    ? `/dashboard/businesses/${activeBusiness.id}`
    : null

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-2.5 border-b border-sidebar-border/70 pb-2.5">
        {/* Brand lockup */}
        <Link
          to="/dashboard"
          aria-label="João Tem — Painel"
          className="flex items-center rounded-xl px-1.5 py-1 outline-hidden ring-sidebar-ring transition-colors focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <img
            src="/joao-tem-logo.svg"
            alt="João Tem"
            className="h-8 w-auto object-contain group-data-[collapsible=icon]:hidden"
          />
          <img
            src="/SVG2.svg"
            alt="João Tem"
            className="hidden size-8 shrink-0 object-contain group-data-[collapsible=icon]:block"
          />
        </Link>

        {/* Business switcher */}
        {businesses.length === 0 ? (
          <Link
            to="/dashboard/businesses/new"
            className={cn(
              TRIGGER_CLASS,
              "border border-dashed border-sidebar-border hover:border-primary/40",
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
              <Plus className="size-4" strokeWidth={2.25} />
            </span>
            <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                Cadastrar negócio
              </span>
              <span className="truncate text-[11px] text-sidebar-foreground/55">
                Comece por aqui
              </span>
            </span>
          </Link>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<button type="button" className={TRIGGER_CLASS} />}
            >
              <BusinessGlyph business={activeBusiness} />
              <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
                  {activeBusiness ? activeBusiness.name : "Selecionar negócio"}
                </span>
                <span className="truncate text-[11px] leading-tight text-sidebar-foreground/55">
                  {activeBusiness
                    ? `@${activeBusiness.handle}`
                    : `${businesses.length} ${businesses.length === 1 ? "negócio" : "negócios"}`}
                </span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={6}
              className="min-w-(--anchor-width) max-w-72"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Seus negócios</DropdownMenuLabel>
                {businesses.map((b) => {
                  const selected = b.id === activeBusiness?.id
                  return (
                    <DropdownMenuItem
                      key={b.id}
                      render={<Link to={`/dashboard/businesses/${b.id}`} />}
                      className={cn("gap-2.5 py-1.5", selected && "bg-accent/60")}
                    >
                      <BusinessGlyph
                        business={b}
                        className="size-7 rounded-md"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">
                          {b.name}
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          @{b.handle}
                        </span>
                      </span>
                      <PlanBadge tier={b.effective_tier} />
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/dashboard" />}>
                <LayoutGrid />
                Ver todos os negócios
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/dashboard/businesses/new" />}>
                <Plus />
                Cadastrar negócio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1 py-2">
        {/* General */}
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupAction
            render={<Link to="/dashboard/businesses/new" />}
            title="Cadastrar negócio"
          >
            <Plus />
            <span className="sr-only">Cadastrar negócio</span>
          </SidebarGroupAction>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link to="/dashboard" />}
                isActive={pathname === "/dashboard"}
                tooltip="Meus negócios"
                className={ACTIVE_BAR}
              >
                <Store />
                <span>Meus negócios</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Contextual: the business currently in scope */}
        {activeBusiness && businessBase ? (
          <SidebarGroup>
            <SidebarGroupLabel className="gap-1.5">
              <Settings2 className="size-3.5" />
              <span className="truncate">{activeBusiness.name}</span>
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link to={businessBase} />}
                  isActive={pathname === businessBase}
                  tooltip="Detalhes"
                  className={ACTIVE_BAR}
                >
                  <Store />
                  <span>Detalhes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link to={`${businessBase}/products`} />}
                  isActive={pathname.startsWith(`${businessBase}/products`)}
                  tooltip="Produtos"
                  className={ACTIVE_BAR}
                >
                  <ShoppingBag />
                  <span>Produtos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link to={`${businessBase}/promotions`} />}
                  isActive={pathname.startsWith(`${businessBase}/promotions`)}
                  tooltip="Promoções"
                  className={ACTIVE_BAR}
                >
                  <Megaphone />
                  <span>Promoções</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link to={`/dashboard/upgrade?business=${activeBusiness.id}`} />
                  }
                  isActive={pathname.startsWith("/dashboard/upgrade")}
                  tooltip="Plano"
                  className={ACTIVE_BAR}
                >
                  <Sparkles />
                  <span>Plano</span>
                  {activeBusiness.effective_tier === null ? (
                    <span className="ml-auto size-1.5 rounded-full bg-destructive group-data-[collapsible=icon]:hidden" />
                  ) : null}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {activeBusiness.status === "approved" &&
              activeBusiness.effective_tier !== null ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <a
                        href={`/negocio/${activeBusiness.handle}`}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                    tooltip="Ver página pública"
                    className="text-sidebar-foreground/70"
                  >
                    <ExternalLink />
                    <span>Ver página</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70">
        {/* Empty form lets the dropdown item submit a POST logout (form attr). */}
        <form method="post" action="/logout" id="dashboard-logout" />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button type="button" className={TRIGGER_CLASS} />}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-semibold text-accent ring-1 ring-border">
              {initials(profile?.full_name, displayEmail)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
                {displayName}
              </span>
              <span className="truncate text-[11px] leading-tight text-sidebar-foreground/55">
                {displayEmail}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={8}
            className="min-w-(--anchor-width) max-w-64"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </span>
                <span className="truncate font-normal text-muted-foreground">
                  {displayEmail}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {isAdmin ? (
              <DropdownMenuItem render={<Link to="/admin" />}>
                <ShieldCheck />
                Painel administrativo
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem render={<Link to="/" />}>
              <Globe />
              Ver site
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              render={<button type="submit" form="dashboard-logout" />}
            >
              <LogOut />
              Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

const ACTIVE_BAR =
  "relative data-active:before:absolute data-active:before:left-0 data-active:before:top-1/2 data-active:before:h-5 data-active:before:w-[3px] data-active:before:-translate-y-1/2 data-active:before:rounded-r-full data-active:before:bg-sidebar-primary data-active:before:content-['']"
