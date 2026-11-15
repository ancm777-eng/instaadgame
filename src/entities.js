// =============================================================================
// src/entities.js - Unified Entity Builders Wiring ChibiCharacters, GLB Props,
// 3D Slatted Wooden Pallets, and Floor Card Gauge Step Pads (Zero Floating Boxes)
// =============================================================================

(function () {
  "use strict";

  function chibi() {
    return window.ChibiCharacters;
  }

  function loader() {
    return window.AssetLoader;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, rad);
    } else {
      ctx.moveTo(x + rad, y);
      ctx.lineTo(x + w - rad, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
      ctx.lineTo(x + w, y + h - rad);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
      ctx.lineTo(x + rad, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
      ctx.lineTo(x, y + rad);
      ctx.quadraticCurveTo(x, y, x + rad, y);
      ctx.closePath();
    }
  }

  // ---------------------------------------------------------------------------
  // Character / Stack / Machine / Truck Delegates -> window.ChibiCharacters
  // ---------------------------------------------------------------------------
  function createPlayerHero() {
    return chibi().createAlchemistHero();
  }

  function updateHeroTier(hero, tier) {
    return chibi().updateHeroTier(hero, tier);
  }

  function animatePlayerHero(hero, state, dt) {
    return chibi().animateHero(hero, state, dt);
  }

  function createFairyWorker(idx) {
    return chibi().createFairyWorker(idx);
  }

  function animateFairy(fairy, dt) {
    return chibi().animateFairy(fairy, dt);
  }

  function createCustomer(variantIdx) {
    return chibi().createAnimalCustomer(variantIdx);
  }

  function animateCustomer(cust, walking, dt) {
    return chibi().animateCustomer(cust, walking, dt);
  }

  function createItemBlock(itemType) {
    return chibi().createResourceCrate(itemType);
  }

  function createProductionMachine(kind) {
    return chibi().createProductionMachine(kind);
  }

  function animateProductionMachine(machine, processing, dt) {
    return chibi().animateProductionMachine(machine, processing, dt);
  }

  function createHarvesterCart() {
    return chibi().createHarvesterTruck();
  }

  function animateHarvesterTruck(truck, speed, dt) {
    return chibi().animateHarvesterTruck(truck, speed, dt);
  }

  // ---------------------------------------------------------------------------
  // GLB Props & Environment Stations (Sales Stall, Gem Pedestal, Resource Nodes)
  // ---------------------------------------------------------------------------
  function createSalesStall(x = -13.5, z = 2.5) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const visualRoot = new THREE.Group();
    root.add(visualRoot);

    const L = loader();
    let built = false;
    if (L && L.hasRole && L.hasRole("sales_stall")) {
      const inst = L.createInstance("sales_stall", {
        targetHeight: 3.1,
        castShadow: true,
        receiveShadow: true,
      });
      if (inst && inst.root) {
        visualRoot.add(inst.root);
        built = true;
      }
    }
    if (!built) {
      const matWood = chibi().makeToonMat(0xb07540);
      const matCanopy = chibi().makeToonMat(0xe85a72);
      const matTrim = chibi().makeToonMat(0xfff0cc);
      chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(3.4, 1.15, 2.0), matWood, { pos: [0, 0.58, 0] });
      chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(3.7, 0.45, 2.3), matCanopy, { pos: [0, 2.75, 0] });
      chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(3.75, 0.14, 2.35), matTrim, { pos: [0, 2.48, 0] });
      [-1.5, 1.5].forEach((px) => {
        chibi().addOutlinedMesh(visualRoot, new THREE.CylinderGeometry(0.11, 0.11, 2.6, 8), matWood, { pos: [px, 1.3, 0.85] });
      });
    }

    // Countertop display anchor + glowing shop sign crystal
    const stockAnchor = new THREE.Group();
    stockAnchor.position.set(0, 1.24, 0);
    root.add(stockAnchor);

    return { root, visualRoot, stockAnchor };
  }

  function createGemPedestal(x = -9.6, z = -2.2) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const visualRoot = new THREE.Group();
    root.add(visualRoot);

    // Wide sturdy 3x3 collection platform base
    const baseMat = chibi().makeToonMat(0x524c78);
    const rimMat = chibi().makeToonMat(0x52efff, { emissive: 0x1fc4ff, emissiveIntensity: 0.35 });
    chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(2.55, 0.24, 2.25), baseMat, {
      pos: [0, 0.12, 0],
      castShadow: true,
      receiveShadow: true,
      outlineScale: 1.03,
    });
    const innerPad = new THREE.Mesh(
      new THREE.BoxGeometry(2.24, 0.05, 1.94),
      rimMat
    );
    innerPad.position.set(0, 0.245, 0);
    visualRoot.add(innerPad);

    const L = loader();
    if (L && L.hasRole && L.hasRole("gem_pedestal")) {
      const inst = L.createInstance("gem_pedestal", {
        targetHeight: 0.72,
        castShadow: true,
        receiveShadow: true,
      });
      if (inst && inst.root) {
        inst.root.position.set(0, 0.22, -1.25);
        visualRoot.add(inst.root);
      }
    }

    // 3x3 Tall Mana Gem Skyscraper Anchor
    const stackAnchor = new THREE.Group();
    stackAnchor.position.set(0, 0.27, 0);
    root.add(stackAnchor);

    return { root, visualRoot, stackAnchor };
  }

  function createResourceNode(kind, x, z) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const visualRoot = new THREE.Group();
    root.add(visualRoot);

    const isCrystal = kind === "crystal";
    const role = isCrystal ? "rock_crystal" : "berry_bush";
    const L = loader();

    let built = false;
    if (L && L.hasRole && L.hasRole(role)) {
      const inst = L.createInstance(role, {
        targetHeight: isCrystal ? 1.55 : 1.42,
        tint: isCrystal ? 0x56ecff : 0xff739c,
        tintStrength: isCrystal ? 0.28 : 0.22,
        emissiveTint: isCrystal ? 0x1bbfff : 0xe03274,
        emissiveIntensity: isCrystal ? 0.25 : 0.12,
        castShadow: true,
        receiveShadow: true,
      });
      if (inst && inst.root) {
        inst.root.rotation.y = ((Math.abs(x * 7 + z * 13)) % 6.28);
        visualRoot.add(inst.root);
        built = true;
      }
    }

    if (!built) {
      if (isCrystal) {
        const mat = chibi().makeToonMat(0x52e8ff, { emissive: 0x1cb2ff, emissiveIntensity: 0.35 });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.55, 0), mat, {
          pos: [0, 0.72, 0],
          scale: [0.95, 1.45, 0.95],
        });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.35, 0), mat, {
          pos: [0.36, 0.44, 0.22],
          rot: [0.3, 0.4, -0.35],
          scale: [0.9, 1.35, 0.9],
        });
      } else {
        const bushMat = chibi().makeToonMat(0x42b549);
        const berryMat = chibi().makeToonMat(0xff528e, { emissive: 0xd12662, emissiveIntensity: 0.22 });
        chibi().addOutlinedMesh(visualRoot, new THREE.DodecahedronGeometry(0.62, 1), bushMat, { pos: [0, 0.56, 0] });
        [[-0.35, 0.76, 0.36], [0.36, 0.72, 0.32], [0, 0.96, 0.18], [-0.22, 0.55, -0.35]].forEach(([bx, by, bz]) => {
          chibi().addOutlinedMesh(visualRoot, new THREE.SphereGeometry(0.16, 8, 8), berryMat, { pos: [bx, by, bz] });
        });
      }
    }

    // Subtle ground highlight ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: isCrystal ? 0x52e8ff : 0xff709e,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.80, 18), ringMat);
    ringMesh.rotation.x = -Math.PI * 0.5;
    ringMesh.position.y = 0.03;
    root.add(ringMesh);

    return { root, visualRoot, ringMesh, kind };
  }

  // ---------------------------------------------------------------------------
  // 3D Slatted Wooden Pallet + White-Bordered Drop / Pickup Zone
  // ---------------------------------------------------------------------------
  function makePalletMatTexture(w = 256, h = 256, accentColor = "#ffffff", badgeText = "") {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, w, h);

    // Translucent dark-tinted floor zone background
    roundRectPath(ctx, 10, 10, w - 20, h - 20, 22);
    ctx.fillStyle = "rgba(18, 28, 48, 0.42)";
    ctx.fill();

    // Thick crisp white outer border
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Accent inner dash border
    roundRectPath(ctx, 22, 22, w - 44, h - 44, 14);
    ctx.lineWidth = 4;
    ctx.strokeStyle = accentColor;
    ctx.stroke();

    if (badgeText) {
      ctx.font = "900 32px Pretendard, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillText(badgeText, w * 0.5 + 2, h - 20);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(badgeText, w * 0.5, h - 22);
    }

    const tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  function createWoodenPalletZone(opts = {}) {
    const x = opts.x || 0;
    const z = opts.z || 0;
    const w = opts.w || 2.35;
    const d = opts.d || 1.95;
    const accentHex = opts.accentColor || "#5ef0ff";
    const badgeText = opts.badgeText || "";

    const root = new THREE.Group();
    root.position.set(x, 0, z);

    // White-bordered floor mat
    const matTex = makePalletMatTexture(256, 256, accentHex, badgeText);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: matTex,
      transparent: true,
      depthWrite: false,
    });
    const matMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    matMesh.rotation.x = -Math.PI * 0.5;
    matMesh.position.y = 0.026;
    root.add(matMesh);

    // 3D Slatted Wooden Pallet resting inside the bordered zone
    const palletGroup = new THREE.Group();
    const pw = w * 0.72;
    const pd = d * 0.68;
    const matRunner = chibi().makeToonMat(0x7c4f2b);
    const matSlat = chibi().makeToonMat(0xc48b52);

    // 3 bottom support runners along Z
    [-pw * 0.38, 0, pw * 0.38].forEach((rx) => {
      chibi().addOutlinedMesh(palletGroup, new THREE.BoxGeometry(0.18, 0.09, pd), matRunner, {
        pos: [rx, 0.065, 0],
        castShadow: true,
        receiveShadow: true,
        outlineScale: 1.04,
      });
    });

    // 5 top slatted oak deck boards across X
    const slatCount = 5;
    const slatD = (pd * 0.78) / slatCount;
    for (let i = 0; i < slatCount; i++) {
      const sz = -pd * 0.42 + (i / (slatCount - 1)) * (pd * 0.84);
      chibi().addOutlinedMesh(palletGroup, new THREE.BoxGeometry(pw, 0.055, slatD), matSlat, {
        pos: [0, 0.135, sz],
        castShadow: true,
        receiveShadow: true,
        outlineScale: 1.03,
      });
    }
    root.add(palletGroup);

    // Stack anchor cleanly above top pallet slats
    const stackAnchor = new THREE.Group();
    stackAnchor.position.set(0, 0.17, 0);
    root.add(stackAnchor);

    return { root, matMesh, floorMat, palletGroup, stackAnchor, w, d };
  }

  function updateWoodenPalletZone(zone, activeRatio = 0, pulseTime = 0) {
    if (!zone || !zone.matMesh) return;
    const pulse = activeRatio > 0 ? 1 + Math.sin(pulseTime * 9) * 0.04 : 1.0;
    zone.matMesh.scale.set(pulse, pulse, 1);
  }

  // ---------------------------------------------------------------------------
  // 3D Floor Card Gauge Mat Step-Pad (ZERO floating labelMesh!)
  // Thick white corner brackets (┌ ┐ └ ┘) + bottom-to-top emerald green fill
  // ---------------------------------------------------------------------------
  function drawStepPadCanvas(pad, opts) {
    const canvas = pad.cardCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const paidRatio = Math.max(0, Math.min(1, opts.paidRatio || 0));
    const isMax = !!opts.isMax;
    const unlocked = opts.unlocked !== false;
    const canAfford = !!opts.canAfford;
    const isActive = !!opts.isStepped;
    const icon = opts.icon || "✨";
    const title = opts.title || "";
    const price = opts.price || "";
    const levelText = opts.levelText || "";
    const accentHex = opts.accentHex || "#52f0ff";

    const padX = 16;
    const padY = 16;
    const cw = W - padX * 2;
    const ch = H - padY * 2;
    const radius = 34;

    // 1. Dark translucent card backing clipped inside rounded rectangle
    ctx.save();
    roundRectPath(ctx, padX, padY, cw, ch, radius);
    ctx.fillStyle = unlocked
      ? isActive
        ? "rgba(22, 34, 62, 0.86)"
        : "rgba(14, 22, 42, 0.78)"
      : "rgba(30, 32, 46, 0.62)";
    ctx.fill();
    ctx.clip();

    // 2. Bottom-to-top green progress fill gauge
    const fillRatio = isMax ? 1 : paidRatio;
    if (fillRatio > 0.005) {
      const fillH = ch * fillRatio;
      const fillTop = padY + ch - fillH;
      const grad = ctx.createLinearGradient(0, padY + ch, 0, fillTop);
      if (isMax) {
        grad.addColorStop(0, "rgba(255, 196, 46, 0.78)");
        grad.addColorStop(1, "rgba(255, 232, 108, 0.88)");
      } else {
        grad.addColorStop(0, "rgba(18, 178, 86, 0.88)");
        grad.addColorStop(1, "rgba(74, 252, 142, 0.94)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(padX, fillTop, cw, fillH);

      // Bright glowing meniscus bar at fill frontier
      if (fillRatio < 0.995) {
        ctx.fillStyle = "#d8ffe6";
        ctx.fillRect(padX, fillTop, cw, 6);
      }
    }

    // Subtle top accent tint stripe
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(padX, padY, cw, 10);
    ctx.globalAlpha = 1;
    ctx.restore();

    // 3. Thin dark-tinted inner perimeter
    roundRectPath(ctx, padX, padY, cw, ch, radius);
    ctx.lineWidth = 4;
    ctx.strokeStyle = canAfford && unlocked ? "rgba(120, 255, 176, 0.95)" : "rgba(255, 255, 255, 0.35)";
    ctx.stroke();

    // 4. Four thick white corner brackets (┌ ┐ └ ┘)
    const arm = 48;
    const inset = 6;
    const x0 = padX + inset;
    const y0 = padY + inset;
    const x1 = padX + cw - inset;
    const y1 = padY + ch - inset;
    const cr = 22;

    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = isMax ? "#ffe36e" : "#ffffff";

    // Top-Left ┌
    ctx.beginPath();
    ctx.moveTo(x0, y0 + arm);
    ctx.lineTo(x0, y0 + cr);
    ctx.quadraticCurveTo(x0, y0, x0 + cr, y0);
    ctx.lineTo(x0 + arm, y0);
    ctx.stroke();

    // Top-Right ┐
    ctx.beginPath();
    ctx.moveTo(x1 - arm, y0);
    ctx.lineTo(x1 - cr, y0);
    ctx.quadraticCurveTo(x1, y0, x1, y0 + cr);
    ctx.lineTo(x1, y0 + arm);
    ctx.stroke();

    // Bottom-Left └
    ctx.beginPath();
    ctx.moveTo(x0, y1 - arm);
    ctx.lineTo(x0, y1 - cr);
    ctx.quadraticCurveTo(x0, y1, x0 + cr, y1);
    ctx.lineTo(x0 + arm, y1);
    ctx.stroke();

    // Bottom-Right ┘
    ctx.beginPath();
    ctx.moveTo(x1 - arm, y1);
    ctx.lineTo(x1 - cr, y1);
    ctx.quadraticCurveTo(x1, y1, x1, y1 - cr);
    ctx.lineTo(x1, y1 - arm);
    ctx.stroke();

    // 5. Integrated Card Typography & Icon on the Floor Mat
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Level pill chip at top-right inside frame
    if (levelText) {
      const chipW = 112;
      const chipH = 40;
      const chipX = x1 - chipW - 22;
      const chipY = y0 + 24;
      roundRectPath(ctx, chipX, chipY, chipW, chipH, 16);
      ctx.fillStyle = isMax ? "#f59e0b" : "rgba(15, 23, 42, 0.85)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.stroke();
      ctx.font = "900 24px Pretendard, system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(levelText, chipX + chipW * 0.5, chipY + chipH * 0.5 + 1);
    }

    // Large crisp Emoji Icon
    ctx.font = "84px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(icon, W * 0.5 - (levelText ? 34 : 0), H * 0.30);

    // Bold readable title with dark drop outline
    ctx.font = "900 38px Pretendard, Apple SD Gothic Neo, system-ui, sans-serif";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(10, 14, 28, 0.92)";
    ctx.strokeText(title, W * 0.5, H * 0.57);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, W * 0.5, H * 0.57);

    // Bold Price Pill at bottom half
    if (price) {
      const pillW = Math.min(cw - 76, 336);
      const pillH = 66;
      const pillX = (W - pillW) * 0.5;
      const pillY = H * 0.72;
      roundRectPath(ctx, pillX, pillY, pillW, pillH, 24);
      ctx.fillStyle = isMax
        ? "rgba(180, 110, 12, 0.94)"
        : canAfford
        ? "rgba(12, 116, 62, 0.92)"
        : "rgba(24, 30, 52, 0.92)";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = isMax ? "#fff3a8" : canAfford ? "#8effbe" : "rgba(255,255,255,0.42)";
      ctx.stroke();

      ctx.font = "900 38px Pretendard, system-ui, sans-serif";
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(8, 12, 22, 0.9)";
      ctx.strokeText(price, W * 0.5, pillY + pillH * 0.5 + 2);
      ctx.fillStyle = isMax ? "#fff8cc" : canAfford ? "#ffffff" : "#ffd866";
      ctx.fillText(price, W * 0.5, pillY + pillH * 0.5 + 2);
    }
  }

  function createStepPad(opts = {}) {
    const w = opts.w || 3.3;
    const d = opts.d || 2.55;
    const root = new THREE.Group();
    root.position.set(opts.x || 0, 0, opts.z || 0);

    let cardCanvas = null;
    let cardTex = null;
    if (typeof document !== "undefined") {
      cardCanvas = document.createElement("canvas");
      cardCanvas.width = 512;
      cardCanvas.height = 396;
      cardTex = new THREE.CanvasTexture(cardCanvas);
      if (THREE.SRGBColorSpace) cardTex.colorSpace = THREE.SRGBColorSpace;
      else if (THREE.sRGBEncoding) cardTex.encoding = THREE.sRGBEncoding;
    }

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: cardTex,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.y = 0.032;
    root.add(mesh);

    const pad = {
      id: opts.id || "",
      root,
      mesh,
      mat,
      cardCanvas,
      cardTex,
      w,
      d,
      _lastKey: "",
    };

    updateStepPadTexture(pad, opts);
    return pad;
  }

  function updateStepPadTexture(pad, opts = {}) {
    if (!pad) return;
    const qRatio = Math.round((opts.paidRatio || 0) * 60) / 60;
    const key = [
      opts.icon || "",
      opts.title || "",
      opts.price || "",
      opts.levelText || "",
      qRatio,
      opts.isMax ? 1 : 0,
      opts.unlocked === false ? 0 : 1,
      opts.canAfford ? 1 : 0,
      opts.isStepped ? 1 : 0,
      opts.accentHex || "",
    ].join("|");

    if (pad.mesh) {
      const targetScale = opts.isStepped ? 1.045 : 1.0;
      pad.mesh.scale.set(targetScale, targetScale, 1);
    }
    if (key === pad._lastKey) return;
    pad._lastKey = key;

    if (pad.cardCanvas) {
      drawStepPadCanvas(pad, { ...opts, paidRatio: qRatio });
      if (pad.cardTex) pad.cardTex.needsUpdate = true;
    }
  }

  window.Entities = {
    createPlayerHero,
    updateHeroTier,
    animatePlayerHero,
    animateHero: animatePlayerHero,
    createFairyWorker,
    animateFairy,
    createCustomer,
    animateCustomer,
    createItemBlock,
    createProductionMachine,
    animateProductionMachine,
    createHarvesterCart,
    animateHarvesterTruck,
    createSalesStall,
    createGemPedestal,
    createResourceNode,
    createWoodenPalletZone,
    updateWoodenPalletZone,
    createStepPad,
    updateStepPadTexture,
  };
})();
