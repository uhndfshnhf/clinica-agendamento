import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {readFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.env.test.local'))process.loadEnvFile('.env.test.local');
const service=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ok=async q=>{const {data,error}=await q;if(error)throw Error(error.message);return data;};
const secondSite=process.env.SECOND_SITE_URL||'http://127.0.0.1:5178';
let owner,connections=[];
async function login(page,email=process.env.DEMO_ADMIN_EMAIL,password=process.env.DEMO_ADMIN_PASSWORD){await page.getByLabel('E-mail',{exact:false}).fill(email);await page.getByLabel('Senha',{exact:false}).fill(password);await page.getByRole('button',{name:'Entrar',exact:false}).click();}
async function addStore(page,descriptor){await page.getByRole('button',{name:'+ Adicionar sua loja'}).click();const dialog=page.getByRole('dialog');await dialog.locator('[data-import-store]').setInputFiles({name:'conexao.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(descriptor))});await expect(dialog.locator('[data-import-status]')).toContainText('Arquivo compatível');await dialog.getByRole('button',{name:'Adicionar loja',exact:true}).click();await expect(dialog).toHaveCount(0);connections.push(descriptor.project_url);}
test.beforeAll(async()=>{const {data}=await service.auth.admin.listUsers();owner=data.users.find(u=>u.email===process.env.DEMO_ADMIN_EMAIL)?.id;});
test.afterAll(async()=>{if(owner&&connections.length)await service.from('store_connections').delete().eq('owner_id',owner).in('project_url',connections);});
test('Export/import connects a compatible site, preserves staff access and removes only the registry link',async({page})=>{
 await page.goto('/admin/login');await login(page);await expect(page.locator('.metrics')).toBeVisible();await page.goto('/admin/conectar');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar JSON de conexão'}).click();const file=await download;const descriptor=JSON.parse(readFileSync(await file.path(),'utf8'));expect(descriptor.application).toBe('quartier-clinic');expect(descriptor.project_url).toBe(process.env.VITE_SUPABASE_URL);expect(Object.keys(descriptor).sort()).toEqual(['application','name','project_url','publishable_key','site_url','version']);
 await page.getByRole('link',{name:'Minhas lojas',exact:true}).click();await expect(page.getByRole('heading',{name:'Minhas lojas'})).toBeVisible();descriptor.name='Clínica A de teste';await addStore(page,descriptor);const card=page.locator('.store-card').filter({hasText:'Clínica A de teste'});await card.getByRole('button',{name:'Abrir painel',exact:false}).click();await expect(page.locator('.metrics')).toBeVisible();await page.reload();await expect(page.locator('.metrics')).toBeVisible();await page.getByRole('link',{name:'Minhas lojas',exact:true}).click();
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('button',{name:'+ Adicionar sua loja'}).click();let dialog=page.getByRole('dialog');await dialog.locator('[data-import-store]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...descriptor,publishable_key:'sb_secret_example_not_allowed'}))});await expect(dialog.locator('[data-import-status]')).toContainText('Chaves secretas');await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
 await card.getByRole('button',{name:'Remover conexão',exact:false}).click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.locator('.store-card').filter({hasText:'Clínica A de teste'})).toHaveCount(0);expect((await ok(service.from('settings').select('id'))).length).toBe(1);
});
test('Separate clinic databases and Auth services keep data and permissions independent',async({page})=>{
 test.skip(!process.env.SECOND_SUPABASE_URL,'Second local Supabase unavailable');
 if(!['localhost','127.0.0.1'].includes(new URL(process.env.SECOND_SUPABASE_URL).hostname))throw Error('Use a local second database for this destructive fixture test.');
 const remote=createClient(process.env.SECOND_SUPABASE_URL,process.env.SECOND_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const password=randomBytes(20).toString('hex'),email=`remote-owner-${Date.now()}@example.invalid`;const user=(await ok(remote.auth.admin.createUser({email,password,email_confirm:true}))).user;let customer,settings;
 try{
  await ok(remote.from('users').insert({id:user.id,name:'Remote Administrator',role:'admin'}));settings=await ok(remote.from('settings').select('*').single());await ok(remote.from('settings').update({name:'Clínica B independente'}).eq('id',true));
  customer=await ok(remote.from('clients').insert({name:'Cliente exclusivo da clínica B',whatsapp:'11944443333'}).select('id').single());
  expect((await ok(service.from('clients').select('id').eq('id',customer.id))).length).toBe(0);
  await page.goto('/admin/login');await login(page);await expect(page.locator('.metrics')).toBeVisible();await page.getByRole('link',{name:'Minhas lojas',exact:true}).click();
  await addStore(page,{version:1,application:'quartier-clinic',name:'Clínica B independente',site_url:secondSite,project_url:process.env.SECOND_SUPABASE_URL,publishable_key:process.env.SECOND_SUPABASE_ANON_KEY});
  const card=page.locator('.store-card').filter({hasText:'Clínica B independente'});await card.getByRole('button',{name:'Abrir painel',exact:false}).click();await expect(page.locator('.store-login-context')).toContainText('Clínica B independente');
  await login(page);await expect(page.getByRole('alert')).not.toBeEmpty();await expect(page.locator('.metrics')).toHaveCount(0);
  await login(page,email,password);await expect(page.locator('.metrics')).toBeVisible();await expect(page.locator('.clinic-name')).toHaveText('Clínica B independente');
  await page.goto('/admin/clientes');await expect(page.locator('main')).toContainText('Cliente exclusivo da clínica B');
  await page.goto('/admin/configuracoes');await page.getByLabel('Nome da clínica',{exact:false}).fill('Clínica B editada pela central');await page.getByRole('button',{name:'Salvar configurações'}).click();await expect(page.locator('.clinic-name')).toHaveText('Clínica B editada pela central');
  expect((await ok(service.from('settings').select('name').single())).name).not.toBe('Clínica B editada pela central');
  const publicPage=await page.context().browser().newPage();await publicPage.goto(secondSite+'/');await expect(publicPage).toHaveTitle(/Clínica B editada pela central/);await publicPage.close();
  await page.getByRole('link',{name:'Minhas lojas',exact:true}).click();await expect(page.getByRole('heading',{name:'Minhas lojas'})).toBeVisible();await page.locator('.store-card').filter({hasText:'CLÍNICA ATUAL'}).getByRole('button',{name:'Abrir painel',exact:false}).click();await expect(page.locator('.clinic-name')).not.toHaveText('Clínica B editada pela central');await page.goto('/admin/clientes');await expect(page.locator('main')).not.toContainText('Cliente exclusivo da clínica B');
 }finally{if(customer)await remote.from('clients').delete().eq('id',customer.id);await remote.from('users').delete().eq('id',user.id);await remote.auth.admin.deleteUser(user.id);if(settings)await remote.from('settings').update({name:settings.name}).eq('id',true);}
});
