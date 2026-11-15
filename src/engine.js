// =============================================================================
// src/engine.js - 3D Scene, Perspective Zoomed-Out Tycoon Camera (FOV 35,
// Offset (0, 25, 21)), Lighting, 38x34m Rounded Compound Floor, Perimeter
// GLB Fences with 3 Wide Gates, and Unobstructed Forest Scenery
// =============================================================================

(function () {
  "use strict";

  const CAM_FOV = 35;
  const CAM_OFFSET = new THREE.Vector3(0, 25, 21);
  const CAM_LOOK_AHEAD = 1.5;
  const SHADOW_FRUSTUM_HALF = 34;

  // 4x Expanded 38m x 34m Rounded Rectangular Workshop Compound
  const TOWN_BOUNDS = {
    minX: -19,
    maxX: 19,
    minZ: -17,
    maxZ: 17,
    cornerRadius: 2.8,
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
    const W = 1024;
    const H = 916;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Warm oak timber deck across main workshop compound (38m x 34m)
    ctx.fillStyle = "#d4a66a";
    ctx.fillRect(0, 0, W, H);

    const plankH = 26;
    for (let y = 0; y < H; y += plankH) {
      const row = Math.floor(y / plankH);
      ctx.fillStyle = row % 2 === 0 ? "#d9ae74" : "#cea064";
      ctx.fillRect(0, y, W, plankH - 2);
      ctx.fillStyle = "rgba(110, 68, 30, 0.26)";
      ctx.fillRect(0, y + plankH - 2, W, 2);
      for (let x = (row % 3) * 44; x < W; x += 132) {
        ctx.fillRect(x, y, 2, plankH);
      }
    }

    // Helper: convert world (x in [-19,19], z in [-17,17]) to canvas pixels
    const wx = (x) => ((x + 19) / 38) * W;
    const wz = (z) => ((z + 17) / 34) * H;
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

    // North Production Line Deck (cool stone factory floor along z in [-16.2, -9.2])
    fillWorldZone(-17.8, -16.2, 17.8, -9.0, "#bfc6d9", "#7b84a3", 22);
    // Individual stone tiles inside North Production Strip
    ctx.strokeStyle = "rgba(85, 94, 128, 0.25)";
    ctx.lineWidth = 2;
    for (let gx = -17; gx <= 17; gx += 2) {
      ctx.beginPath();
      ctx.moveTo(wx(gx), wz(-16.0));
      ctx.lineTo(wx(gx), wz(-9.2));
      ctx.stroke();
    }
    for (let gz = -16; gz <= -9; gz += 2) {
      ctx.beginPath();
      ctx.moveTo(wx(-17.6), wz(gz));
      ctx.lineTo(wx(17.6), wz(gz));
      ctx.stroke();
    }

    // West Market & Queue Cobble Plaza (x in [-18.0, -5.2], z in [-5.8, 12.2])
    fillWorldZone(-18.0, -5.8, -5.2, 12.2, "#e8dec8", "#b29c78", 22);
    // Warm cream & pastel sand checkerboard inside Market Plaza
    for (let x = -17.5; x < -5.8; x += 1.6) {
      for (let z = -5.3; z < 11.6; z += 1.6) {
        const checker = ((Math.floor(x * 2) + Math.floor(z * 2)) & 1) === 0;
        if (checker) {
          ctx.fillStyle = "rgba(198, 172, 132, 0.28)";
          ctx.fillRect(wx(x), wz(z), (1.6 / 38) * W, (1.6 / 34) * H);
        }
      }
    }

    // East Gate Garden Walkway (x in [11.5, 19.0], z in [-4.5, 4.5])
    fillWorldZone(10.5, -4.5, 19.1, 4.5, "#d8b47b", "#997040", 14);

    // North-East & North-West Gate Paths (z in [-17.1, -14.8])
    fillWorldZone(5.2, -17.2, 10.8, -14.0, "#d4b37d", "#8d6d43", 10);
    fillWorldZone(-10.8, -17.2, -5.2, -14.0, "#d4b37d", "#8d6d43", 10);

    // Central Spawn Plaza Medallion around (0, 2.0)
    ctx.save();
    ctx.translate(wx(0), wz(2.0));
    ctx.beginPath();
    ctx.arc(0, 0, 82, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 244, 212, 0.42)";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(166, 114, 58, 0.55)";
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

    const meadow = new THREE.Mesh(new THREE.PlaneGeometry(190, 190), meadowMat);
    meadow.rotation.x = -Math.PI * 0.5;
    meadow.position.y = -0.06;
    meadow.receiveShadow = true;
    envGroup.add(meadow);

    // 2. Dense Farm Soil & Garden Framing Plots outside East & North Gates
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

    // East Ore Mine Quarry (x in [20.4, 35.6], z in [-11.8, -0.6])
    addFarmPlot(28.0, -6.2, 15.2, 11.2, 0x627394, 0x434d68);
    // South-East Rainbow Herb Grove (x in [20.4, 35.6], z in [0.6, 11.8])
    addFarmPlot(28.0, 6.2, 15.2, 11.2, 0x63ad60, 0x3e7844);
    // North-East Zone 3 Ore Annex (x in [2.5, 18.0], z in [-30.0, -18.8])
    addFarmPlot(10.2, -24.4, 15.4, 11.2, 0x5c6d8e, 0x3f4962);
    // North-West Zone 4 Rainbow Herb Garden (x in [-18.0, -2.5], z in [-30.0, -18.8])
    addFarmPlot(-10.2, -24.4, 15.4, 11.2);

    // Bridge paths connecting East, NE, NW gates + Royal Trade Road along z = -14.2
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xd9be8c });
    const stoneRoadMat = new THREE.MeshLambertMaterial({ color: 0xaab2c8 });
    const eastPath = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.04, 8.6), pathMat);
    eastPath.position.set(19.6, 0.005, 0);
    eastPath.receiveShadow = true;
    envGroup.add(eastPath);

    const royalRoad = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.04, 2.6), stoneRoadMat);
    royalRoad.position.set(21.8, 0.008, -14.2);
    royalRoad.receiveShadow = true;
    envGroup.add(royalRoad);

    const nePath = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.04, 3.6), pathMat);
    nePath.position.set(8.0, 0.005, -18.2);
    nePath.receiveShadow = true;
    envGroup.add(nePath);

    const nwPath = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.04, 3.6), pathMat);
    nwPath.position.set(-8.0, 0.005, -18.2);
    nwPath.receiveShadow = true;
    envGroup.add(nwPath);

    // 3. Raised 38m x 34m Rounded Rectangular Workshop Compound Deck
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
      const box = new THREE.Mesh(new THREE.BoxGeometry(38, 0.12, 34), deckMat);
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

    // Perimeter fence segments around x in [-19, 19], z in [-17, 17]
    // South border (z = +17, continuous)
    for (let x = -16.5; x <= 16.5; x += 3.0) {
      placeFence(x, 17.0, 0);
    }
    // West border (x = -19, continuous)
    for (let z = -14.5; z <= 14.5; z += 3.0) {
      placeFence(-19.0, z, Math.PI * 0.5);
    }
    // East border (x = +19, leave wide East Farm Gate at z in [-4.2, +4.2])
    for (let z = -14.5; z <= 14.5; z += 3.0) {
      if (Math.abs(z) < 4.5) continue;
      placeFence(19.0, z, Math.PI * 0.5);
    }
    // North border (z = -17, leave NW gate x in [-11,-5] & NE gate x in [5,11])
    for (let x = -16.5; x <= 16.5; x += 3.0) {
      if (x >= -10.8 && x <= -5.2) continue;
      if (x >= 5.2 && x <= 10.8) continue;
      placeFence(x, -17.0, 0);
    }

    // Illuminated wooden gate pillars at all 3 gates
    envGroup.add(makeGatePillar(19.0, -4.4, 0x52efff));
    envGroup.add(makeGatePillar(19.0, 4.4, 0xff82b2));
    envGroup.add(makeGatePillar(5.0, -17.0, 0x62ffaa));
    envGroup.add(makeGatePillar(11.0, -17.0, 0x62ffaa));
    envGroup.add(makeGatePillar(-11.0, -17.0, 0xd482ff));
    envGroup.add(makeGatePillar(-5.0, -17.0, 0xd482ff));

    // Outer Forest Trees: strictly OUTSIDE town AND clear of East & North Farms
    // and clear of south foreground view corridor (z > 17 && |x| < 21)
    const treeSpots = [
      [-23.5, -28], [-25.0, -21], [-23.8, -14], [-24.5, -7], [-23.8, 0],
      [-24.2, 7], [-23.5, 14], [-25.5, 20], [-22.5, 24],
      [23.5, -26], [26.0, -20], [39.0, -14], [40.0, -6], [39.5, 2],
      [40.0, 10], [38.5, 16], [23.5, 19], [25.5, 24],
      [-18.0, -34.0], [-10.0, -34.5], [-1.0, -34.2], [7.5, -34.5], [16.5, -34.0],
      [-28.5, 11.0], [30.0, -18.0], [30.5, 18.0],
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
