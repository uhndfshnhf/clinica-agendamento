import { createClient } from '@supabase/supabase-js';
import {validateConnection} from './shared/store-connection.js';
export const projectURL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/,'');
export const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const panelMode = import.meta.env.VITE_APP_MODE === 'panel';
export const siteURL = import.meta.env.VITE_SITE_URL || location.origin;
export const configured = Boolean(projectURL && publishableKey);
const clients = new Map();
const makeClient = (url, key) => createClient(url, key, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
export const centralDB = configured ? makeClient(projectURL, publishableKey) : null;
if (centralDB) clients.set(projectURL, centralDB);
// ES module live binding: every administrative page uses the selected project.
// Public/customer entry points never call selectStore and retain their own project.
export let db = centralDB;
export let activeStore = null;
export function selectStore(store, ownerId) {
  if (!store) { db = centralDB; activeStore = null; return; }
  const connection = validateConnection({version:1, application:'quartier-clinic', name:store.name, site_url:store.site_url, project_url:store.project_url, publishable_key:store.publishable_key}, {allowLocal:import.meta.env.DEV});
  if (!ownerId) throw Error('Entre na central antes de selecionar a loja.');
  const cacheKey=ownerId+':'+connection.project_url;
  let cached=clients.get(cacheKey);
  if(cached && cached.key!==connection.publishable_key){cached.client.auth.stopAutoRefresh();cached=null;}
  const client = connection.project_url===projectURL ? centralDB : cached?.client || createClient(connection.project_url,connection.publishable_key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'quartier-panel:'+ownerId+':'+new URL(connection.project_url).hostname}});
  clients.set(cacheKey,{client,key:connection.publishable_key});
  db = client; activeStore = {...connection, id:store.id};
}
export async function signOutAllStores() {
  await Promise.allSettled([...new Set([...clients.values()].map(entry=>entry.client||entry))].map(client=>client.auth.signOut({scope:'local'})));
  selectStore(null);
}
export async function result(query) {
  const {data, error} = await query;
  if (error) throw error;
  return data;
}
