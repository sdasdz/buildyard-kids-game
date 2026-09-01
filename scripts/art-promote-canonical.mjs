import fs from "node:fs/promises";
import path from "node:path";
import { REVIEW_DIR, ROOT, writeJson } from "./art-pipeline-lib.mjs";

if (!process.argv.includes("--confirmed-by-user")) {
  throw new Error("Promotion requires --confirmed-by-user after the contact sheets and mixed builds are approved.");
}

const candidateRoot = path.join(REVIEW_DIR, "canonical-v1-candidates");
const validation = JSON.parse(await fs.readFile(path.join(candidateRoot, "automated-validation.json"), "utf8"));
const candidates = JSON.parse(await fs.readFile(path.join(candidateRoot, "candidates.json"), "utf8"));
const phaseOne = JSON.parse(await fs.readFile(path.join(REVIEW_DIR, "phase-one", "active-assets.json"), "utf8"));
if (validation.automatedStatus !== "PASS" || validation.candidateCount !== 114 || candidates.length !== 114) {
  throw new Error("The complete 114-part candidate set has not passed automated validation.");
}

const sourceDir = path.join(ROOT, "art-source", "canonical-v1");
const rawDir = path.join(sourceDir, "raw");
await fs.mkdir(rawDir, { recursive: true });
const regenerated = new Set(phaseOne.filter((item) => item.status === "REGENERATE").map((item) => item.id));

for (const id of regenerated) {
  const current = path.join(sourceDir, `${id}.png`);
  const raw = path.join(rawDir, `${id}.png`);
  try { await fs.access(raw); }
  catch { await fs.copyFile(current, raw); }
}

const approved = [];
const approvals = {};
for (const item of candidates) {
  const source = path.join(candidateRoot, "parts", `${item.id}.png`);
  const output = path.join(sourceDir, `${item.id}.png`);
  await fs.copyFile(source, output);
  const sourceKind = regenerated.has(item.id) ? "regenerated-approved" : "aligned-active-approved";
  approved.push({
    id: item.id,
    name: item.name,
    category: item.category,
    sourceKind,
    legacySourceFile: item.legacySourceFile,
    outputFile: `art-source/canonical-v1/${item.id}.png`,
    normalizedBounds: item.normalizedBounds,
  });
  approvals[item.id] = {
    status: "PASS",
    facing: "right",
    projection: "strict-side-orthographic",
    lighting: "upper-left-soft",
    materialStyle: "canonical-v1-gold-v9",
    reason: "Approved after user review of the six canonical contact sheets and ten mixed-build tests on 2026-09-01.",
  };
}

await writeJson(path.join(sourceDir, "approved-assets.json"), approved);
await writeJson(path.join(REVIEW_DIR, "canonical-v1-approvals.json"), approvals);
const manifestFile = path.join(ROOT, "art-manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestFile, "utf8"));
manifest.phase = "canonical-v1-approved";
manifest.approvedVersion = "canonical-v1";
manifest.runtimeActivated = false;
manifest.canonicalAssets = approved;
manifest.notes = [
  "canonical-v1 uses one approved 512x512 RGBA PNG per active part ID.",
  "The 25 redrawn source images remain under art-source/canonical-v1/raw.",
  "All approved outputs use the same drawCanonicalPart normalization path.",
  "Legacy batches remain on disk and are recorded in the deprecated audit after activation.",
];
await writeJson(manifestFile, manifest);
console.log(`Promoted ${approved.length} user-confirmed canonical-v1 assets. Runtime remains unchanged until packing and activation.`);
