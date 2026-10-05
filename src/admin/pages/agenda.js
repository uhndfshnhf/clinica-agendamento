import { appointments } from "../data.js";
import {
  pageHead,
  button,
  table,
  esc,
  date,
  time,
  badge,
  bind,
  today,
  icon,
} from "../ui.js";
import { appointmentForm, treatmentForm } from "../forms.js";
export function appointmentTable(rows, actions = true) {
  return table(
    [
      "Horário",
      "Cliente",
      "Procedimento",
      "Profissional",
      "Status",
      ...(actions ? [""] : []),
    ],
    rows.map((a) => [
      `${time(a.starts_at)}<small>${date(a.starts_at)}</small>`,
      `<a href="/admin/clientes/${a.client_id}" data-link><strong>${esc(a.clients?.name || "Cliente")}</strong></a>`,
      esc(a.procedures?.name),
      esc(a.professionals?.name),
      badge(a.status),
      ...(actions
        ? [
            a.status === "completed"
              ? ""
              : `<div class="row-actions"><button class="btn ghost" data-edit="${a.id}">Editar</button>${!["cancelled", "no_show"].includes(a.status) ? `<button class="btn ghost" data-complete="${a.id}">Concluir</button>` : ""}</div>`,
          ]
        : []),
    ]),
  );
}
export function bindAppointments(root, rows, ctx) {
  bind(root, "[data-edit]", (el) =>
    appointmentForm(
      ctx,
      rows.find((r) => r.id === el.dataset.edit),
    ),
  );
  bind(root, "[data-complete]", (el) =>
    treatmentForm(
      ctx,
      rows.find((r) => r.id === el.dataset.complete),
    ),
  );
}
export async function render(root, ctx) {
  let view = "day",
    chosen = today();
  async function draw() {
    const base = new Date(chosen + "T12:00:00-03:00");
    let start = new Date(base),
      end = new Date(base);
    if (view === "week")
      start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    if (view === "month") start.setUTCDate(1);
    end = new Date(start);
    if (view === "month") end.setUTCMonth(end.getUTCMonth() + 1);
    else end.setUTCDate(end.getUTCDate() + (view === "week" ? 7 : 1));
    const day = (d) => d.toISOString().slice(0, 10);
    const rows = await appointments(
      day(start) + "T00:00:00-03:00",
      day(end) + "T00:00:00-03:00",
    );
    root.innerHTML =
      pageHead(
        "ORGANIZAÇÃO COM LEVEZA",
        "Agenda",
        "Tempo reservado para cuidar. Horários de Brasília.",
        button("+ Novo agendamento", "new"),
      ) +
      `<section class="panel"><div class="toolbar"><button class="icon-btn" data-shift="-1" aria-label="Período anterior">${icon("chevron")}</button><label>Data <input aria-label="Data da agenda" type="date" value="${chosen}"></label><button class="icon-btn" data-shift="1" aria-label="Próximo período">${icon("arrow")}</button><button class="btn ghost" data-today>Hoje</button><span class="spacer"></span><div class="segmented">${[
        ["day", "Dia"],
        ["week", "Semana"],
        ["month", "Mês"],
      ]
        .map(
          ([v, l]) =>
            `<button data-view="${v}" class="${view === v ? "active" : ""}">${l}</button>`,
        )
        .join(
          "",
        )}</div></div>${view === "day" ? appointmentTable(rows) : calendar(rows, start, end, view)}</section>`;
    bind(root, "[data-action=new]", () =>
      appointmentForm({ ...ctx, refresh: draw }),
    );
    bindAppointments(root, rows, { ...ctx, refresh: draw });
    bind(root, "[data-view]", (el) => {
      view = el.dataset.view;
      return draw();
    });
    bind(root, "[data-shift]", (el) => {
      const d = new Date(chosen + "T12:00:00Z");
      if (view === "month") {
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() + Number(el.dataset.shift));
      } else
        d.setUTCDate(
          d.getUTCDate() + Number(el.dataset.shift) * (view === "week" ? 7 : 1),
        );
      chosen = day(d);
      return draw();
    });
    bind(root, "[data-today]", () => {
      chosen = today();
      return draw();
    });
    root.querySelector("[type=date]").onchange = (e) => {
      if (e.target.value) {
        chosen = e.target.value;
        draw().catch(ctx.onError || console.error);
      }
    };
    bind(root, "[data-event]", (el) => {
      chosen = rows.find((r) => r.id === el.dataset.event).starts_at
        ? new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
          }).format(
            new Date(rows.find((r) => r.id === el.dataset.event).starts_at),
          )
        : today();
      view = "day";
      return draw();
    });
  }
  await draw();
}
function calendar(rows, start, end, view) {
  let cells = "";
  if (view === "month")
    cells = '<div class="calendar-day"></div>'.repeat(
      (start.getUTCDay() + 6) % 7,
    );
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const events = rows.filter(
      (a) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
        }).format(new Date(a.starts_at)) === key,
    );
    cells += `<div class="calendar-day ${key === today() ? "today" : ""}"><strong>${d.getUTCDate()}</strong>${events.map((a) => `<button class="event" data-event="${a.id}">${time(a.starts_at)} · ${esc(a.clients?.name)}<small>${esc(a.procedures?.name)} · ${esc(a.professionals?.name)} · ${esc(a.duration)} min</small><small>${badge(a.status)}</small></button>`).join("")}</div>`;
  }
  return `<div class="calendar-wrapper"><div class="calendar-grid">${["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => `<div class="calendar-day-name">${d}</div>`).join("")}${cells}</div></div>`;
}
