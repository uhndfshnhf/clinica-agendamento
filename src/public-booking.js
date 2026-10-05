import {db} from './supabase.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let captchaPromise;
export function loadTurnstile(){
 return captchaPromise??=new Promise((resolve,reject)=>{
  if(window.turnstile)return resolve(window.turnstile);
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=()=>resolve(window.turnstile);script.onerror=()=>{captchaPromise=null;reject(Error('Não foi possível carregar a verificação de segurança.'));};document.head.append(script);
 });
}
export async function mountBooking(catalog,container=document.querySelector('#contact-content')){
 if(!catalog?.booking.enabled||!catalog.booking.site_key||!catalog.procedures.length)return;
 const open=document.createElement('button');open.className='q-submit q-booking-open';open.textContent='Solicitar horário pelo site';container.after(open);
 let dialog,token='',widget,key;
 open.onclick=async()=>{
  const {data:{session}}=await db.auth.getSession();
  if(!session){location.href='/cliente?agendar=1';return;}
  const {data:profile,error}=await db.rpc('customer_portal');
  if(error||!profile?.client){location.href='/cliente?agendar=1';return;}
  if(dialog){dialog.showModal();return;}
  dialog=document.createElement('dialog');dialog.className='q-interest-dialog';dialog.setAttribute('aria-labelledby','booking-title');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
  const max=new Date();max.setDate(max.getDate()+30);
  dialog.innerHTML=`<button class="q-close" aria-label="Fechar">×</button><h2 id="booking-title">Seu próximo cuidado.</h2><p>Olá, ${esc(profile.client.name)}. Escolha um horário. A equipe analisará seu pedido antes de confirmar. Horários de Brasília.</p><form><label>Serviço<select name="procedure" required><option value="">Selecione…</option>${catalog.procedures.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label>Profissional<select name="professional" required><option value="">Selecione um serviço</option></select></label><label>Dia<input name="day" type="date" min="${today}" max="${max.toISOString().slice(0,10)}" required></label><label>Horário<select name="starts_at" required><option value="">Selecione profissional e dia</option></select></label><label class="q-trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><label class="q-consent"><input name="consent" type="checkbox" required>Autorizo o uso dos meus dados para analisar e responder a este pedido.</label><div class="q-captcha"></div><p class="q-form-status" role="status"></p><button class="q-submit" type="submit">Enviar pedido para aprovação</button><small>O horário só estará confirmado após a aprovação da clínica. Não envie informações de saúde por este formulário.</small></form>`;
  document.body.append(dialog);const form=dialog.querySelector('form'),status=dialog.querySelector('[role=status]');
  dialog.querySelector('.q-close').onclick=()=>dialog.close();dialog.showModal();
  let slotGeneration=0;
  async function slots(){
   const generation=++slotGeneration;form.starts_at.innerHTML='<option value="">Selecione profissional e dia</option>';
   if(!form.procedure.value||!form.professional.value||!form.day.value)return;
   const {data,error}=await db.rpc('public_booking_slots',{procedure:form.procedure.value,professional:form.professional.value,chosen_day:form.day.value});
   if(generation!==slotGeneration)return;
   if(error){status.textContent='Não foi possível consultar os horários.';return;}
   form.starts_at.innerHTML='<option value="">'+(data.length?'Selecione…':'Nenhum horário disponível')+'</option>'+data.map(s=>`<option value="${s.starts_at}">${new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(s.starts_at))}</option>`).join('');
  }
  form.procedure.onchange=()=>{const ids=catalog.assignments.filter(a=>a.procedure_id===form.procedure.value).map(a=>a.professional_id);form.professional.innerHTML='<option value="">Selecione…</option>'+catalog.professionals.filter(p=>ids.includes(p.id)).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');slots();};
  form.professional.onchange=slots;form.day.onchange=slots;
  try{const t=await loadTurnstile();widget=t.render(dialog.querySelector('.q-captcha'),{sitekey:catalog.booking.site_key,action:'booking',callback:v=>token=v,'expired-callback':()=>token='','error-callback':()=>{token='';status.textContent='Verificação indisponível. Tente novamente.';}});}catch(e){status.textContent=e.message;}
  key=crypto.randomUUID();
  form.onsubmit=async e=>{
   e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
   try{
    if(!token)throw Error('Conclua a verificação de segurança.');
    const {data:{session:fresh}}=await db.auth.getSession();if(!fresh)throw Error('Sua sessão expirou. Entre novamente.');
    const response=await fetch('/api/booking',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+fresh.access_token},body:JSON.stringify({procedure:form.procedure.value,professional:form.professional.value,starts_at:form.starts_at.value,consent:form.consent.checked,website:form.website.value,token,request_key:key}),signal:AbortSignal.timeout(15000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível enviar.');
    form.reset();key=crypto.randomUUID();status.textContent='Pedido recebido! Acompanhe a aprovação na sua área do cliente.';
   }catch(e){status.textContent=e.message||'Não foi possível enviar.';}finally{token='';if(widget!==undefined)window.turnstile.reset(widget);button.disabled=false;}
  };
 };
}
