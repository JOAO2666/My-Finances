import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  const width = size;
  const height = size;

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  // Generate pixels (emerald green background with white stylized 'M')
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.45;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Rounded rectangle test
      const cornerR = width * 0.22;
      const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerR));
      const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerR));
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > cornerR) {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Emerald background gradient
      const gradRatio = y / height;
      let r = Math.round(5 + gradRatio * 2);
      let g = Math.round(150 - gradRatio * 40);
      let b = Math.round(105 - gradRatio * 30);
      let a = 255;

      // Draw 'M' letter shape
      const nx = x / width;
      const ny = y / height;

      const isLeftStem = nx >= 0.26 && nx <= 0.33 && ny >= 0.30 && ny <= 0.72;
      const isRightStem = nx >= 0.67 && nx <= 0.74 && ny >= 0.30 && ny <= 0.72;

      // Diagonals of 'M'
      // Left diagonal: from (0.28, 0.32) to (0.50, 0.58)
      const d1 = Math.abs((ny - 0.32) - 1.18 * (nx - 0.28));
      const isLeftDiag = d1 < 0.05 && nx >= 0.28 && nx <= 0.50 && ny >= 0.30 && ny <= 0.60;

      // Right diagonal: from (0.50, 0.58) to (0.72, 0.32)
      const d2 = Math.abs((ny - 0.58) - (-1.18) * (nx - 0.50));
      const isRightDiag = d2 < 0.05 && nx >= 0.50 && nx <= 0.72 && ny >= 0.30 && ny <= 0.60;

      // Gold coin sparkle dot at (0.72, 0.26)
      const dotDist = Math.hypot(nx - 0.72, ny - 0.26);
      const isDot = dotDist < 0.045;

      if (isLeftStem || isRightStem || isLeftDiag || isRightDiag) {
        r = 255;
        g = 255;
        b = 255;
      } else if (isDot) {
        r = 251;
        g = 191;
        b = 36;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", deflated);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const pub = path.resolve("public");
if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true });

fs.writeFileSync(path.join(pub, "icon-192.png"), generatePng(192));
fs.writeFileSync(path.join(pub, "icon-512.png"), generatePng(512));
fs.writeFileSync(path.join(pub, "apple-touch-icon.png"), generatePng(180));
console.log("PNG icons generated successfully!");
