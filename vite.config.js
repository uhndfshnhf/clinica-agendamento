import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  plugins: [
    {
      name: "admin-routes",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (/^\/admin(?:\/[^.?]*)?\/?(?:\?.*)?$/.test(req.url))
            req.url = "/admin/index.html";
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        public: resolve("index.html"),
        admin: resolve("admin/index.html"),
      },
    },
  },
  server: { port: 5173, strictPort: true },
});
