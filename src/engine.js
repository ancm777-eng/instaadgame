// =============================================================================
// src/engine.js - Mobile Portrait 3D Scene, Luxury Arcane Atelier Lighting,
// Compact Compound Floor, South Resource Valley & East Siege Gate
// =============================================================================

(function () {
  "use strict";

  const CAM_FOV = 46;
  const CAM_OFFSET = new THREE.Vector3(0, 22, 17);
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
    ctx.fillStyle = "#1c3336";
    ctx.fillRect(0, 0, 512, 512);
    const patches = ["#234043", "#182b2e", "#2b4d4f", "#20393b"];
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = patches[i % patches.length];
      ctx.beginPath();
      ctx.arc((i * 73) % 512, (i * 139) % 512, 16 + (i % 24), 0, Math.PI * 2);
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

    // Luxury Dark Slate Stone & Subtle Gold Inlay Grid
    ctx.fillStyle = "#1c2238";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(230, 194, 122, 0.08)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
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

    // Main Cross Pathways (Champagne Stone)
    fillZone(-16.5, -1.5, 18.0, 2.5, "#2b3352", "rgba(230, 194, 122, 0.35)", 10);
    fillZone(-2.5, -15.0, 2.5, 12.0, "#2b3352", "rgba(230, 194, 122, 0.35)", 10);

    // North Arcane Energy Lab Zone
    fillZone(-8.5, -15.2, 8.5, -8.2, "#241d42", "rgba(192, 132, 252, 0.45)", 18);

    // Central-West/East Crafting & Market Strip
    fillZone(-16.2, -7.2, 13.8, -0.5, "#222944", "rgba(230, 194, 122, 0.42)", 18);

    // Central Spawn Medallion
    ctx.save();
    ctx.translate(wx(0), wz(4.5));
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(230, 194, 122, 0.14)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(230, 194, 122, 0.55)";
    ctx.stroke();
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
      border.position.set(cx, -0.02, cz);
      border.receiveShadow = true;
      envGroup.add(border);

      const soil = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshLambertMaterial({ color: soilColor })
      );
      soil.rotation.x = -Math.PI * 0.5;
      soil.position.set(cx, 0.035, cz);
      soil.receiveShadow = true;
      envGroup.add(soil);
    }

    // South Resource Valley: SW Ore Mine & SE Stardust Grove
    addFarmPlot(-7.2, 17.5, 11.2, 9.2, 0x253554, 0x60a5fa);
    addFarmPlot(7.2, 17.5, 11.2, 9.2, 0x2d214a, 0xc084fc);

    // South Path
    const southPath = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.04, 13.0),
      new THREE.MeshLambertMaterial({ color: 0x333c5c })
    );
    southPath.position.set(0, 0.01, 16.5);
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
    roadTrim.position.set(29.0, 0.012, 0);
    roadTrim.receiveShadow = true;
    envGroup.add(roadTrim);

    // Compound Deck
    const compTex = makeCompoundFloorTexture();
    const deckMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: compTex });
    const w = TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX;
    const d = TOWN_BOUNDS.maxZ - TOWN_BOUNDS.minZ;

    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.6, 0.24, d + 0.6),
      new THREE.MeshLambertMaterial({ color: 0xb88a44 })
    );
    curb.position.set(0, -0.1, (TOWN_BOUNDS.minZ + TOWN_BOUNDS.maxZ) * 0.5);
    curb.receiveShadow = true;
    envGroup.add(curb);

    const topMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), deckMat);
    topMesh.rotation.x = -Math.PI * 0.5;
    topMesh.position.set(0, 0.02, (TOWN_BOUNDS.minZ + TOWN_BOUNDS.maxZ) * 0.5);
    topMesh.receiveShadow = true;
    envGroup.add(topMesh);
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
