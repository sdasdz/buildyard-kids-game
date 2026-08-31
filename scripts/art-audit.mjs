import fs from "node:fs/promises";
import path from "node:path";
import {
  ACTIVE_DIR, CATEGORY_RULES, REVIEW_DIR, drawCanonicalPart, parsePageSource,
  readManualOverrides, resolveActiveAssets, technicalStatus, writeJson,
} from "./art-pipeline-lib.mjs";

await fs.mkdir(ACTIVE_DIR, { recursive: true });
const parsed = await parsePageSource();
const active = resolveActiveAssets(parsed);
const canonicalActive = active.length > 0 && active.every((asset) => asset.sourceBatch === "canonical-v1");
let overrides = await readManualOverrides();
if (canonicalActive) {
  try {
    overrides = JSON.parse(await fs.readFile(path.join(REVIEW_DIR, "canonical-v1-approvals.json"), "utf8"));
  } catch {
    overrides = {};
  }
}
const records = [];

for (const asset of active) {
  let render;
  let technical;
  try {
    render = await drawCanonicalPart(asset, path.join(ACTIVE_DIR, `${asset.id}.png`));
    technical = technicalStatus(asset, render.analysis);
  } catch (error) {
    technical = { status: "REGENERATE", reasons: [error.message] };
  }
  const manual = overrides[asset.id] || {};
  const rule = CATEGORY_RULES[asset.category] || CATEGORY_RULES.help;
  records.push({
    id: asset.id,
    name: asset.name,
    category: asset.category,
    sourceFile: asset.sourceFile,
    sourceBatch: asset.sourceBatch,
    sourceType: asset.sourceType,
    sourceCell: asset.sourceType === "sprite-cell" ? asset.cell : null,
    facing: manual.facing || "unknown-human-review",
    projection: manual.projection || "unknown-human-review",
    lighting: manual.lighting || "unknown-human-review",
    materialStyle: manual.materialStyle || "unknown-human-review",
    alphaBounds: render?.analysis.bounds || null,
    normalizedBounds: render?.normalizedBounds || null,
    baseline: rule.baseline,
    groundLine: rule.ground,
    mountPoint: rule.anchor,
    status: manual.status || technical.status,
    reason: [...technical.reasons, ...(manual.reason ? [manual.reason] : [])].join(" "),
    automatedChecks: render ? {
      alphaCoverage: Number(render.analysis.alphaCoverage.toFixed(6)),
      edgePixelRatio: Number(render.analysis.edgePixelRatio.toFixed(6)),
      greenResidueRatio: Number(render.analysis.greenResidueRatio.toFixed(6)),
    } : null,
    manualReviewRequired: manual.status !== "PASS",
    manualReviewFields: ["facing", "projection", "top-face visibility", "lighting", "material style", "mount geometry"],
  });
}

const activeIds = new Set(active.map((asset) => asset.id));
let deprecated = [];
if (canonicalActive) {
  try {
    const phaseOneActive = JSON.parse(await fs.readFile(path.join(REVIEW_DIR, "phase-one", "active-assets.json"), "utf8"));
    const phaseOneDeprecated = JSON.parse(await fs.readFile(path.join(REVIEW_DIR, "phase-one", "deprecated-assets.json"), "utf8"));
    deprecated = [
      ...phaseOneActive.map((item) => ({ id: item.id, sourceFile: item.sourceFile, sourceCell: item.sourceCell, reason: `Replaced by canonical-v1/${item.id}.png.` })),
      ...phaseOneDeprecated,
    ];
  } catch {
    deprecated = [];
  }
}
for (const [id, [sheet, cell]] of Object.entries(parsed.sprites)) {
  if (parsed.individuals[id]) deprecated.push({ id, sourceFile: parsed.sheets[sheet], sourceCell: cell, reason: `Overridden at runtime by ${parsed.individuals[id]}.` });
  else if (!activeIds.has(id)) deprecated.push({ id, sourceFile: parsed.sheets[sheet], sourceCell: cell, reason: "Sprite mapping is not present in PARTS." });
}
for (const [id, file] of Object.entries(parsed.individuals)) {
  if (!activeIds.has(id)) deprecated.push({ id, sourceFile: file, sourceCell: null, reason: "Individual asset mapping is not present in PARTS." });
}

await writeJson(path.join(REVIEW_DIR, "active-assets.json"), records);
await writeJson(path.join(REVIEW_DIR, "deprecated-assets.json"), deprecated);
const summary = records.reduce((acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {});
const symbolLine = (needle) => {
  const index = parsed.source.indexOf(needle);
  return index < 0 ? null : parsed.source.slice(0, index).split("\n").length;
};
await writeJson(path.join(REVIEW_DIR, "code-path-audit.json"), {
  pageFile: "app/page.tsx",
  symbols: [
    { name: "PARTS", line: symbolLine("const PARTS:"), role: "Defines active part IDs, names, categories, tags and design sizes." },
    { name: "SPRITES", line: symbolLine("const SPRITES:"), role: canonicalActive ? "Removed from the active runtime; legacy atlases are deprecated on disk." : "Maps part IDs to 4x4 sprite-sheet cells." },
    { name: "SPRITE_SHEETS", line: symbolLine("const SPRITE_SHEETS:"), role: canonicalActive ? "Removed from the active runtime; legacy atlases are deprecated on disk." : "Maps numeric sheet keys to source files." },
    { name: "PART_IMAGE_ASSETS", line: symbolLine("const PART_IMAGE_ASSETS:"), role: canonicalActive ? "Maps every active part ID to canonical-v1/{id}.png." : "Maps part IDs to individual PNG files and overrides SPRITES at runtime." },
    { name: "spriteStyle", line: symbolLine("function spriteStyle"), role: canonicalActive ? "Renders only canonical-v1 individual PNGs." : "Selects individual PNG first; otherwise renders a 4x4 sprite cell." },
    { name: "RecoloredPartArt", line: symbolLine("function RecoloredPartArt"), role: canonicalActive ? "Recolors the same canonical 512x512 PNG used by every other view." : "Uses the same individual-first source priority for recoloring." },
    { name: "assembleParts", line: symbolLine("function assembleParts"), role: "Applies runtime category placement, sizing, layering and rear-tool flip behavior." }
  ],
  effectivePriority: canonicalActive ? ["canonical-v1 individual PNG only"] : ["PART_IMAGE_ASSETS individual PNG", "SPRITES sprite-cell"],
  counts: { active: records.length, individual: records.filter((r) => r.sourceType === "individual").length, spriteCell: records.filter((r) => r.sourceType === "sprite-cell").length, deprecated: deprecated.length },
  finding: canonicalActive ? "Runtime, recoloring, garage previews and mission rendering now share one canonical-v1 PNG path per part." : "Runtime currently has two alignment paths: individual PNG uses centered contain while sprite cells use atlas positioning."
});
const promptBase = "以已批准的金标工程车零件为唯一美术风格参考，生成单个【零件名称】模块。严格正右侧正投影视图，车辆前方或功能方向朝画面右侧，镜头与物体侧面完全垂直，camera pitch 0°，camera roll 0°，无广角、无透视缩短、无三分之四视角，不显示顶部大面，不显示正面或尾部大面，所有水平结构保持水平，所有竖直结构保持竖直，轮子和圆形结构保持正圆。统一左上柔和主光、右下轻微环境遮蔽，半写实卡通 3D 儿童工程车风格，干净材质，中等细节，完整主体，透明背景，无地面，无投影，无文字，无水印，不生成完整车辆，只生成一个独立可拼装模块。";
await writeJson(path.join(REVIEW_DIR, "regenerate-prompts.json"), records.filter((item) => item.status === "REGENERATE").map((item) => ({
  id: item.id, name: item.name, sourceFile: item.sourceFile, reason: item.reason,
  prompt: `${promptBase.replace("【零件名称】", item.name)}${item.category === "tool" ? "安装接口位于画面左侧，功能端伸向画面右侧。" : ""}`
})));
const regenerate = records.filter((item) => item.status === "REGENERATE");
const report = `# Canonical art ${canonicalActive ? "canonical-v1 final audit" : "phase-one audit"}\n\n${canonicalActive ? "The runtime is activated on one approved canonical-v1 PNG path per active part. Legacy batches remain on disk and are recorded as deprecated." : "This is an audit-only checkpoint. No runtime mapping was changed."}\n\n## Scope\n\n- Active part IDs: ${records.length}\n- Active individual PNGs: ${records.filter((r) => r.sourceType === "individual").length}\n- Active sprite cells: ${records.filter((r) => r.sourceType === "sprite-cell").length}\n- Deprecated legacy mappings: ${deprecated.length}\n- Status: ${Object.entries(summary).map(([key, count]) => `${key} ${count}`).join(", ")}\n\n## Runtime-source finding\n\n${canonicalActive ? "All gameplay, recoloring, garage previews and mission scenes read the same pre-aligned 512×512 RGBA canonical files. No CSS perspective, skew or non-uniform correction is used." : "Individual PNG overrides and sprite cells are resolved separately; phase one records that state."}\n\n## Review policy\n\nAutomated checks verify source existence, alpha bounds, edge contact, likely green residue and 512×512 RGBA output. Camera angle, top-face visibility, lighting and material style are accepted only from the explicit review records in ${canonicalActive ? "canonical-v1-approvals.json" : "manual-overrides.json"}.\n\n## REGENERATE (${regenerate.length})\n\n${regenerate.map((item) => `- \`${item.id}\` (${item.sourceFile}): ${item.reason}`).join("\n") || "- None"}\n`;
await fs.writeFile(path.join(REVIEW_DIR, "README.md"), report);
console.log(JSON.stringify({ active: records.length, individuals: records.filter((r) => r.sourceType === "individual").length, spriteCells: records.filter((r) => r.sourceType === "sprite-cell").length, deprecated: deprecated.length, status: summary }, null, 2));
