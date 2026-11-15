// =============================================================================
// src/engine.js - 3D Scene, Perspective Zoomed-Out Tycoon Camera (FOV 35,
// Offset (0, 25, 21)), Lighting, 48x40m Rounded Compound Floor (5 Zones),
// Closed Perimeter Fences with Single East Gate, and Outer Resource Valley
// =============================================================================

(function () {
  "use strict";

  const CAM_FOV = 35;
  const CAM_OFFSET = new THREE.Vector3(0, 25, 21);
  const CAM_LOOK_AHEAD = 1.5;
  const SHADOW_FRUSTUM_HALF = 42;

  // Expanded 48m x 40m Rounded Rectangular Workshop Compound (5 Grouped Zones)
  const TOWN_BOUNDS = {
    minX: -24,
    maxX: 24,
    minZ: -20,
    maxZ: 20,
    cornerRadius: 3.0,
  };

  let renderer = null;
  let scene = null;
  let camera = null;
  let dirLight = null;
  let containerEl = null;

  let worldGroup = null;
  let envGroup = null;
  let stationGroup = null;
  let nodeGroup = null;
  let itemGroup = null;
  let unitGroup = null;
  let vfxGroup = null;

  const camTarget = new THREE.Vector3(0, 0.8, 0);
  const camDesiredPos = new THREE.Vector3(0, 25, 21);
  const lookAheadVec = new THREE.Vector3(0, 0, 0);
  let shakeIntensity = 0;

  let _shadowTex = null;
  let _glowTex = null;
  let _sceneryPopulated = false;

  // ---------------------------------------------------------------------------
  // Procedural Canvas Textures (guarded for headless Node verification)
  // ---------------------------------------------------------------------------
  function makeRadialCanvasTexture(innerRgba, midRgba, outerRgba, size = 128) {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const cx = size * 0.5;
    const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grad.addColorStop(0, innerRgba);
    grad.addColorStop(0.45, midRgba);
    grad.addColorStop(1, outerRgba);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function getShadowTexture() {
    if (!_shadowTex) {
      _shadowTex = makeRadialCanvasTexture(
        "rgba(20, 12, 34, 0.48)",
        "rgba(20, 12, 34, 0.20)",
        "rgba(20, 12, 34, 0)",
        128
      );
    }
    return _shadowTex;
  }

  function getGlowTexture() {
    if (!_glowTex) {
      _glowTex = makeRadialCanvasTexture(
        "rgba(255, 255, 255, 0.95)",
        "rgba(120, 240, 255, 0.45)",
        "rgba(120, 240, 255, 0)",
        128
      );
    }
    return _glowTex;
  }

  function makeMeadowTexture() {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#5fb854";
    ctx.fillRect(0, 0, 512, 512);

    // Subtle lush stylized grass blades and sunlit patches
    const patches = [
      { x: 90, y: 110, r: 95, c: "rgba(122, 212, 92, 0.42)" },
      { x: 350, y: 240, r: 120, c: "rgba(122, 212, 92, 0.36)" },
      { x: 180, y: 410, r: 105, c: "rgba(74, 158, 68, 0.38)" },
      { x: 430, y: 75, r: 80, c: "rgba(155, 224, 108, 0.35)" },
    ];
    for (const p of patches) {
      const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
      g.addColorStop(0, p.c);
      g.addColorStop(1, "rgba(95, 184, 84, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
    }

    ctx.fillStyle = "#489643";
    for (let i = 0; i < 420; i++) {
      const x = ((i * 197) % 512);
      const y = ((i * 313) % 512);
      ctx.fillRect(x, y, 3, 6);
    }
    // Tiny meadow wildflower accents
    const flowerColors = ["#fff696", "#ffb0d2", "#a8f0ff"];
    for (let i = 0; i < 48; i++) {
      const x = ((i * 251 + 41) % 496) + 8;
      const y = ((i * 179 + 73) % 496) + 8;
      ctx.fillStyle = flowerColors[i % flowerColors.length];
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 14);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  function makeCompoundFloorTexture() {
    if (typeof document === "undefined") return null;
    const W = 1200;
    const H = 1000;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Warm oak timber deck across main 48m x 40m village compound
    ctx.fillStyle = "#d4a66a";
    ctx.fillRect(0, 0, W, H);

    const plankH = 26;
    for (let y = 0; y < H; y += plankH) {
      const row = Math.floor(y / plankH);
      ctx.fillStyle = row % 2 === 0 ? "#d9ae74" : "#cea064";
      ctx.fillRect(0, y, W, plankH - 2);
      ctx.fillStyle = "rgba(110, 68, 30, 0.24)";
      ctx.fillRect(0, y + plankH - 2, W, 2);
      for (let x = (row % 3) * 44; x < W; x += 132) {
        ctx.fillRect(x, y, 2, plankH);
      }
    }

    // Helper: convert world (x in [-24,24], z in [-20,20]) to canvas pixels
    const wx = (x) => ((x + 24) / 48) * W;
    const wz = (z) => ((z + 20) / 40) * H;
    function fillWorldZone(x0, z0, x1, z1, fill, border, radius = 18) {
      const px = wx(x0);
      const py = wz(z0);
      const pw = wx(x1) - px;
      const ph = wz(z1) - py;
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(px, py, pw, ph, radius);
      } else {
        ctx.rect(px, py, pw, ph);
      }
      ctx.fillStyle = fill;
      ctx.fill();
      if (border) {
        ctx.lineWidth = 6;
        ctx.strokeStyle = border;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Main Cross Boulevards connecting the 5 functional zones, South Resource Gate & East Siege Gate
    fillWorldZone(-22.5, -2.5, 24.0, 2.5, "#dfc99d", "#a68552", 12);
    fillWorldZone(-3.0, -18.5, 3.0, 20.0, "#dfc99d", "#a68552", 12);

    // 1. North Production Line District (cool stone factory floor along z in [-19.0, -7.8])
    fillWorldZone(-22.5, -19.0, 19.5, -7.8, "#bfc6d9", "#7b84a3", 22);
    ctx.strokeStyle = "rgba(85, 94, 128, 0.24)";
    ctx.lineWidth = 2;
    for (let gx = -21; gx <= 19; gx += 2) {
      ctx.beginPath();
      ctx.moveTo(wx(gx), wz(-18.8));
      ctx.lineTo(wx(gx), wz(-8.0));
      ctx.stroke();
    }
    for (let gz = -18; gz <= -8; gz += 2) {
      ctx.beginPath();
      ctx.moveTo(wx(-22.2), wz(gz));
      ctx.lineTo(wx(19.2), wz(gz));
      ctx.stroke();
    }

    // 2. West Market Trade Plaza (x in [-22.5, -10.5], z in [-7.0, 8.2])
    fillWorldZone(-22.5, -7.0, -10.5, 8.2, "#e8dec8", "#b29c78", 22);
    for (let x = -22.0; x < -11.0; x += 1.6) {
      for (let z = -6.4; z < 7.6; z += 1.6) {
        const checker = ((Math.floor(x * 2) + Math.floor(z * 2)) & 1) === 0;
        if (checker) {
          ctx.fillStyle = "rgba(198, 172, 132, 0.28)";
          ctx.fillRect(wx(x), wz(z), (1.6 / 48) * W, (1.6 / 40) * H);
        }
      }
    }

    // 3. South-West Equipment Forge District (x in [-20.0, -5.2], z in [8.8, 18.8])
    fillWorldZone(-20.0, 8.8, -5.2, 18.8, "#e3bfa1", "#9e663c", 20);

    // 4. South-East Automation & Harvest Guild District (x in [4.8, 18.2], z in [7.2, 18.8])
    fillWorldZone(4.8, 7.2, 18.2, 18.8, "#cbe6c8", "#589962", 20);

    // 5. East Defense R&D Lab & Gate Bastion District (x in [7.2, 23.6], z in [-6.8, 6.8])
    fillWorldZone(7.2, -6.8, 23.6, 6.8, "#c7cde8", "#656ea8", 22);

    // Central Spawn Plaza Medallion around (0, 0)
    ctx.save();
    ctx.translate(wx(0), wz(0));
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 246, 216, 0.56)";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(166, 114, 58, 0.65)";
    ctx.stroke();
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  function makeFarmSoilTexture() {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#8a6842";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      ctx.fillStyle = (y / 32) % 2 === 0 ? "#7d5b37" : "#96724b";
      ctx.fillRect(0, y, 256, 26);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  // ---------------------------------------------------------------------------
  // Build Environment Floor & Distinct Farm Grounds
  // ---------------------------------------------------------------------------
  function buildEnvironmentFloor() {
    // 1. Wide sunlit outer fairy meadow
    const meadowMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: makeMeadowTexture(),
    });
    if (!meadowMat.map) meadowMat.color.setHex(0x68be5b);

    const meadow = new THREE.Mesh(new THREE.PlaneGeometry(230, 230), meadowMat);
    meadow.rotation.x = -Math.PI * 0.5;
    meadow.position.y = -0.06;
    meadow.receiveShadow = true;
    envGroup.add(meadow);

    // 2. Dense Outer Eastern Resource Valley (strictly outside single East Gate x = 24.0)
    const farmMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: makeFarmSoilTexture(),
    });
    if (!farmMat.map) farmMat.color.setHex(0x88643f);

    const farmBorderMat = new THREE.MeshLambertMaterial({ color: 0x9b7042 });
    function addFarmPlot(cx, cz, w, d, soilColor = null, borderColor = null) {
      const bMat = borderColor ? new THREE.MeshLambertMaterial({ color: borderColor }) : farmBorderMat;
      const border = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.08, d + 0.9), bMat);
      border.position.set(cx, -0.03, cz);
      border.receiveShadow = true;
      envGroup.add(border);

      const sMat = soilColor ? new THREE.MeshLambertMaterial({ color: soilColor }) : farmMat;
      const soil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), sMat);
      soil.rotation.x = -Math.PI * 0.5;
      soil.position.set(cx, 0.015, cz);
      soil.receiveShadow = true;
      envGroup.add(soil);
    }

    // Dedicated Southern Resource Valley (z in [22.6, 37.4], strictly separated from East Monster Gate)
    // Zone 1: South-West Ore Mine Quarry
    addFarmPlot(-10.0, 26.4, 13.6, 7.6, 0x627394, 0x434d68);
    // Zone 2: South-East Rainbow Herb Grove
    addFarmPlot(10.0, 26.4, 13.6, 7.6, 0x63ad60, 0x3e7844);
    // Zone 3: Deep Ore Annex (outer SW)
    addFarmPlot(-10.0, 33.8, 13.6, 7.2, 0x5c6d8e, 0x3f4962);
    // Zone 4: Deep Rainbow Herb Annex (outer SE)
    addFarmPlot(10.0, 33.8, 13.6, 7.2, 0x4e9c50, 0x356b38);

    // Dual Entrances:
    // 1) South Resource Gathering Road leading out of South Gate (x = 0, z = 20.0) into Southern Resource Valley
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xd9be8c });
    const stoneRoadMat = new THREE.MeshLambertMaterial({ color: 0xb0b8ce });
    const southPath = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.04, 17.5), pathMat);
    southPath.position.set(0, 0.005, 28.75);
    southPath.receiveShadow = true;
    envGroup.add(southPath);

    // 2) Single East Monster Invasion Road & Defense Battlefield leading strictly to East Gate (x = 24.0, z = 0.0)
    const battlefieldMat = new THREE.MeshLambertMaterial({ color: 0x737b96 });
    const eastPath = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.04, 11.4), battlefieldMat);
    eastPath.position.set(33.5, 0.005, 0);
    eastPath.receiveShadow = true;
    envGroup.add(eastPath);

    const stoneRoad = new THREE.Mesh(new THREE.BoxGeometry(19.0, 0.045, 3.8), stoneRoadMat);
    stoneRoad.position.set(34.0, 0.010, 0);
    stoneRoad.receiveShadow = true;
    envGroup.add(stoneRoad);

    // 3. Raised 48m x 40m Rounded Rectangular Village Compound Deck
    const compTex = makeCompoundFloorTexture();
    const deckMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: compTex,
    });
    if (!deckMat.map) deckMat.color.setHex(0xd4a66a);

    if (typeof THREE.Shape === "function" && typeof THREE.ExtrudeGeometry === "function") {
      const w = TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX; // 38
      const d = TOWN_BOUNDS.maxZ - TOWN_BOUNDS.minZ; // 34
      const r = TOWN_BOUNDS.cornerRadius;
      const hw = w * 0.5;
      const hd = d * 0.5;

      const shape = new THREE.Shape();
      shape.moveTo(-hw + r, -hd);
      shape.lineTo(hw - r, -hd);
      shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
      shape.lineTo(hw, hd - r);
      shape.quadraticCurveTo(hw, hd, hw - r, hd);
      shape.lineTo(-hw + r, hd);
      shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
      shape.lineTo(-hw, -hd + r);
      shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

      // Stone trim curb underneath wooden deck
      const curbGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
      curbGeo.rotateX(Math.PI * 0.5);
      const curb = new THREE.Mesh(curbGeo, new THREE.MeshLambertMaterial({ color: 0x7e879c }));
      curb.position.y = 0.01;
      curb.scale.set(1.015, 1, 1.015);
      curb.receiveShadow = true;
      envGroup.add(curb);

      // Textured top compound surface mapped cleanly to [0..1] UVs
      const topGeo = new THREE.ShapeGeometry(shape, 10);
      const posAttr = topGeo.attributes.position;
      if (posAttr && topGeo.attributes.uv) {
        const uvArr = topGeo.attributes.uv;
        for (let i = 0; i < posAttr.count; i++) {
          const px = posAttr.getX(i);
          const py = posAttr.getY(i);
          uvArr.setXY(i, (px + hw) / w, (py + hd) / d);
        }
        uvArr.needsUpdate = true;
      }
      topGeo.rotateX(-Math.PI * 0.5);
      const topMesh = new THREE.Mesh(topGeo, deckMat);
      topMesh.position.y = 0.018;
      topMesh.receiveShadow = true;
      envGroup.add(topMesh);
    } else {
      const box = new THREE.Mesh(new THREE.BoxGeometry(48, 0.12, 40), deckMat);
      box.position.y = -0.04;
      box.receiveShadow = true;
      envGroup.add(box);
    }
  }

  // ---------------------------------------------------------------------------
  // Perimeter GLB Fences (Leaving East, NE, and NW Wide Gates) + Forest Trees
  // ---------------------------------------------------------------------------
  function makeGatePillar(x, z, color = 0x52d6ff) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a5832 });
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.3, 0.55), woodMat);
    post.position.y = 1.15;
    post.castShadow = true;
    g.add(post);

    const gemMat = new THREE.MeshBasicMaterial({ color });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), gemMat);
    gem.position.y = 2.55;
    g.add(gem);
    return g;
  }

  function populateGlbScenery() {
    if (_sceneryPopulated || !envGroup) return;
    _sceneryPopulated = true;

    const Loader = window.AssetLoader;
    const hasFence = Loader && Loader.hasRole && Loader.hasRole("fence");
    const hasTree = Loader && Loader.hasRole && Loader.hasRole("tree");

    function placeFence(x, z, rotY) {
      if (hasFence) {
        const inst = Loader.createInstance("fence", { targetHeight: 1.55, castShadow: true, receiveShadow: true });
        if (inst && inst.root) {
          inst.root.position.set(x, 0, z);
          inst.root.rotation.y = rotY;
          envGroup.add(inst.root);
          return;
        }
      }
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 1.1, 0.25),
        new THREE.MeshLambertMaterial({ color: 0x9b6b43 })
      );
      fallback.position.set(x, 0.55, z);
      fallback.rotation.y = rotY;
      fallback.castShadow = true;
      envGroup.add(fallback);
    }

    // Perimeter fence segments around x in [-24, 24], z in [-20, 20]
    // South border (z = +20, leave ONLY South Resource Gathering Gate at x in [-4.2, +4.2])
    for (let x = -21.5; x <= 21.5; x += 3.0) {
      if (Math.abs(x) < 4.5) continue;
      placeFence(x, 20.0, 0);
    }
    // West border (x = -24, completely closed)
    for (let z = -17.5; z <= 17.5; z += 3.0) {
      placeFence(-24.0, z, Math.PI * 0.5);
    }
    // North border (z = -20, completely closed)
    for (let x = -21.5; x <= 21.5; x += 3.0) {
      placeFence(x, -20.0, 0);
    }
    // East border (x = +24, leave ONLY Single Central East Monster Gate at z in [-4.2, +4.2])
    for (let z = -17.5; z <= 17.5; z += 3.0) {
      if (Math.abs(z) < 4.5) continue;
      placeFence(24.0, z, Math.PI * 0.5);
    }

    // Illuminated Gate Pillars flanking BOTH separated entrances:
    // South Resource Gate (x = +-4.4, z = 20.0) & East Monster Defense Gate (x = 24.0, z = +-4.4)
    envGroup.add(makeGatePillar(-4.4, 20.0, 0x52ff9b));
    envGroup.add(makeGatePillar(4.4, 20.0, 0x52efff));
    envGroup.add(makeGatePillar(24.0, -4.4, 0xff9b52));
    envGroup.add(makeGatePillar(24.0, 4.4, 0xff6b8b));

    // Outer Forest Trees: strictly OUTSIDE 48x40 village AND clear of Southern Resource Valley (x in [-18,18], z in [20,39]) & East Battlefield (x in [24,42], z in [-7,7])
    const treeSpots = [
      [-28.5, -24], [-30.0, -16], [-29.0, -8], [-29.5, 0], [-28.8, 8], [-29.5, 16], [-27.5, 22],
      [-21.0, -25.5], [-12.0, -26.0], [-3.0, -25.5], [6.0, -26.0], [15.0, -25.5], [23.5, -25.0],
      [29.5, -18.0], [36.0, -14.0], [43.5, -16.0], [44.5, -9.0], [44.5, 9.0], [43.5, 16.0], [36.0, 14.0], [29.5, 18.0],
      [-23.5, 26.5], [-23.5, 34.0], [23.5, 26.5], [23.5, 34.0],
      [-15.0, 41.5], [-5.0, 42.0], [5.0, 42.0], [15.0, 41.5],
    ];
    for (let i = 0; i < treeSpots.length; i++) {
      const [tx, tz] = treeSpots[i];
      const h = 4.2 + (i % 4) * 0.7;
      if (hasTree) {
        const inst = Loader.createInstance("tree", { targetHeight: h, castShadow: true, receiveShadow: true });
        if (inst && inst.root) {
          inst.root.position.set(tx, 0, tz);
          inst.root.rotation.y = (i * 1.37) % (Math.PI * 2);
          envGroup.add(inst.root);
          continue;
        }
      }
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.38, h * 0.42, 8),
        new THREE.MeshLambertMaterial({ color: 0x7b4c28 })
      );
      trunk.position.y = h * 0.21;
      trunk.castShadow = true;
      tree.add(trunk);
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(1.45, h * 0.68, 8),
        new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0x3b9e4b : 0x4fb552 })
      );
      crown.position.y = h * 0.66;
      crown.castShadow = true;
      tree.add(crown);
      envGroup.add(tree);
    }
  }

  // ---------------------------------------------------------------------------
  // Public Lifecycle: init / update / resize / render / shake / worldToScreen
  // ---------------------------------------------------------------------------
  function init(container) {
    containerEl = container;
    const width = container ? container.clientWidth || 1280 : 1280;
    const height = container ? container.clientHeight || 720 : 720;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88c982);
    if (typeof THREE.FogExp2 === "function") {
      scene.fog = new THREE.FogExp2(0x9bd6a4, 0.0042);
    }

    camera = new THREE.PerspectiveCamera(CAM_FOV, width / Math.max(1, height), 0.8, 220);
    camera.position.copy(CAM_OFFSET);
    camera.lookAt(0, 0.8, 0);

    if (typeof THREE.WebGLRenderer === "function" && container) {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = true;
        if (THREE.PCFSoftShadowMap !== undefined) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      if (THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
      }
      renderer.toneMappingExposure = 0.85;
      if (THREE.SRGBColorSpace !== undefined && renderer.outputColorSpace !== undefined) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if (THREE.sRGBEncoding !== undefined) {
        renderer.outputEncoding = THREE.sRGBEncoding;
      }
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      // Gentle low-intensity IBL only if RoomEnvironment is available
      if (THREE.RoomEnvironment && THREE.PMREMGenerator) {
        try {
          const pmrem = new THREE.PMREMGenerator(renderer);
          scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
          pmrem.dispose();
        } catch (e) {
          // Safe ignore
        }
      }
    }

    // Balanced pastel sunlight + crisp real-time soft shadows (no wash-out)
    const hemi = new THREE.HemisphereLight(0xf6f9ff, 0x5c8c44, 0.48);
    scene.add(hemi);

    dirLight = new THREE.DirectionalLight(0xfff1da, 0.88);
    dirLight.position.set(-16, 38, 20);
    dirLight.castShadow = true;
    if (dirLight.shadow) {
      dirLight.shadow.mapSize.set(2048, 2048);
      dirLight.shadow.camera.left = -SHADOW_FRUSTUM_HALF;
      dirLight.shadow.camera.right = SHADOW_FRUSTUM_HALF;
      dirLight.shadow.camera.top = SHADOW_FRUSTUM_HALF;
      dirLight.shadow.camera.bottom = -SHADOW_FRUSTUM_HALF;
      dirLight.shadow.camera.near = 4;
      dirLight.shadow.camera.far = 110;
      dirLight.shadow.bias = -0.0004;
    }
    scene.add(dirLight);
    if (dirLight.target) scene.add(dirLight.target);

    worldGroup = new THREE.Group();
    envGroup = new THREE.Group();
    stationGroup = new THREE.Group();
    nodeGroup = new THREE.Group();
    itemGroup = new THREE.Group();
    unitGroup = new THREE.Group();
    vfxGroup = new THREE.Group();

    worldGroup.add(envGroup);
    worldGroup.add(stationGroup);
    worldGroup.add(nodeGroup);
    worldGroup.add(itemGroup);
    worldGroup.add(unitGroup);
    worldGroup.add(vfxGroup);
    scene.add(worldGroup);

    buildEnvironmentFloor();
  }

  function resize() {
    if (!containerEl || !camera) return;
    const w = containerEl.clientWidth || window.innerWidth || 1280;
    const h = containerEl.clientHeight || window.innerHeight || 720;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    if (renderer) renderer.setSize(w, h);
  }

  function addShake(amount) {
    shakeIntensity = Math.min(0.65, shakeIntensity + amount);
  }

  function update(targetPos, targetVel, dt) {
    if (!camera) return;
    const step = Math.min(0.05, dt || 0.016);

    // 1.5m directional velocity look-ahead
    let desiredAheadX = 0;
    let desiredAheadZ = 0;
    if (targetVel) {
      const speed = Math.hypot(targetVel.x || 0, targetVel.z || 0);
      if (speed > 0.25) {
        const factor = Math.min(1, speed / 7.0) * CAM_LOOK_AHEAD;
        desiredAheadX = ((targetVel.x || 0) / speed) * factor;
        desiredAheadZ = ((targetVel.z || 0) / speed) * factor;
      }
    }
    const laLerp = 1 - Math.exp(-5.0 * step);
    lookAheadVec.x += (desiredAheadX - lookAheadVec.x) * laLerp;
    lookAheadVec.z += (desiredAheadZ - lookAheadVec.z) * laLerp;

    const tx = (targetPos ? targetPos.x : 0) + lookAheadVec.x;
    const tz = (targetPos ? targetPos.z : 0) + lookAheadVec.z;

    const camLerp = 1 - Math.exp(-6.5 * step);
    camTarget.x += (tx - camTarget.x) * camLerp;
    camTarget.z += (tz - camTarget.z) * camLerp;
    camTarget.y = 0.85;

    camDesiredPos.set(
      camTarget.x + CAM_OFFSET.x,
      camTarget.y + CAM_OFFSET.y,
      camTarget.z + CAM_OFFSET.z
    );

    if (shakeIntensity > 0.001) {
      camDesiredPos.x += (Math.random() - 0.5) * shakeIntensity;
      camDesiredPos.y += (Math.random() - 0.5) * shakeIntensity * 0.6;
      shakeIntensity *= Math.exp(-12 * step);
    } else {
      shakeIntensity = 0;
    }

    camera.position.copy(camDesiredPos);
    camera.lookAt(camTarget);

    if (dirLight) {
      dirLight.position.set(camTarget.x - 16, 38, camTarget.z + 20);
      if (dirLight.target) dirLight.target.position.set(camTarget.x, 0, camTarget.z);
    }
  }

  function worldToScreen(vec3) {
    if (!camera) return { x: 0, y: 0 };
    const p = vec3.clone ? vec3.clone() : new THREE.Vector3(vec3.x, vec3.y, vec3.z);
    p.project(camera);
    const w = containerEl ? containerEl.clientWidth || window.innerWidth : window.innerWidth || 1280;
    const h = containerEl ? containerEl.clientHeight || window.innerHeight : window.innerHeight || 720;
    return {
      x: (p.x * 0.5 + 0.5) * w,
      y: (-p.y * 0.5 + 0.5) * h,
    };
  }

  function render() {
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  window.Engine = {
    CAM_FOV,
    CAM_OFFSET,
    CAM_LOOK_AHEAD,
    SHADOW_FRUSTUM_HALF,
    TOWN_BOUNDS,
    init,
    populateGlbScenery,
    resize,
    addShake,
    update,
    worldToScreen,
    render,
    getShadowTexture,
    getGlowTexture,
    get scene() { return scene; },
    get camera() { return camera; },
    get renderer() { return renderer; },
    get worldGroup() { return worldGroup; },
    get envGroup() { return envGroup; },
    get stationGroup() { return stationGroup; },
    get nodeGroup() { return nodeGroup; },
    get itemGroup() { return itemGroup; },
    get unitGroup() { return unitGroup; },
    get vfxGroup() { return vfxGroup; },
  };
})();
