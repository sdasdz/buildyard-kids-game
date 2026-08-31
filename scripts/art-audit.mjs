import fs from "node:fs/promises";
import path from "node:path";
import {
  ACTIVE_DIR, CATEGORY_RULES, REVIEW_DIR, drawCanonicalPart, parsePageSource,
  readManualOverrides, resolveActiveAssets, technicalStatus, writeJson,
} from "./art-pipeline-lib.mjs";

await fs.mkdir(ACTIVE_DIR, { recursive: true });
const parsed = await parsePageSource();
const active = resolveActiveAssets(parsed);
const overrides = await readManualOverrides();
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
const deprecated = [];
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
const symbolLine = (needle) => parsed.source.slice(0, parsed.source.indexOf(needle)).split("\n").length;
await writeJson(path.join(REVIEW_DIR, "code-path-audit.json"), {
  pageFile: "app/page.tsx",
  symbols: [
    { name: "PARTS", line: symbolLine("const PARTS:"), role: "Defines active part IDs, names, categories, tags and design sizes." },
    { name: "SPRITES", line: symbolLine("const SPRITES:"), role: "Maps part IDs to 4x4 sprite-sheet cells." },
    { name: "SPRITE_SHEETS", line: symbolLine("const SPRITE_SHEETS:"), role: "Maps numeric sheet keys to source files." },
    { name: "PART_IMAGE_ASSETS", line: symbolLine("const PART_IMAGE_ASSETS:"), role: "Maps part IDs to individual PNG files and overrides SPRITES at runtime." },
    { name: "spriteStyle", line: symbolLine("function spriteStyle"), role: "Selects individual PNG first; otherwise renders a 4x4 sprite cell. The two paths currently align differently." },
    { name: "RecoloredPartArt", line: symbolLine("function RecoloredPartArt"), role: "Uses the same individual-first source priority for recoloring." },
    { name: "assembleParts", line: symbolLine("function assembleParts"), role: "Applies runtime category placement, sizing, layering and rear-tool flip behavior." }
  ],
  effectivePriority: ["PART_IMAGE_ASSETS individual PNG", "SPRITES sprite-cell"],
  counts: { active: records.length, individual: records.filter((r) => r.sourceType === "individual").length, spriteCell: records.filter((r) => r.sourceType === "sprite-cell").length, deprecated: deprecated.length },
  finding: "Runtime currently has two alignment paths: individual PNG uses centered contain while sprite cells use atlas positioning. Phase one records this and does not alter gameplay code."
});
const promptBase = "以已批准的金标工程车零件为唯一美术风格参考，生成单个【零件名称】模块。严格正右侧正投影视图，车辆前方或功能方向朝画面右侧，镜头与物体侧面完全垂直，camera pitch 0°，camera roll 0°，无广角、无透视缩短、无三分之四视角，不显示顶部大面，不显示正面或尾部大面，所有水平结构保持水平，所有竖直结构保持竖直，轮子和圆形结构保持正圆。统一左上柔和主光、右下轻微环境遮蔽，半写实卡通 3D 儿童工程车风格，干净材质，中等细节，完整主体，透明背景，无地面，无投影，无文字，无水印，不生成完整车辆，只生成一个独立可拼装模块。";
await writeJson(path.join(REVIEW_DIR, "regenerate-prompts.json"), records.filter((item) => item.status === "REGENERATE").map((item) => ({
  id: item.id, name: item.name, sourceFile: item.sourceFile, reason: item.reason,
  prompt: `${promptBase.replace("【零件名称】", item.name)}${item.category === "tool" ? "安装接口位于画面左侧，功能端伸向画面右侧。" : ""}`
})));
const regenerate = records.filter((item) => item.status === "REGENERATE");
const report = `# Canonical art phase-one audit\n\nThis is an audit-only checkpoint. No file under \`public/assets\` was replaced, no runtime mapping was changed, and no perspective was hidden with CSS transforms.\n\n## Scope\n\n- Active part IDs: ${records.length}\n- Individual PNG overrides: ${records.filter((r) => r.sourceType === "individual").length}\n- Active sprite cells: ${records.filter((r) => r.sourceType === "sprite-cell").length}\n- Deprecated/overridden mappings: ${deprecated.length}\n- Status: ${Object.entries(summary).map(([key, count]) => `${key} ${count}`).join(", ")}\n\n## Runtime-source finding\n\n\`PART_IMAGE_ASSETS\` wins over \`SPRITES\` in both \`spriteStyle\` and \`RecoloredPartArt\`. Individual PNGs are centered with contain while atlas cells use 4x4 background positioning, so the active app currently has two alignment paths. The first phase only records this inconsistency.\n\n## Automated checks\n\nThe scripts verify source existence, alpha bounds, edge contact, likely green residue, 512x512 RGBA review output, and the 0.97-1.03 alpha-bound ratio for standalone wheels. These checks cannot reliably judge camera angle, top-face visibility, lighting direction or material style.\n\n## Human-review policy\n\nNo resource is automatically marked PASS. ALIGN_ONLY means technical extraction is clean but a person must approve its facing, projection, lighting, material and mount geometry. REGENERATE is reserved for a visible baked-view/style/structure problem or a failed technical check.\n\n## REGENERATE (${regenerate.length})\n\n${regenerate.map((item) => `- \`${item.id}\` (${item.sourceFile}): ${item.reason}`).join("\n") || "- None"}\n\n## Deliverables\n\n- \`active-assets.json\` and \`code-path-audit.json\`\n- 114 independent 512x512 RGBA review PNGs under \`active-parts/\`\n- Six category contact sheets with anchors and status overlays\n- One 10-build cross-batch regression sheet\n- \`deprecated-assets.json\` and per-resource \`regenerate-prompts.json\`\n\n## Stop gate\n\nChoose the gold-standard assets and approve or amend \`manual-overrides.json\` before phase two. \`art:normalize\` and \`art:pack\` intentionally stop while \`approvedVersion\` is null.\n`;
await fs.writeFile(path.join(REVIEW_DIR, "README.md"), report);
console.log(JSON.stringify({ active: records.length, individuals: records.filter((r) => r.sourceType === "individual").length, spriteCells: records.filter((r) => r.sourceType === "sprite-cell").length, deprecated: deprecated.length, status: summary }, null, 2));
