import {mountBookingReadiness} from '../booking-readiness.js';
import { db, result } from "../data.js";
import { pageHead, field, toast, errorText, safeImage } from "../ui.js";
export async function render(root, ctx) {
  const s = await result(db.from("settings").select("*").single());
  const bookingSupported=Object.hasOwn(s,"booking_enabled");
  root.innerHTML =
    pageHead(
      "IDENTIDADE & CONTATO",
      "Configurações",
      "As informações da clínica, sempre em harmonia.",
    ) +
    `<div id="booking-readiness"></div><section class="panel"><form class="settings-form"><div class="form-grid">${bookingSupported?`${field("booking_enabled","Receber pedidos de agendamento pelo site","select",s.booking_enabled,{choices:[[false,"Desativado"],[true,"Ativado — sujeito à aprovação"]]})}${field("booking_open","Início dos horários online","time",s.booking_open?.slice(0,5),{required:true})}${field("booking_close","Fim dos horários online","time",s.booking_close?.slice(0,5),{required:true})}<div class="wide"><p>Dias disponíveis para pedidos</p><div class="check-group">${["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"].map((day,i)=>`<label><input type="checkbox" name="booking_days" value="${i}" ${s.booking_days?.includes(i)?"checked":""}>${day}</label>`).join("")}</div></div>`:""}${field("name", "Nome da clínica", "text", s.name, { required: true, wide: true, maxLength: 160 })}${field("logo", "Logo (URL HTTPS ou /assets/...)", "text", s.logo, { wide: true })}${field("phone", "Telefone", "tel", s.phone)}${field("whatsapp", "WhatsApp (país + DDD + número)", "tel", s.whatsapp)}${field("instagram", "Instagram (URL HTTPS)", "url", s.instagram)}${field("email", "E-mail", "email", s.email)}${field("address", "Endereço", "text", s.address, { wide: true })}${field("hours", "Horário de atendimento", "textarea", s.hours, { wide: true })}${field("whatsapp_message", "Mensagem padrão do WhatsApp", "textarea", s.whatsapp_message, { wide: true, maxLength: 1000 })}</div><p class="muted" style="margin-top:24px">Os contatos e o rodapé são atualizados no site. Edite textos, cores e fotos em Personalizar site. Clientes cadastrados podem pedir horários. A equipe confirma os pedidos em Pedidos pelo site.</p><p class="form-error" role="alert"></p><button class="btn primary" type="submit">Salvar configurações</button></form></section>`;
  await mountBookingReadiness(root.querySelector('#booking-readiness'),()=>ctx.refresh());
  root.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      const v = Object.fromEntries(new FormData(e.target));
      if(bookingSupported){
      v.booking_enabled=v.booking_enabled==="true";
      v.booking_days=new FormData(e.target).getAll("booking_days").map(Number);
      if(!v.booking_days.length)throw Error("Escolha pelo menos um dia.");
      if(v.booking_close<=v.booking_open)throw Error("O fim deve ser depois do início.");
      }
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
