import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  CATEGORY_RULES, REVIEW_DIR, ROOT, drawCanonicalPart, escapeXml,
  parsePageSource, resolveActiveAssets, writeJson,
} from "./art-pipeline-lib.mjs";

const phaseOneFile = path.join(REVIEW_DIR, "phase-one", "active-assets.json");
const audit = JSON.parse(await fs.readFile(phaseOneFile, "utf8"));
const parsed = await parsePageSource();
const activeById = Object.fromEntries(resolveActiveAssets(parsed).map((item) => [item.id, item]));
const auditById = Object.fromEntries(audit.map((item) => [item.id, item]));
const candidateRoot = path.join(REVIEW_DIR, "canonical-v1-candidates");
const partDir = path.join(candidateRoot, "parts");
await fs.mkdir(partDir, { recursive: true });

const candidates = [];
for (const part of parsed.parts) {
  const legacy = activeById[part.id];
  const review = auditById[part.id];
  if (!legacy || !review) throw new Error(`Missing phase-one record for ${part.id}`);
  let sourceBuffer;
  let sourceKind = "alignment-only-from-resolved-active-source";
  if (review.status === "REGENERATE") {
    sourceBuffer = await fs.readFile(path.join(ROOT, "art-source", "canonical-v1", `${part.id}.png`));
    sourceKind = "regenerated-single-part-candidate";
  }
  const outputFile = path.join(partDir, `${part.id}.png`);
  const render = await drawCanonicalPart(legacy, outputFile, { sourceBuffer });
  const rule = CATEGORY_RULES[part.category] || CATEGORY_RULES.help;
  candidates.push({
    id: part.id,
    name: part.name,
    category: part.category,
    sourceKind,
    legacySourceFile: legacy.sourceFile,
    candidateFile: path.relative(ROOT, outputFile).replaceAll("\\", "/"),
    facing: review.status === "REGENERATE" ? "right-visual-review" : review.facing,
    projection: review.status === "REGENERATE" ? "strict-side-visual-review" : review.projection,
    baseline: rule.baseline,
    mountPoint: rule.anchor,
    normalizedBounds: render.normalizedBounds,
    status: "PENDING_HUMAN_APPROVAL",
    reason: review.status === "REGENERATE"
      ? "New single-part redraw; requires contact-sheet and mixed-build approval before runtime activation."
      : "Phase-one ALIGN_ONLY source normalized without perspective transforms; requires final contact-sheet approval.",
  });
}
await writeJson(path.join(candidateRoot, "candidates.json"), candidates);

const groups = [
  ["01-chassis-contact-sheet.png", ["chassis"]],
  ["02-body-contact-sheet.png", ["body"]],
  ["03-cab-contact-sheet.png", ["cab"]],
  ["04-movement-contact-sheet.png", ["move"]],
  ["05-tool-contact-sheet.png", ["tool"]],
  ["06-extras-contact-sheet.png", ["help", "decor"]],
];
for (const [file, categories] of groups) {
  const items = candidates.filter((item) => categories.includes(item.category));
  const columns = 4;
  const rows = Math.ceil(items.length / columns);
  const composites = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const rule = CATEGORY_RULES[item.category] || CATEGORY_RULES.help;
    const art = await fs.readFile(path.join(partDir, `${item.id}.png`));
    const label = Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:Arial,'Microsoft YaHei',sans-serif;paint-order:stroke;stroke:white;stroke-width:3px}</style><line x1="256" y1="0" x2="256" y2="512" stroke="#15aabf" stroke-dasharray="7 6"/><line x1="0" y1="${rule.baseline}" x2="512" y2="${rule.baseline}" stroke="#fab005" stroke-width="2" stroke-dasharray="8 5"/><line x1="0" y1="${rule.ground}" x2="512" y2="${rule.ground}" stroke="#5c940d" stroke-width="3"/><line x1="${rule.anchor.x - 10}" y1="${rule.anchor.y}" x2="${rule.anchor.x + 10}" y2="${rule.anchor.y}" stroke="#d6336c" stroke-width="3"/><line x1="${rule.anchor.x}" y1="${rule.anchor.y - 10}" x2="${rule.anchor.x}" y2="${rule.anchor.y + 10}" stroke="#d6336c" stroke-width="3"/><path d="M408 38H484M470 24L484 38L470 52" fill="none" stroke="#1971c2" stroke-width="5"/><rect x="8" y="8" width="264" height="34" rx="8" fill="#7048e8"/><text x="18" y="32" fill="white" font-size="17" font-weight="700" stroke="none">PENDING HUMAN APPROVAL</text><text x="12" y="458" fill="#1f2937" font-size="20" font-weight="700">${escapeXml(item.id)}</text><text x="12" y="485" fill="#343a40" font-size="14">${escapeXml(item.sourceKind)}</text></svg>`);
    const tile = await sharp({ create: { width: 512, height: 512, channels: 4, background: "#f8fafc" } }).composite([{ input: art }, { input: label }]).png().toBuffer();
    composites.push({ input: tile, left: (index % columns) * 512, top: Math.floor(index / columns) * 512 });
  }
  await sharp({ create: { width: columns * 512, height: rows * 512, channels: 4, background: "#e9ecef" } }).composite(composites).png().toFile(path.join(candidateRoot, file));
}
console.log(`Staged ${candidates.length} canonical-v1 candidates without changing public assets or runtime mappings.`);
