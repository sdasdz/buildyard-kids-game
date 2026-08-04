import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the construction vehicle game home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>工程车创造营<\/title>/i);
  assert.match(html, /小小工程师/);
  assert.match(html, /开始随机任务/);
  assert.match(html, /自由创造/);
  assert.match(html, /我的车库/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("ships and wires the normalized v9 workshop sprite sheets", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const assetNames = [
    "v9-workshop-chassis.png",
    "v9-workshop-bodies.png",
    "v9-workshop-cabs.png",
    "v9-workshop-tools.png",
    "v9-workshop-movement.png",
  ];

  assert.match(page, /\?v=9\.1/);
  assert.match(page, /function assembleParts/);
  assert.match(page, /function preparePerformanceBuild/);
  assert.match(page, /const deckY = rootY \+ rootSize \* \.56/);
  assert.match(page, /const groundY = rootY \+ rootSize \* \.84/);

  for (const assetName of assetNames) {
    assert.match(page, new RegExp(assetName.replaceAll(".", "\\.")));
    await access(new URL(`../public/assets/${assetName}`, import.meta.url));
  }
});

test("departure preserves the complete child-authored vehicle build", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const start = page.indexOf("function preparePerformanceBuild");
  const end = page.indexOf("\n\nexport default function Home", start);
  const departureBuilder = page.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(departureBuilder, /return input\.map/);
  assert.match(departureBuilder, /\.\.\.part/);
  assert.match(departureBuilder, /part\.rotate/);
  assert.match(departureBuilder, /part\.scale/);
  assert.doesNotMatch(departureBuilder, /rotate:\s*0|scale:\s*1|flip:\s*(?:true|false)/);
  assert.doesNotMatch(page, /carParts\.slice\(0,\s*16\)/);
  assert.match(page, /className="part-motion"/);
  assert.match(css, /\.performance-route \.result-vehicle-art \.part\{[^}]*animation:none!important/);
  assert.match(css, />\.part-motion\{animation:wheel-route-cycle/);
});

test("adding a part preserves every already-positioned instance", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const start = page.indexOf("  const addPart =");
  const end = page.indexOf("\n\n  const autoAssemble", start);
  const addPart = page.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(addPart, /const existing = new Map\(compatible\.map/);
  assert.match(addPart, /const suggested = new Map\(arranged\.map/);
  assert.match(addPart, /return next\.map\(\(part\) => existing\.get\(part\.uid\) \|\| suggested\.get\(part\.uid\) \|\| part\)/);
  assert.doesNotMatch(addPart, /CORE_CATEGORIES/);
});

test("selected modules use direct pixel recoloring without overlay modes", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /function RecoloredPartArt/);
  assert.match(page, /context\.getImageData/);
  assert.match(page, /hsvToRgb/);
  assert.match(page, /className="part-color-bar"/);
  assert.match(page, /updateSelected\(\{ color, originalColor: false, colorMode: "custom" \}\)/);
  assert.match(page, /if \(part\.color && !part\.originalColor\) return part\.color/);
  assert.match(page, /updateSelected\(\{ originalColor: true, color: undefined, colorMode: undefined \}\)/);
  assert.ok(page.match(/"--part-color": resolvedPartColor/g)?.length >= 2);
  assert.match(css, /\.part-recolor\{position:absolute/);
  assert.doesNotMatch(page, /paint-overlay|spriteMaskStyle/);
  assert.doesNotMatch(css, /paint-overlay|mix-blend-mode/);
});

test("paint shop includes a broad safety warning decal library", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  for (const label of ["注意安全", "易燃", "易爆", "禁止烟火", "防火", "高压危险", "当心高温", "戴安全帽", "急救", "紧急救援", "施工注意"]) {
    assert.match(page, new RegExp(label));
  }
  assert.match(page, /className="sticker-row safety-sticker-row"/);
  assert.match(page, /function SafetySticker/);
  assert.match(page, /safety-icons-v1\.png/);
  assert.match(page, /<SafetyStickerIcon sticker=\{sticker\}\/>/);
  assert.match(css, /\.safety-sticker\{width:24%;height:24%;[^}]*background:transparent/);
  assert.doesNotMatch(css, /\.safety-sticker\{min-width:62%/);
});

test("paint stickers drag freely and keep their position in saved previews", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /stickerX\?: number/);
  assert.match(page, /stickerY\?: number/);
  assert.match(page, /sticker\.setPointerCapture\(event\.pointerId\)/);
  assert.match(page, /setPaint\(\(current\) => \(\{ \.\.\.current, stickerX: x, stickerY: y \}\)\)/);
  assert.match(page, /draggable onPointerDown=\{dragSticker\}/);
  assert.match(page, /previewStickerHost/);
  assert.match(page, /x=\{carPaint\.stickerX\} y=\{carPaint\.stickerY\}/);
  assert.match(css, /\.part\.with-art \.part-sticker\.draggable\{z-index:7;pointer-events:auto;touch-action:none/);
});

test("garage vehicles can be removed without opening the build", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /className="car-delete"/);
  assert.match(page, /event\.stopPropagation\(\); setGarageDeleteId\(car\.id\)/);
  assert.match(page, /garage: s\.garage\.filter\(\(car\) => car\.id !== id\)/);
  assert.match(page, /role="dialog" aria-modal="true"/);
  assert.match(page, /确定删除/);
  assert.match(css, /\.car-delete\{[^}]*min-width:64px;[^}]*height:56px/);
});

test("assembly zones are visible guidance only", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  for (const zone of ["rig-body-zone", "rig-cab-zone", "rig-wheel-zone", "rig-front-tool-zone", "rig-rear-tool-zone"]) {
    assert.match(page, new RegExp(`className="${zone}"`));
    assert.match(css, new RegExp(`\\.${zone}\\{`));
  }
  assert.match(page, /仅作参考 · 可以自由摆放/);
  assert.match(css, /\.rig-guide\{[^}]*pointer-events:none/);
});
