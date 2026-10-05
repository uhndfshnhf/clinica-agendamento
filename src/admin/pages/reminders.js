import { db, result, options, save } from "../data.js";
import {
  pageHead,
  button,
  field,
  choice,
  modal,
  toast,
  labels,
  table,
  esc,
  date,
  time,
  badge,
  pager,
  bind,
  today,
  localInput,
  toISO,
  confirmAction,
} from "../ui.js";
export async function reminderForm(ctx, item = {}) {
  const o = await options();
  return modal(
    item.id ? "Editar lembrete" : "Novo lembrete",
    field("client_id", "Cliente", "select", item.client_id, {
      required: true,
      choices: choice(o.clients),
    }) +
      field(
        "professional_id",
        "Responsável",
        "select",
        item.professional_id || o.professionals[0]?.id,
        { required: true, choices: choice(o.professionals) },
      ) +
      field("title", "Título", "text", item.title, {
        required: true,
        wide: true,
        maxLength: 200,
      }) +
      field("kind", "Tipo", "select", item.kind || "return", {
        choices: [
          "return",
          "session",
          "evaluation",
          "follow_up",
          "contact",
          "other",
        ].map((v) => [v, labels[v]]),
      }) +
      field(
        "due_at",
        "Data e horário · Brasília",
        "datetime-local",
        item.due_at ? localInput(item.due_at) : today() + "T09:00",
        { required: true },
      ) +
      field("priority", "Prioridade", "select", item.priority || "normal", {
        choices: ["low", "normal", "high"].map((v) => [v, labels[v]]),
      }) +
      field("status", "Status", "select", item.status || "pending", {
        choices: [
          ["pending", "Pendente"],
          ["completed", "Concluído"],
        ],
      }) +
      field("description", "Descrição", "textarea", item.description, {
        wide: true,
        maxLength: 5000,
      }),
    async (v) => {
      await save("reminders", { ...v, due_at: toISO(v.due_at) }, item.id);
      toast("Lembrete salvo.");
      ctx.refresh();
    },
  );
}
export async function render(root, ctx) {
  let page = 0,
    status = "pending",
    kind = "",
    priority = "",
    period = "";
  async function draw() {
    let q = db
      .from("reminders")
      .select("*,clients(name),professionals(name)", { count: "exact" })
      .order("due_at")
      .range(page * 20, page * 20 + 19);
    if (status) q = q.eq("status", status);
    if (kind) q = q.eq("kind", kind);
    if (priority) q = q.eq("priority", priority);
    if (period === "overdue") q = q.lt("due_at", new Date().toISOString());
    if (period === "upcoming") q = q.gte("due_at", new Date().toISOString());
    const { data, count, error } = await q;
    if (error) throw error;
    root.innerHTML =
      pageHead(
        "CONTINUIDADE DO CUIDADO",
        "Lembretes",
        "Pequenos gestos que mantêm você por perto.",
        button("+ Novo lembrete", "new"),
      ) +
      `<section class="panel"><form class="toolbar">${field(
        "status",
        "Status",
        "select",
        status,
        {
          choices: [
            ["", "Todos"],
            ["pending", "Pendentes"],
            ["completed", "Concluídos"],
          ],
        },
      )}${field("kind", "Tipo", "select", kind, { choices: [["", "Todos"], ...["return", "session", "evaluation", "follow_up", "contact", "other"].map((v) => [v, labels[v]])] })}${field("priority", "Prioridade", "select", priority, { choices: [["", "Todas"], ...["low", "normal", "high"].map((v) => [v, labels[v]])] })}${field(
        "period",
        "Período",
        "select",
        period,
        {
          choices: [
            ["", "Todos"],
            ["overdue", "Vencidos"],
            ["upcoming", "Próximos"],
          ],
        },
      )}<button class="btn">Filtrar</button></form>${table(
        ["Lembrete", "Cliente", "Quando", "Prioridade", "Status", ""],
        data.map((r) => [
          `<strong>${esc(r.title)}</strong><small>${esc(labels[r.kind])} · ${esc(r.professionals?.name)}</small>`,
          `<a href="/admin/clientes/${r.client_id}" data-link>${esc(r.clients?.name)}</a>`,
          `${date(r.due_at)} · ${time(r.due_at)}${r.status === "pending" && new Date(r.due_at) < new Date() ? "<small>Vencido</small>" : ""}`,
          badge(r.priority),
          badge(r.status),
          `<div class="row-actions"><button class="btn ghost" data-edit="${r.id}">Editar</button>${r.status === "pending" ? `<button class="btn ghost" data-done="${r.id}">Concluir</button>` : ""}</div>`,
        ]),
      )}${pager(page, count)}</section>`;
    const local = { ...ctx, refresh: draw };
    bind(root, "[data-action=new]", () => reminderForm(local));
    bind(root, "[data-edit]", (el) =>
      reminderForm(
        local,
        data.find((r) => r.id === el.dataset.edit),
      ),
    );
    bind(root, "[data-done]", (el) =>
      confirmAction(
        "Concluir lembrete?",
        "Marcar este cuidado como realizado.",
        async () => {
          await save("reminders", { status: "completed" }, el.dataset.done);
          toast("Lembrete concluído.");
          await draw();
        },
      ),
    );
    bind(root, "[data-page]", (el) => {
      page = Number(el.dataset.page);
      return draw();
    });
    root.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      ({ status, kind, priority, period } = Object.fromEntries(
        new FormData(e.target),
      ));
      page = 0;
      draw();
    };
  }
  await draw();
}
