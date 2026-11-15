/* ============================================================================
 * src/entities.js — Pure .glb Asset-Driven 3D Entity, Station & 3D Ring Pad Factory
 * Zero SphereGeometry / CylinderGeometry / ConeGeometry character/building
 * assemblies. Every entity & prop uses AssetLoader.createInstance() normalized
 * .glb models, AnimationMixer crossFadeTo, Squash-and-Stretch, White Flash,
 * and Sleek 3D Progress-Arc Step-to-Pay Pads.
 * ============================================================================ */
(function () {
  "use strict";

  var cachedArrowTex = null;

  function drawRoundedRectPath(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) {
      c.roundRect(x, y, w, h, r);
    } else {
      c.rect(x, y, w, h);
    }
  }

  function getGuideArrowTexture() {
    if (cachedArrowTex) return cachedArrowTex;
    if (typeof document === "undefined") return new THREE.Texture();
    var c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    var ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 128, 128);
    ctx.beginPath();
    ctx.moveTo(64, 14);
    ctx.lineTo(108, 70);
    ctx.lineTo(82, 70);
    ctx.lineTo(82, 114);
    ctx.lineTo(46, 114);
    ctx.lineTo(46, 70);
    ctx.lineTo(20, 70);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, 14, 0, 114);
    grad.addColorStop(0, "#fff8a6");
    grad.addColorStop(1, "#ffae3d");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#241434";
    ctx.stroke();

    var tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    cachedArrowTex = tex;
    return tex;
  }

  function createShadowDisc(radius) {
    var geo = new THREE.CircleGeometry(radius, 24);
    geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshBasicMaterial({
      map: Engine.getShadowTexture(),
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    var m = new THREE.Mesh(geo, mat);
    m.position.y = 0.028;
    return m;
  }

  /* ------------------------------------------------------------------------
   * Visual Feedback Helpers (Flash White & Elastic Squash-and-Stretch)
   * ------------------------------------------------------------------------ */
  function flashModelWhite(entityModel, duration) {
    if (!entityModel) return;
    entityModel.flashTimer = duration !== undefined ? duration : 0.12;
    entityModel._isFlashing = true;
    var mats = entityModel.materials || (entityModel.glb && entityModel.glb.materials) || [];
    for (var i = 0; i < mats.length; i++) {
      var m = mats[i];
      if (!m) continue;
      if (m.color && typeof m.color.setHex === "function") m.color.setHex(0xffffff);
      if (m.emissive && typeof m.emissive.setHex === "function") {
        m.emissive.setHex(0xffffff);
        m.emissiveIntensity = 0.95;
      }
    }
  }

  function updateModelFlash(entityModel, dt) {
    if (!entityModel || !entityModel._isFlashing) return;
    entityModel.flashTimer = Math.max(0, (entityModel.flashTimer || 0) - dt);
    if (entityModel.flashTimer <= 0) {
      entityModel._isFlashing = false;
      var mats = entityModel.materials || (entityModel.glb && entityModel.glb.materials) || [];
      for (var i = 0; i < mats.length; i++) {
        var m = mats[i];
        if (!m || !m.userData) continue;
        if (m.color && m.userData._baseColor && typeof m.color.copy === "function") {
          m.color.copy(m.userData._baseColor);
        }
        if (m.emissive && m.userData._baseEmissive && typeof m.emissive.copy === "function") {
          m.emissive.copy(m.userData._baseEmissive);
        }
        m.emissiveIntensity = m.userData._baseEmissiveIntensity !== undefined ? m.userData._baseEmissiveIntensity : 0;
      }
    }
  }

  function triggerStationSquash(stationObj) {
    if (!stationObj || !stationObj.visualRoot) return;
    stationObj.squashTimer = 0.22;
    stationObj.squashDuration = 0.22;
    stationObj.visualRoot.scale.set(1.15, 0.85, 1.15);
  }

  function updateStationSquash(stationObj, dt) {
    if (!stationObj || !stationObj.visualRoot || !(stationObj.squashTimer > 0)) return;
    stationObj.squashTimer = Math.max(0, stationObj.squashTimer - dt);
    var dur = stationObj.squashDuration || 0.22;
    var p = 1 - stationObj.squashTimer / dur;
    // Elastic damping curve back toward (1, 1, 1)
    var env = Math.exp(-5.5 * p) * Math.cos(p * Math.PI * 2.5);
    var sxz = 1 + 0.15 * env;
    var sy = 1 - 0.15 * env;
    stationObj.visualRoot.scale.set(sxz, sy, sxz);
    if (stationObj.squashTimer <= 0) {
      stationObj.visualRoot.scale.set(1, 1, 1);
    }
  }

  /* ------------------------------------------------------------------------
   * 1. HERO WIZARD (.glb Skeletal Character + Aura + Guide + BackStack)
   * ------------------------------------------------------------------------ */
  function createWizardModel() {
    var root = new THREE.Group();
    root.name = "WizardHero";

    var shadowMesh = createShadowDisc(0.75);
    root.add(shadowMesh);

    var auraGeo = new THREE.RingGeometry(0.62, 0.80, 32);
    auraGeo.rotateX(-Math.PI / 2);
    var auraMat = new THREE.MeshBasicMaterial({
      color: 0x5ceeff,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.position.y = 0.04;
    root.add(auraMesh);

    var guideArrowGroup = new THREE.Group();
    guideArrowGroup.position.y = 0.055;
    var arrowGeo = new THREE.PlaneGeometry(1.05, 1.05);
    arrowGeo.rotateX(-Math.PI / 2);
    arrowGeo.rotateY(Math.PI);
    var arrowMat = new THREE.MeshBasicMaterial({
      map: getGuideArrowTexture(),
      transparent: true,
      alphaTest: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.position.set(0, 0, 1.55);
    guideArrowGroup.add(arrowMesh);
    root.add(guideArrowGroup);

    var bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    var glb = AssetLoader.createInstance("wizard", {
      targetHeight: 1.8,
      tint: 0x4a90e2,
      tintStrength: 0.45
    });
    bodyPivot.add(glb.root);

    var backStackAnchor = new THREE.Group();
    backStackAnchor.position.set(0, 0.88, -0.45);
    root.add(backStackAnchor);

    return {
      root: root,
      bodyPivot: bodyPivot,
      glb: glb,
      materials: glb.materials,
      auraMesh: auraMesh,
      auraMat: auraMat,
      shadowMesh: shadowMesh,
      guideArrowGroup: guideArrowGroup,
      backStackAnchor: backStackAnchor,
      tierScale: 1,
      currentState: "idle"
    };
  }

  function updateWizardTier(wizard, tier) {
    if (!wizard || !wizard.auraMat) return;
    var tierColors = [0x5ceeff, 0xff7be5, 0xb388ff, 0xffd26e, 0xffeb7a];
    var col = tierColors[Math.max(0, Math.min(tierColors.length - 1, tier - 1))];
    wizard.auraMat.color.setHex(col);
    wizard.tierScale = 1 + (Math.max(1, tier) - 1) * 0.045;
  }

  function animateWizard(wizard, animState, dt) {
    if (!wizard || !wizard.bodyPivot) return;
    var spd = animState.speed || 0;
    var swingT = animState.swingTimer || 0;
    var time = animState.time || 0;

    var nextState = "idle";
    if (swingT > 0.01) nextState = "attack";
    else if (spd > 2.2) nextState = "run";
    else if (spd > 0.35) nextState = "walk";

    if (wizard.glb && wizard.glb.anim) {
      if (wizard.currentState !== nextState || nextState === "attack") {
        wizard.currentState = nextState;
        wizard.glb.anim.play(nextState, 0.15);
      }
      wizard.glb.anim.update(dt);
    }

    var ts = wizard.tierScale || 1;
    var bounceY = nextState === "run" || nextState === "walk" ? Math.abs(Math.sin(animState.walkPhase || 0)) * 0.04 : 0;
    wizard.bodyPivot.position.y = bounceY;
    wizard.bodyPivot.scale.set(ts, ts, ts);

    if (wizard.auraMesh) {
      var pulse = 1 + Math.sin(time * 4.0) * 0.05;
      wizard.auraMesh.scale.set(pulse, pulse, pulse);
    }
    if (wizard.shadowMesh) {
      var shS = Math.max(0.8, 1 - bounceY * 0.4);
      wizard.shadowMesh.scale.set(shS, shS, shS);
    }
  }

  /* ------------------------------------------------------------------------
   * 2. FAIRY WORKER, VILLAGE CUSTOMERS & SLIMES (.glb Skeletal Instances)
   * ------------------------------------------------------------------------ */
  function createFairyModel(idx) {
    var root = new THREE.Group();
    var shadowMesh = createShadowDisc(0.45);
    shadowMesh.position.y = -1.25;
    root.add(shadowMesh);

    var bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    var glb = AssetLoader.createInstance("fairy_worker", {
      targetHeight: 1.3,
      tint: idx % 2 === 0 ? 0xff9ef0 : 0x8cf4ff,
      tintStrength: 0.32
    });
    if (glb.anim) glb.anim.play("walk", 0.15);
    bodyPivot.add(glb.root);

    var bagAnchor = new THREE.Group();
    bagAnchor.position.set(0, -0.1, 0.25);
    root.add(bagAnchor);

    return {
      root: root,
      bodyPivot: bodyPivot,
      glb: glb,
      materials: glb.materials,
      bagAnchor: bagAnchor
    };
  }

  function animateFairy(model, dt) {
    if (!model) return;
    if (model.glb && model.glb.anim) {
      model.glb.anim.update(dt);
    }
  }

  function createCustomerModel(variantIdx) {
    var root = new THREE.Group();
    var shadowMesh = createShadowDisc(0.55);
    root.add(shadowMesh);

    var bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    var tints = [0x90e0ff, 0xffa6d0, 0xffe484, 0xa8f59a];
    var glb = AssetLoader.createInstance("customer", {
      targetHeight: 1.6,
      tint: tints[variantIdx % tints.length],
      tintStrength: 0.28
    });
    bodyPivot.add(glb.root);

    return {
      root: root,
      bodyPivot: bodyPivot,
      glb: glb,
      materials: glb.materials,
      currentState: "idle"
    };
  }

  function animateCustomer(model, walking, dt) {
    if (!model) return;
    var nextState = walking ? "walk" : "idle";
    if (model.glb && model.glb.anim) {
      if (model.currentState !== nextState) {
        model.currentState = nextState;
        model.glb.anim.play(nextState, 0.15);
      }
      model.glb.anim.update(dt);
    }
  }

  function createSlimeModel(isKing) {
    var root = new THREE.Group();
    var shadowMesh = createShadowDisc(isKing ? 1.55 : 0.65);
    root.add(shadowMesh);

    var bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    var glb = AssetLoader.createInstance(isKing ? "slime_king" : "slime_normal", {
      targetHeight: isKing ? 3.2 : 1.2,
      tint: isKing ? 0xff4fa8 : 0x56f084,
      tintStrength: isKing ? 0.42 : 0.36
    });
    if (glb.anim) glb.anim.play("walk", 0.15);
    bodyGroup.add(glb.root);

    var hpBarHolder = null;
    var hpBarFill = null;
    if (isKing) {
      hpBarHolder = new THREE.Group();
      hpBarHolder.position.set(0, 3.65, 0);

      var bg = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x241434, side: THREE.DoubleSide })
      );
      hpBarHolder.add(bg);

      hpBarFill = new THREE.Mesh(
        new THREE.PlaneGeometry(2.34, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xff5a9c, side: THREE.DoubleSide })
      );
      hpBarFill.position.z = 0.02;
      hpBarHolder.add(hpBarFill);
      root.add(hpBarHolder);
    }

    return {
      root: root,
      bodyGroup: bodyGroup,
      shadowMesh: shadowMesh,
      glb: glb,
      materials: glb.materials,
      hpBarHolder: hpBarHolder,
      hpBarFill: hpBarFill,
      flashTimer: 0,
      _isFlashing: false
    };
  }

  /* ------------------------------------------------------------------------
   * 3. ALCHEMY STATIONS & HARVESTER CART (.glb + Squash-and-Stretch Root)
   * ------------------------------------------------------------------------ */
  function createCauldronStation() {
    var root = new THREE.Group();
    var shadowMesh = createShadowDisc(1.45);
    root.add(shadowMesh);

    var visualRoot = new THREE.Group();
    root.add(visualRoot);

    var glb = AssetLoader.createInstance("cauldron", {
      targetHeight: 1.15,
      tint: 0xd99b43,
      tintStrength: 0.3
    });
    visualRoot.add(glb.root);

    var glowMat = new THREE.MeshBasicMaterial({
      color: 0xff7ae6,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var liquidGeo = new THREE.RingGeometry(0.85, 1.18, 28);
    liquidGeo.rotateX(-Math.PI / 2);
    var liquidRing = new THREE.Mesh(liquidGeo, glowMat);
    liquidRing.position.y = 0.048;
    root.add(liquidRing);

    var stirGroup = new THREE.Group();
    stirGroup.position.set(0, 1.05, 0);
    root.add(stirGroup);

    var bubbles = [];
    var bubbleColors = [0xff8af4, 0x72f2ff, 0xffe066, 0xa2ffb8, 0xff9ad8];
    var bGeo = new THREE.PlaneGeometry(0.4, 0.4);
    for (var i = 0; i < 5; i++) {
      var bMat = new THREE.MeshBasicMaterial({
        map: Engine.getGlowTexture(),
        color: bubbleColors[i % bubbleColors.length],
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      var bMesh = new THREE.Mesh(bGeo, bMat);
      root.add(bMesh);
      bubbles.push({
        mesh: bMesh,
        baseAngle: (i / 5) * Math.PI * 2,
        phase: i * 0.22
      });
    }

    return {
      root: root,
      visualRoot: visualRoot,
      glb: glb,
      stirGroup: stirGroup,
      liquidMat: glowMat,
      bubbles: bubbles,
      squashTimer: 0,
      squashDuration: 0.22
    };
  }

  function createSalesStation() {
    var root = new THREE.Group();
    var shadowMesh = createShadowDisc(1.9);
    root.add(shadowMesh);

    var visualRoot = new THREE.Group();
    root.add(visualRoot);

    var glb = AssetLoader.createInstance("sales_stall", {
      targetHeight: 2.5
    });
    visualRoot.add(glb.root);

    var stockAnchor = new THREE.Group();
    stockAnchor.position.set(0.05, 0.9, 0.72);
    root.add(stockAnchor);

    return {
      root: root,
      visualRoot: visualRoot,
      glb: glb,
      stockAnchor: stockAnchor,
      squashTimer: 0,
      squashDuration: 0.22
    };
  }

  function createGemPedestal() {
    var root = new THREE.Group();
    var shadowMesh = createShadowDisc(1.0);
    root.add(shadowMesh);

    var visualRoot = new THREE.Group();
    root.add(visualRoot);

    var glb = AssetLoader.createInstance("gem_pedestal", {
      targetHeight: 0.85,
      tint: 0xffd26e,
      tintStrength: 0.22
    });
    visualRoot.add(glb.root);

    var stackAnchor = new THREE.Group();
    stackAnchor.position.set(0, 0.68, 0);
    root.add(stackAnchor);

    return {
      root: root,
      visualRoot: visualRoot,
      glb: glb,
      stackAnchor: stackAnchor,
      squashTimer: 0,
      squashDuration: 0.22
    };
  }

  function createHarvesterCartModel() {
    var root = new THREE.Group();
    var shadowMesh = createShadowDisc(1.2);
    root.add(shadowMesh);

    var bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    var glb = AssetLoader.createInstance("harvester_cart", {
      targetHeight: 1.6
    });
    bodyPivot.add(glb.root);

    var cargoAnchor = new THREE.Group();
    cargoAnchor.position.set(0, 0.88, -0.1);
    root.add(cargoAnchor);

    return {
      root: root,
      bodyPivot: bodyPivot,
      glb: glb,
      cargoAnchor: cargoAnchor
    };
  }

  function createResourceNodeModel(type) {
    var root = new THREE.Group();
    var bodyGroup = new THREE.Group();
    root.add(bodyGroup);

    var isCrystal = type === "starlight_crystal";
    var role = isCrystal ? "rock_crystal" : "berry_bush";
    var glb = AssetLoader.createInstance(role, {
      targetHeight: isCrystal ? 1.35 : 1.25,
      tint: isCrystal ? 0x62ecff : 0xff6ebc,
      tintStrength: 0.45,
      emissiveTint: isCrystal ? 0x1680b0 : 0x8c1e58,
      emissiveIntensity: 0.24
    });
    bodyGroup.add(glb.root);

    return {
      root: root,
      bodyGroup: bodyGroup,
      glb: glb,
      materials: glb.materials,
      flashTimer: 0,
      _isFlashing: false
    };
  }

  /* ------------------------------------------------------------------------
   * 4. .glb STACK BLOCKS, MANA GEMS & 3D DEBRIS / COMBAT VFX
   * ------------------------------------------------------------------------ */
  function createResourceMesh(type) {
    if (type === "mana_gem") {
      var gemInst = AssetLoader.createInstance("mana_gem", {
        targetHeight: 0.18,
        tint: 0x3ef2ff,
        tintStrength: 0.55,
        emissiveTint: 0x0f91b5,
        emissiveIntensity: 0.38
      });
      return gemInst.root;
    }

    var palette = {
      starlight_crystal: { tint: 0x5cd8ff, em: 0x1278a8 },
      rainbow_berry: { tint: 0xff6ebb, em: 0x991c5d },
      slime_jelly: { tint: 0x72f582, em: 0x1a8f38 },
      rainbow_potion: { tint: 0xd07eff, em: 0x7c20b8 }
    };
    var pal = palette[type] || palette.starlight_crystal;
    var blockInst = AssetLoader.createInstance("stack_block", {
      targetHeight: 0.22,
      tint: pal.tint,
      tintStrength: 0.55,
      emissiveTint: pal.em,
      emissiveIntensity: 0.24
    });
    return blockInst.root;
  }

  function createDebrisMesh(colorHex) {
    var geo = new THREE.OctahedronGeometry(0.12, 0);
    var mat = new THREE.MeshStandardMaterial({
      color: colorHex !== undefined ? colorHex : 0xffe066,
      emissive: colorHex !== undefined ? colorHex : 0xffe066,
      emissiveIntensity: 0.3,
      roughness: 0.35,
      metalness: 0.15
    });
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  }

  function createProjectileMesh(colorHex) {
    var g = new THREE.Group();
    var c = colorHex !== undefined ? colorHex : 0xffe46b;
    var mat = new THREE.MeshBasicMaterial({
      map: Engine.getGlowTexture(),
      color: c,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    var flare = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), mat);
    g.add(flare);

    var core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    g.add(core);
    return g;
  }

  function createShockwaveRing(colorHex) {
    var geo = new THREE.RingGeometry(0.45, 0.62, 28);
    geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshBasicMaterial({
      color: colorHex !== undefined ? colorHex : 0xffffff,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    return new THREE.Mesh(geo, mat);
  }

  function createSparkParticle(colorHex) {
    var mat = new THREE.MeshBasicMaterial({
      map: Engine.getGlowTexture(),
      color: colorHex !== undefined ? colorHex : 0xffe066,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), mat);
  }

  function createSlashArcMesh(colorHex) {
    var g = new THREE.Group();
    var outerGeo = new THREE.RingGeometry(0.68, 1.15, 24, 1, -0.45, Math.PI * 0.9);
    outerGeo.rotateX(-Math.PI / 2);
    var outerMat = new THREE.MeshBasicMaterial({
      color: colorHex !== undefined ? colorHex : 0x72f2ff,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    g.add(new THREE.Mesh(outerGeo, outerMat));

    var innerGeo = new THREE.RingGeometry(0.76, 1.0, 24, 1, -0.4, Math.PI * 0.8);
    innerGeo.rotateX(-Math.PI / 2);
    var innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.position.y = 0.025;
    g.add(innerMesh);

    return { root: g, outerMat: outerMat, innerMat: innerMat };
  }

  /* ------------------------------------------------------------------------
   * 5. SLEEK 3D RING PROGRESS-ARC STEP-TO-PAY PADS + FLOATING LABEL
   * ------------------------------------------------------------------------ */
  function createStepPad(cfg) {
    var root = new THREE.Group();
    root.position.set(cfg.x, 0.038, cfg.z);

    var size = cfg.size || 2.8;
    var ringR = size * 0.48;
    var accentHex = cfg.accentHex !== undefined ? cfg.accentHex : 0x5cf2a8;

    var innerDiscMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var innerDisc = new THREE.Mesh(new THREE.CircleGeometry(ringR - 0.16, 36), innerDiscMat);
    innerDisc.rotation.x = -Math.PI / 2;
    root.add(innerDisc);

    var trackMat = new THREE.MeshBasicMaterial({
      color: 0x241434,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var trackRing = new THREE.Mesh(new THREE.RingGeometry(ringR - 0.16, ringR, 48), trackMat);
    trackRing.rotation.x = -Math.PI / 2;
    trackRing.position.y = 0.008;
    root.add(trackRing);

    var arcMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var arcGeo = new THREE.RingGeometry(ringR - 0.15, ringR - 0.01, 48, 1, Math.PI * 0.5, 0.02);
    var arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.rotation.x = -Math.PI / 2;
    arcMesh.position.y = 0.016;
    root.add(arcMesh);

    // Compact semi-transparent floating billboard label above the ring
    var canvas = null;
    var ctx2d = null;
    var texture = new THREE.Texture();
    if (typeof document !== "undefined") {
      canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 108;
      ctx2d = canvas.getContext("2d");
      texture = new THREE.CanvasTexture(canvas);
      if (THREE.sRGBEncoding !== undefined) texture.encoding = THREE.sRGBEncoding;
      texture.anisotropy = 4;
    }

    var labelMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    var labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 0.72), labelMat);
    labelMesh.position.set(0, 1.32, -0.32);
    root.add(labelMesh);

    return {
      id: cfg.id,
      root: root,
      ringR: ringR,
      accentHex: accentHex,
      accentCss: cfg.accentCss || "#43d997",
      innerDiscMat: innerDiscMat,
      arcMesh: arcMesh,
      arcMat: arcMat,
      labelMesh: labelMesh,
      canvas: canvas,
      ctx2d: ctx2d,
      texture: texture,
      lastCacheKey: "",
      lastArcBucket: -1
    };
  }

  function updateStepPadTexture(pad, info) {
    if (!pad) return;
    var ratio = Math.max(0, Math.min(1, info.progressRatio || 0));
    var pctBucket = Math.round(ratio * 48);

    // Update 3D circular progress arc geometry cleanly when bucket changes
    if (pad.arcMesh && pad.lastArcBucket !== pctBucket) {
      pad.lastArcBucket = pctBucket;
      var sweep = info.isDone ? Math.PI * 2 : Math.max(0.06, ratio * Math.PI * 2);
      var newGeo = new THREE.RingGeometry(pad.ringR - 0.15, pad.ringR - 0.01, 48, 1, Math.PI * 0.5, sweep);
      if (pad.arcMesh.geometry && typeof pad.arcMesh.geometry.dispose === "function") {
        pad.arcMesh.geometry.dispose();
      }
      pad.arcMesh.geometry = newGeo;
    }

    if (pad.innerDiscMat) {
      pad.innerDiscMat.opacity = info.activeGlow ? 0.26 : 0.11;
    }
    if (pad.arcMat) {
      pad.arcMat.color.setHex(info.isDone ? 0x7effb2 : pad.accentHex);
      pad.arcMat.opacity = info.activeGlow ? 1.0 : 0.85;
    }

    if (!pad.ctx2d) return;
    var cacheKey = info.title + "|" + info.remainingCost + "|" + pctBucket + "|" + !!info.isDone + "|" + (info.actionHint || "") + "|" + !!info.activeGlow;
    if (pad.lastCacheKey === cacheKey) return;
    pad.lastCacheKey = cacheKey;

    var c = pad.ctx2d;
    var W = 320;
    var H = 108;
    c.clearRect(0, 0, W, H);

    // Sleek compact translucent floating pill
    c.fillStyle = info.activeGlow ? "rgba(42, 24, 68, 0.88)" : "rgba(28, 16, 46, 0.78)";
    drawRoundedRectPath(c, 6, 6, W - 12, H - 12, 22);
    c.fill();

    c.strokeStyle = info.isDone ? "#7effb2" : pad.accentCss;
    c.lineWidth = info.activeGlow ? 5 : 3.5;
    c.stroke();

    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#fff9e6";
    c.font = "900 28px 'Pretendard', 'Malgun Gothic', sans-serif";
    c.fillText(info.title, W * 0.5, 36);

    if (info.isActionOnly) {
      c.fillStyle = "#ffe88c";
      c.font = "900 24px 'Pretendard', 'Malgun Gothic', sans-serif";
      c.fillText(info.actionHint || "투입", W * 0.5, 74);
    } else if (info.isDone) {
      c.fillStyle = "#7effb2";
      c.font = "900 26px 'Pretendard', 'Malgun Gothic', sans-serif";
      c.fillText("MAX", W * 0.5, 74);
    } else {
      c.fillStyle = "#5ef2ff";
      c.font = "900 28px 'Pretendard', 'Malgun Gothic', sans-serif";
      c.fillText("💎 " + String(info.remainingCost), W * 0.5, 74);
    }

    pad.texture.needsUpdate = true;
  }

  var EntitiesApi = {
    createWizardModel: createWizardModel,
    updateWizardTier: updateWizardTier,
    animateWizard: animateWizard,
    createFairyModel: createFairyModel,
    animateFairy: animateFairy,
    createCustomerModel: createCustomerModel,
    animateCustomer: animateCustomer,
    createSlimeModel: createSlimeModel,
    createCauldronStation: createCauldronStation,
    createSalesStation: createSalesStation,
    createGemPedestal: createGemPedestal,
    createHarvesterCartModel: createHarvesterCartModel,
    createResourceNodeModel: createResourceNodeModel,
    createResourceMesh: createResourceMesh,
    createDebrisMesh: createDebrisMesh,
    createProjectileMesh: createProjectileMesh,
    createShockwaveRing: createShockwaveRing,
    createSparkParticle: createSparkParticle,
    createSlashArcMesh: createSlashArcMesh,
    createStepPad: createStepPad,
    updateStepPadTexture: updateStepPadTexture,
    flashModelWhite: flashModelWhite,
    updateModelFlash: updateModelFlash,
    triggerStationSquash: triggerStationSquash,
    updateStationSquash: updateStationSquash
  };

  if (typeof window !== "undefined") {
    window.Entities = EntitiesApi;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = EntitiesApi;
  }
})();
