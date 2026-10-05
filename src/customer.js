import './admin/style.css';
import './public-integration.css';
import './customer.css';
import {db,configured,result} from './supabase.js';
import {esc,field,date,time,badge,table,errorText} from './admin/ui.js';
import {mountBooking,renderBooking} from './public-booking.js';
const app=document.querySelector('#app');let urls=[],generation=0;
const clean=()=>{urls.forEach(URL.revokeObjectURL);urls=[];};
let recovery=/type=recovery/.test(location.hash);
const bookingIntent=()=>location.pathname.includes('/agendar')||new URLSearchParams(location.search).has('agendar');
const shell=body=>`<header class="customer-header"><a href="/" class="customer-brand"><span>Q</span><div>QUARTIER<small>ESTÉTICA E BEM-ESTAR</small></div></a><a class="back-to-site" href="/">← Voltar ao site</a></header><main class="customer-main">${body}</main>`;
async function authForm(){
 let signup=false;const saved={};
 function draw(){
  app.innerHTML=shell(`<div class="auth-layout"><aside class="auth-story"><img src="/assets/sobre-principal.webp" alt="Cuidado e bem-estar na Quartier"><div><p class="eyebrow">BELEZA COM PROPÓSITO</p><h2>Seu cuidado.<br>Seu tempo.<br><em>Seu espaço.</em></h2><p>Uma experiência pensada para você, do primeiro encontro a cada novo resultado.</p></div></aside><section class="panel customer-auth"><div class="panel-body"><p class="eyebrow">SEU ESPAÇO DE CUIDADO</p><h1>${recovery?'Nova senha':signup?'Comece por você.':'Bem-vinda de volta.'}</h1><p class="muted">${signup?'Seu cadastro aparecerá para a equipe e você poderá solicitar um horário.':bookingIntent()?'Entre na sua conta para agendar uma avaliação.':'Acesse seus agendamentos e seu acompanhamento em um só lugar.'}</p><div class="auth-tabs" role="tablist" aria-label="Acesso à conta">${recovery?'':`<button type="button" id="login-tab" role="tab" aria-selected="${!signup}" class="${signup?'':'active'}">Entrar</button><button type="button" id="signup-tab" role="tab" aria-selected="${signup}" class="${signup?'active':''}">Criar conta</button>`}</div><form>${signup?field('name','Nome completo','text','',{required:true,maxLength:160})+field('phone','WhatsApp com DDD','tel','',{required:true,maxLength:25}):''}${recovery?'':field('email','E-mail','email','',{required:true})}${field('password','Senha','password','',{required:true})}${signup?'<label class="q-consent"><input name="consent" type="checkbox" required>Autorizo o uso dos meus dados para atendimento e agendamento.</label>':''}<p role="alert" class="form-error"></p><div class="inline-actions auth-actions"><button class="btn primary" type="submit">${recovery?'Salvar nova senha':signup?'Concluir cadastro':'Entrar'}</button>${recovery?'':`<button class="btn secondary" type="button" id="switch">${signup?'Já tenho conta':'Criar conta'}</button>${signup?'':'<button class="btn ghost" type="button" id="forgot">Esqueci minha senha</button>'}`}</div></form><p class="auth-footer">QUARTIER · CUIDADO QUE VALORIZA SUA ESSÊNCIA</p></div></section></div>`);
  const form=app.querySelector('form'),status=form.querySelector('[role=alert]');
  for(const name of ['name','phone','email']){const input=form.elements.namedItem(name);if(input){input.autocomplete={name:'name',phone:'tel',email:'email'}[name];input.value=saved[name]||'';input.oninput=()=>{saved[name]=input.value;};}}
  form.password.autocomplete=signup||recovery?'new-password':'current-password';if(signup||recovery){form.password.minLength=12;const hint=document.createElement('small');hint.className='password-hint';hint.textContent='Use pelo menos 12 caracteres.';form.password.parentElement.append(hint);}
  for(const tab of app.querySelectorAll('[role=tab]'))tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();signup=!signup;draw();app.querySelector(signup?'#signup-tab':'#login-tab').focus();}};
  app.querySelector('#login-tab')?.addEventListener('click',()=>{signup=false;draw();});app.querySelector('#signup-tab')?.addEventListener('click',()=>{signup=true;draw();});
  form.querySelector('#switch')?.addEventListener('click',()=>{signup=!signup;draw();});
  form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;try{
   if(recovery){if(form.password.value.length<12)throw Error('Use pelo menos 12 caracteres.');await result(db.auth.updateUser({password:form.password.value}));recovery=false;history.replaceState({},'','/cliente');}
   else if(signup){
    if(form.password.value.length<12)throw Error('Use uma senha com pelo menos 12 caracteres.');
    const phone=form.phone.value.replace(/\D/g,'');if(!/^\d{10,15}$/.test(phone))throw Error('Informe o WhatsApp com DDD.');
    const data=await result(db.auth.signUp({email:form.email.value,password:form.password.value,options:{emailRedirectTo:location.origin+(bookingIntent()?'/cliente/agendar':'/cliente'),data:{full_name:form.name.value.trim(),phone,customer_consent:form.consent.checked}}}));
    if(!data.session){status.textContent='Cadastro recebido! Confirme seu e-mail para entrar na conta.';return;}
   }else await result(db.auth.signInWithPassword({email:form.email.value,password:form.password.value}));
   await render();
  }catch(e){status.textContent=errorText(e);}finally{button.disabled=false;}};
  form.querySelector('#forgot')?.addEventListener('click',async e=>{e.target.disabled=true;try{
   if(!form.email.checkValidity()||!form.email.value)throw Error('Informe seu e-mail.');
   await result(db.auth.resetPasswordForEmail(form.email.value,{redirectTo:location.origin+'/cliente'}));status.textContent='Se a conta existir, você receberá um e-mail de recuperação.';
  }catch(e){status.textContent=errorText(e);}finally{e.target.disabled=false;}});
 }
 draw();
}
async function render(){
 const version=++generation;clean();document.querySelectorAll('dialog').forEach(d=>d.remove());
 if(!configured){app.innerHTML=shell('<h1>Minha conta</h1><p>A conexão está sendo preparada. Entre em contato com a clínica.</p>');return;}
 try{
  const catalog=await result(db.rpc('public_catalog'));
  const {data:{session}}=await db.auth.getSession();if(version!==generation)return;
  if(!session||recovery)return authForm();
  const profile=await result(db.rpc('customer_portal'));if(version!==generation)return;
  if(!profile){
   app.innerHTML=shell(`<section class="panel customer-auth"><div class="panel-body"><h1>Complete seu cadastro</h1><form>${field('name','Nome completo','text','',{required:true,maxLength:160})}${field('phone','WhatsApp com DDD','tel','',{required:true,maxLength:25})}<label class="q-consent"><input name="consent" type="checkbox" required>Autorizo o uso dos dados para atendimento e agendamento.</label><p class="form-error" role="alert"></p><button class="btn primary">Concluir cadastro</button></form><button class="btn ghost" id="logout">Sair</button></div></section>`);
   app.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await result(db.rpc('register_customer',{full_name:e.target.name.value,phone:e.target.phone.value.replace(/\D/g,''),consent:e.target.consent.checked}));await render();}catch(err){e.target.querySelector('[role=alert]').textContent=errorText(err);}finally{b.disabled=false;}};
  }else{
   const rows=data=>table(['Data','Serviço','Profissional','Status'],data.map(a=>[date(a.starts_at)+' · '+time(a.starts_at),esc(a.procedure_name),esc(a.professional_name),badge(a.status)]));
   app.innerHTML=shell(`<div class="page-heading"><div><p class="eyebrow">MINHA CONTA</p><h1>Olá, ${esc(profile.client.name.split(' ')[0])}.</h1><p class="muted">Pedidos sujeitos à aprovação da clínica. Horários de Brasília.</p></div><div><button class="btn ghost" id="refresh">Atualizar</button><button class="btn ghost" id="logout">Sair</button></div></div><section class="panel customer-profile"><div class="panel-head"><h2>Meu perfil</h2></div><div class="panel-body"><p><strong>Nome:</strong> ${esc(profile.client.name)}</p><p><strong>E-mail:</strong> ${esc(session.user.email)}</p><p><strong>WhatsApp:</strong> ${esc(profile.client.whatsapp)}</p></div></section><div id="booking-place"></div><section class="panel"><div class="panel-head"><h2>Meus pedidos</h2></div>${rows(profile.requests)}</section><section class="panel"><div class="panel-head"><h2>Meus agendamentos</h2></div>${rows(profile.appointments)}</section><section class="panel"><div class="panel-head"><h2>Meu acompanhamento</h2></div><div class="photo-grid">${profile.photos.map(p=>`<article class="photo-card"><img data-private="${p.id}" alt="${esc(p.procedure_name)} — ${esc(p.category)}">${badge(p.category)}<h3>${esc(p.procedure_name)}</h3><p>${date(p.taken_on)}</p></article>`).join('')||'<p class="muted">As fotos liberadas pela clínica aparecerão aqui.</p>'}</div></section>`);
   app.querySelector('#refresh').onclick=render;await mountBooking(catalog,app.querySelector('#booking-place'));
   if(bookingIntent()){app.innerHTML=shell(`<div class="page-heading"><div><p class="eyebrow">SEU PRÓXIMO ENCONTRO</p><h1>Agendar uma avaliação.</h1><p class="muted">Reserve um momento para cuidar de você.</p></div><a class="btn secondary" href="/cliente">← Meu perfil</a></div><div id="booking-page"></div><button id="logout" class="btn ghost">Sair da conta</button>`);renderBooking(catalog,profile,app.querySelector('#booking-page'));return bindLogout();}
   for(const p of profile.photos){const blob=await result(db.storage.from('evolution').download(p.object_path));if(version!==generation)return;const url=URL.createObjectURL(blob);urls.push(url);app.querySelector(`[data-private="${p.id}"]`).src=url;}
  }
  bindLogout();
 }catch(e){app.innerHTML=shell(`<h1>Não foi possível carregar sua conta.</h1><p>${esc(errorText(e))}</p><button class="btn" id="retry">Tentar novamente</button><button class="btn ghost" id="logout">Sair</button>`);app.querySelector('#retry').onclick=render;app.querySelector('#logout').onclick=async()=>{await db.auth.signOut();render();};}
}
function bindLogout(){app.querySelector('#logout').onclick=async()=>{clean();await db.auth.signOut();await render();};}
window.addEventListener('pagehide',clean);
setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]')&&app.querySelector('#refresh'))render();},60000);
db?.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recovery=true;setTimeout(render,0);}});
render();
