import './admin/style.css';
import './public-integration.css';
import './customer.css';
import {db,configured,result} from './supabase.js';
import {esc,field,date,time,badge,table,errorText} from './admin/ui.js';
import {loadTurnstile,mountBooking} from './public-booking.js';
const app=document.querySelector('#app');let urls=[],generation=0;
const clean=()=>{urls.forEach(URL.revokeObjectURL);urls=[];};
let recovery=/type=recovery/.test(location.hash);
const shell=body=>`<header class="customer-header"><a href="/">QUARTIER</a><a href="/">Voltar ao site</a></header><main class="customer-main">${body}</main>`;
async function authForm(catalog){
 app.innerHTML=shell(`<section class="panel customer-auth"><div class="panel-body"><p class="eyebrow">SEU ESPAÇO DE CUIDADO</p><h1>${recovery?'Nova senha':'Minha conta'}</h1><p class="muted">Entre para solicitar horários e acompanhar seu cuidado.</p><form>${recovery?'':field('email','E-mail','email','',{required:true})}${field('password','Senha','password','',{required:true,min:12})}<div id="auth-captcha"></div><p role="alert" class="form-error"></p><div class="inline-actions"><button class="btn primary" type="submit">${recovery?'Salvar nova senha':'Entrar'}</button>${recovery?'':'<button class="btn secondary" type="button" id="signup">Criar conta</button><button class="btn ghost" type="button" id="forgot">Esqueci minha senha</button>'}</div></form><p class="muted">Após criar sua conta, confirme o e-mail antes de entrar. Agendamentos dependem da aprovação da clínica.</p></div></section>`);
 const form=app.querySelector('form'),status=form.querySelector('[role=alert]');let token='',widget;
 if(catalog?.booking.site_key&&!recovery){try{const t=await loadTurnstile();widget=t.render('#auth-captcha',{sitekey:catalog.booking.site_key,action:'auth',callback:v=>token=v,'expired-callback':()=>token=''});}catch{status.textContent='Verificação de segurança indisponível. Tente novamente.';}}
 const reset=()=>{token='';if(widget!==undefined)window.turnstile.reset(widget);};
 form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;try{
  if(recovery){if(form.password.value.length<12)throw Error('Use pelo menos 12 caracteres.');await result(db.auth.updateUser({password:form.password.value}));recovery=false;history.replaceState({},'','/cliente');}
  else await result(db.auth.signInWithPassword({email:form.email.value,password:form.password.value,options:{captchaToken:token||undefined}}));
  await render();
 }catch(e){status.textContent=errorText(e);}finally{button.disabled=false;reset();}};
 form.querySelector('#signup')?.addEventListener('click',async e=>{e.target.disabled=true;try{
  if(!form.reportValidity())return;if(form.password.value.length<12)throw Error('Use uma senha com pelo menos 12 caracteres.');
  if(!token)throw Error('Conclua a verificação de segurança para criar a conta.');
  await result(db.auth.signUp({email:form.email.value,password:form.password.value,options:{emailRedirectTo:location.origin+'/cliente',captchaToken:token}}));
  status.textContent='Verifique seu e-mail para confirmar a conta. Depois, entre aqui.';
 }catch(e){status.textContent=errorText(e);}finally{e.target.disabled=false;reset();}});
 form.querySelector('#forgot')?.addEventListener('click',async e=>{e.target.disabled=true;try{
  if(!form.email.checkValidity()||!form.email.value)throw Error('Informe seu e-mail.');
  await result(db.auth.resetPasswordForEmail(form.email.value,{redirectTo:location.origin+'/cliente',captchaToken:token||undefined}));status.textContent='Se a conta existir, você receberá um e-mail de recuperação.';
 }catch(e){status.textContent=errorText(e);}finally{e.target.disabled=false;reset();}});
}
async function render(){
 const version=++generation;clean();document.querySelectorAll('dialog').forEach(d=>d.remove());
 if(!configured){app.innerHTML=shell('<h1>Minha conta</h1><p>A conexão está sendo preparada. Entre em contato com a clínica.</p>');return;}
 try{
  const catalog=await result(db.rpc('public_catalog'));
  const {data:{session}}=await db.auth.getSession();if(version!==generation)return;
  if(!session||recovery)return authForm(catalog);
  const profile=await result(db.rpc('customer_portal'));if(version!==generation)return;
  if(!profile){
   app.innerHTML=shell(`<section class="panel customer-auth"><div class="panel-body"><h1>Complete seu cadastro</h1><form>${field('name','Nome completo','text','',{required:true,maxLength:160})}${field('phone','WhatsApp com DDD','tel','',{required:true,maxLength:25})}<label class="q-consent"><input name="consent" type="checkbox" required>Autorizo o uso dos dados para atendimento e agendamento.</label><p class="form-error" role="alert"></p><button class="btn primary">Concluir cadastro</button></form><button class="btn ghost" id="logout">Sair</button></div></section>`);
   app.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await result(db.rpc('register_customer',{full_name:e.target.name.value,phone:e.target.phone.value.replace(/\D/g,''),consent:e.target.consent.checked}));await render();}catch(err){e.target.querySelector('[role=alert]').textContent=errorText(err);}finally{b.disabled=false;}};
  }else{
   const rows=data=>table(['Data','Serviço','Profissional','Status'],data.map(a=>[date(a.starts_at)+' · '+time(a.starts_at),esc(a.procedure_name),esc(a.professional_name),badge(a.status)]));
   app.innerHTML=shell(`<div class="page-heading"><div><p class="eyebrow">MINHA CONTA</p><h1>Olá, ${esc(profile.client.name.split(' ')[0])}.</h1><p class="muted">Pedidos sujeitos à aprovação da clínica. Horários de Brasília.</p></div><div><button class="btn ghost" id="refresh">Atualizar</button><button class="btn ghost" id="logout">Sair</button></div></div><div id="booking-place"></div><section class="panel"><div class="panel-head"><h2>Meus pedidos</h2></div>${rows(profile.requests)}</section><section class="panel"><div class="panel-head"><h2>Meus agendamentos</h2></div>${rows(profile.appointments)}</section><section class="panel"><div class="panel-head"><h2>Meu acompanhamento</h2></div><div class="photo-grid">${profile.photos.map(p=>`<article class="photo-card"><img data-private="${p.id}" alt="${esc(p.procedure_name)} — ${esc(p.category)}">${badge(p.category)}<h3>${esc(p.procedure_name)}</h3><p>${date(p.taken_on)}</p></article>`).join('')||'<p class="muted">As fotos liberadas pela clínica aparecerão aqui.</p>'}</div></section>`);
   app.querySelector('#refresh').onclick=render;await mountBooking(catalog,app.querySelector('#booking-place'));
   for(const p of profile.photos){const blob=await result(db.storage.from('evolution').download(p.object_path));if(version!==generation)return;const url=URL.createObjectURL(blob);urls.push(url);app.querySelector(`[data-private="${p.id}"]`).src=url;}
  }
  app.querySelector('#logout').onclick=async()=>{clean();await db.auth.signOut();await render();};
 }catch(e){app.innerHTML=shell(`<h1>Não foi possível carregar sua conta.</h1><p>${esc(errorText(e))}</p><button class="btn" id="retry">Tentar novamente</button><button class="btn ghost" id="logout">Sair</button>`);app.querySelector('#retry').onclick=render;app.querySelector('#logout').onclick=async()=>{await db.auth.signOut();render();};}
}
window.addEventListener('pagehide',clean);
setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]')&&app.querySelector('#refresh'))render();},60000);
db?.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recovery=true;setTimeout(render,0);}});
render();
