import { Form, Link, useLoaderData } from "react-router";
import { Frown, Search, SlidersHorizontal } from "lucide-react";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import {
  PromotionCard,
  type PromotionCardData,
} from "~/components/promotions/promotion-card";
import { buttonVariants } from "~/components/ui/button";
import { Pagination } from "~/components/ui/pagination";
import { getSessionAndProfile } from "~/lib/auth.server";
import { PROMOTION_IMAGE_BUCKET, getPublicUrl } from "~/lib/storage.server";
import * as promotionsRepo from "~/repositories/promotions";
import { isError } from "~/types";
import type { Route } from "./+types/promotions-index";

const PAGE_SIZE = 20;

export const meta: Route.MetaFunction = () => [
  { title: "Promoções — JoaoTem" },
  {
    name: "description",
    content: "Veja todas as promoções ativas hoje no João Tem.",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await getSessionAndProfile(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const promotions = await promotionsRepo.listAllPublicTodayFeed({
    supabase: ctx.supabase,
  });
  if (isError(promotions)) {
    console.error("[promotions-index.loader] promotions:", promotions.error);
    throw new Response(promotions.error, { status: 500 });
  }

  const mapped: PromotionCardData[] = promotions.success.map((p) => {
    const cover = (p.images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    const biz = Array.isArray(p.business) ? p.business[0] : p.business;
    const bizCity = biz?.city
      ? Array.isArray(biz.city)
        ? biz.city[0]
        : biz.city
      : null;
    const bizNeighborhood = biz?.neighborhood
      ? Array.isArray(biz.neighborhood)
        ? biz.neighborhood[0]
        : biz.neighborhood
      : null;
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      schedule_note: p.schedule_note,
      cover_url: cover
        ? getPublicUrl(ctx.supabase, PROMOTION_IMAGE_BUCKET, cover.storage_path)
        : null,
      business: biz
        ? {
            handle: biz.handle,
            name: biz.name,
            logo_url: getPublicUrl(
              ctx.supabase,
              "business-logos",
              biz.logo_path,
            ),
            city: bizCity,
            neighborhood: bizNeighborhood,
          }
        : null,
    };
  });

  const needle = q?.trim().toLowerCase();
  const filtered = needle
    ? mapped.filter(
        (p) =>
          p.title.toLowerCase().includes(needle) ||
          (p.business?.name?.toLowerCase().includes(needle) ?? false),
      )
    : mapped;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = filtered.slice(offset, offset + PAGE_SIZE);

  return {
    user: ctx.user ? { id: ctx.user.id, email: ctx.user.email ?? null } : null,
    profile: ctx.profile,
    promotions: pageItems,
    filters: { q: q ?? "" },
    page,
    total,
    totalPages,
  };
}

export default function PromotionsIndex() {
  const {
    user,
    profile,
    promotions,
    filters,
    page,
    total,
    totalPages,
  } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader user={user} role={profile?.role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex items-baseline justify-between gap-2 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-700">
            Promoções de hoje
          </h1>
          <span className="text-xs text-muted-foreground">
            {total} {total === 1 ? "promoção ativa" : "promoções ativas"}
          </span>
        </div>

        <Form
          method="get"
          className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor="promo-q"
              className="text-xs font-medium text-muted-foreground"
            >
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="promo-q"
                name="q"
                defaultValue={filters.q}
                placeholder="Buscar por promoção ou empresa…"
                className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <button
            type="submit"
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className: "h-10 w-full gap-2 px-5 sm:w-auto",
            })}
          >
            <SlidersHorizontal className="size-4" />
            Filtrar
          </button>
        </Form>

        <div className="pt-6">
          {promotions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
              <span className="flex gap-2 text-muted-foreground items-center justify-center font-medium">
                OOPS! <Frown />
              </span>
              <p className="text-sm text-muted-foreground">
                Nenhuma promoção encontrada para os filtros selecionados.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {promotions.map((p) => (
                <li key={p.id}>
                  <PromotionCard promotion={p} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} />

        <div className="pt-10 text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Voltar à página inicial
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
