import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
const service = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const suffix = Date.now();
let clientId;
const testYear = new Date().getUTCFullYear() + 1;
const appointmentDay = `${testYear}-06-18`;
if (
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.VITE_SUPABASE_URL).hostname,
  )
)
  throw Error("Browser tests require local Supabase.");
async function login(page, professional = false) {
  await page.goto("/admin/login");
  await page
    .getByLabel("E-mail", { exact: false })
    .fill(
      process.env[
        professional ? "DEMO_PROFESSIONAL_EMAIL" : "DEMO_ADMIN_EMAIL"
      ],
    );
  await page
    .getByLabel("Senha", { exact: false })
    .fill(
      process.env[
        professional ? "DEMO_PROFESSIONAL_PASSWORD" : "DEMO_ADMIN_PASSWORD"
      ],
    );
  await page.getByRole("button", { name: "Entrar", exact: false }).click();
  await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
}
async function fillSelect(page, name, label) {
  await page.getByLabel(name, { exact: false }).selectOption({ label });
}
test.describe.serial("Full clinic workflow", () => {
  test.afterAll(async () => {
    const { data: clients } = await service
      .from("clients")
      .select("id")
      .in("name", ["Teste Clínica " + suffix, "Contato teste " + suffix]);
    for (const c of clients || []) {
      const { data: photos } = await service
        .from("evolution_photos")
        .select("object_path")
        .eq("client_id", c.id);
      if (photos?.length)
        await service.storage
          .from("evolution")
          .remove(photos.map((p) => p.object_path));
      for (const t of [
        "evolution_photos",
        "reminders",
        "treatments",
        "appointments",
        "leads",
      ])
        await service.from(t).delete().eq("client_id", c.id);
      await service.from("clients").delete().eq("id", c.id);
    }
    await service
      .from("leads")
      .delete()
      .eq("name", "Contato teste " + suffix);
    await service
      .from("procedures")
      .delete()
      .eq("name", "Procedimento teste " + suffix);
  });
  test("Unauthenticated routes redirect and login rejects invalid credentials", async ({
    page,
  }) => {
    await page.goto("/admin/clientes");
    await expect(page).toHaveURL(/admin\/login/);
    await page
      .getByLabel("E-mail", { exact: false })
      .fill("invalid@example.invalid");
    await page.getByLabel("Senha", { exact: false }).fill("invalid-password");
    await page.getByRole("button", { name: "Entrar", exact: false }).click();
    await expect(page.getByRole("alert")).toContainText(
      "E-mail ou senha incorretos",
    );
  });
  test("Create client, search and edit observations", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Clientes", exact: true }).click();
    await page
      .getByRole("button", { name: "Novo cliente", exact: false })
      .click();
    await page.getByLabel("Nome completo").fill("Teste Clínica " + suffix);
    await page.getByLabel("WhatsApp com DDD").fill("11900000099");
    await page
      .getByLabel("E-mail", { exact: true })
      .fill("workflow@example.invalid");
    await page.getByLabel("Data de nascimento").fill("1994-05-12");
    await page
      .getByLabel("Observações", { exact: true })
      .fill("Cliente fictício do teste automatizado.");
    await page.getByRole("checkbox", { name: "Helena Duarte" }).check();
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("searchbox").fill("Teste Clínica " + suffix);
    await page.getByRole("button", { name: "Filtrar" }).click();
    await page
      .getByRole("link", { name: "Teste Clínica " + suffix, exact: false })
      .click();
    await expect(
      page.getByRole("heading", { name: "Teste Clínica " + suffix }),
    ).toBeVisible();
    clientId = page.url().split("/").at(-1);
    await page
      .getByRole("button", { name: "Observações", exact: true })
      .click();
    await expect(page.locator(".note-text")).toContainText("Cliente fictício");
    await page.getByRole("button", { name: "Editar observações" }).click();
    await page
      .getByLabel("Observações do cliente")
      .fill("Observação atualizada no teste.");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.locator(".note-text")).toContainText(
      "Observação atualizada",
    );
  });
  test("Schedule, reject overlap, complete treatment and create return", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/admin/clientes/" + clientId);
    await page
      .getByRole("button", { name: "Agendar atendimento", exact: false })
      .click();
    await fillSelect(page, "Procedimento", "Harmonização Facial");
    await fillSelect(page, "Profissional", "Helena Duarte");
    await page.getByLabel("Data e horário").fill(appointmentDay + "T10:00");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Agendar atendimento", exact: false })
      .click();
    await fillSelect(page, "Procedimento", "Harmonização Facial");
    await fillSelect(page, "Profissional", "Helena Duarte");
    await page.getByLabel("Data e horário").fill(appointmentDay + "T10:30");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
      "horário já está ocupado",
    );
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page
      .getByRole("button", { name: "Agendamentos", exact: true })
      .click();
    await page.getByRole("button", { name: "Concluir", exact: true }).click();
    await page
      .getByLabel("Registro do atendimento")
      .fill("Atendimento concluído no teste funcional.");
    await page
      .getByLabel("Resultado esperado")
      .fill("Acompanhamento demonstrativo.");
    await page
      .getByLabel("Recomendações")
      .fill("Orientações fictícias para teste.");
    await page.getByLabel("Retorno recomendado").fill(`${testYear}-07-18`);
    await page.getByRole("button", { name: "Concluir e registrar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Histórico", exact: true }).click();
    await expect(page.locator(".timeline")).toContainText(
      "Atendimento concluído no teste funcional.",
    );
    await page.getByRole("link", { name: "Lembretes", exact: true }).click();
    await page.getByLabel("Período").selectOption("upcoming");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page.locator("tbody")).toContainText(
      "Teste Clínica " + suffix,
    );
    const { data } = await service
      .from("appointments")
      .select("id")
      .eq("client_id", clientId)
      .single();
    expect(data.id).toBeTruthy();
  });
  test("Upload private before/after photos and compare", async ({ page }) => {
    await login(page);
    await page.goto("/admin/clientes/" + clientId);
    for (const category of ["before", "after"]) {
      await page
        .getByRole("button", { name: "Adicionar evolução", exact: false })
        .click();
      await fillSelect(page, "Procedimento", "Harmonização Facial");
      await page
        .getByLabel("Categoria", { exact: false })
        .selectOption(category);
      await page
        .locator("input[type=file]")
        .setInputFiles("public/assets/sobre-detalhe.webp");
      await page
        .getByLabel("Observação", { exact: true })
        .fill("Foto ilustrativa para teste, não é resultado clínico.");
      await page.getByRole("button", { name: "Salvar foto" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await page.getByRole("button", { name: "Evolução", exact: true }).click();
    await expect(page.locator(".photo-card")).toHaveCount(2);
    await expect(
      page.getByRole("heading", { name: "Antes & depois" }),
    ).toBeVisible();
    const images = await page
      .locator(".photo-card img")
      .evaluateAll((imgs) =>
        imgs.every(
          (i) => i.complete && i.naturalWidth > 0 && i.src.startsWith("blob:"),
        ),
      );
    expect(images).toBe(true);
    await page.getByRole("slider").fill("70");
    expect(await page.locator(".comparison").getAttribute("style")).toContain(
      "70%",
    );
  });
  test("Every admin route and mobile navigation renders without console errors or overflow", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await login(page);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "",
        "agenda",
        "clientes",
        "evolucao",
        "procedimentos",
        "lembretes",
        "equipe",
        "configuracoes",
      ]) {
        await page.goto("/admin/" + route);
        await expect(page.locator("#page h1")).toBeVisible();
        await expect(page.locator(".skeleton")).toHaveCount(0);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          route + " " + width,
        ).toBe(true);
      }
      if (width === 390) {
        await page.getByRole("button", { name: "Abrir menu" }).click();
        await page.getByRole("link", { name: "Agenda", exact: true }).click();
        await expect(
          page.getByRole("heading", { name: "Agenda", exact: true }),
        ).toBeVisible();
      }
    }
    expect(errors).toEqual([]);
  });
  test("Calendar views, reminder creation and procedure editing work", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/admin/agenda");
    for (const name of ["Semana", "Mês", "Dia"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect(
        page.locator(name === "Dia" ? ".panel" : ".calendar-grid"),
      ).toBeVisible();
    }
    await page.goto("/admin/lembretes");
    await page
      .getByRole("button", { name: "Novo lembrete", exact: false })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Cliente").selectOption(clientId);
    await dialog
      .getByLabel("Responsável")
      .selectOption({ label: "Helena Duarte" });
    await dialog.getByLabel("Título").fill("Lembrete automatizado " + suffix);
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("tbody")).toContainText(
      "Lembrete automatizado " + suffix,
    );
    await page.goto("/admin/procedimentos");
    await page
      .getByRole("button", { name: "Novo procedimento", exact: false })
      .click();
    await page
      .getByLabel("Nome", { exact: false })
      .fill("Procedimento teste " + suffix);
    await page.getByLabel("Duração").fill("30");
    await page.getByLabel("Valor").fill("150");
    await page.getByRole("checkbox", { name: "Helena Duarte" }).check();
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("searchbox").fill("Procedimento teste " + suffix);
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page.locator("tbody")).toContainText("R$");
  });
  test("Public interest form persists lead and admin converts it", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Prefiro receber um contato" })
      .click();
    await page.getByLabel("Nome completo").fill("Contato teste " + suffix);
    await page.getByLabel("WhatsApp com DDD").fill("11900000888");
    await page
      .getByLabel("Procedimento de interesse")
      .selectOption({ label: "Skinbooster" });
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Quero receber um contato" })
      .click();
    await expect(page.locator(".q-form-status")).toContainText(
      "Recebemos seu contato",
    );
    await login(page);
    const row = page
      .getByRole("row")
      .filter({ hasText: "Contato teste " + suffix });
    await row.getByRole("button", { name: "Converter em cliente" }).click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Contato teste " + suffix }),
    ).toBeVisible();
  });
  test("Professional route restrictions and scoped client data", async ({
    page,
  }) => {
    await login(page, true);
    await expect(
      page.getByRole("link", { name: "Configurações", exact: true }),
    ).toHaveCount(0);
    await page.goto("/admin/configuracoes");
    await expect(page.getByRole("heading")).toContainText("Acesso restrito");
    await page.goto("/admin/clientes/" + clientId);
    await expect(
      page.getByRole("heading", { name: "Teste Clínica " + suffix }),
    ).toBeVisible();
  });
});
