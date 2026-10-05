import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
const url=process.env.VITE_SUPABASE_URL;if(!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local DB only');
const service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ok=async q=>{const{data,error}=await q;if(error)throw Error(error.message);return data;};
const email=`browser-customer-${Date.now()}@example.invalid`,password=randomBytes(20).toString('hex');let uid,cid,procedure,professional,settings,hero,mediaPath;
test.beforeAll(async()=>{
 settings=await ok(service.from('settings').select('*').single());hero=await ok(service.from('site_content').select('*').eq('section','hero').maybeSingle());
 await ok(service.from('settings').update({booking_enabled:true,turnstile_site_key:'browser-test-public-key',booking_days:[0,1,2,3,4,5,6]}).eq('id',true));
 uid=(await ok(service.auth.admin.createUser({email,password,email_confirm:true}))).user.id;
 professional=(await ok(service.from('professionals').insert({name:'Browser public professional',published:true,active:true}).select('id').single())).id;
 procedure=(await ok(service.from('procedures').insert({name:'Browser public service',description:'Visible from admin',duration:60,price:150,published:true,active:true,photo_url:'/assets/hero.png'}).select('id').single())).id;
 await ok(service.from('procedure_professionals').insert({procedure_id:procedure,professional_id:professional}));
});
test.afterAll(async()=>{
 await service.from('booking_requests').delete().eq('customer_id',uid);if(cid){await service.from('appointments').delete().eq('client_id',cid);await service.from('customer_accounts').delete().eq('user_id',uid);await service.from('clients').delete().eq('id',cid);}await service.auth.admin.deleteUser(uid);
 if(mediaPath)await service.storage.from('site-media').remove([mediaPath]);
 await service.from('procedures').delete().eq('id',procedure);await service.from('professionals').delete().eq('id',professional);
 await service.from('settings').update({booking_enabled:settings.booking_enabled,turnstile_site_key:settings.turnstile_site_key,booking_days:settings.booking_days}).eq('id',true);
 if(hero)await service.from('site_content').upsert(hero);else await service.from('site_content').delete().eq('section','hero');
});
async function adminLogin(page){await page.goto('/admin/login');await page.getByLabel('E-mail',{exact:false}).fill(process.env.DEMO_ADMIN_EMAIL);await page.getByLabel('Senha',{exact:false}).fill(process.env.DEMO_ADMIN_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:false}).click();await expect(page.locator('.metrics')).toBeVisible();}
test('Customer completes private profile, submits a request and sees admin approval',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/cliente');await page.getByLabel('E-mail',{exact:false}).fill(email);await page.getByLabel('Senha',{exact:false}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Complete seu cadastro'})).toBeVisible();await page.getByLabel('Nome completo').fill('Browser Customer');await page.getByLabel('WhatsApp com DDD').fill('11988776655');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Concluir cadastro'}).click();await expect(page.getByRole('heading',{name:'Olá, Browser.'})).toBeVisible();
 await page.goto('/');await expect(page.locator('#header-account')).toHaveText('Meu perfil · Browser');const book=page.locator('.header-actions .header-cta'),account=page.locator('#header-account');expect((await book.boundingBox()).x).toBeLessThan((await account.boundingBox()).x);await book.click();await expect(page.getByRole('heading',{name:'Agendar uma avaliação.'})).toBeVisible();await page.goto('/');await page.locator('#header-account').click();await expect(page.getByRole('tablist',{name:'Meu perfil'})).toBeVisible();
 cid=(await ok(service.from('customer_accounts').select('client_id').eq('user_id',uid).single())).client_id;
 await page.getByRole('link',{name:'Agendar avaliação',exact:true}).click();for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}await page.setViewportSize({width:1440,height:1000});await page.getByRole('combobox',{name:'Serviço',exact:true}).selectOption(procedure);await page.getByRole('combobox',{name:'Profissional',exact:true}).selectOption(professional);
 const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10);await page.getByLabel('Dia',{exact:true}).fill(day);await expect(page.locator('select[name=starts_at] option')).not.toHaveCount(1);await page.locator('select[name=starts_at]').selectOption({index:1});await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Enviar pedido para aprovação'}).click();await expect(page.getByRole('heading',{name:'Pedido recebido!'})).toBeVisible();await page.getByRole('link',{name:'Ver meus agendamentos',exact:false}).click();await expect(page.locator('main')).toContainText('Browser public service');
 const staff=await page.context().browser().newPage();await adminLogin(staff);await staff.goto('/admin/solicitacoes');const row=staff.getByRole('row').filter({hasText:'Browser Customer'});await row.getByRole('button',{name:'Aprovar',exact:true}).click();await staff.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(staff.getByRole('dialog')).toHaveCount(0);await staff.close();await page.getByRole('button',{name:'Atualizar',exact:true}).click();await expect(page.locator('main')).toContainText('Confirmado');expect(errors).toEqual([]);
});
test('Admin reopens paused booking and the customer can immediately choose a service',async({page})=>{
 await ok(service.from('settings').update({booking_enabled:false}).eq('id',true));
 const staff=await page.context().browser().newPage();
 try{
  await page.goto('/cliente/agendar');await page.getByLabel('E-mail',{exact:false}).fill(email);await page.getByLabel('Senha',{exact:false}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('heading',{name:'Agendamentos online pausados'})).toBeVisible();
  await adminLogin(staff);await staff.goto('/admin/configuracoes');await expect(staff.getByRole('heading',{name:'O que falta para abrir a agenda'})).toBeVisible();await staff.getByRole('button',{name:'Ativar agendamentos online'}).click();await expect(staff.getByRole('heading',{name:'Sua agenda está aberta no site'})).toBeVisible();
  await page.getByRole('button',{name:'Verificar novamente'}).click();await expect(page.getByRole('combobox',{name:'Serviço',exact:true})).toBeVisible();await page.getByRole('combobox',{name:'Serviço',exact:true}).selectOption(procedure);
  await expect(page.locator('select[name=professional]')).toContainText('Browser public professional');
  await page.getByRole('combobox',{name:'Profissional',exact:true}).selectOption(professional);const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10);await page.getByLabel('Dia',{exact:true}).fill(day);await expect(page.locator('select[name=starts_at] option')).not.toHaveCount(1);await page.locator('select[name=starts_at]').selectOption({index:1});await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Enviar pedido para aprovação'}).click();await expect(page.getByRole('heading',{name:'Pedido recebido!'})).toBeVisible();
  // Clean this extra pending request so the history assertions remain independent.
  await ok(service.from('booking_requests').delete().eq('customer_id',uid).eq('status','pending'));await page.goto('/cliente/agendar');

  // A published treatment without a published assigned professional is not bookable.
  await ok(service.from('procedure_professionals').delete().eq('procedure_id',procedure).eq('professional_id',professional));await page.reload();await expect(page.locator(`select[name=procedure] option[value="${procedure}"]`)).toHaveCount(0);
 }finally{await staff.close();await service.from('settings').update({booking_enabled:true}).eq('id',true);await service.from('procedure_professionals').upsert({procedure_id:procedure,professional_id:professional});}
});
test('Customer tabs preserve selection, show each appointment once, and fit mobile',async({page})=>{
 await page.goto('/cliente');await page.getByLabel('E-mail',{exact:false}).fill(email);await page.getByLabel('Senha',{exact:false}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('tab',{name:'Visão geral'})).toHaveAttribute('aria-selected','true');
 await page.getByRole('tab',{name:'Agendamentos',exact:false}).click();await expect(page.getByRole('tabpanel')).toContainText('Confirmado');await expect(page.getByRole('tabpanel').getByRole('heading',{name:'Browser public service',exact:true})).toHaveCount(1);
 await page.getByRole('button',{name:'Histórico',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('Seu histórico começa');
 await page.getByRole('tab',{name:'Acompanhamento',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('Cada etapa merece ser acompanhada');
 await page.getByRole('tab',{name:'Acompanhamento',exact:true}).press('ArrowRight');await expect(page.getByRole('tab',{name:'Meus dados'})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('tabpanel')).toContainText(email);await page.reload();await expect(page.getByRole('tab',{name:'Meus dados'})).toHaveAttribute('aria-selected','true');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});for(const label of ['Visão geral','Agendamentos','Acompanhamento','Meus dados']){await page.getByRole('tab',{name:label,exact:false}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}}
 const appointment=(await ok(service.from('appointments').select('id,starts_at,ends_at').eq('client_id',cid)))[0];
 try{await ok(service.from('appointments').update({starts_at:new Date(new Date(appointment.starts_at).getTime()+3600000).toISOString()}).eq('id',appointment.id));await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByRole('tab',{name:'Agendamentos',exact:false}).click();await expect(page.getByRole('tabpanel').getByRole('heading',{name:'Browser public service',exact:true})).toHaveCount(1);}finally{await service.from('appointments').update({starts_at:appointment.starts_at}).eq('id',appointment.id);}
 await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();await expect(page.locator('main')).not.toContainText(email);
});
test('Private photos load only in their tab and are revoked when leaving or refreshing access',async({page})=>{
 const photo=randomUUID(),path=cid+'/'+photo+'.webp';let downloads=0;
 await ok(service.storage.from('evolution').upload(path,readFileSync('public/assets/clinica-sala.webp'),{contentType:'image/webp'}));await ok(service.from('evolution_photos').insert({id:photo,client_id:cid,procedure_id:procedure,category:'progress',object_path:path,customer_visible:true}));
 try{
  page.on('request',request=>{if(request.url().includes('/evolution/'))downloads++;});
  await page.goto('/cliente');await page.getByLabel('E-mail',{exact:false}).fill(email);await page.getByLabel('Senha',{exact:false}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('tab',{name:'Visão geral'})).toBeVisible();expect(downloads).toBe(0);
  await page.getByRole('tab',{name:'Acompanhamento',exact:true}).click();const image=page.locator('.account-photo img');await expect(image).toBeVisible();await image.evaluate(img=>img.decode());const firstUrl=await image.getAttribute('src');expect(firstUrl).toMatch(/^blob:/);expect(downloads).toBe(1);
  await page.getByRole('button',{name:'Ampliar foto',exact:false}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Fechar foto'}).click();await page.getByRole('tab',{name:'Meus dados'}).click();expect(await page.evaluate(async url=>{try{await fetch(url);return true;}catch{return false;}},firstUrl)).toBe(false);
  await page.getByRole('tab',{name:'Acompanhamento',exact:true}).click();await expect(image).toBeVisible();await ok(service.from('evolution_photos').update({customer_visible:false}).eq('id',photo));await page.getByRole('button',{name:'Atualizar',exact:true}).click();await expect(page.locator('.account-photo')).toHaveCount(0);await expect(page.getByRole('tabpanel')).toContainText('Cada etapa merece ser acompanhada');
 }finally{await service.from('evolution_photos').delete().eq('id',photo);await service.storage.from('evolution').remove([path]);}
});
test('Admin publishes cover text and treatment edits, and hidden services stay hidden',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await adminLogin(page);await page.goto('/admin/site');await page.getByLabel('Título principal').fill('Cuidado publicado pelo painel');await page.getByRole('button',{name:'Salvar e publicar seção'}).click();await expect(page.locator('.toast')).toContainText('Seção publicada');
 await page.goto('/');await expect(page.locator('#hero-title')).toHaveText('Cuidado publicado pelo painel');await expect(page.locator('#procedure-desktop')).toContainText('Browser public service');
 await ok(service.from('procedures').update({published:false}).eq('id',procedure));await page.reload();await expect(page.locator('#about-content .media').first()).toBeVisible();await expect(page.locator('#procedure-desktop')).not.toContainText('Browser public service');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 expect(errors).toEqual([]);
});

test('Admin uploads a public procedure photo and the website displays it',async({page})=>{
 await adminLogin(page);await page.goto('/admin/procedimentos');
 const row=page.getByRole('row').filter({hasText:'Browser public service'});await row.getByRole('button',{name:'Editar',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.locator('input[type=file]').setInputFiles('public/assets/sobre-detalhe.webp');
 await expect(dialog.locator('[name=photo_url]')).toHaveValue(/storage\/v1\/object\/public\/site-media\//);
 const src=await dialog.locator('[name=photo_url]').inputValue();mediaPath=src.split('/').at(-1);
 await dialog.locator('[name=published]').selectOption('true');await dialog.getByRole('button',{name:'Salvar',exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.goto('/');await page.getByRole('tab',{name:/Browser public service/}).click();

 const image=page.locator(`#procedure-desktop img[src="${src}"]`);await expect(image).toBeVisible();await image.evaluate(img=>img.decode());expect(await image.evaluate(img=>img.naturalWidth>0)).toBe(true);
});

test('Booking opens login, login and signup layouts fit mobile, and WhatsApp is icon only',async({page})=>{
 await page.goto('/');await expect(page.locator('#header-account')).toHaveText('Entrar');await page.locator('.header-actions .header-cta').click();await expect(page).toHaveURL(/cliente\/agendar/);await expect(page.locator('main')).toContainText('Entre na sua conta para agendar');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('tab',{name:'Criar conta'}).click();await expect(page.getByLabel('Nome completo')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('tab',{name:'Entrar'}).click();}
 await page.goto('/');expect(await page.locator('[data-whatsapp]').count()).toBe(1);const wa=page.locator('.floating-wa');await expect(wa).toHaveAttribute('aria-label','Falar pelo WhatsApp');expect((await wa.textContent()).trim()).toBe('');let popupUrl;await page.evaluate(()=>{window.open=(url)=>{window.__whatsappUrl=url;};});await page.locator('#contato').scrollIntoViewIfNeeded();await expect(wa).toBeVisible();await wa.click();popupUrl=await page.evaluate(()=>window.__whatsappUrl);expect(popupUrl).toMatch(/^https:\/\/wa\.me\/\d{10,15}\?text=/);
});
