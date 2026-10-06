import {centralDB,projectURL,publishableKey,siteURL,panelMode,result} from '../supabase.js';
import {validateConnection,connectionJSON} from '../shared/store-connection.js';
import {esc,field,modal,toast,confirmAction,errorText,icon} from './ui.js';

export function downloadConnection(value) {
 const url=URL.createObjectURL(new Blob([JSON.stringify(connectionJSON(value),null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='conexao-painel.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function renderStoreCenter(root,{user,settings,onOpen,onSignOut,isCurrent=()=>true}) {
 let stores=[],available=true;
 const response=await centralDB.from('store_connections').select('*').order('created_at',{ascending:false});
 if(!isCurrent())return;
 if(response.error) available=false;
 else stores=response.data.filter(store=>{try{validateConnection(connectionJSON(store),{allowLocal:import.meta.env.DEV});return true;}catch{return false;}});
 const localStore={id:'default',name:settings.name,site_url:siteURL,project_url:projectURL,publishable_key:publishableKey};
 const cards=[...(!panelMode&&!stores.some(s=>s.project_url===projectURL)?[localStore]:[]),...stores];
 root.innerHTML=`<div class="store-center"><header class="store-center-header"><a class="wordmark" href="/admin/lojas">Q <span>CENTRAL<small>SUAS CLÍNICAS, UM SÓ PAINEL</small></span></a><div><span>${esc(user.name)}</span><button class="btn ghost" id="center-logout">Sair da central</button></div></header><main class="store-center-main"><div class="page-heading"><div><p class="eyebrow">SEU NEGÓCIO, EM UM SÓ LUGAR</p><h1>Minhas lojas</h1><p class="muted">Abra uma clínica para gerenciar o site, a equipe e os agendamentos.</p></div><button class="btn primary" id="add-store" ${available?'':'disabled'}>+ Adicionar sua loja</button></div>${!available?'<section class="panel"><div class="panel-body"><h2>Ativação da central pendente</h2><p>Aplique a atualização da Central de lojas no Supabase do painel para cadastrar conexões. O painel da clínica atual continua disponível.</p><button class="btn secondary" id="retry-center">Verificar novamente</button></div></section>':''}<div class="store-grid">${cards.map(s=>`<article class="store-card"><span class="store-mark">${esc(s.name[0].toUpperCase())}</span><div><p class="eyebrow">${s.id==='default'?'CLÍNICA ATUAL':'SITE CONECTADO'}</p><h2>${esc(s.name)}</h2><p>${esc(new URL(s.site_url).host)}</p></div><div class="store-card-actions"><button class="btn primary" data-open-store="${s.id}">Abrir painel ${icon('arrow')}</button><a class="btn secondary" href="${esc(s.site_url)}" target="_blank" rel="noopener noreferrer">Ver site</a>${s.id!=='default'?`<button class="btn ghost" data-edit-store="${s.id}" aria-label="Editar conexão de ${esc(s.name)}">Editar</button><button class="btn ghost" data-remove-store="${s.id}" aria-label="Remover conexão de ${esc(s.name)}">Remover</button>`:''}</div></article>`).join('')||'<section class="store-empty"><span>+</span><h2>Sua primeira loja começa aqui.</h2><p>Importe o JSON de um site compatível ou informe os dados públicos do projeto.</p></section>'}</div><section class="store-explainer"><h2>Do site ao painel, em três passos.</h2><div><p><strong>01 · Exporte a conexão</strong>No painel da clínica, abra Conectar ao painel e baixe o JSON.</p><p><strong>02 · Adicione sua loja</strong>Importe o arquivo e confira o nome e o endereço do site.</p><p><strong>03 · Entre na clínica</strong>Use a conta da equipe autorizada no projeto daquela clínica.</p></div><small>Cada clínica usa seu próprio Supabase. O JSON identifica o projeto; o acesso continua protegido pela conta da equipe.</small></section></main></div>`;
 const redraw=()=>renderStoreCenter(root,{user,settings,onOpen,onSignOut,isCurrent});
 root.querySelector('#center-logout').onclick=onSignOut;
 root.querySelector('#retry-center')?.addEventListener('click',redraw);
 function connectionForm(existing={}) {
  const d=modal(existing.id?'Editar conexão':'Adicionar sua loja',`<div class="wide store-import"><label>Importar JSON de conexão<input type="file" accept=".json,application/json" data-import-store></label><small>Somente configurações públicas. Não envie senhas, tokens de acesso ou chaves secretas.</small><p role="status" data-import-status></p></div>${field('name','Nome da loja','text',existing.name||'',{required:true,wide:true,maxLength:160})}${field('site_url','URL do site','url',existing.site_url||'',{required:true,wide:true})}${field('project_url','URL do projeto Supabase','url',existing.project_url||'',{required:true,wide:true})}${field('publishable_key','Chave pública publishable ou anon','text',existing.publishable_key||'',{required:true,wide:true,maxLength:1500})}<p class="wide muted">Conecta sites desta plataforma. Cadastrar a conexão não concede acesso à equipe nem importa pacientes.</p>`,async v=>{
   const validated=validateConnection({version:1,application:'quartier-clinic',name:v.name,site_url:v.site_url,project_url:v.project_url,publishable_key:v.publishable_key},{allowLocal:import.meta.env.DEV});
   const {version,application,...values}=validated;
   await result(existing.id?centralDB.from('store_connections').update(values).eq('id',existing.id).select().single():centralDB.from('store_connections').insert(values).select().single());
   toast('Conexão salva. Entre com a conta autorizada para abrir a clínica.');await redraw();
  },existing.id?'Salvar conexão':'Adicionar loja');
  d.querySelector('[data-import-store]').onchange=async e=>{
   const status=d.querySelector('[data-import-status]');
   try{const file=e.target.files[0];if(!file)return;if(file.size>64000)throw Error('O arquivo deve ter até 64 KB.');const value=validateConnection(JSON.parse(await file.text()),{allowLocal:import.meta.env.DEV});for(const key of ['name','site_url','project_url','publishable_key'])d.querySelector(`[name="${key}"]`).value=value[key];status.textContent='Arquivo compatível. Confira os dados e clique em Adicionar loja.';}
   catch(error){status.textContent=errorText(error);e.target.value='';}
  };
 }
 root.querySelector('#add-store').onclick=()=>connectionForm();
 root.querySelectorAll('[data-open-store]').forEach(b=>b.onclick=()=>onOpen(cards.find(s=>s.id===b.dataset.openStore)));
 root.querySelectorAll('[data-edit-store]').forEach(b=>b.onclick=()=>connectionForm(stores.find(s=>s.id===b.dataset.editStore)));
 root.querySelectorAll('[data-remove-store]').forEach(b=>b.onclick=()=>confirmAction('Remover conexão?','O site e os dados da clínica continuam no Supabase dela. Apenas o vínculo com esta central será removido.',async()=>{await result(centralDB.from('store_connections').delete().eq('id',b.dataset.removeStore));await redraw();}));
}
