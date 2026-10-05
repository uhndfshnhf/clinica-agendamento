import { db, configured } from "./supabase.js";
import "./public-integration.css";
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
  if (configured) {
    try {
      const { data: s, error } = await db.rpc("public_settings");
      if (!error && s) {
        if (s.whatsapp) config.whatsapp = s.whatsapp;
        if (s.whatsapp_message) config.whatsappMessage = s.whatsapp_message;
        if (s.phone) {
          const link = document.querySelector(
            '#contact-content a[href^="tel:"]',
          );
          if (link) {
            link.href = "tel:+" + s.phone.replace(/\D/g, "");
            link.textContent = s.phone;
          }
        }
        if (s.address) {
          document.querySelector(
            "#contact-content>div:nth-child(4) p",
          ).textContent = s.address;
          document.querySelector("#footer-contact p").textContent = s.address;
          const map = document.querySelector("#map-frame>p");
          if (map) map.textContent = s.address;
        }
        if (s.hours)
          document.querySelector(
            "#contact-content>div:last-child p",
          ).textContent = s.hours;
        if (
          s.instagram &&
          /^https:\/\/([a-z0-9-]+\.)?instagram\.com\//i.test(s.instagram)
        ) {
          const contact = document.querySelector(
            "#contact-content>div:nth-child(3)",
          );
          contact.innerHTML = `<span>Instagram</span><a href="${escape(s.instagram)}" target="_blank" rel="noopener noreferrer">Instagram</a>`;
          const footer = document.querySelector("#footer-contact");
          const old = footer.firstElementChild;
          const a = document.createElement("a");
          a.href = s.instagram;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = "Instagram";
          old.replaceWith(a);
        }
        if (s.email) {
          const footer = document.querySelector("#footer-contact");
          const a = document.createElement("a");
          a.href = "mailto:" + s.email;
          a.textContent = s.email;
          footer.append(a);
        }
        if (s.name)
          document.querySelector("#copyright").textContent =
            `© ${new Date().getFullYear()} ${s.name}. Todos os direitos reservados.`;
        if (s.logo && /^(\/[^/]|https:\/\/)/.test(s.logo)) {
          const footerBrand = document.querySelector(".premium-footer .brand");
          footerBrand.innerHTML = `<img class="client-logo" src="${escape(s.logo)}" alt="${escape(s.name)}">`;
        }
      }
    } catch {
      /* Public site remains available if backend is offline. */
    }
  }
  // Keep every existing WhatsApp CTA intact. Add one secondary contact option.
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
    "Ao solicitar um contato, coletamos seu nome, WhatsApp e procedimento de interesse para responder ao seu pedido. O acesso é restrito à equipe autorizada da clínica. Não envie informações de saúde por este formulário. Para solicitar acesso, correção ou exclusão dos seus dados, entre em contato com a clínica pelos canais desta página. Links externos (WhatsApp, Instagram e Google Maps) seguem suas próprias políticas. Dados administrativos e fotos de pacientes ficam em área autenticada e não são publicados no site.";
}
start();
