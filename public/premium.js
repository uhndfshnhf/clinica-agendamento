'use strict';
const C = window.CLINIC_CONFIG;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const safeMedia = value => {
  const url = String(value || '');
  return (/^(assets\/|https:\/\/|\/[^/])/.test(url) || (['localhost','127.0.0.1'].includes(location.hostname) && /^http:\/\/(127\.0\.0\.1|localhost):54321\/storage\/v1\/object\/public\/site-media\/[a-f0-9-]+\.webp$/.test(url))) && !/[<>"']/.test(url) ? url : '';
};
const safeLink = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
const PHOTO_DIMENSIONS = {
  'assets/clinica-detalhes.webp': [1536,1024],
  'assets/clinica-equipamentos.webp': [1536,1024],
  'assets/clinica-equipe.webp': [1536,1024],
  'assets/clinica-recepcao.webp': [1536,1024],
  'assets/clinica-sala.webp': [1536,1024],
  'assets/procedimento-bioestimuladores.webp': [1122,1402],
  'assets/procedimento-harmonizacao.webp': [1122,1402],
  'assets/procedimento-pele.webp': [1122,1402],
  'assets/procedimento-preenchimento.webp': [1122,1402],
  'assets/procedimento-skinbooster.webp': [1122,1402],
  'assets/procedimento-toxina.webp': [1122,1402],
  'assets/profissional-02.webp': [1122,1402],
  'assets/profissional-03.webp': [1122,1402],
  'assets/profissional-principal.webp': [1122,1402],
  'assets/sobre-detalhe.webp': [1536,1024],
  'assets/sobre-principal.webp': [1122,1402]
};
function photo(asset, extra = '') {
  const p = typeof asset === 'string' ? {src:asset,alt:''} : asset;
  const [width,height] = PHOTO_DIMENSIONS[p.src] || [p.width || 1200,p.height || 800];
  return `<div class="media ${extra}"><img src="${esc(safeMedia(p.src))}" alt="${esc(p.alt)}" loading="lazy" decoding="async" width="${width}" height="${height}"></div>`;
}
const pad = n => String(n + 1).padStart(2, '0');
const icon = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M26 15.5a10.5 10.5 0 0 1-15.7 9.1L5 26l1.4-5.1A10.5 10.5 0 1 1 26 15.5Z"/><path d="M12 10.5c-.6 0-1.3 1-1.3 2 0 3 4.8 7.9 7.9 7.9 1 0 2.5-.9 2.5-1.7l-2.8-1.4-1.1 1.1c-1.7-.6-3.8-2.8-4.4-4.4l1-1.1-1.3-2.4Z"/></svg>';
$$('.wa-icon').forEach(el => el.innerHTML = icon);
Object.entries(C.colors).forEach(([key,value]) => { if (/^#[\da-f]{3,8}$/i.test(value)) document.documentElement.style.setProperty(`--${key}`,value); });
document.title = `Clínica de Estética e Harmonização Facial | ${C.name}`;
$('meta[name="description"]').content = C.seo.description;
$('meta[property="og:title"]').content = document.title;
$('meta[property="og:description"]').content = C.seo.description;
$$('.brand').forEach(el => {
  el.setAttribute('aria-label',C.name + ' — início');
  if (safeMedia(C.logo)) el.innerHTML = `<img class="client-logo" src="${esc(safeMedia(C.logo))}" alt="${esc(C.name)}">`;
  else { $('.brand-words',el).firstChild.textContent = C.logoWord; $('.brand-words small',el).textContent = C.tagline; }
});
$('.hero-copy > p').textContent = `BEM-VINDA À ${C.name.toUpperCase()}`;
$('.dialog-eyebrow').textContent = C.name.toUpperCase();

$('#about-content').innerHTML = `<div class="about-composition reveal">${photo(C.about.mainPhoto,'about-main')}${photo(C.about.detailPhoto,'about-detail')}<span class="about-caption">CUIDADO. EQUILÍBRIO. IDENTIDADE.</span></div><div class="editorial-copy reveal"><p class="eyebrow">SOBRE A ${esc(C.logoWord)}</p><h2 id="about-title">${esc(C.about.title)}</h2><p class="lead-copy">${esc(C.about.description)}</p><div class="authority">${C.about.facts.map((fact,i)=>`<div><span class="authority-number">${i===0?esc(fact.split(' ')[0]):pad(i)}</span><span>${esc(i===0?fact.split(' ').slice(1).join(' '):fact)}</span></div>`).join('')}</div>${C.demo?'<p class="demo-note">Número demonstrativo · substitua pelo dado real da clínica</p>':''}</div>`;

if(C.procedures.length){
let procedureIndex = 0;
const procedureMessage = p => `Olá! Gostaria de saber mais sobre ${p.name}.`;
$('#procedure-desktop').innerHTML = `<div class="procedure-list" role="tablist" aria-label="Procedimentos" aria-orientation="vertical">${C.procedures.map((p,i)=>`<button class="procedure-tab ${i===0?'active':''}" id="procedure-tab-${i}" role="tab" aria-selected="${i===0}" aria-controls="procedure-panel" tabindex="${i===0?'0':'-1'}" data-index="${i}"><span>${pad(i)}</span><strong>${esc(p.name)}</strong><span class="procedure-mark" aria-hidden="true">+</span></button>`).join('')}</div><div class="procedure-panel" id="procedure-panel" role="tabpanel" aria-labelledby="procedure-tab-0"><div class="procedure-image-stack">${C.procedures.map((p,i)=>photo(p.photo,`procedure-image ${i===0?'active':''}`)).join('')}</div><div class="procedure-panel-copy"><p class="eyebrow" id="procedure-number">PROCEDIMENTO 01</p><h3 id="procedure-name">${esc(C.procedures[0].name)}</h3><p id="procedure-description">${esc(C.procedures[0].description)}</p><button class="text-link" id="procedure-book">Agendar avaliação </button></div></div>`;
$('#procedure-mobile').innerHTML = C.procedures.map((p,i)=>`<details class="procedure-accordion" ${i===0?'open':''}><summary><span>${pad(i)}</span>${esc(p.name)}<span class="plus" aria-hidden="true">+</span></summary><div class="accordion-content">${photo(p.photo)}<p>${esc(p.description)}</p><button class="text-link" data-procedure-book="${i}">Agendar avaliação </button></div></details>`).join('');
function setProcedure(index, focus = false) {
  procedureIndex = (index+C.procedures.length)%C.procedures.length;
  const p = C.procedures[procedureIndex];
  $$('.procedure-tab').forEach((el,i)=>{el.classList.toggle('active',i===procedureIndex);el.setAttribute('aria-selected',String(i===procedureIndex));el.tabIndex=i===procedureIndex?0:-1;});
  $$('.procedure-image').forEach((el,i)=>{el.classList.toggle('active',i===procedureIndex);el.setAttribute('aria-hidden',String(i!==procedureIndex));});
  $('#procedure-number').textContent = `PROCEDIMENTO ${pad(procedureIndex)}`;
  $('#procedure-name').textContent = p.name; $('#procedure-description').textContent = p.description;
  $('#procedure-panel').setAttribute('aria-labelledby',`procedure-tab-${procedureIndex}`);
  if(focus) $(`#procedure-tab-${procedureIndex}`).focus();
}
$$('.procedure-tab').forEach((el,i)=>{
  el.addEventListener('click',()=>setProcedure(i));
  el.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')setProcedure(i);});
  el.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();setProcedure(event.key==='Home'?0:event.key==='End'?C.procedures.length-1:procedureIndex+(event.key==='ArrowDown'?1:-1),true);}});
});
$('#procedure-book').addEventListener('click',()=>{location.href='/cliente/agendar?servico='+encodeURIComponent(C.procedures[procedureIndex].id||'');});
setProcedure(0);
$$('[data-procedure-book]').forEach(el=>el.addEventListener('click',()=>{location.href='/cliente/agendar?servico='+encodeURIComponent(C.procedures[Number(el.dataset.procedureBook)].id||'');}));
$$('.procedure-accordion').forEach(el=>el.addEventListener('toggle',()=>{if(el.open)$$('.procedure-accordion').forEach(other=>{if(other!==el)other.open=false;});}));

}else{$('#procedimentos').hidden=true;}
$('#results-grid').innerHTML=C.results.map((item,index)=>`<article class="result-case reveal" aria-labelledby="case-title-${index}"><div class="compare"><img class="compare-before" src="${esc(safeMedia(item.before))}" alt="${esc(item.beforeAlt||`Antes — ${item.label}`)}" loading="lazy" width="1200" height="800"><img class="compare-after" src="${esc(safeMedia(item.after))}" alt="${esc(item.afterAlt||`Depois — ${item.label}`)}" loading="lazy" width="1200" height="800"><span class="compare-label before">ANTES</span><span class="compare-label after">DEPOIS</span><div class="compare-line" aria-hidden="true"><span>‹ ›</span></div><label class="sr-only" for="compare-range-${index}">Comparar antes e depois de ${esc(item.label)}: arraste ou use as setas</label><input type="range" id="compare-range-${index}" min="0" max="100" value="50" aria-valuetext="50% da imagem depois visível">${item.placeholder?'<span class="case-placeholder">Espaço reservado para um caso real</span>':''}</div><div class="result-case-caption"><p class="eyebrow">ANTES & DEPOIS</p><h3 id="case-title-${index}">${esc(item.label)}</h3><p class="small-copy">Arraste o controle para comparar.</p></div></article>`).join('');
$$('.result-case input[type="range"]').forEach(input=>input.addEventListener('input',()=>{const value=Number(input.value);input.closest('.compare').style.setProperty('--split',value+'%');input.setAttribute('aria-valuetext',`${100-value}% da imagem depois visível`);}));

$('#method-content').innerHTML=C.method.map((item,i)=>`<li class="method-step reveal"><span class="step-number">${pad(i)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></li>`).join('');
if(C.team.length){
const mainPerson=C.team[0];
$('#team-content').innerHTML=`<div class="team-layout"><div class="team-main-photo reveal">${photo(mainPerson.photo)}</div><div class="team-main-copy reveal"><p class="eyebrow">PROFISSIONAL PRINCIPAL</p><h3>${esc(mainPerson.name)}</h3><p class="specialty">${esc(mainPerson.specialty)}</p><p class="team-bio">${esc(mainPerson.bio)}</p><div class="credentials"><span>${esc(mainPerson.education)}</span><span>${esc(mainPerson.registration)}</span></div><button class="text-link" id="team-more">Conheça nossa equipe </button>${C.demo?'<p class="demo-note">Profissionais fictícios · imagens ilustrativas geradas por IA</p>':''}</div><div class="team-secondary">${C.team.slice(1).map((p,i)=>`<button class="secondary-professional reveal" data-person="${i+1}">${photo(p.photo)}<span><strong>${esc(p.name)}</strong><small>${esc(p.specialty)}</small></span></button>`).join('')}</div></div>`;

}else{$('#equipe').hidden=true;}
if(C.testimonials.length){
let reviewIndex=0, reviewTimer=null, reviewVisible=false, reviewHovered=false, reviewFocused=false;
let reviewPaused=C.testimonialAutoplay?.enabled===false;
const reviewInterval=Math.max(3500,Number(C.testimonialAutoplay?.interval)||5500);
function syncReviews(){
  clearTimeout(reviewTimer);
  const running=!reviewPaused&&!reduced.matches&&!document.hidden&&reviewVisible&&!reviewHovered&&!reviewFocused&&C.testimonials.length>1;
  $('#review-play').textContent=reviewPaused?'▷':'Ⅱ';
  $('#review-play').setAttribute('aria-label',reviewPaused?'Retomar passagem automática das avaliações':'Pausar passagem automática das avaliações');
  $('#review-play').setAttribute('aria-pressed',String(reviewPaused));
  $('#testimonial-stage').setAttribute('aria-live',running?'off':'polite');
  const progress=$('#review-progress-bar');
  progress.classList.remove('running');
  progress.style.setProperty('--review-duration',reviewInterval+'ms');
  if(running){void progress.offsetWidth;progress.classList.add('running');reviewTimer=setTimeout(()=>setReview(reviewIndex+1),reviewInterval);}
}
function setReview(index){reviewIndex=(index+C.testimonials.length)%C.testimonials.length;const item=C.testimonials[reviewIndex];const stage=$('#testimonial-stage');stage.classList.remove('quote-enter');void stage.offsetWidth;$('#testimonial-quote').textContent='“'+item.quote+'”';$('#testimonial-person').textContent=`${item.name} · ${item.procedure}`;$('.stars').textContent='★'.repeat(Math.max(0,Math.min(5,item.stars||5)));$('.stars').setAttribute('aria-label',`${item.stars||5} de 5 estrelas`);$$('[data-review]').forEach((el,i)=>{el.classList.toggle('active',i===reviewIndex);el.setAttribute('aria-current',i===reviewIndex?'true':'false');});stage.classList.add('quote-enter');syncReviews();}
$('#review-dots').innerHTML=C.testimonials.map((item,i)=>`<button data-review="${i}" aria-label="Mostrar depoimento ${i+1}" aria-current="${i===0}"></button>`).join('');
$$('[data-review]').forEach(el=>el.addEventListener('click',()=>setReview(Number(el.dataset.review))));$('#review-prev').addEventListener('click',()=>setReview(reviewIndex-1));$('#review-next').addEventListener('click',()=>setReview(reviewIndex+1));
const stage=$('#testimonial-stage');let swipeStart=null;
stage.addEventListener('touchstart',e=>swipeStart=e.changedTouches[0].clientX,{passive:true});stage.addEventListener('touchend',e=>{if(swipeStart!==null){const diff=e.changedTouches[0].clientX-swipeStart;if(Math.abs(diff)>45)setReview(reviewIndex+(diff<0?1:-1));swipeStart=null;}},{passive:true});
stage.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setReview(reviewIndex+(e.key==='ArrowRight'?1:-1));}});setReview(0);
const reviewSection=$('#depoimentos');
$('#review-play').addEventListener('click',()=>{reviewPaused=!reviewPaused;syncReviews();});
reviewSection.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){reviewHovered=true;syncReviews();}});
reviewSection.addEventListener('pointerleave',()=>{reviewHovered=false;syncReviews();});
reviewSection.addEventListener('focusin',()=>{reviewFocused=true;syncReviews();});
reviewSection.addEventListener('focusout',event=>{if(!reviewSection.contains(event.relatedTarget)){reviewFocused=false;syncReviews();}});
document.addEventListener('visibilitychange',syncReviews);
reduced.addEventListener('change',syncReviews);
if('IntersectionObserver'in window)new IntersectionObserver(entries=>{reviewVisible=entries[0].isIntersecting;syncReviews();},{threshold:.2}).observe(reviewSection);
else {reviewVisible=true;syncReviews();}
$('#testimonial-demo').hidden=!C.demo;if(safeLink(C.googleReviewsUrl)){$('#google-reviews').href=safeLink(C.googleReviewsUrl);$('#google-reviews').hidden=false;}

}else{$('#depoimentos').hidden=true;}
$('#clinic-gallery').innerHTML=C.gallery.map((item,i)=>`<figure class="gallery-item reveal" data-gallery-image="${esc(item.photo.src.split('/').pop().replace('.webp',''))}"><div class="gallery-image">${photo(item.photo)}${item.placeholder?'<span class="gallery-placeholder">INSERIR FOTO REAL</span>':''}</div><figcaption><span>${pad(i)}</span>${esc(item.title)}</figcaption></figure>`).join('');
$('#gallery-demo').hidden=!C.demo;
$('#faq-content').innerHTML=C.faq.map((item,i)=>`<details class="faq-item"><summary>${esc(item.question)}<span class="plus" aria-hidden="true">+</span></summary><div class="accordion-content"><p>${esc(item.answer)}</p></div></details>`).join('');
$$('.faq-item').forEach(el=>el.addEventListener('toggle',()=>{if(el.open)$$('.faq-item').forEach(other=>{if(other!==el)other.open=false;});}));

const phone=String(C.phone||'').replace(/\D/g,'');
const instagram=safeLink(C.instagramUrl);
$('#contact-content').innerHTML=`<div><span>Telefone</span>${phone?`<a href="tel:+${phone}">${esc(C.phoneDisplay)}</a>`:`<p>${esc(C.phoneDisplay)}</p>`}</div><div><span>Agendamento</span><a class="contact-link" href="/cliente/agendar">Agendar uma avaliação</a></div><div><span>Instagram</span>${instagram?`<a href="${esc(instagram)}" target="_blank" rel="noopener noreferrer">${esc(C.instagram)}</a>`:`<p>${esc(C.instagram)}</p>`}</div><div><span>Endereço</span><p>${esc(C.address)}</p></div><div><span>Horário</span><p>${C.hours.map(esc).join('<br>')}</p></div>`;
$('#contact-demo').hidden=!C.demo;
const map=safeLink(C.mapEmbedUrl);
if(map && /^https:\/\/(www\.)?google\.com\/maps\/embed(?:[/?]|$)/.test(map))$('#map-frame').innerHTML=`<iframe src="${esc(map)}" title="Localização da ${esc(C.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
else $('#map-frame > p').textContent=C.address;
$('#footer-contact').innerHTML=`${instagram?`<a href="${esc(instagram)}" target="_blank" rel="noopener noreferrer">Instagram</a>`:'<span>Instagram</span>'}<a href="/cliente/agendar">Agendar avaliação</a><p>${esc(C.address)}</p>`;
$('#copyright').textContent=`© ${new Date().getFullYear()} ${C.name}. Todos os direitos reservados.`;$('#footer-demo').hidden=!C.demo;

const dialog=$('#info-dialog');
function showInfo(title,html){$('#info-title').textContent=title;$('#info-body').innerHTML=html;dialog.showModal();}
function openWhatsApp(message){const number=String(C.whatsapp||'').replace(/\D/g,'');if(number.length>=10&&number.length<=15){window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');}else showInfo('Vamos conversar.',`<p>O WhatsApp desta apresentação ainda não foi configurado.</p><p class="small-copy">Para a versão da clínica, o botão abrirá uma conversa com esta mensagem:</p><blockquote class="message-preview">${esc(message)}</blockquote>`);}
$$('[data-whatsapp]').forEach(el=>el.addEventListener('click',()=>openWhatsApp(el.dataset.whatsapp==='floating'?C.floatingMessage:el.dataset.whatsapp==='clinic'?'Olá! Gostaria de falar com a clínica.':C.whatsappMessage)));
$$('[data-legal]').forEach(el=>el.addEventListener('click',()=>showInfo(el.dataset.legal==='privacy'?'Política de Privacidade':'Termos de Uso',`<p>${esc(C.legal[el.dataset.legal])}</p>`)));
function personInfo(index){const p=C.team[index];showInfo(p.name,`${photo(p.photo,'dialog-person')}<p>${esc(p.specialty)}</p><p>${esc(p.bio)}</p><p class="small-copy">${esc(p.education)}<br>${esc(p.registration)}</p>${C.demo?'<p class="demo-note">Profissionais fictícios · imagens ilustrativas geradas por IA. Para uma clínica real, use os registros da própria clínica.</p>':''}`);}
if(C.team.length){
$$('[data-person]').forEach(el=>el.addEventListener('click',()=>personInfo(Number(el.dataset.person))));$('#team-more').addEventListener('click',()=>showInfo('Nossa equipe',C.team.map(p=>`<div class="team-dialog-entry"><h3>${esc(p.name)}</h3><p>${esc(p.specialty)}</p><p>${esc(p.bio)}</p><p class="small-copy">${esc(p.education)}<br>${esc(p.registration)}</p></div>`).join('')));
}
$('.close',dialog).addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{const rect=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom))dialog.close();});

const menu=$('.menu-toggle'),nav=$('#navigation');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');}
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');});
$$('a,button',nav).forEach(el=>el.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.addEventListener('click',e=>{if(!e.target.closest('.premium-header'))closeMenu();});
let scrollQueued=false;
function onScroll(){if(scrollQueued)return;scrollQueued=true;requestAnimationFrame(()=>{const y=window.scrollY;$('#site-header').classList.toggle('scrolled',y>30);$('.floating-wa').classList.toggle('visible',y>320);if(!reduced.matches){const gallery=$('#clinic-gallery');const rect=gallery.getBoundingClientRect();if(rect.bottom>0&&rect.top<innerHeight){const shift=Math.max(-10,Math.min(10,(rect.top-innerHeight/2)*.018));gallery.style.setProperty('--parallax',shift+'px');}}scrollQueued=false;});}
addEventListener('scroll',onScroll,{passive:true});onScroll();
// Stagger only related items, keeping the motion small and content readable.
$$('.section-heading,.faq-layout>div:first-child,.contact-layout>div:first-child,.final-cta .section-inner,.footer-top').forEach(el=>el.classList.add('reveal'));
$$('.results-grid,.team-secondary,.method-timeline,.clinic-gallery').forEach(group=>$$(':scope > .reveal',group).forEach((el,i)=>el.style.setProperty('--reveal-delay',Math.min(i,3)*70+'ms')));
if(!reduced.matches&&'IntersectionObserver'in window){document.documentElement.classList.add('js-motion');const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');reveal.unobserve(entry.target);}}),{threshold:.08});$$('.reveal').forEach(el=>reveal.observe(el));}
reduced.addEventListener('change',()=>{if(reduced.matches){document.documentElement.classList.remove('js-motion');$$('.reveal').forEach(el=>el.classList.add('revealed'));}});
if('IntersectionObserver'in window){const steps=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('active');}),{threshold:.5});$$('.method-step').forEach(el=>steps.observe(el));}

const heroArt=$('.hero-art'),toggle=$('#video-toggle');let manuallyPaused=false;let heroVisible=true;
heroArt.style.backgroundImage=`url('${safeMedia(C.hero.poster||C.hero.image)}')`;
const video=document.createElement('video');video.className='hero-video';video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.autoplay=true;video.controls=false;video.setAttribute('autoplay','');video.setAttribute('muted','');video.setAttribute('playsinline','');video.preload='auto';video.poster=safeMedia(C.hero.poster);video.setAttribute('aria-hidden','true');video.setAttribute('tabindex','-1');
if(safeMedia(C.hero.video)) {video.src=safeMedia(C.hero.video);heroArt.append(video);$('.hero').append(toggle);toggle.hidden=false;}
function syncVideo(){toggle.hidden=reduced.matches||!safeMedia(C.hero.video);if(reduced.matches||manuallyPaused||document.hidden||!heroVisible){video.pause();}else video.play().catch(()=>{});toggle.setAttribute('aria-label',video.paused?'Reproduzir vídeo da hero':'Pausar vídeo da hero');toggle.innerHTML=video.paused?'<span aria-hidden="true">▷</span>':'<span aria-hidden="true">Ⅱ</span>';}
toggle.addEventListener('click',()=>{manuallyPaused=!manuallyPaused;syncVideo();});
video.addEventListener('play',()=>{toggle.setAttribute('aria-label','Pausar vídeo da hero');toggle.innerHTML='<span aria-hidden="true">Ⅱ</span>';});video.addEventListener('pause',()=>{toggle.setAttribute('aria-label','Reproduzir vídeo da hero');toggle.innerHTML='<span aria-hidden="true">▷</span>';});
video.addEventListener('error',()=>{video.hidden=true;toggle.hidden=true;});
if('IntersectionObserver'in window)new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;syncVideo();},{threshold:0}).observe($('.hero'));
video.addEventListener('loadeddata',syncVideo);video.addEventListener('canplay',syncVideo);addEventListener('pageshow',syncVideo);
document.addEventListener('pointerdown',syncVideo,{once:true});document.addEventListener('keydown',syncVideo,{once:true});
document.addEventListener('visibilitychange',syncVideo);reduced.addEventListener('change',syncVideo);syncVideo();

// Não publique uma empresa, autoridade ou avaliações fictícias em dados estruturados.
// Schema passa a ser emitido apenas com demo:false e endereço real configurado.
if(!C.demo&&C.seo.streetAddress){const type=['LocalBusiness','MedicalBusiness'].includes(C.seo.businessType)?C.seo.businessType:'LocalBusiness';const schema={'@context':'https://schema.org','@type':type,name:C.name,url:$('meta[property="og:url"]').content,description:C.seo.description,address:{'@type':'PostalAddress',streetAddress:C.seo.streetAddress,addressLocality:C.seo.addressLocality,addressRegion:C.seo.addressRegion,postalCode:C.seo.postalCode,addressCountry:'BR'}};if(phone)schema.telephone='+'+phone;if(instagram)schema.sameAs=[instagram];const node=document.createElement('script');node.type='application/ld+json';node.textContent=JSON.stringify(schema);document.head.append(node);}



