import { createClient } from "npm:@supabase/supabase-js@2.99.3";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (req) => {
  const reply = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return reply({ error: "Método não permitido." }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return reply({ error: "Não autenticado." }, 401);
  const url = Deno.env.get("SUPABASE_URL")!,
    anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const caller = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await caller.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (authError || !user) {
    return reply({ error: "Sessão inválida." }, 401);
  }
  const { data: admin } = await caller.rpc("is_admin");
  if (!admin) return reply({ error: "Sem permissão." }, 403);
  try {
    const body = await req.json();
    if (!["admin", "professional"].includes(body.role) || !body.professional_id)
      return reply({ error: "Dados inválidos." }, 400);
    const service = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: professional, error } = await service
      .from("professionals")
      .select("*")
      .eq("id", body.professional_id)
      .single();
    if (error || !professional?.active || professional.user_id)
      return reply(
        { error: "Profissional indisponível ou já vinculado." },
        400,
      );
    // Auth validates redirect_to against its configured allowlist.
    const { data: invited, error: inviteError } =
      await service.auth.admin.inviteUserByEmail(professional.email, {
        redirectTo: body.redirect_to,
      });
    if (inviteError || !invited.user)
      return reply(
        { error: "Falha no envio. Verifique o e-mail e a configuração SMTP." },
        400,
      );
    const { error: profileError } = await service.from("users").insert({
      id: invited.user.id,
      name: professional.name,
      role: body.role,
    });
    if (profileError) {
      await service.auth.admin.deleteUser(invited.user.id);
      return reply({ error: "Não foi possível vincular a conta." }, 500);
    }
    const { data: linked, error: linkError } = await service
      .from("professionals")
      .update({ user_id: invited.user.id })
      .eq("id", professional.id)
      .is("user_id", null)
      .select("id")
      .maybeSingle();
    if (linkError || !linked) {
      await service.auth.admin.deleteUser(invited.user.id);
      return reply({ error: "Não foi possível vincular o profissional." }, 500);
    }
    return reply({ ok: true });
  } catch {
    return reply({ error: "Não foi possível processar o convite." }, 400);
  }
});
