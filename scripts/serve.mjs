import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".ico": "image/x-icon",
};
const server = http.createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }
    let pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (pathname === "/") pathname = "/index.html";
    if (/^\/admin(?:\/.*)?$/.test(pathname) && !extname(pathname))
      pathname = "/admin/index.html";
    const file = resolve(root, "." + pathname);
    if (!file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw Error();
    res.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Cache-Control",
      pathname.includes("/assets/") && !pathname.endsWith(".html")
        ? "public,max-age=3600"
        : "no-cache",
    );
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    const content = await readFile(file);
    const range = req.headers.range;
    if (range && extname(file) === ".mp4") {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (match) {
        const start = Number(match[1]),
          end = match[2]
            ? Math.min(Number(match[2]), info.size - 1)
            : info.size - 1;
        if (start > end || start >= info.size) {
          res.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
          return;
        }
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
        });
        res.end(
          req.method === "HEAD" ? undefined : content.subarray(start, end + 1),
        );
        return;
      }
    }
    res.setHeader("Content-Length", info.size);
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res
      .writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
      .end("Página não encontrada.");
  }
});
server.listen(Number(process.env.PORT || 4173), "0.0.0.0", () =>
  console.log("Quartier production server started."),
);
