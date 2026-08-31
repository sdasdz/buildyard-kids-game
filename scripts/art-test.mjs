import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ACTIVE_DIR, REVIEW_DIR, loadAudit } from "./art-pipeline-lib.mjs";

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
console.log(`Art audit checks passed for ${audit.length} active part IDs.`);

