import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { REVIEW_DIR, alphaAnalysis, writeJson } from "./art-pipeline-lib.mjs";

const root = path.join(REVIEW_DIR, "canonical-v1-candidates");
const candidates = JSON.parse(await fs.readFile(path.join(root, "candidates.json"), "utf8"));
const wheelIds = new Set(["wheel", "orangewheel", "bluewheel", "redwheel", "smallwheel", "farmwheel", "citywheel", "fantasywheel"]);
const results = [];
const failures = [];

for (const item of candidates) {
  const file = path.join(root, "parts", `${item.id}.png`);
  const meta = await sharp(file).metadata();
  const analysis = await alphaAnalysis(await fs.readFile(file));
  const checks = {
    rgba512: meta.width === 512 && meta.height === 512 && meta.channels === 4,
    hasVisiblePixels: Boolean(analysis.bounds),
    noCanvasEdgeContact: analysis.edgePixelRatio === 0,
    noLikelyGreenResidue: analysis.greenResidueRatio <= .003,
    baselineErrorPx: analysis.bounds ? Math.abs((analysis.bounds.y + analysis.bounds.height - 1) - item.baseline) : null,
    toolMountErrorPx: item.category === "tool" && analysis.bounds ? Math.abs(analysis.bounds.x - item.mountPoint.x) : null,
    wheelAspectRatio: wheelIds.has(item.id) && analysis.bounds ? Number((analysis.bounds.width / analysis.bounds.height).toFixed(4)) : null,
  };
  const failed = [];
  if (!checks.rgba512) failed.push("not-512-rgba");
  if (!checks.hasVisiblePixels) failed.push("empty-alpha");
  if (!checks.noCanvasEdgeContact) failed.push("canvas-edge-contact");
  if (!checks.noLikelyGreenResidue) failed.push("green-residue");
  if (checks.baselineErrorPx !== null && checks.baselineErrorPx > 4) failed.push("baseline-error");
  if (checks.toolMountErrorPx !== null && checks.toolMountErrorPx > 4) failed.push("tool-mount-error");
  if (checks.wheelAspectRatio !== null && (checks.wheelAspectRatio < .97 || checks.wheelAspectRatio > 1.03)) failed.push("wheel-aspect-ratio");
  if (failed.length) failures.push({ id: item.id, failed });
  results.push({ id: item.id, checks, failed });
}

const report = {
  candidateCount: candidates.length,
  automatedStatus: failures.length ? "FAIL" : "PASS",
  failures,
  results,
  manualReviewStillRequired: ["facing", "projection", "top-face visibility", "lighting direction", "material consistency", "white or black fringe", "mixed-build fit"],
};
await writeJson(path.join(root, "automated-validation.json"), report);
if (candidates.length !== 114 || failures.length) throw new Error(`Candidate validation failed: count=${candidates.length}, failures=${failures.length}`);
console.log("Automated candidate checks passed for all 114 parts; subjective visual approval remains pending.");
