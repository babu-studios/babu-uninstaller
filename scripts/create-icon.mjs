import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

const sizes = [[128, "ic07"], [256, "ic08"], [512, "ic09"], [1024, "ic10"]];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(name, payload) {
  const type = Buffer.from(name);
  const body = Buffer.concat([type, payload]);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([header, body, checksum]);
}

function icnsChunk(name, payload) {
  const type = Buffer.from(name);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length + 8);
  return Buffer.concat([type, header, payload]);
}

function png(size) {
  const pixels = Buffer.alloc(size * (size * 4 + 1));
  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    for (let x = 0; x < size; x++) {
      const edgeX = Math.min(x, size - 1 - x);
      const edgeY = Math.min(y, size - 1 - y);
      const cornerX = Math.max(radius - edgeX, 0);
      const cornerY = Math.max(radius - edgeY, 0);
      const inside = cornerX ** 2 + cornerY ** 2 <= radius ** 2;
      const offset = row + 1 + x * 4;
      if (!inside) continue;
      const mix = Math.min(1, (x / size + y / size) * 0.55);
      pixels[offset] = Math.round(141 * (1 - mix) + 72 * mix);
      pixels[offset + 1] = Math.round(91 * (1 - mix) + 211 * mix);
      pixels[offset + 2] = Math.round(246 * (1 - mix) + 192 * mix);
      pixels[offset + 3] = 255;
      for (const [cx, cy, radiusX, radiusY, thin] of [
        [0.5, 0.37, 0.17, 0.22, 0.018], [0.75, 0.24, 0.055, 0.075, 0.009],
        [0.27, 0.63, 0.035, 0.05, 0.007]
      ]) {
        const dx = Math.abs(x / size - cx);
        const dy = Math.abs(y / size - cy);
        if (dx / radiusX + dy / radiusY < 1 && (dx < thin || dy < thin)) pixels.fill(245, offset, offset + 3);
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(pixels, { level: 9 })), pngChunk("IEND", Buffer.alloc(0))
  ]);
}

await mkdir("build", { recursive: true });
const icons = sizes.map(([size, type]) => icnsChunk(type, png(size)));
const body = Buffer.concat(icons);
const header = Buffer.alloc(8);
header.write("icns", 0);
header.writeUInt32BE(body.length + header.length, 4);
await writeFile("build/icon.icns", Buffer.concat([header, body]));
