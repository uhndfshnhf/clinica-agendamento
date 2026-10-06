import { dataFor } from '../data.js';
import { result } from "../data.js";
import {
  pageHead,
  button,
  icon,
  esc,
  today,
  date,
  time,
  money,
  badge,
  empty,
  table,
  bind,
  toast,
  confirmAction,
} from "../ui.js";
import { appointmentForm } from "../forms.js";
import { appointmentTable } from "./agenda.js";
export async function render(root, ctx) {
 const {db,appointments}=dataFor(ctx.db);
  const day = today(),
    tomorrow = new Date(day + "T12:00:00Z");
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const now = new Date().toISOString();
  const [metrics, schedule, overdue, upcoming, returns, leads] =
    await Promise.all([
      result(db.rpc("dashboard")),
      appointments(
        day + "T00:00:00-03:00",
        tomorrow.toISOString().slice(0, 10) + "T00:00:00-03:00",
      ),
      result(
        db
          .from("reminders")
          .select("*,clients(name)")
          .eq("status", "pending")
          .lt("due_at", now)
          .order("due_at")
          .limit(3),
      ),
      result(
        db
          .from("reminders")
          .select("*,clients(name)")
          .eq("status", "pending")
          .gte("due_at", now)
          .order("due_at")
          .limit(3),
      ),
      result(
        db
          .from("reminders")
          .select("*,clients(name)")
          .eq("status", "pending")
          .eq("kind", "return")
          .order("due_at")
          .limit(3),
      ),
      ctx.user.role === "admin"
        ? result(
            db
              .from("leads")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(10),
          )
        : [],
    ]);
  const reminders = [...overdue, ...upcoming];
  const greeting = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const cards = [
    [
      "Agendamentos de hoje",
      metrics.today,
      "calendar",
      "Sua agenda, com atenção.",
    ],
    [
      "Clientes novos no mês",
      metrics.new_clients,
      "clients",
      "Novas histórias de cuidado.",
    ],
    [
      "Retornos pendentes",
      metrics.pending_returns,
      "bell",
      "Acompanhamento que faz diferença.",
    ],
    [
      "Procedimentos no mês",
      metrics.treatments,
      "procedures",
      "Atendimentos concluídos.",
    ],
    [
      "Faturamento estimado",
      money(metrics.revenue),
      "dashboard",
      "Valores dos atendimentos concluídos.",
    ],
    [
      "Taxa de retorno",
      metrics.return_rate + "%",
      "photos",
      "Clientes com mais de um atendimento.",
    ],
  ];
  const monthly = metrics.monthly || [];
  const max = Math.max(1, ...monthly.map((m) => m.total));
  root.innerHTML =
    pageHead(
      "VISÃO GERAL DA CLÍNICA",
      `Olá, ${ctx.user.name.split(" ")[0]}.`,
      "Um novo dia para cuidar de cada detalhe.",
      `<div class="greeting-date"><span class="date-label">${icon("calendar")}${esc(greeting)}</span>${button("+ Novo agendamento", "new")}</div>`,
    ) +
    `<div class="metrics">${cards.map(([l, v, i, n]) => `<article class="metric"><p class="metric-label">${l}${icon(i)}</p><div class="metric-value">${v}</div><p class="metric-note">${n}</p></article>`).join("")}</div><div class="dashboard-grid"><div><section class="panel"><div class="panel-head"><h2>Agenda de hoje</h2><a href="/admin/agenda" data-link>Ver agenda completa →</a></div>${schedule.length ? appointmentTable(schedule, false) : empty("Nenhum agendamento para hoje.", "Reserve um horário para um novo cuidado.")}</section><section class="panel"><div class="panel-head"><h2>O cuidado ao longo dos meses</h2><span class="muted">Últimos 6 meses</span></div><div class="panel-body"><div class="chart" role="img" aria-label="Atendimentos concluídos por mês: ${monthly.map((m) => `${m.month}: ${m.total}`).join(", ")}">${monthly.map((m) => `<div class="chart-column"><b>${m.total}</b><div class="bar" style="height:${Math.max(2, (m.total / max) * 115)}px"></div><span>${new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(m.month + "-15"))}</span></div>`).join("")}</div><p class="chart-caption">Cada atendimento é uma história acompanhada.</p></div></section></div><div><section class="panel"><div class="panel-head"><h2>Próximos retornos</h2><a href="/admin/lembretes" data-link>Ver todos →</a></div><div class="panel-body">${
      returns.map(reminderItem).join("") || empty("Nenhum retorno pendente.")
    }</div></section><section class="panel"><div class="panel-head"><h2>Procedimentos mais realizados</h2></div><div class="panel-body">${(metrics.popular || []).map((p, i) => `<div class="popular-row"><span>0${i + 1}</span><div>${esc(p.name)}<small><i style="width:${(p.total / Math.max(...metrics.popular.map((p) => p.total))) * 100}%"></i></small></div><b>${p.total}</b></div>`).join("") || empty("Ainda não há atendimentos.")}</div></section></div></div><section class="panel"><div class="panel-head"><h2>Lembretes · vencidos e próximos</h2><a href="/admin/lembretes" data-link>Organizar lembretes →</a></div><div class="panel-body">${reminders.map(reminderItem).join("") || empty("Tudo em dia.")}</div></section>${
      ctx.user.role === "admin"
        ? `<section class="panel"><div class="panel-head"><h2>Novos contatos do site</h2><span class="muted">10 contatos mais recentes</span></div>${table(
            ["Contato", "Interesse", "Recebido", "Status", ""],
            leads.map((l) => [
              `<strong>${esc(l.name)}</strong><small><a href="https://wa.me/${l.whatsapp}" target="_blank" rel="noopener">${esc(l.whatsapp)}</a></small>`,
              esc(l.procedure_name),
              date(l.created_at),
              `<select class="lead-status" aria-label="Status de ${esc(l.name)}" data-status="${l.id}" ${l.client_id ? "disabled" : ""}>${[
                "new",
                "contacted",
                "converted",
                "discarded",
              ]
                .filter((s) => s !== "converted" || l.status === "converted")
                .map(
                  (s) =>
                    `<option value="${s}" ${l.status === s ? "selected" : ""}>${{ new: "Novo", contacted: "Contatado", converted: "Convertido", discarded: "Descartado" }[s]}</option>`,
                )
                .join("")}</select>`,
              l.client_id
                ? `<a class="small-link" href="/admin/clientes/${l.client_id}" data-link>Ver ficha →</a>`
                : `<button class="btn ghost" data-convert="${l.id}">Converter em cliente</button>`,
            ]),
          )}</section>`
        : ""
    }`;
  bind(root, "[data-action=new]", () => appointmentForm(ctx));
  bind(root, "[data-convert]", (el) =>
    confirmAction(
      "Converter contato em cliente?",
      "Uma nova ficha será criada com os dados deste contato.",
      async () => {
        const id = await result(
          db.rpc("convert_lead", { lead: el.dataset.convert }),
        );
        toast("Cliente criado a partir do site.");
        ctx.go("/admin/clientes/" + id);
      },
    ),
  );
  root.querySelectorAll("[data-status]").forEach(
    (el) =>
      (el.onchange = async () => {
        const previous = leads.find((l) => l.id === el.dataset.status).status;
        try {
          await result(
            db
              .from("leads")
              .update({ status: el.value })
              .eq("id", el.dataset.status),
          );
          toast("Status do contato atualizado.");
        } catch (e) {
          el.value = previous;
          toast(e.message, true);
        }
      }),
  );
}
function reminderItem(r) {
  return `<div class="reminder-item"><span class="reminder-icon">${icon("bell")}</span><div><h3>${esc(r.title)}</h3><p><a href="/admin/clientes/${r.client_id}" data-link>${esc(r.clients?.name)}</a></p></div><time>${new Date(r.due_at) < new Date() ? "Vencido · " : ""}${date(r.due_at)}<br>${time(r.due_at)}</time></div>`;
}
