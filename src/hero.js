import {isPublicMediaUrl} from './shared/media-validation.js';
// Start the cover media immediately; public settings must not hold up playback.
export function mountHero(initial) {
 const root=document.querySelector('.hero'),art=root.querySelector('.hero-art'),toggle=document.querySelector('#video-toggle');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=false,visible=true,source='',failed=false;
 const media=value=>isPublicMediaUrl(value,{allowLocal:import.meta.env.DEV})?value:'';
 const video=document.createElement('video');video.className='hero-video';video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.autoplay=true;video.controls=false;video.preload='auto';
 for(const attribute of ['autoplay','muted','playsinline'])video.setAttribute(attribute,'');video.setAttribute('aria-hidden','true');video.tabIndex=-1;
 art.append(video);root.append(toggle);
 function controls(){toggle.hidden=reduced.matches||!source||failed;toggle.setAttribute('aria-label',video.paused?'Reproduzir vídeo da hero':'Pausar vídeo da hero');const state=video.paused?'paused':'playing';if(toggle.dataset.state!==state){toggle.dataset.state=state;toggle.innerHTML=video.paused?'<span aria-hidden="true">▷</span>':'<span aria-hidden="true">Ⅱ</span>';}}
 function sync(){if(reduced.matches||paused||document.hidden||!visible||!source||failed)video.pause();else video.play().catch(()=>{});controls();}
 function update(value={}){
  const poster=media(value.poster)||media(value.image);art.style.backgroundImage=poster?`url("${poster}")`:'none';video.poster=poster;
  const next=media(value.video);if(next!==source){source=next;failed=false;if(source){video.src=source;video.load();}else{video.pause();video.removeAttribute('src');video.load();}}
  video.hidden=!source||failed;sync();
 }
 toggle.addEventListener('click',()=>{paused=!paused;sync();});
 video.addEventListener('play',controls);video.addEventListener('pause',controls);
 video.addEventListener('error',()=>{failed=true;video.hidden=true;controls();});
 video.addEventListener('loadeddata',sync);video.addEventListener('canplay',sync);
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(root);
 addEventListener('pageshow',sync);document.addEventListener('pointerdown',sync,{once:true});document.addEventListener('keydown',sync,{once:true});document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 update(initial);return {update};
}
