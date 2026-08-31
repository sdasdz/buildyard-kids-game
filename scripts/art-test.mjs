import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ACTIVE_DIR, REVIEW_DIR, alphaAnalysis, loadAudit } from "./art-pipeline-lib.mjs";

const audit = await loadAudit();
if (!audit.length) throw new Error("active-assets.json is empty");
const ids = new Set();
for (const asset of audit) {
  if (ids.has(asset.id)) throw new Error(`Duplicate active id: ${asset.id}`);
  ids.add(asset.id);
  for (const key of ["id", "name", "category", "sourceFile", "sourceBatch", "sourceType", "facing", "projection", "alphaBounds", "baseline", "mountPoint", "status", "reason"]) {
    if (asset[key] === undefined) throw new Error(`${asset.id} missing ${key}`);
  }
  if (!asset.sourceFile) throw new Error(`${asset.id} has no active art source`);
  const meta = await sharp(path.join(ACTIVE_DIR, `${asset.id}.png`)).metadata();
  if (meta.width !== 512 || meta.height !== 512 || meta.channels !== 4) throw new Error(`${asset.id} preview is not 512x512 RGBA`);
}
for (const file of ["01-chassis-contact-sheet.png", "02-body-contact-sheet.png", "03-cab-contact-sheet.png", "04-movement-contact-sheet.png", "05-tool-contact-sheet.png", "06-extras-contact-sheet.png", "07-mixed-vehicle-tests.png"]) {
  await fs.access(path.join(REVIEW_DIR, file));
}
const manifest = JSON.parse(await fs.readFile(path.join(process.cwd(), "art-manifest.json"), "utf8"));
if (manifest.approvedVersion === "canonical-v1") {
  if (manifest.canonicalAssets.length !== audit.length) throw new Error("canonical manifest count does not match active parts");
  if (!manifest.runtimeActivated) throw new Error("canonical-v1 is packed but not marked active");
  const page = await fs.readFile(path.join(process.cwd(), "app", "page.tsx"), "utf8");
  if (!page.includes("canonical-v1/${id}.png")) throw new Error("runtime does not map every part to canonical-v1");
  if (page.includes("const SPRITES:") || page.includes("const SPRITE_SHEETS:")) throw new Error("legacy sprite mappings remain active in runtime code");
  for (const asset of audit) {
    if (asset.status !== "PASS") throw new Error(`${asset.id} is not explicitly approved`);
    if (asset.sourceType !== "individual" || asset.sourceBatch !== "canonical-v1") throw new Error(`${asset.id} is not sourced only from canonical-v1`);
    const canonicalFile = path.join(process.cwd(), "public", "assets", "canonical-v1", `${asset.id}.png`);
    const meta = await sharp(canonicalFile).metadata();
    if (meta.width !== 512 || meta.height !== 512 || meta.channels !== 4) throw new Error(`${asset.id} canonical output is not 512x512 RGBA`);
    const analysis = await alphaAnalysis(await fs.readFile(canonicalFile));
    if (!analysis.bounds) throw new Error(`${asset.id} has no visible canonical pixels`);
    if (analysis.edgePixelRatio > 0) throw new Error(`${asset.id} touches the canonical canvas edge`);
    if (analysis.greenResidueRatio > .003) throw new Error(`${asset.id} has possible green residue`);
  }
}
console.log(`Art audit checks passed for ${audit.length} active part IDs.`);
