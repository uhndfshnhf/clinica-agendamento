// Offline-capable local execution of the same Edge Function used in production.
// Bundles the pinned npm dependency rather than downloading Deno's remote bootstrap.
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { localOnly } from "./env.mjs";
localOnly();
if (
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.VITE_SUPABASE_ANON_KEY
)
  throw Error("Run local:env before starting local functions.");
const dir = ".local/edge";
mkdirSync(dir, { recursive: true });
await build({
  entryPoints: ["supabase/functions/invite-team/index.ts"],
  outfile: dir + "/index.ts",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  plugins: [
    {
      name: "npm-specifiers",
      setup(b) {
        b.onResolve({ filter: /^npm:/ }, (args) => ({
          path: args.path.replace(/^npm:/, "").replace(/@2\.99\.3$/, ""),
          external: false,
          namespace: "npm",
        }));
        b.onLoad({ filter: /.*/, namespace: "npm" }, (args) => ({
          contents: `export * from '${args.path}'`,
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const values = {
  HTTP_PROXY: "",
  HTTPS_PROXY: "",
  http_proxy: "",
  https_proxy: "",
  NO_PROXY: "localhost,127.0.0.1,supabase_kong_quartier-clinic",
  no_proxy: "localhost,127.0.0.1,supabase_kong_quartier-clinic",
  SUPABASE_URL: "http://supabase_kong_quartier-clinic:8000",
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
writeFileSync(
  dir + "/runtime.env",
  Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n"),
  { mode: 0o600 },
);
try {
  execFileSync("docker", ["inspect", "quartier-invite-function"], {
    stdio: "ignore",
  });
  execFileSync("docker", ["rm", "-f", "quartier-invite-function"], {
    stdio: "ignore",
  });
} catch {}
execFileSync(
  "docker",
  [
    "run",
    "-d",
    "--name",
    "quartier-invite-function",
    "--network",
    "supabase_network_quartier-clinic",
    "--network-alias",
    "supabase_edge_runtime_quartier-clinic",
    "--env-file",
    dir + "/runtime.env",
    "-v",
    `${process.cwd()}/${dir}:/home/deno/functions:ro`,
    "--entrypoint",
    "/bin/sh",
    "supabase/edge-runtime:v1.71.0",
    "-c",
    'export NO_PROXY=localhost,127.0.0.1,supabase_kong_quartier-clinic; export no_proxy="$NO_PROXY"; exec edge-runtime start --port 8081 --main-service /home/deno/functions',
  ],
  { stdio: "ignore" },
);
console.log(
  "Local invite function started with the same authorization checks and no remote module downloads.",
);
