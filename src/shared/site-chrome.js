// Public content is stored within the existing `copy` section.
export function siteLink(value) {
 const input=String(value??'').trim();
 if(!input||/[\u0000-\u0020\u007f<>"'\\]/.test(input)||input.startsWith('//'))return '';
 if(/^#[\w-]+$/.test(input)||/^\/(?!\/)/.test(input))return input;
 if(/^mailto:[^?@]+@[^?@]+(?:\?[^\s]*)?$/i.test(input)||/^tel:\+?[\d()-]+$/.test(input))return input;
 try{const url=new URL(input);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}
}
export function chromeDefaults(config={}) {
 const brand={brandName:config.logoWord||'QUARTIER',brandSubtitle:config.tagline||'ESTÉTICA E BEM-ESTAR',monogram:(config.logoWord||'Q')[0],logo:config.logo||'',logoAlt:config.name||'Logo da clínica',brandLink:'#inicio'};
 return {
  header:{...brand,menuLabel:'Navegação principal',menuOpenLabel:'Abrir menu',menuCloseLabel:'Fechar menu',bookingLabel:'Agendar avaliação',showBooking:true,loginLabel:'Entrar',profileLabel:'Meu perfil',accountLabel:'Minha conta',showAccount:true,showClientName:true,links:[['Início','#inicio'],['Sobre','#sobre'],['Procedimentos','#procedimentos'],['Resultados','#resultados'],['Equipe','#equipe'],['Depoimentos','#depoimentos'],['Contato','#contato']].map(([label,href])=>({label,href,newWindow:false}))},
  footer:{...brand,brandDescription:'',showBrand:true,navigationTitle:'',navigationLabel:'Navegação do rodapé',contactTitle:'',useClinicContacts:true,address:'',phone:'',email:'',hours:'',showAddress:true,showPhone:false,showEmail:true,showHours:false,copyright:'© {ano} {clinica}. Todos os direitos reservados.',showCopyright:true,showPrivacy:true,privacyLabel:'Política de Privacidade',showTerms:true,termsLabel:'Termos de Uso',showDemo:Boolean(config.demo),demoNote:'Modelo demonstrativo · imagens, números e relatos devem ser personalizados para a clínica.',extraText:'',links:[['Sobre','#sobre'],['Procedimentos','#procedimentos'],['Resultados','#resultados'],['Equipe','#equipe'],['Contato','#contato']].map(([label,href])=>({label,href,newWindow:false})),contactLinks:[{label:'Instagram',href:config.instagramUrl||'',newWindow:true},{label:'Agendar avaliação',href:'/cliente/agendar',newWindow:false}]}
 };
}
export function siteChrome(config={}) {
 const defaults=chromeDefaults(config),stored=config.copy||{};
 const merge=(name)=>{const value=stored[name]&&typeof stored[name]==='object'&&!Array.isArray(stored[name])?stored[name]:{};const result={...defaults[name],...value};for(const key of ['links','contactLinks'])if(defaults[name][key])result[key]=Array.isArray(value[key])?value[key].slice(0,30):defaults[name][key];return result;};
 return {header:merge('header'),footer:merge('footer')};
}
