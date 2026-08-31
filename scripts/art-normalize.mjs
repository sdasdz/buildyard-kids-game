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
const rawDir = path.join(outputDir, "raw");
const approved = [];
for (const id of list) {
  const asset = activeById[id];
  const review = reviewById[id];
  if (!asset || !review) throw new Error(`Unknown active part ID: ${id}`);
  let sourceBuffer;
  let sourceKind = "aligned-active";
  if (review.status === "REGENERATE") {
    const generatedFile = path.join(outputDir, `${id}.png`);
    const rawFile = path.join(rawDir, `${id}.png`);
    try {
      await fs.access(rawFile);
    } catch {
      await fs.mkdir(rawDir, { recursive: true });
      await fs.copyFile(generatedFile, rawFile);
    }
    sourceBuffer = await fs.readFile(rawFile);
    sourceKind = "regenerated-approved";
  }
  const outputFile = path.join(outputDir, `${id}.png`);
  const render = await drawCanonicalPart(asset, outputFile, { sourceBuffer });
  approved.push({
    id,
    name: asset.name,
    category: asset.category,
    sourceKind,
    legacySourceFile: asset.sourceFile,
    outputFile: path.relative(ROOT, outputFile).replaceAll("\\", "/"),
    normalizedBounds: render.normalizedBounds,
  });
}
await writeJson(path.join(outputDir, "approved-assets.json"), approved);
if (approved.length === parsed.parts.length) {
  const manifestFile = path.join(ROOT, "art-manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestFile, "utf8"));
  manifest.phase = "canonical-v1-approved";
  manifest.approvedVersion = "canonical-v1";
  manifest.runtimeActivated = false;
  manifest.canonicalAssets = approved;
  manifest.notes = [
    "canonical-v1 uses one 512x512 RGBA source render per active part ID.",
    "REGENERATE parts use approved redrawn source files kept under art-source/canonical-v1/raw.",
    "ALIGN_ONLY parts are normalized from the phase-one resolved active source without perspective transforms.",
    "Runtime activation is a separate reviewed step after packing and regression rendering.",
  ];
  await writeJson(manifestFile, manifest);
}
console.log(`Normalized ${approved.length} approved assets into art-source/canonical-v1. Runtime assets were not changed.`);
