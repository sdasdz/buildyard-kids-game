import path from "node:path";
import sharp from "sharp";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error("Usage: node scripts/art-clean-background.mjs <input.png> <output.png>");
const input = path.resolve(inputArg);
const output = path.resolve(outputArg);
const { data, info } = await sharp(input).ensureAlpha().toColorspace("srgb").raw().toBuffer({ resolveWithObject: true });
const pixels = info.width * info.height;
let alreadyTransparent = 0;
for (let index = 3; index < data.length; index += 4) if (data[index] < 8) alreadyTransparent += 1;

if (alreadyTransparent / pixels < 0.05) {
  const seen = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0, tail = 0;
  const isBackground = (pixel) => {
    const offset = pixel * 4;
    const r = data[offset], g = data[offset + 1], b = data[offset + 2];
    return Math.min(r, g, b) >= 205 && Math.max(r, g, b) - Math.min(r, g, b) <= 34;
  };
  const add = (pixel) => {
    if (seen[pixel] || !isBackground(pixel)) return;
    seen[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < info.width; x += 1) { add(x); add((info.height - 1) * info.width + x); }
  for (let y = 0; y < info.height; y += 1) { add(y * info.width); add(y * info.width + info.width - 1); }
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % info.width, y = Math.floor(pixel / info.width);
    if (x > 0) add(pixel - 1);
    if (x + 1 < info.width) add(pixel + 1);
    if (y > 0) add(pixel - info.width);
    if (y + 1 < info.height) add(pixel + info.width);
  }
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (!seen[pixel]) continue;
    const offset = pixel * 4;
    data[offset] = 0; data[offset + 1] = 0; data[offset + 2] = 0; data[offset + 3] = 0;
  }
}

await sharp(data, { raw: info }).png().toFile(output);
console.log(JSON.stringify({ input, output, width: info.width, height: info.height, originalTransparentRatio: alreadyTransparent / pixels }));
