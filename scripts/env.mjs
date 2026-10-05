import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
export const url = process.env.VITE_SUPABASE_URL;
export function adminClient() {
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw Error(
      "Configure Supabase URL and backend service role securely in .env.local.",
    );
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function ok(p) {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}
export function localOnly() {
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw Error(
      "Demo scripts are restricted to local Supabase to protect hosted data.",
    );
}
