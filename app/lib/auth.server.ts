import { redirect } from "react-router";
import { createSupabaseServerClient } from "~/utils/supabase.server";

export type AuthSession = Awaited<ReturnType<typeof getUser>>;

export async function getUser(request: Request) {
  const { supabaseClient, headers } = createSupabaseServerClient(request);
  let user: Awaited<
    ReturnType<typeof supabaseClient.auth.getUser>
  >["data"]["user"] = null;
  try {
    const result = await supabaseClient.auth.getUser();
    user = result.data.user;
  } catch (e) {
    console.log(e);
    // Stale or invalid refresh-token cookie. Treat as anonymous; supabase-ssr
    // will have already queued the cleared cookies on `headers`.
    user = null;
  }
  return { user, supabase: supabaseClient, headers };
}

export async function requireUser(request: Request) {
  const ctx = await getUser(request);
  if (!ctx.user) {
    throw redirect("/login", { headers: ctx.headers });
  }
  return ctx as typeof ctx & { user: NonNullable<typeof ctx.user> };
}

export async function requireAdmin(request: Request) {
  const ctx = await requireUser(request);

  const { data: profile, error } = await ctx.supabase
    .from("profiles")
    .select("role")
    .eq("id", ctx.user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin") {
    throw redirect("/dashboard", { headers: ctx.headers });
  }

  return ctx;
}

export async function getSessionAndProfile(request: Request) {
  const ctx = await getUser(request);
  if (!ctx.user) return { ...ctx, profile: null };
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", ctx.user.id)
    .maybeSingle();
  return { ...ctx, profile };
}
