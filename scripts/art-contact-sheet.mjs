import path from "node:path";
import sharp from "sharp";
import { REVIEW_DIR, loadAudit, tileWithOverlay } from "./art-pipeline-lib.mjs";

const groups = [
  ["chassis", "01-chassis-contact-sheet.png", ["chassis"]],
  ["body", "02-body-contact-sheet.png", ["body"]],
  ["cab", "03-cab-contact-sheet.png", ["cab"]],
  ["movement", "04-movement-contact-sheet.png", ["move"]],
  ["tool", "05-tool-contact-sheet.png", ["tool"]],
  ["extras", "06-extras-contact-sheet.png", ["help", "decor"]],
];
const audit = await loadAudit();
for (const [, file, categories] of groups) {
  const assets = audit.filter((asset) => categories.includes(asset.category));
  const columns = 4;
  const rows = Math.ceil(assets.length / columns);
  const tileSize = 512;
  const sheet = sharp({ create: { width: columns * tileSize, height: rows * tileSize, channels: 4, background: "#e9ecef" } });
  const composites = [];
  for (let index = 0; index < assets.length; index += 1) {
    composites.push({ input: await tileWithOverlay(assets[index]), left: (index % columns) * tileSize, top: Math.floor(index / columns) * tileSize });
  }
  await sheet.composite(composites).png().toFile(path.join(REVIEW_DIR, file));
  console.log(`${file}: ${assets.length} assets`);
}

