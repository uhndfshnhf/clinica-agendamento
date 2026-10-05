import {db,result} from './data.js';
import {esc,toast,errorText} from './ui.js';
export function mediaField(name,label,value='',{consent=false}={}){
 return `<label class="field wide"><span>${esc(label)}</span><input name="${name}" value="${esc(value)}" placeholder="/assets/foto.webp ou https://…" maxlength="2000"><input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${name}" aria-label="Enviar ${esc(label)}"><small>Imagens de até 5 MB. O envio converte para WebP e remove metadados. Esta imagem poderá ficar pública.</small>${consent?'<span><input type="checkbox" data-media-consent> Tenho autorização para publicar esta imagem.</span>':''}</label>`;
}
export function bindMedia(root){
 root.querySelectorAll('[data-upload]').forEach(input=>input.onchange=async()=>{
  const file=input.files[0];if(!file)return;
  const field=input.closest('label'),target=field.querySelector(`[name="${input.dataset.upload}"]`);
  const consent=field.querySelector('[data-media-consent]');
  if(consent&&!consent.checked){input.value='';return toast('Confirme a autorização para publicar a imagem.',true);}
  const buttons=[...root.querySelectorAll('[type=submit]')];buttons.forEach(b=>b.disabled=true);input.disabled=true;
  try{
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Use JPEG, PNG ou WebP de até 5 MB.');
   const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>50000000){bitmap.close();throw Error('Use uma imagem de até 50 megapixels.');}const canvas=document.createElement('canvas');
   const ratio=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   const blob=await new Promise(r=>canvas.toBlob(r,'image/webp',0.88));if(!blob)throw Error('Não foi possível converter a foto.');
   const path=crypto.randomUUID()+'.webp';await result(db.storage.from('site-media').upload(path,blob,{contentType:'image/webp',upsert:false}));
   target.value=db.storage.from('site-media').getPublicUrl(path).data.publicUrl;
   toast('Foto enviada. Salve o formulário para publicá-la no site.');
  }catch(e){toast(errorText(e),true);}finally{buttons.forEach(b=>b.disabled=false);input.disabled=false;input.value='';}
 });
}
