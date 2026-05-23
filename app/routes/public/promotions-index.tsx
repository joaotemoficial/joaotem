import { Form, Link, useLoaderData } from "react-router";
import { Frown } from "lucide-react";
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
import * as citiesRepo from "~/repositories/cities";
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
  const cityId = url.searchParams.get("city") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [promotions, cities] = await Promise.all([
    promotionsRepo.listAllPublicTodayFeed({
      supabase: ctx.supabase,
      cityId: cityId || undefined,
    }),
    citiesRepo.listActive({ supabase: ctx.supabase }),
  ]);
  if (isError(promotions)) {
    console.error("[promotions-index.loader] promotions:", promotions.error);
    throw new Response(promotions.error, { status: 500 });
  }
  if (isError(cities)) throw new Response(cities.error, { status: 500 });

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
            logo_url: getPublicUrl(ctx.supabase, "business-logos", biz.logo_path),
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
    cities: cities.success,
    filters: { cityId: cityId ?? "", q: q ?? "" },
    page,
    total,
    totalPages,
  };
}

export default function PromotionsIndex() {
  const { user, profile, promotions, cities, filters, page, total, totalPages } =
    useLoaderData<typeof loader>();

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader user={user} role={profile?.role} />
      <main className="mx-auto max-w-6xl px-4 py-8">
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
          className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-4"
        >
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Buscar por promoção ou empresa…"
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm sm:col-span-2"
          />
          <select
            name="city"
            defaultValue={filters.cityId}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todas as cidades</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.state}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className={`${buttonVariants({ variant: "default", size: "default" })} sm:col-span-1`}
          >
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
