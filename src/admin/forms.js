import { dataFor } from './data.js';
import {mediaField,bindMedia} from "./media.js";
import { result } from "./data.js";
import {
  field,
  choice,
  modal,
  toast,
  today,
  localInput,
  toISO,
  esc,
  labels,
  safeImage,
} from "./ui.js";
import {
  clientSchema,
  appointmentSchema,
  procedureSchema,
} from "./validation.js";
export async function clientForm(ctx, client = {}) {
 const {db,options,save}=dataFor(ctx.db);
  const professionals =
    ctx.user.role === "admin"
      ? await result(
          db.from("professionals").select("id,name").eq("active", true),
        )
      : [];
  const selected = client.id
    ? await result(
        db
          .from("client_professionals")
          .select("professional_id")
          .eq("client_id", client.id),
      )
    : [];
  return modal(
    client.id ? "Editar cliente" : "Novo cliente",
    field("name", "Nome completo", "text", client.name, {
      required: true,
      maxLength: 160,
      wide: true,
    }) +
      field("phone", "Telefone", "tel", client.phone) +
      field("whatsapp", "WhatsApp com DDD", "tel", client.whatsapp, {
        required: true,
      }) +
      field("email", "E-mail", "email", client.email) +
      field("birth_date", "Data de nascimento", "date", client.birth_date, {
        max: today(),
      }) +
      field("cpf", "CPF (opcional)", "text", client.cpf, { maxLength: 14 }) +
      field("active", "Status", "select", client.active ?? true, {
        choices: [
          [true, "Ativo"],
          [false, "Inativo"],
        ],
      }) +
      field("notes", "Observações", "textarea", client.notes, {
        wide: true,
        maxLength: 10000,
      }) +
      (professionals.length
        ? `<div class="wide"><p class="muted">Profissionais responsáveis</p><div class="check-group">${professionals.map((p) => `<label><input type="checkbox" name="responsible" value="${p.id}" ${selected.some((s) => s.professional_id === p.id) ? "checked" : ""}>${esc(p.name)}</label>`).join("")}</div></div>`
        : ""),
    async (v, form) => {
      const values = clientSchema.parse({
        ...v,
        birth_date: v.birth_date || null,
        active: v.active === "true",
      });
      const row = client.id
        ? await save("clients", values, client.id)
        : await result(
            db.rpc("create_client", {
              details: values,
              professionals: new FormData(form).getAll("responsible"),
            }),
          );
      if (client.id && ctx.user.role === "admin") {
        await result(
          db.rpc("set_client_professionals", {
            client: row.id,
            professionals: new FormData(form).getAll("responsible"),
          }),
        );
      }
      toast("Ficha do cliente salva.");
      ctx.refresh();
    },
  );
}
export async function appointmentForm(ctx, item = {}, presetClient) {
 const {db,options,save}=dataFor(ctx.db);
  const o = await options();
  if (!o.clients.length || !o.procedures.length || !o.professionals.length)
    throw Error(
      "Cadastre clientes, procedimentos e profissionais ativos antes de agendar.",
    );
  const p =
    o.procedures.find((p) => p.id === item.procedure_id) || o.procedures[0];
  const d = modal(
    item.id ? "Editar agendamento" : "Novo agendamento",
    field("client_id", "Cliente", "select", item.client_id || presetClient, {
      required: true,
      choices: choice(o.clients),
      wide: true,
    }) +
      field("procedure_id", "Procedimento", "select", p.id, {
        required: true,
        choices: choice(o.procedures),
      }) +
      field("professional_id", "Profissional", "select", item.professional_id, {
        required: true,
        choices: choice(o.professionals),
      }) +
      field(
        "starts_at",
        "Data e horário · Brasília",
        "datetime-local",
        item.starts_at ? localInput(item.starts_at) : today() + "T09:00",
        { required: true },
      ) +
      field(
        "duration",
        "Duração (minutos)",
        "number",
        item.duration || p.duration,
        { required: true, min: 5, max: 480 },
      ) +
      field("price", "Valor estimado (R$)", "number", item.price ?? p.price, {
        min: 0,
        step: "0.01",
        required: true,
      }) +
      field("status", "Status", "select", item.status || "scheduled", {
        choices: [
          "scheduled",
          "confirmed",
          "in_progress",
          "cancelled",
          "no_show",
        ].map((s) => [s, labels[s]]),
      }) +
      field("notes", "Observações", "textarea", item.notes, {
        wide: true,
        maxLength: 10000,
      }),
    async (v) => {
      const values = appointmentSchema.parse({
        ...v,
        starts_at: toISO(v.starts_at),
      });
      await save(
        "appointments",
        {
          ...values,
          ends_at: new Date(
            new Date(values.starts_at).getTime() + values.duration * 60000,
          ).toISOString(),
        },
        item.id,
      );
      toast("Agendamento salvo.");
      ctx.refresh();
    },
  );
  const proc = d.querySelector("[name=procedure_id]");
  const staff = d.querySelector("[name=professional_id]");
  const update = () => {
    const procedure = o.procedures.find((p) => p.id === proc.value);
    const current = staff.value;
    const available = o.professionals.filter((p) =>
      o.assignments.some(
        (a) => a.procedure_id === proc.value && a.professional_id === p.id,
      ),
    );
    staff.innerHTML = choice(available)
      .map(([v, l]) => `<option value="${v}">${esc(l)}</option>`)
      .join("");
    if (available.some((p) => p.id === current)) staff.value = current;
    else if (available.length === 1) staff.value = available[0].id;
    if (procedure) {
      d.querySelector("[name=duration]").value = procedure.duration;
      d.querySelector("[name=price]").value = procedure.price;
    }
  };
  proc.onchange = update;
  update();
  if (item.duration) d.querySelector("[name=duration]").value = item.duration;
  if (item.price !== undefined)
    d.querySelector("[name=price]").value = item.price;
  return d;
}
export function treatmentForm(ctx, appointment) {
 const {db,options,save}=dataFor(ctx.db);
  return modal(
    "Concluir atendimento",
    `<p class="wide muted">${esc(appointment.clients?.name)} · ${esc(appointment.procedures?.name)}</p>` +
      field("notes", "Registro do atendimento", "textarea", "", {
        required: true,
        maxLength: 10000,
        wide: true,
      }) +
      field("expected_result", "Resultado esperado", "textarea", "", {
        maxLength: 10000,
        wide: true,
      }) +
      field("recommendations", "Recomendações", "textarea", "", {
        maxLength: 10000,
        wide: true,
      }) +
      field("return_date", "Retorno recomendado", "date", "", {
        min: today(),
        hint: "Um lembrete será criado automaticamente.",
      }),
    async (v) => {
      await result(
        db.rpc("complete_appointment", {
          appointment: appointment.id,
          ...v,
          return_date: v.return_date || null,
        }),
      );
      toast("Atendimento registrado no histórico.");
      ctx.refresh();
    },
    "Concluir e registrar",
  );
}
export async function procedureForm(ctx, item = {}) {
 const {db,options,save}=dataFor(ctx.db);
  const staff = await result(
    db.from("professionals").select("id,name").eq("active", true),
  );
  const selected = item.id
    ? await result(
        db
          .from("procedure_professionals")
          .select("professional_id")
          .eq("procedure_id", item.id),
      )
    : [];
  const dialog=modal(
    item.id ? "Editar procedimento" : "Novo procedimento",
    field("name", "Nome", "text", item.name, { required: true, wide: true }) +
      field("description", "Descrição", "textarea", item.description, {
        wide: true,
      }) +
      field("duration", "Duração (minutos)", "number", item.duration || 60, {
        required: true,
        min: 5,
        max: 480,
      }) +
      field("price", "Valor (R$)", "number", item.price || 0, {
        required: true,
        min: 0,
        step: "0.01",
      }) +
      field("category", "Categoria", "text", item.category || "Facial", {
        required: true,
      }) +
      field("active", "Status", "select", item.active ?? true, {
        choices: [
          [true, "Ativo"],
          [false, "Inativo"],
        ],
      }) +
      field("published","Exibir no site","select",item.published??true,{choices:[[true,"Sim"],[false,"Não"]]}) +
      mediaField("photo_url","Foto pública do serviço",item.photo_url) + field("photo_alt","Descrição acessível da foto","text",item.photo_alt) +
      `<div class="wide"><p class="muted">Profissionais responsáveis</p><div class="check-group">${staff.map((p) => `<label><input type="checkbox" name="responsible" value="${p.id}" ${selected.some((s) => s.professional_id === p.id) ? "checked" : ""}>${esc(p.name)}</label>`).join("")}</div></div>`,
    async (v, form) => {
      if(v.photo_url&&!safeImage(v.photo_url))throw Error("Foto inválida.");
      const data = procedureSchema.parse({ ...v, active: v.active === "true",published:v.published==="true" });
      await result(
        db.rpc("save_procedure", {
          procedure: item.id || null,
          details: data,
          professionals: new FormData(form).getAll("responsible"),
        }),
      );
      toast("Procedimento salvo.");
      ctx.refresh();
    },
  );
  bindMedia(dialog,ctx.db);return dialog;
}
