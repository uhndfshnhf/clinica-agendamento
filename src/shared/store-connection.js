const allowedFields = new Set(['version', 'application', 'name', 'site_url', 'project_url', 'publishable_key']);
export function publicSupabaseKey(value) {
  if (typeof value !== 'string') return false;
  if (/^sb_publishable_[A-Za-z0-9_-]{16,200}$/.test(value)) return true;
  if (value.length > 1500 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return false;
  try {
    const payload = value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role === 'anon';
  } catch { return false; }
}
function origin(value, project, allowLocal) {
  let url;
  try { url = new URL(value); } catch { throw Error(project ? 'Informe a URL do projeto Supabase.' : 'Informe a URL completa do site.'); }
  const local = allowLocal && ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname))
    throw Error('Use somente a origem HTTPS, sem senha, parâmetros ou caminhos.');
  if (project && !local && !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname))
    throw Error('Use a URL oficial do projeto, no formato https://seu-projeto.supabase.co.');
  return url.origin;
}
export function validateConnection(input, {allowLocal = false} = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !allowedFields.has(k)))
    throw Error('Use o JSON de conexão exportado pelo painel da clínica. Ele não pode conter senhas ou chaves secretas.');
  if (input.version !== 1 || input.application !== 'quartier-clinic')
    throw Error('Este JSON não é compatível com a versão do site da clínica.');
  const name = String(input.name ?? '').trim();
  if (name.length < 2 || name.length > 160) throw Error('Informe um nome de 2 a 160 caracteres.');
  if (!publicSupabaseKey(input.publishable_key)) throw Error('Use somente a chave publishable ou anon. Chaves secretas e service_role não são aceitas.');
  return {version:1, application:'quartier-clinic', name, site_url:origin(input.site_url, false, allowLocal), project_url:origin(input.project_url, true, allowLocal), publishable_key:input.publishable_key};
}
export function connectionJSON(connection) {
  return {version:1, application:'quartier-clinic', name:connection.name, site_url:connection.site_url, project_url:connection.project_url, publishable_key:connection.publishable_key};
}
