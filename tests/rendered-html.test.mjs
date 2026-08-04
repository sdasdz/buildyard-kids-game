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

test("selected modules support persistent direct material tinting", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /type PartColorMode = "auto" \| "primary" \| "secondary" \| "wheels" \| "custom" \| "original"/);
  assert.match(page, /colorMode\?: PartColorMode/);
  assert.match(page, /function resolvedPartColor/);
  assert.match(page, /className="part-color-bar"/);
  assert.match(page, /updateSelected\(\{ colorMode: "custom", color \}\)/);
  assert.match(page, /updateSelected\(\{ colorMode: "original", color: undefined \}\)/);
  assert.ok(page.match(/"--part-color": resolvedPartColor/g)?.length >= 2);
  assert.match(css, /\.part\.with-art\.custom-color \.paint-overlay\{opacity:/);
  assert.match(css, /\.part\.with-art\.original-color \.paint-overlay\{display:none!important\}/);
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
