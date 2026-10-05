import {db,configured} from './supabase.js';
export async function preparePublicSite(config){
 if(!configured)return null;
 try{
  const [settings,catalog]=await Promise.all([db.rpc('public_settings').abortSignal(AbortSignal.timeout(6000)),db.rpc('public_catalog').abortSignal(AbortSignal.timeout(6000))]);
  if(!settings.error&&settings.data){
   const s=settings.data;
   for(const key of ['name','logo','whatsapp','address'])if(s[key])config[key]=s[key];
   if(s.phone){config.phone=s.phone;config.phoneDisplay=s.phone;}
   if(s.whatsapp_message)config.whatsappMessage=s.whatsapp_message;
   if(s.instagram?.startsWith('https://')){config.instagramUrl=s.instagram;config.instagram='Instagram';}
   if(s.hours)config.hours=s.hours.split('\n');
   config.email=s.email||'';
  }
  if(catalog.error||!catalog.data){config.procedures=[];config.team=[];return null;}
  const cat=catalog.data;
  // Public projection contains no clinical notes, phone numbers or staff emails.
  config.procedures=cat.procedures.map(p=>({...p,photo:{src:p.photo_url||'/assets/procedimento-pele.webp',alt:p.photo_alt||p.name}}));
  config.team=cat.professionals.map(p=>({...p,photo:{src:p.photo_url||'/assets/profissional-principal.webp',alt:p.name}}));
  for(const key of ['hero','about','gallery','results','faq','method','testimonials','legal']){
   if(cat.content[key]!==undefined)config[key]=cat.content[key];
  }
  if(cat.content.copy)config.copy=cat.content.copy;
  const b=cat.content.branding;
  if(b){for(const k of ['logoWord','tagline','demo'])if(b[k]!==undefined)config[k]=b[k];if(b.colors)config.colors=b.colors;if(b.description)config.seo.description=b.description;}
  return cat;
 }catch{config.procedures=[];config.team=[];return null;}
}
export function loadPremium(){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/premium.js';script.onload=resolve;script.onerror=reject;document.body.append(script);});}
