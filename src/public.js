import { db, configured } from "./supabase.js";
import "./public-integration.css";
import {preparePublicSite,loadPremium} from "./public-catalog.js";
import {mountBooking} from "./public-booking.js";
const escape = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function start() {
  if (document.readyState === "loading")
    await new Promise((r) =>
      document.addEventListener("DOMContentLoaded", r, { once: true }),
    );
  const config = window.CLINIC_CONFIG;
  if (!config) return;
  const catalog=await preparePublicSite(config);
  await loadPremium();
  async function accountHeader(){
    const link=document.querySelector('#header-account');if(!link)return;
    if(!configured)return;
    const {data:{session}}=await db.auth.getSession();
    if(!session){link.textContent='Entrar';return;}
    const {data:profile}=await db.rpc('customer_portal');
    link.textContent=profile?.client?'Meu perfil · '+profile.client.name.split(' ')[0]:'Minha conta';
  }
  await accountHeader();
  db?.auth.onAuthStateChange(()=>setTimeout(accountHeader,0));
  for(const [key,selector] of Object.entries({procedures:'#procedures-title',results:'#results-title',results_intro:'#resultados .section-heading>p:last-child',method:'#method-title',team:'#team-title',testimonials:'#testimonials-title',clinic:'#clinic-title',clinic_intro:'.gallery-heading>p',faq:'#faq-title',faq_intro:'.faq-intro',cta:'#cta-title',cta_intro:'.final-cta .section-inner>p:not(.eyebrow)',contact:'#contact-title'})){if(config.copy?.[key])document.querySelector(selector).textContent=config.copy[key];}
  if(config.hero.title)document.querySelector('#hero-title').textContent=config.hero.title;
  if(config.email){const a=document.createElement('a');a.href='mailto:'+config.email;a.textContent=config.email;document.querySelector('#footer-contact').append(a);}
  const portal=document.createElement('a');portal.href='/cliente';portal.className='q-interest-link';portal.textContent='Minha conta · agendamentos e acompanhamento';document.querySelector('#contact-content').after(portal);
  await mountBooking(catalog);
  // Secondary contact request, separate from appointment scheduling.
  const contact = document.querySelector("#contact-content");
  const open = document.createElement("button");
  open.className = "q-interest-link";
  open.textContent = "Prefiro receber um contato";
  open.type = "button";
  contact.after(open);
  const dialog = document.createElement("dialog");
  dialog.className = "q-interest-dialog";
  dialog.setAttribute("aria-labelledby", "q-interest-title");
  dialog.innerHTML = `<button class="q-close" aria-label="Fechar">×</button><p class="q-eyebrow">UMA CONVERSA, UM PRIMEIRO PASSO</p><h2 id="q-interest-title">Podemos falar com você?</h2><p>Deixe seu contato. Nossa equipe ajudará a encontrar o melhor horário para sua avaliação.</p><form><label>Nome completo<input name="name" autocomplete="name" minlength="2" maxlength="160" required></label><label>WhatsApp com DDD<input name="phone" type="tel" autocomplete="tel" maxlength="25" required></label><label>Procedimento de interesse<select name="interest" required><option value="">Selecione…</option>${config.procedures.map((p) => `<option>${escape(p.name)}</option>`).join("")}<option>Avaliação personalizada</option></select></label><label class="q-trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><label class="q-consent"><input type="checkbox" name="consent" required>Autorizo a clínica a usar meu nome e WhatsApp para responder a este pedido de contato.</label><p class="q-form-status" role="status"></p><button class="q-submit" type="submit">Quero receber um contato</button><small>Seus dados serão acessados somente pela equipe autorizada. Este formulário não confirma um agendamento.</small></form>`;
  document.body.append(dialog);
  open.onclick = () => dialog.showModal();
  dialog.querySelector(".q-close").onclick = () => dialog.close();
  dialog.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const status = dialog.querySelector(".q-form-status"),
      button = dialog.querySelector("[type=submit]");
    button.disabled = true;
    try {
      if (!configured)
        throw Error(
          "O formulário está sendo preparado. Por enquanto, fale com a clínica pelo WhatsApp.",
        );
      const f = new FormData(e.target),
        phone = f.get("phone").replace(/\D/g, "");
      if (!/^\d{10,15}$/.test(phone))
        throw Error("Informe WhatsApp com DDD (10 a 15 dígitos).");
      const { error } = await db.rpc("submit_lead", {
        full_name: f.get("name"),
        phone,
        interest: f.get("interest"),
        consent: f.get("consent") === "on",
        website: f.get("website"),
      });
      if (error) throw error;
      e.target.reset();
      status.textContent =
        "Recebemos seu contato. Nossa equipe falará com você em breve.";
    } catch (err) {
      status.textContent =
        err.message || "Não foi possível enviar. Tente novamente.";
    } finally {
      button.disabled = false;
    }
  };
  config.legal.privacy =
    "Ao solicitar um contato, coletamos seu nome, WhatsApp e procedimento de interesse para responder ao seu pedido. O acesso é restrito à equipe autorizada da clínica. Não envie informações de saúde por este formulário. Para solicitar acesso, correção ou exclusão dos seus dados, entre em contato com a clínica pelos canais desta página. Links externos (WhatsApp, Instagram e Google Maps) seguem suas próprias políticas. Agendamentos e fotos de acompanhamento ficam em área autenticada. Somente imagens com autorização de publicação são exibidas na galeria pública.";
}
start();
