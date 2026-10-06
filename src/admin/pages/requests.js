import { dataFor } from '../data.js';
import {mountBookingReadiness} from '../booking-readiness.js';
import { result } from '../data.js';
import {pageHead,table,esc,date,time,badge,pager,toast,confirmAction,bind} from '../ui.js';
export async function render(root,ctx){
 const {db}=dataFor(ctx.db);
 let status='pending',page=0;
 async function draw(){
  const {data,error,count}=await db.from('booking_requests').select('*,procedures(name),professionals(name)',{count:'exact'}).eq('status',status).order('created_at',{ascending:false}).range(page*20,page*20+19);if(error)throw error;
  root.innerHTML=pageHead('PEDIDOS PELO SITE','Solicitações de agendamento','Somente clientes cadastrados. A aprovação confirma o horário na agenda e na conta do cliente.')+
   `<div id="booking-readiness"></div><section class="panel"><div class="toolbar"><label>Status<select id="status">${[['pending','Pendentes'],['approved','Aprovados'],['rejected','Recusados']].map(([key,label])=>`<option value="${key}" ${key===status?'selected':''}>${label}</option>`).join('')}</select></label><button class="btn ghost" id="refresh">Atualizar</button></div>${table(['Cliente','Contato','Horário solicitado','Serviço','Profissional','Status','Ações'],data.map(r=>[
    `<a href="/admin/clientes/${r.client_id}" data-link>${esc(r.full_name)}</a>`,esc(r.whatsapp),date(r.starts_at)+' · '+time(r.starts_at),esc(r.procedures?.name),esc(r.professionals?.name),badge(r.status),r.status==='pending'?`<div class="row-actions"><button class="btn primary" data-approve="${r.id}">Aprovar</button><button class="btn ghost" data-reject="${r.id}">Recusar</button></div>`:'Analisado',
   ]))}${pager(page,count)}</section>`;
  await mountBookingReadiness(root.querySelector('#booking-readiness'),draw);
  root.querySelector('#status').onchange=e=>{status=e.target.value;page=0;draw();};root.querySelector('#refresh').onclick=draw;
  for(const [selector,decision,title,detail]of [['[data-approve]','approved','Confirmar agendamento?','O banco verificará novamente o horário. A confirmação aparecerá na área do cliente.'],['[data-reject]','rejected','Recusar pedido?','A recusa aparecerá na área do cliente. Nenhum horário será reservado.']])bind(root,selector,el=>confirmAction(title,detail,async()=>{await result(db.rpc('review_booking_request',{request_id:el.dataset.approve||el.dataset.reject,decision}));toast('Pedido atualizado.');await draw();}));
  bind(root,'[data-page]',el=>{page=Number(el.dataset.page);return draw();});
 }
 await draw();
}
