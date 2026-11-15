#!/usr/bin/env node
/**
 * Phase 2: 3D Volumetric Analytic Raycaster & Studio Asset Baker
 * --------------------------------------------------------------------------
 * Reads assets/asset_manifest.json and renders all 35 assets at 512x512 RGBA
 * transparent PNGs with:
 *   - True 3D primitive ray-intersection & analytical normals
 *   - Warm studio sun lighting, hemisphere fill, 4-band cel shading mix
 *   - Blinn-Phong specular highlights, Fresnel rim light & SSS warmth
 *   - Z-buffer ambient occlusion (AO) & crisp #241434 outer + crease outlines
 *   - Seamless 512x512 ground tiles & bundled base64 asset_bundle.js
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "assets", "asset_manifest.json");
const BUNDLE_PATH = path.join(ROOT, "assets", "asset_bundle.js");
const RES = 512;

// ---------------------------------------------------------------------------
// 1. Minimal Pure-Node PNG Encoder (RGBA8)
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
    raw[rowStart] = 0; // filter 0
    rgba.copy(raw, rowStart + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
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

// ---------------------------------------------------------------------------
// 2. Math & Vector Helpers
// ---------------------------------------------------------------------------
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
function hash2(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}
function vnoise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash2(ix, iy), hash2(ix + 1, iy), u), lerp(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), u), v);
}
function rotMatEuler(rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  // R = Ry * Rx * Rz (columns -> world basis)
  return [
    cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx,
    cx * sz,                cx * cz,                 -sx,
    -sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx
  ];
}
function mulMatT(m, vx, vy, vz) {
  return [
    m[0] * vx + m[3] * vy + m[6] * vz,
    m[1] * vx + m[4] * vy + m[7] * vz,
    m[2] * vx + m[5] * vy + m[8] * vz
  ];
}
function mulMat(m, vx, vy, vz) {
  return [
    m[0] * vx + m[1] * vy + m[2] * vz,
    m[3] * vx + m[4] * vy + m[5] * vz,
    m[6] * vx + m[7] * vy + m[8] * vz
  ];
}

// ---------------------------------------------------------------------------
// 3. Analytic 3D Ray-Primitive Intersectors
// ---------------------------------------------------------------------------
function makePrim(opts) {
  const rot = opts.rot || [0, 0, 0];
  const m = rotMatEuler(rot[0], rot[1], rot[2]);
  const sc = opts.scale || [1, 1, 1];
  const rApprox = Math.max(
    (opts.r || 0) + (opts.R || 0) + (opts.h || 0),
    Math.hypot(sc[0], sc[1], sc[2]) * 1.15
  );
  return Object.assign({
    pos: [0, 0, 0],
    scale: sc,
    rot,
    mat: m,
    part: 1,
    spec: 0.35,
    shininess: 32,
    rim: 0.3,
    rimColor: [255, 250, 228],
    celMix: 0.62,
    sss: 0,
    sssColor: [255, 160, 190],
    emissive: 0,
    emissiveColor: [0, 0, 0],
    boundR: rApprox
  }, opts);
}

function capPrim(a, b, r, opts) {
  const mx = (a[0] + b[0]) * 0.5, my = (a[1] + b[1]) * 0.5, mz = (a[2] + b[2]) * 0.5;
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 1e-4;
  // Build rotation aligning local Y with (dx,dy,dz)
  const ux = dx / len, uy = dy / len, uz = dz / len;
  let ax = 1, ay = 0, az = 0;
  if (Math.abs(ux) > 0.9) { ax = 0; ay = 0; az = 1; }
  // z = normalize(cross(u, a))
  let zx = uy * az - uz * ay, zy = uz * ax - ux * az, zz = ux * ay - uy * ax;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl; zy /= zl; zz /= zl;
  const xx = zy * uz - zz * uy, xy = zz * ux - zx * uz, xz = zx * uy - zy * ux;
  const mat = [xx, ux, zx, xy, uy, zy, xz, uz, zz];
  return Object.assign(makePrim(Object.assign({ kind: "capsule", pos: [mx, my, mz], r, halfH: len * 0.5 }, opts)), {
    mat,
    boundR: len * 0.5 + r + 0.05
  });
}

function intersectEllipsoid(lro, lrd, rx, ry, rz) {
  const ox = lro[0] / rx, oy = lro[1] / ry, oz = lro[2] / rz;
  const dx = lrd[0] / rx, dy = lrd[1] / ry, dz = lrd[2] / rz;
  const a = dx * dx + dy * dy + dz * dz;
  const b = ox * dx + oy * dy + oz * dz;
  const c = ox * ox + oy * oy + oz * oz - 1;
  const disc = b * b - a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / a;
  if (t < 0) return null;
  const hx = lro[0] + lrd[0] * t, hy = lro[1] + lrd[1] * t, hz = lro[2] + lrd[2] * t;
  let nx = hx / (rx * rx), ny = hy / (ry * ry), nz = hz / (rz * rz);
  const nl = Math.hypot(nx, ny, nz) || 1;
  return { t, lx: hx, ly: hy, lz: hz, lnx: nx / nl, lny: ny / nl, lnz: nz / nl };
}

function intersectBox(lro, lrd, hx, hy, hz, bevel = 0.06) {
  let tmin = -1e9, tmax = 1e9;
  const bounds = [hx, hy, hz];
  for (let i = 0; i < 3; i++) {
    const inv = Math.abs(lrd[i]) > 1e-8 ? 1 / lrd[i] : 1e8;
    let t1 = (-bounds[i] - lro[i]) * inv;
    let t2 = (bounds[i] - lro[i]) * inv;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmin < 0) return null;
  const px = lro[0] + lrd[0] * tmin, py = lro[1] + lrd[1] * tmin, pz = lro[2] + lrd[2] * tmin;
  // Soft beveled normal weighting near edges for specular edge highlights!
  const dx = Math.abs(px) / hx, dy = Math.abs(py) / hy, dz = Math.abs(pz) / hz;
  const bPow = bevel > 0 ? Math.max(4, Math.round(1.6 / Math.max(0.03, bevel))) : 64;
  let nx = Math.sign(px) * Math.pow(dx, bPow);
  let ny = Math.sign(py) * Math.pow(dy, bPow);
  let nz = Math.sign(pz) * Math.pow(dz, bPow);
  const nl = Math.hypot(nx, ny, nz) || 1;
  return { t: tmin, lx: px, ly: py, lz: pz, lnx: nx / nl, lny: ny / nl, lnz: nz / nl };
}

function intersectCapsuleLocal(lro, lrd, r, halfH) {
  let best = null;
  // Cylinder body |y| <= halfH
  const a = lrd[0] * lrd[0] + lrd[2] * lrd[2];
  const b = lro[0] * lrd[0] + lro[2] * lrd[2];
  const c = lro[0] * lro[0] + lro[2] * lro[2] - r * r;
  if (a > 1e-8) {
    const disc = b * b - a * c;
    if (disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / a;
      if (t >= 0) {
        const y = lro[1] + lrd[1] * t;
        if (Math.abs(y) <= halfH) {
          const hx = lro[0] + lrd[0] * t, hz = lro[2] + lrd[2] * t;
          const nl = Math.hypot(hx, hz) || 1;
          best = { t, lx: hx, ly: y, lz: hz, lnx: hx / nl, lny: 0, lnz: hz / nl };
        }
      }
    }
  }
  // End spheres at y = +-halfH
  for (const sy of [-halfH, halfH]) {
    const oy = lro[1] - sy;
    const sb = lro[0] * lrd[0] + oy * lrd[1] + lro[2] * lrd[2];
    const sc = lro[0] * lro[0] + oy * oy + lro[2] * lro[2] - r * r;
    const disc = sb * sb - sc;
    if (disc >= 0) {
      const t = -sb - Math.sqrt(disc);
      if (t >= 0 && (!best || t < best.t)) {
        const hx = lro[0] + lrd[0] * t, hy = lro[1] + lrd[1] * t, hz = lro[2] + lrd[2] * t;
        const ny = hy - sy;
        const nl = Math.hypot(hx, ny, hz) || 1;
        best = { t, lx: hx, ly: hy, lz: hz, lnx: hx / nl, lny: ny / nl, lnz: hz / nl };
      }
    }
  }
  return best;
}

function intersectConeFrustum(lro, lrd, rBot, rTop, halfH) {
  let best = null;
  const k = (rTop - rBot) / (2 * halfH);
  const rMid = (rBot + rTop) * 0.5;
  // Side surface: x^2 + z^2 = (rMid + k*y)^2
  const ox = lro[0], oy = lro[1], oz = lro[2];
  const dx = lrd[0], dy = lrd[1], dz = lrd[2];
  const r0 = rMid + k * oy;
  const dr = k * dy;
  const A = dx * dx + dz * dz - dr * dr;
  const B = ox * dx + oz * dz - r0 * dr;
  const C = ox * ox + oz * oz - r0 * r0;
  if (Math.abs(A) > 1e-8) {
    const disc = B * B - A * C;
    if (disc >= 0) {
      const sd = Math.sqrt(disc);
      for (const t of [(-B - sd) / A, (-B + sd) / A]) {
        if (t >= 0) {
          const y = oy + dy * t;
          const rCur = rMid + k * y;
          if (Math.abs(y) <= halfH && rCur >= -1e-4) {
            const hx = ox + dx * t, hz = oz + dz * t;
            const ny = -k * Math.hypot(hx, hz);
            const nl = Math.hypot(hx, ny, hz) || 1;
            const dDot = (hx * dx + ny * dy + hz * dz) / nl;
            if (dDot < 0 && (!best || t < best.t)) {
              best = { t, lx: hx, ly: y, lz: hz, lnx: hx / nl, lny: ny / nl, lnz: hz / nl };
            }
          }
        }
      }
    }
  }
  // Caps at y = -halfH and +halfH
  if (Math.abs(dy) > 1e-7) {
    for (const [cy, cr, ny] of [[-halfH, rBot, -1], [halfH, rTop, 1]]) {
      if (cr <= 0.002) continue;
      const t = (cy - oy) / dy;
      if (t >= 0 && (!best || t < best.t)) {
        const hx = ox + dx * t, hz = oz + dz * t;
        if (hx * hx + hz * hz <= cr * cr) {
          best = { t, lx: hx, ly: cy, lz: hz, lnx: 0, lny: ny, lnz: 0 };
        }
      }
    }
  }
  return best;
}

function intersectTorusLocal(lro, lrd, R, r) {
  // Fast sphere-bounded SDF march in local space
  const boundR = R + r + 0.02;
  const b = lro[0] * lrd[0] + lro[1] * lrd[1] + lro[2] * lrd[2];
  const c = lro[0] * lro[0] + lro[1] * lro[1] + lro[2] * lro[2] - boundR * boundR;
  const disc = b * b - c;
  if (disc < 0) return null;
  let t = Math.max(0, -b - Math.sqrt(disc));
  const tEnd = -b + Math.sqrt(disc);
  for (let i = 0; i < 22 && t <= tEnd; i++) {
    const px = lro[0] + lrd[0] * t, py = lro[1] + lrd[1] * t, pz = lro[2] + lrd[2] * t;
    const q = Math.hypot(px, pz) - R;
    const dist = Math.hypot(q, py) - r;
    if (dist < 0.0018) {
      const m = Math.hypot(px, pz) || 1e-4;
      const cx = (px / m) * R, cz = (pz / m) * R;
      const nx = px - cx, ny = py, nz = pz - cz;
      const nl = Math.hypot(nx, ny, nz) || 1;
      return { t, lx: px, ly: py, lz: pz, lnx: nx / nl, lny: ny / nl, lnz: nz / nl };
    }
    t += dist * 0.92;
  }
  return null;
}

function intersectHexPrism(lro, lrd, radius, halfH, taperTop = 1.0) {
  // Convex polyhedron intersection against 6 side planes + 2 Y caps
  let t0 = -1e9, t1 = 1e9;
  let n0 = [0, 1, 0];
  const planes = [[0, 1, 0, halfH], [0, -1, 0, halfH]];
  const tilt = (1 - taperTop) * radius / (2 * halfH);
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * Math.PI * 2;
    const ax = Math.cos(ang), az = Math.sin(ang);
    const nl = Math.hypot(ax, tilt, az);
    const midR = radius * (1 + taperTop) * 0.5 * (Math.cos(Math.PI / 6));
    planes.push([ax / nl, tilt / nl, az / nl, midR / nl]);
  }
  for (const [nx, ny, nz, d] of planes) {
    const numer = d - (nx * lro[0] + ny * lro[1] + nz * lro[2]);
    const denom = nx * lrd[0] + ny * lrd[1] + nz * lrd[2];
    if (Math.abs(denom) < 1e-8) {
      if (numer < 0) return null;
    } else {
      const t = numer / denom;
      if (denom > 0) {
        if (t < t1) t1 = t;
      } else {
        if (t > t0) { t0 = t; n0 = [nx, ny, nz]; }
      }
      if (t0 > t1) return null;
    }
  }
  if (t0 < 0) return null;
  return {
    t: t0,
    lx: lro[0] + lrd[0] * t0,
    ly: lro[1] + lrd[1] * t0,
    lz: lro[2] + lrd[2] * t0,
    lnx: n0[0], lny: n0[1], lnz: n0[2]
  };
}

function intersectPrim(prim, wro, wrd) {
  const dx = wro[0] - prim.pos[0], dy = wro[1] - prim.pos[1], dz = wro[2] - prim.pos[2];
  const lro = mulMatT(prim.mat, dx, dy, dz);
  const lrd = mulMatT(prim.mat, wrd[0], wrd[1], wrd[2]);
  let hit = null;
  if (prim.kind === "ellipsoid") {
    hit = intersectEllipsoid(lro, lrd, prim.scale[0], prim.scale[1], prim.scale[2]);
  } else if (prim.kind === "box") {
    hit = intersectBox(lro, lrd, prim.scale[0], prim.scale[1], prim.scale[2], prim.bevel || 0.06);
  } else if (prim.kind === "capsule") {
    hit = intersectCapsuleLocal(lro, lrd, prim.r, prim.halfH);
  } else if (prim.kind === "cone" || prim.kind === "cylinder") {
    hit = intersectConeFrustum(lro, lrd, prim.rBot, prim.rTop, prim.halfH);
  } else if (prim.kind === "torus") {
    hit = intersectTorusLocal(lro, lrd, prim.R, prim.r);
  } else if (prim.kind === "hex") {
    hit = intersectHexPrism(lro, lrd, prim.r, prim.halfH, prim.taperTop !== undefined ? prim.taperTop : 1.0);
  }
  if (!hit) return null;
  const wn = mulMat(prim.mat, hit.lnx, hit.lny, hit.lnz);
  const wnl = Math.hypot(wn[0], wn[1], wn[2]) || 1;
  return {
    t: hit.t,
    wx: wro[0] + wrd[0] * hit.t,
    wy: wro[1] + wrd[1] * hit.t,
    wz: wro[2] + wrd[2] * hit.t,
    lx: hit.lx, ly: hit.ly, lz: hit.lz,
    nx: wn[0] / wnl, ny: wn[1] / wnl, nz: wn[2] / wnl
  };
}

// ---------------------------------------------------------------------------
// 4. Studio 3D Shader & Post-Process Renderer (512x512 RGBA + #241434 Outlines)
// ---------------------------------------------------------------------------
function renderScene512(prims, opts = {}) {
  const camYaw = opts.yaw !== undefined ? opts.yaw : 0.36;
  const camPitch = opts.pitch !== undefined ? opts.pitch : 0.28;
  const zoom = opts.zoom || 3.4; // world units across full height
  const centerY = opts.centerY !== undefined ? opts.centerY : 0.75;
  const centerX = opts.centerX !== undefined ? opts.centerX : 0.0;

  // Orthonormal camera basis looking from front (+Z) slightly above (+Y) and right (+X)
  const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
  const sp = Math.sin(camPitch), cp = Math.cos(camPitch);
  // Forward looks towards origin from camPos dir:
  const fwd = [-sy * cp, -sp, -cy * cp];
  const right = [cy, 0, -sy];
  const up = [
    right[1] * fwd[2] - right[2] * fwd[1],
    right[2] * fwd[0] - right[0] * fwd[2],
    right[0] * fwd[1] - right[1] * fwd[0]
  ];
  const rayDist = 14.0;
  const sunDir = [0.46, 0.78, 0.42];
  const sl = Math.hypot(...sunDir);
  sunDir[0] /= sl; sunDir[1] /= sl; sunDir[2] /= sl;
  const viewDir = [-fwd[0], -fwd[1], -fwd[2]];
  const halfVec = [sunDir[0] + viewDir[0], sunDir[1] + viewDir[1], sunDir[2] + viewDir[2]];
  const hl = Math.hypot(...halfVec);
  halfVec[0] /= hl; halfVec[1] /= hl; halfVec[2] /= hl;

  // Compute tight 2D pixel bounding boxes per primitive
  const projPrims = prims.map((p) => {
    const rx = p.pos[0] - centerX, ry = p.pos[1] - centerY, rz = p.pos[2];
    const sx = rx * right[0] + ry * right[1] + rz * right[2];
    const syPx = rx * up[0] + ry * up[1] + rz * up[2];
    const pxCenter = (sx / zoom + 0.5) * RES;
    const pyCenter = (0.5 - syPx / zoom) * RES;
    const radPx = (p.boundR / zoom) * RES + 6;
    return {
      prim: p,
      x0: clamp(Math.floor(pxCenter - radPx), 0, RES - 1),
      x1: clamp(Math.ceil(pxCenter + radPx), 0, RES - 1),
      y0: clamp(Math.floor(pyCenter - radPx), 0, RES - 1),
      y1: clamp(Math.ceil(pyCenter + radPx), 0, RES - 1)
    };
  });

  const N = RES * RES;
  const zBuf = new Float32Array(N).fill(1e9);
  const partBuf = new Int16Array(N).fill(0);
  const normBuf = new Float32Array(N * 3);
  const colBuf = new Float32Array(N * 3);
  const alphaBuf = new Float32Array(N);
  const haloBuf = new Float32Array(N * 4); // additive/soft glow overlays

  for (let py = 0; py < RES; py++) {
    const wyScreen = (0.5 - (py + 0.5) / RES) * zoom;
    for (let px = 0; px < RES; px++) {
      const wxScreen = ((px + 0.5) / RES - 0.5) * zoom;
      const ro = [
        centerX + right[0] * wxScreen + up[0] * wyScreen - fwd[0] * rayDist,
        centerY + right[1] * wxScreen + up[1] * wyScreen - fwd[1] * rayDist,
        right[2] * wxScreen + up[2] * wyScreen - fwd[2] * rayDist
      ];
      let bestT = 1e9;
      let bestHit = null;
      let bestPrim = null;

      for (let i = 0; i < projPrims.length; i++) {
        const bp = projPrims[i];
        if (px < bp.x0 || px > bp.x1 || py < bp.y0 || py > bp.y1) continue;
        const p = bp.prim;
        const hit = intersectPrim(p, ro, fwd);
        if (!hit) continue;
        if (p.glowOnly) {
          // Soft translucent aura sphere behind/around crystals
          const edge = Math.pow(clamp(-(hit.nx * fwd[0] + hit.ny * fwd[1] + hit.nz * fwd[2]), 0, 1), 1.6);
          const idx4 = (py * RES + px) * 4;
          const addA = edge * (p.glowAlpha || 0.45);
          haloBuf[idx4] = Math.min(255, haloBuf[idx4] + p.color[0] * addA);
          haloBuf[idx4 + 1] = Math.min(255, haloBuf[idx4 + 1] + p.color[1] * addA);
          haloBuf[idx4 + 2] = Math.min(255, haloBuf[idx4 + 2] + p.color[2] * addA);
          haloBuf[idx4 + 3] = Math.min(1, haloBuf[idx4 + 3] + addA);
          continue;
        }
        if (hit.t < bestT) {
          bestT = hit.t;
          bestHit = hit;
          bestPrim = p;
        }
      }

      if (bestHit && bestPrim) {
        const idx = py * RES + px;
        zBuf[idx] = bestT;
        partBuf[idx] = bestPrim.noOutline ? -bestPrim.part : bestPrim.part;
        alphaBuf[idx] = 1.0;
        normBuf[idx * 3] = bestHit.nx;
        normBuf[idx * 3 + 1] = bestHit.ny;
        normBuf[idx * 3 + 2] = bestHit.nz;

        // Evaluate base albedo + 3D procedural texture if provided
        let baseR = bestPrim.color[0], baseG = bestPrim.color[1], baseB = bestPrim.color[2];
        let extraEm = bestPrim.emissive || 0;
        let extraSpec = bestPrim.spec;
        if (bestPrim.texFn) {
          const res = bestPrim.texFn(bestHit, bestPrim);
          if (res) {
            if (res.color) { baseR = res.color[0]; baseG = res.color[1]; baseB = res.color[2]; }
            if (res.emissive !== undefined) extraEm = res.emissive;
            if (res.spec !== undefined) extraSpec = res.spec;
          }
        }

        const nDotL = bestHit.nx * sunDir[0] + bestHit.ny * sunDir[1] + bestHit.nz * sunDir[2];
        const diffSmooth = clamp(nDotL * 0.58 + 0.52, 0.16, 1.08);
        // 4-step studio cel-toon ramp
        const celStep = diffSmooth > 0.88 ? 1.06 : diffSmooth > 0.64 ? 0.90 : diffSmooth > 0.42 ? 0.72 : 0.54;
        const lightTerm = lerp(diffSmooth, celStep, bestPrim.celMix);

        // Hemisphere warm sky vs cool plum bounce shade
        const hemi = bestHit.ny * 0.5 + 0.5;
        const fillR = lerp(0.84, 1.03, hemi), fillG = lerp(0.80, 1.01, hemi), fillB = lerp(0.95, 0.98, hemi);

        // Specular Blinn-Phong highlight
        const nDotH = Math.max(0, bestHit.nx * halfVec[0] + bestHit.ny * halfVec[1] + bestHit.nz * halfVec[2]);
        const specPow = Math.pow(nDotH, bestPrim.shininess || 32) * extraSpec;

        // Fresnel Rim Glow
        const ndv = clamp(-(bestHit.nx * fwd[0] + bestHit.ny * fwd[1] + bestHit.nz * fwd[2]), 0, 1);
        const rim = Math.pow(1 - ndv, 2.6) * (bestPrim.rim || 0.25);

        // Warm subsurface glow
        const sss = bestPrim.sss ? Math.pow(clamp(1 - Math.abs(nDotL + 0.2), 0, 1), 1.4) * bestPrim.sss : 0;

        let outR = baseR * lightTerm * fillR + specPow * 245 + rim * bestPrim.rimColor[0] + sss * bestPrim.sssColor[0] + extraEm * bestPrim.emissiveColor[0];
        let outG = baseG * lightTerm * fillG + specPow * 248 + rim * bestPrim.rimColor[1] + sss * bestPrim.sssColor[1] + extraEm * bestPrim.emissiveColor[1];
        let outB = baseB * lightTerm * fillB + specPow * 255 + rim * bestPrim.rimColor[2] + sss * bestPrim.sssColor[2] + extraEm * bestPrim.emissiveColor[2];

        colBuf[idx * 3] = clamp(outR, 0, 255);
        colBuf[idx * 3 + 1] = clamp(outG, 0, 255);
        colBuf[idx * 3 + 2] = clamp(outB, 0, 255);
      }
    }
  }

  // Pass 2: Screen-space AO, #241434 Outer Silhouette & Inner Depth Crease Outlines, Ground Shadow
  const out = Buffer.alloc(N * 4);
  const outOutline = opts.outlineWidth !== undefined ? opts.outlineWidth : 5.0;
  const outR = 36, outG = 20, outB = 52; // #241434
  const groundSy = opts.shadowY !== undefined ? opts.shadowY : 0.89;
  const groundRx = opts.shadowRx !== undefined ? opts.shadowRx : 0.22;
  const groundRy = opts.shadowRy !== undefined ? opts.shadowRy : 0.055;

  const rCeil = Math.ceil(outOutline) + 1;
  for (let py = 0; py < RES; py++) {
    for (let px = 0; px < RES; px++) {
      const idx = py * RES + px;
      const oIdx = idx * 4;
      const a = alphaBuf[idx];

      if (a > 0.5) {
        // Depth-based AO (darken crevices where nearby depth is closer to camera)
        let aoSum = 0;
        const dirs = [[-3, 0], [3, 0], [0, -3], [0, 3], [-6, -5], [6, -5], [-6, 5], [6, 5]];
        const z0 = zBuf[idx];
        for (let d = 0; d < dirs.length; d++) {
          const sx = px + dirs[d][0], sy = py + dirs[d][1];
          if (sx >= 0 && sx < RES && sy >= 0 && sy < RES) {
            const dz = z0 - zBuf[sy * RES + sx];
            if (dz > 0.03 && dz < 0.75) aoSum += smoothstep(0.03, 0.45, dz);
          }
        }
        const aoFactor = 1 - clamp(aoSum * 0.055, 0, 0.34);

        // Inner crease detection across part boundaries / steep normal discontinuities
        let crease = 0;
        const p0 = partBuf[idx];
        if (p0 > 0) {
          for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nx = px + ox, ny = py + oy;
            if (nx < 0 || nx >= RES || ny < 0 || ny >= RES) continue;
            const nIdx = ny * RES + nx;
            if (alphaBuf[nIdx] < 0.5) continue;
            const pn = partBuf[nIdx];
            if (pn > 0 && pn !== p0 && (zBuf[nIdx] < z0 - 0.015 || Math.abs(zBuf[nIdx] - z0) > 0.04)) {
              crease = Math.max(crease, 0.72);
            }
          }
        }

        const rCol = colBuf[idx * 3] * aoFactor;
        const gCol = colBuf[idx * 3 + 1] * aoFactor;
        const bCol = colBuf[idx * 3 + 2] * aoFactor;
        out[oIdx] = Math.round(lerp(rCol, outR, crease));
        out[oIdx + 1] = Math.round(lerp(gCol, outG, crease));
        out[oIdx + 2] = Math.round(lerp(bCol, outB, crease));
        out[oIdx + 3] = 255;
      } else {
        // Compute distance to nearest opaque pixel for crisp anti-aliased #241434 silhouette outline
        let minDist = 1e9;
        for (let dy = -rCeil; dy <= rCeil; dy++) {
          const ny = py + dy;
          if (ny < 0 || ny >= RES) continue;
          for (let dx = -rCeil; dx <= rCeil; dx++) {
            const nx = px + dx;
            if (nx < 0 || nx >= RES) continue;
            if (alphaBuf[ny * RES + nx] > 0.5 && partBuf[ny * RES + nx] > 0) {
              const d = Math.hypot(dx, dy);
              if (d < minDist) minDist = d;
            }
          }
        }
        const outlineAlpha = clamp(outOutline + 0.65 - minDist, 0, 1);

        // Soft contact ground shadow ellipse beneath sprite anchor
        let shA = 0;
        if (!opts.noShadow) {
          const uvx = px / RES - 0.5;
          const uvy = py / RES - groundSy;
          const sd = Math.hypot(uvx / groundRx, uvy / groundRy);
          if (sd < 1.0) shA = (1 - sd * sd) * 0.28;
        }

        // Blend shadow + outline + additive halo
        const hR = haloBuf[oIdx], hG = haloBuf[oIdx + 1], hB = haloBuf[oIdx + 2], hA = haloBuf[oIdx + 3];
        if (outlineAlpha > 0.01) {
          const finA = clamp(outlineAlpha + shA * (1 - outlineAlpha), 0, 1);
          out[oIdx] = outR;
          out[oIdx + 1] = outG;
          out[oIdx + 2] = outB;
          out[oIdx + 3] = Math.round(finA * 255);
        } else if (shA > 0.01 || hA > 0.01) {
          const totA = clamp(shA + hA, 0, 1);
          out[oIdx] = clamp(Math.round((24 * shA + hR) / Math.max(0.01, totA)), 0, 255);
          out[oIdx + 1] = clamp(Math.round((14 * shA + hG) / Math.max(0.01, totA)), 0, 255);
          out[oIdx + 2] = clamp(Math.round((40 * shA + hB) / Math.max(0.01, totA)), 0, 255);
          out[oIdx + 3] = Math.round(totA * 255);
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 5. Texture Helpers (3D Surface Details: Stars, Stripes, Wood, Runes, Eyes)
// ---------------------------------------------------------------------------
const starTex = (base, gold = [255, 226, 118]) => (hit) => {
  const u = (Math.atan2(hit.lx, hit.lz) / Math.PI + 1) * 5.0;
  const v = (hit.ly + 0.6) * 8.0;
  const cu = Math.floor(u), cv = Math.floor(v);
  if (hash2(cu + 11, cv + 23) > 0.48) {
    const dx = u - cu - 0.5;
    const dy = v - cv - 0.5;
    const diamond = (Math.abs(dx) + Math.abs(dy) < 0.22) || (Math.abs(dx) < 0.055 && Math.abs(dy) < 0.28) || (Math.abs(dy) < 0.055 && Math.abs(dx) < 0.28);
    if (diamond) return { color: gold, emissive: 0.28 };
  }
  return null;
};
const canopyTex = (leafCol, petalCol) => (hit) => {
  const u = (hit.lx * 1.15 + hit.lz * 0.85) * 4.5 + 10.0;
  const v = hit.ly * 4.5 + 10.0;
  const cu = Math.floor(u), cv = Math.floor(v);
  const h = hash2(cu * 3 + 5, cv * 7 + 13);
  if (h > 0.58) {
    const dx = u - cu - 0.5;
    const dy = v - cv - 0.5;
    if (Math.hypot(dx, dy) < 0.26) return { color: h > 0.82 ? petalCol : leafCol };
  }
  return null;
};
const woodTex = (base, dark) => (hit) => {
  const g = vnoise2(hit.lx * 9.0 + hit.lz * 4.0, hit.ly * 2.2);
  const ring = 0.5 + 0.5 * Math.sin((hit.lx * 22 + hit.lz * 18) + g * 5.0);
  const t = ring * 0.35 + g * 0.25;
  return { color: [lerp(base[0], dark[0], t), lerp(base[1], dark[1], t), lerp(base[2], dark[2], t)] };
};
const stripeAwningTex = (c1, c2) => (hit) => {
  const band = Math.floor((hit.lx + 2.0) * 3.8) % 2;
  return { color: band === 0 ? c1 : c2 };
};
const dotCapTex = (base, dotCol) => (hit) => {
  const n1 = vnoise2(hit.lx * 5.5 + 3.1, hit.lz * 5.5 - 1.7);
  const n2 = Math.sin(hit.lx * 13) * Math.cos(hit.lz * 13);
  if (hit.ly > -0.04 && n1 > 0.62 && n2 > 0.32) return { color: dotCol, emissive: 0.3 };
  return null;
};
const eyeCatchTex = () => (hit) => {
  if (hit.ly > 0.025 && hit.lx > -0.02) return { color: [255, 255, 255], emissive: 0.9, spec: 1.0 };
  return null;
};

// ---------------------------------------------------------------------------
// 6. Asset Blueprints (Characters, Buildings, Environment, Items, UI)
// ---------------------------------------------------------------------------
function buildWizardPrims(mode) {
  const P = [];
  const stride = mode === "run" ? 0.22 : mode === "swing" ? 0.14 : 0.0;
  const bodyLean = mode === "run" ? -0.14 : mode === "swing" ? 0.12 : 0.0;
  const wandRot = mode === "swing" ? [0.65, -0.3, -1.05] : mode === "run" ? [0.35, 0.1, -0.35] : [0.08, 0.0, -0.16];
  const staffX = mode === "swing" ? 0.42 : 0.48;
  const staffY = mode === "swing" ? 0.92 : 0.85;
  const staffZ = mode === "swing" ? 0.36 : 0.16;

  // Boots
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.16, 0.14, -stride], scale: [0.14, 0.12, 0.20], color: [94, 56, 84], part: 2 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.16, 0.14, stride], scale: [0.14, 0.12, 0.20], color: [94, 56, 84], part: 3 }));
  // Robe body + gold hem + sash
  P.push(makePrim({ kind: "cone", pos: [0, 0.52, 0], rot: [bodyLean, 0, 0], rBot: 0.39, rTop: 0.21, halfH: 0.36, color: [88, 192, 255], texFn: starTex(), part: 4, sss: 0.15, sssColor: [110, 230, 255] }));
  P.push(makePrim({ kind: "torus", pos: [0, 0.22, 0], rot: [bodyLean, 0, 0], R: 0.36, r: 0.055, color: [255, 214, 102], spec: 0.85, part: 5 }));
  P.push(makePrim({ kind: "torus", pos: [0, 0.56, 0], rot: [bodyLean, 0, 0], R: 0.26, r: 0.055, color: [255, 206, 84], spec: 0.85, part: 5 }));
  // Cape streaming behind
  P.push(makePrim({ kind: "cone", pos: [0, 0.54, -0.18 - Math.abs(stride) * 0.4], rot: [0.35 + (mode === "run" ? 0.3 : 0), 0, 0], rBot: 0.34, rTop: 0.15, halfH: 0.34, color: [92, 118, 255], part: 6 }));
  // Brooch crystal
  P.push(makePrim({ kind: "hex", pos: [0, 0.74, 0.24], r: 0.08, halfH: 0.04, color: [108, 245, 255], emissive: 0.45, emissiveColor: [80, 220, 255], spec: 1.0, part: 7 }));

  // Arms
  P.push(capPrim([-0.24, 0.72, 0], [-0.39, 0.52, -stride * 0.5], 0.095, { color: [98, 202, 255], part: 8 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.41, 0.49, -stride * 0.5], scale: [0.085, 0.085, 0.085], color: [255, 224, 202], part: 8 }));
  P.push(capPrim([0.24, 0.72, 0], [staffX - 0.04, staffY - 0.16, staffZ], 0.095, { color: [98, 202, 255], part: 9 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [staffX - 0.03, staffY - 0.14, staffZ], scale: [0.09, 0.09, 0.09], color: [255, 224, 202], part: 9 }));

  // Head + rosy cheeks + shiny anime eyes
  P.push(makePrim({ kind: "ellipsoid", pos: [0, 1.02, 0.02], rot: [bodyLean * 0.5, 0, 0], scale: [0.30, 0.28, 0.28], color: [255, 226, 204], sss: 0.2, sssColor: [255, 168, 150], part: 10 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.15, 0.96, 0.22], scale: [0.075, 0.045, 0.04], color: [255, 146, 174], part: 10 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.15, 0.96, 0.22], scale: [0.075, 0.045, 0.04], color: [255, 146, 174], part: 10 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.10, 1.03, 0.26], scale: [0.055, 0.075, 0.04], color: [36, 20, 52], texFn: eyeCatchTex(), spec: 1.0, noOutline: true, part: 11 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.10, 1.03, 0.26], scale: [0.055, 0.075, 0.04], color: [36, 20, 52], texFn: eyeCatchTex(), spec: 1.0, noOutline: true, part: 11 }));

  // Pointed starry Wizard Hat (brim + gold band + bent tip cone)
  P.push(makePrim({ kind: "cone", pos: [0, 1.22, 0.0], rot: [-0.12, 0, 0], rBot: 0.54, rTop: 0.44, halfH: 0.05, color: [72, 134, 255], part: 12 }));
  P.push(makePrim({ kind: "torus", pos: [0, 1.26, 0.0], rot: [-0.12, 0, 0], R: 0.29, r: 0.05, color: [255, 214, 98], spec: 0.9, part: 13 }));
  P.push(makePrim({ kind: "cone", pos: [-0.03, 1.48, -0.02], rot: [-0.16, 0, 0.14], rBot: 0.30, rTop: 0.08, halfH: 0.24, color: [78, 138, 255], texFn: starTex(), part: 12 }));
  P.push(makePrim({ kind: "cone", pos: [-0.12, 1.72, -0.07], rot: [-0.24, 0, 0.42], rBot: 0.09, rTop: 0.01, halfH: 0.12, color: [72, 128, 248], part: 12 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.18, 1.79, -0.09], scale: [0.075, 0.075, 0.075], color: [255, 230, 118], emissive: 0.5, emissiveColor: [255, 210, 90], part: 13 }));

  // Crystal Wand Staff (grouped rotation around hand)
  const sm = rotMatEuler(...wandRot);
  const wPos = (lx, ly, lz) => {
    const r = mulMat(sm, lx, ly, lz);
    return [staffX + r[0], staffY + r[1], staffZ + r[2]];
  };
  P.push(makePrim({ kind: "cylinder", pos: wPos(0, -0.08, 0), rot: wandRot, rBot: 0.045, rTop: 0.055, halfH: 0.52, color: [164, 102, 58], texFn: woodTex([164, 102, 58], [108, 62, 32]), part: 14 }));
  const tipPos = wPos(0, 0.48, 0);
  P.push(makePrim({ kind: "torus", pos: tipPos, rot: wandRot, R: 0.13, r: 0.032, color: [255, 214, 96], spec: 0.9, part: 15 }));
  P.push(makePrim({ kind: "hex", pos: wPos(0, 0.56, 0), rot: wandRot, r: 0.14, halfH: 0.16, taperTop: 0.2, color: [108, 244, 255], emissive: 0.72, emissiveColor: [72, 232, 255], spec: 1.15, shininess: 64, part: 16 }));
  P.push(makePrim({ kind: "ellipsoid", pos: wPos(0, 0.56, 0), scale: [0.28, 0.28, 0.28], color: [110, 242, 255], glowOnly: true, glowAlpha: mode === "swing" ? 0.65 : 0.42 }));

  if (mode === "swing") {
    // Magic burst sparkles around swung wand tip
    P.push(makePrim({ kind: "ellipsoid", pos: wPos(0.18, 0.62, 0.14), scale: [0.09, 0.09, 0.09], color: [255, 236, 128], emissive: 0.9, emissiveColor: [255, 230, 120], part: 17 }));
    P.push(makePrim({ kind: "ellipsoid", pos: wPos(-0.22, 0.52, 0.2), scale: [0.075, 0.075, 0.075], color: [128, 246, 255], emissive: 0.9, emissiveColor: [110, 242, 255], part: 17 }));
  }
  return P;
}

function buildFairyWorkerPrims() {
  const P = [];
  // Wings
  for (const s of [-1, 1]) {
    P.push(makePrim({ kind: "ellipsoid", pos: [s * 0.34, 0.98, -0.18], rot: [0.2, s * -0.4, s * 0.28], scale: [0.34, 0.22, 0.04], color: [164, 248, 255], emissive: 0.35, emissiveColor: [120, 238, 255], sss: 0.45, sssColor: [210, 255, 255], part: 2 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [s * 0.24, 0.74, -0.18], rot: [0.2, s * -0.4, s * -0.2], scale: [0.24, 0.14, 0.035], color: [204, 252, 255], emissive: 0.3, emissiveColor: [150, 244, 255], part: 3 }));
  }
  // Dress + Scarf + Head + Hair + Crown
  P.push(makePrim({ kind: "cone", pos: [0, 0.58, 0], rBot: 0.30, rTop: 0.14, halfH: 0.28, color: [255, 148, 224], part: 4 }));
  P.push(makePrim({ kind: "torus", pos: [0, 0.68, 0], R: 0.19, r: 0.045, color: [255, 224, 118], part: 5 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0, 0.98, 0.02], scale: [0.24, 0.23, 0.22], color: [255, 228, 210], part: 6 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0, 1.07, -0.05], scale: [0.26, 0.20, 0.23], color: [255, 198, 108], part: 7 }));
  P.push(makePrim({ kind: "torus", pos: [0, 1.21, 0.01], R: 0.13, r: 0.03, color: [255, 224, 92], spec: 0.9, part: 8 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.08, 0.99, 0.21], scale: [0.042, 0.06, 0.03], color: [36, 20, 52], texFn: eyeCatchTex(), noOutline: true, part: 9 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.08, 0.99, 0.21], scale: [0.042, 0.06, 0.03], color: [36, 20, 52], texFn: eyeCatchTex(), noOutline: true, part: 9 }));
  // Glowing Star Wand
  P.push(capPrim([0.2, 0.72, 0.06], [0.38, 0.95, 0.22], 0.035, { color: [255, 214, 108], part: 10 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.40, 0.98, 0.24], scale: [0.11, 0.11, 0.11], color: [255, 240, 128], emissive: 0.75, emissiveColor: [255, 220, 96], part: 11 }));
  return P;
}

function buildCustomerPrims(variant) {
  const palettes = [
    { species: "squirrel", fur: [214, 134, 78], outfit: [86, 186, 122], accent: [255, 220, 118] },
    { species: "maiden", fur: [255, 226, 204], outfit: [192, 138, 255], accent: [255, 218, 118] },
    { species: "fox", fur: [236, 134, 62], outfit: [86, 118, 218], accent: [255, 244, 224] },
    { species: "bunny", fur: [248, 244, 252], outfit: [92, 216, 182], accent: [255, 148, 186] }
  ];
  const p = palettes[variant - 1];
  const P = [];
  // Feet & Coat
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.12, 0.11, 0.04], scale: [0.11, 0.1, 0.16], color: [98, 66, 48], part: 2 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.12, 0.11, -0.02], scale: [0.11, 0.1, 0.16], color: [98, 66, 48], part: 3 }));
  P.push(makePrim({ kind: "cone", pos: [0, 0.48, 0], rBot: 0.32, rTop: 0.18, halfH: 0.34, color: p.outfit, part: 4 }));
  P.push(makePrim({ kind: "torus", pos: [0, 0.56, 0], R: 0.23, r: 0.048, color: p.accent, part: 5 }));
  // Arms & Basket/Purse
  P.push(capPrim([-0.22, 0.68, 0], [-0.34, 0.48, 0.12], 0.08, { color: p.outfit, part: 6 }));
  P.push(capPrim([0.22, 0.68, 0], [0.34, 0.48, 0.12], 0.08, { color: p.outfit, part: 7 }));
  P.push(makePrim({ kind: "box", pos: [0.36, 0.44, 0.14], scale: [0.13, 0.11, 0.10], color: [198, 142, 78], part: 8 }));
  // Head & Face
  P.push(makePrim({ kind: "ellipsoid", pos: [0, 0.96, 0.02], scale: [0.27, 0.25, 0.25], color: p.fur, part: 9 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.09, 0.97, 0.24], scale: [0.046, 0.065, 0.035], color: [36, 20, 52], texFn: eyeCatchTex(), noOutline: true, part: 10 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.09, 0.97, 0.24], scale: [0.046, 0.065, 0.035], color: [36, 20, 52], texFn: eyeCatchTex(), noOutline: true, part: 10 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.14, 0.90, 0.21], scale: [0.065, 0.038, 0.03], color: [255, 146, 174], part: 9 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.14, 0.90, 0.21], scale: [0.065, 0.038, 0.03], color: [255, 146, 174], part: 9 }));

  if (p.species === "squirrel") {
    P.push(makePrim({ kind: "ellipsoid", pos: [-0.18, 1.22, -0.02], scale: [0.08, 0.11, 0.06], color: p.fur, part: 11 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0.18, 1.22, -0.02], scale: [0.08, 0.11, 0.06], color: p.fur, part: 11 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [-0.05, 0.62, -0.38], rot: [0.35, 0, 0.2], scale: [0.22, 0.36, 0.20], color: p.fur, part: 12 }));
  } else if (p.species === "maiden") {
    P.push(makePrim({ kind: "cone", pos: [0, 1.18, 0], rBot: 0.44, rTop: 0.28, halfH: 0.05, color: [255, 232, 168], part: 11 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0, 1.24, 0], scale: [0.24, 0.12, 0.24], color: [255, 224, 148], part: 11 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0.24, 1.22, 0.12], scale: [0.08, 0.06, 0.08], color: [255, 118, 182], part: 12 }));
  } else if (p.species === "fox") {
    P.push(makePrim({ kind: "cone", pos: [-0.18, 1.26, 0.02], rot: [0, 0, 0.22], rBot: 0.10, rTop: 0.02, halfH: 0.14, color: p.fur, part: 11 }));
    P.push(makePrim({ kind: "cone", pos: [0.18, 1.26, 0.02], rot: [0, 0, -0.22], rBot: 0.10, rTop: 0.02, halfH: 0.14, color: p.fur, part: 11 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0, 0.56, -0.34], rot: [0.45, 0, -0.2], scale: [0.16, 0.28, 0.16], color: p.fur, part: 12 }));
  } else {
    P.push(makePrim({ kind: "ellipsoid", pos: [-0.13, 1.38, 0.0], rot: [0.1, 0, 0.16], scale: [0.08, 0.26, 0.06], color: p.fur, part: 11 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0.13, 1.38, 0.0], rot: [0.1, 0, -0.16], scale: [0.08, 0.26, 0.06], color: p.fur, part: 11 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0.0, 0.42, -0.28], scale: [0.12, 0.12, 0.12], color: [255, 255, 255], part: 12 }));
  }
  return P;
}

function buildSlimePrims(isKing) {
  const P = [];
  const sc = isKing ? 1.28 : 0.92;
  const bodyCol = isKing ? [255, 86, 152] : [96, 236, 128];
  const sssCol = isKing ? [255, 190, 224] : [188, 255, 156];
  // Outer translucent jelly dome + inner glowing slime core
  P.push(makePrim({ kind: "ellipsoid", pos: [0, 0.46 * sc, 0], scale: [0.62 * sc, 0.48 * sc, 0.58 * sc], color: bodyCol, spec: 1.05, shininess: 68, rim: 0.55, sss: 0.45, sssColor: sssCol, celMix: 0.42, part: 2 }));
  // Decorative side drips
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.46 * sc, 0.22 * sc, 0.24 * sc], scale: [0.18 * sc, 0.16 * sc, 0.16 * sc], color: bodyCol, spec: 0.9, sss: 0.35, sssColor: sssCol, part: 2 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.46 * sc, 0.24 * sc, 0.20 * sc], scale: [0.16 * sc, 0.15 * sc, 0.15 * sc], color: bodyCol, spec: 0.9, sss: 0.35, sssColor: sssCol, part: 2 }));
  // Glossy specular bubble spots on forehead
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.22 * sc, 0.72 * sc, 0.24 * sc], scale: [0.11 * sc, 0.06 * sc, 0.06 * sc], color: [248, 255, 250], emissive: 0.45, emissiveColor: [248, 255, 250], noOutline: true, part: 3 }));
  // Expressive Eyes
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.19 * sc, 0.46 * sc, 0.50 * sc], scale: [0.08 * sc, 0.105 * sc, 0.06 * sc], color: [36, 20, 52], texFn: eyeCatchTex(), spec: 1.0, noOutline: true, part: 4 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.19 * sc, 0.46 * sc, 0.50 * sc], scale: [0.08 * sc, 0.105 * sc, 0.06 * sc], color: [36, 20, 52], texFn: eyeCatchTex(), spec: 1.0, noOutline: true, part: 4 }));
  if (isKing) {
    // Angry cute brows & grin
    P.push(capPrim([-0.30 * sc, 0.60 * sc, 0.48 * sc], [-0.08 * sc, 0.53 * sc, 0.52 * sc], 0.036 * sc, { color: [36, 20, 52], noOutline: true, part: 4 }));
    P.push(capPrim([0.30 * sc, 0.60 * sc, 0.48 * sc], [0.08 * sc, 0.53 * sc, 0.52 * sc], 0.036 * sc, { color: [36, 20, 52], noOutline: true, part: 4 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0, 0.28 * sc, 0.52 * sc], scale: [0.16 * sc, 0.07 * sc, 0.05 * sc], color: [52, 16, 48], noOutline: true, part: 4 }));
    // Faceted Gold Crown + Studded Jewels
    P.push(makePrim({ kind: "torus", pos: [0, 0.90 * sc, 0], R: 0.34 * sc, r: 0.06 * sc, color: [255, 214, 72], spec: 1.1, shininess: 64, part: 6 }));
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 + 0.2;
      const cx = Math.sin(ang) * 0.32 * sc, cz = Math.cos(ang) * 0.32 * sc;
      P.push(makePrim({ kind: "cone", pos: [cx, 1.08 * sc, cz], rBot: 0.09 * sc, rTop: 0.02 * sc, halfH: 0.14 * sc, color: [255, 206, 62], spec: 1.1, part: 6 }));
      P.push(makePrim({ kind: "ellipsoid", pos: [cx, 1.24 * sc, cz], scale: [0.055 * sc, 0.055 * sc, 0.055 * sc], color: k % 2 === 0 ? [92, 244, 255] : [255, 84, 152], emissive: 0.6, emissiveColor: [92, 244, 255], part: 7 }));
    }
    P.push(makePrim({ kind: "hex", pos: [0, 0.94 * sc, 0.38 * sc], r: 0.10 * sc, halfH: 0.045 * sc, color: [92, 246, 255], emissive: 0.65, emissiveColor: [80, 232, 255], spec: 1.1, part: 7 }));
  } else {
    P.push(makePrim({ kind: "ellipsoid", pos: [-0.28 * sc, 0.36 * sc, 0.48 * sc], scale: [0.065, 0.04, 0.03], color: [255, 168, 198], noOutline: true, part: 4 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0.28 * sc, 0.36 * sc, 0.48 * sc], scale: [0.065, 0.04, 0.03], color: [255, 168, 198], noOutline: true, part: 4 }));
  }
  return P;
}

function buildCauldronPrims() {
  const P = [];
  // Claw legs
  for (const [lx, lz] of [[-0.55, 0.55], [0.55, 0.55], [-0.55, -0.55], [0.55, -0.55]]) {
    P.push(makePrim({ kind: "cone", pos: [lx, 0.18, lz], rBot: 0.16, rTop: 0.22, halfH: 0.18, color: [228, 162, 52], spec: 0.9, part: 2 }));
  }
  // Golden Fat Pot Belly & Rune Ring
  P.push(makePrim({ kind: "ellipsoid", pos: [0, 0.72, 0], scale: [0.88, 0.66, 0.88], color: [255, 198, 66], spec: 0.95, shininess: 48, part: 3 }));
  P.push(makePrim({ kind: "torus", pos: [0, 0.68, 0], R: 0.86, r: 0.075, color: [192, 92, 255], emissive: 0.45, emissiveColor: [186, 84, 255], texFn: starTex([192, 92, 255], [255, 240, 152]), part: 4 }));
  // Lion Side Ring Handles
  for (const s of [-1, 1]) {
    P.push(makePrim({ kind: "torus", pos: [s * 0.90, 0.78, 0], rot: [0, 0, Math.PI * 0.5], R: 0.18, r: 0.05, color: [255, 224, 98], spec: 1.0, part: 5 }));
  }
  // Rim Collar + Glowing Rainbow Potion Pool & Rising Bubbles
  P.push(makePrim({ kind: "torus", pos: [0, 1.24, 0], R: 0.72, r: 0.11, color: [255, 214, 88], spec: 1.0, shininess: 56, part: 6 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0, 1.22, 0], scale: [0.64, 0.14, 0.64], color: [255, 92, 224], emissive: 0.65, emissiveColor: [242, 72, 214], spec: 1.0, part: 7 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.24, 1.48, 0.14], scale: [0.15, 0.15, 0.15], color: [112, 246, 255], emissive: 0.6, emissiveColor: [90, 236, 255], sss: 0.4, part: 8 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.22, 1.66, -0.06], scale: [0.12, 0.12, 0.12], color: [255, 134, 238], emissive: 0.65, emissiveColor: [255, 110, 230], part: 9 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0.02, 1.88, 0.06], scale: [0.09, 0.09, 0.09], color: [255, 234, 128], emissive: 0.7, emissiveColor: [255, 220, 100], part: 10 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0, 1.44, 0], scale: [0.76, 0.46, 0.76], color: [255, 120, 240], glowOnly: true, glowAlpha: 0.35 }));
  return P;
}

function buildSalesStallPrims() {
  const P = [];
  // Counter Base & Timber Trim
  P.push(makePrim({ kind: "box", pos: [0, 0.38, 0], scale: [0.96, 0.36, 0.54], bevel: 0.05, color: [188, 124, 72], texFn: woodTex([188, 124, 72], [134, 82, 42]), part: 2 }));
  P.push(makePrim({ kind: "box", pos: [0, 0.76, 0], scale: [1.04, 0.08, 0.62], bevel: 0.04, color: [232, 174, 114], texFn: woodTex([232, 174, 114], [176, 120, 68]), part: 3 }));
  P.push(makePrim({ kind: "box", pos: [0, 0.80, 0.18], scale: [0.74, 0.03, 0.24], bevel: 0.02, color: [88, 224, 158], part: 4 }));
  // Twin Wooden Support Pillars
  for (const s of [-1, 1]) {
    P.push(makePrim({ kind: "cylinder", pos: [s * 0.88, 1.24, -0.34], rBot: 0.09, rTop: 0.08, halfH: 0.56, color: [148, 92, 52], texFn: woodTex([148, 92, 52], [96, 56, 28]), part: 5 }));
  }
  // Striped Slanted Canopy Awning
  P.push(makePrim({ kind: "box", pos: [0, 1.72, 0.02], rot: [0.24, 0, 0], scale: [1.12, 0.14, 0.72], bevel: 0.06, color: [255, 110, 134], texFn: stripeAwningTex([255, 110, 134], [255, 246, 226]), part: 6 }));
  // Scalloped Front Edge Valance + Golden Sign Bell
  for (let i = -3; i <= 3; i++) {
    P.push(makePrim({ kind: "ellipsoid", pos: [i * 0.28, 1.46, 0.68], scale: [0.16, 0.11, 0.08], color: i % 2 === 0 ? [255, 110, 134] : [255, 246, 226], part: 7 }));
  }
  P.push(makePrim({ kind: "ellipsoid", pos: [0.76, 0.90, 0.34], scale: [0.10, 0.10, 0.10], color: [255, 218, 86], spec: 1.0, part: 8 }));
  P.push(makePrim({ kind: "box", pos: [0, 1.92, 0.04], scale: [0.36, 0.14, 0.06], bevel: 0.03, color: [255, 236, 168], part: 9 }));
  return P;
}

function buildGemPedestalPrims() {
  const P = [];
  P.push(makePrim({ kind: "hex", pos: [0, 0.14, 0], r: 0.88, halfH: 0.14, taperTop: 0.92, color: [132, 122, 178], part: 2 }));
  P.push(makePrim({ kind: "hex", pos: [0, 0.34, 0], r: 0.76, halfH: 0.10, taperTop: 0.94, color: [176, 166, 222], part: 3 }));
  P.push(makePrim({ kind: "torus", pos: [0, 0.44, 0], R: 0.62, r: 0.055, color: [255, 214, 96], spec: 0.9, part: 4 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0, 0.46, 0], scale: [0.54, 0.06, 0.54], color: [72, 238, 255], emissive: 0.65, emissiveColor: [64, 232, 255], part: 5 }));
  return P;
}

function buildHarvesterCartPrims() {
  const P = [];
  // Wheels
  for (const s of [-1, 1]) {
    for (const wz of [-0.36, 0.36]) {
      P.push(makePrim({ kind: "cylinder", pos: [s * 0.58, 0.24, wz], rot: [0, 0, Math.PI * 0.5], rBot: 0.24, rTop: 0.24, halfH: 0.08, color: [132, 78, 42], part: 2 }));
      P.push(makePrim({ kind: "ellipsoid", pos: [s * 0.66, 0.24, wz], scale: [0.04, 0.10, 0.10], color: [255, 212, 92], spec: 0.9, part: 3 }));
    }
  }
  // Timber Wagon Tray + Front Rotating Harvester Roller + Enchanted Broom
  P.push(makePrim({ kind: "box", pos: [0, 0.42, -0.06], scale: [0.52, 0.22, 0.62], bevel: 0.05, color: [194, 134, 78], texFn: woodTex([194, 134, 78], [138, 86, 44]), part: 4 }));
  P.push(makePrim({ kind: "torus", pos: [0, 0.62, -0.06], R: 0.48, r: 0.05, color: [255, 214, 96], spec: 0.85, part: 5 }));
  P.push(makePrim({ kind: "cylinder", pos: [0, 0.26, 0.68], rot: [0, 0, Math.PI * 0.5], rBot: 0.18, rTop: 0.18, halfH: 0.58, color: [98, 242, 255], emissive: 0.45, emissiveColor: [64, 224, 255], part: 6 }));
  P.push(capPrim([0, 0.66, -0.45], [0, 1.18, -0.82], 0.045, { color: [152, 96, 52], part: 7 }));
  P.push(makePrim({ kind: "cone", pos: [0, 1.24, -0.86], rot: [-0.7, 0, 0], rBot: 0.22, rTop: 0.08, halfH: 0.18, color: [255, 220, 114], part: 8 }));
  return P;
}

function buildArchGatePrims() {
  const P = [];
  for (const s of [-1, 1]) {
    P.push(makePrim({ kind: "box", pos: [s * 0.92, 0.24, 0], scale: [0.30, 0.24, 0.30], bevel: 0.04, color: [164, 160, 198], part: 2 }));
    P.push(makePrim({ kind: "cylinder", pos: [s * 0.92, 0.92, 0], rBot: 0.20, rTop: 0.17, halfH: 0.58, color: [164, 108, 62], texFn: woodTex([164, 108, 62], [110, 68, 34]), part: 3 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [s * 0.92, 1.38, 0.26], scale: [0.11, 0.13, 0.11], color: [255, 232, 118], emissive: 0.72, emissiveColor: [255, 210, 84], part: 4 }));
  }
  P.push(makePrim({ kind: "box", pos: [0, 1.62, 0], scale: [1.32, 0.14, 0.24], bevel: 0.05, color: [188, 128, 74], texFn: woodTex([188, 128, 74], [128, 82, 42]), part: 5 }));
  P.push(makePrim({ kind: "box", pos: [0, 1.80, 0], scale: [1.46, 0.10, 0.34], bevel: 0.05, color: [118, 206, 134], part: 6 }));
  P.push(makePrim({ kind: "box", pos: [0, 1.62, 0.24], scale: [0.56, 0.16, 0.05], bevel: 0.02, color: [255, 246, 214], part: 7 }));
  return P;
}

function buildFenceSegmentPrims() {
  const P = [];
  for (const s of [-1, 1]) {
    P.push(makePrim({ kind: "cylinder", pos: [s * 0.58, 0.44, 0], rBot: 0.20, rTop: 0.16, halfH: 0.44, color: [164, 112, 68], texFn: woodTex([164, 112, 68], [112, 72, 38]), part: 2 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [s * 0.58, 0.88, 0], scale: [0.18, 0.08, 0.18], color: [228, 184, 118], part: 3 }));
  }
  P.push(makePrim({ kind: "box", pos: [0, 0.62, 0], scale: [0.68, 0.11, 0.10], bevel: 0.03, color: [188, 132, 82], texFn: woodTex([188, 132, 82], [134, 86, 48]), part: 4 }));
  P.push(makePrim({ kind: "box", pos: [0, 0.32, 0], scale: [0.68, 0.11, 0.10], bevel: 0.03, color: [188, 132, 82], texFn: woodTex([188, 132, 82], [134, 86, 48]), part: 5 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [-0.36, 0.14, 0.22], scale: [0.18, 0.11, 0.14], color: [108, 214, 112], part: 6 }));
  return P;
}

function buildFairyTreePrims(variant) {
  const P = [];
  // Twisted trunk + roots
  P.push(makePrim({ kind: "cone", pos: [0, 0.48, 0], rBot: 0.28, rTop: 0.16, halfH: 0.48, color: [142, 90, 56], texFn: woodTex([142, 90, 56], [92, 54, 30]), part: 2 }));
  P.push(capPrim([0, 0.68, 0], [-0.34, 1.02, 0.08], 0.11, { color: [142, 90, 56], part: 2 }));
  P.push(capPrim([0, 0.72, 0], [0.32, 1.05, -0.06], 0.10, { color: [142, 90, 56], part: 2 }));

  if (variant === 1) {
    // Cherry Blossom Pastel Clouds + Hanging Lantern
    const cols = [[255, 168, 214], [255, 192, 228], [244, 146, 206]];
    const puffs = [[-0.45, 1.25, 0.12, 0.48], [0.44, 1.24, 0.10, 0.46], [0, 1.56, 0.02, 0.56], [-0.22, 1.48, -0.22, 0.42], [0.24, 1.42, 0.22, 0.42], [-0.14, 1.20, 0.34, 0.36]];
    puffs.forEach(([x, y, z, r], i) => P.push(makePrim({ kind: "ellipsoid", pos: [x, y, z], scale: [r, r * 0.85, r], color: cols[i % 3], texFn: canopyTex([255, 206, 236], [255, 242, 248]), sss: 0.35, sssColor: [255, 224, 240], part: 3 + (i % 2) })));
    P.push(makePrim({ kind: "ellipsoid", pos: [-0.48, 0.86, 0.24], scale: [0.10, 0.13, 0.10], color: [255, 230, 118], emissive: 0.75, emissiveColor: [255, 210, 88], part: 6 }));
  } else if (variant === 2) {
    // Emerald Lush Oak Canopy + Golden Blossoms
    const cols = [[92, 214, 118], [122, 232, 134], [72, 188, 108]];
    const puffs = [[-0.46, 1.26, 0.10, 0.50], [0.46, 1.22, 0.12, 0.48], [0, 1.58, 0.0, 0.58], [0, 1.22, 0.36, 0.42], [-0.26, 1.44, -0.20, 0.38]];
    puffs.forEach(([x, y, z, r], i) => P.push(makePrim({ kind: "ellipsoid", pos: [x, y, z], scale: [r, r * 0.86, r], color: cols[i % 3], texFn: canopyTex([144, 242, 148], [255, 232, 128]), sss: 0.28, sssColor: [188, 255, 168], part: 3 + (i % 2) })));
    P.push(makePrim({ kind: "ellipsoid", pos: [0.26, 1.48, 0.42], scale: [0.09, 0.09, 0.09], color: [255, 228, 118], part: 6 }));
  } else {
    // Tiered Fairy Pine + Turquoise/Mint Rim + Gold Star Top
    P.push(makePrim({ kind: "cone", pos: [0, 1.08, 0], rBot: 0.76, rTop: 0.18, halfH: 0.42, color: [68, 188, 146], sss: 0.25, sssColor: [148, 255, 218], part: 3 }));
    P.push(makePrim({ kind: "cone", pos: [0, 1.44, 0], rBot: 0.58, rTop: 0.14, halfH: 0.38, color: [92, 216, 164], sss: 0.25, sssColor: [168, 255, 224], part: 4 }));
    P.push(makePrim({ kind: "cone", pos: [0, 1.78, 0], rBot: 0.40, rTop: 0.04, halfH: 0.34, color: [118, 236, 184], part: 5 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0, 2.12, 0], scale: [0.11, 0.11, 0.11], color: [255, 230, 112], emissive: 0.75, emissiveColor: [255, 218, 92], part: 6 }));
  }
  return P;
}

function buildGlowMushroomPrims(variant) {
  const capCol = variant === 1 ? [86, 242, 216] : [255, 126, 206];
  const dotCol = variant === 1 ? [220, 255, 248] : [255, 234, 152];
  return [
    makePrim({ kind: "cone", pos: [0, 0.30, 0], rBot: 0.20, rTop: 0.14, halfH: 0.30, color: [248, 238, 224], part: 2 }),
    makePrim({ kind: "ellipsoid", pos: [0, 0.66, 0], scale: [0.48, 0.26, 0.48], color: capCol, emissive: 0.45, emissiveColor: capCol, sss: 0.45, sssColor: dotCol, texFn: dotCapTex(capCol, dotCol), part: 3 }),
    makePrim({ kind: "cone", pos: [0.42, 0.16, 0.24], rBot: 0.10, rTop: 0.07, halfH: 0.16, color: [246, 236, 222], part: 4 }),
    makePrim({ kind: "ellipsoid", pos: [0.42, 0.34, 0.24], scale: [0.24, 0.14, 0.24], color: capCol, emissive: 0.45, emissiveColor: capCol, part: 5 }),
    makePrim({ kind: "ellipsoid", pos: [0, 0.68, 0], scale: [0.58, 0.36, 0.58], color: capCol, glowOnly: true, glowAlpha: 0.35 })
  ];
}

function buildCrystalNodePrims() {
  const P = [];
  // Rock plinth base
  P.push(makePrim({ kind: "hex", pos: [0, 0.16, 0], r: 0.68, halfH: 0.16, taperTop: 0.8, color: [112, 118, 156], part: 2 }));
  P.push(makePrim({ kind: "hex", pos: [0, 0.82, 0], rot: [0.05, 0.2, -0.06], r: 0.30, halfH: 0.72, taperTop: 0.12, color: [92, 238, 255], emissive: 0.48, emissiveColor: [64, 224, 255], spec: 1.25, shininess: 80, sss: 0.4, sssColor: [192, 255, 255], part: 3 }));
  P.push(makePrim({ kind: "hex", pos: [-0.34, 0.58, 0.16], rot: [0.2, 0.4, 0.44], r: 0.20, halfH: 0.46, taperTop: 0.12, color: [118, 244, 255], emissive: 0.45, emissiveColor: [72, 228, 255], spec: 1.2, shininess: 72, part: 4 }));
  P.push(makePrim({ kind: "hex", pos: [0.36, 0.62, 0.10], rot: [-0.12, -0.3, -0.38], r: 0.21, halfH: 0.50, taperTop: 0.12, color: [72, 214, 255], emissive: 0.45, emissiveColor: [56, 206, 255], spec: 1.2, shininess: 72, part: 5 }));
  P.push(makePrim({ kind: "hex", pos: [0.06, 0.50, 0.38], rot: [0.42, 0, -0.14], r: 0.16, halfH: 0.38, taperTop: 0.15, color: [164, 252, 255], emissive: 0.55, emissiveColor: [120, 246, 255], spec: 1.2, part: 6 }));
  P.push(makePrim({ kind: "ellipsoid", pos: [0, 0.86, 0], scale: [0.76, 0.76, 0.76], color: [98, 242, 255], glowOnly: true, glowAlpha: 0.38 }));
  return P;
}

function buildBerryNodePrims() {
  const P = [];
  // Bush foliage clouds
  for (const [x, y, z, r, c] of [
    [-0.34, 0.46, 0.08, 0.42, [74, 196, 108]],
    [0.34, 0.44, 0.12, 0.40, [86, 212, 118]],
    [0, 0.68, 0.0, 0.50, [98, 224, 124]],
    [0, 0.36, 0.36, 0.36, [66, 178, 98]]
  ]) {
    P.push(makePrim({ kind: "ellipsoid", pos: [x, y, z], scale: [r, r * 0.84, r], color: c, sss: 0.25, sssColor: [176, 255, 168], part: 2 }));
  }
  // Glossy Rainbow Berries
  const berries = [
    [-0.24, 0.78, 0.40, [255, 92, 176]],
    [0.14, 0.92, 0.34, [255, 206, 78]],
    [0.36, 0.62, 0.38, [118, 232, 255]],
    [-0.38, 0.54, 0.38, [255, 134, 222]],
    [0.02, 0.56, 0.50, [255, 98, 164]]
  ];
  berries.forEach(([x, y, z, c], i) => {
    P.push(makePrim({ kind: "ellipsoid", pos: [x, y, z], scale: [0.16, 0.16, 0.16], color: c, spec: 1.15, shininess: 68, rim: 0.45, part: 4 + i }));
  });
  return P;
}

function buildBrickBlockPrims(kind) {
  const P = [];
  if (kind === "hex_mana_gem") {
    P.push(makePrim({ kind: "hex", pos: [0, 0.36, 0], rot: [0.12, 0.22, 0], r: 0.62, halfH: 0.20, taperTop: 0.84, color: [58, 238, 255], emissive: 0.52, emissiveColor: [42, 224, 255], spec: 1.25, shininess: 84, part: 2 }));
    P.push(makePrim({ kind: "hex", pos: [0, 0.56, 0], rot: [0.12, 0.22, 0], r: 0.42, halfH: 0.04, taperTop: 0.92, color: [212, 254, 255], emissive: 0.65, emissiveColor: [164, 250, 255], spec: 1.3, part: 3 }));
    return P;
  }
  const baseCol = kind === "brick_crystal" ? [72, 206, 255] : kind === "brick_berry" ? [255, 128, 188] : kind === "brick_jelly" ? [118, 242, 136] : [206, 132, 255];
  const topCol = kind === "brick_crystal" ? [178, 248, 255] : kind === "brick_berry" ? [255, 198, 226] : kind === "brick_jelly" ? [196, 255, 198] : [255, 220, 124];
  // Standardized 0.58 : 0.16 : 0.38 Tray Proportions
  P.push(makePrim({ kind: "box", pos: [0, 0.26, 0], scale: [0.68, 0.18, 0.46], bevel: 0.06, color: baseCol, spec: 0.7, part: 2 }));
  P.push(makePrim({ kind: "box", pos: [0, 0.45, 0], scale: [0.58, 0.04, 0.38], bevel: 0.04, color: topCol, spec: 0.9, part: 3 }));
  if (kind === "brick_crystal") {
    P.push(makePrim({ kind: "hex", pos: [-0.22, 0.64, 0], rot: [0, 0, 0.22], r: 0.14, halfH: 0.22, taperTop: 0.15, color: [116, 246, 255], emissive: 0.55, emissiveColor: [84, 236, 255], spec: 1.2, part: 4 }));
    P.push(makePrim({ kind: "hex", pos: [0.22, 0.64, 0], rot: [0, 0, -0.22], r: 0.14, halfH: 0.22, taperTop: 0.15, color: [92, 228, 255], emissive: 0.5, emissiveColor: [72, 220, 255], spec: 1.2, part: 5 }));
  } else if (kind === "brick_berry") {
    P.push(makePrim({ kind: "ellipsoid", pos: [-0.22, 0.58, 0.04], scale: [0.15, 0.15, 0.15], color: [255, 92, 174], spec: 1.1, part: 4 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0.02, 0.62, -0.04], scale: [0.16, 0.16, 0.16], color: [255, 212, 82], spec: 1.1, part: 5 }));
    P.push(makePrim({ kind: "ellipsoid", pos: [0.24, 0.58, 0.04], scale: [0.15, 0.15, 0.15], color: [108, 232, 255], spec: 1.1, part: 6 }));
  } else if (kind === "brick_jelly") {
    P.push(makePrim({ kind: "ellipsoid", pos: [0, 0.58, 0], scale: [0.46, 0.20, 0.30], color: [134, 252, 152], spec: 1.1, sss: 0.4, part: 4 }));
  } else {
    for (const sx of [-0.22, 0.22]) {
      P.push(makePrim({ kind: "ellipsoid", pos: [sx, 0.60, 0], scale: [0.16, 0.16, 0.16], color: [255, 98, 234], emissive: 0.55, emissiveColor: [248, 72, 220], spec: 1.1, part: 4 }));
      P.push(makePrim({ kind: "cylinder", pos: [sx, 0.78, 0], rBot: 0.06, rTop: 0.07, halfH: 0.07, color: [228, 250, 255], spec: 1.0, part: 5 }));
      P.push(makePrim({ kind: "cylinder", pos: [sx, 0.86, 0], rBot: 0.05, rTop: 0.06, halfH: 0.04, color: [196, 138, 82], part: 6 }));
    }
  }
  return P;
}

function buildUIIconPrims(kind) {
  if (kind === "guide_arrow") {
    return [
      makePrim({ kind: "box", pos: [0, 0.64, 0.36], scale: [0.16, 0.12, 0.34], bevel: 0.04, color: [118, 255, 48], emissive: 0.5, emissiveColor: [72, 224, 24], part: 2 }),
      makePrim({ kind: "cone", pos: [0, 0.64, -0.22], rot: [-Math.PI * 0.5, 0, 0], rBot: 0.44, rTop: 0.02, halfH: 0.34, color: [148, 255, 68], emissive: 0.52, emissiveColor: [84, 236, 36], part: 3 })
    ];
  }
  if (kind === "gem_icon") {
    return [
      makePrim({ kind: "hex", pos: [0, 0.74, 0], rot: [0.15, 0.3, 0], r: 0.48, halfH: 0.34, taperTop: 0.28, color: [78, 244, 255], emissive: 0.48, emissiveColor: [42, 218, 255], spec: 1.25, shininess: 84, part: 2 }),
      makePrim({ kind: "hex", pos: [0, 0.38, 0], rot: [Math.PI + 0.15, 0.3, 0], r: 0.48, halfH: 0.26, taperTop: 0.14, color: [48, 206, 248], emissive: 0.38, emissiveColor: [36, 184, 240], spec: 1.2, part: 3 })
    ];
  }
  if (kind === "crystal_icon") {
    return [
      makePrim({ kind: "hex", pos: [0, 0.68, 0], rot: [0.12, 0.2, 0], r: 0.34, halfH: 0.56, taperTop: 0.12, color: [108, 246, 255], emissive: 0.52, emissiveColor: [72, 230, 255], spec: 1.25, part: 2 }),
      makePrim({ kind: "hex", pos: [-0.30, 0.52, 0.12], rot: [0.16, 0.3, 0.42], r: 0.20, halfH: 0.36, taperTop: 0.12, color: [148, 250, 255], emissive: 0.45, emissiveColor: [92, 238, 255], part: 3 })
    ];
  }
  if (kind === "potion_icon") {
    return [
      makePrim({ kind: "ellipsoid", pos: [0, 0.52, 0], scale: [0.46, 0.42, 0.44], color: [255, 86, 224], emissive: 0.55, emissiveColor: [242, 68, 212], spec: 1.2, shininess: 76, sss: 0.4, sssColor: [255, 198, 246], part: 2 }),
      makePrim({ kind: "cylinder", pos: [0, 1.02, 0], rBot: 0.16, rTop: 0.20, halfH: 0.16, color: [222, 250, 255], spec: 1.0, part: 3 }),
      makePrim({ kind: "cylinder", pos: [0, 1.24, 0], rBot: 0.13, rTop: 0.16, halfH: 0.10, color: [198, 138, 82], part: 4 })
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// 7. Special 512x512 Renderers: Seamless Ground Tiles & Crescent Slash Arc
// ---------------------------------------------------------------------------
function renderMeadowTile() {
  const out = Buffer.alloc(RES * RES * 4);
  const P = Math.PI * 2;
  for (let y = 0; y < RES; y++) {
    const ny = y / RES;
    for (let x = 0; x < RES; x++) {
      const nx = x / RES;
      // Seamless trigonometric multi-octave meadow waves
      const w1 = Math.sin(nx * P * 2 + Math.cos(ny * P * 2)) * 0.5 + 0.5;
      const w2 = Math.cos(ny * P * 4 - Math.sin(nx * P * 3)) * 0.5 + 0.5;
      const tuft = Math.sin((nx * 14 + ny * 9) * P) * Math.cos((nx * 11 - ny * 15) * P);
      let r = lerp(112, 138, w1 * 0.6 + w2 * 0.4);
      let g = lerp(196, 222, w1 * 0.5 + w2 * 0.5);
      let b = lerp(102, 126, w2);
      if (tuft > 0.65) { r += 16; g += 18; b += 8; }
      // Tiny repeating clover/flower speckles
      const fl = Math.sin(nx * P * 5) * Math.sin(ny * P * 5) * Math.cos((nx + ny) * P * 7);
      if (fl > 0.89) { r = 255; g = 246; b = 178; }
      const idx = (y * RES + x) * 4;
      out[idx] = clamp(Math.round(r), 0, 255);
      out[idx + 1] = clamp(Math.round(g), 0, 255);
      out[idx + 2] = clamp(Math.round(b), 0, 255);
      out[idx + 3] = 255;
    }
  }
  return out;
}

function renderTimberPlankTile() {
  const out = Buffer.alloc(RES * RES * 4);
  const rows = 8;
  const rowH = RES / rows;
  const P = Math.PI * 2;
  for (let y = 0; y < RES; y++) {
    const rowIdx = Math.floor(y / rowH);
    const ry = (y % rowH) / rowH;
    const shift = (rowIdx % 2) * (RES / 4);
    for (let x = 0; x < RES; x++) {
      const sx = (x + shift) % RES;
      const colW = RES / 2;
      const colIdx = Math.floor(sx / colW);
      const rx = (sx % colW) / colW;
      const boardTint = ((rowIdx * 3 + colIdx * 5) % 4) * 5;
      const grain = Math.sin((y * 0.35) + Math.sin((sx / RES) * P * 3) * 2.2) * 0.5 + 0.5;
      let r = 212 + boardTint + grain * 14;
      let g = 160 + boardTint + grain * 12;
      let b = 104 + boardTint * 0.6 + grain * 8;

      // Dark chamfered seam grooves between boards
      if (ry < 0.055 || ry > 0.945 || rx < 0.025 || rx > 0.975) {
        r *= 0.54; g *= 0.50; b *= 0.48;
      } else if (ry < 0.11 || rx < 0.05) {
        r += 12; g += 10; b += 6; // sunny chamfer bevel highlight
      }

      // Brass nail heads near board ends (true pixel aspect)
      const nailDistL = Math.hypot((rx - 0.075) * colW, (ry - 0.5) * rowH);
      const nailDistR = Math.hypot((rx - 0.925) * colW, (ry - 0.5) * rowH);
      if (nailDistL < 4.5 || nailDistR < 4.5) {
        r = 128; g = 92; b = 58;
      }
      const idx = (y * RES + x) * 4;
      out[idx] = clamp(Math.round(r), 0, 255);
      out[idx + 1] = clamp(Math.round(g), 0, 255);
      out[idx + 2] = clamp(Math.round(b), 0, 255);
      out[idx + 3] = 255;
    }
  }
  return out;
}

function renderSlashArc512() {
  const out = Buffer.alloc(RES * RES * 4);
  for (let y = 0; y < RES; y++) {
    for (let x = 0; x < RES; x++) {
      const ux = (x - RES * 0.48) / (RES * 0.42);
      const uy = (y - RES * 0.5) / (RES * 0.42);
      const rad = Math.hypot(ux, uy);
      const ang = Math.atan2(uy, ux);
      if (Math.abs(ang) < 1.38 && rad > 0.44 && rad < 1.0) {
        const taper = Math.cos((ang / 1.38) * Math.PI * 0.5);
        const outerDist = 1.0 - rad;
        const innerCut = 0.58 + (1 - taper) * 0.36;
        if (rad > innerCut) {
          const core = smoothstep(innerCut, 0.92, rad);
          const alpha = clamp(taper * smoothstep(innerCut, innerCut + 0.1, rad) * smoothstep(1.0, 0.94, rad), 0, 1);
          const idx = (y * RES + x) * 4;
          out[idx] = Math.round(lerp(82, 255, core));
          out[idx + 1] = Math.round(lerp(236, 255, core));
          out[idx + 2] = 255;
          out[idx + 3] = Math.round(alpha * 255);
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 8. Dispatch Table & Execution
// ---------------------------------------------------------------------------
function renderAssetBuffer(id) {
  switch (id) {
    case "wizard_idle": return renderScene512(buildWizardPrims("idle"), { zoom: 2.35, centerY: 0.92, shadowY: 0.89 });
    case "wizard_run": return renderScene512(buildWizardPrims("run"), { zoom: 2.35, centerY: 0.92, yaw: 0.46, shadowY: 0.89 });
    case "wizard_swing": return renderScene512(buildWizardPrims("swing"), { zoom: 2.45, centerY: 0.94, yaw: 0.32, shadowY: 0.89 });
    case "fairy_worker": return renderScene512(buildFairyWorkerPrims(), { zoom: 1.85, centerY: 0.78, shadowY: 0.88, shadowRx: 0.16 });
    case "customer_1": return renderScene512(buildCustomerPrims(1), { zoom: 2.05, centerY: 0.72, shadowY: 0.89 });
    case "customer_2": return renderScene512(buildCustomerPrims(2), { zoom: 2.05, centerY: 0.72, shadowY: 0.89 });
    case "customer_3": return renderScene512(buildCustomerPrims(3), { zoom: 2.05, centerY: 0.72, shadowY: 0.89 });
    case "customer_4": return renderScene512(buildCustomerPrims(4), { zoom: 2.05, centerY: 0.78, shadowY: 0.89 });
    case "slime_normal": return renderScene512(buildSlimePrims(false), { zoom: 1.80, centerY: 0.48, shadowY: 0.87, shadowRx: 0.25 });
    case "slime_king": return renderScene512(buildSlimePrims(true), { zoom: 2.35, centerY: 0.76, shadowY: 0.88, shadowRx: 0.30 });
    case "cauldron_station": return renderScene512(buildCauldronPrims(), { zoom: 2.75, centerY: 0.96, pitch: 0.34, shadowY: 0.86, shadowRx: 0.28 });
    case "sales_stall": return renderScene512(buildSalesStallPrims(), { zoom: 2.85, centerY: 1.02, yaw: 0.38, pitch: 0.28, shadowY: 0.87, shadowRx: 0.32 });
    case "gem_pedestal": return renderScene512(buildGemPedestalPrims(), { zoom: 2.05, centerY: 0.35, pitch: 0.42, shadowY: 0.86, shadowRx: 0.32 });
    case "harvester_cart": return renderScene512(buildHarvesterCartPrims(), { zoom: 2.40, centerY: 0.70, yaw: 0.55, pitch: 0.32, shadowY: 0.88, shadowRx: 0.30 });
    case "arch_gate": return renderScene512(buildArchGatePrims(), { zoom: 3.10, centerY: 1.05, yaw: 0.28, shadowY: 0.88, shadowRx: 0.36 });
    case "fence_segment": return renderScene512(buildFenceSegmentPrims(), { zoom: 2.25, centerY: 0.50, yaw: 0.30, shadowY: 0.88, shadowRx: 0.30 });
    case "fairy_tree_1": return renderScene512(buildFairyTreePrims(1), { zoom: 2.70, centerY: 1.04, shadowY: 0.90, shadowRx: 0.24 });
    case "fairy_tree_2": return renderScene512(buildFairyTreePrims(2), { zoom: 2.70, centerY: 1.04, shadowY: 0.90, shadowRx: 0.24 });
    case "fairy_tree_3": return renderScene512(buildFairyTreePrims(3), { zoom: 2.75, centerY: 1.08, shadowY: 0.90, shadowRx: 0.24 });
    case "glow_mushroom_1": return renderScene512(buildGlowMushroomPrims(1), { zoom: 1.70, centerY: 0.48, shadowY: 0.88, shadowRx: 0.24 });
    case "glow_mushroom_2": return renderScene512(buildGlowMushroomPrims(2), { zoom: 1.70, centerY: 0.48, shadowY: 0.88, shadowRx: 0.24 });
    case "crystal_node": return renderScene512(buildCrystalNodePrims(), { zoom: 2.35, centerY: 0.72, shadowY: 0.89, shadowRx: 0.28 });
    case "berry_node": return renderScene512(buildBerryNodePrims(), { zoom: 2.10, centerY: 0.58, shadowY: 0.89, shadowRx: 0.28 });
    case "meadow_tile": return renderMeadowTile();
    case "timber_plank_tile": return renderTimberPlankTile();
    case "brick_crystal":
    case "brick_berry":
    case "brick_jelly":
    case "brick_potion":
    case "hex_mana_gem":
      return renderScene512(buildBrickBlockPrims(id), { zoom: 1.85, centerY: 0.48, yaw: 0.58, pitch: 0.48, noShadow: true, outlineWidth: 4.5 });
    case "guide_arrow":
      return renderScene512(buildUIIconPrims("guide_arrow"), { zoom: 1.85, centerY: 0.64, yaw: 0.0, pitch: 1.18, noShadow: true, outlineWidth: 4.5 });
    case "slash_arc": return renderSlashArc512();
    case "gem_icon":
    case "potion_icon":
    case "crystal_icon":
      return renderScene512(buildUIIconPrims(id), { zoom: 1.75, centerY: 0.68, yaw: 0.25, pitch: 0.26, noShadow: true, outlineWidth: 4.5 });
    default:
      throw new Error(`Unknown asset id: ${id}`);
  }
}

function main() {
  const bundleOnly = process.argv.includes("--bundle-only");
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const dataUrls = {};
  const t0 = Date.now();

  for (const entry of manifest.assets) {
    const outPath = path.join(ROOT, entry.path);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (!bundleOnly || !fs.existsSync(outPath)) {
      const rgba = renderAssetBuffer(entry.id);
      const png = encodePNG(RES, RES, rgba);
      fs.writeFileSync(outPath, png);
      dataUrls[entry.id] = "data:image/png;base64," + png.toString("base64");
    } else {
      const existing = fs.readFileSync(outPath);
      dataUrls[entry.id] = "data:image/png;base64," + existing.toString("base64");
    }
  }

  const bundleContent =
    "// Auto-generated by scripts/generate_3d_assets.js (Phase 2)\n" +
    "// Pre-rendered 512x512 3D sprite & tile asset bundle for zero-CORS WebGL loading.\n" +
    "window.ASSET_MANIFEST = " + JSON.stringify(manifest) + ";\n" +
    "window.ASSET_DATA_URLS = " + JSON.stringify(dataUrls) + ";\n";
  fs.writeFileSync(BUNDLE_PATH, bundleContent, "utf8");

  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`Baked ${manifest.assets.length} x ${RES}x${RES} 3D assets + asset_bundle.js in ${elapsed}s.`);
}

main();
