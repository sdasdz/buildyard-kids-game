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

test("ships and wires the complete canonical-v1 part library", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../art-manifest.json", import.meta.url), "utf8"));

  assert.match(page, /canonical-v1\/\$\{id\}\.png/);
  assert.match(page, /\?v=canonical-v1/);
  assert.doesNotMatch(page, /const SPRITES:|const SPRITE_SHEETS:/);
  assert.match(page, /function assembleParts/);
  assert.match(page, /function preparePerformanceBuild/);
  assert.match(page, /const deckY = rootY \+ rootSize \* \.56/);
  assert.match(page, /const groundY = rootY \+ rootSize \* \.84/);
  assert.equal(manifest.approvedVersion, "canonical-v1");
  assert.equal(manifest.runtimeActivated, true);
  assert.equal(manifest.canonicalAssets.length, 114);
  for (const asset of manifest.canonicalAssets) {
    await access(new URL(`../public/assets/canonical-v1/${asset.id}.png`, import.meta.url));
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
  assert.match(addPart, /const merged = next\.map\(\(part\) => existing\.get\(part\.uid\) \|\| suggested\.get\(part\.uid\) \|\| part\)/);
  assert.match(addPart, /return refreshAssemblyConnections\(merged\)/);
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
  assert.match(page, /参考位置，也可以自己摆/);
  assert.match(css, /\.rig-guide\{[^}]*pointer-events:none/);
});

test("story library exposes 100 missions and does not trap new players in one theme", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const originalStart = page.indexOf("const EVENT_SEEDS = [");
  const originalEnd = page.indexOf("] as const;", originalStart);
  const extraStart = page.indexOf("const EXTRA_EVENT_SEEDS = [");
  const extraEnd = page.indexOf("] as const;", extraStart);
  const originalEntries = page.slice(originalStart, originalEnd).match(/^\s*\["/gm) ?? [];
  const extraEntries = page.slice(extraStart, extraEnd).match(/^\s*\["/gm) ?? [];
  const themeNames = [
    ...page.slice(originalStart, originalEnd).matchAll(/^\s*\["([^"]+)"/gm),
    ...page.slice(extraStart, extraEnd).matchAll(/^\s*\["([^"]+)"/gm),
  ].map((match) => match[1]);

  assert.equal(originalEntries.length, 60);
  assert.equal(extraEntries.length, 40);
  for (const theme of ["建筑工地", "农场田野", "城市维护", "山地救援", "消防防灾", "港口物流", "矿山探索", "海滩水边", "冰雪地区", "奇想任务"]) {
    assert.equal(themeNames.filter((name) => name === theme).length, 10, `${theme} should contain 10 stories`);
  }
  assert.match(page, /const ALL_EVENT_SEEDS = \[\.\.\.EVENT_SEEDS, \.\.\.EXTRA_EVENT_SEEDS\]/);
  assert.match(page, /unlocked: 3/);
  assert.match(page, /unlocked: Math\.max\(3,/);
  assert.match(page, /recent: \[\.\.\.s\.recent\.slice\(-14\), chosen\.id\]/);
  assert.match(page, /recentTraits: \[\.\.\.s\.recentTraits\.slice\(-5\)/);
  assert.match(page, /trait\.action === item\.voiceKey/);
  assert.match(page, /当前可选 \{availableMissions\.length\} \/ 共 \{MISSIONS\.length\} 个故事/);
});

test("assembly uses an explicit connection graph and preserves garage layouts", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /mountedTo\?: string/);
  assert.match(page, /mountSlot\?: MountSlot/);
  assert.match(page, /function refreshAssemblyConnections/);
  assert.match(page, /function buildConnectionGraph/);
  assert.match(page, /connectedFunctionTags/);
  assert.match(page, /data-mounted-to=\{p\.mountedTo \|\| undefined\}/);
  assert.match(page, /🔗 已连接/);
  assert.match(page, /setParts\(refreshAssemblyConnections\(car\.parts\)\)/);
  assert.doesNotMatch(page, /setParts\(assembleParts\(car\.parts/);
});

test("mission theatre selects the real action and has distinct transport and tool motion", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /const performanceAction = mission\?\.voiceKey/);
  assert.match(page, /type TransportMode = "ground"\s*\|\s*"tracked"\s*\|\s*"snow"\s*\|\s*"water"\s*\|\s*"hover"\s*\|\s*"air"/);
  assert.match(page, /function getMovementProfile/);
  assert.match(page, /movementProfile\.motion/);
  assert.match(page, /④ \{mission \? `\$\{mission\.character\}开心地说谢谢`/);
  for (const mode of ["water", "tracked", "snow", "hover"]) assert.match(css, new RegExp(`\\.theatre-stage\\.mode-${mode}`));
  for (const motion of ["theatre-bucket-scoop", "theatre-fork-lift", "theatre-blade-push", "theatre-tow-pull-v14", "theatre-brush-spin", "theatre-mixer-turn", "theatre-bridge-open"]) {
    assert.match(css, new RegExp(`@keyframes ${motion}`));
  }
});

test("missions provide precise briefings and play in a dedicated story theatre", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /objective: string/);
  assert.match(page, /steps: readonly \[string, string, string\]/);
  assert.match(page, /这次要做什么/);
  assert.match(page, /完成时会看到/);
  assert.match(page, /setScreen\("performance"\)/);
  assert.match(page, /screen === "performance" && result/);
  assert.match(page, /className="theatre-target theatre-before"/);
  assert.match(page, /className="theatre-target theatre-after"/);
  assert.match(page, /回仓库继续修改/);
  assert.doesNotMatch(page, /modal-shade result-shade/);
  assert.match(css, /\.performance-screen\{/);
  assert.match(css, /@keyframes theatre-before/);
  assert.match(css, /@keyframes theatre-after/);
  assert.match(css, /@keyframes theatre-tool-lower/);
  assert.match(css, /\.stage-port \.theatre-stage/);
  assert.match(css, /\.stage-mine \.theatre-stage/);
});

test("brief mission hints use offline narration instead of mechanical browser speech", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /const HINT_VOICE_LINES/);
  assert.match(page, /voiceHint: HINT_VOICE_LINES\[e\[5\]\]/);
  assert.match(page, /voiceKey: e\[5\]/);
  assert.match(page, /function playNarrationFiles/);
  assert.match(page, /audio\.addEventListener\("ended", \(\) => playAt\(index \+ 1\)/);
  assert.match(page, /resourcePath\(`\/audio\/hint-\$\{mission\.voiceKey\}\.wav`\)/);
  assert.match(page, /听故事和提示/);
  assert.match(page, /只听提示/);
  assert.doesNotMatch(page, /speechSynthesis|SpeechSynthesisUtterance/);
  for (let index = 1; index <= 100; index += 1) {
    await access(new URL(`../public/audio/mission-${index}.wav`, import.meta.url));
  }
  for (const key of ["dig", "lift", "carry", "drill", "smash", "roll", "push", "tow", "farm", "clear", "water", "clean", "snow", "rough", "bridge", "light", "fire", "mix", "rescue", "fork"]) {
    await access(new URL(`../public/audio/hint-${key}.wav`, import.meta.url));
  }
});

test("desktop file builds resolve art and narration beside index.html", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const main = await readFile(new URL("../desktop-app/main.cjs", import.meta.url), "utf8");

  assert.match(page, /function resourcePath\(path: string\)/);
  assert.match(page, /window\.location\.protocol === "file:"/);
  assert.match(page, /return `\.\$\{path\}`/);
  assert.match(page, /backgroundImage: `url\(\$\{resourcePath\(`/);
  assert.match(page, /image\.src = resourcePath\(/);
  assert.match(page, /resourcePath\(`\/audio\/\$\{mission\.id\}\.wav`\)/);
  assert.match(main, /loadImage\("\.\/assets\/canonical-v1\/wheel\.png"\)/);
  assert.match(main, /loadImage\("\.\/assets\/canonical-v1\/gliderseat\.png"\)/);
  assert.match(main, /loadImage\("\.\/assets\/canonical-v1\/ski\.png"\)/);
  assert.match(main, /loadImage\("\.\/assets\/canonical-v1\/seaplanebody\.png"\)/);
  assert.match(main, /loadAudio\("\.\/audio\/hint-drill\.wav"\)/);
  assert.match(main, /BUILDYARD_SMOKE_REPORT/);
});

test("warehouse includes a long auger drill and a working wrecking-ball module", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /id: "augerdrill", name: "长螺旋钻机"/);
  assert.match(page, /id: "wreckingball", name: "工程大摆锤"/);
  assert.match(page, /canonical-v1\/\$\{id\}\.png/);
  assert.match(page, /smash: \{ scene: "⚫💥🧱"/);
  assert.match(page, /"wreckingball"\]\)/);
  assert.match(css, /@keyframes theatre-auger-work/);
  assert.match(css, /@keyframes theatre-wrecking-swing/);
  await access(new URL("../public/assets/canonical-v1/augerdrill.png", import.meta.url));
  await access(new URL("../public/assets/canonical-v1/wreckingball.png", import.meta.url));
});

test("transport, accessory, and special movement modules share the side-view workshop art direction", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /canonical-v1\/\$\{id\}\.png/);
  assert.doesNotMatch(page, /v10-side-extras|v10-side-transport|v10-side-special-movement/);
  for (const asset of ["rollerwheel", "ski", "hover", "wing", "paraglider", "propeller"]) {
    await access(new URL(`../public/assets/canonical-v1/${asset}.png`, import.meta.url));
  }
});

test("new transport modules are individually cropped and the workshop uses kid-readable categories", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(page, /canonical-v1\/\$\{id\}\.png/);
  assert.match(page, /chassis: \{ label: "车底"/);
  assert.match(page, /move: \{ label: "轮子"/);
  assert.match(page, /cab: \{ label: "车头"/);
  assert.match(page, /help: \{ label: "随车物品"/);
  assert.match(page, /className="category-picture"/);
  assert.match(page, /第 1 步：点一个“车底”/);
  assert.match(css, /V12 kid-first workshop navigation/);
  for (const part of ["hovercab", "pilotcab", "gliderseat", "bubblecockpit", "hoverbody", "airbody", "gliderpod", "hoverframe", "airframe", "gliderframe", "hovercraftskirt", "wing", "paraglider", "propeller"]) {
    await access(new URL(`../public/assets/canonical-v1/${part}.png`, import.meta.url));
  }
});

test("problem modules use complete independent RGBA assets without sprite-sheet bleed", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const assets = ["greentrack", "ski", "hover", "pontoonframe", "seaplanebody"];

  assert.match(page, /canonical-v1\/\$\{id\}\.png/);
  for (const part of assets) {
    const fileName = `${part}.png`;
    const png = await readFile(new URL(`../public/assets/canonical-v1/${fileName}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(png[25], 6, `${fileName} must be RGBA rather than a painted checkerboard`);
    assert.equal(png.readUInt32BE(16), 512);
    assert.equal(png.readUInt32BE(20), 512);
  }
});
