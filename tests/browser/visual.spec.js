import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
// Run only when the original uploaded archive is available locally.
import { existsSync } from "node:fs";
const original = "/workspace/scratch/quartier-original/dist";
let server;
test.beforeAll(async () => {
  if (existsSync(original)) {
    server = createServer(async (req, res) => {
      try {
        const file = resolve(
          original,
          "." + (req.url === "/" ? "/index.html" : req.url),
        );
        if (!file.startsWith(original + "/")) {
          res.writeHead(403).end();
          return;
        }
        const bytes = await readFile(file);
        res.setHeader(
          "Content-Type",
          file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".js")
              ? "text/javascript"
              : file.endsWith(".html")
                ? "text/html"
                : file.endsWith(".svg")
                  ? "image/svg+xml"
                  : "application/octet-stream",
        );
        res.end(bytes);
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise((r) => server.listen(5175, "127.0.0.1", r));
  }
});
test.afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
});
for (const width of [1440, 390])
  test(`Original public sections are visually preserved at ${width}px`, async ({
    browser,
  }) => {
    test.skip(
      !existsSync(original),
      "Original ZIP not present in this checkout.",
    );
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    const before = await context.newPage(),
      after = await context.newPage();
    await before.goto("http://127.0.0.1:5175");
    await after.goto("http://127.0.0.1:5173");
    for (const selector of [
      ".hero",
      "#sobre",
      "#procedimentos",
      "#resultados",
      ".method-section",
      "#equipe",
      ".testimonial-section",
      ".clinic-section",
      ".faq-section",
      ".final-cta",
    ]) {
      console.log("Comparing", width, selector);
      for (const page of [before, after]) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        await page.locator(selector + " img").evaluateAll((imgs) =>
          Promise.all(
            imgs.map((i) => {
              i.loading = "eager";
              return i.decode().catch(() => {});
            }),
          ),
        );
      }
      expect(await after.locator(selector).screenshot()).toEqual(
        await before.locator(selector).screenshot(),
      );
    }
    await context.close();
  });
