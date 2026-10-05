import { db, result, list, appointmentSelect, save } from "../data.js";
import {
  pageHead,
  button,
  table,
  pager,
  esc,
  date,
  time,
  badge,
  bind,
  field,
  modal,
  toast,
  empty,
} from "../ui.js";
import { clientForm, appointmentForm } from "../forms.js";
import { appointmentTable, bindAppointments } from "./agenda.js";
export async function render(root, ctx) {
  if (ctx.id) return detail(root, ctx);
  let page = 0,
    search = "",
    active = "";
  async function draw() {
    const { data, count } = await list("client_overview", {
      page,
      search,
      active,
      order: "name",
      ascending: true,
    });
    root.innerHTML =
      pageHead(
        "PESSOAS & HISTÓRIAS",
        "Clientes",
        "Cada ficha, uma história. Cada detalhe, um cuidado.",
        button("+ Novo cliente", "new"),
      ) +
      `<section class="panel"><form class="toolbar"><label>Buscar <input type="search" name="search" placeholder="Nome do cliente" value="${esc(search)}"></label><select name="active" aria-label="Status do cliente"><option value="">Todos os status</option><option value="true" ${active === "true" ? "selected" : ""}>Ativos</option><option value="false" ${active === "false" ? "selected" : ""}>Inativos</option></select><button class="btn">Filtrar</button></form>${table(
        [
          "Cliente",
          "Contatos",
          "Nascimento",
          "Último atendimento",
          "Próximo atendimento",
          "Status",
        ],
        data.map((c) => {
          const next = c.next_appointment;
          return [
            `<a class="person-link" href="/admin/clientes/${c.id}" data-link><span class="avatar">${esc(
              c.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join(""),
            )}</span><strong>${esc(c.name)}</strong></a>`,
            `<a href="https://wa.me/${c.whatsapp}" target="_blank" rel="noopener">WhatsApp · ${esc(c.whatsapp)}</a><small>Tel. ${esc(c.phone || "—")}<br>${esc(c.email || "—")}</small>`,
            date(c.birth_date),
            date(c.last_appointment),
            next ? `${date(next)}<small>${time(next)}</small>` : "—",
            badge(c.active ? "Ativo" : "Inativo"),
          ];
        }),
      )}${pager(page, count)}</section>`;
    bind(root, "[data-action=new]", () =>
      clientForm({ ...ctx, refresh: draw }),
    );
    bind(root, "[data-page]", (el) => {
      page = Number(el.dataset.page);
      return draw();
    });
    root.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      search = f.get("search");
      active = f.get("active");
      page = 0;
      draw();
    };
  }
  await draw();
}
async function detail(root, ctx) {
  let tab = "overview",
    release = null;
  async function draw() {
    release?.();
    const client = await result(
      db.from("clients").select("*").eq("id", ctx.id).single(),
    );
    const [appointments, history, reminders] = await Promise.all([
      result(
        db
          .from("appointments")
          .select(appointmentSelect)
          .eq("client_id", ctx.id)
          .order("starts_at", { ascending: false }),
      ),
      result(
        db
          .from("treatments")
          .select("*,procedures(name),professionals(name)")
          .eq("client_id", ctx.id)
          .order("occurred_at", { ascending: false }),
      ),
      result(
        db
          .from("reminders")
          .select("*")
          .eq("client_id", ctx.id)
          .eq("status", "pending")
          .order("due_at"),
      ),
    ]);
    const local = { ...ctx, refresh: draw };
    const next = appointments.filter(
      (a) =>
        new Date(a.starts_at) > new Date() &&
        !["cancelled", "no_show"].includes(a.status),
    );
    root.innerHTML = `<a class="small-link" data-link href="/admin/clientes">← Todos os clientes</a><header class="page-heading" style="margin-top:25px"><div class="profile-header"><span class="avatar">${esc(
      client.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join(""),
    )}</span><div><p class="eyebrow">FICHA DO CLIENTE</p><h1>${esc(client.name)}</h1><p class="muted">Cliente desde ${date(client.created_at)} · ${client.active ? "Ativo" : "Inativo"}</p></div></div>${button("Editar ficha", "edit", "ghost")}${ctx.user.role==="admin"?button("Vincular conta do cliente","account","ghost"):""}</header><div class="inline-actions">${button("+ Agendar atendimento", "appointment")}${button("+ Adicionar evolução", "photo", "secondary")}</div><nav class="tabs" aria-label="Abas da ficha">${[
      ["overview", "Visão geral"],
      ["history", "Histórico"],
      ["evolution", "Evolução"],
      ["appointments", "Agendamentos"],
      ["notes", "Observações"],
    ]
      .map(
        ([k, l]) =>
          `<button data-tab="${k}" class="${tab === k ? "active" : ""}">${l}</button>`,
      )
      .join("")}</nav><div id="client-tab"></div>`;
    const content = root.querySelector("#client-tab");
    if (tab === "overview")
      content.innerHTML = `<section class="panel"><dl class="profile-details">${[
        ["Telefone", client.phone],
        ["WhatsApp", client.whatsapp],
        ["E-mail", client.email],
        ["Nascimento", date(client.birth_date)],
        ["CPF", client.cpf || "Não informado"],
        ["Atendimentos realizados", history.length],
      ]
        .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v || "—")}</dd></div>`)
        .join(
          "",
        )}</dl></section><section class="panel"><div class="panel-head"><h2>Próximos agendamentos</h2></div>${appointmentTable(next, false)}</section><section class="panel"><div class="panel-head"><h2>Lembretes</h2></div><div class="panel-body">${reminders.length ? reminders.map((r) => `<div class="reminder-item"><div><h3>${esc(r.title)}</h3><p>${date(r.due_at)} · ${time(r.due_at)}</p></div>${badge(r.priority)}</div>`).join("") : empty("Nenhum lembrete pendente.")}</div></section>`;
    if (tab === "history")
      content.innerHTML = `<section class="panel"><div class="panel-head"><h2>Histórico de atendimentos</h2></div>${history.length ? `<div class="timeline">${history.map((t) => `<article><small>${date(t.occurred_at)} · ${esc(t.professionals?.name)}</small><h3>${esc(t.procedures?.name)}</h3><p>${esc(t.notes)}</p><p><strong>Resultado esperado</strong><br>${esc(t.expected_result || "—")}</p><p><strong>Recomendações</strong><br>${esc(t.recommendations || "—")}</p>${t.return_date ? `<p>Retorno recomendado: ${date(t.return_date)}</p>` : ""}</article>`).join("")}</div>` : empty("Nenhum atendimento registrado.")}</section>`;
    if (tab === "appointments") {
      content.innerHTML = `<section class="panel">${appointmentTable(appointments)}</section>`;
      bindAppointments(content, appointments, local);
    }
    if (tab === "notes") {
      content.innerHTML = `<section class="panel"><div class="panel-head"><h2>Observações de cuidado</h2>${button("Editar observações", "notes", "ghost")}</div><div class="panel-body note-text">${esc(client.notes) || "Nenhuma observação registrada."}</div></section>`;
      bind(content, "[data-action=notes]", () =>
        modal(
          "Observações",
          field("notes", "Observações do cliente", "textarea", client.notes, {
            wide: true,
            maxLength: 10000,
          }),
          async (v) => {
            await save("clients", v, client.id);
            toast("Observações salvas.");
            await draw();
          },
        ),
      );
    }
    if (tab === "evolution") {
      const m = await import("./evolution.js");
      release = await m.photoTimeline(content, local, client.id);
    }
    bind(root, "[data-tab]", (el) => {
      tab = el.dataset.tab;
      return draw();
    });
    bind(root,"[data-action=account]",()=>modal("Vincular acesso privado",field("email","E-mail confirmado do cliente","email",client.email||"",{required:true,wide:true})+'<p class="wide muted">Verifique a identidade do cliente antes de vincular. Esta conta terá acesso aos agendamentos e às fotos liberadas desta ficha. A conta precisa ter o e-mail confirmado.</p>',async v=>{await result(db.rpc("link_customer_account",{client:client.id,email_address:v.email}));toast("Conta vinculada à ficha do cliente.");}));
    bind(root, "[data-action=edit]", () => clientForm(local, client));
    bind(root, "[data-action=appointment]", () =>
      appointmentForm(local, {}, client.id),
    );
    bind(root, "[data-action=photo]", async () => {
      const m = await import("./evolution.js");
      return m.photoForm(local, client.id);
    });
  }
  await draw();
  return () => release?.();
}
