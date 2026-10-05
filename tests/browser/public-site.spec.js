import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
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
 await page.goto('/');await expect(page.locator('#header-account')).toHaveText('Meu perfil · Browser');await page.locator('#header-account').click();await expect(page.getByRole('heading',{name:'Meu perfil',exact:true})).toBeVisible();
 cid=(await ok(service.from('customer_accounts').select('client_id').eq('user_id',uid).single())).client_id;
 await page.getByRole('button',{name:'Solicitar horário pelo site'}).click();await page.getByRole('combobox',{name:'Serviço',exact:true}).selectOption(procedure);await page.getByRole('combobox',{name:'Profissional',exact:true}).selectOption(professional);
 const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10);await page.getByLabel('Dia',{exact:true}).fill(day);await expect(page.locator('select[name=starts_at] option')).not.toHaveCount(1);await page.locator('select[name=starts_at]').selectOption({index:1});await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Enviar pedido para aprovação'}).click();await expect(page.getByRole('status')).toContainText('Pedido recebido');await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('button',{name:'Atualizar',exact:true}).click();await expect(page.locator('main')).toContainText('Browser public service');
 const staff=await page.context().browser().newPage();await adminLogin(staff);await staff.goto('/admin/solicitacoes');const row=staff.getByRole('row').filter({hasText:'Browser Customer'});await row.getByRole('button',{name:'Aprovar',exact:true}).click();await staff.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(staff.getByRole('dialog')).toHaveCount(0);await staff.close();await page.getByRole('button',{name:'Atualizar',exact:true}).click();await expect(page.locator('main')).toContainText('Confirmado');expect(errors).toEqual([]);
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
