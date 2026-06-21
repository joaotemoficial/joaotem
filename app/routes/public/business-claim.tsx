import { ArrowLeft, UserRoundCheck } from "lucide-react";
import { Form, Link, useLoaderData } from "react-router";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import { Button, buttonVariants } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { getSessionAndProfile } from "~/lib/auth.server";
import { SITE_NAME, buildMeta } from "~/lib/seo";
import { getPublicUrl } from "~/lib/storage.server";
import { SYSTEM_USER_ID } from "~/lib/system-user";
import * as businessesRepo from "~/repositories/businesses";
import * as reclaimsRepo from "~/repositories/reclaims";
import { isError } from "~/types";
import type { Route } from "./+types/business-claim";

export const meta: Route.MetaFunction = ({ data }) =>
  buildMeta({
    title: data?.business
      ? `Reivindicar ${data.business.name} — ${SITE_NAME}`
      : `Reivindicar negócio — ${SITE_NAME}`,
    description:
      "Reivindique a propriedade deste cadastro para gerenciá-lo na sua conta.",
  });

export async function loader({ params, request }: Route.LoaderArgs) {
  const ctx = await getSessionAndProfile(request);
  const result = await businessesRepo.getByHandle({
    supabase: ctx.supabase,
    handle: params.handle,
  });
  if (isError(result) || !result.success) {
    throw new Response("Negócio não encontrado", { status: 404 });
  }
  const business = result.success;

  let alreadyRequested = false;
  if (ctx.user && business.user_id === SYSTEM_USER_ID) {
    const mine = await reclaimsRepo.listMineForBusiness({
      supabase: ctx.supabase,
      businessId: business.id,
      userId: ctx.user.id,
    });
    if (!isError(mine)) {
      alreadyRequested = mine.success.some((r) => r.status === "pending");
    }
  }

  return {
    user: ctx.user ? { email: ctx.user.email ?? null } : null,
    role: ctx.profile?.role ?? null,
    business: {
      handle: business.handle,
      name: business.name,
      logo_url: getPublicUrl(ctx.supabase, "business-logos", business.logo_path),
    },
    isClaimable: business.user_id === SYSTEM_USER_ID,
    loggedIn: Boolean(ctx.user),
    alreadyRequested,
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const ctx = await getSessionAndProfile(request);
  if (!ctx.user) {
    return { reclaimError: "Faça login para reivindicar este negócio." };
  }

  const ownerResult = await businessesRepo.getOwnerIdByHandle({
    supabase: ctx.supabase,
    handle: params.handle,
  });
  if (isError(ownerResult) || !ownerResult.success) {
    return { reclaimError: "Negócio não encontrado." };
  }
  if (ownerResult.success.user_id !== SYSTEM_USER_ID) {
    return { reclaimError: "Este negócio já tem um dono." };
  }

  const formData = await request.formData();
  const message = String(formData.get("message") ?? "").trim();
  const result = await reclaimsRepo.create({
    supabase: ctx.supabase,
    businessId: ownerResult.success.id,
    userId: ctx.user.id,
    message: message.length > 0 ? message : null,
  });
  if (isError(result)) {
    return { reclaimError: result.error };
  }
  return { reclaimOk: true };
}

export default function BusinessClaim({ actionData }: Route.ComponentProps) {
  const { user, role, business, isClaimable, loggedIn, alreadyRequested } =
    useLoaderData<typeof loader>();

  return (
    <div className="min-h-svh bg-[#F5F7FA] text-[#1F2937]">
      <SiteHeader user={user} role={role} />
      <main className="mx-auto max-w-lg px-4 py-10">
        <Link
          to="/negocios"
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-4`}
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-lg font-semibold text-muted-foreground">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                <UserRoundCheck className="mr-1 inline size-3.5" />
                Reivindicar negócio
              </p>
              <h1 className="text-lg font-bold tracking-tight">
                {business.name}
              </h1>
            </div>
          </div>

          <div className="mt-5">
            {!isClaimable ? (
              <p className="rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                Este negócio já tem um dono e não pode ser reivindicado.
              </p>
            ) : !loggedIn ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Faça login para reivindicar a propriedade deste cadastro.
                </p>
                <Link
                  to={`/login?next=${encodeURIComponent(`/negocio/${business.handle}/sou-dono`)}`}
                  className={`${buttonVariants({ variant: "default", size: "sm" })} mt-4`}
                >
                  Entrar para reivindicar
                </Link>
              </>
            ) : alreadyRequested || actionData?.reclaimOk ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-4">
                <p className="text-sm font-medium">Solicitação enviada</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sua reivindicação está em análise. Você será notificado quando
                  um administrador revisar.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Envie uma reivindicação para que um administrador atribua este
                  cadastro à sua conta.
                </p>
                <Form method="post" className="mt-4 flex flex-col gap-3">
                  <Textarea
                    name="message"
                    rows={3}
                    maxLength={500}
                    placeholder="Mensagem opcional (ex.: prove que é o dono)…"
                  />
                  {actionData?.reclaimError ? (
                    <p className="text-xs text-destructive">
                      {actionData.reclaimError}
                    </p>
                  ) : null}
                  <div>
                    <Button type="submit" size="sm">
                      Reclamar este negócio
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
