import path from "node:path";
import sharp from "sharp";
import { REVIEW_DIR, escapeXml, loadAudit, readActiveSource } from "./art-pipeline-lib.mjs";

const BUILDS = [
  { name: "v9 core + v1 auger drill", ids: ["heavyframe", "utilitybody", "cab", "track", "augerdrill"] },
  { name: "v9 core + v1 wrecking ball", ids: ["cranechassis", "cranebody", "cranecab", "wheel", "orangewheel", "wreckingball"] },
  { name: "v9 core + v10 extras", ids: ["firechassis", "firebody", "firecab", "redwheel", "redwheel", "engine", "siren"] },
  { name: "v9 core + v13 green track", ids: ["farmchassis", "tractorbody", "farmcab", "greentrack"] },
  { name: "v9 core + v13 ski", ids: ["snowchassis", "snowbody", "snowcab", "ski", "snowblade"] },
  { name: "v9 core + v13 hover", ids: ["fantasychassis", "fantasybody", "fantasycab", "hover"] },
  { name: "v11 hovercraft set", ids: ["hoverframe", "hoverbody", "hovercab", "hovercraftskirt", "propeller"] },
  { name: "v11 airplane set", ids: ["airframe", "airbody", "pilotcab", "wing", "propeller"] },
  { name: "v11 paraglider set", ids: ["gliderframe", "gliderpod", "gliderseat", "paraglider"] },
  { name: "v13 pontoons + seaplane", ids: ["pontoonframe", "seaplanebody", "bubblecockpit", "propeller"] },
];
const WIDE = new Set(["track", "miningtrack", "snowtrack", "greentrack", "ski", "hover", "hovercraftskirt"]);
const ROUND = new Set(["wheel", "orangewheel", "bluewheel", "redwheel", "smallwheel", "farmwheel", "citywheel", "fantasywheel", "rollerwheel", "paddlewheel"]);
const BOOM = new Set(["shovel", "crane", "wreckingball", "liftplatform"]);
const DECK = new Set(["mixer", "hose", "bridge"]);
const audit = await loadAudit();
const byId = Object.fromEntries(audit.map((asset) => [asset.id, asset]));
const columns = 2, tileWidth = 768, tileHeight = 576;

async function squareArt(asset, size, flip = false) {
  const source = await readActiveSource({ ...asset, cell: asset.sourceCell });
  let image = sharp(source).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (flip) image = image.flop();
  return image.png().toBuffer();
}
function mode(ids) {
  if (ids.some((id) => ["airframe", "gliderframe", "wing", "paraglider", "pilotcab", "gliderseat"].includes(id))) return "air";
  if (ids.some((id) => ["hoverframe", "hoverbody", "hovercab", "hovercraftskirt"].includes(id))) return "hover";
  return "ground";
}
async function renderBuild(build) {
  const rootSize = 320, rootX = 205, rootY = 155;
  const deckY = rootY + rootSize * .56, groundY = rootY + rootSize * .84;
  const transport = mode(build.ids);
  const wheelCount = build.ids.filter((id) => ROUND.has(id)).length;
  let wheelNo = 0, wideNo = 0, helpNo = 0;
  const layers = [];
  for (const id of build.ids) {
    const asset = byId[id];
    if (!asset) continue;
    let size = rootSize, x = rootX, y = rootY, layer = asset.category === "chassis" ? 20 : asset.category === "body" ? 30 : asset.category === "move" ? 40 : asset.category === "tool" ? 50 : asset.category === "cab" ? 60 : 70;
    if (asset.category === "body") {
      size = rootSize * (transport === "ground" ? .76 : .74); x = rootX + rootSize * (transport === "ground" ? .02 : .06); y = transport === "ground" ? deckY - size * .859 : rootY + rootSize * .14;
    } else if (asset.category === "cab") {
      size = rootSize * (transport === "air" ? .44 : .58); x = rootX + rootSize * (transport === "air" ? .54 : .42); y = transport === "air" ? rootY + rootSize * .25 : deckY - size * .941;
    } else if (asset.category === "move") {
      if (id === "wing") { size = rootSize * 1.02; x = rootX - rootSize * .01; y = rootY + rootSize * .02; layer = 24; }
      else if (id === "paraglider") { size = rootSize * 1.16; x = rootX - rootSize * .08; y = rootY - rootSize * .68; layer = 26; }
      else if (id === "propeller") { size = rootSize * .36; x = rootX + rootSize * .8; y = rootY + rootSize * .36; layer = 58; }
      else if (WIDE.has(id)) { size = rootSize * .9; x = rootX + (rootSize - size) / 2 + wideNo * 8; y = groundY - size * (id === "hovercraftskirt" ? .72 : .949) + wideNo * 5; layer = 25 + wideNo; wideNo += 1; }
      else if (ROUND.has(id)) { size = rootSize * (wheelCount >= 4 ? .25 : wheelCount === 3 ? .29 : wheelCount === 2 ? .34 : .36); const ratio = wheelCount === 1 ? .5 : .16 + wheelNo * (.68 / (wheelCount - 1)); x = rootX + rootSize * ratio - size / 2; y = groundY - size * .949; layer = 55; wheelNo += 1; }
    } else if (asset.category === "tool") {
      if (BOOM.has(id)) { size = rootSize * (id === "shovel" ? .82 : id === "crane" ? .78 : .72); x = rootX + rootSize * (id === "shovel" ? .27 : id === "crane" ? .05 : .12); y = deckY - size * .53; layer = 48; }
      else if (DECK.has(id)) { size = rootSize * .56; x = rootX + rootSize * .12; y = deckY - size * .86; layer = 46; }
      else { size = rootSize * .64; x = rootX + rootSize * .72; y = deckY - size * .54; }
    } else if (asset.category === "help") {
      if (["engine", "battery"].includes(id)) { size = rootSize * .28; x = rootX + rootSize * (.08 + (helpNo % 2) * .28); y = rootY + rootSize * .3; }
      else if (["lamp", "siren"].includes(id)) { size = rootSize * .17; x = rootX + rootSize * (.66 + (helpNo % 2) * .16); y = rootY + rootSize * .1; }
      helpNo += 1;
    }
    layers.push({ input: await squareArt(asset, Math.round(size)), left: Math.round(x), top: Math.round(y), layer });
  }
  layers.sort((a, b) => a.layer - b.layer);
  const label = Buffer.from(`<svg width="${tileWidth}" height="${tileHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="none" stroke="#495057" stroke-width="4"/><line x1="384" y1="0" x2="384" y2="576" stroke="#15aabf" stroke-dasharray="7 6"/><line x1="0" y1="423" x2="768" y2="423" stroke="#5c940d" stroke-width="3"/><text x="20" y="36" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#212529">${escapeXml(build.name)}</text><text x="20" y="560" font-family="Arial,sans-serif" font-size="16" fill="#495057">${escapeXml(build.ids.join(" + "))}</text></svg>`);
  return sharp({ create: { width: tileWidth, height: tileHeight, channels: 4, background: "#f8fafc" } }).composite([...layers, { input: label }]).png().toBuffer();
}
const composites = [];
for (let index = 0; index < BUILDS.length; index += 1) composites.push({ input: await renderBuild(BUILDS[index]), left: (index % columns) * tileWidth, top: Math.floor(index / columns) * tileHeight });
await sharp({ create: { width: columns * tileWidth, height: Math.ceil(BUILDS.length / columns) * tileHeight, channels: 4, background: "#dee2e6" } }).composite(composites).png().toFile(path.join(REVIEW_DIR, "07-mixed-vehicle-tests.png"));
console.log(`07-mixed-vehicle-tests.png: ${BUILDS.length} builds rendered with current assembleParts rules`);
