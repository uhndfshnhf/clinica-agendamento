import {createClient} from '@supabase/supabase-js';
import {createBookingHandler} from '../src/shared/booking-server.js';
export default createBookingHandler({
 getConfig:()=>({url:process.env.VITE_SUPABASE_URL,secret:process.env.SUPABASE_SERVICE_ROLE_KEY,captchaSecret:process.env.TURNSTILE_SECRET_KEY,origin:process.env.PUBLIC_SITE_URL}),
 createService:c=>createClient(c.url,c.secret,{auth:{persistSession:false,autoRefreshToken:false}}),
 verifyCaptcha:async(secret,response,remoteip)=>{
  const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret,response,remoteip}),signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('Captcha unavailable');return r.json();
 },
});
