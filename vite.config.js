import { defineConfig, loadEnv } from "vite";
import {readFileSync,writeFileSync} from "node:fs";
import { resolve } from "node:path";
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),"VITE_");
 const panel=(process.env.VITE_APP_MODE||env.VITE_APP_MODE)==="panel";let output;
 return {
  plugins: [
    {
      name: "admin-routes",
      configResolved(config){output=resolve(config.root,config.build.outDir);},
      closeBundle(){if(panel)writeFileSync(resolve(output,"index.html"),readFileSync(resolve(output,"admin/index.html")));},
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if(panel&&req.url==="/")req.url="/admin/index.html";
          if (/^\/admin(?:\/[^.?]*)?\/?(?:\?.*)?$/.test(req.url))
            req.url = "/admin/index.html";
          if (/^\/cliente(?:\/[^.?]*)?\/?(?:\?.*)?$/.test(req.url))
            req.url = "/cliente/index.html";
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: panel?{admin:resolve("admin/index.html")}:{
        public: resolve("index.html"),
        customer: resolve("cliente/index.html"),
        admin: resolve("admin/index.html"),
      },
    },
  },
  server: { port: 5173, strictPort: true },
 };
});
