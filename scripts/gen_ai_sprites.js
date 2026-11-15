#!/usr/bin/env node
/**
 * Phase 2 Hero AI Sprite Generator (Node.js · Gemini gemini-nano-banana-2.1 · Interactions API)
 * ------------------------------------------------------------------------------------------
 * Zero-dependency Node.js pipeline:
 *   1) Resolves Google GEMINI_API_KEY (--api-key=..., env, .env, or interactive TTY prompt)
 *   2) Generates 5 hero sprites via Gemini Interactions API (`gemini-nano-banana-2.1`)
 *   3) Decodes PNG -> corner BFS background removal -> 512x512 premultiplied resize -> RGBA PNG
 *   4) Synchronizes all 35 assets into `assets/asset_bundle.js` via `--bundle-only`
 *
 * Usage:
 *   node scripts/gen_ai_sprites.js --api-key=AIza...
 *   node scripts/gen_ai_sprites.js --self-test --non-interactive
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const readline = require("node:readline");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "assets", "asset_manifest.json");
const DOTENV_PATH = path.join(ROOT, ".env");
const MODEL_NAME = "gemini-nano-banana-2.1";
const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const TARGET_SIZE = 512;

const HERO_PROMPTS = {
  wizard_idle:
    "3D stylized mobile hyper-casual fantasy chibi wizard character holding a glowing cyan crystal wand upright, pastel sky-blue starry pointed hat with golden trim, cute expressive eyes, chunky cel-shaded 3D lighting with deep plum #241434 outline, isometric three-quarter front view, isolated centered on solid pure white background, no floor text, no UI.",
  cauldron_station:
    "3D stylized enchanted giant golden-bronze alchemy cauldron overflowing with glowing magenta rainbow potion bubbles, carved star runes, rim lighting, deep plum #241434 stylized outline, isometric 3/4 view, isolated centered on solid pure white background.",
  sales_stall:
    "3D stylized cozy fairy-forest wooden shop stall with coral-and-cream striped fabric awning, polished oak counter and golden star lantern accents, mobile casual game art style with deep plum #241434 outline, isometric 3/4 view, isolated centered on solid pure white background.",
  slime_king:
    "3D stylized boss monster King Slime made of glossy translucent rose-magenta jelly wearing an ornate faceted golden crown studded with cyan gems, cute fierce brow, specular highlights, deep plum #241434 outline, isometric 3/4 view, isolated centered on solid pure white background.",
  fairy_tree_1:
    "3D stylized storybook magical cherry blossom tree with layered fluffy pink and lavender clouds canopy, warm gnarled bark trunk, tiny glowing star lantern hanging from branch, cel-shaded 3D mobile game style, deep plum #241434 outline, isolated centered on solid pure white background."
};

function parseCliFlags(argv) {
  const flags = {
    apiKey: "",
    selfTest: false,
    nonInteractive: false,
    onlyApi: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--self-test") flags.selfTest = true;
    else if (arg === "--non-interactive") flags.nonInteractive = true;
    else if (arg === "--only-api") flags.onlyApi = true;
    else if (arg.startsWith("--api-key=")) flags.apiKey = arg.slice("--api-key=".length).trim();
    else if (arg === "--api-key" && i + 1 < argv.length) {
      flags.apiKey = argv[++i].trim();
    }
  }
  return flags;
}

function readDotEnvKey() {
  if (!fs.existsSync(DOTENV_PATH)) return "";
  const lines = fs.readFileSync(DOTENV_PATH, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const k = line.slice(0, eq).trim();
    if (k === "GEMINI_API_KEY" || k === "GOOGLE_API_KEY") {
      return line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return "";
}

function printRequirementBanner() {
  console.log("");
  console.log("======================================================================");
  console.log(" [Gemini API 연동 안내] Fairy Alchemy AI 스프라이트 생성 필요 항목");
  console.log(" 1. 필수 입력: Google AI Studio GEMINI_API_KEY ('AIza...' 형식)");
  console.log("    발급 링크: https://aistudio.google.com/apikey");
  console.log(` 2. 사용 모델: ${MODEL_NAME} (Interactions API v1beta/interactions)`);
  console.log(" 3. 전달 방법: GEMINI_API_KEY 환경변수, .env 파일, --api-key=AIza...,");
  console.log("               또는 게임 내 [🔑 API 설정] 창에 직접 입력");
  console.log("======================================================================");
  console.log("");
}

function promptKeyFromStdin() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("GEMINI_API_KEY (AIza..., 엔터 시 로컬 3D 에셋 유지): ", (answer) => {
      rl.close();
      resolve((answer || "").trim());
    });
  });
}

async function resolveApiKey(flags) {
  const candidates = [
    flags.apiKey,
    process.env.GEMINI_API_KEY || "",
    process.env.GOOGLE_API_KEY || "",
    readDotEnvKey()
  ];
  for (const cand of candidates) {
    if (cand && cand.startsWith("AIza")) return cand;
  }
  if (!flags.nonInteractive && process.stdin.isTTY) {
    printRequirementBanner();
    const entered = await promptKeyFromStdin();
    if (entered && entered.startsWith("AIza")) return entered;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Pure-Node PNG Decoder / Encoder (Filter 0..4, Color Types 0, 2, 3, 4, 6)
// ---------------------------------------------------------------------------
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tBuf, data])), 0);
  return Buffer.concat([len, tBuf, data, crcBuf]);
}

function encodePNG(w, h, rgba) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngRgba(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 33 || buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Invalid PNG header");
  }
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  let interlace = 0;
  let palette = null;
  let trns = null;
  const idatChunks = [];

  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.subarray(pos + 4, pos + 8).toString("ascii");
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      trns = data;
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (interlace !== 0 || (bitDepth !== 8 && bitDepth !== 16)) {
    throw new Error(`Unsupported PNG format (bitDepth=${bitDepth}, interlace=${interlace})`);
  }

  const channelsMap = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = channelsMap[colorType];
  if (!channels) throw new Error(`Unsupported PNG colorType=${colorType}`);
  const sampleStep = bitDepth === 16 ? 2 : 1;
  const bpp = channels * sampleStep;

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const scanLen = width * bpp;
  const unfilt = Buffer.alloc(width * height * bpp);

  for (let y = 0; y < height; y++) {
    const srcOff = y * (scanLen + 1);
    const filterType = raw[srcOff];
    const dstOff = y * scanLen;

    for (let x = 0; x < scanLen; x++) {
      const val = raw[srcOff + 1 + x];
      const left = x >= bpp ? unfilt[dstOff + x - bpp] : 0;
      const up = y > 0 ? unfilt[(y - 1) * scanLen + x] : 0;
      const upLeft = y > 0 && x >= bpp ? unfilt[(y - 1) * scanLen + x - bpp] : 0;

      let recon = val;
      if (filterType === 1) recon = (val + left) & 0xff;
      else if (filterType === 2) recon = (val + up) & 0xff;
      else if (filterType === 3) recon = (val + ((left + up) >>> 1)) & 0xff;
      else if (filterType === 4) recon = (val + paethPredictor(left, up, upLeft)) & 0xff;
      unfilt[dstOff + x] = recon;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, n = width * height; i < n; i++) {
    const outIdx = i * 4;
    const s = i * bpp;
    if (colorType === 6) {
      rgba[outIdx] = unfilt[s];
      rgba[outIdx + 1] = unfilt[s + sampleStep];
      rgba[outIdx + 2] = unfilt[s + sampleStep * 2];
      rgba[outIdx + 3] = unfilt[s + sampleStep * 3];
    } else if (colorType === 2) {
      rgba[outIdx] = unfilt[s];
      rgba[outIdx + 1] = unfilt[s + sampleStep];
      rgba[outIdx + 2] = unfilt[s + sampleStep * 2];
      rgba[outIdx + 3] = 255;
    } else if (colorType === 0) {
      const g = unfilt[s];
      rgba[outIdx] = g;
      rgba[outIdx + 1] = g;
      rgba[outIdx + 2] = g;
      rgba[outIdx + 3] = 255;
    } else if (colorType === 4) {
      const g = unfilt[s];
      rgba[outIdx] = g;
      rgba[outIdx + 1] = g;
      rgba[outIdx + 2] = g;
      rgba[outIdx + 3] = unfilt[s + sampleStep];
    } else if (colorType === 3) {
      const idx = unfilt[i];
      rgba[outIdx] = palette ? palette[idx * 3] : 0;
      rgba[outIdx + 1] = palette ? palette[idx * 3 + 1] : 0;
      rgba[outIdx + 2] = palette ? palette[idx * 3 + 2] : 0;
      rgba[outIdx + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
  }
  return { width, height, rgba };
}

function floodFillRemoveBg(width, height, rgba, tolerance = 34) {
  const out = Buffer.from(rgba);
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ];

  let transparentCorners = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (const [cx, cy] of corners) {
    const idx = (cy * width + cx) * 4;
    if (out[idx + 3] < 24) transparentCorners++;
    sumR += out[idx];
    sumG += out[idx + 1];
    sumB += out[idx + 2];
  }
  if (transparentCorners === 4) return out;

  const avgR = Math.round(sumR / 4);
  const avgG = Math.round(sumG / 4);
  const avgB = Math.round(sumB / 4);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  for (const [cx, cy] of corners) {
    const p = cy * width + cx;
    if (!visited[p]) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  }

  const maxDist = tolerance * 3;
  while (head < tail) {
    const p = queue[head++];
    const idx = p * 4;
    if (out[idx + 3] < 10) {
      out[idx + 3] = 0;
    } else {
      const dist =
        Math.abs(out[idx] - avgR) +
        Math.abs(out[idx + 1] - avgG) +
        Math.abs(out[idx + 2] - avgB);
      if (dist > maxDist) continue;
      out[idx + 3] = 0;
    }

    const x = p % width;
    const y = (p - x) / width;
    if (x > 0 && !visited[p - 1]) { visited[p - 1] = 1; queue[tail++] = p - 1; }
    if (x + 1 < width && !visited[p + 1]) { visited[p + 1] = 1; queue[tail++] = p + 1; }
    if (y > 0 && !visited[p - width]) { visited[p - width] = 1; queue[tail++] = p - width; }
    if (y + 1 < height && !visited[p + width]) { visited[p + width] = 1; queue[tail++] = p + width; }
  }
  return out;
}

function resizeRgba512(srcW, srcH, srcRgba) {
  if (srcW === TARGET_SIZE && srcH === TARGET_SIZE) return srcRgba;
  const dst = Buffer.alloc(TARGET_SIZE * TARGET_SIZE * 4);
  const scaleX = srcW / TARGET_SIZE;
  const scaleY = srcH / TARGET_SIZE;

  for (let dy = 0; dy < TARGET_SIZE; dy++) {
    const sy = Math.min(srcH - 1, Math.max(0, (dy + 0.5) * scaleY - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(srcH - 1, y0 + 1);
    const fy = sy - y0;

    for (let dx = 0; dx < TARGET_SIZE; dx++) {
      const sx = Math.min(srcW - 1, Math.max(0, (dx + 0.5) * scaleX - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(srcW - 1, x0 + 1);
      const fx = sx - x0;

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const a00 = srcRgba[i00 + 3] / 255;
      const a10 = srcRgba[i10 + 3] / 255;
      const a01 = srcRgba[i01 + 3] / 255;
      const a11 = srcRgba[i11 + 3] / 255;

      const outA = a00 * w00 + a10 * w10 + a01 * w01 + a11 * w11;
      const dstIdx = (dy * TARGET_SIZE + dx) * 4;

      if (outA > 0.002) {
        const pr = srcRgba[i00] * a00 * w00 + srcRgba[i10] * a10 * w10 + srcRgba[i01] * a01 * w01 + srcRgba[i11] * a11 * w11;
        const pg = srcRgba[i00 + 1] * a00 * w00 + srcRgba[i10 + 1] * a10 * w10 + srcRgba[i01 + 1] * a01 * w01 + srcRgba[i11 + 1] * a11 * w11;
        const pb = srcRgba[i00 + 2] * a00 * w00 + srcRgba[i10 + 2] * a10 * w10 + srcRgba[i01 + 2] * a01 * w01 + srcRgba[i11 + 2] * a11 * w11;
        dst[dstIdx] = Math.min(255, Math.round(pr / outA));
        dst[dstIdx + 1] = Math.min(255, Math.round(pg / outA));
        dst[dstIdx + 2] = Math.min(255, Math.round(pb / outA));
        dst[dstIdx + 3] = Math.min(255, Math.round(outA * 255));
      }
    }
  }
  return dst;
}

function runPowerShellBase64(psScript, stdinText = "") {
  const encoded = Buffer.from(psScript, "utf16le").toString("base64");
  return execFileSync("powershell.exe", ["-NoProfile", "-EncodedCommand", encoded], {
    input: stdinText,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  }).trim();
}

function convertToPng512ViaSystemDrawing(rawBuf) {
  const psScript = `
Add-Type -AssemblyName System.Drawing
$b64 = [Console]::In.ReadToEnd().Trim()
if ([string]::IsNullOrWhiteSpace($b64)) {
  throw "Empty image payload on stdin"
}
$bytes = [Convert]::FromBase64String($b64)
$msIn = $null
$img = $null
$bmp = $null
$g = $null
$msOut = $null
try {
  $msIn = New-Object System.IO.MemoryStream(,$bytes)
  $img = [System.Drawing.Image]::FromStream($msIn)
  $bmp = New-Object System.Drawing.Bitmap(${TARGET_SIZE}, ${TARGET_SIZE}, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $destRect = New-Object System.Drawing.Rectangle(0, 0, ${TARGET_SIZE}, ${TARGET_SIZE})
  $g.DrawImage($img, $destRect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel)
  $msOut = New-Object System.IO.MemoryStream
  $bmp.Save($msOut, [System.Drawing.Imaging.ImageFormat]::Png)
  [Console]::Out.Write([Convert]::ToBase64String($msOut.ToArray()))
} finally {
  if ($msOut -ne $null) { $msOut.Dispose() }
  if ($g -ne $null) { $g.Dispose() }
  if ($bmp -ne $null) { $bmp.Dispose() }
  if ($img -ne $null) { $img.Dispose() }
  if ($msIn -ne $null) { $msIn.Dispose() }
}
`;
  const pngB64 = runPowerShellBase64(psScript, rawBuf.toString("base64"));
  if (!pngB64) {
    throw new Error("System.Drawing PNG conversion returned empty output");
  }
  return Buffer.from(pngB64, "base64");
}

function decodeAnyImageRgba(rawBuf) {
  const isPng =
    rawBuf.length >= 8 &&
    rawBuf[0] === 0x89 &&
    rawBuf[1] === 0x50 &&
    rawBuf[2] === 0x4e &&
    rawBuf[3] === 0x47 &&
    rawBuf[4] === 0x0d &&
    rawBuf[5] === 0x0a &&
    rawBuf[6] === 0x1a &&
    rawBuf[7] === 0x0a;
  const pngBuf = isPng ? rawBuf : convertToPng512ViaSystemDrawing(rawBuf);
  return decodePngRgba(pngBuf);
}

async function requestGeminiSprite(apiKey, prompt) {
  const resp = await fetch(INTERACTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
      "Api-Revision": "2026-05-20"
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      input: prompt,
      response_format: {
        type: "image",
        aspect_ratio: "1:1"
      }
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API HTTP ${resp.status}: ${errText.slice(0, 260)}`);
  }

  const body = await resp.json();
  let b64 = body && body.output_image && body.output_image.data ? body.output_image.data : "";

  if (!b64 && Array.isArray(body.steps)) {
    for (const step of body.steps) {
      if (step && step.type === "model_output" && Array.isArray(step.content)) {
        for (const block of step.content) {
          if (block && block.type === "image" && block.data) {
            b64 = block.data;
          }
        }
      }
    }
  }

  if (!b64) {
    throw new Error("No image bytes returned in Gemini Interactions API response");
  }

  const cleanB64 = String(b64).replace(/^data:[^;]+;base64,/, "").trim();
  const rawImg = Buffer.from(cleanB64, "base64");
  const decoded = decodeAnyImageRgba(rawImg);
  const cut = floodFillRemoveBg(decoded.width, decoded.height, decoded.rgba, 42);
  const resized = resizeRgba512(decoded.width, decoded.height, cut);
  return encodePNG(TARGET_SIZE, TARGET_SIZE, resized);
}

function createSyntheticTestJpeg() {
  const psScript = `
Add-Type -AssemblyName System.Drawing
$bmp = $null
$g = $null
$brush = $null
$ms = $null
try {
  $bmp = New-Object System.Drawing.Bitmap(64, 64, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 92, 58, 168))
  $g.FillEllipse($brush, 16, 16, 32, 32)
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  [Console]::Out.Write([Convert]::ToBase64String($ms.ToArray()))
} finally {
  if ($ms -ne $null) { $ms.Dispose() }
  if ($brush -ne $null) { $brush.Dispose() }
  if ($g -ne $null) { $g.Dispose() }
  if ($bmp -ne $null) { $bmp.Dispose() }
}
`;
  return Buffer.from(runPowerShellBase64(psScript), "base64");
}

function runSelfTest() {
  const samplePath = path.join(ROOT, "assets", "characters", "wizard_idle.png");
  const rawBuf = fs.readFileSync(samplePath);
  const decoded = decodeAnyImageRgba(rawBuf);
  const cut = floodFillRemoveBg(decoded.width, decoded.height, decoded.rgba, 42);
  const resized = resizeRgba512(decoded.width, decoded.height, cut);
  const reencoded = encodePNG(TARGET_SIZE, TARGET_SIZE, resized);

  const sig = reencoded.subarray(0, 4).toString("hex");
  const w = reencoded.readUInt32BE(16);
  const h = reencoded.readUInt32BE(20);
  const colorType = reencoded.readUInt8(25);
  if (sig !== "89504e47" || w !== TARGET_SIZE || h !== TARGET_SIZE || colorType !== 6) {
    throw new Error(`Self-test PNG validation failed: sig=${sig} ${w}x${h} colorType=${colorType}`);
  }

  const testJpeg = createSyntheticTestJpeg();
  const decodedJpg = decodeAnyImageRgba(testJpeg);
  const cutJpg = floodFillRemoveBg(decodedJpg.width, decodedJpg.height, decodedJpg.rgba, 42);
  const resizedJpg = resizeRgba512(decodedJpg.width, decodedJpg.height, cutJpg);
  const jpgOutPng = encodePNG(TARGET_SIZE, TARGET_SIZE, resizedJpg);

  const jpgSig = jpgOutPng.subarray(0, 4).toString("hex");
  const jpgW = jpgOutPng.readUInt32BE(16);
  const jpgH = jpgOutPng.readUInt32BE(20);
  const jpgColorType = jpgOutPng.readUInt8(25);
  const cornerAlpha = resizedJpg[3];
  const centerIdx = (Math.floor(TARGET_SIZE / 2) * TARGET_SIZE + Math.floor(TARGET_SIZE / 2)) * 4;
  const centerAlpha = resizedJpg[centerIdx + 3];
  if (
    jpgSig !== "89504e47" ||
    jpgW !== TARGET_SIZE ||
    jpgH !== TARGET_SIZE ||
    jpgColorType !== 6 ||
    cornerAlpha !== 0 ||
    centerAlpha !== 255
  ) {
    throw new Error(
      `Self-test JPEG conversion failed: sig=${jpgSig} ${jpgW}x${jpgH} colorType=${jpgColorType} cornerA=${cornerAlpha} centerA=${centerAlpha}`
    );
  }

  console.log(
    JSON.stringify({
      selfTestPassed: true,
      model: MODEL_NAME,
      endpoint: INTERACTIONS_URL,
      inputSize: `${decoded.width}x${decoded.height}`,
      outputSize: `${w}x${h}`,
      colorType,
      jpegRoundTrip: {
        inputJpegBytes: testJpeg.length,
        decodedSize: `${decodedJpg.width}x${decodedJpg.height}`,
        cornerAlpha,
        centerAlpha
      }
    })
  );
}

async function main() {
  const flags = parseCliFlags(process.argv.slice(2));
  if (flags.selfTest) {
    runSelfTest();
    return 0;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const byId = Object.fromEntries(manifest.assets.map((entry) => [entry.id, entry]));

  const apiKey = await resolveApiKey(flags);
  if (!apiKey) {
    printRequirementBanner();
    if (flags.onlyApi) return 1;
    console.log("[gen_ai_sprites.js] 유효한 GEMINI_API_KEY가 없어 로컬 3D 셰이더 베이크(scripts/generate_3d_assets.js)를 실행합니다.");
    execFileSync(process.execPath, [path.join(ROOT, "scripts", "generate_3d_assets.js")], { stdio: "inherit" });
    return 0;
  }

  if (!flags.onlyApi) {
    execFileSync(process.execPath, [path.join(ROOT, "scripts", "generate_3d_assets.js")], { stdio: "inherit" });
  }

  const jobs = Object.entries(HERO_PROMPTS).map(async ([assetId, prompt]) => {
    const entry = byId[assetId];
    if (!entry) return { assetId, ok: false, networkErr: false };
    const outPath = path.join(ROOT, entry.path);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    console.log(`[gen_ai_sprites.js] Generating ${assetId} -> ${entry.path} via ${MODEL_NAME}...`);
    try {
      const png = await requestGeminiSprite(apiKey, prompt);
      fs.writeFileSync(outPath, png);
      console.log(`[gen_ai_sprites.js] Saved ${assetId} (${png.length} bytes)`);
      return { assetId, ok: true, networkErr: false };
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      const isNet = /fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|ECONNRESET|socket|network/i.test(msg);
      console.error(`[gen_ai_sprites.js] Fallback retained for ${assetId}: ${msg}`);
      return { assetId, ok: false, networkErr: isNet, error: msg };
    }
  });

  const results = await Promise.allSettled(jobs);
  const outcomes = results.map((r) => (r.status === "fulfilled" ? r.value : { ok: false, networkErr: true }));
  const upgraded = outcomes.filter((o) => o.ok).length;
  const networkFailedAll = outcomes.length > 0 && outcomes.every((o) => !o.ok && o.networkErr);

  if (flags.onlyApi) {
    console.log(`[gen_ai_sprites.js] API batch finished (${upgraded}/${outcomes.length} AI hero sprites updated).`);
    return upgraded === 0 && networkFailedAll ? 1 : 0;
  }

  execFileSync(process.execPath, [path.join(ROOT, "scripts", "generate_3d_assets.js"), "--bundle-only"], { stdio: "inherit" });
  console.log(`[gen_ai_sprites.js] Completed (${upgraded}/${outcomes.length} AI hero sprites updated).`);
  return 0;
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  MODEL_NAME,
  INTERACTIONS_URL,
  convertToPng512ViaSystemDrawing,
  decodeAnyImageRgba,
  decodePngRgba,
  floodFillRemoveBg,
  resizeRgba512,
  encodePNG
};
