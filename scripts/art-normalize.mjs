import fs from "node:fs/promises";
import path from "node:path";
import { ROOT, drawCanonicalPart, parsePageSource, resolveActiveAssets, writeJson } from "./art-pipeline-lib.mjs";

const approval = process.argv.find((arg) => arg.startsWith("--approved-list="));
if (!approval) {
  console.log("Audit-safe stop: normalization requires --approved-list=<human-approved JSON>. No public asset was changed.");
  process.exit(0);
}
const file = path.resolve(ROOT, approval.split("=")[1]);
const list = JSON.parse(await fs.readFile(file, "utf8"));
if (!Array.isArray(list) || !list.length) throw new Error("Approved list must be a non-empty JSON array.");
const audit = JSON.parse(await fs.readFile(path.join(ROOT, "art-review", "active-assets.json"), "utf8"));
const reviewById = Object.fromEntries(audit.map((item) => [item.id, item]));
const parsed = await parsePageSource();
const activeById = Object.fromEntries(resolveActiveAssets(parsed).map((item) => [item.id, item]));
const outputDir = path.join(ROOT, "art-source", "canonical-v1");
const approved = [];
for (const id of list) {
  const asset = activeById[id];
  const review = reviewById[id];
  if (!asset || !review) throw new Error(`Unknown active part ID: ${id}`);
  if (review.status === "REGENERATE") throw new Error(`${id} is marked REGENERATE and cannot be normalized from its current pixels.`);
  const outputFile = path.join(outputDir, `${id}.png`);
  const render = await drawCanonicalPart(asset, outputFile);
  approved.push({ id, category: asset.category, sourceFile: asset.sourceFile, outputFile: path.relative(ROOT, outputFile).replaceAll("\\", "/"), normalizedBounds: render.normalizedBounds });
}
await writeJson(path.join(outputDir, "approved-assets.json"), approved);
console.log(`Normalized ${approved.length} human-approved assets into art-source/canonical-v1. Runtime assets were not changed.`);
