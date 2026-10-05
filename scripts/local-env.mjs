import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
const config = JSON.parse(
  execFileSync("node_modules/.bin/supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
if (existsSync(".env.local")) {
  console.log(".env.local already exists; preserved.");
  process.exit(0);
}
const values = {
  VITE_SUPABASE_URL: config.API_URL,
  VITE_SUPABASE_ANON_KEY: config.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: config.SERVICE_ROLE_KEY,
  DEMO_ADMIN_EMAIL: "admin@quartier.example",
  DEMO_ADMIN_PASSWORD: randomBytes(24).toString("base64url"),
  DEMO_PROFESSIONAL_EMAIL: "profissional@quartier.example",
  DEMO_PROFESSIONAL_PASSWORD: randomBytes(24).toString("base64url"),
};
writeFileSync(
  ".env.local",
  Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
console.log(
  "Local configuration saved privately to .env.local. No credentials printed.",
);
