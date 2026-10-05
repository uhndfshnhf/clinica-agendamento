import {db,result} from '../data.js';
import {pageHead,field,esc,toast,errorText,safeImage} from '../ui.js';
import {mediaField,bindMedia} from '../media.js';
const groups={
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
 const rows=await result(db.from('site_content').select('*'));const draft=await defaults();for(const r of rows)draft[r.section]=r.content;
 let section='hero';
 function draw(){
  const group=groups[section],items=group.array?draft[section]:[draft[section]];
  root.innerHTML=pageHead('SITE & PUBLICAÇÃO','Personalizar site','Edite o conteúdo público. As fichas clínicas e as fotos privadas dos clientes ficam em áreas separadas.','<a class="btn secondary" href="/" target="_blank" rel="noopener">Ver site</a>')+
   `<section class="panel"><div class="toolbar"><label>Seção<select id="section">${Object.entries(groups).map(([key,g])=>`<option value="${key}" ${key===section?'selected':''}>${g.title}</option>`).join('')}</select></label><a class="btn ghost" href="/admin/procedimentos" data-link>Editar serviços</a><a class="btn ghost" href="/admin/equipe" data-link>Editar equipe</a></div><form class="settings-form"><h2>${group.title}</h2><p class="muted">As alterações aparecem no site após salvar e atualizar a página. Imagens enviadas aqui são públicas.</p>${items.map((item,i)=>`<section class="site-item"><div class="panel-head"><h3>${group.array?`Item ${i+1}`:group.title}</h3>${group.array?`<button class="btn ghost" type="button" data-remove="${i}">Remover</button><button class="btn ghost" type="button" data-up="${i}" ${i===0?'disabled':''}>Mover acima</button>`:''}</div><div class="form-grid">${group.fields.map(([key,label,type='text'])=>{
    const name=`${i}_${key}`,value=get(item,key);
    if(type==='image')return mediaField(name,label,value,{consent:section==='results'});
    if(type==='boolean')return field(name,label,'select',value,{choices:[[true,'Sim'],[false,'Não']]});
    return field(name,label,type==='lines'?'textarea':type, type==='lines'?(value||[]).join('\n'):value,{wide:type==='textarea'||type==='lines',maxLength:type==='textarea'?5000:2000,...(type==='number'?{min:1,max:5}:{})});
   }).join('')}</div></section>`).join('')}${group.array?'<button type="button" class="btn secondary" id="add-item">+ Adicionar item</button>':''}${['results','testimonials'].includes(section)?'<label class="field wide"><span><input type="checkbox" name="authorized" required> Confirmo que tenho autorização para publicar estas imagens ou depoimentos e que os textos são verdadeiros.</span></label>':''}<p class="form-error" role="alert"></p><button class="btn primary" type="submit">Salvar e publicar seção</button></form></section>`;
  root.querySelector('#section').onchange=e=>{section=e.target.value;draw();};
  const form=root.querySelector('form');bindMedia(form);
  function read(){
   const f=new FormData(form);return items.map((item,i)=>{const next=structuredClone(item);for(const [key,,type='text'] of group.fields){let value=f.get(`${i}_${key}`)||'';if(type==='lines')value=value.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,12);if(type==='boolean')value=value==='true';if(type==='number')value=Number(value);set(next,key,value);}if(section==='results')next.placeholder=false;return next;});
  }
  form.querySelector('#add-item')?.addEventListener('click',()=>{if(items.length>=30)return toast('Máximo de 30 itens por seção.',true);draft[section]=read();const item={};for(const [key,,type]of group.fields)set(item,key,type==='number'?5:'');draft[section].push(item);draw();});
  form.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{draft[section]=read();draft[section].splice(Number(b.dataset.remove),1);draw();});
  form.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{draft[section]=read();const i=Number(b.dataset.up);[draft[section][i-1],draft[section][i]]=[draft[section][i],draft[section][i-1]];draw();});
  form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('[type=submit]');b.disabled=true;try{
   const next=read();for(const item of next)for(const [key,,type]of group.fields){const value=get(item,key);if((type==='image'||key==='video')&&value&&!safeImage(value))throw Error('Use apenas uma imagem ou vídeo HTTPS ou /assets/…');if(type==='color'&&!/^#[\da-f]{6}$/i.test(value))throw Error('Cor inválida.');}
   const content=group.array?next:next[0];await result(db.from('site_content').upsert({section,content,updated_at:new Date().toISOString()}));draft[section]=content;toast('Seção publicada. Atualize o site para conferir.');
  }catch(err){form.querySelector('[role=alert]').textContent=errorText(err);}finally{b.disabled=false;}};
 }
 draw();
}
