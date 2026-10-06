import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {validateConnection,publicSupabaseKey} from '../src/shared/store-connection.js';
process.loadEnvFile('.env.local');
const url=process.env.VITE_SUPABASE_URL;
if(!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local DB only');
const key=process.env.VITE_SUPABASE_ANON_KEY;
const svc=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const anon=()=>createClient(url,key,{auth:{persistSession:false}});
const ok=async q=>{const {data,error}=await q;assert.ifError(error);return data;};
const connection={version:1,application:'quartier-clinic',name:'Clínica de teste',site_url:'https://clinica.example',project_url:'https://exampleproject.supabase.co',publishable_key:key};
test('Store JSON rejects administrative secrets, credential URLs and unsupported integrations',()=>{
 assert.equal(validateConnection(connection).name,'Clínica de teste');
 assert.equal(publicSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY),false);
 for(const value of [{...connection,publishable_key:process.env.SUPABASE_SERVICE_ROLE_KEY},{...connection,publishable_key:'sb_secret_abcdefgh123456789'},{...connection,project_url:'https://project.supabase.co.evil.example'},{...connection,project_url:'https://project.supabase.co/rest/v1/'},{...connection,site_url:'https://name:password@site.example'},{...connection,site_url:'javascript:alert(1)'},{...connection,token:'secret'},{...connection,application:'another-site'},{...connection,project_url:url}])assert.throws(()=>validateConnection(value));
 assert.equal(validateConnection({...connection,project_url:url},{allowLocal:true}).project_url,url);
});
test('Registry rows belong to their central owner; customers cannot register projects or promote themselves',async()=>{
 const ids=[],accounts=[];const password=randomBytes(20).toString('hex');
 try{
  for(let i=0;i<3;i++){
   const email=`store-registry-${Date.now()}-${i}@example.invalid`;const {user}=await ok(svc.auth.admin.createUser({email,password,email_confirm:true}));ids.push(user.id);
   if(i<2)await ok(svc.from('users').insert({id:user.id,name:'Central owner '+i,role:'admin'}));
   const account=anon();await ok(account.auth.signInWithPassword({email,password}));accounts.push(account);
  }
  const {version,application,...values}=connection;
  const row=await ok(accounts[0].from('store_connections').insert(values).select().single());
  assert.equal(row.owner_id,ids[0]);assert.equal((await ok(accounts[1].from('store_connections').select('*').eq('id',row.id))).length,0);
  assert.equal((await ok(accounts[1].from('store_connections').update({name:'Hijacked'}).eq('id',row.id).select())).length,0);
  assert.equal((await ok(accounts[1].from('store_connections').delete().eq('id',row.id).select())).length,0);
  assert.ok((await accounts[1].from('store_connections').insert({...values,owner_id:ids[0]})).error);
  assert.ok((await accounts[2].from('store_connections').insert(values)).error);
  assert.ok((await accounts[0].from('store_connections').insert({...values,project_url:'https://secret-test.supabase.co',publishable_key:process.env.SUPABASE_SERVICE_ROLE_KEY})).error);
  const anonymous=await anon().from('store_connections').select('*');assert.ok(anonymous.error||anonymous.data.length===0);
  await ok(accounts[0].from('store_connections').delete().eq('id',row.id));assert.equal((await ok(accounts[0].from('store_connections').select('*').eq('id',row.id))).length,0);
 }finally{if(ids.length){await svc.from('store_connections').delete().in('owner_id',ids);await svc.from('users').delete().in('id',ids);for(const id of ids)await svc.auth.admin.deleteUser(id);}}
});
