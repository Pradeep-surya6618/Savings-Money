import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "public/Icons/FuFi-Logo-BlackBG.png";
const OUT = "public/Icons"; // capital — matches the folder all runtime refs use (case-sensitive prod)
const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };

await mkdir(OUT, { recursive: true });

// "any" icons + apple-touch: logo fit-contained on a black square (logo bg is black → seamless).
for (const size of [192, 512]) {
  await sharp(SRC).resize(size, size, { fit: "contain", background: BLACK }).png().toFile(`${OUT}/icon-${size}.png`);
}
await sharp(SRC).resize(180, 180, { fit: "contain", background: BLACK }).png().toFile(`${OUT}/apple-touch-icon.png`);

// Maskable: logo within an ~80% safe zone, centered on a 512 black canvas.
const inner = await sharp(SRC).resize(410, 410, { fit: "contain", background: BLACK }).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: BLACK } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(`${OUT}/icon-maskable-512.png`);

console.log("PWA icons generated in", OUT);
