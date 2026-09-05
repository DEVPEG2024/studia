#!/usr/bin/env node
/**
 * Genere src/common/logo.png (icone de l'application) sans dependance :
 * une balle de padel sur fond sombre arrondi, dessinee pixel par pixel.
 *
 * Usage : node tools/make-icon.js [taille]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = Number(process.argv[2]) || 192;
const OUT = path.join(__dirname, '..', 'src', 'common', 'logo.png');

const BG = [11, 13, 16];
const BALL = [216, 240, 58];
const SEAM = [15, 18, 12];

/** Anti-aliasing : couverture d'un pixel par echantillonnage 3x3. */
function coverage(x, y, test) {
  let hits = 0;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      if (test(x + (sx + 0.5) / 3, y + (sy + 0.5) / 3)) hits++;
    }
  }
  return hits / 9;
}

function mix(dst, src, alpha, offset) {
  for (let c = 0; c < 3; c++) {
    dst[offset + c] = Math.round(dst[offset + c] * (1 - alpha) + src[c] * alpha);
  }
}

function build(size) {
  const r = size / 2;
  const radius = size * 0.22;           // arrondi du fond
  const ballR = size * 0.33;
  const seamR = size * 0.48;
  const seamOffset = size * 0.48;
  const seamWidth = size * 0.022;

  const inRounded = (x, y) => {
    const dx = Math.min(x, size - x);
    const dy = Math.min(y, size - y);
    if (dx >= radius || dy >= radius) return x >= 0 && y >= 0 && x <= size && y <= size;
    const cx = x < r ? radius : size - radius;
    const cy = y < r ? radius : size - radius;
    return Math.hypot(x - cx, y - cy) <= radius;
  };
  const inBall = (x, y) => Math.hypot(x - r, y - r) <= ballR;
  const onSeam = (x, y) => {
    if (!inBall(x, y)) return false;
    const left = Math.abs(Math.hypot(x - (r - seamOffset), y - r) - seamR) <= seamWidth;
    const right = Math.abs(Math.hypot(x - (r + seamOffset), y - r) - seamR) <= seamWidth;
    return left || right;
  };

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0;                        // filtre 0 (None)
    for (let x = 0; x < size; x++) {
      const bg = coverage(x, y, inRounded);
      const px = [BG[0], BG[1], BG[2], Math.round(bg * 255)];
      if (bg > 0) {
        mix(px, BALL, coverage(x, y, inBall), 0);
        mix(px, SEAM, coverage(x, y, onSeam), 0);
      }
      raw[p++] = px[0];
      raw[p++] = px[1];
      raw[p++] = px[2];
      raw[p++] = px[3];
    }
  }
  return raw;
}

/* --- encodage PNG minimal --- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;    // 8 bits par canal
ihdr[9] = 6;    // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(build(SIZE), { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

fs.writeFileSync(OUT, png);
console.log('icone ecrite : ' + OUT + ' (' + SIZE + 'x' + SIZE + ', ' + png.length + ' octets)');
