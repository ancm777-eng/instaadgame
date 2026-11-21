// =============================================================================
// src/engine.js - Mobile Portrait 3D Scene, Luxury Arcane Atelier Lighting,
// Compact Compound Floor, South Resource Valley & East Siege Gate
// =============================================================================

(function () {
  "use strict";

  const CAM_FOV = 44;
  const CAM_OFFSET = new THREE.Vector3(0, 17, 16);
  const CAM_LOOK_AHEAD = 1.2;
  const SHADOW_FRUSTUM_HALF = 36;

  // Compact 36m x 28m Luxury Atelier Compound
  const TOWN_BOUNDS = {
    minX: -18,
    maxX: 18,
    minZ: -16,
    maxZ: 12,
    cornerRadius: 2.5,
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
  const camDesiredPos = new THREE.Vector3(0, 22, 17);
  const lookAheadVec = new THREE.Vector3(0, 0, 0);
  let shakeIntensity = 0;

  let _shadowTex = null;
  let _glowTex = null;
  let _sceneryPopulated = false;
  const camPan = { active: false, tx: 0, tz: 0, timer: 0, duration: 1.4 };
  const fireflies = [];
  let ambientTime = 0;

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
      _shadowTex = makeRadialCanvasTexture("rgba(6,10,22,0.58)", "rgba(6,10,22,0.22)", "rgba(6,10,22,0)", 128);
    }
    return _shadowTex;
  }

  function getGlowTexture() {
    if (!_glowTex) {
      _glowTex = makeRadialCanvasTexture("rgba(255,255,255,0.95)", "rgba(255,255,255,0.38)", "rgba(255,255,255,0)", 128);
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
    ctx.fillStyle = "#142636";
    ctx.fillRect(0, 0, 512, 512);
    const patches = ["#1a3245", "#112030", "#1f3a4d", "#182d40"];
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = patches[i % patches.length];
      ctx.beginPath();
      ctx.arc((i * 73) % 512, (i * 139) % 512, 14 + (i % 24), 0, Math.PI * 2);
      ctx.fill();
    }
    // Tiny glowing twilight wildflowers & starlight moss dots
    const flowers = ["rgba(192,132,252,0.55)", "rgba(125,211,252,0.5)", "rgba(253,224,71,0.5)"];
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = flowers[i % flowers.length];
      ctx.beginPath();
      ctx.arc((i * 97 + 19) % 512, (i * 163 + 41) % 512, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function makeCompoundFloorTexture() {
    if (typeof document === "undefined") return null;
    const W = 1024;
    const H = 800;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Hand-painted style Moonlit Twilight Cobblestone Floor
    ctx.fillStyle = "#161b30";
    ctx.fillRect(0, 0, W, H);

    const tileW = 48;
    const tileH = 36;
    const stoneTones = ["#1e2542", "#232b4a", "#1b213b", "#263052", "#1f2744"];
    for (let row = 0; row * tileH < H; row++) {
      const offset = (row % 2) * (tileW * 0.5);
      for (let col = -1; col * tileW < W + tileW; col++) {
        const x = col * tileW + offset;
        const y = row * tileH;
        const hash = Math.abs((row * 31 + col * 17) % stoneTones.length);
        ctx.fillStyle = stoneTones[hash];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x + 2, y + 2, tileW - 4, tileH - 4, 6);
        else ctx.rect(x + 2, y + 2, tileW - 4, tileH - 4);
        ctx.fill();
        // Subtle moonlight top bevel highlight
        ctx.fillStyle = "rgba(186, 230, 253, 0.05)";
        ctx.fillRect(x + 5, y + 4, tileW - 10, 3);
      }
    }

    const wx = (x) => ((x - TOWN_BOUNDS.minX) / (TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX)) * W;
    const wz = (z) => ((z - TOWN_BOUNDS.minZ) / (TOWN_BOUNDS.maxZ - TOWN_BOUNDS.minZ)) * H;

    function fillZone(x0, z0, x1, z1, fill, border, radius = 16) {
      const px = wx(x0);
      const py = wz(z0);
      const pw = wx(x1) - px;
      const ph = wz(z1) - py;
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, radius);
      else ctx.rect(px, py, pw, ph);
      ctx.fillStyle = fill;
      ctx.fill();
      if (border) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = border;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Main Cross Boulevards (Warm Lantern-lit Stone)
    fillZone(-16.5, -1.5, 18.0, 2.5, "rgba(48, 56, 92, 0.72)", "rgba(247, 220, 161, 0.45)", 12);
    fillZone(-2.5, -15.0, 2.5, 12.0, "rgba(48, 56, 92, 0.72)", "rgba(247, 220, 161, 0.45)", 12);

    // North Tech & R&D District (Bag Upgrade, Monggle Lab, Fairy Shrine)
    fillZone(-10.5, -15.4, 10.5, -7.2, "rgba(44, 28, 86, 0.80)", "rgba(192, 132, 252, 0.68)", 20);
    ctx.save();
    ctx.translate(wx(0), wz(-11.3));
    ctx.strokeStyle = "rgba(216, 180, 254, 0.42)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 72, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // West Resource Sales & Crafting Cluster (Close to South Resources!)
    fillZone(-16.4, -5.2, -0.2, 7.2, "rgba(32, 40, 72, 0.78)", "rgba(247, 220, 161, 0.56)", 20);

    // Ornate Central Arcane Medallion around Spawn (0, 2.5)
    ctx.save();
    ctx.translate(wx(0), wz(2.5));
    ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(247, 220, 161, 0.10)"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(247, 220, 161, 0.62)"; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(192, 132, 252, 0.5)"; ctx.stroke();
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function buildEnvironmentFloor() {
    const meadowMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: makeMeadowTexture() });
    const meadow = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), meadowMat);
    meadow.rotation.x = -Math.PI * 0.5;
    meadow.position.y = -0.06;
    meadow.receiveShadow = true;
    envGroup.add(meadow);

    function addFarmPlot(cx, cz, w, d, soilColor, borderColor) {
      const border = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.7, 0.1, d + 0.7),
        new THREE.MeshLambertMaterial({ color: borderColor })
      );
      border.position.set(cx, -0.05, cz);
      border.receiveShadow = true;
      envGroup.add(border);

      const soil = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshLambertMaterial({ color: soilColor })
      );
      soil.rotation.x = -Math.PI * 0.5;
      soil.position.set(cx, 0.03, cz);
      soil.receiveShadow = true;
      envGroup.add(soil);
    }

    // South Resource Valley (Moved closer for efficient travel): SW Ore Mine & SE Stardust Grove
    addFarmPlot(-7.2, 14.2, 11.2, 7.6, 0x253554, 0x60a5fa);
    addFarmPlot(6.7, 14.2, 11.2, 7.6, 0x2d214a, 0xc084fc);

    // South Path
    const southPath = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.04, 10.0),
      new THREE.MeshLambertMaterial({ color: 0x333c5c })
    );
    southPath.position.set(0, 0.015, 14.0);
    southPath.receiveShadow = true;
    envGroup.add(southPath);

    // East Monster Siege Lane (x = 18..40)
    const eastLane = new THREE.Mesh(
      new THREE.BoxGeometry(22.0, 0.04, 9.2),
      new THREE.MeshLambertMaterial({ color: 0x1b1e2e })
    );
    eastLane.position.set(29.0, 0.005, 0);
    eastLane.receiveShadow = true;
    envGroup.add(eastLane);

    const roadTrim = new THREE.Mesh(
      new THREE.BoxGeometry(21.0, 0.045, 3.6),
      new THREE.MeshLambertMaterial({ color: 0x2c324a })
    );
    roadTrim.position.set(29.0, 0.018, 0);
    roadTrim.receiveShadow = true;
    envGroup.add(roadTrim);

    // Compound Deck (curb strictly below topMesh to prevent Z-fighting)
    const compTex = makeCompoundFloorTexture();
    const deckMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: compTex });
    const w = TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX;
    const d = TOWN_BOUNDS.maxZ - TOWN_BOUNDS.minZ;

    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.8, 0.24, d + 0.8),
      new THREE.MeshLambertMaterial({ color: 0xb88a44 })
    );
    curb.position.set(0, -0.15, (TOWN_BOUNDS.minZ + TOWN_BOUNDS.maxZ) * 0.5);
    curb.receiveShadow = true;
    envGroup.add(curb);

    const topMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), deckMat);
    topMesh.rotation.x = -Math.PI * 0.5;
    topMesh.position.set(0, 0.04, (TOWN_BOUNDS.minZ + TOWN_BOUNDS.maxZ) * 0.5);
    topMesh.receiveShadow = true;
    envGroup.add(topMesh);

    // Warm Golden Arcane Street Lanterns (Warm-vs-Cool Contrast!)
    const lanternSpots = [
      [-14.5, 2.2], [-4.2, 2.2], [4.2, 2.2], [14.5, 2.2],
      [-7.5, -8.6], [7.5, -8.6],
    ];
    const postMat = new THREE.MeshLambertMaterial({ color: 0x2a2d44 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });
    const glowTex = getGlowTexture();
    for (const [lx, lz] of lanternSpots) {
      const g = new THREE.Group();
      g.position.set(lx, 0, lz);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.6, 8), postMat);
      post.position.y = 1.3;
      g.add(post);
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), glassMat);
      lamp.position.y = 2.7;
      g.add(lamp);
      if (glowTex) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex, color: 0xffb84d, transparent: true, opacity: 0.72,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        sp.position.y = 2.7;
        sp.scale.set(2.4, 2.4, 1);
        g.add(sp);
      }
      const pl = new THREE.PointLight(0xffb85c, 1.15, 13, 1.6);
      pl.position.set(0, 2.8, 0);
      g.add(pl);
      envGroup.add(g);
    }

    // Floating Starlight Fireflies (Atmospheric Magic Depth)
    if (glowTex) {
      const ffColors = [0xfef08a, 0xd8b4fe, 0x7dd3fc];
      for (let i = 0; i < 40; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex,
          color: ffColors[i % ffColors.length],
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }));
        const bx = (Math.random() - 0.5) * 34;
        const bz = -14 + Math.random() * 34;
        const by = 0.8 + Math.random() * 2.6;
        sp.position.set(bx, by, bz);
        sp.scale.setScalar(0.32 + Math.random() * 0.28);
        envGroup.add(sp);
        fireflies.push({ sp, bx, by, bz, phase: Math.random() * 6.28, spd: 0.8 + Math.random() * 1.1 });
      }
    }
  }

  function populateGlbScenery() {
    if (_sceneryPopulated || !envGroup) return;
    _sceneryPopulated = true;

    const Loader = window.AssetLoader;
    const hasTree = Loader && Loader.hasRole && Loader.hasRole("tree");
    const treePositions = [
      [-21, -15], [-21, -5], [-21, 5], [-16, 25], [16, 25],
      [0, -20], [-12, -20], [12, -20], [21, -12], [21, 12],
    ];
    for (const [tx, tz] of treePositions) {
      if (hasTree) {
        const inst = Loader.createInstance("tree", { targetHeight: 3.6, castShadow: true });
        if (inst && inst.root) {
          inst.root.position.set(tx, 0, tz);
          envGroup.add(inst.root);
          continue;
        }
      }
      const g = new THREE.Group();
      g.position.set(tx, 0, tz);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.34, 1.5, 8),
        new THREE.MeshLambertMaterial({ color: 0x5c3c24 })
      );
      trunk.position.y = 0.75;
      trunk.castShadow = true;
      g.add(trunk);
      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.1, 0),
        new THREE.MeshLambertMaterial({ color: 0x2d6a4f })
      );
      crown.position.y = 2.1;
      crown.castShadow = true;
      g.add(crown);
      envGroup.add(g);
    }
  }

  function setUnlockedEraVisuals() {}

  function panCameraTo(tx, tz, durationSec = 1.4) {
    camPan.active = true;
    camPan.tx = Number(tx) || 0;
    camPan.tz = Number(tz) || 0;
    camPan.timer = 0;
    camPan.duration = Math.max(0.4, Number(durationSec) || 1.4);
  }

  function getCameraPanState() {
    return { ...camPan };
  }

  function init(container) {
    containerEl = container;
    const width = container ? container.clientWidth || 390 : 390;
    const height = container ? container.clientHeight || 844 : 844;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1020);
    if (typeof THREE.FogExp2 === "function") {
      scene.fog = new THREE.FogExp2(0x0c1020, 0.0085);
    }

    const initAspect = width / Math.max(1, height);
    const initFov = initAspect < 1 ? Math.min(54, Math.max(CAM_FOV, CAM_FOV * (0.62 / Math.max(0.45, initAspect)))) : CAM_FOV;
    camera = new THREE.PerspectiveCamera(initFov, initAspect, 0.8, 180);
    camera.position.copy(CAM_OFFSET);
    camera.lookAt(0, 0.8, 0);

    if (typeof THREE.WebGLRenderer === "function" && container) {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      } catch (err) {
        console.warn("WebGLRenderer init failed:", err);
        renderer = null;
      }
    }
    if (renderer && container) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = true;
        if (THREE.PCFSoftShadowMap !== undefined) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      if (THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
      }
      renderer.toneMappingExposure = 1.05;
      if (THREE.SRGBColorSpace !== undefined && renderer.outputColorSpace !== undefined) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      }
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      if (THREE.RoomEnvironment && THREE.PMREMGenerator) {
        try {
          const pmrem = new THREE.PMREMGenerator(renderer);
          scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
          pmrem.dispose();
        } catch (e) {}
      }
    }

    // Luxury Arcane Atelier Lighting: Cool Lavender/Indigo Fill + Warm Champagne Key
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e1b4b, 0.65);
    scene.add(hemi);

    dirLight = new THREE.DirectionalLight(0xffe7ba, 1.05);
    dirLight.position.set(-14, 34, 18);
    dirLight.castShadow = true;
    if (dirLight.shadow) {
      dirLight.shadow.mapSize.set(2048, 2048);
      dirLight.shadow.camera.left = -SHADOW_FRUSTUM_HALF;
      dirLight.shadow.camera.right = SHADOW_FRUSTUM_HALF;
      dirLight.shadow.camera.top = SHADOW_FRUSTUM_HALF;
      dirLight.shadow.camera.bottom = -SHADOW_FRUSTUM_HALF;
      dirLight.shadow.camera.near = 4;
      dirLight.shadow.camera.far = 100;
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
    const w = containerEl.clientWidth || 390;
    const h = containerEl.clientHeight || 844;
    const aspect = w / Math.max(1, h);
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? Math.min(54, Math.max(CAM_FOV, CAM_FOV * (0.62 / Math.max(0.45, aspect)))) : CAM_FOV;
    camera.updateProjectionMatrix();
    if (renderer) renderer.setSize(w, h);
  }

  function addShake(amount) {
    shakeIntensity = Math.min(0.65, shakeIntensity + amount);
  }

  function update(targetPos, targetVel, dt) {
    if (!camera) return;
    const step = Math.min(0.05, dt || 0.016);

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

    if (camPan.active) {
      camPan.timer += step;
      if (camPan.timer >= camPan.duration) camPan.active = false;
    }

    const tx = camPan.active ? camPan.tx : ((targetPos ? targetPos.x : 0) + lookAheadVec.x);
    const tz = camPan.active ? camPan.tz : ((targetPos ? targetPos.z : 0) + lookAheadVec.z - 0.8);

    const camLerp = 1 - Math.exp(-(camPan.active ? 4.5 : 6.5) * step);
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
      dirLight.position.set(camTarget.x - 14, 34, camTarget.z + 18);
      if (dirLight.target) dirLight.target.position.set(camTarget.x, 0, camTarget.z);
    }

    // Animate ambient starlight fireflies
    ambientTime += step;
    for (const f of fireflies) {
      const t = ambientTime * f.spd + f.phase;
      f.sp.position.set(
        f.bx + Math.sin(t * 0.7) * 0.9,
        f.by + Math.sin(t * 1.3) * 0.45,
        f.bz + Math.cos(t * 0.6) * 0.9
      );
      f.sp.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(t * 1.6));
    }
  }

  function worldToScreen(vec3) {
    if (!camera) return { x: 0, y: 0 };
    const p = vec3.clone ? vec3.clone() : new THREE.Vector3(vec3.x, vec3.y, vec3.z);
    p.project(camera);
    const w = containerEl ? containerEl.clientWidth || 390 : 390;
    const h = containerEl ? containerEl.clientHeight || 844 : 844;
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
    init,
    resize,
    update,
    addShake,
    worldToScreen,
    render,
    setUnlockedEraVisuals,
    panCameraTo,
    getCameraPanState,
    populateGlbScenery,
    getShadowTexture,
    getGlowTexture,
    TOWN_BOUNDS,
    get scene() { return scene; },
    get camera() { return camera; },
    get worldGroup() { return worldGroup; },
    get envGroup() { return envGroup; },
    get stationGroup() { return stationGroup; },
    get nodeGroup() { return nodeGroup; },
    get itemGroup() { return itemGroup; },
    get unitGroup() { return unitGroup; },
    get vfxGroup() { return vfxGroup; },
  };
})();
