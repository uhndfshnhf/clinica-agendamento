import { list, save } from "../data.js";
import {
  pageHead,
  button,
  esc,
  money,
  badge,
  table,
  pager,
  bind,
  confirmAction,
  toast,
} from "../ui.js";
import { procedureForm } from "../forms.js";
export async function render(root, ctx) {
  let page = 0,
    search = "",
    active = "";
  async function draw() {
    const { data, count } = await list("procedures", {
      page,
      search,
      active,
      order: "name",
      ascending: true,
    });
    root.innerHTML =
      pageHead(
        "PROTOCOLOS & CUIDADO",
        "Procedimentos",
        "Tratamentos com propósito, planejamento e identidade.",
        ctx.user.role === "admin" ? button("+ Novo procedimento", "new") : "",
      ) +
      `<section class="panel"><form class="toolbar"><label>Buscar <input type="search" name="search" value="${esc(search)}" placeholder="Nome do procedimento"></label><select aria-label="Filtrar status" name="active"><option value="">Todos os status</option><option value="true" ${active === "true" ? "selected" : ""}>Ativos</option><option value="false" ${active === "false" ? "selected" : ""}>Inativos</option></select><button class="btn">Filtrar</button></form>${table(
        [
          "Procedimento",
          "Categoria",
          "Duração",
          "Valor",
          "Status",
          ...(ctx.user.role === "admin" ? [""] : []),
        ],
        data.map((p) => [
          `<strong>${esc(p.name)}</strong><small>${esc(p.description.slice(0, 100))}</small>`,
          esc(p.category),
          `${p.duration} min`,
          money(p.price),
          badge(p.active ? "Ativo" : "Inativo"),
          ...(ctx.user.role === "admin"
            ? [
                `<div class="row-actions"><button class="btn ghost" data-edit="${p.id}">Editar</button>${p.active ? `<button class="btn ghost" data-disable="${p.id}">Desativar</button>` : ""}</div>`,
              ]
            : []),
        ]),
      )}${pager(page, count)}</section>`;
    const local = { ...ctx, refresh: draw };
    bind(root, "[data-action=new]", () => procedureForm(local));
    bind(root, "[data-edit]", (el) =>
      procedureForm(
        local,
        data.find((p) => p.id === el.dataset.edit),
      ),
    );
    bind(root, "[data-disable]", (el) =>
      confirmAction(
        "Desativar procedimento?",
        "O histórico será preservado. Novos agendamentos não poderão usar este procedimento.",
        async () => {
          await save("procedures", { active: false }, el.dataset.disable);
          toast("Procedimento desativado.");
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
      const f = new FormData(e.target);
      search = f.get("search");
      active = f.get("active");
      page = 0;
      draw();
    };
  }
  await draw();
}
