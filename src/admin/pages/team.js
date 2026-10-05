import { db, result, list } from "../data.js";
import {
  pageHead,
  button,
  field,
  modal,
  toast,
  table,
  esc,
  badge,
  pager,
  bind,
  safeImage,
  confirmAction,
} from "../ui.js";
async function professionalForm(ctx, item = {}) {
  return modal(
    item.id ? "Editar profissional" : "Novo profissional",
    field("name", "Nome completo", "text", item.name, {
      required: true,
      wide: true,
      maxLength: 160,
    }) +
      field("email", "E-mail de acesso", "email", item.email, {
        required: true,
      }) +
      field("phone", "Telefone", "tel", item.phone) +
      field("specialty", "Especialidade", "text", item.specialty) +
      field(
        "registration",
        "Registro profissional",
        "text",
        item.registration,
      ) +
      field(
        "photo_url",
        "Foto (URL HTTPS ou /assets/...)",
        "text",
        item.photo_url,
        { wide: true, hint: "Use apenas uma foto profissional autorizada." },
      ) +
      field("role", "Função", "select", item.role || "professional", {
        choices: [
          ["professional", "Profissional"],
          ["admin", "Administrador"],
        ],
      }) +
      field("active", "Status", "select", item.active ?? true, {
        choices: [
          [true, "Ativo"],
          [false, "Inativo"],
        ],
      }) +
      `<p class="wide muted">O acesso fica vinculado ao e-mail da conta. Para uma nova pessoa, salve a ficha e envie um convite privado.</p>`,
    async (v) => {
      if (v.photo_url && !safeImage(v.photo_url))
        throw Error("Use uma URL HTTPS ou caminho local para a foto.");
      const { role, ...details } = v;
      await result(
        db.rpc("save_professional", {
          professional: item.id || null,
          details: { ...details, active: v.active === "true" },
          access_role: role,
        }),
      );
      toast("Profissional salvo.");
      ctx.refresh();
    },
  );
}
export async function render(root, ctx) {
  let page = 0,
    search = "";
  async function draw() {
    const { data, count } = await list("professionals", {
      page,
      search,
      order: "name",
      ascending: true,
    });
    const users = await result(db.from("users").select("id,role"));
    data.forEach(
      (p) =>
        (p.role =
          users.find((u) => u.id === p.user_id)?.role || "professional"),
    );
    root.innerHTML =
      pageHead(
        "TÉCNICA, ESCUTA & SENSIBILIDADE",
        "Equipe",
        "Pessoas que compartilham o mesmo cuidado.",
        button("+ Novo profissional", "new"),
      ) +
      `<section class="panel"><form class="toolbar"><label>Buscar <input type="search" name="search" placeholder="Nome do profissional" value="${esc(search)}"></label><button class="btn">Buscar</button></form>${table(
        ["Profissional", "Contato", "Registro", "Função", "Status", ""],
        data.map((p) => [
          `<div class="person-link">${p.photo_url ? `<img class="team-card-photo" src="${safeImage(p.photo_url)}" alt="${esc(p.name)}">` : ""}<span><strong>${esc(p.name)}</strong><small>${esc(p.specialty)}</small></span></div>`,
          `${esc(p.email)}<small>${esc(p.phone)}</small>`,
          esc(p.registration || "—"),
          p.user_id
            ? p.role === "admin"
              ? "Administrador"
              : "Profissional"
            : "Convite pendente",
          badge(p.active ? "Ativo" : "Inativo"),
          `<div class="row-actions"><button class="btn ghost" data-edit="${p.id}">Editar</button>${!p.user_id ? `<button class="btn ghost" data-invite="${p.id}">Convidar</button>` : ""}</div>`,
        ]),
      )}${pager(page, count)}</section>`;
    bind(root, "[data-action=new]", () =>
      professionalForm({ ...ctx, refresh: draw }),
    );
    bind(root, "[data-edit]", (el) =>
      professionalForm(
        { ...ctx, refresh: draw },
        data.find((p) => p.id === el.dataset.edit),
      ),
    );
    bind(root, "[data-invite]", (el) => {
      const p = data.find((p) => p.id === el.dataset.invite);
      return modal(
        "Enviar convite privado",
        `<p class="wide">O convite será enviado para ${esc(p.email)}.</p>` +
          field("role", "Permissão de acesso", "select", "professional", {
            choices: [
              ["professional", "Profissional"],
              ["admin", "Administrador"],
            ],
          }),
        async (v) => {
          const { data: response, error } = await db.functions.invoke(
            "invite-team",
            {
              body: {
                professional_id: p.id,
                role: v.role,
                redirect_to: location.origin + "/admin/login",
              },
            },
          );
          if (error)
            throw Error(
              "Não foi possível enviar o convite. Verifique a função invite-team e o serviço de e-mail do Supabase.",
            );
          if (response?.error) throw Error(response.error);
          toast("Convite enviado.");
          await draw();
        },
        "Enviar convite",
      );
    });
    bind(root, "[data-page]", (el) => {
      page = Number(el.dataset.page);
      return draw();
    });
    root.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      search = new FormData(e.target).get("search");
      page = 0;
      draw();
    };
  }
  await draw();
}
