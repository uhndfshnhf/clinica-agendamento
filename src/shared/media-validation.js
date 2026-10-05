export function isPublicMediaUrl(value,{allowLocal=false}={}){
 const url=String(value||'');if(/[<>"']/.test(url))return false;
 if(/^(assets\/|\/[^/]|https:\/\/)/.test(url))return true;
 return allowLocal&&/^http:\/\/(127\.0\.0\.1|localhost):54321\/storage\/v1\/object\/public\/site-media\/[a-f0-9-]+\.webp$/.test(url);
}
