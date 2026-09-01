import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const ROOT = process.cwd();
export const PAGE_FILE = path.join(ROOT, "app", "page.tsx");
export const ASSET_DIR = path.join(ROOT, "public", "assets");
export const REVIEW_DIR = path.join(ROOT, "art-review");
export const ACTIVE_DIR = path.join(REVIEW_DIR, "active-parts");
export const CANVAS = 512;

export const CATEGORY_RULES = {
  chassis: { baseline: 390, ground: 486, anchor: { x: 256, y: 390 }, label: "CHASSIS" },
  body: { baseline: 440, ground: 486, anchor: { x: 256, y: 440 }, label: "BODY" },
  cab: { baseline: 482, ground: 486, anchor: { x: 484, y: 482 }, rightMargin: 28, label: "CAB" },
  move: { baseline: 486, ground: 486, anchor: { x: 256, y: 486 }, label: "MOVEMENT" },
  tool: { baseline: 440, ground: 486, anchor: { x: 23, y: 350 }, label: "TOOL" },
  help: { baseline: 440, ground: 486, anchor: { x: 256, y: 440 }, provisional: true, label: "EXTRAS" },
  decor: { baseline: 440, ground: 486, anchor: { x: 256, y: 440 }, provisional: true, label: "EXTRAS" },
};

const STATUS_COLORS = {
  PASS: "#2f9e44",
  ALIGN_ONLY: "#f59f00",
  REGENERATE: "#e03131",
  DEPRECATED: "#868e96",
};

function block(source, start, end) {
  const begin = source.indexOf(start);
  const finish = source.indexOf(end, begin + start.length);
  if (begin < 0 || finish < 0) throw new Error(`Cannot find source block: ${start}`);
  return source.slice(begin, finish);
}

export async function parsePageSource() {
  const source = await fs.readFile(PAGE_FILE, "utf8");
  const hasLegacySprites = source.includes("const SPRITES:");
  const partsBlock = block(source, "const PARTS:", hasLegacySprites ? "const SPRITES:" : "const PART_IMAGE_ASSETS:");
  const spritesBlock = hasLegacySprites ? block(source, "const SPRITES:", "const SPRITE_SHEETS:") : "";
  const sheetsBlock = hasLegacySprites ? block(source, "const SPRITE_SHEETS:", "const PART_IMAGE_ASSETS:") : "";
  const individualBlock = block(source, "const PART_IMAGE_ASSETS:", "function hasPartArt");

  const parts = [];
  const partRe = /\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",[\s\S]*?category:\s*"([^"]+)",\s*tags:\s*\[([^\]]*)\],\s*w:\s*(\d+),\s*h:\s*(\d+)\s*\}/g;
  for (const match of partsBlock.matchAll(partRe)) {
    parts.push({
      id: match[1], name: match[2], category: match[3],
      tags: [...match[4].matchAll(/"([^"]+)"/g)].map((m) => m[1]),
      w: Number(match[5]), h: Number(match[6]),
    });
  }

  const sprites = {};
  for (const match of spritesBlock.matchAll(/([a-zA-Z0-9_]+)\s*:\s*\[(\d+)\s*,\s*(\d+)\]/g)) {
    sprites[match[1]] = [Number(match[2]), Number(match[3])];
  }
  const sheets = {};
  for (const match of sheetsBlock.matchAll(/(\d+)\s*:\s*"([^"]+)"/g)) sheets[Number(match[1])] = match[2];
  const individuals = {};
  for (const match of individualBlock.matchAll(/([a-zA-Z0-9_]+)\s*:\s*"([^"]+)"/g)) individuals[match[1]] = match[2];
  if (individualBlock.includes("canonical-v1/${id}.png")) {
    for (const part of parts) individuals[part.id] = `canonical-v1/${part.id}.png`;
  }

  if (parts.length < 50) throw new Error(`PARTS parse looks incomplete (${parts.length})`);
  return { source, parts, sprites, sheets, individuals };
}

export function sourceBatch(file) {
  if (file.includes("canonical-v1/")) return "canonical-v1";
  const version = file.match(/(?:^|[-_])(v\d+)(?:[-_.]|$)/i)?.[1];
  return version ? version.toLowerCase() : "unversioned";
}

export function resolveActiveAssets(parsed) {
  return parsed.parts.map((part) => {
    const individual = parsed.individuals[part.id];
    const sprite = parsed.sprites[part.id];
    if (individual) return { ...part, sourceFile: individual, sourceBatch: sourceBatch(individual), sourceType: "individual" };
    if (sprite) {
      const [sheet, cell] = sprite;
      return { ...part, sourceFile: parsed.sheets[sheet], sourceBatch: sourceBatch(parsed.sheets[sheet]), sourceType: "sprite-cell", sheet, cell };
    }
    return { ...part, sourceFile: null, sourceBatch: "missing", sourceType: "missing" };
  });
}

export async function readActiveSource(asset) {
  if (!asset.sourceFile) throw new Error(`No art source for ${asset.id}`);
  const file = path.join(ASSET_DIR, asset.sourceFile);
  const input = sharp(file, { failOn: "none" }).ensureAlpha().toColorspace("srgb");
  if (asset.sourceType === "individual") return input.png().toBuffer();
  const meta = await input.metadata();
  const cellWidth = Math.floor(meta.width / 4);
  const cellHeight = Math.floor(meta.height / 4);
  const column = asset.cell % 4;
  const row = Math.floor(asset.cell / 4);
  return input.extract({ left: column * cellWidth, top: row * cellHeight, width: cellWidth, height: cellHeight }).png().toBuffer();
}

export async function alphaAnalysis(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  let opaque = 0, green = 0, edge = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a <= 8) continue;
      opaque += 1;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      if (g > 150 && g > r * 1.35 && g > b * 1.25) green += 1;
      if (x <= 1 || y <= 1 || x >= info.width - 2 || y >= info.height - 2) edge += 1;
    }
  }
  const empty = maxX < 0;
  const bounds = empty ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  return {
    width: info.width, height: info.height, bounds,
    alphaCoverage: opaque / (info.width * info.height),
    greenResidueRatio: opaque ? green / opaque : 0,
    edgePixelRatio: opaque ? edge / opaque : 0,
  };
}

function fitSize(bounds, category) {
  const maxWidth = category === "tool" ? 466 : category === "cab" ? 300 : 430;
  const maxHeight = category === "cab" ? 440 : category === "move" ? 320 : category === "tool" ? 390 : 340;
  return Math.min(maxWidth / bounds.width, maxHeight / bounds.height, 1.8);
}

export async function drawCanonicalPart(asset, outputFile, options = {}) {
  const source = options.sourceBuffer || await readActiveSource(asset);
  const analysis = await alphaAnalysis(source);
  if (!analysis.bounds) throw new Error(`Asset ${asset.id} has no visible pixels`);
  if (!options.sourceBuffer && asset.sourceBatch === "canonical-v1") {
    if (analysis.width !== CANVAS || analysis.height !== CANVAS) throw new Error(`Canonical asset ${asset.id} is not ${CANVAS}x${CANVAS}`);
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await sharp(source).ensureAlpha().toColorspace("srgb").png().toFile(outputFile);
    return { analysis, normalizedBounds: analysis.bounds, scale: 1 };
  }
  const rule = CATEGORY_RULES[asset.category] || CATEGORY_RULES.help;
  const crop = await sharp(source).extract({
    left: analysis.bounds.x,
    top: analysis.bounds.y,
    width: analysis.bounds.width,
    height: analysis.bounds.height,
  }).png().toBuffer();
  const scale = fitSize(analysis.bounds, asset.category);
  const width = Math.max(1, Math.round(analysis.bounds.width * scale));
  const height = Math.max(1, Math.round(analysis.bounds.height * scale));
  const resized = await sharp(crop).resize(width, height, { fit: "fill" }).png().toBuffer();
  let left = Math.round((CANVAS - width) / 2);
  let top = Math.round(rule.baseline - height);
  if (asset.category === "cab") left = CANVAS - (rule.rightMargin || 28) - width;
  if (asset.category === "tool") left = rule.anchor.x;
  left = Math.max(0, Math.min(CANVAS - width, left));
  top = Math.max(0, Math.min(CANVAS - height, top));
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left, top }]).png().toFile(outputFile);
  return { analysis, normalizedBounds: { x: left, y: top, width, height }, scale };
}

function roundMovement(asset) {
  return ["wheel", "orangewheel", "bluewheel", "redwheel", "smallwheel", "farmwheel", "citywheel", "fantasywheel"].includes(asset.id);
}

export function technicalStatus(asset, analysis) {
  const reasons = [];
  let status = "ALIGN_ONLY";
  if (!asset.sourceFile) return { status: "REGENERATE", reasons: ["No active source file is mapped."] };
  if (!analysis?.bounds) return { status: "REGENERATE", reasons: ["No visible alpha content."] };
  if (analysis.edgePixelRatio > 0.0005) { status = "REGENERATE"; reasons.push("Visible pixels touch the source-cell edge; crop or atlas bleed requires review."); }
  if (analysis.greenResidueRatio > 0.003) { status = "REGENERATE"; reasons.push("Possible green-screen residue exceeds the technical threshold."); }
  if (analysis.alphaCoverage > 0.92) { status = "REGENERATE"; reasons.push("Source is almost fully opaque; transparent-background requirement is likely not met."); }
  if (roundMovement(asset)) {
    const ratio = analysis.bounds.width / analysis.bounds.height;
    if (ratio < 0.97 || ratio > 1.03) { status = "REGENERATE"; reasons.push(`Circular movement alpha ratio ${ratio.toFixed(3)} is outside 0.97-1.03.`); }
  }
  if (!reasons.length) reasons.push("Technical extraction is clean; projection, facing, lighting and style still require human review before PASS.");
  return { status, reasons };
}

export async function readManualOverrides() {
  try { return JSON.parse(await fs.readFile(path.join(REVIEW_DIR, "manual-overrides.json"), "utf8")); }
  catch { return {}; }
}

export function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
}

export function overlaySvg(asset, width = 512, height = 512, compact = false) {
  const rule = CATEGORY_RULES[asset.category] || CATEGORY_RULES.help;
  const status = asset.status || "ALIGN_ONLY";
  const color = STATUS_COLORS[status] || STATUS_COLORS.ALIGN_ONLY;
  const font = compact ? 15 : 20;
  const file = asset.sourceFile ? path.basename(asset.sourceFile) : "MISSING";
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>text{font-family:Arial,'Microsoft YaHei',sans-serif}.label{paint-order:stroke;stroke:white;stroke-width:4px;stroke-linejoin:round}</style>
    <line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="#15aabf" stroke-width="1" stroke-dasharray="7 6" opacity=".75"/>
    <line x1="0" y1="${rule.baseline}" x2="${width}" y2="${rule.baseline}" stroke="#fab005" stroke-width="2" stroke-dasharray="8 5"/>
    <line x1="0" y1="${rule.ground}" x2="${width}" y2="${rule.ground}" stroke="#5c940d" stroke-width="3"/>
    <path d="M${width - 104} 38 H${width - 28} M${width - 42} 24 L${width - 28} 38 L${width - 42} 52" fill="none" stroke="#1971c2" stroke-width="5"/>
    <line x1="${rule.anchor.x - 10}" y1="${rule.anchor.y}" x2="${rule.anchor.x + 10}" y2="${rule.anchor.y}" stroke="#d6336c" stroke-width="3"/>
    <line x1="${rule.anchor.x}" y1="${rule.anchor.y - 10}" x2="${rule.anchor.x}" y2="${rule.anchor.y + 10}" stroke="#d6336c" stroke-width="3"/>
    <rect x="8" y="8" width="${Math.min(width - 16, 196)}" height="34" rx="8" fill="${color}" opacity=".94"/>
    <text x="18" y="32" fill="white" font-size="${font}" font-weight="700">${escapeXml(status)}</text>
    <text class="label" x="12" y="${height - 54}" fill="#1f2937" font-size="${font}" font-weight="700">${escapeXml(asset.id)}</text>
    <text class="label" x="12" y="${height - 28}" fill="#343a40" font-size="${compact ? 12 : 15}">${escapeXml(file)} | ${escapeXml(asset.sourceBatch)}</text>
  </svg>`);
}

export async function loadAudit() {
  return JSON.parse(await fs.readFile(path.join(REVIEW_DIR, "active-assets.json"), "utf8"));
}

export async function tileWithOverlay(asset) {
  const art = await fs.readFile(path.join(ACTIVE_DIR, `${asset.id}.png`));
  return sharp({ create: { width: 512, height: 512, channels: 4, background: "#f8fafc" } })
    .composite([{ input: art }, { input: overlaySvg(asset) }]).png().toBuffer();
}

export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
