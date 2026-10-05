import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_ANON_KEY;
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw Error("Tests require local Supabase.");
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
async function emailLink(email) {
  for (let n = 0; n < 20; n++) {
    const box = await fetch("http://127.0.0.1:54324/api/v1/messages").then(
      (r) => r.json(),
    );
    const item = box.messages?.find((m) =>
      m.To?.some((t) => t.Address === email),
    );
    if (item) {
      const m = await fetch(
        "http://127.0.0.1:54324/api/v1/message/" + item.ID,
      ).then((r) => r.json());
      const link = m.Text?.match(
        /https?:\/\/[^\s<>]+\/auth\/v1\/verify[^\s<>]+/,
      );
      if (link) return link[0].replaceAll("&amp;", "&");
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw Error("Expected local authentication email was not captured.");
}
test("Private invitation and password recovery through captured local email", async ({
  page,
}) => {
  const email = `invite-${Date.now()}@example.invalid`,
    password = randomBytes(20).toString("base64url");
  let professionalId, uid;
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const sign = await admin.auth.signInWithPassword({
    email: process.env.DEMO_ADMIN_EMAIL,
    password: process.env.DEMO_ADMIN_PASSWORD,
  });
  expect(sign.error).toBeNull();
  try {
    const { data: pid, error } = await admin.rpc("save_professional", {
      professional: null,
      details: {
        name: "Profissional teste de convite",
        email,
        active: true,
        phone: "",
        specialty: "Teste",
        registration: "FICTÍCIO",
        photo_url: "",
      },
      access_role: "professional",
    });
    expect(error).toBeNull();
    professionalId = pid;
    const invited = await admin.functions.invoke("invite-team", {
      body: {
        professional_id: pid,
        role: "professional",
        redirect_to: "http://127.0.0.1:5173/admin/login",
      },
    });
    expect(invited.error).toBeNull();
    expect(invited.data).toEqual({ ok: true });
    const record = await service
      .from("professionals")
      .select("user_id")
      .eq("id", pid)
      .single();
    uid = record.data.user_id;
    expect(uid).toBeTruthy();
    await page.goto(await emailLink(email));
    await expect(
      page.getByRole("heading", { name: "Uma nova senha." }),
    ).toBeVisible();
    await page.getByLabel("Nova senha").fill(password);
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.locator(".metrics")).toBeVisible();
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/admin\/login/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Esqueci minha senha" }).click();
    await expect(page.locator("#toasts")).toContainText("receberá um link");
    await page.goto(await emailLink(email));
    await expect(
      page.getByRole("heading", { name: "Uma nova senha." }),
    ).toBeVisible();
    const newPassword = randomBytes(20).toString("base64url");
    await page.getByLabel("Nova senha").fill(newPassword);
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.locator(".metrics")).toBeVisible();
  } finally {
    if (professionalId)
      await service.from("professionals").delete().eq("id", professionalId);
    if (uid) await service.auth.admin.deleteUser(uid);
  }
});
