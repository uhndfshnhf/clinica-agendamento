import { db, result, options, save } from "../data.js";
import {
  pageHead,
  button,
  field,
  choice,
  modal,
  toast,
  labels,
  esc,
  date,
  bind,
  today,
  empty,
  badge,
  confirmAction,
  pager,
} from "../ui.js";
async function optimize(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Selecione uma foto JPEG, PNG ou WebP.");
  if (file.size > 10 * 1024 * 1024) throw Error("A foto deve ter até 10 MB.");
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  if (bitmap.width * bitmap.height > 50000000) {
    bitmap.close();
    throw Error("A imagem deve ter até 50 megapixels.");
  }
  const factor = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * factor);
  canvas.height = Math.round(bitmap.height * factor);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(Error("Não foi possível processar a imagem.")),
      "image/webp",
      0.86,
    ),
  );
}
export async function photoForm(ctx, presetClient) {
  const o = await options();
  const treatments = await result(
    db
      .from("treatments")
      .select("id,client_id,procedure_id,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(1000),
  );
  const d = modal(
    "Adicionar evolução",
    field("client_id", "Cliente", "select", presetClient, {
      required: true,
      choices: choice(o.clients),
    }) +
      field("procedure_id", "Procedimento", "select", "", {
        required: true,
        choices: choice(o.procedures),
      }) +
      field("treatment_id", "Atendimento (opcional)", "select", "", {
        choices: [["", "Sem atendimento vinculado"]],
      }) +
      field("taken_on", "Data da foto", "date", today(), {
        required: true,
        max: today(),
      }) +
      field("category", "Categoria", "select", "progress", {
        choices: ["before", "after", "progress"].map((v) => [v, labels[v]]),
      }) +
      `<label class="field"><span>Foto privada *</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required><small>Até 10 MB. A imagem será otimizada e os metadados removidos.</small></label>` +
      field("notes", "Observação", "textarea", "", {
        wide: true,
        maxLength: 3000,
      }),
    async (v, form) => {
      const blob = await optimize(form.photo.files[0]);
      const id = crypto.randomUUID();
      const path = `${v.client_id}/${id}.webp`;
      await result(
        db.storage
          .from("evolution")
          .upload(path, blob, { contentType: "image/webp", upsert: false }),
      );
      try {
        await save("evolution_photos", {
          id,
          client_id: v.client_id,
          procedure_id: v.procedure_id,
          treatment_id: v.treatment_id || null,
          taken_on: v.taken_on,
          category: v.category,
          notes: v.notes,
          object_path: path,
        });
      } catch (e) {
        await db.storage.from("evolution").remove([path]);
        throw e;
      }
      toast("Foto adicionada à evolução privada.");
      ctx.refresh();
    },
    "Salvar foto",
  );
  const update = () => {
    const c = d.querySelector("[name=client_id]").value,
      p = d.querySelector("[name=procedure_id]").value;
    d.querySelector("[name=treatment_id]").innerHTML =
      `<option value="">Sem atendimento vinculado</option>` +
      treatments
        .filter((t) => t.client_id === c && t.procedure_id === p)
        .map((t) => `<option value="${t.id}">${date(t.occurred_at)}</option>`)
        .join("");
  };
  d.querySelector("[name=client_id]").onchange = update;
  d.querySelector("[name=procedure_id]").onchange = update;
  return d;
}
export async function photoTimeline(root, ctx, clientId, filters = {}) {
  let q = db
    .from("evolution_photos")
    .select("*,clients(name),procedures(name)", { count: "exact" })
    .order("taken_on", { ascending: false })
    .order("id")
    .range((filters.page || 0) * 18, (filters.page || 0) * 18 + 17);
  if (clientId) q = q.eq("client_id", clientId);
  if (filters.category) q = q.eq("category", filters.category);
  const { data: photos, count, error } = await q;
  if (error) throw error;
  const urls = [];
  let disposed = false,
    nextCleanup = null;
  root.innerHTML = photos.length
    ? `<section class="panel"><div class="panel-head"><h2>Linha do tempo</h2><span class="muted">Fotos privadas · acesso autenticado</span></div><div id="compare-container"></div><div class="photo-grid">${photos.map((p) => `<article class="photo-card"><img data-photo="${p.id}" alt="${esc(labels[p.category])} — ${esc(p.procedures?.name)}" loading="lazy">${badge(p.category)}<h3>${esc(p.clients?.name)}</h3><p>${esc(p.procedures?.name)} · ${date(p.taken_on)}</p><p>${esc(p.notes)}</p>${ctx.user.role === "admin" ? `<button class="btn ghost" data-delete="${p.id}">Excluir foto</button><button class="btn ghost" data-customer="${p.id}">${p.customer_visible?"Ocultar do cliente":"Liberar para o cliente"}</button>` : ""}</article>`).join("")}</div>${pager(filters.page || 0, count, 18)}</section>`
    : empty(
        "Nenhuma foto de evolução.",
        "Adicione fotos autorizadas para acompanhar o cuidado.",
      );
  await Promise.all(
    photos.map(async (p) => {
      const blob = await result(
        db.storage.from("evolution").download(p.object_path),
      );
      if (disposed) return;
      const url = URL.createObjectURL(blob);
      urls.push(url);
      p.url = url;
      const img = root.querySelector(`[data-photo="${p.id}"]`);
      if (img) img.src = url;
    }),
  );
  const pairs = photos
    .filter((p) => p.category === "before")
    .flatMap((before) =>
      photos
        .filter(
          (after) =>
            after.category === "after" &&
            after.client_id === before.client_id &&
            after.procedure_id === before.procedure_id &&
            after.taken_on >= before.taken_on,
        )
        .map((after) => ({ before, after })),
    );
  if (pairs.length) {
    const target = root.querySelector("#compare-container");
    const show = (pair) => {
      target.innerHTML = `<div class="panel-head"><h2>Antes & depois</h2><select aria-label="Escolher comparação">${pairs.map((p, i) => `<option value="${i}">${esc(p.before.clients?.name)} · ${esc(p.before.procedures?.name)} · ${date(p.before.taken_on)} / ${date(p.after.taken_on)}</option>`).join("")}</select></div><div class="comparison-labels"><span>Antes · ${date(pair.before.taken_on)}</span><span>Depois · ${date(pair.after.taken_on)}</span></div><div class="comparison"><img src="${pair.before.url}" alt="Antes"><img class="after" src="${pair.after.url}" alt="Depois"><div class="divider"></div></div><input class="compare-range" type="range" min="0" max="100" value="50" aria-label="Comparar antes e depois"><p class="muted" style="padding:0 24px">Mesmo cliente e procedimento. Compare somente fotos com enquadramento compatível.</p>`;
      target.querySelector("select").value = String(pairs.indexOf(pair));
      target.querySelector("select").onchange = (e) =>
        show(pairs[Number(e.target.value)]);
      target.querySelector("input").oninput = (e) =>
        target
          .querySelector(".comparison")
          .style.setProperty("--split", e.target.value + "%");
    };
    show(pairs[0]);
  }
  bind(root,"[data-customer]",el=>{
    const p=photos.find(p=>p.id===el.dataset.customer);
    return confirmAction(p.customer_visible?"Ocultar da área do cliente?":"Liberar para a área privada do cliente?","Esta ação não publica a foto no site. Somente o cliente vinculado à ficha poderá vê-la.",async()=>{await result(db.rpc("set_customer_photo_visibility",{photo:p.id,visible:!p.customer_visible}));toast("Acesso do cliente atualizado.");ctx.refresh();});
  });
  bind(root, "[data-delete]", (el) => {
    const p = photos.find((p) => p.id === el.dataset.delete);
    return confirmAction(
      "Excluir esta foto?",
      "A foto será removida permanentemente do armazenamento e da ficha.",
      async () => {
        await result(db.storage.from("evolution").remove([p.object_path]));
        await result(db.from("evolution_photos").delete().eq("id", p.id));
        toast("Foto excluída.");
        ctx.refresh();
      },
    );
  });
  if (filters.onPage)
    bind(root, "[data-page]", (el) => filters.onPage(Number(el.dataset.page)));
  else
    root.querySelectorAll("[data-page]").forEach(
      (el) =>
        (el.onclick = () => {
          photoTimeline(root, ctx, clientId, {
            ...filters,
            page: Number(el.dataset.page),
          }).then((fn) => {
            urls.forEach(URL.revokeObjectURL);
            nextCleanup = fn;
          });
        }),
    );
  return () => {
    disposed = true;
    urls.forEach(URL.revokeObjectURL);
    nextCleanup?.();
  };
}
export async function render(root, ctx) {
  let client = "",
    category = "",
    page = 0,
    release = null;
  const clients = await result(
    db.from("clients").select("id,name").order("name").limit(1000),
  );
  async function draw() {
    release?.();
    root.innerHTML =
      pageHead(
        "ACOMPANHAR É CUIDAR",
        "Evolução",
        "Histórias de cuidado, registradas com privacidade.",
        button("+ Adicionar evolução", "new"),
      ) +
      `<form class="toolbar">${field("client", "Cliente", "select", client, { choices: [["", "Todos os clientes"], ...clients.map((c) => [c.id, c.name])] })}${field("category", "Categoria", "select", category, { choices: [["", "Todas"], ...["before", "after", "progress"].map((c) => [c, labels[c]])] })}<button class="btn">Filtrar</button></form><div id="photos"></div>`;
    const local = { ...ctx, refresh: draw };
    bind(root, "[data-action=new]", () => photoForm(local, client));
    root.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      ({ client, category } = Object.fromEntries(new FormData(e.target)));
      page = 0;
      draw();
    };
    release = await photoTimeline(
      root.querySelector("#photos"),
      local,
      client,
      {
        category,
        page,
        onPage: (p) => {
          page = p;
          return draw();
        },
      },
    );
  }
  await draw();
  return () => release?.();
}
