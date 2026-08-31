import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ROOT } from "./art-pipeline-lib.mjs";

const manifest = JSON.parse(await fs.readFile(path.join(ROOT, "art-manifest.json"), "utf8"));
if (!manifest.approvedVersion || !manifest.canonicalAssets?.length) {
  console.log("Audit-safe stop: no approved canonical assets exist. Nothing was packed or written to public/assets.");
  process.exit(0);
}
const sourceDir = path.join(ROOT, "art-source", manifest.approvedVersion);
const outputDir = path.join(ROOT, "public", "assets", manifest.approvedVersion);
await fs.mkdir(outputDir, { recursive: true });
const records = [];
for (const item of manifest.canonicalAssets) {
  const id = typeof item === "string" ? item : item.id;
  const category = typeof item === "string" ? "uncategorized" : item.category;
  const source = path.join(sourceDir, `${id}.png`);
  await fs.access(source);
  const output = path.join(outputDir, `${id}.png`);
  await sharp(source).ensureAlpha().toColorspace("srgb").png().toFile(output);
  records.push({ id, category, output });
}
for (const category of [...new Set(records.map((item) => item.category))]) {
  const items = records.filter((item) => item.category === category);
  const columns = 4, rows = Math.ceil(items.length / columns);
  const composites = items.map((item, index) => ({ input: item.output, left: (index % columns) * 512, top: Math.floor(index / columns) * 512 }));
  await sharp({ create: { width: columns * 512, height: rows * 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).png().toFile(path.join(outputDir, `${category}-atlas.png`));
}
console.log(`Packed ${records.length} approved canonical parts from the same 512x512 source renders.`);
