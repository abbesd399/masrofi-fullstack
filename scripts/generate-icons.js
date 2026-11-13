const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

function createPNG(width, height, r, g, b, a = 255) {
  // Simple uncompressed RGBA PNG generator
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Generate image data with teal gradient / center mark
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      // Distance from center
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.75) {
        // Teal/emerald gradient
        const t = (x + y) / (width + height);
        line[idx] = Math.floor(13 + t * 30);     // R (Teal: #0D9488)
        line[idx + 1] = Math.floor(148 + t * 40); // G
        line[idx + 2] = Math.floor(136 + t * 50); // B
        line[idx + 3] = 255;
      } else {
        // Background dark slate
        line[idx] = 11;
        line[idx + 1] = 15;
        line[idx + 2] = 23;
        line[idx + 3] = 255;
      }
    }
    scanlines.push(line);
  }

  const rawData = Buffer.concat(scanlines);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return crc ^ (-1);
}

const icon192 = createPNG(192, 192, 13, 148, 136);
const icon512 = createPNG(512, 512, 13, 148, 136);
const splash = createPNG(640, 1136, 11, 15, 23);

fs.writeFileSync(path.join(ASSETS_DIR, 'icon-192.png'), icon192);
fs.writeFileSync(path.join(ASSETS_DIR, 'icon-512.png'), icon512);
fs.writeFileSync(path.join(ASSETS_DIR, 'splash.png'), splash);
console.log('[Assets] Created icon-192.png, icon512.png, and splash.png in assets/');
