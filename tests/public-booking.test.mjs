import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID,randomBytes} from 'node:crypto';import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');const url=process.env.VITE_SUPABASE_URL; if(!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local DB only');
const svc=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});const anon=()=>createClient(url,process.env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
const ok=async q=>{const{data,error}=await q;assert.ifError(error);return data;};
test('Registered customers book privately; approval is atomic and rate limits resist concurrency',async()=>{
 const suffix=Date.now();const password=randomBytes(20).toString('hex');const ids=[],clients=[];let professional,procedure,photoId,settings;
 const admin=anon();await ok(admin.auth.signInWithPassword({email:process.env.DEMO_ADMIN_EMAIL,password:process.env.DEMO_ADMIN_PASSWORD}));
 try{
  settings=await ok(svc.from('settings').select('*').single());await ok(svc.from('settings').update({booking_enabled:true,booking_days:[0,1,2,3,4,5,6],booking_open:'09:00',booking_close:'19:00'}).eq('id',true));
  professional=await ok(admin.rpc('save_professional',{professional:null,details:{name:'Portal test '+suffix,email:'portal-staff-'+suffix+'@example.invalid',active:true,published:true,bio:'Public bio',education:'Public education'},access_role:'professional'}));
  procedure=await ok(admin.rpc('save_procedure',{procedure:null,details:{name:'Portal procedure '+suffix,description:'Public description',duration:60,price:100,category:'Facial',active:true,published:true,photo_url:'/assets/hero.png',photo_alt:'Clinic photo'},professionals:[professional]}));
  const customers=[];
  for(let i=0;i<2;i++){
   const email=`portal-${suffix}-${i}@example.invalid`;const{user}=await ok(svc.auth.admin.createUser({email,password,email_confirm:true}));ids.push(user.id);const account=anon();await ok(account.auth.signInWithPassword({email,password}));const cid=await ok(account.rpc('register_customer',{full_name:`Customer ${i}`,phone:'1198765000'+i,consent:true}));clients.push(cid);customers.push(account);
   assert.equal(await ok(account.rpc('is_admin')),false);assert.equal((await ok(account.from('clients').select('*'))).length,0);assert.equal((await ok(account.from('customer_accounts').select('*'))).length,1);
   assert.equal((await ok(account.rpc('customer_portal'))).client.id,cid);
   assert.equal(await ok(account.rpc('register_customer',{full_name:'Changed',phone:'11987650009',consent:true})),cid);
  }
  const cat=await ok(anon().rpc('public_catalog'));assert.ok(cat.procedures.some(p=>p.id===procedure));assert.ok(!('email' in cat.professionals.find(p=>p.id===professional)));
  const day=new Date(Date.now()+86400000*3).toISOString().slice(0,10);let slots=await ok(anon().rpc('public_booking_slots',{procedure,professional,chosen_day:day}));assert.ok(slots.length>0);const selected_time=slots[0].starts_at;
  assert.ok((await anon().rpc('submit_customer_booking',{procedure,professional,selected_time,consent:true,request_key:randomUUID()})).error);
  const key=randomUUID();const request=await ok(customers[0].rpc('submit_customer_booking',{procedure,professional,selected_time,consent:true,request_key:key}));
  assert.equal(await ok(svc.rpc('submit_booking_request',{customer:ids[0],procedure,professional,selected_time,consent:true,request_key:key})),request);
  assert.ok((await svc.rpc('submit_booking_request',{customer:ids[0],procedure,professional,selected_time,consent:true,request_key:randomUUID()})).error);
  assert.ok((await customers[0].rpc('submit_booking_request',{customer:ids[0],procedure,professional,selected_time,consent:true,request_key:randomUUID()})).error);
  assert.ok((await customers[0].rpc('review_booking_request',{request_id:request,decision:'approved'})).error);
  const denied=await anon().from('booking_requests').select('*');assert.ok(denied.error||denied.data.length===0);
  assert.equal((await ok(customers[1].rpc('customer_portal'))).requests.length,0);
  await ok(svc.from('clients').update({whatsapp:'11987650000'}).eq('id',clients[1]));
  assert.ok((await svc.rpc('submit_booking_request',{customer:ids[1],procedure,professional,selected_time,consent:true,request_key:randomUUID()})).error);
  await ok(svc.from('clients').update({whatsapp:'11987650001'}).eq('id',clients[1]));
  const other=await ok(svc.rpc('submit_booking_request',{customer:ids[1],procedure,professional,selected_time,consent:true,request_key:randomUUID()}));
  const results=await Promise.all([admin.rpc('review_booking_request',{request_id:request,decision:'approved'}),admin.rpc('review_booking_request',{request_id:other,decision:'approved'})]);assert.equal(results.filter(r=>!r.error).length,1);assert.equal(results.filter(r=>r.error).length,1);
  const appointments=await ok(svc.from('appointments').select('*').eq('professional_id',professional));assert.equal(appointments.length,1);assert.equal(appointments[0].status,'confirmed');
  slots=await ok(anon().rpc('public_booking_slots',{procedure,professional,chosen_day:day}));assert.ok(!slots.some(s=>s.starts_at===selected_time));
  const winner=results[0].error?1:0;assert.equal((await ok(customers[winner].rpc('customer_portal'))).appointments.length,1);
  // Real private photo download: customer sees only their own explicitly released photo.
  photoId=randomUUID();const path=clients[0]+'/'+photoId+'.webp';await ok(svc.storage.from('evolution').upload(path,new Uint8Array([82,73,70,70]),{contentType:'image/webp'}));
  await ok(svc.from('evolution_photos').insert({id:photoId,client_id:clients[0],procedure_id:procedure,category:'progress',object_path:path,customer_visible:false}));
  assert.ok((await customers[0].storage.from('evolution').download(path)).error);await ok(admin.rpc('set_customer_photo_visibility',{photo:photoId,visible:true}));
  assert.equal((await ok(customers[0].rpc('customer_portal'))).photos.length,1);assert.equal((await ok(customers[1].rpc('customer_portal'))).photos.length,0);assert.ok(!(await customers[0].storage.from('evolution').download(path)).error);assert.ok((await customers[1].storage.from('evolution').download(path)).error);
  assert.ok((await customers[1].rpc('set_customer_photo_visibility',{photo:photoId,visible:true})).error);
  await ok(admin.rpc('set_customer_photo_visibility',{photo:photoId,visible:false}));
  assert.ok((await customers[0].storage.from('evolution').download(path)).error);
  assert.equal((await ok(customers[0].rpc('customer_portal'))).photos.length,0);
  await ok(admin.rpc('save_procedure',{procedure,details:{name:'Portal procedure '+suffix,description:'Hidden',duration:60,price:100,category:'Facial',active:true,published:false},professionals:[professional]}));assert.ok(!(await ok(anon().rpc('public_catalog'))).procedures.some(p=>p.id===procedure));
 }finally{
  if(photoId){await svc.storage.from('evolution').remove([clients[0]+'/'+photoId+'.webp']);await svc.from('evolution_photos').delete().eq('id',photoId);}
  if(ids.length){await svc.from('booking_requests').delete().in('customer_id',ids);await svc.from('customer_accounts').delete().in('user_id',ids);}
  if(professional)await svc.from('appointments').delete().eq('professional_id',professional);
  if(clients.length)await svc.from('clients').delete().in('id',clients);
  for(const id of ids)await svc.auth.admin.deleteUser(id);
  if(procedure)await svc.from('procedures').delete().eq('id',procedure);if(professional)await svc.from('professionals').delete().eq('id',professional);
  if(settings)await svc.from('settings').update({booking_enabled:settings.booking_enabled,booking_days:settings.booking_days,booking_open:settings.booking_open,booking_close:settings.booking_close}).eq('id',true);
 }
});

test('Signup metadata creates a customer in the admin list without staff privileges',async()=>{
 const {user}=await ok(svc.auth.admin.createUser({email:`new-customer-${Date.now()}@example.invalid`,password:randomBytes(20).toString('hex'),email_confirm:false,user_metadata:{full_name:'Novo cliente do site',phone:'11955556666',customer_consent:true,role:'admin'}}));
 let cid;try{
  const account=await ok(svc.from('customer_accounts').select('*').eq('user_id',user.id).single());cid=account.client_id;
  const admin=anon();await ok(admin.auth.signInWithPassword({email:process.env.DEMO_ADMIN_EMAIL,password:process.env.DEMO_ADMIN_PASSWORD}));
  const client=await ok(admin.from('clients').select('name,whatsapp').eq('id',cid).single());assert.equal(client.name,'Novo cliente do site');
  assert.equal((await ok(svc.from('users').select('*').eq('id',user.id))).length,0);
 }finally{await svc.from('customer_accounts').delete().eq('user_id',user.id);if(cid)await svc.from('clients').delete().eq('id',cid);await svc.auth.admin.deleteUser(user.id);}
});
