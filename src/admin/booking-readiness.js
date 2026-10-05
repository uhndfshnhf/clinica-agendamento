import {db,result} from './data.js';
import {esc,errorText,toast} from './ui.js';
import {bookingAvailability} from '../shared/booking-availability.js';

export async function mountBookingReadiness(root,onChange){
 try{
  const [settings,catalog]=await Promise.all([result(db.from('settings').select('*').single()),result(db.rpc('public_catalog'))]);
  const availability=bookingAvailability(catalog),hasSettings=Object.hasOwn(settings,'booking_enabled');
  const hours=Array.isArray(settings.booking_days)&&settings.booking_days.length>0&&settings.booking_open<settings.booking_close;
  const checks=[
   [hasSettings&&settings.booking_enabled,'Pedidos online ativados','Ative para os clientes conseguirem escolher horários.','/admin/configuracoes'],
   [catalog.procedures?.length>0,'Tratamentos publicados','Em Procedimentos, ative e marque “Exibir no site”.','/admin/procedimentos'],
   [catalog.professionals?.length>0,'Profissionais publicados','Em Equipe, ative a publicação e os pedidos online.','/admin/equipe'],
   [availability.services.length>0,'Tratamentos vinculados à equipe','Edite o procedimento e selecione quem pode realizá-lo.','/admin/procedimentos'],
   [hours,'Dias e horários definidos','Escolha os dias de atendimento e os horários de início e fim.','/admin/configuracoes'],
  ];
  const ready=availability.ready&&hours;
  root.innerHTML=`<section class="panel booking-readiness ${ready?'ready':''}"><div class="panel-body"><div class="booking-readiness-heading"><div><p class="eyebrow">AGENDAMENTO DO CLIENTE</p><h2>${ready?'Sua agenda está aberta no site':'O que falta para abrir a agenda'}</h2><p class="muted">${ready?'Os clientes cadastrados já podem solicitar horários. A equipe continua aprovando cada pedido.':'Confira os itens abaixo. Eles determinam se o cliente consegue agendar pelo site.'}</p></div>${hasSettings&&!settings.booking_enabled?'<button class="btn primary" type="button" data-enable-booking>Ativar agendamentos online</button>':`<a class="btn secondary" href="/cliente/agendar" target="_blank" rel="noopener">Ver página de agendamento</a>`}</div><div class="booking-readiness-checks">${checks.map(([pass,title,copy,url])=>`<div class="booking-readiness-item ${pass?'done':'missing'}"><span aria-hidden="true">${pass?'✓':'!'}</span><div><strong>${esc(title)}</strong>${!pass?`<p>${esc(copy)}</p><a href="${url}" data-link>Configurar →</a>`:''}</div></div>`).join('')}</div><p class="form-error" role="alert"></p></div></section>`;
  root.querySelector('[data-enable-booking]')?.addEventListener('click',async e=>{
   const button=e.currentTarget;button.disabled=true;
   try{await result(db.from('settings').update({booking_enabled:true,updated_at:new Date().toISOString()}).eq('id',true).select('booking_enabled').single());toast('Pedidos online ativados.');if(onChange)await onChange();else await mountBookingReadiness(root);}
   catch(error){root.querySelector('[role=alert]').textContent=errorText(error);button.disabled=false;}
  });
 }catch(error){root.innerHTML='<section class="panel"><div class="panel-body"><h2>Não foi possível verificar a agenda online</h2><p>Confira a conexão e se a atualização do banco para agendamentos já foi aplicada.</p><button type="button" class="btn secondary" data-retry-booking>Tentar novamente</button></div></section>';root.querySelector('[data-retry-booking]').onclick=()=>mountBookingReadiness(root,onChange);}
}
