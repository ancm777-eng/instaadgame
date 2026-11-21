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

  function createCustomer(variantIdx, roleType = "villager") {
    return chibi().createAnimalCustomer(variantIdx, roleType);
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

  function createRoyalTradeWagon() {
    return chibi().createRoyalTradeWagon();
  }

  function animateRoyalTradeWagon(wagon, speed, dt) {
    return chibi().animateRoyalTradeWagon(wagon, speed, dt);
  }

  function createCuteMonster(species, waveTier) {
    return chibi().createCuteMonster(species, waveTier);
  }

  function animateCuteMonster(monster, dt, slowed) {
    return chibi().animateCuteMonster(monster, dt, slowed);
  }

  function createDefenseTurret(kind) {
    return chibi().createDefenseTurret(kind);
  }

  function animateDefenseTurret(turret, active, dt) {
    return chibi().animateDefenseTurret(turret, active, dt);
  }

  function drawOverheadBannerCanvas(canvas, ctx, opts) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const bgColor = opts.bgColor || "rgba(20, 16, 40, 0.92)";
    const borderColor = opts.borderColor || "#fbbf24";
    const accentColor = opts.accentColor || "#fffbeb";
    const pad = 10;
    const r = 24;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.lineTo(w - pad - r, pad);
    ctx.quadraticCurveTo(w - pad, pad, w - pad, pad + r);
    ctx.lineTo(w - pad, h - pad - r);
    ctx.quadraticCurveTo(w - pad, h - pad, w - pad - r, h - pad);
    ctx.lineTo(pad + r, h - pad);
    ctx.quadraticCurveTo(pad, h - pad, pad, h - pad - r);
    ctx.lineTo(pad, pad + r);
    ctx.quadraticCurveTo(pad, pad, pad + r, pad);
    ctx.closePath();

    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const hasSub = Boolean(opts.subtitle);
    ctx.font = `900 ${hasSub ? 42 : 48}px "Pretendard", "Jua", "Malgun Gothic", sans-serif`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(10, 8, 22, 0.95)";
    const titleY = hasSub ? h * 0.37 : h * 0.51;
    ctx.strokeText(opts.text || "", w * 0.5, titleY);
    ctx.fillStyle = accentColor;
    ctx.fillText(opts.text || "", w * 0.5, titleY);

    if (hasSub) {
      ctx.font = '700 28px "Pretendard", "Malgun Gothic", sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeText(opts.subtitle, w * 0.5, h * 0.74);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(opts.subtitle, w * 0.5, h * 0.74);
    }
    ctx.restore();
  }

  function createOverheadBannerSprite(opts = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = opts.canvasW || 640;
    canvas.height = opts.canvasH || 156;
    const ctx = canvas.getContext("2d");
    const normOpts = {
      text: opts.text || "",
      subtitle: opts.subtitle || "",
      accentColor: opts.accentColor || "#fffbeb",
      bgColor: opts.bgColor || "rgba(20, 16, 40, 0.92)",
      borderColor: opts.borderColor || "#fbbf24",
    };
    drawOverheadBannerCanvas(canvas, ctx, normOpts);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(opts.x || 0, opts.y != null ? opts.y : 4.1, opts.z || 0);
    sprite.scale.set(opts.w || 4.8, opts.h || 1.15, 1);
    sprite.renderOrder = opts.renderOrder != null ? opts.renderOrder : 999;
    sprite.userData = { canvas, ctx, tex, opts: normOpts, _lastKey: `${normOpts.text}|${normOpts.subtitle}|${normOpts.accentColor}|${normOpts.borderColor}` };
    return sprite;
  }

  function updateOverheadBannerSprite(sprite, text, accentColor, subtitle, borderColor) {
    if (!sprite || !sprite.userData || !sprite.userData.canvas) return;
    const u = sprite.userData;
    const nextText = text != null ? String(text) : u.opts.text;
    const nextSub = subtitle !== undefined ? String(subtitle) : u.opts.subtitle;
    const nextAcc = accentColor || u.opts.accentColor;
    const nextBorder = borderColor || u.opts.borderColor;
    const key = `${nextText}|${nextSub}|${nextAcc}|${nextBorder}`;
    if (key === u._lastKey) return;
    u._lastKey = key;
    u.opts.text = nextText;
    u.opts.subtitle = nextSub;
    u.opts.accentColor = nextAcc;
    u.opts.borderColor = nextBorder;
    drawOverheadBannerCanvas(u.canvas, u.ctx, u.opts);
    if (u.tex) u.tex.needsUpdate = true;
  }

  function createZoneHeaderBanner(title, subtitle = "", x = 0, y = 5.4, z = 0, accentColor = "#fffbeb", borderColor = "#f59e0b") {
    return createOverheadBannerSprite({
      text: title,
      subtitle,
      x,
      y,
      z,
      w: 7.2,
      h: 1.65,
      canvasW: 768,
      canvasH: 184,
      accentColor,
      bgColor: "rgba(16, 12, 32, 0.94)",
      borderColor,
      renderOrder: 1000,
    });
  }

  function createDistrictPlatform(opts = {}) {
    const theme = opts.theme || "alchemy";
    const x = opts.x || 0;
    const z = opts.z || 0;
    const w = opts.w || 14;
    const d = opts.d || 11;
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const palettes = {
      alchemy: { fill: "#4a2570", rim: "#f1c40f", sub: "#9b59b6", hex: 0x9b59b6 },
      defense: { fill: "#23395d", rim: "#00e5ff", sub: "#2980b9", hex: 0x00e5ff },
      training: { fill: "#1b5e3a", rim: "#a3ffcb", sub: "#2ecc71", hex: 0x2ecc71 },
      factory: { fill: "#5c2e1f", rim: "#fbbf24", sub: "#e67e22", hex: 0xe67e22 },
      guild: { fill: "#145352", rim: "#f9e79f", sub: "#1abc9c", hex: 0x1abc9c },
    };
    const pal = palettes[theme] || palettes.alchemy;

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = pal.fill;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 4;
    for (let i = 64; i < 512; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 16); ctx.lineTo(i, 496); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(16, i); ctx.lineTo(496, i); ctx.stroke();
    }

    ctx.strokeStyle = pal.sub;
    ctx.lineWidth = 22;
    ctx.strokeRect(14, 14, 484, 484);
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = 7;
    ctx.strokeRect(24, 24, 464, 464);

    if (theme === "alchemy") {
      ctx.strokeStyle = "rgba(241, 196, 15, 0.55)";
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(256, 256, 175, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(256, 256, 128, 0, Math.PI * 2); ctx.stroke();
    } else if (theme === "factory") {
      ctx.fillStyle = "rgba(251, 191, 36, 0.65)";
      for (const ax of [128, 256, 384]) {
        ctx.beginPath();
        ctx.moveTo(ax, 380);
        ctx.lineTo(ax - 24, 420);
        ctx.lineTo(ax + 24, 420);
        ctx.closePath();
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    const slab = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: tex, transparent: false })
    );
    slab.rotation.x = -Math.PI * 0.5;
    slab.position.y = 0.016;
    root.add(slab);

    if (theme === "defense") {
      const stoneMat = chibi().makeToonMat(0x334155);
      const cyanMat = chibi().makeToonMat(0x00e5ff, { emissive: 0x0ea5e9, emissiveIntensity: 0.55 });
      for (const [cx, cz] of [[-w * 0.46, -d * 0.45], [w * 0.46, -d * 0.45], [-w * 0.46, d * 0.45], [w * 0.46, d * 0.45]]) {
        chibi().addOutlinedMesh(root, new THREE.CylinderGeometry(0.38, 0.46, 1.35, 6), stoneMat, { pos: [cx, 0.68, cz] });
        chibi().addOutlinedMesh(root, new THREE.OctahedronGeometry(0.28, 0), cyanMat, { pos: [cx, 1.58, cz] });
      }
    }
    return root;
  }

  function createVillageGate(x = 24.0, z = 0.0, badgeText = "🏰 동쪽 수호 성문") {
    const gate = chibi().createVillageGate();
    gate.root.position.set(x, 0, z);
    if (badgeText) {
      const sprite = createOverheadBannerSprite({
        text: badgeText,
        x: 0,
        y: 4.5,
        z: 0,
        w: 5.0,
        h: 1.15,
        accentColor: "#ffe4e6",
        borderColor: "#38bdf8",
        renderOrder: 999,
      });
      gate.root.add(sprite);
      gate.bannerSprite = sprite;
    }
    return gate;
  }

  function createSouthResourceGate(x = 0.0, z = 20.0, badgeText = "⛏️ 남쪽 자원 채집 출입구") {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const matWood = chibi().makeToonMat(0x8c562c);
    const matStone = chibi().makeToonMat(0x7c86a8);
    const matLeaf = chibi().makeToonMat(0x4ade80);
    const matGold = chibi().makeToonMat(0xfacc15, { emissive: 0xd97706, emissiveIntensity: 0.25 });

    [-4.2, 4.2].forEach((px) => {
      const post = new THREE.Group();
      post.position.set(px, 0, 0);
      chibi().addOutlinedMesh(post, new THREE.BoxGeometry(0.92, 0.36, 0.92), matStone, { pos: [0, 0.18, 0] });
      chibi().addOutlinedMesh(post, new THREE.CylinderGeometry(0.26, 0.34, 1.95, 8), matWood, { pos: [0, 1.25, 0] });
      chibi().addOutlinedMesh(post, new THREE.ConeGeometry(0.64, 0.56, 6), matLeaf, { pos: [0, 2.45, 0] });
      chibi().addOutlinedMesh(post, new THREE.OctahedronGeometry(0.20, 0), matGold, { pos: [0, 2.86, 0] });
      group.add(post);
    });
    if (badgeText) {
      const sprite = createOverheadBannerSprite({
        text: badgeText,
        x: 0,
        y: 4.1,
        z: 0,
        w: 5.2,
        h: 1.15,
        accentColor: "#dcfce7",
        borderColor: "#4ade80",
        renderOrder: 999,
      });
      group.add(sprite);
      group.userData.bannerSprite = sprite;
    }
    return group;
  }

  function updateVillageGateTier(gate, tier) {
    return chibi().updateVillageGateTier(gate, tier);
  }

  function animateVillageGate(gate, underAttack, dt) {
    return chibi().animateVillageGate(gate, underAttack, dt);
  }

  function createCategoryBuilding(kind, x = 0, z = 0, badgeText = "", accentHex = "#ffd56b") {
    const bld = chibi().createCategoryBuilding(kind);
    bld.root.position.set(x, 0, z);
    if (badgeText) {
      const sprite = createOverheadBannerSprite({
        text: badgeText,
        x: 0,
        y: 4.35,
        z: 0,
        w: 5.0,
        h: 1.18,
        accentColor: accentHex,
        borderColor: accentHex,
        renderOrder: 999,
      });
      bld.root.add(sprite);
      bld.bannerSprite = sprite;
    }
    return bld;
  }

  function updateAlchemyLabTier(lab, tier) {
    return chibi().updateAlchemyLabTier(lab, tier);
  }

  function animateCategoryBuilding(building, dt) {
    return chibi().animateCategoryBuilding(building, dt);
  }

  // ---------------------------------------------------------------------------
  // Open Chibi Market Counter (ZERO overhead tent roofs -> Never occludes player!)
  // & High-Contrast Floor Apron Labels ("📦 광석 파는 곳" vs "💵 돈 받는 곳")
  // ---------------------------------------------------------------------------
  function createFloorApronBanner(w = 2.6, text = "", borderColor = "#ffffff", bgColor = "rgba(18, 26, 48, 0.92)") {
    if (!text) return null;
    let tex = null;
    if (typeof document !== "undefined") {
      const W = 512;
      const H = 160;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        roundRectPath(ctx, 10, 12, W - 20, H - 24, 28);
        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.lineWidth = 10;
        ctx.strokeStyle = borderColor;
        ctx.stroke();

        ctx.font = "900 54px Jua, Pretendard Variable, Apple SD Gothic Neo, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 8;
        ctx.strokeStyle = "rgba(10, 12, 24, 0.95)";
        ctx.strokeText(text, W * 0.5, H * 0.52);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, W * 0.5, H * 0.52);

        tex = new THREE.CanvasTexture(canvas);
        if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
        tex.needsUpdate = true;
      }
    }
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.92), mat);
    mesh.rotation.x = -Math.PI * 0.5;
    return mesh;
  }

  function createSalesStall(x = -16.5, z = 0.5, badgeText = "🏛️ 원석 교역소") {
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const visualRoot = new THREE.Group();
    root.add(visualRoot);

    // Low-profile Open Oak Market Counter (height <= 1.25m, ZERO overhanging canopy!)
    const matWood = chibi().makeToonMat(0x9b6234);
    const matCounterTop = chibi().makeToonMat(0xf5dfba);
    const matStripes = chibi().makeToonMat(0x38bdf8);
    const matGold = chibi().makeToonMat(0xfacc15);

    chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(2.95, 0.92, 1.75), matWood, {
      pos: [0, 0.46, 0],
      castShadow: true,
      receiveShadow: true,
      outlineScale: 1.035,
    });
    chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(3.15, 0.14, 1.92), matCounterTop, {
      pos: [0, 0.98, 0],
      castShadow: true,
      receiveShadow: true,
      outlineScale: 1.03,
    });
    chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(2.8, 0.24, 0.10), matStripes, {
      pos: [0, 0.72, 0.89],
      castShadow: false,
      outline: false,
    });
    // Low side sample barrel & glowing signpost totem on West back-corner (max y = 1.25m)
    chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(0.85, 0.22, 0.65), matGold, {
      pos: [-0.8, 1.15, -0.35],
      castShadow: false,
      outlineScale: 1.04,
    });

    if (badgeText) {
      const sprite = createOverheadBannerSprite({
        text: badgeText,
        x: 0,
        y: 3.85,
        z: 0,
        w: 4.5,
        h: 1.05,
        accentColor: "#e0f2fe",
        borderColor: "#38bdf8",
        renderOrder: 999,
      });
      root.add(sprite);
    }

    const stockAnchor = new THREE.Group();
    stockAnchor.position.set(0.35, 1.08, 0);
    root.add(stockAnchor);

    return { root, visualRoot, stockAnchor };
  }

  function createGemPedestal(x = -10.4, z = 0.4, badgeText = "💵 돈 받는 곳") {
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const visualRoot = new THREE.Group();
    root.add(visualRoot);

    // Wide sturdy 3x3 Cash Collection Platform Base (초록 지폐 수금대)
    const baseMat = chibi().makeToonMat(0x1f5e3b);
    const rimMat = chibi().makeToonMat(0x2ecc71, { emissive: 0x16a34a, emissiveIntensity: 0.38 });
    const goldMat = chibi().makeToonMat(0xf7cb4d);
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
    chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(2.38, 0.06, 0.16), goldMat, {
      pos: [0, 0.26, 1.04],
      castShadow: false,
      outline: false,
    });

    // Dedicated uncovered Front Floor-Apron Label ("💵 돈 받는 곳")
    const apron = createFloorApronBanner(2.9, badgeText, "#4ade80", "rgba(12, 62, 34, 0.94)");
    if (apron) {
      apron.position.set(0, 0.035, 1.62);
      root.add(apron);
    }

    // 3x3 Tall Cash Bundle Skyscraper Anchor
    const stackAnchor = new THREE.Group();
    stackAnchor.position.set(0, 0.27, 0);
    root.add(stackAnchor);

    return { root, visualRoot, stackAnchor };
  }

  function createShowcaseCounter({ x = -7.6, z = -11.4, kind = "jewel", accentColor = 0xc56bff } = {}) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const visualRoot = new THREE.Group();
    root.add(visualRoot);

    const baseColor = kind === "jewel" ? 0x5c367a : 0x2f685a;
    const topColor = kind === "jewel" ? 0xe7c6ff : 0xc7ffea;
    const matBase = chibi().makeToonMat(baseColor);
    const matTop = chibi().makeToonMat(topColor);
    const matAccent = chibi().makeToonMat(accentColor, { emissive: accentColor, emissiveIntensity: 0.25 });

    chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(2.55, 0.88, 1.85), matBase, {
      pos: [0, 0.44, 0],
      castShadow: true,
      receiveShadow: true,
      outlineScale: 1.035,
    });
    chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(2.68, 0.14, 1.98), matTop, {
      pos: [0, 0.95, 0],
      castShadow: true,
      receiveShadow: true,
      outlineScale: 1.03,
    });
    chibi().addOutlinedMesh(visualRoot, new THREE.BoxGeometry(2.36, 0.16, 0.12), matAccent, {
      pos: [0, 0.72, 0.94],
      castShadow: false,
      outline: false,
    });

    const stockAnchor = new THREE.Group();
    stockAnchor.position.set(0, 1.05, 0);
    root.add(stockAnchor);

    return { root, visualRoot, stockAnchor };
  }

  function createResourceNode(kind, x, z) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const visualRoot = new THREE.Group();
    root.add(visualRoot);

    const V10_NODES = {
      stardust: { ring: 0xd8b4fe, build: () => {
        chibi().addOutlinedMesh(visualRoot, new THREE.CylinderGeometry(0.64, 0.72, 0.14, 10), chibi().makeToonMat(0x2e1f47), { pos: [0, 0.1, 0] });
        const starMat1 = chibi().makeToonMat(0xd8b4fe, { emissive: 0xa855f7, emissiveIntensity: 0.55 });
        const starMat2 = chibi().makeToonMat(0xfef08a, { emissive: 0xfacc15, emissiveIntensity: 0.48 });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.42, 0), starMat1, { pos: [0, 0.72, 0], scale: [0.85, 1.45, 0.85] });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.24, 0), starMat2, { pos: [-0.32, 0.48, 0.2], rot: [0.2, 0.4, 0.3] });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.22, 0), starMat2, { pos: [0.3, 0.45, -0.18], rot: [-0.2, 0.1, -0.3] });
      }},
      fire_mana_stone: { ring: 0xff6b35, build: () => {
        chibi().addOutlinedMesh(visualRoot, new THREE.DodecahedronGeometry(0.62, 0), chibi().makeToonMat(0x3f2e3e), { pos: [0, 0.42, 0], scale: [1.15, 0.78, 1.1] });
        const flameMat = chibi().makeToonMat(0xff6b35, { emissive: 0xe63946, emissiveIntensity: 0.45 });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.45, 0), flameMat, { pos: [0, 0.92, 0], scale: [0.9, 1.5, 0.9] });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.28, 0), flameMat, { pos: [-0.34, 0.62, 0.2], rot: [-0.3, 0.2, 0.4], scale: [0.85, 1.3, 0.85] });
      }},
      spirit_dew: { ring: 0x22d3ee, build: () => {
        chibi().addOutlinedMesh(visualRoot, new THREE.CylinderGeometry(0.72, 0.78, 0.14, 12), chibi().makeToonMat(0x10b981), { pos: [0, 0.12, 0] });
        const dewMat = chibi().makeToonMat(0x67e8f9, { emissive: 0x06b6d4, emissiveIntensity: 0.42 });
        chibi().addOutlinedMesh(visualRoot, new THREE.SphereGeometry(0.36, 12, 12), dewMat, { pos: [0, 0.62, 0], scale: [1, 1.32, 1] });
        chibi().addOutlinedMesh(visualRoot, new THREE.SphereGeometry(0.22, 10, 10), dewMat, { pos: [0.32, 0.42, 0.22], scale: [1, 1.25, 1] });
      }},
      lightning_crystal: { ring: 0xfacc15, build: () => {
        chibi().addOutlinedMesh(visualRoot, new THREE.DodecahedronGeometry(0.58, 0), chibi().makeToonMat(0x334155), { pos: [0, 0.36, 0], scale: [1.15, 0.72, 1.1] });
        const zapMat = chibi().makeToonMat(0xfef08a, { emissive: 0xfacc15, emissiveIntensity: 0.55 });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.42, 0), zapMat, { pos: [0, 0.95, 0], rot: [0.2, 0.4, -0.2], scale: [0.65, 1.65, 0.65] });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.28, 0), zapMat, { pos: [0.34, 0.68, -0.18], rot: [-0.25, 0.1, -0.35], scale: [0.65, 1.4, 0.65] });
      }},
      moon_mushroom: { ring: 0xa855f7, build: () => {
        const stemM = chibi().makeToonMat(0xfef3c7);
        const capM = chibi().makeToonMat(0x8b5cf6, { emissive: 0x6d28d9, emissiveIntensity: 0.42 });
        for (const [mx, mz, sc] of [[0, 0, 1.0], [-0.36, 0.26, 0.68], [0.34, -0.18, 0.72]]) {
          chibi().addOutlinedMesh(visualRoot, new THREE.CylinderGeometry(0.14 * sc, 0.18 * sc, 0.55 * sc, 8), stemM, { pos: [mx, 0.28 * sc, mz] });
          chibi().addOutlinedMesh(visualRoot, new THREE.SphereGeometry(0.42 * sc, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), capM, { pos: [mx, 0.52 * sc, mz] });
        }
      }},
      star_meteorite: { ring: 0xfbbf24, build: () => {
        chibi().addOutlinedMesh(visualRoot, new THREE.IcosahedronGeometry(0.62, 0), chibi().makeToonMat(0x312e81), { pos: [0, 0.52, 0] });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.36, 0), chibi().makeToonMat(0xfbbf24, { emissive: 0xf59e0b, emissiveIntensity: 0.55 }), { pos: [0.16, 0.98, 0.12] });
      }},
      dragon_scale_flower: { ring: 0xf43f5e, build: () => {
        chibi().addOutlinedMesh(visualRoot, new THREE.DodecahedronGeometry(0.55, 0), chibi().makeToonMat(0x15803d), { pos: [0, 0.34, 0], scale: [1.15, 0.68, 1.15] });
        const roseMat = chibi().makeToonMat(0xf43f5e, { emissive: 0xe11d48, emissiveIntensity: 0.45 });
        chibi().addOutlinedMesh(visualRoot, new THREE.ConeGeometry(0.44, 0.62, 6), roseMat, { pos: [0, 0.74, 0], rot: [Math.PI, 0, 0] });
        chibi().addOutlinedMesh(visualRoot, new THREE.SphereGeometry(0.2, 10, 10), chibi().makeToonMat(0xfde047), { pos: [0, 0.95, 0] });
      }},
    };

    const customNode = V10_NODES[kind];
    const isOre = kind === "ore" || kind === "blue_ore" || kind === "crystal";
    const role = isOre ? "rock_crystal" : "berry_bush";
    const L = loader();

    let built = false;
    if (customNode) {
      customNode.build();
      built = true;
    } else if (L && L.hasRole && L.hasRole(role)) {
      const inst = L.createInstance(role, {
        targetHeight: isOre ? 1.55 : 1.42,
        tint: isOre ? 0x3b9eff : 0x52eb7d,
        tintStrength: isOre ? 0.32 : 0.24,
        emissiveTint: isOre ? 0x1470ff : 0x26c45a,
        emissiveIntensity: isOre ? 0.26 : 0.14,
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
      if (isOre) {
        const rockMat = chibi().makeToonMat(0x525a75);
        const mat = chibi().makeToonMat(0x3a9cff, { emissive: 0x1668d9, emissiveIntensity: 0.35 });
        chibi().addOutlinedMesh(visualRoot, new THREE.DodecahedronGeometry(0.62, 0), rockMat, {
          pos: [0, 0.42, 0],
          scale: [1.15, 0.78, 1.1],
        });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.46, 0), mat, {
          pos: [0, 0.86, 0],
          scale: [0.95, 1.45, 0.95],
        });
        chibi().addOutlinedMesh(visualRoot, new THREE.OctahedronGeometry(0.30, 0), mat, {
          pos: [0.36, 0.54, 0.22],
          rot: [0.3, 0.4, -0.35],
          scale: [0.9, 1.35, 0.9],
        });
      } else {
        // 무지개 약초 (Vibrant emerald stem patch + glowing rainbow blossoms)
        const bushMat = chibi().makeToonMat(0x3bc254);
        const herbPalette = [0xff62b8, 0xffd245, 0x58e0ff, 0xb875ff];
        chibi().addOutlinedMesh(visualRoot, new THREE.DodecahedronGeometry(0.58, 1), bushMat, {
          pos: [0, 0.48, 0],
          scale: [1.12, 0.84, 1.12],
        });
        [[-0.32, 0.78, 0.30], [0.34, 0.76, 0.26], [0, 0.98, 0.08], [-0.18, 0.62, -0.32]].forEach(([bx, by, bz], idx) => {
          const c = herbPalette[idx % herbPalette.length];
          chibi().addOutlinedMesh(
            visualRoot,
            new THREE.DodecahedronGeometry(0.17, 0),
            chibi().makeToonMat(c, { emissive: c, emissiveIntensity: 0.28 }),
            { pos: [bx, by, bz] }
          );
        });
      }
    }

    // Subtle ground highlight ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: customNode ? customNode.ring : (isOre ? 0x3b9eff : 0x52eb7d),
      transparent: true,
      opacity: 0.34,
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

    // White-bordered floor mat (uncovered label is drawn separately on front floor apron)
    const matTex = makePalletMatTexture(256, 256, accentHex, "");
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

    let bannerSprite = null;
    if (badgeText) {
      if (opts.overheadY != null) {
        bannerSprite = createOverheadBannerSprite({
          text: badgeText,
          subtitle: opts.overheadSub || "",
          x: 0,
          y: opts.overheadY,
          z: 0,
          w: opts.overheadW || 4.8,
          h: opts.overheadH || 1.12,
          accentColor: accentHex,
          borderColor: accentHex,
          renderOrder: 999,
        });
        root.add(bannerSprite);
      } else {
        const apron = createFloorApronBanner(w * 1.15, badgeText, accentHex, "rgba(18, 28, 52, 0.94)");
        if (apron) {
          apron.position.set(0, 0.035, d * 0.5 + 0.52);
          root.add(apron);
        }
      }
    }

    return { root, matMesh, floorMat, palletGroup, stackAnchor, bannerSprite, w, d };
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

    // 5. Integrated Card Typography, Direction Chip & Icon on the Floor Mat
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Optional Directional Selection Badge (◀ 서쪽 / ▶ 동쪽 / ▲ 북쪽 / ▼ 남쪽) at top-left
    if (opts.dirLabel) {
      const dirW = 132;
      const dirH = 40;
      const dirX = x0 + 20;
      const dirY = y0 + 24;
      roundRectPath(ctx, dirX, dirY, dirW, dirH, 16);
      ctx.fillStyle = "rgba(18, 28, 56, 0.92)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = accentHex;
      ctx.stroke();
      ctx.font = "900 22px Pretendard, system-ui, sans-serif";
      ctx.fillStyle = "#ffe57f";
      ctx.fillText(opts.dirLabel, dirX + dirW * 0.5, dirY + dirH * 0.5 + 1);
    }

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
    ctx.fillText(icon, W * 0.5, H * 0.31);

    // Bold readable title with dark drop outline
    ctx.font = "900 38px Pretendard, Apple SD Gothic Neo, system-ui, sans-serif";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(10, 14, 28, 0.92)";
    ctx.strokeText(title, W * 0.5, H * 0.57);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, W * 0.5, H * 0.57);

    // Bold Price Pill at bottom half (adapts cleanly for hybrid prices like "💵160 + 🔮30")
    if (price) {
      const longPrice = String(price).length > 9;
      const pillW = Math.min(cw - 44, longPrice ? 396 : 336);
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

      ctx.font = longPrice
        ? "900 28px Pretendard, system-ui, sans-serif"
        : "900 38px Pretendard, system-ui, sans-serif";
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
      opts.dirLabel || "",
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

  function createHotAirBalloon() {
    return chibi().createHotAirBalloon ? chibi().createHotAirBalloon() : { root: new THREE.Group() };
  }
  function animateHotAirBalloon(b, dt, moving) {
    return chibi().animateHotAirBalloon ? chibi().animateHotAirBalloon(b, dt, moving) : undefined;
  }
  function createArmoredTrain() {
    return chibi().createArmoredTrain ? chibi().createArmoredTrain() : { root: new THREE.Group() };
  }
  function animateArmoredTrain(tr, speed, dt) {
    return chibi().animateArmoredTrain ? chibi().animateArmoredTrain(tr, speed, dt) : undefined;
  }
  function createSmallStorage(opts = {}) {
    const x = opts.x || 0;
    const z = opts.z || 0;
    const accentHex = opts.accent || "#e6c27a";
    const title = opts.title || "창고";
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    // Exact 1-tile (2.0m x 2.0m) luxury brass-trimmed obsidian storage
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.16, 2.0),
      new THREE.MeshLambertMaterial({ color: 0x1e2540 })
    );
    base.position.y = 0.08;
    base.receiveShadow = true;
    root.add(base);

    const rimColor = new THREE.Color(accentHex);
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(2.08, 0.08, 2.08),
      new THREE.MeshLambertMaterial({ color: rimColor })
    );
    rim.position.y = 0.04;
    root.add(rim);

    const stackAnchor = new THREE.Group();
    stackAnchor.position.set(0, 0.18, 0);
    root.add(stackAnchor);

    const bannerSprite = createOverheadBannerSprite({
      text: `${title} · 0`,
      accentColor: accentHex,
      borderColor: accentHex,
      scaleX: 2.8,
      scaleY: 0.72,
    });
    bannerSprite.position.set(0, 2.15, 0);
    root.add(bannerSprite);

    return { root, stackAnchor, bannerSprite, x, z, accent: accentHex, title };
  }

  function createEnergyTile(opts = {}) {
    const x = opts.x || 0;
    const z = opts.z || 0;
    const accentHex = opts.accent || "#c084fc";
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.14, 2.1),
      new THREE.MeshLambertMaterial({ color: 0x1d1b3a })
    );
    tile.position.y = 0.07;
    tile.receiveShadow = true;
    root.add(tile);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.92, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(accentHex), side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.15;
    root.add(ring);

    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(accentHex), emissive: new THREE.Color(accentHex), emissiveIntensity: 0.65 })
    );
    orb.position.y = 0.78;
    root.add(orb);

    const topSprite = createOverheadBannerSprite({
      text: "대기 중",
      accentColor: accentHex,
      borderColor: accentHex,
      scaleX: 2.9,
      scaleY: 0.72,
    });
    topSprite.position.set(0, 2.35, 0);
    root.add(topSprite);

    const bottomSprite = createOverheadBannerSprite({
      text: "보관: 0",
      accentColor: "#f7dca1",
      borderColor: accentHex,
      scaleX: 2.4,
      scaleY: 0.62,
    });
    bottomSprite.position.set(0, 0.45, 1.35);
    root.add(bottomSprite);

    return { root, orb, ring, topSprite, bottomSprite, x, z, accent: accentHex };
  }

  function createGoldenAirship() {
    return chibi().createGoldenAirship ? chibi().createGoldenAirship() : { root: new THREE.Group() };
  }
  function animateGoldenAirship(ship, dt) {
    return chibi().animateGoldenAirship ? chibi().animateGoldenAirship(ship, dt) : undefined;
  }

  window.Entities = {
    createOverheadBannerSprite,
    updateOverheadBannerSprite,
    createZoneHeaderBanner,
    createDistrictPlatform,
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
    createRoyalTradeWagon,
    animateRoyalTradeWagon,
    createHotAirBalloon,
    animateHotAirBalloon,
    createArmoredTrain,
    animateArmoredTrain,
    createGoldenAirship,
    animateGoldenAirship,
    createCuteMonster,
    animateCuteMonster,
    createDefenseTurret,
    animateDefenseTurret,
    createVillageGate,
    createSouthResourceGate,
    updateVillageGateTier,
    animateVillageGate,
    createCategoryBuilding,
    updateAlchemyLabTier,
    animateCategoryBuilding,
    createSalesStall,
    createShowcaseCounter,
    createGemPedestal,
    createResourceNode,
    createSmallStorage,
    createEnergyTile,
    createWoodenPalletZone,
    updateWoodenPalletZone,
    createStepPad,
    updateStepPadTexture,
  };
})();
