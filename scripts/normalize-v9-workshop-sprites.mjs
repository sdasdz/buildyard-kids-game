import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, "..");
const source = path.join(project, "tmp/imagegen-v9");
const assets = path.join(project, "public/assets");
const cell = 512;

async function keepLargestConnectedShape(input) {
  const raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = raw.info;
  const pixels = raw.data;
  const visited = new Uint8Array(width * height);
  let best = [];
  const directions = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1];

  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] || pixels[start * channels + 3] <= 3) continue;
    const stack = [start];
    const shape = [];
    visited[start] = 1;
    while (stack.length) {
      const current = stack.pop();
      shape.push(current);
      const x = current % width;
      for (const offset of directions) {
        const next = current + offset;
        if (next < 0 || next >= width * height || visited[next]) continue;
        const nextX = next % width;
        if (Math.abs(nextX - x) > 1 || pixels[next * channels + 3] <= 3) continue;
        visited[next] = 1;
        stack.push(next);
      }
    }
    if (shape.length > best.length) best = shape;
  }

  const keep = new Uint8Array(width * height);
  best.forEach((pixel) => { keep[pixel] = 1; });
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (!keep[pixel]) pixels[pixel * channels + 3] = 0;
  }
  return sharp(pixels, { raw: { width, height, channels } }).png().toBuffer();
}

const groups = [
  { input: "chassis-alpha.png", output: "v9-workshop-chassis.png", maxW: 470, maxH: 250, x: "center", y: "bottom", bottom: 390 },
  { input: "bodies-alpha.png", output: "v9-workshop-bodies.png", maxW: 460, maxH: 340, x: "center", y: "bottom", bottom: 440 },
  { input: "cabs-alpha.png", output: "v9-workshop-cabs.png", maxW: 390, maxH: 445, x: "right", y: "bottom", right: 28, bottom: 482 },
  { input: "tools-alpha.png", output: "v9-workshop-tools.png", maxW: 466, maxH: 430, x: "left", y: "center", left: 23 },
  { input: "movement-alpha.png", output: "v9-workshop-movement.png", maxW: 440, maxH: 440, x: "center", y: "bottom", bottom: 486 },
];

for (const group of groups) {
  const inputPath = path.join(source, group.input);
  const metadata = await sharp(inputPath).metadata();
  const composites = [];

  for (let index = 0; index < 16; index += 1) {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const left = Math.round(column * metadata.width / 4);
    const top = Math.round(row * metadata.height / 4);
    const right = Math.round((column + 1) * metadata.width / 4);
    const bottom = Math.round((row + 1) * metadata.height / 4);
    const cellBuffer = await sharp(inputPath)
      .extract({ left, top, width: right - left, height: bottom - top })
      .png()
      .toBuffer();
    const isolated = await keepLargestConnectedShape(cellBuffer);
    const cropped = await sharp(isolated)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
      .png()
      .toBuffer({ resolveWithObject: true });
    const scale = Math.min(group.maxW / cropped.info.width, group.maxH / cropped.info.height);
    const width = Math.max(1, Math.round(cropped.info.width * scale));
    const height = Math.max(1, Math.round(cropped.info.height * scale));
    const resized = await sharp(cropped.data).resize(width, height, { fit: "fill" }).png().toBuffer();

    const x = group.x === "left"
      ? group.left
      : group.x === "right"
        ? cell - group.right - width
        : Math.round((cell - width) / 2);
    const y = group.y === "bottom"
      ? group.bottom - height
      : Math.round((cell - height) / 2);
    composites.push({ input: resized, left: column * cell + x, top: row * cell + y });
  }

  await sharp({ create: { width: cell * 4, height: cell * 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(path.join(assets, group.output));
  console.log(`normalized ${group.output}`);
}
