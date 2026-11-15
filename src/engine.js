/* ============================================================================
 * src/engine.js — Commercial 3D Perspective WebGL Engine (Three.js r128 + GLB)
 * PerspectiveCamera(34, aspect, 0.5, 140), CAM_OFFSET = (0, 14.5, 12.5),
 * Velocity Look-Ahead (1.2m) & Spring Damping, Expanded 96m Terrain,
 * RoomEnvironment IBL (PMREMGenerator), Tight 18m PCFSoftShadowMap Frustum,
 * and AssetLoader-driven .glb Trees & Perimeter Fences.
 * ============================================================================ */
(function () {
  "use strict";

  var CAM_OFFSET = new THREE.Vector3(0, 14.5, 12.5);
  var CAMP_CENTER = { x: 0, z: 1.0 };
  var CAMP_WALL_R = 9.35;

  var GATES = [
    { id: "hunting", angle: -1.05, label: "사냥터 출구", lantern: 0xff7096 },
    { id: "grove",   angle: 0.42,  label: "자원지 출구", lantern: 0x5ceeff },
    { id: "visitor", angle: 2.42,  label: "손님 방문길", lantern: 0xffd254 }
  ];

  var sharedShadowTex = null;
  var sharedGlowTex = null;

  function makeRadialCanvasTexture(stops) {
    if (typeof document === "undefined") return new THREE.Texture();
    var canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    var ctx = canvas.getContext("2d");
    var g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    for (var i = 0; i < stops.length; i++) {
      g.addColorStop(stops[i][0], stops[i][1]);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(canvas);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeTileCanvasTexture(kind, repeatX, repeatY) {
    if (typeof document === "undefined") return new THREE.Texture();
    var canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    var ctx = canvas.getContext("2d");

    if (kind === "meadow") {
      ctx.fillStyle = "#8ce086";
      ctx.fillRect(0, 0, 256, 256);
      // Soft storybook meadow checker & blossom clover specks
      ctx.fillStyle = "rgba(116, 214, 118, 0.42)";
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillRect(128, 128, 128, 128);
      for (var i = 0; i < 42; i++) {
        var gx = (i * 59 + 17) % 244;
        var gy = (i * 83 + 29) % 244;
        ctx.fillStyle = i % 5 === 0 ? "rgba(255, 246, 178, 0.55)" : "rgba(68, 168, 84, 0.25)";
        ctx.beginPath();
        ctx.arc(gx, gy, i % 5 === 0 ? 3.2 : 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "#e0b889";
      ctx.fillRect(0, 0, 256, 256);
      var rows = 4;
      var plankH = 256 / rows;
      for (var r = 0; r < rows; r++) {
        ctx.fillStyle = r % 2 === 0 ? "#dfb27f" : "#d4a46f";
        ctx.fillRect(0, r * plankH + 2, 256, plankH - 4);
        ctx.fillStyle = "rgba(112, 70, 38, 0.28)";
        ctx.fillRect(0, r * plankH, 256, 2);
        var seamX = r % 2 === 0 ? 128 : 64;
        ctx.fillRect(seamX, r * plankH, 3, plankH);
      }
    }

    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (tex.repeat) tex.repeat.set(repeatX, repeatY);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  function getShadowTexture() {
    if (!sharedShadowTex) {
      sharedShadowTex = makeRadialCanvasTexture([
        [0.0, "rgba(24, 12, 42, 0.36)"],
        [0.6, "rgba(24, 12, 42, 0.14)"],
        [1.0, "rgba(24, 12, 42, 0.0)"]
      ]);
    }
    return sharedShadowTex;
  }

  function getGlowTexture() {
    if (!sharedGlowTex) {
      sharedGlowTex = makeRadialCanvasTexture([
        [0.0, "rgba(255, 255, 255, 1.0)"],
        [0.4, "rgba(255, 255, 255, 0.65)"],
        [1.0, "rgba(255, 255, 255, 0.0)"]
      ]);
    }
    return sharedGlowTex;
  }

  var Engine = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    envGroup: null,

    hemiLight: null,
    sunLight: null,
    cauldronLight: null,
    counterLight: null,

    pollenPoints: null,
    pollenBase: [],
    wallColliders: [],
    gateMarkers: [],

    CAM_OFFSET: CAM_OFFSET,
    CAMP_CENTER: CAMP_CENTER,
    CAMP_WALL_R: CAMP_WALL_R,
    GATES: GATES,

    viewW: typeof window !== "undefined" ? (window.innerWidth || 1280) : 1280,
    viewH: typeof window !== "undefined" ? (window.innerHeight || 720) : 720,

    camTarget: new THREE.Vector3(0, 0.55, 2.0),
    lookAhead: new THREE.Vector3(0, 0, 0),
    shakePower: 0,
    elapsed: 0,

    getShadowTexture: getShadowTexture,
    getGlowTexture: getGlowTexture,

    init: function (containerEl) {
      this.container = containerEl;
      this.wallColliders = [];
      this.gateMarkers = [];
      this.viewW = typeof window !== "undefined" ? (window.innerWidth || 1280) : 1280;
      this.viewH = typeof window !== "undefined" ? (window.innerHeight || 720) : 720;

      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0xdcf5e7);
      scene.fog = new THREE.FogExp2(0xdcf5e7, 0.0115);
      this.scene = scene;

      var aspect = Math.max(0.42, this.viewW / Math.max(1, this.viewH));
      var camera = new THREE.PerspectiveCamera(34, aspect, 0.5, 140);
      camera.position.copy(this.camTarget).add(CAM_OFFSET);
      camera.lookAt(this.camTarget);
      this.camera = camera;

      var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      var dpr = Math.min((typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(this.viewW, this.viewH);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
      if (THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.85;
      }
      this.renderer = renderer;

      // Studio RoomEnvironment IBL lighting
      if (typeof THREE.PMREMGenerator === "function" && typeof THREE.RoomEnvironment === "function") {
        try {
          var pmrem = new THREE.PMREMGenerator(renderer);
          if (typeof pmrem.compileEquirectangularShader === "function") {
            pmrem.compileEquirectangularShader();
          }
          var roomEnv = new THREE.RoomEnvironment();
          var envRT = pmrem.fromScene(roomEnv, 0.04);
          scene.environment = envRT.texture;
          if (typeof roomEnv.dispose === "function") roomEnv.dispose();
          pmrem.dispose();
        } catch (e) {}
      }

      if (containerEl) {
        containerEl.innerHTML = "";
        containerEl.appendChild(renderer.domElement);
      }

      this._setupLights();
      this._buildGroundAndPaths();
      this._buildPollenParticles();

      if (typeof window !== "undefined") {
        var self = this;
        window.addEventListener("resize", function () {
          self.resize();
        });
      }
      return this;
    },

    _setupLights: function () {
      var hemi = new THREE.HemisphereLight(0xfffcf2, 0x6ec98a, 0.45);
      this.scene.add(hemi);
      this.hemiLight = hemi;

      // Sun light with tight 18m shadow frustum tracking player
      var sun = new THREE.DirectionalLight(0xfff1c9, 0.88);
      sun.position.set(16, 28, 14);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 90;
      var b = 18;
      sun.shadow.camera.left = -b;
      sun.shadow.camera.right = b;
      sun.shadow.camera.top = b;
      sun.shadow.camera.bottom = -b;
      sun.shadow.bias = -0.0004;
      this.scene.add(sun);
      this.scene.add(sun.target);
      this.sunLight = sun;

      var cLight = new THREE.PointLight(0xff7ae6, 1.3, 14, 1.6);
      cLight.position.set(0, 2.5, -5.5);
      this.scene.add(cLight);
      this.cauldronLight = cLight;

      var sLight = new THREE.PointLight(0xffd97d, 0.95, 12, 1.6);
      sLight.position.set(-7.2, 2.8, 1.2);
      this.scene.add(sLight);
      this.counterLight = sLight;
    },

    _buildGroundAndPaths: function () {
      var env = new THREE.Group();
      env.name = "EnchantedForestWorld";
      this.envGroup = env;

      // 1. Wide 96m Meadow Floor (hides all horizon edges under PerspectiveCamera + fog)
      var meadowTex = makeTileCanvasTexture("meadow", 36, 36);
      var meadowFloor = new THREE.Mesh(
        new THREE.CircleGeometry(96, 64),
        new THREE.MeshStandardMaterial({
          map: meadowTex,
          color: 0xffffff,
          roughness: 0.9,
          metalness: 0.02,
          envMapIntensity: 0.12
        })
      );
      meadowFloor.rotation.x = -Math.PI / 2;
      meadowFloor.position.y = 0;
      meadowFloor.receiveShadow = true;
      env.add(meadowFloor);

      // Playable glade boundary rune ring (gentle visual indicator at r = 25.5m)
      var gladeRing = new THREE.Mesh(
        new THREE.RingGeometry(25.3, 26.2, 64),
        new THREE.MeshBasicMaterial({
          color: 0x62be76,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide
        })
      );
      gladeRing.rotation.x = -Math.PI / 2;
      gladeRing.position.y = 0.015;
      env.add(gladeRing);

      // 2. Central Alchemy Workshop Timber Deck
      var campStoneRing = new THREE.Mesh(
        new THREE.RingGeometry(9.05, 9.85, 48),
        new THREE.MeshStandardMaterial({ color: 0xe3ccaa, roughness: 0.85, side: THREE.DoubleSide })
      );
      campStoneRing.rotation.x = -Math.PI / 2;
      campStoneRing.position.set(CAMP_CENTER.x, 0.016, CAMP_CENTER.z);
      campStoneRing.receiveShadow = true;
      env.add(campStoneRing);

      var plankTex = makeTileCanvasTexture("timber", 6, 6);
      var timberDeck = new THREE.Mesh(
        new THREE.CircleGeometry(9.2, 48),
        new THREE.MeshStandardMaterial({
          map: plankTex,
          color: 0xffffff,
          roughness: 0.82,
          metalness: 0.04,
          envMapIntensity: 0.12
        })
      );
      timberDeck.rotation.x = -Math.PI / 2;
      timberDeck.position.set(CAMP_CENTER.x, 0.025, CAMP_CENTER.z);
      timberDeck.receiveShadow = true;
      env.add(timberDeck);

      var runeRing = new THREE.Mesh(
        new THREE.RingGeometry(4.8, 5.1, 48),
        new THREE.MeshBasicMaterial({
          color: 0xffd670,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide
        })
      );
      runeRing.rotation.x = -Math.PI / 2;
      runeRing.position.set(CAMP_CENTER.x, 0.036, CAMP_CENTER.z);
      env.add(runeRing);

      // 3. Outer Trails Stepping Stones through NE / SE / SW gates
      var stepGeo = new THREE.CircleGeometry(0.92, 16);
      var stepMat = new THREE.MeshStandardMaterial({ color: 0xf4e7cc, roughness: 0.85, side: THREE.DoubleSide });
      var stonePositions = [
        [4.9, -7.8, 1.05], [5.8, -9.8, 1.0], [6.8, -11.9, 0.95],
        [9.2, 5.2, 1.05], [11.6, 6.2, 1.0], [14.1, 7.2, 0.95],
        [-7.5, 6.9, 1.05], [-9.2, 8.4, 1.0], [-10.9, 10.0, 0.95], [-12.6, 11.6, 0.9]
      ];
      for (var i = 0; i < stonePositions.length; i++) {
        var stPos = stonePositions[i];
        var st = new THREE.Mesh(stepGeo, stepMat);
        st.rotation.x = -Math.PI / 2;
        st.position.set(stPos[0], 0.022, stPos[1]);
        st.scale.setScalar(stPos[2]);
        st.receiveShadow = true;
        env.add(st);
      }

      this.scene.add(env);
    },

    populateGlbScenery: function () {
      if (!this.envGroup || typeof window === "undefined" || !window.AssetLoader) return;
      var AssetLoader = window.AssetLoader;

      // Clear any previously populated GLB scenery before rebuilding
      for (var gi = this.gateMarkers.length - 1; gi >= 0; gi--) {
        if (this.gateMarkers[gi].parent) this.gateMarkers[gi].parent.remove(this.gateMarkers[gi]);
      }
      this.gateMarkers.length = 0;
      this.wallColliders.length = 0;

      // 1. Perimeter Fences (32 segments with 3 gate openings) using .glb "fence"
      var totalSegs = 32;
      for (var s = 0; s < totalSegs; s++) {
        var ang = (s / totalSegs) * Math.PI * 2;
        var inGateGap = false;
        for (var g = 0; g < GATES.length; g++) {
          var da = Math.abs(ang - GATES[g].angle);
          while (da > Math.PI) da = Math.abs(da - Math.PI * 2);
          if (da < 0.27) {
            inGateGap = true;
            break;
          }
        }
        if (inGateGap) continue;

        var wx = CAMP_CENTER.x + Math.cos(ang) * CAMP_WALL_R;
        var wz = CAMP_CENTER.z + Math.sin(ang) * CAMP_WALL_R;
        var fenceInst = AssetLoader.createInstance("fence", {
          targetHeight: 1.35,
          tint: s % 2 === 0 ? 0xa57449 : 0x8f6239,
          tintStrength: 0.45
        });
        fenceInst.root.position.set(wx, 0, wz);
        fenceInst.root.rotation.y = -ang + Math.PI * 0.5;
        this.envGroup.add(fenceInst.root);
        this.gateMarkers.push(fenceInst.root);
        this.wallColliders.push({ x: wx, z: wz, r: 0.95 });
      }

      // 2. Three Gate Signposts & Lantern Glow Halos
      for (var k = 0; k < GATES.length; k++) {
        var gateInfo = GATES[k];
        var gx = CAMP_CENTER.x + Math.cos(gateInfo.angle) * CAMP_WALL_R;
        var gz = CAMP_CENTER.z + Math.sin(gateInfo.angle) * CAMP_WALL_R;
        var gateGroup = new THREE.Group();
        gateGroup.position.set(gx, 0, gz);

        var glowMat = new THREE.MeshBasicMaterial({
          map: getGlowTexture(),
          color: gateInfo.lantern,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        var halo = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), glowMat);
        halo.rotation.x = -Math.PI * 0.5;
        halo.position.y = 0.06;
        gateGroup.add(halo);

        if (typeof document !== "undefined") {
          var signCanvas = document.createElement("canvas");
          signCanvas.width = 256;
          signCanvas.height = 84;
          var sctx = signCanvas.getContext("2d");
          sctx.fillStyle = "rgba(32, 18, 52, 0.84)";
          sctx.fillRect(0, 0, 256, 84);
          sctx.strokeStyle = "#ffe082";
          sctx.lineWidth = 6;
          sctx.strokeRect(4, 4, 248, 76);
          sctx.fillStyle = "#fff9e6";
          sctx.font = "900 32px 'Pretendard', 'Malgun Gothic', sans-serif";
          sctx.textAlign = "center";
          sctx.textBaseline = "middle";
          sctx.fillText(gateInfo.label, 128, 42);

          var signTex = new THREE.CanvasTexture(signCanvas);
          if (THREE.sRGBEncoding !== undefined) signTex.encoding = THREE.sRGBEncoding;
          var sign = new THREE.Mesh(
            new THREE.PlaneGeometry(2.1, 0.68),
            new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide })
          );
          sign.position.set(0, 2.25, 0);
          gateGroup.add(sign);
        }

        this.envGroup.add(gateGroup);
        this.gateMarkers.push(gateGroup);
      }

      // 3. Outer Magic Forest Ring of 3D .glb Trees (38 inner grove + 36 outer horizon veil)
      var totalTrees = 74;
      for (var t = 0; t < totalTrees; t++) {
        var angle = (t / totalTrees) * Math.PI * 2 + (t % 3) * 0.03;
        if (t < 38 && angle > 2.22 && angle < 2.62) continue;

        var radius = t < 38 ? (26.2 + (t % 4) * 1.4) : (34.0 + (t % 5) * 4.5);
        var tx = Math.cos(angle) * radius;
        var tz = Math.sin(angle) * radius;
        var scaleVar = 0.85 + ((t * 13) % 6) * 0.08;
        var treeInst = AssetLoader.createInstance("tree", {
          targetHeight: 4.5 * scaleVar,
          tint: t % 3 === 0 ? 0xffb3de : (t % 3 === 1 ? 0x72ea9c : 0xc69eff),
          tintStrength: 0.35
        });
        treeInst.root.position.set(tx, 0, tz);
        treeInst.root.rotation.y = (t * 1.17) % (Math.PI * 2);
        this.envGroup.add(treeInst.root);
        this.gateMarkers.push(treeInst.root);
      }
    },

    _buildPollenParticles: function () {
      var count = 180;
      var positions = new Float32Array(count * 3);
      var colors = new Float32Array(count * 3);
      var cPalette = [
        new THREE.Color(0xfff39c),
        new THREE.Color(0xffaef0),
        new THREE.Color(0x9ef7ff),
        new THREE.Color(0xc8ffb4)
      ];

      this.pollenBase = [];
      for (var i = 0; i < count; i++) {
        var bx = (Math.random() - 0.5) * 48;
        var by = 0.5 + Math.random() * 4.5;
        var bz = (Math.random() - 0.5) * 48;
        positions[i * 3] = bx;
        positions[i * 3 + 1] = by;
        positions[i * 3 + 2] = bz;
        this.pollenBase.push({
          x: bx,
          y: by,
          z: bz,
          phase: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 0.9
        });

        var col = cPalette[i % cPalette.length];
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }

      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      var mat = new THREE.PointsMaterial({
        size: 0.22,
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        depthWrite: false
      });

      var points = new THREE.Points(geo, mat);
      this.scene.add(points);
      this.pollenPoints = points;
    },

    addShake: function (amount) {
      this.shakePower = Math.min(0.65, Math.max(this.shakePower, amount));
    },

    update: function (targetState, dt) {
      this.elapsed += dt;

      var tx = targetState && typeof targetState.x === "number" ? targetState.x : 0;
      var tz = targetState && typeof targetState.z === "number" ? targetState.z : 0;
      var vx = targetState && typeof targetState.vx === "number" ? targetState.vx : 0;
      var vz = targetState && typeof targetState.vz === "number" ? targetState.vz : 0;
      var maxSpd = Math.max(0.1, (targetState && targetState.maxSpeed) || 6.4);

      // 1.2m Look-Ahead offset along player velocity vector
      var spd = Math.hypot(vx, vz);
      var ratio = spd > 0.15 ? Math.min(1, spd / maxSpd) : 0;
      var desiredLookX = spd > 0.15 ? (vx / spd) * 1.2 * ratio : 0;
      var desiredLookZ = spd > 0.15 ? (vz / spd) * 1.2 * ratio : 0;

      var lookBlend = Math.min(1, dt * 6.5);
      this.lookAhead.x += (desiredLookX - this.lookAhead.x) * lookBlend;
      this.lookAhead.z += (desiredLookZ - this.lookAhead.z) * lookBlend;

      // Spring damping toward target + lookAhead
      var lerpFactor = Math.min(1, dt * 8.5);
      var goalX = tx + this.lookAhead.x;
      var goalY = 0.55;
      var goalZ = tz + this.lookAhead.z;

      this.camTarget.x += (goalX - this.camTarget.x) * lerpFactor;
      this.camTarget.y += (goalY - this.camTarget.y) * lerpFactor;
      this.camTarget.z += (goalZ - this.camTarget.z) * lerpFactor;

      var sx = 0;
      var sy = 0;
      if (this.shakePower > 0.002) {
        sx = (Math.random() - 0.5) * this.shakePower;
        sy = (Math.random() - 0.5) * this.shakePower;
        this.shakePower = Math.max(0, this.shakePower - dt * 2.8);
      }

      this.camera.position.set(
        this.camTarget.x + CAM_OFFSET.x + sx,
        this.camTarget.y + CAM_OFFSET.y + sy,
        this.camTarget.z + CAM_OFFSET.z
      );
      this.camera.lookAt(this.camTarget);

      // Keep tight 18m sun shadow frustum centered on player target
      if (this.sunLight) {
        this.sunLight.position.set(this.camTarget.x + 16, 28, this.camTarget.z + 14);
        this.sunLight.target.position.set(this.camTarget.x, 0, this.camTarget.z);
        this.sunLight.target.updateMatrixWorld();
      }

      if (this.cauldronLight) {
        this.cauldronLight.intensity = 1.3 + Math.sin(this.elapsed * 5.2) * 0.3;
      }

      // Gently billboard gate labels toward PerspectiveCamera
      for (var i = 0; i < this.gateMarkers.length; i++) {
        var gm = this.gateMarkers[i];
        if (gm && gm.children && gm.children.length > 1) {
          var signMesh = gm.children[1];
          if (signMesh && typeof signMesh.lookAt === "function") {
            signMesh.lookAt(this.camera.position);
          }
        }
      }

      if (this.pollenPoints) {
        var attr = this.pollenPoints.geometry.getAttribute("position");
        var arr = attr.array;
        for (var p = 0; p < this.pollenBase.length; p++) {
          var b = this.pollenBase[p];
          arr[p * 3] = b.x + Math.sin(this.elapsed * b.speed + b.phase) * 0.6;
          arr[p * 3 + 1] = b.y + Math.sin(this.elapsed * 1.4 * b.speed + b.phase) * 0.45;
          arr[p * 3 + 2] = b.z + Math.cos(this.elapsed * b.speed + b.phase) * 0.6;
        }
        attr.needsUpdate = true;
      }
    },

    resize: function () {
      this.viewW = typeof window !== "undefined" ? (window.innerWidth || 1280) : 1280;
      this.viewH = typeof window !== "undefined" ? (window.innerHeight || 720) : 720;
      var aspect = Math.max(0.42, this.viewW / Math.max(1, this.viewH));

      if (this.camera) {
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
      }
      if (this.renderer) {
        var dpr = Math.min((typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1, 2);
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(this.viewW, this.viewH);
      }
    },

    worldToScreen: function (worldVec3) {
      if (!this.camera) return { x: 0, y: 0 };
      var v = worldVec3.clone().project(this.camera);
      return {
        x: (v.x * 0.5 + 0.5) * this.viewW,
        y: (-v.y * 0.5 + 0.5) * this.viewH
      };
    },

    render: function () {
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  };

  if (typeof window !== "undefined") {
    window.Engine = Engine;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Engine;
  }
})();
