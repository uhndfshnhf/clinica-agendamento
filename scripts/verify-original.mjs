import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
const original = process.argv[2] || "/workspace/scratch/quartier-original/dist";
const digest = (b) => createHash("sha256").update(b).digest("hex");
let count = 0;
async function compare(path = "") {
  for (const e of await readdir(join(original, path), {
    withFileTypes: true,
  })) {
    const relative = join(path, e.name);
    if (e.isDirectory()) await compare(relative);
    else if (relative !== "index.html") {
      if (
        digest(await readFile(join(original, relative))) !==
        digest(await readFile(join("public", relative)))
      )
        throw Error("Original changed: " + relative);
      count++;
    }
  }
}
await compare();
console.log(
  `${count} original visual/code/media files preserved byte for byte.`,
);
