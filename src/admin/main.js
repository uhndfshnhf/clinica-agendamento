import "./style.css";
import { db, configured, result } from "../supabase.js";
import { esc, icon, field, toast, errorText } from "./ui.js";
const app = document.querySelector("#app");
window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  toast(errorText(e.reason), true);
});
const routes = {
  "": () => import("./pages/dashboard.js"),
  clientes: () => import("./pages/clients.js"),
  agenda: () => import("./pages/agenda.js"),
  procedimentos: () => import("./pages/procedures.js"),
  evolucao: () => import("./pages/evolution.js"),
  lembretes: () => import("./pages/reminders.js"),
  equipe: () => import("./pages/team.js"),
  configuracoes: () => import("./pages/settings.js"),
};
const nav = [
  ["", "dashboard", "Dashboard"],
  ["agenda", "calendar", "Agenda"],
  ["clientes", "clients", "Clientes"],
  ["evolucao", "photos", "Evolução"],
  ["procedimentos", "procedures", "Procedimentos"],
  ["lembretes", "bell", "Lembretes"],
  ["equipe", "team", "Equipe"],
  ["configuracoes", "settings", "Configurações"],
];
let context = null,
  generation = 0,
  cleanup = null,
  recovery = /type=(recovery|invite)/.test(location.hash);
export function go(path) {
  history.pushState({}, "", path);
  render();
}
window.addEventListener("popstate", render);
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (a && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    go(a.getAttribute("href"));
  }
});
async function login() {
  app.innerHTML = `<div class="login-layout"><aside class="login-editorial"><a href="/" class="wordmark">Q <span>QUARTIER<small>ESTÉTICA E BEM-ESTAR</small></span></a><div><p class="eyebrow">O CUIDADO CONTINUA AQUI</p><h1>Mais presença.<br><em>Em cada detalhe.</em></h1><p>Um espaço para organizar a rotina,<br>acompanhar histórias e cuidar de pessoas.</p></div><small>GESTÃO DA CLÍNICA · ACESSO PRIVADO</small></aside><main class="login-main"><form id="login-form"><p class="eyebrow">BEM-VINDA DE VOLTA</p><h2>${recovery ? "Uma nova senha." : "Seu espaço de cuidado."}</h2><p class="muted">${recovery ? "Escolha uma senha com pelo menos 12 caracteres." : "Entre para acompanhar a rotina da clínica."}</p>${recovery ? field("password", "Nova senha", "password", "", { required: true }) : field("email", "E-mail", "email", "", { required: true }) + field("password", "Senha", "password", "", { required: true })}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">${recovery ? "Salvar nova senha" : "Entrar"} ${icon("arrow")}</button>${recovery ? "" : '<button class="forgot" type="button">Esqueci minha senha</button>'}<p class="login-note">Acesso exclusivo à equipe autorizada.<br>Para agendar uma avaliação, <a href="/">visite o site da clínica</a>.</p></form><span class="login-footer">QUARTIER · TÉCNICA, ESCUTA E SENSIBILIDADE.</span></main></div>`;
  const form = app.querySelector("form");
  if (!configured) {
    form.querySelector(".form-error").textContent =
      "Conexão ainda não configurada. Defina a URL e a chave pública do Supabase conforme o README.";
    form.querySelectorAll("button").forEach((b) => (b.disabled = true));
    return;
  }
  const pass = form.querySelector("[name=password]");
  if (!recovery) pass.autocomplete = "current-password";
  form.onsubmit = async (e) => {
    e.preventDefault();
    const b = form.querySelector("[type=submit]");
    b.disabled = true;
    try {
      const v = Object.fromEntries(new FormData(form));
      if (recovery) {
        if (v.password.length < 12)
          throw Error("Use pelo menos 12 caracteres.");
        await result(db.auth.updateUser({ password: v.password }));
        recovery = false;
        history.replaceState({}, "", "/admin");
      } else await result(db.auth.signInWithPassword(v));
      await render();
    } catch (err) {
      form.querySelector(".form-error").textContent = errorText(err);
    } finally {
      b.disabled = false;
    }
  };
  form.querySelector(".forgot")?.addEventListener("click", async () => {
    const email = form.email.value.trim();
    if (!email || !form.email.checkValidity()) {
      form.querySelector(".form-error").textContent =
        "Informe seu e-mail para receber o link de recuperação.";
      return;
    }
    const b = form.querySelector(".forgot");
    b.disabled = true;
    try {
      await result(
        db.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + "/admin/login",
        }),
      );
      toast(
        "Se o e-mail estiver cadastrado, você receberá um link de recuperação.",
      );
    } catch (err) {
      form.querySelector(".form-error").textContent = errorText(err);
    } finally {
      b.disabled = false;
    }
  });
}
async function render() {
  const version = ++generation;
  cleanup?.();
  cleanup = null;
  document.querySelectorAll("dialog").forEach((d) => d.remove());
  if (!configured) {
    await login();
    return;
  }
  const {
    data: { session },
  } = await db.auth.getSession();
  if (!session || recovery) {
    if (!location.pathname.startsWith("/admin/login"))
      history.replaceState({}, "", "/admin/login");
    await login();
    return;
  }
  try {
    const [user, settings] = await Promise.all([
      result(db.from("users").select("*").eq("id", session.user.id).single()),
      result(db.from("settings").select("*").single()),
    ]);
    if (!user.active)
      throw Error("Acesso desativado. Procure o administrador.");
    if (version !== generation) return;
    context = { user, settings, session, go, refresh: render };
    if (location.pathname === "/admin/login")
      history.replaceState({}, "", "/admin");
    const [, section = "", id] = location.pathname
      .replace(/\/$/, "")
      .split("/")
      .slice(1);
    const route = routes[section];
    app.innerHTML = `<div class="admin-shell"><div class="drawer-backdrop"></div><aside class="sidebar"><a class="wordmark" href="/admin" data-link>Q <span>QUARTIER<small>ESTÉTICA E BEM-ESTAR</small></span></a><p class="nav-caption">ESPAÇO DA CLÍNICA</p><nav aria-label="Menu administrativo">${nav
      .filter(
        ([s]) =>
          user.role === "admin" || !["equipe", "configuracoes"].includes(s),
      )
      .map(
        ([s, i, label]) =>
          `<a href="/admin${s ? "/" + s : ""}" data-link class="${section === s ? "active" : ""}" title="${label}">${icon(i)}<span>${label}</span>${section === s ? "<i></i>" : ""}</a>`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-bottom"><a href="/" target="_blank" rel="noopener">${icon("arrow")}<span>Visitar o site</span></a><button id="collapse">${icon("chevron")}<span>Recolher menu</span></button><small>O cuidado está nos detalhes.</small></div></aside><div class="admin-body"><header class="topbar"><button class="icon-btn" id="menu" aria-label="Abrir menu" aria-expanded="false">${icon("menu")}</button><span class="clinic-name">${esc(settings.name)}</span><div class="topbar-actions"><a class="icon-btn" href="/admin/lembretes" data-link aria-label="Notificações e lembretes">${icon("bell")}</a><span class="topbar-divider"></span><span class="avatar">${esc(
      user.name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join(""),
    )}</span><span class="user-info">${esc(user.name)}<small>${user.role === "admin" ? "Administradora · Gestão" : "Profissional"}</small></span><button class="icon-btn" id="logout" aria-label="Sair">${icon("logout")}</button></div></header><main id="page" tabindex="-1"><div class="skeleton" role="status" aria-label="Carregando"></div></main><footer class="admin-footer">QUARTIER <span>Gestão com atenção. Cuidado com propósito.</span></footer></div></div>`;
    const shell = app.querySelector(".admin-shell");
    const menu = app.querySelector("#menu");
    const close = () => {
      shell.classList.remove("drawer-open");
      menu.setAttribute("aria-expanded", "false");
    };
    menu.onclick = () => {
      const open = shell.classList.toggle("drawer-open");
      menu.setAttribute("aria-expanded", String(open));
    };
    app.querySelector(".drawer-backdrop").onclick = close;
    app.querySelector("#collapse").onclick = () => {
      if (innerWidth <= 800) close();
      else shell.classList.toggle("collapsed");
    };
    shell.onkeydown = (e) => {
      if (e.key === "Escape") {
        close();
        menu.focus();
      }
      if (e.key === "Tab" && shell.classList.contains("drawer-open")) {
        const focusables = [
          ...shell.querySelectorAll(".sidebar a,.sidebar button"),
        ];
        const first = focusables[0],
          last = focusables.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const oldMenu = menu.onclick;
    menu.onclick = () => {
      oldMenu();
      if (shell.classList.contains("drawer-open"))
        shell.querySelector(".sidebar a").focus();
    };
    app.querySelector("#logout").onclick = async () => {
      await db.auth.signOut();
      context = null;
      go("/admin/login");
    };
    const page = app.querySelector("#page");
    if (!route) {
      page.innerHTML =
        '<h1>Página não encontrada</h1><a href="/admin" data-link>Voltar ao dashboard</a>';
      return;
    }
    if (
      user.role !== "admin" &&
      ["equipe", "configuracoes"].includes(section)
    ) {
      page.innerHTML = "<h1>Acesso restrito à administração.</h1>";
      return;
    }
    const module = await route();
    if (version !== generation) return;
    const pageCleanup = await module.render(page, { ...context, id });
    if (version !== generation) pageCleanup?.();
    else cleanup = pageCleanup;
  } catch (e) {
    if (version !== generation) return;
    const page = app.querySelector("#page");
    if (page) {
      page.innerHTML = `<div class="empty"><h2>Não foi possível carregar.</h2><p>${esc(errorText(e))}</p><button class="btn" id="retry">Tentar novamente</button></div>`;
      page.querySelector("#retry").onclick = render;
    } else {
      app.innerHTML = `<div class="access-error"><h1>Acesso à clínica indisponível</h1><p>${esc(errorText(e))}</p><p>Sua conta precisa estar vinculada à equipe.</p><button class="btn" id="exit">Voltar ao login</button></div>`;
      app.querySelector("#exit").onclick = async () => {
        await db.auth.signOut();
        go("/admin/login");
      };
    }
  }
}
if (db)
  db.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      recovery = true;
      setTimeout(render, 0);
    }
    if (event === "SIGNED_OUT") {
      generation++;
      document.querySelectorAll("dialog").forEach((d) => d.remove());
      setTimeout(() => go("/admin/login"), 0);
    }
  });
render();
