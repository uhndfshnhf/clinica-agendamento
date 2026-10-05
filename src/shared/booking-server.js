import { createHmac } from 'node:crypto';
import { z } from 'zod';
export const bookingSchema = z.object({
 procedure:z.uuid(), professional:z.uuid(), starts_at:z.iso.datetime({offset:true}),
 consent:z.literal(true), website:z.string().max(200).default(''),
 token:z.string().min(1).max(2048), request_key:z.uuid(),
}).strict();
export function createBookingHandler({getConfig,createService,verifyCaptcha}) {
 return async function(req,res) {
  res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
  const reply=(status,error)=>res.status(status).json(error?{error}:{ok:true});
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,'Método não permitido.');}
  const c=getConfig();
  if(!c.url||!c.secret||!c.captchaSecret||!c.origin)return reply(503,'O agendamento online está sendo preparado. Entre em contato pelo WhatsApp.');
  let origin;try{origin=new URL(c.origin).origin;}catch{return reply(503,'Configuração indisponível.');}
  if(req.headers.origin!==origin)return reply(403,'Origem não permitida.');
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(415,'Formato não permitido.');
  const ip=String(req.headers['x-vercel-forwarded-for']||'').split(',')[0].trim();
  if(!ip||ip.length>100)return reply(400,'Não foi possível verificar a conexão.');
  let service;
  try {
   service=createService(c);
   const hash=createHmac('sha256',c.secret).update(ip).digest('hex');
   const budget=await service.rpc('consume_booking_budget',{key_hash:hash});
   if(budget.error)return reply(503,'Agendamento temporariamente indisponível.');
   if(!budget.data){res.setHeader('Retry-After','3600');return reply(429,'Muitas tentativas. Aguarde antes de tentar novamente.');}
   let body=req.body;
   if(typeof body==='string'){if(Buffer.byteLength(body)>8192)return reply(413,'Pedido muito grande.');try{body=JSON.parse(body);}catch{return reply(400,'Dados inválidos.');}}
   if(Buffer.byteLength(JSON.stringify(body??{}))>8192)return reply(413,'Pedido muito grande.');
   const parsed=bookingSchema.safeParse(body);
   if(!parsed.success)return reply(400,'Verifique o serviço, horário e consentimento.');
   const b=parsed.data;
   if(b.website)return reply(400,'Não foi possível validar o pedido.');
   const captcha=await verifyCaptcha(c.captchaSecret,b.token,ip);
   if(!captcha.success||captcha.hostname!==new URL(origin).hostname||captcha.action!=='booking')return reply(403,'A verificação de segurança expirou. Faça novamente.');
   const auth=String(req.headers.authorization||'');
   if(!auth.startsWith('Bearer '))return reply(401,'Entre na sua conta para agendar.');
   const {data:{user},error:authError}=await service.auth.getUser(auth.slice(7));
   if(authError||!user?.email_confirmed_at)return reply(401,'Entre com sua conta e confirme seu e-mail.');
   const saved=await service.rpc('submit_booking_request',{customer:user.id,procedure:b.procedure,professional:b.professional,selected_time:b.starts_at,consent:true,request_key:b.request_key});
   if(saved.error){
    if(saved.error.message?.includes('Cadastro de cliente'))return reply(403,'Complete seu cadastro na área do cliente.');
    if(saved.error.message?.includes('já enviou'))return reply(429,'Você já enviou um pedido. Aguarde o contato da equipe.');
    if(saved.error.message?.includes('Horário indisponível'))return reply(409,'O horário não está mais disponível. Escolha outro.');
    return reply(503,'Não foi possível registrar o pedido. Tente novamente mais tarde.');
   }
   return reply(200);
  }catch{return reply(503,'Agendamento temporariamente indisponível. Tente novamente mais tarde.');}
 };
}
