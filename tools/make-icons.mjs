// Draws the app icons as PNGs with no dependencies: node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../icons/', import.meta.url));
mkdirSync(out, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const SS = 4; // supersampling for smooth edges
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const [pr, pg, pb, pa] = pixel((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
        r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = a ? r / a : 0; raw[o + 1] = a ? g / a : 0; raw[o + 2] = a ? b / a : 0; raw[o + 3] = (a / (SS * SS)) * 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// A bold, slightly italic "H" built from three bars, in unit coordinates.
function inH(x, y, scale) {
  const cx = 0.5, cy = 0.5;
  let u = (x - cx) / scale, v = (y - cy) / scale;
  u += v * 0.18; // italic slant
  const leg = Math.abs(v) <= 0.5 && ((u >= -0.42 && u <= -0.18) || (u >= 0.18 && u <= 0.42));
  const bar = Math.abs(v) <= 0.1 && u >= -0.2 && u <= 0.2;
  return leg || bar;
}

const BG = [13, 13, 13], RED = [211, 47, 47], GOLD = [201, 162, 39], WHITE = [245, 245, 245];
function appIcon(x, y) {
  const d = Math.hypot(x - 0.5, y - 0.5);
  if (inH(x, y, 0.5)) return [...WHITE, 1];
  if (d <= 0.36) return [...RED, 1];
  if (d <= 0.4 && d >= 0.385) return [...GOLD, 1];
  return [...BG, 1];
}
const badge = (x, y) => (inH(x, y, 0.8) ? [255, 255, 255, 1] : [0, 0, 0, 0]);

writeFileSync(out + 'icon-512.png', png(512, appIcon));
writeFileSync(out + 'icon-192.png', png(192, appIcon));
writeFileSync(out + 'apple-touch-icon.png', png(180, appIcon));
writeFileSync(out + 'badge-96.png', png(96, badge));
console.log('icons written to', out);
