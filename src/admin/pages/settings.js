import { db, result } from "../data.js";
import { pageHead, field, toast, errorText, safeImage } from "../ui.js";
export async function render(root, ctx) {
  const s = await result(db.from("settings").select("*").single());
  root.innerHTML =
    pageHead(
      "IDENTIDADE & CONTATO",
      "Configurações",
      "As informações da clínica, sempre em harmonia.",
    ) +
    `<section class="panel"><form class="settings-form"><div class="form-grid">${field("name", "Nome da clínica", "text", s.name, { required: true, wide: true, maxLength: 160 })}${field("logo", "Logo (URL HTTPS ou /assets/...)", "text", s.logo, { wide: true })}${field("phone", "Telefone", "tel", s.phone)}${field("whatsapp", "WhatsApp (país + DDD + número)", "tel", s.whatsapp)}${field("instagram", "Instagram (URL HTTPS)", "url", s.instagram)}${field("email", "E-mail", "email", s.email)}${field("address", "Endereço", "text", s.address, { wide: true })}${field("hours", "Horário de atendimento", "textarea", s.hours, { wide: true })}${field("whatsapp_message", "Mensagem padrão do WhatsApp", "textarea", s.whatsapp_message, { wide: true, maxLength: 1000 })}</div><p class="muted" style="margin-top:24px">Os contatos e o rodapé do site são atualizados automaticamente. Campos vazios preservam os dados originais. A composição visual e a hero permanecem preservadas.</p><p class="form-error" role="alert"></p><button class="btn primary" type="submit">Salvar configurações</button></form></section>`;
  root.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      const v = Object.fromEntries(new FormData(e.target));
      v.phone = v.phone.replace(/\D/g, "");
      v.whatsapp = v.whatsapp.replace(/\D/g, "");
      if (v.whatsapp && !/^\d{10,15}$/.test(v.whatsapp))
        throw Error("WhatsApp deve ter de 10 a 15 dígitos.");
      if (v.logo && !safeImage(v.logo))
        throw Error("Use uma URL HTTPS ou caminho local para o logo.");
      if (v.instagram && !v.instagram.startsWith("https://"))
        throw Error("O Instagram deve usar HTTPS.");
      await result(
        db
          .from("settings")
          .update({ ...v, updated_at: new Date().toISOString() })
          .eq("id", true),
      );
      toast("Configurações salvas.");
      ctx.refresh();
    } catch (err) {
      e.target.querySelector(".form-error").textContent = errorText(err);
    } finally {
      b.disabled = false;
    }
  };
}
