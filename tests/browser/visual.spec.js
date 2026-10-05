import {createHash} from "node:crypto";
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
  test(`Original cover/about and public typography are preserved at ${width}px`, async ({
    browser,
  },testInfo) => {
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
    await expect(after.locator("#about-content .media").first()).toBeVisible();
    // Exact pixels remain comparable above the dynamic service catalog. Lower
    // sections move by fractional pixels when service text changes; verify their
    // typography instead of tying the test to the original demo data.
    for(const selector of ['#resultados','.method-section','.testimonial-section','.clinic-section','.faq-section','.final-cta']){
      const styles=async page=>page.locator(selector+' h2').evaluate(el=>{const s=getComputedStyle(el);return {fontFamily:s.fontFamily,fontSize:s.fontSize,color:s.color,lineHeight:s.lineHeight};});
      expect(await styles(after),selector).toEqual(await styles(before));
    }
    for(const page of [before,after])await page.addStyleTag({content:"#site-header{visibility:hidden}"});
    for (const selector of [
      ".hero",
      "#sobre",
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
      const actual=await after.locator(selector).screenshot();
      const expected=await before.locator(selector).screenshot();
      const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
      if(digest(actual)!==digest(expected)){
        await testInfo.attach('actual-'+selector,{body:actual,contentType:'image/png'});
        await testInfo.attach('original-'+selector,{body:expected,contentType:'image/png'});
      }
      expect(digest(actual),selector).toEqual(digest(expected));
    }
    await context.close();
  });
