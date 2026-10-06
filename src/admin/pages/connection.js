import {projectURL,publishableKey,siteURL} from '../../supabase.js';
import {validateConnection} from '../../shared/store-connection.js';
import {downloadConnection} from '../store-center.js';
import {pageHead,field,errorText} from '../ui.js';
export async function render(root,ctx) {
 root.innerHTML=pageHead('CONEXÃO DA CLÍNICA','Conectar ao painel central','Exporte a configuração deste site para gerenciá-lo na sua central.')+`<section class="panel"><form class="settings-form"><div class="form-grid">${field('site_url','Endereço público do site','url',ctx.store?.site_url||siteURL,{required:true,wide:true})}<p class="wide muted">O arquivo contém o nome da clínica, a URL do site e as configurações públicas do Supabase. Não inclui senhas, pacientes, tokens de sessão ou chaves administrativas.</p><p class="wide">Depois de importar o arquivo na Central de lojas, será necessário entrar com uma conta autorizada da equipe desta clínica.</p></div><p class="form-error" role="alert"></p><button class="btn primary" type="submit">Baixar JSON de conexão</button></form></section>`;
 root.querySelector('form').onsubmit=e=>{e.preventDefault();try{downloadConnection(validateConnection({version:1,application:'quartier-clinic',name:ctx.settings.name,site_url:e.target.site_url.value,project_url:ctx.store?.project_url||projectURL,publishable_key:ctx.store?.publishable_key||publishableKey},{allowLocal:import.meta.env.DEV}));}catch(error){root.querySelector('[role=alert]').textContent=errorText(error);}};
}
