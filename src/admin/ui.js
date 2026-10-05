import {isPublicMediaUrl} from "../shared/media-validation.js";
export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const money = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v || 0),
  );
export const date = (v) =>
  v
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(v.length === 10 ? v + "T12:00:00-03:00" : v))
    : "—";
export const time = (v) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(v));
export const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
export const localInput = (v) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(v))
    .replace(" ", "T");
export const toISO = (v) =>
  new Date(v.length === 16 ? v + ":00-03:00" : v).toISOString();
export const labels = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
  pending: "Pendente",
  approved:"Aprovado",
  rejected:"Recusado",
  new: "Novo",
  contacted: "Contatado",
  converted: "Convertido",
  discarded: "Descartado",
  before: "Antes",
  after: "Depois",
  progress: "Evolução",
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  return: "Retorno do cliente",
  session: "Próxima sessão",
  evaluation: "Avaliação",
  follow_up: "Follow-up",
  contact: "Contato",
  other: "Outro",
};
export const badge = (v) =>
  `<span class="badge ${esc(v)}">${esc(labels[v] || v)}</span>`;
export function icon(name) {
  const paths = {
    dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    calendar: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16",
    clients:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M18 8a3 3 0 0 1 0 6 M22 21v-2a4 4 0 0 0-3-4",
    photos: "M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M16 7h.01",
    procedures: "M12 3v18 M3 12h18 M5 5l14 14 M5 19L19 5",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
    team: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2 M18 5v6 M15 8h6",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    plus: "M12 5v14 M5 12h14",
    menu: "M4 6h16 M4 12h16 M4 18h16",
    logout: "M9 4H4v16h5 M10 12h11 M17 8l4 4-4 4",
    search: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14 M15 15l6 6",
    chevron: "M14 6l-6 6 6 6",
    check: "M4 12l5 5L20 6",
    close: "M6 6l12 12 M18 6L6 18",
  };
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.procedures}"/></svg>`;
}
export const button = (text, action, cls = "primary") =>
  `<button class="btn ${cls}" data-action="${action}">${esc(text)}</button>`;
export const pageHead = (eyebrow, title, description, action = "") =>
  `<header class="page-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="muted">${esc(description)}</p></div>${action}</header>`;
export const empty = (title, detail = "Os novos registros aparecerão aqui.") =>
  `<div class="empty">${icon("procedures")}<h3>${esc(title)}</h3><p>${esc(detail)}</p></div>`;
export function table(headers, rows) {
  return rows.length
    ? `<div class="table-scroll"><table><thead><tr>${headers.map((x) => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
    : empty("Nenhum registro encontrado.");
}
export const pager = (page, count, size = 20) =>
  `<div class="pagination"><span>${count} registro${count === 1 ? "" : "s"} · página ${page + 1} de ${Math.max(1, Math.ceil(count / size))}</span><button class="btn ghost" data-page="${page - 1}" ${page === 0 ? "disabled" : ""}>Anterior</button><button class="btn ghost" data-page="${page + 1}" ${(page + 1) * size >= count ? "disabled" : ""}>Próxima</button></div>`;
export function toast(message, error = false) {
  const el = document.createElement("div");
  el.className = "toast" + (error ? " error" : "");
  el.textContent = message;
  document.querySelector("#toasts").append(el);
  setTimeout(() => el.remove(), 6000);
}
export function errorText(e) {
  if (e?.code === "23P01")
    return "Este horário já está ocupado para o profissional. Escolha outro horário.";
  if (e?.code === "23505") return "Este registro já existe.";
  if (e?.code === "42501") return "Você não tem permissão para esta ação.";
  if (e?.message === "Invalid login credentials")
    return "E-mail ou senha incorretos.";
  return (
    e?.issues?.[0]?.message ||
    e?.message ||
    "Não foi possível concluir. Tente novamente."
  );
}
export function field(name, label, type = "text", value = "", options = {}) {
  const attrs = `name="${name}" id="f-${name}" ${options.required ? "required" : ""} ${options.maxLength ? `maxlength="${options.maxLength}"` : ""} ${options.min !== undefined ? `min="${options.min}"` : ""} ${options.max !== undefined ? `max="${options.max}"` : ""} ${options.step ? `step="${options.step}"` : ""}`;
  return `<label class="field ${options.wide ? "wide" : ""}" for="f-${name}"><span>${esc(label)}${options.required ? " *" : ""}</span>${type === "textarea" ? `<textarea ${attrs} rows="3">${esc(value)}</textarea>` : type === "select" ? `<select ${attrs}>${(options.choices || []).map((o) => `<option value="${esc(o[0])}" ${String(o[0]) === String(value) ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>` : `<input ${attrs} type="${type}" value="${esc(value)}" ${type === "password" ? 'autocomplete="new-password"' : ""}>`}${options.hint ? `<small>${esc(options.hint)}</small>` : ""}</label>`;
}
export function modal(title, body, onSubmit, submit = "Salvar") {
  const d = document.createElement("dialog");
  d.className = "modal";
  d.innerHTML = `<form><header><div><p class="eyebrow">QUARTIER · CUIDADO EM CADA DETALHE</p><h2>${esc(title)}</h2></div><button type="button" class="icon-btn" aria-label="Fechar">${icon("close")}</button></header><div class="form-grid">${body}</div><p class="form-error" role="alert"></p><footer><button type="button" class="btn ghost" data-cancel>Cancelar</button><button class="btn primary" type="submit">${esc(submit)}</button></footer></form>`;
  document.body.append(d);
  d.showModal();
  d.querySelector("header button").onclick = () => d.close();
  d.querySelector("[data-cancel]").onclick = () => d.close();
  d.addEventListener("close", () => d.remove());
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const b = d.querySelector("[type=submit]");
    b.disabled = true;
    d.querySelector(".form-error").textContent = "";
    try {
      await onSubmit(Object.fromEntries(new FormData(e.target)), e.target);
      d.close();
    } catch (err) {
      d.querySelector(".form-error").textContent = errorText(err);
    } finally {
      b.disabled = false;
    }
  };
  return d;
}
export async function confirmAction(title, detail, onConfirm) {
  return modal(
    title,
    `<p class="wide">${esc(detail)}</p>`,
    onConfirm,
    "Confirmar",
  );
}
export function bind(root, selector, fn) {
  root
    .querySelectorAll(selector)
    .forEach(
      (el) =>
        (el.onclick = () =>
          Promise.resolve(fn(el)).catch((e) => toast(errorText(e), true))),
    );
}
export const choice = (rows) => [
  ["", "Selecione…"],
  ...rows.map((r) => [r.id, r.name]),
];
export function safeImage(url) {
  return isPublicMediaUrl(url,{allowLocal:import.meta.env?.DEV===true}) ? esc(url) : "";
}
