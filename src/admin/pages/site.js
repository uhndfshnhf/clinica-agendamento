import {siteChrome,siteLink} from '../../shared/site-chrome.js';
import {siteURL} from '../../supabase.js';
import { dataFor } from '../data.js';
import { result } from '../data.js';
import {pageHead,field,esc,toast,errorText,safeImage} from '../ui.js';
import {mediaField,bindMedia} from '../media.js';
const linkFields=[['label','Texto do link'],['href','Destino do link','link'],['newWindow','Abrir em nova aba','boolean']];
const brandFields=[['brandName','Nome exibido na marca'],['brandSubtitle','Subtítulo da marca'],['monogram','Letra ou símbolo da marca'],['logo','Imagem do logo (opcional)','image'],['logoAlt','Descrição acessível da marca'],['brandLink','Destino do logo','link']];
const groups={
 header:{title:'Cabeçalho — marca e botões',storagePath:'header',fields:[...brandFields,['menuLabel','Descrição acessível do menu'],['menuOpenLabel','Texto acessível para abrir o menu'],['menuCloseLabel','Texto acessível para fechar o menu'],['bookingLabel','Texto do botão de agendamento'],['showBooking','Exibir botão de agendamento','boolean'],['loginLabel','Texto para entrar na conta'],['profileLabel','Texto do perfil após entrar'],['accountLabel','Texto da conta sem ficha de cliente'],['showAccount','Exibir acesso à conta','boolean'],['showClientName','Exibir primeiro nome no perfil','boolean']]},
 header_links:{title:'Cabeçalho — links do menu',storagePath:'header.links',array:true,fields:linkFields},
 footer:{title:'Rodapé — conteúdo completo',storagePath:'footer',fields:[...brandFields,['showBrand','Exibir marca no rodapé','boolean'],['brandDescription','Descrição abaixo da marca','textarea'],['navigationTitle','Título da coluna de navegação'],['navigationLabel','Descrição acessível da navegação'],['contactTitle','Título da coluna de contatos'],['useClinicContacts','Usar contatos das Configurações da clínica','boolean'],['address','Endereço próprio do rodapé','textarea'],['phone','Telefone próprio do rodapé'],['email','E-mail próprio do rodapé'],['hours','Horários próprios do rodapé','textarea'],['showAddress','Exibir endereço','boolean'],['showPhone','Exibir telefone','boolean'],['showEmail','Exibir e-mail','boolean'],['showHours','Exibir horários','boolean'],['copyright','Texto de direitos autorais (use {ano} e {clinica})','textarea'],['showCopyright','Exibir direitos autorais','boolean'],['privacyLabel','Texto do botão de privacidade'],['showPrivacy','Exibir botão de privacidade','boolean'],['termsLabel','Texto do botão de termos'],['showTerms','Exibir botão de termos','boolean'],['demoNote','Texto da nota de demonstração','textarea'],['showDemo','Exibir nota de demonstração','boolean'],['extraText','Texto adicional do rodapé','textarea']]},
 footer_links:{title:'Rodapé — links de navegação',storagePath:'footer.links',array:true,fields:linkFields},
 footer_contacts:{title:'Rodapé — links de contato e redes sociais',storagePath:'footer.contactLinks',array:true,fields:linkFields},
 copy:{title:'Títulos e chamadas das seções',fields:[['procedures','Título dos serviços'],['results','Título dos resultados'],['results_intro','Apresentação dos resultados','textarea'],['method','Título do método'],['team','Título da equipe'],['testimonials','Título dos depoimentos'],['clinic','Título da galeria'],['clinic_intro','Apresentação da galeria','textarea'],['faq','Título das perguntas'],['faq_intro','Apresentação das perguntas','textarea'],['cta','Título da chamada final'],['cta_intro','Texto da chamada final','textarea'],['contact','Título do contato']]},
 branding:{title:'Identidade e cores',fields:[['logoWord','Marca'],['tagline','Subtítulo'],['description','Descrição para buscadores','textarea'],['colors.ink','Cor dos textos','color'],['colors.nude','Cor de destaque','color'],['colors.peach','Cor dos botões','color'],['colors.cream','Cor de fundo','color'],['demo','Conteúdo demonstrativo','boolean']]},
 hero:{title:'Capa do site',fields:[['title','Título principal'],['poster','Imagem de capa','image'],['image','Imagem alternativa','image'],['video','Vídeo (URL HTTPS ou /assets/...)']]},
 about:{title:'Sobre a clínica',fields:[['title','Título'],['description','Apresentação','textarea'],['mainPhoto.src','Foto principal','image'],['mainPhoto.alt','Descrição da foto'],['detailPhoto.src','Foto de detalhe','image'],['detailPhoto.alt','Descrição do detalhe'],['facts','Destaques (um por linha)','lines']]},
 gallery:{title:'Fotos da clínica',array:true,fields:[['title','Título'],['photo.src','Foto','image'],['photo.alt','Descrição acessível']]},
 results:{title:'Resultados autorizados',array:true,fields:[['label','Título do resultado'],['before','Foto antes','image'],['after','Foto depois','image'],['beforeAlt','Descrição da foto antes'],['afterAlt','Descrição da foto depois']]},
 faq:{title:'Perguntas frequentes',array:true,fields:[['question','Pergunta'],['answer','Resposta','textarea']]},
 method:{title:'Etapas do atendimento',array:true,fields:[['title','Título'],['description','Descrição','textarea']]},
 testimonials:{title:'Depoimentos autorizados',array:true,fields:[['name','Nome público ou iniciais'],['procedure','Serviço'],['quote','Depoimento','textarea'],['stars','Estrelas (1 a 5)','number']]},
 legal:{title:'Privacidade e termos',fields:[['privacy','Política de privacidade','textarea'],['terms','Termos de uso','textarea']]},
};
const get=(obj,key)=>key.split('.').reduce((o,k)=>o?.[k],obj);
const set=(obj,key,value)=>{const keys=key.split('.');const last=keys.pop();for(const k of keys)obj=obj[k]??={};obj[last]=value;};
async function defaults(){
 if(!window.CLINIC_CONFIG)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/config.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
 const c=structuredClone(window.CLINIC_CONFIG);c.copy={};c.hero.title='Beleza e cuidado em um só lugar';c.branding={logoWord:c.logoWord,tagline:c.tagline,colors:c.colors,description:c.seo.description,demo:c.demo};return c;
}
export async function render(root,ctx){
 const {db}=dataFor(ctx.db);
 const rows=await result(db.from('site_content').select('*'));const draft=await defaults();for(const r of rows)draft[r.section]=r.content;
 function syncChrome(){const chrome=siteChrome({...draft,name:ctx.settings.name,logoWord:draft.branding.logoWord,tagline:draft.branding.tagline,demo:draft.branding.demo,logo:ctx.settings.logo||draft.logo,phone:ctx.settings.phone,address:ctx.settings.address,email:ctx.settings.email,instagramUrl:ctx.settings.instagram||draft.instagramUrl});for(const [key,group]of Object.entries(groups))if(group.storagePath)draft[key]=structuredClone(get(chrome,group.storagePath));}
 syncChrome();
 let section='hero';
 function draw(){
  const group=groups[section],items=group.array?draft[section]:[draft[section]];
  root.innerHTML=pageHead('SITE & PUBLICAÇÃO','Personalizar site','Edite o conteúdo público. As fichas clínicas e as fotos privadas dos clientes ficam em áreas separadas.','<a class="btn secondary" href="${esc(ctx.store?.site_url||siteURL)}" target="_blank" rel="noopener">Ver site</a>')+
   `<section class="panel"><div class="toolbar"><label>Seção<select id="section">${Object.entries(groups).map(([key,g])=>`<option value="${key}" ${key===section?'selected':''}>${g.title}</option>`).join('')}</select></label><a class="btn ghost" href="/admin/procedimentos" data-link>Editar serviços</a><a class="btn ghost" href="/admin/equipe" data-link>Editar equipe</a></div><form class="settings-form"><h2>${group.title}</h2><p class="muted">As alterações aparecem no site após salvar e atualizar a página. Imagens enviadas aqui são públicas.</p>${group.storagePath?'<p class="muted">Destinos aceitos: #secao, /pagina, HTTPS, mailto: e tel:. Os botões de agendamento e conta mantêm o acesso à área do cliente. No rodapé, desligue “Usar contatos das Configurações” para usar os campos próprios. Textos de privacidade e termos ficam na seção Privacidade e termos.</p>':''}${items.map((item,i)=>`<section class="site-item"><div class="panel-head"><h3>${group.array?`Item ${i+1}`:group.title}</h3>${group.array?`<button class="btn ghost" type="button" data-remove="${i}">Remover</button><button class="btn ghost" type="button" data-up="${i}" ${i===0?'disabled':''}>Mover acima</button>`:''}</div><div class="form-grid">${group.fields.map(([key,label,type='text'])=>{
    const name=`${i}_${key}`,value=get(item,key);
    if(type==='image')return mediaField(name,label,value,{consent:section==='results'});
    if(type==='boolean')return field(name,label,'select',value,{choices:[[true,'Sim'],[false,'Não']]});
    return field(name,label,type==='lines'?'textarea':type==='link'?'text':type, type==='lines'?(value||[]).join('\n'):value,{wide:type==='textarea'||type==='lines',maxLength:group.storagePath?(key==='monogram'?4:type==='link'?1000:type==='textarea'?2000:120):(type==='textarea'?5000:2000),...(type==='number'?{min:1,max:5}:{})});
   }).join('')}</div></section>`).join('')}${group.array?'<button type="button" class="btn secondary" id="add-item">+ Adicionar item</button>':''}${['results','testimonials'].includes(section)?'<label class="field wide"><span><input type="checkbox" name="authorized" required> Confirmo que tenho autorização para publicar estas imagens ou depoimentos e que os textos são verdadeiros.</span></label>':''}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">Salvar e publicar seção</button></form></section>`;
  root.querySelector('#section').onchange=e=>{section=e.target.value;draw();};
  const form=root.querySelector('form');bindMedia(form,ctx.db);
  function read(){
   const f=new FormData(form);return items.map((item,i)=>{const next=structuredClone(item);for(const [key,,type='text'] of group.fields){let value=f.get(`${i}_${key}`)||'';if(type==='lines')value=value.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,12);if(type==='boolean')value=value==='true';if(type==='number')value=Number(value);set(next,key,value);}if(section==='results')next.placeholder=false;return next;});
  }
  form.querySelector('#add-item')?.addEventListener('click',()=>{if(items.length>=30)return toast('Máximo de 30 itens por seção.',true);draft[section]=read();const item={};for(const [key,,type]of group.fields)set(item,key,type==='number'?5:type==='boolean'?false:'');draft[section].push(item);draw();});
  form.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{draft[section]=read();draft[section].splice(Number(b.dataset.remove),1);draw();});
  form.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{draft[section]=read();const i=Number(b.dataset.up);[draft[section][i-1],draft[section][i]]=[draft[section][i],draft[section][i-1]];draw();});
  form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('[type=submit]');b.disabled=true;try{
   const next=read();for(const item of next)for(const [key,,type]of group.fields){const value=get(item,key);if(type==='link'&&value&&!siteLink(value))throw Error('Destino inválido. Use #secao, /pagina, HTTPS, mailto: ou tel:.');if(group.array&&group.storagePath&&(!item.label?.trim()||(!item.href?.trim()&&section!=='footer_contacts')))throw Error('Preencha o texto e destino de cada link ou remova o item.');if((type==='image'||key==='video')&&value&&!safeImage(value))throw Error('Use apenas uma imagem ou vídeo HTTPS ou /assets/…');if(type==='color'&&!/^#[\da-f]{6}$/i.test(value))throw Error('Cor inválida.');}
   const content=group.array?next:next[0];let storageSection=section,storedContent=content;
   if(group.storagePath||section==='copy'){
    storageSection='copy';const latest=await result(db.from('site_content').select('content').eq('section','copy').maybeSingle());storedContent=structuredClone(latest?.content||{});
    if(group.storagePath){if(group.array)set(storedContent,group.storagePath,content);else{const value=get(storedContent,group.storagePath)||{};for(const [key]of group.fields)set(value,key,get(content,key));set(storedContent,group.storagePath,value);}}
    else for(const [key]of group.fields)set(storedContent,key,get(content,key));
   }
   await result(db.from('site_content').upsert({section:storageSection,content:storedContent,updated_at:new Date().toISOString()}));draft[storageSection]=storedContent;if(group.storagePath||storageSection==='copy')syncChrome();toast('Seção publicada. Atualize o site para conferir.');
  }catch(err){form.querySelector('[role=alert]').textContent=errorText(err);}finally{b.disabled=false;}};
 }
 draw();
}
