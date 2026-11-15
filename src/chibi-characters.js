// =============================================================================
// src/chibi-characters.js - Cel-Shaded 2-Head-Tall Storybook 3D Character &
// Wide-Crate / Conveyor-Machine / Mega-Harvester Procedural Builder
// =============================================================================
// No gray robots, no mint sphere skewers.
// Every mesh uses warm MeshToonMaterial (4-step cel-shading gradient map) and
// crisp inverted-hull dark plum-brown outlines (THREE.BackSide) with shared
// geometries & materials for high frame rates even with 200+ stacked crates.
// =============================================================================

(function () {
  "use strict";

  const OUTLINE_COLOR = 0x2b182e;

  let _toonGradient = null;
  const _matCache = new Map();
  const _geoCache = new Map();

  function getToonGradientMap() {
    if (_toonGradient) return _toonGradient;
    if (typeof THREE.DataTexture !== "function" || typeof Uint8Array === "undefined") {
      return null;
    }
    const steps = [104, 164, 218, 255];
    const data = new Uint8Array(steps.length * 4);
    for (let i = 0; i < steps.length; i++) {
      const v = steps[i];
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    _toonGradient = tex;
    return _toonGradient;
  }

  function makeToonMat(color, opts = {}) {
    const emissive = opts.emissive || 0x000000;
    const emissiveIntensity = opts.emissiveIntensity || 0;
    const transparent = !!opts.transparent;
    const opacity = opts.opacity != null ? opts.opacity : 1;
    const doubleSide = !!opts.doubleSide;
    const uncached = !!opts.uncached;
    const key = `${color}|${emissive}|${emissiveIntensity}|${transparent}|${opacity}|${doubleSide}`;
    if (!uncached && _matCache.has(key)) return _matCache.get(key);

    const MatClass = THREE.MeshToonMaterial || THREE.MeshLambertMaterial || THREE.MeshBasicMaterial;
    const params = {
      color,
      transparent,
      opacity,
    };
    if (MatClass === THREE.MeshToonMaterial) {
      const gm = getToonGradientMap();
      if (gm) params.gradientMap = gm;
    }
    if (emissive && MatClass !== THREE.MeshBasicMaterial) {
      params.emissive = emissive;
      params.emissiveIntensity = emissiveIntensity;
    }
    if (doubleSide && THREE.DoubleSide !== undefined) {
      params.side = THREE.DoubleSide;
    }
    const mat = new MatClass(params);
    if (!uncached) _matCache.set(key, mat);
    return mat;
  }

  function getOutlineMat(color = OUTLINE_COLOR) {
    const key = `outline|${color}`;
    if (_matCache.has(key)) return _matCache.get(key);
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide !== undefined ? THREE.BackSide : 1,
    });
    _matCache.set(key, mat);
    return mat;
  }

  function cachedGeo(key, builder) {
    if (_geoCache.has(key)) return _geoCache.get(key);
    const g = builder();
    _geoCache.set(key, g);
    return g;
  }

  function addOutlinedMesh(parent, geometry, material, opts = {}) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = opts.castShadow !== false;
    mesh.receiveShadow = opts.receiveShadow !== false;
    if (opts.pos) mesh.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
    if (opts.rot) mesh.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
    if (opts.scale) mesh.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
    parent.add(mesh);

    if (opts.outline !== false && THREE.BackSide !== undefined) {
      const s = opts.outlineScale || 1.07;
      const out = new THREE.Mesh(geometry, getOutlineMat(opts.outlineColor || OUTLINE_COLOR));
      out.scale.set(s, s, s);
      out.castShadow = false;
      out.receiveShadow = false;
      mesh.add(out);
    }
    return mesh;
  }

  function makeShadowCircle(radius = 0.65, opacity = 0.24) {
    const geo = cachedGeo(`shadow_${radius}`, () => new THREE.CircleGeometry(radius, 20));
    const mat = new THREE.MeshBasicMaterial({
      color: 0x20152e,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI * 0.5;
    m.position.y = 0.025;
    return m;
  }

  function buildCuteEyesAndCheeks(headGroup, zFace = 0.41, eyeSpread = 0.145, eyeY = -0.02) {
    const eyeGeo = cachedGeo("chibi_eye", () => new THREE.SphereGeometry(0.068, 12, 10));
    const glintGeo = cachedGeo("chibi_glint", () => new THREE.SphereGeometry(0.024, 8, 8));
    const cheekGeo = cachedGeo("chibi_cheek", () => new THREE.SphereGeometry(0.072, 10, 8));

    const eyeMat = makeToonMat(0x1e1326);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cheekMat = makeToonMat(0xff8ea8);

    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.scale.set(0.95, 1.28, 0.55);
      eye.position.set(side * eyeSpread, eyeY, zFace);
      headGroup.add(eye);

      const glint = new THREE.Mesh(glintGeo, glintMat);
      glint.position.set(side * eyeSpread + 0.018, eyeY + 0.032, zFace + 0.036);
      headGroup.add(glint);

      const cheek = new THREE.Mesh(cheekGeo, cheekMat);
      cheek.scale.set(1.25, 0.72, 0.45);
      cheek.position.set(side * (eyeSpread + 0.095), eyeY - 0.088, zFace - 0.045);
      headGroup.add(cheek);
    });
  }

  function makeStarGeometry(outerR = 0.15, innerR = 0.065, depth = 0.03) {
    return cachedGeo(`star_${outerR}`, () => {
      if (typeof THREE.Shape !== "function" || typeof THREE.ExtrudeGeometry !== "function") {
        return new THREE.OctahedronGeometry(outerR * 0.75, 0);
      }
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      geo.center();
      return geo;
    });
  }

  function makeArrowShapeGeometry(headW = 1.18, headL = 0.95, shaftW = 0.52, shaftL = 1.05, depth = 0.12) {
    return cachedGeo(`arrow_${headW}_${headL}_${shaftW}_${shaftL}_${depth}`, () => {
      if (typeof THREE.Shape !== "function" || typeof THREE.ExtrudeGeometry !== "function") {
        const g = new THREE.ConeGeometry(headW * 0.5, headL + shaftL, 6);
        g.rotateX(Math.PI * 0.5);
        return g;
      }
      const hw = headW * 0.5;
      const sw = shaftW * 0.5;
      const tipY = shaftL * 0.5 + headL;
      const neckY = shaftL * 0.5;
      const tailY = -shaftL * 0.5;

      const shape = new THREE.Shape();
      shape.moveTo(0, tipY);
      shape.lineTo(hw, neckY);
      shape.lineTo(sw, neckY);
      shape.lineTo(sw, tailY);
      shape.lineTo(-sw, tailY);
      shape.lineTo(-sw, neckY);
      shape.lineTo(-hw, neckY);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      geo.center();
      geo.rotateX(Math.PI * 0.5);
      return geo;
    });
  }

  // ===========================================================================
  // 1. 2-Head-Tall Alchemist Hero (꼬마 연금술사 주인공)
  // ===========================================================================
  const HERO_TIERS = [
    { robe: 0x4b6bd6, hat: 0x4862cc, trim: 0xffd24c, cape: 0xffc83b, aura: 0x62ebff },
    { robe: 0x7b52d9, hat: 0x6c43cc, trim: 0xffe066, cape: 0xffb347, aura: 0xa47cff },
    { robe: 0x2ea87e, hat: 0x26926c, trim: 0xffe575, cape: 0xffcf54, aura: 0x5effb8 },
    { robe: 0xd94875, hat: 0xc23862, trim: 0xffe97d, cape: 0xffdb5c, aura: 0xff7fb2 },
    { robe: 0xf09c2b, hat: 0xdf8217, trim: 0xfff3a8, cape: 0xfff08a, aura: 0xffe86b },
  ];

  function createAlchemistHero() {
    const root = new THREE.Group();
    const shadowMesh = makeShadowCircle(0.76, 0.25);
    root.add(shadowMesh);

    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x62ebff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const auraMesh = new THREE.Mesh(
      cachedGeo("hero_aura_ring", () => new THREE.RingGeometry(0.68, 0.86, 28)),
      auraMat
    );
    auraMesh.rotation.x = -Math.PI * 0.5;
    auraMesh.position.y = 0.032;
    root.add(auraMesh);

    // Single Large Clean 3D Guide Arrow in front of Hero feet
    const guideArrowGroup = new THREE.Group();
    guideArrowGroup.position.y = 0.12;
    const guideArrowMat = makeToonMat(0xffe629, {
      emissive: 0xffb800,
      emissiveIntensity: 0.32,
      uncached: true,
    });
    const arrowGeo = makeArrowShapeGeometry(1.10, 0.88, 0.44, 0.90, 0.14);
    const arrowMesh = addOutlinedMesh(
      guideArrowGroup,
      arrowGeo,
      guideArrowMat,
      { pos: [0, 0.08, 1.85], castShadow: false, receiveShadow: false, outlineScale: 1.07 }
    );
    guideArrowGroup.userData.arrowMesh = arrowMesh;
    root.add(guideArrowGroup);

    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const palette = HERO_TIERS[0];
    const matRobe = makeToonMat(palette.robe, { uncached: true });
    const matHat = makeToonMat(palette.hat, { uncached: true });
    const matTrim = makeToonMat(palette.trim, { uncached: true });
    const matCape = makeToonMat(palette.cape, { uncached: true });
    const matSkin = makeToonMat(0xffd6ba);
    const matHair = makeToonMat(0x7c482e);
    const matBoot = makeToonMat(0x523228);
    const matWood = makeToonMat(0x9a6439);
    const matDarkWood = makeToonMat(0x6b4122);

    // Legs & sturdy boots
    const legGeo = cachedGeo("hero_leg", () => new THREE.CylinderGeometry(0.11, 0.13, 0.34, 10));
    const bootGeo = cachedGeo("hero_boot", () => new THREE.SphereGeometry(0.15, 10, 8));

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.18, 0.32, 0);
    addOutlinedMesh(leftLeg, legGeo, matRobe, { pos: [0, -0.06, 0] });
    addOutlinedMesh(leftLeg, bootGeo, matBoot, { pos: [0, -0.22, 0.05], scale: [1.0, 0.72, 1.32] });
    bodyPivot.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.18, 0.32, 0);
    addOutlinedMesh(rightLeg, legGeo, matRobe, { pos: [0, -0.06, 0] });
    addOutlinedMesh(rightLeg, bootGeo, matBoot, { pos: [0, -0.22, 0.05], scale: [1.0, 0.72, 1.32] });
    bodyPivot.add(rightLeg);

    // Plump A-line alchemist robe torso
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("hero_robe", () => new THREE.CylinderGeometry(0.30, 0.50, 0.68, 16)),
      matRobe,
      { pos: [0, 0.60, 0], outlineScale: 1.06 }
    );
    // Gold robe bottom hem & cream collar scarf
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("hero_hem", () => new THREE.TorusGeometry(0.47, 0.045, 8, 20)),
      matTrim,
      { pos: [0, 0.28, 0], rot: [Math.PI * 0.5, 0, 0], outlineScale: 1.08 }
    );
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("hero_collar", () => new THREE.TorusGeometry(0.28, 0.068, 8, 16)),
      makeToonMat(0xfff4de),
      { pos: [0, 0.90, 0.02], rot: [Math.PI * 0.5, 0, 0], outlineScale: 1.08 }
    );
    // Waist belt + pouch
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("hero_belt", () => new THREE.CylinderGeometry(0.36, 0.38, 0.10, 14)),
      matDarkWood,
      { pos: [0, 0.54, 0], outlineScale: 1.06 }
    );
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("hero_buckle", () => new THREE.BoxGeometry(0.15, 0.13, 0.08)),
      matTrim,
      { pos: [0, 0.54, 0.36], outlineScale: 1.1 }
    );

    // Star-patterned yellow cloak on back
    const capeMesh = new THREE.Group();
    capeMesh.position.set(0, 0.88, -0.22);
    addOutlinedMesh(
      capeMesh,
      cachedGeo("hero_cape", () => new THREE.ConeGeometry(0.42, 0.62, 10, 1, false, -Math.PI * 0.42, Math.PI * 0.84)),
      matCape,
      { pos: [0, -0.28, -0.08], rot: [0.22, Math.PI, 0], scale: [1.1, 1.0, 0.55], outlineScale: 1.07 }
    );
    addOutlinedMesh(
      capeMesh,
      makeStarGeometry(0.14, 0.06, 0.03),
      makeToonMat(0xfff7b8, { emissive: 0xffe46b, emissiveIntensity: 0.2 }),
      { pos: [0, -0.34, -0.25], rot: [0.22, 0, 0], outline: false }
    );
    bodyPivot.add(capeMesh);

    // Sturdy Wooden Backpack Carrier ("지게" frame) for holding wide 0.95m crates
    const backpack = new THREE.Group();
    backpack.position.set(0, 0.62, -0.34);
    const postGeo = cachedGeo("pack_post", () => new THREE.BoxGeometry(0.08, 0.72, 0.08));
    addOutlinedMesh(backpack, postGeo, matWood, { pos: [-0.22, 0.14, 0] });
    addOutlinedMesh(backpack, postGeo, matWood, { pos: [0.22, 0.14, 0] });
    const barGeo = cachedGeo("pack_bar", () => new THREE.BoxGeometry(0.56, 0.075, 0.08));
    addOutlinedMesh(backpack, barGeo, matDarkWood, { pos: [0, 0.32, -0.02] });
    addOutlinedMesh(backpack, barGeo, matDarkWood, { pos: [0, -0.04, -0.02] });
    // Bottom horizontal carrier ledge where crate stacks rest
    addOutlinedMesh(
      backpack,
      cachedGeo("pack_ledge", () => new THREE.BoxGeometry(0.68, 0.08, 0.42)),
      matWood,
      { pos: [0, -0.14, -0.20] }
    );
    bodyPivot.add(backpack);

    // Wide crates stack cleanly right above the carrier ledge behind hero
    const backStackAnchor = new THREE.Group();
    backStackAnchor.position.set(0, 0.58, -0.58);
    bodyPivot.add(backStackAnchor);

    // Arms + Right-hand Crystal Alchemist Staff
    const sleeveGeo = cachedGeo("hero_arm", () => new THREE.CylinderGeometry(0.10, 0.14, 0.38, 10));
    const handGeo = cachedGeo("hero_hand", () => new THREE.SphereGeometry(0.105, 10, 8));

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.37, 0.84, 0.02);
    addOutlinedMesh(leftArm, sleeveGeo, matRobe, { pos: [0, -0.16, 0], rot: [0, 0, -0.18] });
    addOutlinedMesh(leftArm, handGeo, matSkin, { pos: [-0.04, -0.36, 0.02] });
    bodyPivot.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.37, 0.84, 0.02);
    addOutlinedMesh(rightArm, sleeveGeo, matRobe, { pos: [0, -0.16, 0], rot: [0, 0, 0.18] });
    addOutlinedMesh(rightArm, handGeo, matSkin, { pos: [0.04, -0.36, 0.02] });

    // Glowing Alchemist Staff held in right hand
    const staffGroup = new THREE.Group();
    staffGroup.position.set(0.06, -0.36, 0.12);
    staffGroup.rotation.x = Math.PI * 0.36;
    addOutlinedMesh(
      staffGroup,
      cachedGeo("staff_shaft", () => new THREE.CylinderGeometry(0.038, 0.032, 1.08, 8)),
      matWood,
      { pos: [0, 0.25, 0] }
    );
    addOutlinedMesh(
      staffGroup,
      cachedGeo("staff_ring", () => new THREE.TorusGeometry(0.11, 0.03, 8, 14)),
      matTrim,
      { pos: [0, 0.82, 0] }
    );
    addOutlinedMesh(
      staffGroup,
      cachedGeo("staff_gem", () => new THREE.OctahedronGeometry(0.135, 0)),
      makeToonMat(0x5ef0ff, { emissive: 0x3ad8ff, emissiveIntensity: 0.55 }),
      { pos: [0, 0.90, 0], scale: [0.9, 1.25, 0.9] }
    );
    rightArm.add(staffGroup);
    bodyPivot.add(rightArm);

    // Big 2등신 Storybook Head + Floppy Pointed Alchemist Hat
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.30, 0.02);
    addOutlinedMesh(
      headGroup,
      cachedGeo("hero_head", () => new THREE.SphereGeometry(0.45, 20, 16)),
      matSkin,
      { scale: [1.04, 0.96, 1.0], outlineScale: 1.05 }
    );
    buildCuteEyesAndCheeks(headGroup, 0.42, 0.155, -0.04);

    // Cute hair bangs framing forehead + sidelocks
    addOutlinedMesh(
      headGroup,
      cachedGeo("hero_hair_cap", () => new THREE.SphereGeometry(0.465, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52)),
      matHair,
      { pos: [0, 0.06, -0.02], rot: [-0.24, 0, 0], outlineScale: 1.05 }
    );
    [-1, 1].forEach((side) => {
      addOutlinedMesh(
        headGroup,
        cachedGeo("hero_sidelock", () => new THREE.SphereGeometry(0.13, 10, 8)),
        matHair,
        { pos: [side * 0.38, -0.06, 0.14], scale: [0.85, 1.35, 0.9], outlineScale: 1.08 }
      );
    });

    // Big Pastel Alchemist Pointed Hat with Wide Brim & Gold Buckle
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.29, -0.03);
    hatGroup.rotation.x = -0.14;
    addOutlinedMesh(
      hatGroup,
      cachedGeo("hat_brim", () => new THREE.CylinderGeometry(0.76, 0.80, 0.075, 22)),
      matHat,
      { pos: [0, 0, 0], outlineScale: 1.05 }
    );
    addOutlinedMesh(
      hatGroup,
      cachedGeo("hat_band", () => new THREE.CylinderGeometry(0.45, 0.48, 0.13, 18)),
      matTrim,
      { pos: [0, 0.09, 0], outlineScale: 1.06 }
    );
    addOutlinedMesh(
      hatGroup,
      cachedGeo("hat_buckle", () => new THREE.BoxGeometry(0.19, 0.16, 0.09)),
      makeToonMat(0xfff1a6, { emissive: 0xffd24c, emissiveIntensity: 0.2 }),
      { pos: [0, 0.095, 0.46], outlineScale: 1.09 }
    );
    addOutlinedMesh(
      hatGroup,
      cachedGeo("hat_cone_low", () => new THREE.CylinderGeometry(0.24, 0.44, 0.42, 16)),
      matHat,
      { pos: [0, 0.34, 0], outlineScale: 1.05 }
    );
    addOutlinedMesh(
      hatGroup,
      cachedGeo("hat_cone_tip", () => new THREE.ConeGeometry(0.24, 0.46, 14)),
      matHat,
      { pos: [-0.08, 0.67, -0.11], rot: [-0.42, 0, 0.32], outlineScale: 1.06 }
    );
    headGroup.add(hatGroup);
    bodyPivot.add(headGroup);

    return {
      root,
      bodyPivot,
      headGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      capeMesh,
      auraMesh,
      auraMat,
      shadowMesh,
      guideArrowGroup,
      guideArrowMat,
      backStackAnchor,
      materials: { robe: matRobe, hat: matHat, trim: matTrim, cape: matCape },
      tierScale: 1.0,
    };
  }

  function updateHeroTier(hero, tier) {
    if (!hero) return;
    const idx = Math.max(0, Math.min(HERO_TIERS.length - 1, tier | 0));
    const p = HERO_TIERS[idx];
    hero.tierScale = 1 + Math.min(tier, 5) * 0.045;
    if (hero.materials) {
      if (hero.materials.robe && hero.materials.robe.color) hero.materials.robe.color.setHex(p.robe);
      if (hero.materials.hat && hero.materials.hat.color) hero.materials.hat.color.setHex(p.hat);
      if (hero.materials.trim && hero.materials.trim.color) hero.materials.trim.color.setHex(p.trim);
      if (hero.materials.cape && hero.materials.cape.color) hero.materials.cape.color.setHex(p.cape);
    }
    if (hero.auraMat && hero.auraMat.color) {
      hero.auraMat.color.setHex(p.aura);
      hero.auraMat.opacity = 0.22 + Math.min(tier, 5) * 0.045;
    }
  }

  function animateHero(hero, state, dt) {
    if (!hero || !hero.bodyPivot) return;
    const speed = state.speed || 0;
    const walkPhase = state.walkPhase || 0;
    const swingTimer = state.swingTimer || 0;
    const swingDuration = state.swingDuration || 0.28;
    const time = state.time || 0;

    const moveFactor = Math.min(1, speed / 7.5);
    const stepSin = Math.sin(walkPhase);
    const bounce = Math.abs(stepSin) * 0.095 * moveFactor + Math.sin(time * 3.0) * 0.018 * (1 - moveFactor);

    const sc = hero.tierScale || 1.0;
    hero.bodyPivot.scale.set(sc, sc, sc);
    hero.bodyPivot.position.y = bounce;

    const legSwing = stepSin * 0.68 * moveFactor;
    if (hero.leftLeg) hero.leftLeg.rotation.x = legSwing;
    if (hero.rightLeg) hero.rightLeg.rotation.x = -legSwing;
    if (hero.leftArm) hero.leftArm.rotation.x = -legSwing * 0.85 - 0.12 * moveFactor;

    let swingArmAngle = legSwing * 0.85;
    let torsoTwist = stepSin * 0.06 * moveFactor;
    if (swingTimer > 0) {
      const p = 1 - Math.max(0, Math.min(1, swingTimer / swingDuration));
      const arc = Math.sin(p * Math.PI);
      swingArmAngle = -1.65 * arc + 0.35;
      torsoTwist = -0.36 * arc;
    }
    if (hero.rightArm) {
      hero.rightArm.rotation.x = swingArmAngle;
      hero.rightArm.rotation.z = swingTimer > 0 ? -0.32 : 0;
    }
    hero.bodyPivot.rotation.y = torsoTwist;
    hero.bodyPivot.rotation.x = 0.08 * moveFactor;
    if (hero.headGroup) {
      hero.headGroup.rotation.z = Math.cos(walkPhase * 0.5) * 0.05 * moveFactor;
      hero.headGroup.rotation.x = -0.05 * moveFactor + Math.sin(time * 2.2) * 0.025;
    }
    if (hero.capeMesh) {
      hero.capeMesh.rotation.x = 0.18 * moveFactor + Math.abs(Math.sin(walkPhase)) * 0.16 * moveFactor + Math.sin(time * 4) * 0.03;
    }
    if (hero.auraMesh) {
      hero.auraMesh.rotation.z += (dt || 0.016) * 0.9;
    }
  }

  // ===========================================================================
  // 2. Cute Pastel Fairy Worker (나비 날개 요정 일꾼)
  // ===========================================================================
  const FAIRY_COLORS = [0xff82b2, 0x62dfb2, 0x73c4ff, 0xc38cff, 0xffae66, 0xffd15c];

  function createFairyWorker(idx = 0) {
    const root = new THREE.Group();
    root.add(makeShadowCircle(0.42, 0.18));

    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const dressColor = FAIRY_COLORS[idx % FAIRY_COLORS.length];
    const matDress = makeToonMat(dressColor);
    const matHair = makeToonMat(idx % 2 === 0 ? 0xffdd78 : 0xff9ec4);
    const matSkin = makeToonMat(0xffd7bc);
    const matWing = new THREE.MeshBasicMaterial({
      color: 0xdffbff,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide !== undefined ? THREE.DoubleSide : 2,
    });

    // Petal skirt dress
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("fairy_dress", () => new THREE.ConeGeometry(0.30, 0.52, 12)),
      matDress,
      { pos: [0, 0.44, 0], outlineScale: 1.07 }
    );
    // Tiny legs
    const fLegGeo = cachedGeo("fairy_leg", () => new THREE.CylinderGeometry(0.055, 0.06, 0.22, 8));
    addOutlinedMesh(bodyPivot, fLegGeo, matSkin, { pos: [-0.09, 0.14, 0] });
    addOutlinedMesh(bodyPivot, fLegGeo, matSkin, { pos: [0.09, 0.14, 0] });

    // Big cute head + twin hair buns + flower clip
    const head = new THREE.Group();
    head.position.set(0, 0.88, 0.01);
    addOutlinedMesh(
      head,
      cachedGeo("fairy_head", () => new THREE.SphereGeometry(0.30, 16, 14)),
      matSkin,
      { outlineScale: 1.06 }
    );
    buildCuteEyesAndCheeks(head, 0.27, 0.10, -0.02);
    addOutlinedMesh(
      head,
      cachedGeo("fairy_hair", () => new THREE.SphereGeometry(0.315, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.54)),
      matHair,
      { pos: [0, 0.04, -0.02], rot: [-0.18, 0, 0], outlineScale: 1.06 }
    );
    addOutlinedMesh(
      head,
      cachedGeo("fairy_bun", () => new THREE.SphereGeometry(0.11, 10, 8)),
      matHair,
      { pos: [0, 0.30, -0.08], outlineScale: 1.08 }
    );
    addOutlinedMesh(
      head,
      cachedGeo("fairy_flower", () => new THREE.OctahedronGeometry(0.085, 0)),
      makeToonMat(0xfff07a, { emissive: 0xffd74a, emissiveIntensity: 0.25 }),
      { pos: [0.16, 0.24, 0.14] }
    );
    bodyPivot.add(head);

    // Iridescent double butterfly wings
    const upperWingGeo = cachedGeo("wing_up", () => new THREE.BoxGeometry(0.42, 0.34, 0.03));
    const lowerWingGeo = cachedGeo("wing_lo", () => new THREE.BoxGeometry(0.28, 0.24, 0.03));
    const wingRimMat = makeToonMat(dressColor, { transparent: true, opacity: 0.82 });

    function makeWing(side) {
      const w = new THREE.Group();
      w.position.set(side * 0.10, 0.58, -0.18);
      const u = new THREE.Mesh(upperWingGeo, matWing);
      u.position.set(side * 0.24, 0.14, -0.04);
      u.rotation.z = side * 0.35;
      u.rotation.y = side * -0.25;
      w.add(u);
      const l = new THREE.Mesh(lowerWingGeo, wingRimMat);
      l.position.set(side * 0.18, -0.12, -0.04);
      l.rotation.z = side * -0.22;
      l.rotation.y = side * -0.25;
      w.add(l);
      return w;
    }

    const leftWing = makeWing(-1);
    const rightWing = makeWing(1);
    bodyPivot.add(leftWing);
    bodyPivot.add(rightWing);

    const bagAnchor = new THREE.Group();
    bagAnchor.position.set(0, 0.56, -0.32);
    bagAnchor.scale.set(0.68, 0.68, 0.68);
    bodyPivot.add(bagAnchor);

    return {
      root,
      bodyPivot,
      leftWing,
      rightWing,
      bagAnchor,
      materials: { dress: matDress, wing: matWing },
      _phase: (idx * 1.37) % (Math.PI * 2),
    };
  }

  function animateFairy(fairy, dt) {
    if (!fairy) return;
    fairy._phase = (fairy._phase || 0) + (dt || 0.016);
    const t = fairy._phase;
    if (fairy.bodyPivot) {
      fairy.bodyPivot.position.y = 0.14 + Math.sin(t * 5.2) * 0.075;
    }
    const flap = Math.sin(t * 24) * 0.55;
    if (fairy.leftWing) fairy.leftWing.rotation.y = -0.25 + flap;
    if (fairy.rightWing) fairy.rightWing.rotation.y = 0.25 - flap;
  }

  // ===========================================================================
  // 3. Animal-Hood Storybook Customer Villagers (여우/토끼/곰/고양이 후드 손님)
  // ===========================================================================
  const CUSTOMER_VARIANTS = [
    { name: "fox", hood: 0xf27e3d, earInner: 0xfff0d4, tunic: 0x5c82d6, kind: "fox" },
    { name: "bunny", hood: 0xf7cddb, earInner: 0xff8ea6, tunic: 0x73b87a, kind: "bunny" },
    { name: "bear", hood: 0xa46b47, earInner: 0xe6be9a, tunic: 0xe8a838, kind: "bear" },
    { name: "cat", hood: 0x6ac2ac, earInner: 0xffc6d4, tunic: 0x8e67c9, kind: "cat" },
  ];

  function createAnimalCustomer(variantIdx = 0, roleType = "villager") {
    const v = CUSTOMER_VARIANTS[variantIdx % CUSTOMER_VARIANTS.length];
    const root = new THREE.Group();
    root.add(makeShadowCircle(0.56, 0.22));

    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const tunicHex = roleType === "vip" ? 0x6b2256 : roleType === "wizard" ? 0x3b48a8 : v.tunic;
    const matHood = makeToonMat(roleType === "vip" ? 0xf6c959 : roleType === "wizard" ? 0x5c6fe0 : v.hood);
    const matInner = makeToonMat(v.earInner);
    const matTunic = makeToonMat(tunicHex);
    const matSkin = makeToonMat(0xffd7bc);
    const matBoot = makeToonMat(0x523426);

    const legGeo = cachedGeo("cust_leg", () => new THREE.CylinderGeometry(0.09, 0.10, 0.30, 8));
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.14, 0.28, 0);
    addOutlinedMesh(leftLeg, legGeo, matBoot, { pos: [0, -0.10, 0] });
    bodyPivot.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.14, 0.28, 0);
    addOutlinedMesh(rightLeg, legGeo, matBoot, { pos: [0, -0.10, 0] });
    bodyPivot.add(rightLeg);

    // Cozy villager tunic + white apron
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("cust_tunic", () => new THREE.CylinderGeometry(0.25, 0.38, 0.56, 14)),
      matTunic,
      { pos: [0, 0.52, 0] }
    );
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("cust_apron", () => new THREE.BoxGeometry(0.32, 0.36, 0.08)),
      makeToonMat(0xfff5e4),
      { pos: [0, 0.45, 0.30], outlineScale: 1.07 }
    );

    const armGeo = cachedGeo("cust_arm", () => new THREE.CylinderGeometry(0.085, 0.10, 0.32, 8));
    const handGeo = cachedGeo("cust_hand", () => new THREE.SphereGeometry(0.09, 8, 8));
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.31, 0.72, 0);
    addOutlinedMesh(leftArm, armGeo, matTunic, { pos: [0, -0.13, 0] });
    addOutlinedMesh(leftArm, handGeo, matSkin, { pos: [0, -0.30, 0] });
    bodyPivot.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.31, 0.72, 0);
    addOutlinedMesh(rightArm, armGeo, matTunic, { pos: [0, -0.13, 0] });
    addOutlinedMesh(rightArm, handGeo, matSkin, { pos: [0, -0.30, 0] });
    bodyPivot.add(rightArm);

    // Cute 2등신 Face + Animal Hood
    const head = new THREE.Group();
    head.position.set(0, 1.08, 0.02);
    addOutlinedMesh(
      head,
      cachedGeo("cust_hood_shell", () => new THREE.SphereGeometry(0.40, 18, 14)),
      matHood,
      { outlineScale: 1.05 }
    );
    addOutlinedMesh(
      head,
      cachedGeo("cust_face", () => new THREE.SphereGeometry(0.33, 16, 12)),
      matSkin,
      { pos: [0, -0.02, 0.12], outline: false }
    );
    buildCuteEyesAndCheeks(head, 0.43, 0.12, -0.03);

    // Ears by animal kind
    [-1, 1].forEach((side) => {
      if (v.kind === "bunny") {
        addOutlinedMesh(
          head,
          cachedGeo("ear_bunny", () => typeof THREE.CapsuleGeometry === "function" ? new THREE.CapsuleGeometry(0.085, 0.28, 6, 8) : new THREE.CylinderGeometry(0.075, 0.095, 0.40, 8)),
          matHood,
          { pos: [side * 0.16, 0.48, -0.02], rot: [-0.08, 0, side * -0.14] }
        );
        addOutlinedMesh(
          head,
          cachedGeo("ear_bunny_in", () => new THREE.BoxGeometry(0.07, 0.24, 0.05)),
          matInner,
          { pos: [side * 0.16, 0.46, 0.04], rot: [-0.08, 0, side * -0.14], outline: false }
        );
      } else if (v.kind === "bear") {
        addOutlinedMesh(
          head,
          cachedGeo("ear_bear", () => new THREE.SphereGeometry(0.145, 10, 8)),
          matHood,
          { pos: [side * 0.28, 0.30, 0] }
        );
        addOutlinedMesh(
          head,
          cachedGeo("ear_bear_in", () => new THREE.SphereGeometry(0.08, 8, 8)),
          matInner,
          { pos: [side * 0.28, 0.30, 0.08], outline: false }
        );
      } else {
        // fox & cat pointed ears
        addOutlinedMesh(
          head,
          cachedGeo("ear_point", () => new THREE.ConeGeometry(0.14, 0.30, 6)),
          matHood,
          { pos: [side * 0.24, 0.36, 0.02], rot: [0.05, 0, side * -0.26] }
        );
        addOutlinedMesh(
          head,
          cachedGeo("ear_point_in", () => new THREE.ConeGeometry(0.08, 0.18, 6)),
          matInner,
          { pos: [side * 0.24, 0.34, 0.08], rot: [0.05, 0, side * -0.26], outline: false }
        );
      }
    });
    bodyPivot.add(head);

    if (roleType === "vip") {
      // Golden Noble Crown + Scarlet Silk Collar for 1호기 Rich VIP Customers
      const matCrown = makeToonMat(0xffd84d, { emissive: 0xd99b00, emissiveIntensity: 0.22 });
      addOutlinedMesh(
        head,
        cachedGeo("vip_crown_band", () => new THREE.CylinderGeometry(0.24, 0.22, 0.14, 8)),
        matCrown,
        { pos: [0, 0.44, 0], outlineScale: 1.06 }
      );
      addOutlinedMesh(
        head,
        cachedGeo("vip_crown_gem", () => new THREE.OctahedronGeometry(0.08, 0)),
        makeToonMat(0xff4277, { emissive: 0xff1e56, emissiveIntensity: 0.3 }),
        { pos: [0, 0.50, 0.20], outline: false }
      );
    } else if (roleType === "wizard") {
      // Miniature Azure Starlight Wizard Hat for 2호기 Wizard Customers
      const matWizHat = makeToonMat(0x4a38a8);
      const matWizBrim = makeToonMat(0xffcf52);
      addOutlinedMesh(
        head,
        cachedGeo("cust_wiz_brim", () => new THREE.CylinderGeometry(0.46, 0.48, 0.05, 16)),
        matWizBrim,
        { pos: [0, 0.36, 0], outlineScale: 1.05 }
      );
      addOutlinedMesh(
        head,
        cachedGeo("cust_wiz_cone", () => new THREE.ConeGeometry(0.30, 0.56, 14)),
        matWizHat,
        { pos: [0, 0.64, -0.02], rot: [-0.08, 0, 0.04], outlineScale: 1.05 }
      );
    }

    return {
      root,
      bodyPivot,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      materials: { hood: matHood, tunic: matTunic },
      _phase: (variantIdx * 1.1) % (Math.PI * 2),
    };
  }

  function animateCustomer(cust, walking, dt) {
    if (!cust || !cust.bodyPivot) return;
    cust._phase = (cust._phase || 0) + (dt || 0.016) * (walking ? 11.5 : 2.6);
    const p = cust._phase;
    if (walking) {
      const s = Math.sin(p);
      cust.bodyPivot.position.y = Math.abs(s) * 0.07;
      if (cust.leftLeg) cust.leftLeg.rotation.x = s * 0.58;
      if (cust.rightLeg) cust.rightLeg.rotation.x = -s * 0.58;
      if (cust.leftArm) cust.leftArm.rotation.x = -s * 0.52;
      if (cust.rightArm) cust.rightArm.rotation.x = s * 0.52;
    } else {
      cust.bodyPivot.position.y = Math.sin(p) * 0.022;
      if (cust.leftLeg) cust.leftLeg.rotation.x *= 0.85;
      if (cust.rightLeg) cust.rightLeg.rotation.x *= 0.85;
      if (cust.leftArm) cust.leftArm.rotation.x *= 0.85;
      if (cust.rightArm) cust.rightArm.rotation.x *= 0.85;
    }
  }

  // ===========================================================================
  // 4. Wide Chunky 3D Wooden Crate Blocks (0.95m x 0.20m x 0.62m) & Gem Brick
  // ===========================================================================
  const CRATE_W = 0.95;
  const CRATE_H = 0.20;
  const CRATE_D = 0.62;

  function createResourceCrate(type = "blue_ore") {
    const g = new THREE.Group();
    g.userData.itemType = type;

    if (type === "mana_gem" || type === "cash_bundle") {
      // Crisp 100% Green Cash Bill Bundle (초록 지폐 다발)
      addOutlinedMesh(
        g,
        cachedGeo("cash_bundle_body", () => new THREE.BoxGeometry(0.48, 0.13, 0.28)),
        makeToonMat(0x2ecc71, { emissive: 0x1e9e53, emissiveIntensity: 0.26 }),
        { pos: [0, 0.065, 0], castShadow: false, receiveShadow: false, outlineScale: 1.07 }
      );
      addOutlinedMesh(
        g,
        cachedGeo("cash_bundle_top", () => new THREE.BoxGeometry(0.42, 0.025, 0.22)),
        makeToonMat(0x7af5a8, { emissive: 0x3ad97b, emissiveIntensity: 0.2 }),
        { pos: [0, 0.132, 0], castShadow: false, receiveShadow: false, outline: false }
      );
      addOutlinedMesh(
        g,
        cachedGeo("cash_bundle_band", () => new THREE.BoxGeometry(0.12, 0.145, 0.30)),
        makeToonMat(0xfff1a8, { emissive: 0xf7d046, emissiveIntensity: 0.2 }),
        { pos: [0, 0.068, 0], castShadow: false, receiveShadow: false, outline: false }
      );
      return g;
    }

    const isElixir = type === "royal_elixir" || type === "elixir_5x";
    const isCutGem = type === "cut_gem" || type === "cut_gem_3x";
    const isOre = type === "blue_ore" || type === "starlight_crystal";
    const isHerb = type === "rainbow_herb" || type === "rainbow_berry";
    const isPotion = type === "magic_potion" || type === "potion_2x";

    // Wide wooden crate base + raised edge trim (0.95 x 0.20 x 0.62)
    const matWoodBase = makeToonMat(isElixir ? 0xc28a49 : isCutGem ? 0x624a78 : isOre ? 0x6a5547 : 0xb87e48);
    const matWoodTrim = makeToonMat(isElixir ? 0xf5ca52 : isOre ? 0x4b3c33 : 0x7b4c28);

    addOutlinedMesh(
      g,
      cachedGeo("crate_plank_base", () => new THREE.BoxGeometry(CRATE_W, 0.09, CRATE_D)),
      matWoodBase,
      { pos: [0, 0.045, 0], castShadow: true, receiveShadow: true, outlineScale: 1.045 }
    );
    // Two long side slats + end caps creating a distinct wooden crate tray
    addOutlinedMesh(
      g,
      cachedGeo("crate_rail_fb", () => new THREE.BoxGeometry(CRATE_W + 0.02, 0.09, 0.06)),
      matWoodTrim,
      { pos: [0, 0.115, CRATE_D * 0.5 - 0.03], castShadow: false, outlineScale: 1.04 }
    );
    addOutlinedMesh(
      g,
      cachedGeo("crate_rail_fb", () => new THREE.BoxGeometry(CRATE_W + 0.02, 0.09, 0.06)),
      matWoodTrim,
      { pos: [0, 0.115, -CRATE_D * 0.5 + 0.03], castShadow: false, outlineScale: 1.04 }
    );
    addOutlinedMesh(
      g,
      cachedGeo("crate_rail_lr", () => new THREE.BoxGeometry(0.06, 0.09, CRATE_D - 0.08)),
      matWoodTrim,
      { pos: [-CRATE_W * 0.5 + 0.03, 0.115, 0], castShadow: false, outline: false }
    );
    addOutlinedMesh(
      g,
      cachedGeo("crate_rail_lr", () => new THREE.BoxGeometry(0.06, 0.09, CRATE_D - 0.08)),
      matWoodTrim,
      { pos: [CRATE_W * 0.5 - 0.03, 0.115, 0], castShadow: false, outline: false }
    );

    // Packed 3D cargo inside the crate by itemType
    if (isOre) {
      // Cobalt/Sapphire Blue Raw Ore Chunks (푸른 원석)
      const matOre1 = makeToonMat(0x2c8dff, { emissive: 0x1565d8, emissiveIntensity: 0.28 });
      const matOre2 = makeToonMat(0x74d2ff, { emissive: 0x35a7ff, emissiveIntensity: 0.34 });
      const shardGeo = cachedGeo("crate_ore_chunk", () => new THREE.DodecahedronGeometry(0.115, 0));
      for (let i = 0; i < 6; i++) {
        const col = i % 3;
        const row = (i / 3) | 0;
        const m = new THREE.Mesh(shardGeo, i % 2 === 0 ? matOre1 : matOre2);
        m.position.set(-0.27 + col * 0.27, 0.135, -0.12 + row * 0.24);
        m.scale.set(1.08, 0.78, 1.05);
        m.rotation.set(0.2 * (row - 0.5), col * 0.6, 0.18 * (col - 1));
        g.add(m);
      }
    } else if (isHerb) {
      // Vibrant Rainbow Herbs & Mystical Blossoms (무지개 약초)
      const herbColors = [0x3be36d, 0xff62b8, 0xffcc42, 0x56d8ff, 0xa86bff, 0x62f284];
      const stemGeo = cachedGeo("crate_herb_stem", () => new THREE.CylinderGeometry(0.04, 0.055, 0.14, 6));
      const bloomGeo = cachedGeo("crate_herb_bloom", () => new THREE.DodecahedronGeometry(0.075, 0));
      const matStem = makeToonMat(0x36b554);
      for (let i = 0; i < 6; i++) {
        const col = i % 3;
        const row = (i / 3) | 0;
        const x = -0.26 + col * 0.26;
        const z = -0.11 + row * 0.22;
        const st = new THREE.Mesh(stemGeo, matStem);
        st.position.set(x, 0.13, z);
        st.rotation.z = (col - 1) * 0.22;
        g.add(st);
        const bl = new THREE.Mesh(
          bloomGeo,
          makeToonMat(herbColors[i % herbColors.length], { emissive: herbColors[i % herbColors.length], emissiveIntensity: 0.25 })
        );
        bl.position.set(x, 0.20, z);
        g.add(bl);
      }
    } else if (isPotion) {
      const matBottle = makeToonMat(0x3be898, { emissive: 0x16b56d, emissiveIntensity: 0.28 });
      const matCork = makeToonMat(0xffd252);
      const potGeo = cachedGeo("crate_potion_body", () => new THREE.CylinderGeometry(0.075, 0.095, 0.12, 8));
      const corkGeo = cachedGeo("crate_potion_cork", () => new THREE.CylinderGeometry(0.045, 0.045, 0.045, 6));
      for (let i = 0; i < 4; i++) {
        const x = -0.30 + i * 0.20;
        const body = new THREE.Mesh(potGeo, matBottle);
        body.position.set(x, 0.135, 0);
        g.add(body);
        const cork = new THREE.Mesh(corkGeo, matCork);
        cork.position.set(x, 0.195, 0);
        g.add(cork);
      }
    } else if (isCutGem) {
      const matGem1 = makeToonMat(0xc56bff, { emissive: 0x9b36ff, emissiveIntensity: 0.35 });
      const matGem2 = makeToonMat(0x52f2ff, { emissive: 0x1ac7ff, emissiveIntensity: 0.35 });
      const gemGeo = cachedGeo("crate_cut_gem", () => new THREE.ConeGeometry(0.11, 0.13, 6));
      for (let i = 0; i < 4; i++) {
        const x = -0.29 + i * 0.195;
        const m = new THREE.Mesh(gemGeo, i % 2 === 0 ? matGem1 : matGem2);
        m.position.set(x, 0.14, (i % 2 - 0.5) * 0.07);
        g.add(m);
      }
    } else {
      // royal_elixir / elixir_5x: golden-rainbow elixir ampoules
      const colors = [0xff5eb8, 0xffd245, 0x52efff, 0xb875ff];
      const ampGeo = cachedGeo("crate_elixir_amp", () => new THREE.CylinderGeometry(0.07, 0.085, 0.135, 8));
      const capGeo = cachedGeo("crate_elixir_cap", () => new THREE.OctahedronGeometry(0.05, 0));
      const matCap = makeToonMat(0xffe670, { emissive: 0xffb824, emissiveIntensity: 0.35 });
      for (let i = 0; i < 4; i++) {
        const x = -0.30 + i * 0.20;
        const amp = new THREE.Mesh(ampGeo, makeToonMat(colors[i % colors.length], { emissive: colors[i % colors.length], emissiveIntensity: 0.28 }));
        amp.position.set(x, 0.14, 0);
        g.add(amp);
        const cap = new THREE.Mesh(capGeo, matCap);
        cap.position.set(x, 0.21, 0);
        g.add(cap);
      }
    }

    return g;
  }

  // ===========================================================================
  // 5. North 3-Bay Production Line Machines + Animated 3D Conveyor Belts
  // ===========================================================================
  function createProductionMachine(kind = "cauldron") {
    const root = new THREE.Group();
    const visualRoot = new THREE.Group();
    root.add(visualRoot);

    const matIron = makeToonMat(0x4c4a6b);
    const matGold = makeToonMat(0xf4be3c, { emissive: 0xb87a10, emissiveIntensity: 0.15 });
    const matStone = makeToonMat(0x7c7b96);
    const matBeltFrame = makeToonMat(0x524c63);
    const matSlat = makeToonMat(0x9d99b8);

    // Base plinth + Horizontal 3D Conveyor Belt Bridge running left -> right
    addOutlinedMesh(
      visualRoot,
      cachedGeo("mach_base", () => new THREE.BoxGeometry(2.7, 0.28, 2.2)),
      matStone,
      { pos: [0, 0.14, 0], outlineScale: 1.04 }
    );

    const conveyorGroup = new THREE.Group();
    conveyorGroup.position.set(0, 0.48, 0.72);
    addOutlinedMesh(
      conveyorGroup,
      cachedGeo("conv_rail", () => new THREE.BoxGeometry(3.2, 0.22, 0.92)),
      matBeltFrame,
      { pos: [0, 0, 0], outlineScale: 1.04 }
    );
    const conveyorSlats = [];
    const slatGeo = cachedGeo("conv_slat", () => new THREE.BoxGeometry(0.14, 0.05, 0.80));
    for (let i = 0; i < 8; i++) {
      const slat = new THREE.Mesh(slatGeo, matSlat);
      slat.position.set(-1.4 + i * 0.40, 0.12, 0);
      conveyorGroup.add(slat);
      conveyorSlats.push(slat);
    }
    visualRoot.add(conveyorGroup);

    let stirGroup = null;
    let sawWheel = null;
    let turbineMesh = null;
    const bubbles = [];
    let activeGlow = null;

    if (kind === "cauldron") {
      // Stage 2A: Golden Alchemist Cauldron (황금 가마솥 2x)
      addOutlinedMesh(
        visualRoot,
        cachedGeo("caul_hearth", () => new THREE.CylinderGeometry(1.02, 1.16, 0.62, 16)),
        matIron,
        { pos: [0, 0.56, -0.22], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        visualRoot,
        cachedGeo("caul_bowl", () => new THREE.SphereGeometry(1.06, 18, 12, 0, Math.PI * 2, 0.42, Math.PI * 0.6)),
        makeToonMat(0x3a6e5b),
        { pos: [0, 1.18, -0.22], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        visualRoot,
        cachedGeo("caul_rim", () => new THREE.TorusGeometry(0.94, 0.11, 10, 22)),
        matGold,
        { pos: [0, 1.62, -0.22], rot: [Math.PI * 0.5, 0, 0], outlineScale: 1.06 }
      );
      activeGlow = makeToonMat(0x52ff9b, { emissive: 0x26e676, emissiveIntensity: 0.45 });
      const brew = new THREE.Mesh(
        cachedGeo("caul_brew", () => new THREE.CircleGeometry(0.84, 18)),
        activeGlow
      );
      brew.rotation.x = -Math.PI * 0.5;
      brew.position.set(0, 1.56, -0.22);
      visualRoot.add(brew);

      // Motorized wooden/gold stirring ladle
      stirGroup = new THREE.Group();
      stirGroup.position.set(0, 1.58, -0.22);
      addOutlinedMesh(
        stirGroup,
        cachedGeo("caul_ladle", () => new THREE.CylinderGeometry(0.06, 0.06, 1.15, 8)),
        makeToonMat(0xa66e3a),
        { pos: [0.32, 0.35, 0], rot: [0, 0, -0.35] }
      );
      visualRoot.add(stirGroup);

      const bubGeo = cachedGeo("caul_bub", () => new THREE.SphereGeometry(0.11, 8, 8));
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(bubGeo, activeGlow);
        b.position.set(Math.cos(i * 1.6) * 0.38, 1.66 + (i % 2) * 0.18, -0.22 + Math.sin(i * 1.6) * 0.38);
        b.userData.baseX = b.position.x;
        b.userData.baseZ = b.position.z;
        b.userData.offset = i * 1.3;
        visualRoot.add(b);
        bubbles.push(b);
      }
    } else if (kind === "cutter") {
      // Stage 2B: Arcane Crystal Cutter (크리스탈 커팅기 3x)
      addOutlinedMesh(
        visualRoot,
        cachedGeo("cut_body", () => new THREE.BoxGeometry(2.1, 1.18, 1.35)),
        makeToonMat(0x6d52a8),
        { pos: [0, 0.85, -0.24], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        visualRoot,
        cachedGeo("cut_hood", () => new THREE.CylinderGeometry(0.75, 0.92, 0.52, 8)),
        matGold,
        { pos: [0, 1.65, -0.24], outlineScale: 1.05 }
      );
      activeGlow = makeToonMat(0xd67aff, { emissive: 0xa63aff, emissiveIntensity: 0.42 });
      addOutlinedMesh(
        visualRoot,
        cachedGeo("cut_gem_core", () => new THREE.OctahedronGeometry(0.36, 0)),
        activeGlow,
        { pos: [0, 2.15, -0.24], scale: [0.85, 1.35, 0.85] }
      );

      // Spinning diamond saw wheel
      sawWheel = new THREE.Group();
      sawWheel.position.set(0, 1.25, 0.52);
      addOutlinedMesh(
        sawWheel,
        cachedGeo("cut_wheel", () => new THREE.CylinderGeometry(0.56, 0.56, 0.09, 12)),
        makeToonMat(0x7beeff, { emissive: 0x3ac8ff, emissiveIntensity: 0.35 }),
        { rot: [Math.PI * 0.5, 0, 0] }
      );
      addOutlinedMesh(
        sawWheel,
        cachedGeo("cut_hub", () => new THREE.CylinderGeometry(0.18, 0.18, 0.16, 10)),
        matGold,
        { rot: [Math.PI * 0.5, 0, 0] }
      );
      visualRoot.add(sawWheel);
    } else {
      // Stage 2C: Rainbow Elixir Distillery (무지개 엘릭서 증류기 5x)
      addOutlinedMesh(
        visualRoot,
        cachedGeo("dist_base", () => new THREE.BoxGeometry(2.2, 0.95, 1.45)),
        makeToonMat(0x47528a),
        { pos: [0, 0.72, -0.24], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        visualRoot,
        cachedGeo("dist_copper", () => new THREE.CylinderGeometry(0.68, 0.82, 1.15, 16)),
        makeToonMat(0xe08245),
        { pos: [-0.36, 1.65, -0.24], outlineScale: 1.05 }
      );
      activeGlow = makeToonMat(0xff84d8, { emissive: 0xff45b8, emissiveIntensity: 0.45 });
      addOutlinedMesh(
        visualRoot,
        cachedGeo("dist_flask", () => new THREE.SphereGeometry(0.52, 14, 12)),
        activeGlow,
        { pos: [0.48, 1.62, -0.20], outlineScale: 1.05 }
      );
      addOutlinedMesh(
        visualRoot,
        cachedGeo("dist_pipe", () => new THREE.TorusGeometry(0.45, 0.10, 8, 16, Math.PI)),
        matGold,
        { pos: [0.06, 2.22, -0.22], outlineScale: 1.07 }
      );

      turbineMesh = new THREE.Group();
      turbineMesh.position.set(-0.36, 2.38, -0.24);
      const bladeGeo = cachedGeo("dist_blade", () => new THREE.BoxGeometry(0.95, 0.08, 0.22));
      addOutlinedMesh(turbineMesh, bladeGeo, matGold, { rot: [0, 0, 0] });
      addOutlinedMesh(turbineMesh, bladeGeo, matGold, { rot: [0, Math.PI * 0.5, 0] });
      visualRoot.add(turbineMesh);

      const sparkGeo = cachedGeo("dist_spark", () => new THREE.SphereGeometry(0.095, 8, 8));
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(sparkGeo, activeGlow);
        b.position.set(0.48 + (i % 2 - 0.5) * 0.25, 2.05 + i * 0.14, -0.20);
        b.userData.baseX = b.position.x;
        b.userData.baseZ = b.position.z;
        b.userData.offset = i * 1.4;
        visualRoot.add(b);
        bubbles.push(b);
      }
    }

    return {
      root,
      visualRoot,
      conveyorGroup,
      conveyorSlats,
      stirGroup,
      sawWheel,
      turbineMesh,
      bubbles,
      activeGlow,
      _beltPhase: 0,
    };
  }

  function animateProductionMachine(machine, processing, dt) {
    if (!machine) return;
    const step = dt || 0.016;
    const speed = processing ? 1.85 : 0.35;
    machine._beltPhase = (machine._beltPhase || 0) + step * speed;

    if (machine.conveyorSlats && machine.conveyorSlats.length) {
      for (let i = 0; i < machine.conveyorSlats.length; i++) {
        const s = machine.conveyorSlats[i];
        const raw = ((i * 0.40 + machine._beltPhase) % 3.2) - 1.6;
        s.position.x = raw;
      }
    }
    if (machine.stirGroup) {
      machine.stirGroup.rotation.y += step * (processing ? 4.8 : 1.0);
    }
    if (machine.sawWheel) {
      machine.sawWheel.rotation.z -= step * (processing ? 8.5 : 1.4);
    }
    if (machine.turbineMesh) {
      machine.turbineMesh.rotation.y += step * (processing ? 6.5 : 1.2);
    }
    if (machine.bubbles && machine.bubbles.length) {
      for (let i = 0; i < machine.bubbles.length; i++) {
        const b = machine.bubbles[i];
        const t = machine._beltPhase * 2.2 + (b.userData.offset || 0);
        const loop = (t % 1.0);
        b.position.y = 1.65 + loop * 0.65;
        const sc = Math.sin(loop * Math.PI) * (processing ? 1.15 : 0.72);
        b.scale.set(sc, sc, sc);
      }
    }
    if (machine.activeGlow && machine.activeGlow.emissiveIntensity !== undefined) {
      machine.activeGlow.emissiveIntensity = processing ? 0.55 + Math.sin(machine._beltPhase * 5) * 0.15 : 0.25;
    }
  }

  // ===========================================================================
  // 6. Mega Harvester Truck (자동 대량 수확 트럭)
  // ===========================================================================
  function createHarvesterTruck() {
    const root = new THREE.Group();
    root.add(makeShadowCircle(1.35, 0.26));

    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const matTeal = makeToonMat(0x3ba69a);
    const matWood = makeToonMat(0xb57a43);
    const matGold = makeToonMat(0xf4be3c);
    const matWheel = makeToonMat(0x3b3545);
    const matCab = makeToonMat(0x6adfff, { emissive: 0x26b2ff, emissiveIntensity: 0.2 });

    // Wooden cargo bed + teal tractor cabin
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("truck_bed", () => new THREE.BoxGeometry(1.52, 0.36, 1.95)),
      matWood,
      { pos: [0, 0.52, -0.35], outlineScale: 1.04 }
    );
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("truck_cab", () => new THREE.BoxGeometry(1.26, 0.92, 0.96)),
      matTeal,
      { pos: [0, 0.95, 0.62], outlineScale: 1.04 }
    );
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("truck_roof", () => new THREE.BoxGeometry(1.38, 0.14, 1.08)),
      matGold,
      { pos: [0, 1.46, 0.62], outlineScale: 1.05 }
    );
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("truck_wind", () => new THREE.BoxGeometry(0.98, 0.42, 0.12)),
      matCab,
      { pos: [0, 1.05, 1.08], outline: false }
    );
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("truck_pipe", () => new THREE.CylinderGeometry(0.08, 0.10, 0.72, 8)),
      matGold,
      { pos: [0.48, 1.52, 0.36] }
    );

    // 4 chunky wheels
    const wheelGeo = cachedGeo("truck_wheel", () => new THREE.CylinderGeometry(0.34, 0.34, 0.26, 12));
    const hubGeo = cachedGeo("truck_hub", () => new THREE.CylinderGeometry(0.16, 0.16, 0.29, 8));
    const wheels = [];
    const wheelOffsets = [
      [-0.82, 0.34, 0.78],
      [0.82, 0.34, 0.78],
      [-0.82, 0.34, -0.82],
      [0.82, 0.34, -0.82],
    ];
    for (const [wx, wy, wz] of wheelOffsets) {
      const wg = new THREE.Group();
      wg.position.set(wx, wy, wz);
      addOutlinedMesh(wg, wheelGeo, matWheel, { rot: [0, 0, Math.PI * 0.5] });
      addOutlinedMesh(wg, hubGeo, matGold, { rot: [0, 0, Math.PI * 0.5], outline: false });
      bodyPivot.add(wg);
      wheels.push(wg);
    }

    // Spinning Front Harvester Drum Roller
    const rollerGroup = new THREE.Group();
    rollerGroup.position.set(0, 0.44, 1.48);
    addOutlinedMesh(
      rollerGroup,
      cachedGeo("truck_drum", () => new THREE.CylinderGeometry(0.28, 0.28, 1.72, 10)),
      matGold,
      { rot: [0, 0, Math.PI * 0.5], outlineScale: 1.05 }
    );
    const tineGeo = cachedGeo("truck_tine", () => new THREE.BoxGeometry(1.56, 0.12, 0.68));
    addOutlinedMesh(rollerGroup, tineGeo, matTeal, { outline: false });
    addOutlinedMesh(rollerGroup, tineGeo, matTeal, { rot: [Math.PI * 0.5, 0, 0], outline: false });
    bodyPivot.add(rollerGroup);

    const cargoAnchor = new THREE.Group();
    cargoAnchor.position.set(0, 0.74, -0.45);
    bodyPivot.add(cargoAnchor);

    return {
      root,
      bodyPivot,
      rollerGroup,
      wheels,
      cargoAnchor,
      _phase: 0,
    };
  }

  function animateHarvesterTruck(truck, speed, dt) {
    if (!truck) return;
    const step = dt || 0.016;
    const v = speed || 0;
    truck._phase = (truck._phase || 0) + step * (1 + v);

    if (truck.rollerGroup) {
      truck.rollerGroup.rotation.x += step * (5.5 + v * 2.0);
    }
    if (truck.wheels) {
      for (const w of truck.wheels) {
        w.rotation.x += step * v * 2.8;
      }
    }
    if (truck.bodyPivot) {
      truck.bodyPivot.position.y = Math.abs(Math.sin(truck._phase * 6.5)) * 0.032;
    }
  }

  // ===========================================================================
  // 7. 3호기 VIP Royal Trade Wagon (황실 무역 마차)
  // ===========================================================================
  function createRoyalTradeWagon() {
    const root = new THREE.Group();
    root.add(makeShadowCircle(2.0, 0.26));

    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const matGold = makeToonMat(0xf4c43a, { emissive: 0xb88212, emissiveIntensity: 0.18 });
    const matBurgundy = makeToonMat(0x8c234b);
    const matCream = makeToonMat(0xfff4d6);
    const matWood = makeToonMat(0x784a28);
    const matTire = makeToonMat(0x2d243b);

    // Ornate golden-trimmed carriage chassis
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("wagon_bed", () => new THREE.BoxGeometry(2.6, 0.28, 1.55)),
      matWood,
      { pos: [0, 0.56, 0], outlineScale: 1.04 }
    );
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("wagon_canopy_arch", () => new THREE.BoxGeometry(1.75, 1.02, 1.46)),
      matBurgundy,
      { pos: [-0.28, 1.20, 0], outlineScale: 1.04 }
    );
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("wagon_gold_roof", () => new THREE.CylinderGeometry(0.76, 0.80, 1.82, 12, 1, false, 0, Math.PI)),
      matGold,
      { pos: [-0.28, 1.70, 0], rot: [0, 0, Math.PI * 0.5], outlineScale: 1.04 }
    );
    // Front driver box & lanterns
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("wagon_front_cab", () => new THREE.BoxGeometry(0.76, 0.72, 1.32)),
      matCream,
      { pos: [0.95, 1.02, 0], outlineScale: 1.04 }
    );
    addOutlinedMesh(
      bodyPivot,
      cachedGeo("wagon_crown_crest", () => new THREE.OctahedronGeometry(0.24, 0)),
      makeToonMat(0xffea61, { emissive: 0xffc41a, emissiveIntensity: 0.4 }),
      { pos: [-0.28, 2.55, 0], outlineScale: 1.06 }
    );

    const cargoMount = new THREE.Group();
    cargoMount.position.set(-0.28, 0.74, 0);
    bodyPivot.add(cargoMount);

    const wheels = [];
    const wheelGeo = cachedGeo("wagon_wheel", () => new THREE.CylinderGeometry(0.36, 0.36, 0.18, 12));
    const hubGeo = cachedGeo("wagon_hub", () => new THREE.CylinderGeometry(0.14, 0.14, 0.22, 8));
    [
      [-0.86, 0.36, -0.84],
      [-0.86, 0.36, 0.84],
      [0.86, 0.36, -0.84],
      [0.86, 0.36, 0.84],
    ].forEach(([wx, wy, wz]) => {
      const wg = new THREE.Group();
      wg.position.set(wx, wy, wz);
      const wMesh = new THREE.Mesh(wheelGeo, matTire);
      wMesh.rotation.x = Math.PI * 0.5;
      wg.add(wMesh);
      const hMesh = new THREE.Mesh(hubGeo, matGold);
      hMesh.rotation.x = Math.PI * 0.5;
      wg.add(hMesh);
      root.add(wg);
      wheels.push(wg);
    });

    return { root, bodyPivot, cargoMount, wheels, _phase: 0 };
  }

  function animateRoyalTradeWagon(wagon, speed, dt) {
    if (!wagon) return;
    const d = dt || 0.016;
    wagon._phase = (wagon._phase || 0) + d * Math.max(0.5, speed || 0);
    for (const w of wagon.wheels || []) {
      w.rotation.z -= (speed || 0) * d * 2.2;
    }
    if (wagon.bodyPivot) {
      wagon.bodyPivot.position.y = Math.abs(Math.sin(wagon._phase * 6.0)) * ((speed || 0) > 0.2 ? 0.036 : 0.008);
    }
  }

  // ===========================================================================
  // 8. Non-Creepy Cute 3D Defense Trio Monsters (Slime, Shroom, Clockwork Golem)
  // ===========================================================================
  const MONSTER_PALETTES = [
    0x6ee7b7, // Mint wave
    0xfda4af, // Peach berry
    0x93c5fd, // Sky pudding
    0xc4b5fd, // Lavender
    0xfde047, // Lemon drop
    0xf9a8d4, // Strawberry
    0x5eead4, // Aqua
    0xfdba74, // Tangerine
    0xa5b4fc, // Periwinkle
    0xf472b6, // Starlight pink
  ];

  function buildMonsterHpBar(yHeight = 1.65) {
    const barRoot = new THREE.Group();
    barRoot.position.set(0, yHeight, 0);

    const bgMat = new THREE.MeshBasicMaterial({ color: 0x1e132e });
    const fgMat = new THREE.MeshBasicMaterial({ color: 0xff5277 });
    const bg = new THREE.Mesh(
      cachedGeo("mon_hp_bg", () => new THREE.BoxGeometry(1.18, 0.14, 0.08)),
      bgMat
    );
    barRoot.add(bg);

    const fillPivot = new THREE.Group();
    fillPivot.position.set(-0.55, 0, 0.02);
    const fill = new THREE.Mesh(
      cachedGeo("mon_hp_fg", () => new THREE.BoxGeometry(1.10, 0.09, 0.07)),
      fgMat
    );
    fill.position.set(0.55, 0, 0);
    fillPivot.add(fill);
    barRoot.add(fillPivot);

    return { barRoot, fillPivot };
  }

  function createCuteMonster(species = "slime", waveTier = 1) {
    const root = new THREE.Group();
    const tierIdx = Math.max(0, (waveTier - 1) % MONSTER_PALETTES.length);
    const baseHex = MONSTER_PALETTES[tierIdx];

    root.add(makeShadowCircle(species === "golem" ? 0.85 : 0.62, 0.24));

    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    let windUpKey = null;
    let capGroup = null;
    let hpHeight = 1.45;

    if (species === "slime") {
      // 말랑 젤리 슬라임: bouncy translucent jelly blob with sparkles & leaf/star sprout
      const jellyMat = new THREE.MeshToonMaterial({
        color: baseHex,
        emissive: baseHex,
        emissiveIntensity: 0.16,
        transparent: true,
        opacity: 0.90,
      });
      addOutlinedMesh(
        bodyPivot,
        cachedGeo("slime_dome", () => new THREE.SphereGeometry(0.58, 16, 12)),
        jellyMat,
        { pos: [0, 0.48, 0], scale: [1.14, 0.88, 1.08], outlineScale: 1.06 }
      );
      const faceGroup = new THREE.Group();
      faceGroup.position.set(0, 0.50, 0.12);
      buildCuteEyesAndCheeks(faceGroup, 0.48, 0.16, 0.02);
      bodyPivot.add(faceGroup);

      // Tiny golden dewdrop sprout on top
      addOutlinedMesh(
        bodyPivot,
        cachedGeo("slime_sprout", () => new THREE.OctahedronGeometry(0.14, 0)),
        makeToonMat(0xffe15a, { emissive: 0xffb824, emissiveIntensity: 0.25 }),
        { pos: [0, 1.04, 0], outlineScale: 1.06 }
      );
      hpHeight = 1.42;
    } else if (species === "shroom") {
      // 통통 버섯 정령: round plush stem + polka-dot pastel cap
      const capHex = tierIdx % 2 === 0 ? 0xff77a8 : 0x7a9cff;
      const matStem = makeToonMat(0xfff1d6);
      const matCap = makeToonMat(capHex);
      const matDot = makeToonMat(0xffffff);

      addOutlinedMesh(
        bodyPivot,
        cachedGeo("shroom_stem", () => new THREE.CylinderGeometry(0.32, 0.40, 0.58, 14)),
        matStem,
        { pos: [0, 0.36, 0], outlineScale: 1.05 }
      );
      const faceGroup = new THREE.Group();
      faceGroup.position.set(0, 0.40, 0.04);
      buildCuteEyesAndCheeks(faceGroup, 0.36, 0.14, 0);
      bodyPivot.add(faceGroup);

      capGroup = new THREE.Group();
      capGroup.position.set(0, 0.66, 0);
      addOutlinedMesh(
        capGroup,
        cachedGeo("shroom_cap", () => new THREE.SphereGeometry(0.62, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56)),
        matCap,
        { pos: [0, -0.04, 0], scale: [1.08, 0.85, 1.08], outlineScale: 1.05 }
      );
      [[0.32, 0.24, 0.28], [-0.34, 0.22, 0.22], [0.04, 0.36, -0.32]].forEach(([dx, dy, dz]) => {
        const dot = new THREE.Mesh(cachedGeo("shroom_dot", () => new THREE.SphereGeometry(0.10, 8, 8)), matDot);
        dot.position.set(dx, dy, dz);
        capGroup.add(dot);
      });
      bodyPivot.add(capGroup);
      hpHeight = 1.55;
    } else {
      // 태엽 별골렘 인형: chubby rounded toy stone golem with spinning wind-up key
      const matStone = makeToonMat(0x9fb4d9);
      const matGold = makeToonMat(0xffd24c, { emissive: 0xd99b00, emissiveIntensity: 0.2 });
      const matChestGem = makeToonMat(0x66e8ff, { emissive: 0x2bc4ff, emissiveIntensity: 0.35 });

      addOutlinedMesh(
        bodyPivot,
        cachedGeo("golem_body", () => new THREE.BoxGeometry(0.92, 0.88, 0.78)),
        matStone,
        { pos: [0, 0.58, 0], outlineScale: 1.05 }
      );
      addOutlinedMesh(
        bodyPivot,
        cachedGeo("golem_head", () => new THREE.BoxGeometry(0.76, 0.62, 0.66)),
        matStone,
        { pos: [0, 1.24, 0.04], outlineScale: 1.05 }
      );
      const faceGroup = new THREE.Group();
      faceGroup.position.set(0, 1.22, 0.02);
      buildCuteEyesAndCheeks(faceGroup, 0.36, 0.17, 0);
      bodyPivot.add(faceGroup);

      // Glowing Chest Star Core
      addOutlinedMesh(
        bodyPivot,
        cachedGeo("golem_star", () => new THREE.OctahedronGeometry(0.18, 0)),
        matChestGem,
        { pos: [0, 0.62, 0.42], outlineScale: 1.06 }
      );

      // Cute rotating golden wind-up key on its back
      windUpKey = new THREE.Group();
      windUpKey.position.set(0, 0.68, -0.45);
      addOutlinedMesh(
        windUpKey,
        cachedGeo("golem_key_stem", () => new THREE.CylinderGeometry(0.06, 0.06, 0.32, 8)),
        matGold,
        { pos: [0, 0, -0.14], rot: [Math.PI * 0.5, 0, 0], outline: false }
      );
      addOutlinedMesh(
        windUpKey,
        cachedGeo("golem_key_ring", () => new THREE.TorusGeometry(0.15, 0.05, 8, 12)),
        matGold,
        { pos: [0, 0.14, -0.28], outlineScale: 1.05 }
      );
      addOutlinedMesh(
        windUpKey,
        cachedGeo("golem_key_ring", () => new THREE.TorusGeometry(0.15, 0.05, 8, 12)),
        matGold,
        { pos: [0, -0.14, -0.28], outlineScale: 1.05 }
      );
      bodyPivot.add(windUpKey);
      hpHeight = 1.98;
    }

    const hpBar = buildMonsterHpBar(hpHeight);
    root.add(hpBar.barRoot);

    return {
      root,
      bodyPivot,
      windUpKey,
      capGroup,
      hpFillPivot: hpBar.fillPivot,
      species,
      _phase: Math.random() * 6.28,
    };
  }

  function animateCuteMonster(monster, dt, slowed = false) {
    if (!monster || !monster.bodyPivot) return;
    const rate = slowed ? 3.5 : 8.5;
    monster._phase = (monster._phase || 0) + (dt || 0.016) * rate;
    const p = monster._phase;

    if (monster.species === "slime") {
      const s = Math.sin(p);
      monster.bodyPivot.position.y = Math.max(0, s) * 0.24;
      const sxz = s > 0 ? 1 - s * 0.14 : 1 + Math.abs(s) * 0.16;
      const sy = s > 0 ? 1 + s * 0.18 : 1 - Math.abs(s) * 0.18;
      monster.bodyPivot.scale.set(sxz, sy, sxz);
    } else if (monster.species === "shroom") {
      monster.bodyPivot.position.y = Math.abs(Math.sin(p)) * 0.11;
      monster.bodyPivot.rotation.z = Math.sin(p * 0.5) * 0.12;
      if (monster.capGroup) {
        monster.capGroup.rotation.x = Math.sin(p) * 0.08;
      }
    } else {
      monster.bodyPivot.position.y = Math.abs(Math.sin(p)) * 0.08;
      monster.bodyPivot.rotation.z = Math.sin(p * 0.5) * 0.07;
      if (monster.windUpKey) {
        monster.windUpKey.rotation.z += (dt || 0.016) * (slowed ? 2.0 : 5.5);
      }
    }
  }

  // ===========================================================================
  // 9. Stylized Defense R&D Turrets (Flame, Frost, Thunder, Aegis Shrine)
  // ===========================================================================
  function createDefenseTurret(kind = "flame") {
    const root = new THREE.Group();
    const matStone = makeToonMat(0x52527a);
    const matGold = makeToonMat(0xf4c43a);

    addOutlinedMesh(
      root,
      cachedGeo("tur_pedestal", () => new THREE.CylinderGeometry(0.82, 1.05, 0.65, 10)),
      matStone,
      { pos: [0, 0.32, 0], outlineScale: 1.04 }
    );

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.72, 0);
    root.add(headPivot);

    if (kind === "flame") {
      const matFire = makeToonMat(0xff5e3a, { emissive: 0xd93814, emissiveIntensity: 0.35 });
      addOutlinedMesh(headPivot, cachedGeo("tur_fire_bowl", () => new THREE.CylinderGeometry(0.55, 0.42, 0.52, 10)), matFire, { pos: [0, 0.34, 0] });
      addOutlinedMesh(headPivot, cachedGeo("tur_fire_orb", () => new THREE.SphereGeometry(0.30, 12, 10)), makeToonMat(0xffe15a, { emissive: 0xff9b1a, emissiveIntensity: 0.45 }), { pos: [0, 0.72, 0] });
    } else if (kind === "frost") {
      const matIce = makeToonMat(0x5ae8ff, { emissive: 0x1cb4ff, emissiveIntensity: 0.38 });
      addOutlinedMesh(headPivot, cachedGeo("tur_ice_spire", () => new THREE.OctahedronGeometry(0.42, 0)), matIce, { pos: [0, 0.68, 0], scale: [0.85, 1.65, 0.85] });
    } else if (kind === "thunder") {
      const matVolt = makeToonMat(0xb678ff, { emissive: 0x8b3aff, emissiveIntensity: 0.4 });
      addOutlinedMesh(headPivot, cachedGeo("tur_volt_coil", () => new THREE.ConeGeometry(0.38, 1.05, 8)), matGold, { pos: [0, 0.54, 0] });
      addOutlinedMesh(headPivot, cachedGeo("tur_volt_ring", () => new THREE.TorusGeometry(0.52, 0.08, 8, 16)), matVolt, { pos: [0, 0.88, 0], rot: [Math.PI * 0.5, 0, 0] });
    } else {
      // aegis shrine
      const matAegis = makeToonMat(0x3ce88a, { emissive: 0x1eb862, emissiveIntensity: 0.36 });
      addOutlinedMesh(headPivot, cachedGeo("tur_aegis_gem", () => new THREE.OctahedronGeometry(0.48, 0)), matAegis, { pos: [0, 0.72, 0], scale: [1.0, 1.35, 0.7] });
      addOutlinedMesh(headPivot, cachedGeo("tur_aegis_halo", () => new THREE.TorusGeometry(0.68, 0.07, 8, 20)), matGold, { pos: [0, 0.68, 0], rot: [Math.PI * 0.5, 0, 0] });
    }

    return { root, headPivot, kind, _phase: 0 };
  }

  function animateDefenseTurret(turret, active, dt) {
    if (!turret || !turret.headPivot) return;
    const d = dt || 0.016;
    turret._phase = (turret._phase || 0) + d * (active ? 4.2 : 1.5);
    turret.headPivot.rotation.y += d * (active ? 2.8 : 0.9);
    turret.headPivot.position.y = 0.72 + Math.sin(turret._phase) * 0.08;
  }

  // ===========================================================================
  // 10. Single East Monster Siege Gate (🏰 동쪽 수호 성문 + 3단계 요새 증축 비주얼)
  // ===========================================================================
  function createVillageGate() {
    const root = new THREE.Group();
    const matStone = makeToonMat(0x7680a1);
    const matTrim = makeToonMat(0xb8863b);
    const matGold = makeToonMat(0xf5c542, { emissive: 0xd99b00, emissiveIntensity: 0.25 });
    const matMarble = makeToonMat(0xdce3f2);
    const matRoof = makeToonMat(0x2563eb);
    const matEmblem = makeToonMat(0x60efff, { emissive: 0x0ea5e9, emissiveIntensity: 0.55 });
    const matShield = new THREE.MeshToonMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.34,
    });

    // Twin Stepped Octagonal Citadel Bastion Towers at z = -4.2 and z = +4.2
    const sideSign = [-1, 1];
    sideSign.forEach((sz) => {
      const tower = new THREE.Group();
      tower.position.set(0, 0, sz * 4.2);

      // Stepped octagonal foundation plinths
      addOutlinedMesh(
        tower,
        cachedGeo("gate_plinth_outer", () => new THREE.CylinderGeometry(1.42, 1.56, 0.36, 8)),
        matStone,
        { pos: [0, 0.18, 0], outlineScale: 1.03 }
      );
      addOutlinedMesh(
        tower,
        cachedGeo("gate_plinth_mid", () => new THREE.CylinderGeometry(1.22, 1.32, 0.32, 8)),
        matMarble,
        { pos: [0, 0.52, 0], outlineScale: 1.03 }
      );
      // Tall octagonal tower shaft
      addOutlinedMesh(
        tower,
        cachedGeo("gate_tower_shaft", () => new THREE.CylinderGeometry(1.04, 1.18, 2.05, 8)),
        matStone,
        { pos: [0, 1.65, 0], outlineScale: 1.04 }
      );
      // Corbelled stone ring + golden belt trim
      addOutlinedMesh(
        tower,
        cachedGeo("gate_corbel_ring", () => new THREE.CylinderGeometry(1.22, 1.06, 0.34, 8)),
        matStone,
        { pos: [0, 2.75, 0], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        tower,
        cachedGeo("gate_gold_belt", () => new THREE.CylinderGeometry(1.13, 1.13, 0.14, 8)),
        matGold,
        { pos: [0, 1.65, 0], outline: false }
      );
      // Crenellated battlements around the corbel top
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        addOutlinedMesh(
          tower,
          cachedGeo("gate_merlon", () => new THREE.BoxGeometry(0.30, 0.28, 0.30)),
          matStone,
          { pos: [Math.cos(ang) * 0.96, 3.04, Math.sin(ang) * 0.96], rot: [0, -ang, 0], outlineScale: 1.04 }
        );
      }
      // Faceted royal spire roof + crown finial
      addOutlinedMesh(
        tower,
        cachedGeo("gate_spire_roof", () => new THREE.ConeGeometry(1.28, 1.35, 8)),
        matRoof,
        { pos: [0, 3.60, 0], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        tower,
        cachedGeo("gate_finial_orb", () => new THREE.SphereGeometry(0.18, 8, 8)),
        matGold,
        { pos: [0, 4.30, 0], outlineScale: 1.06 }
      );
      addOutlinedMesh(
        tower,
        cachedGeo("gate_finial_tip", () => new THREE.ConeGeometry(0.10, 0.42, 6)),
        matGold,
        { pos: [0, 4.58, 0], outline: false }
      );
      // Twin front & rear crystal sconces
      [-0.98, 0.98].forEach((sx) => {
        addOutlinedMesh(
          tower,
          cachedGeo("gate_lantern", () => new THREE.OctahedronGeometry(0.22, 0)),
          matEmblem,
          { pos: [sx, 2.05, 0], outlineScale: 1.06 }
        );
      });
      root.add(tower);
    });

    // Fluted Marble Inner Gate Columns (z = -3.15, +3.15)
    [-3.15, 3.15].forEach((cz) => {
      addOutlinedMesh(
        root,
        cachedGeo("gate_inner_col", () => new THREE.CylinderGeometry(0.30, 0.36, 2.55, 8)),
        matMarble,
        { pos: [0, 1.28, cz], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        root,
        cachedGeo("gate_inner_cap", () => new THREE.BoxGeometry(0.76, 0.24, 0.76)),
        matGold,
        { pos: [0, 2.60, cz], outlineScale: 1.04 }
      );
    });

    // Reinforced Stone & Golden Rune Threshold across z in [-3.8, +3.8]
    addOutlinedMesh(
      root,
      cachedGeo("gate_sill", () => new THREE.BoxGeometry(1.45, 0.14, 7.6)),
      matTrim,
      { pos: [0, 0.07, 0], outlineScale: 1.03 }
    );
    addOutlinedMesh(
      root,
      cachedGeo("gate_rune_bar", () => new THREE.BoxGeometry(0.36, 0.18, 6.8)),
      matGold,
      { pos: [0.35, 0.10, 0], outline: false }
    );

    // Arched Crenelated Royal Bridge & Heraldic Crest across Top
    addOutlinedMesh(
      root,
      cachedGeo("gate_arch_beam", () => new THREE.BoxGeometry(1.02, 0.48, 8.2)),
      matStone,
      { pos: [0, 2.86, 0], outlineScale: 1.03 }
    );
    addOutlinedMesh(
      root,
      cachedGeo("gate_arch_cornice", () => new THREE.BoxGeometry(1.16, 0.16, 8.4)),
      matMarble,
      { pos: [0, 3.15, 0], outlineScale: 1.03 }
    );
    [-2.8, -1.7, -0.7, 0.7, 1.7, 2.8].forEach((mz) => {
      addOutlinedMesh(
        root,
        cachedGeo("gate_bridge_merlon", () => new THREE.BoxGeometry(0.36, 0.26, 0.44)),
        matStone,
        { pos: [0, 3.34, mz], outlineScale: 1.04 }
      );
    });
    // Central Heraldic Shield Medallion (visible from both village and battlefield sides)
    addOutlinedMesh(
      root,
      cachedGeo("gate_crest_frame", () => new THREE.BoxGeometry(1.32, 0.76, 1.15)),
      matGold,
      { pos: [0, 2.96, 0], outlineScale: 1.04 }
    );
    [-0.68, 0.68].forEach((cx) => {
      addOutlinedMesh(
        root,
        cachedGeo("gate_crest_gem", () => new THREE.OctahedronGeometry(0.28, 0)),
        matEmblem,
        { pos: [cx, 2.96, 0], outlineScale: 1.06 }
      );
    });

    // Translucent Arcane Barrier Bars (Blocks monsters outside while letting hero pass freely)
    const barrierMesh = new THREE.Mesh(
      cachedGeo("gate_barrier", () => new THREE.BoxGeometry(0.18, 2.25, 6.4)),
      matShield
    );
    barrierMesh.position.set(0.2, 1.24, 0);
    root.add(barrierMesh);

    // -----------------------------------------------------------------------
    // 3-Stage Upgrade Subgroups (Lv.1 -> Lv.2 -> Lv.3 Visual Evolution)
    // -----------------------------------------------------------------------
    const tier1Group = new THREE.Group();
    tier1Group.visible = false;
    const matIronRune = makeToonMat(0x38bdf8, { emissive: 0x0ea5e9, emissiveIntensity: 0.6 });
    const matBronzeArmor = makeToonMat(0xd99b26);
    [-4.2, 4.2].forEach((tz) => {
      addOutlinedMesh(
        tier1Group,
        cachedGeo("gate_t1_armor_collar", () => new THREE.CylinderGeometry(1.34, 1.46, 0.48, 8)),
        matBronzeArmor,
        { pos: [0, 0.96, tz], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        tier1Group,
        cachedGeo("gate_t1_rune_ring", () => new THREE.CylinderGeometry(1.26, 1.26, 0.14, 8)),
        matIronRune,
        { pos: [0, 2.45, tz], outline: false }
      );
    });
    [-3.15, 3.15].forEach((cz) => {
      addOutlinedMesh(
        tier1Group,
        cachedGeo("gate_t1_col_rune", () => new THREE.BoxGeometry(0.70, 1.85, 0.14)),
        matIronRune,
        { pos: [0, 1.35, cz], outline: false }
      );
    });
    root.add(tier1Group);

    const tier2Group = new THREE.Group();
    tier2Group.visible = false;
    const matEmerald = makeToonMat(0x10b981, { emissive: 0x059669, emissiveIntensity: 0.65 });
    const tier2Crystals = [];
    [-4.2, 4.2].forEach((tz) => {
      const crys = addOutlinedMesh(
        tier2Group,
        cachedGeo("gate_t2_crystal", () => new THREE.OctahedronGeometry(0.42, 0)),
        matEmerald,
        { pos: [0, 5.15, tz], outlineScale: 1.06 }
      );
      tier2Crystals.push(crys);
      // Flanking emerald buttress fins
      addOutlinedMesh(
        tier2Group,
        cachedGeo("gate_t2_buttress", () => new THREE.BoxGeometry(1.85, 1.55, 0.34)),
        matBronzeArmor,
        { pos: [0, 0.85, tz + (tz < 0 ? -1.18 : 1.18)], outlineScale: 1.04 }
      );
    });
    // Upper golden crown truss over central arch
    addOutlinedMesh(
      tier2Group,
      cachedGeo("gate_t2_arch_truss", () => new THREE.BoxGeometry(0.68, 0.32, 4.8)),
      matGold,
      { pos: [0, 3.60, 0], outlineScale: 1.04 }
    );
    root.add(tier2Group);

    const tier3Group = new THREE.Group();
    tier3Group.visible = false;
    const matHolySun = makeToonMat(0xfde047, { emissive: 0xf59e0b, emissiveIntensity: 0.85 });
    const haloPivot = new THREE.Group();
    haloPivot.position.set(0, 4.55, 0);
    // Radiant sacred royal sigil above central bridge
    addOutlinedMesh(
      haloPivot,
      cachedGeo("gate_t3_halo_core", () => new THREE.OctahedronGeometry(0.48, 0)),
      matHolySun,
      { pos: [0, 0, 0], outlineScale: 1.07 }
    );
    [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75].forEach((ang) => {
      addOutlinedMesh(
        haloPivot,
        cachedGeo("gate_t3_ray", () => new THREE.BoxGeometry(0.14, 1.35, 0.14)),
        matGold,
        { pos: [0, 0, 0], rot: [ang, 0, 0], outline: false }
      );
    });
    tier3Group.add(haloPivot);
    // Imperial side guardian spires at z = -5.6 and +5.6
    [-5.6, 5.6].forEach((sz) => {
      addOutlinedMesh(
        tier3Group,
        cachedGeo("gate_t3_pillar", () => new THREE.CylinderGeometry(0.42, 0.58, 2.35, 6)),
        matMarble,
        { pos: [0, 1.18, sz], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        tier3Group,
        cachedGeo("gate_t3_spire", () => new THREE.ConeGeometry(0.56, 0.95, 6)),
        matGold,
        { pos: [0, 2.80, sz], outlineScale: 1.05 }
      );
      addOutlinedMesh(
        tier3Group,
        cachedGeo("gate_t3_orb", () => new THREE.OctahedronGeometry(0.28, 0)),
        matHolySun,
        { pos: [0, 3.55, sz], outlineScale: 1.06 }
      );
    });
    root.add(tier3Group);

    // Large High-Contrast 3D Gate Durability Bar perched high & clear of crowns
    const hpBarGroup = new THREE.Group();
    hpBarGroup.position.set(0, 5.45, 0);
    hpBarGroup.rotation.y = Math.PI * 0.5;
    const barBg = new THREE.Mesh(
      cachedGeo("gate_hp_bg", () => new THREE.BoxGeometry(5.4, 0.24, 0.36)),
      new THREE.MeshBasicMaterial({ color: 0x1e132e })
    );
    hpBarGroup.add(barBg);

    const hpFillPivot = new THREE.Group();
    hpFillPivot.position.set(-2.6, 0.08, 0);
    const barFg = new THREE.Mesh(
      cachedGeo("gate_hp_fg", () => new THREE.BoxGeometry(5.2, 0.24, 0.44)),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    barFg.position.set(2.6, 0, 0);
    hpFillPivot.add(barFg);
    hpBarGroup.add(hpFillPivot);
    root.add(hpBarGroup);

    return {
      root,
      barrierMesh,
      barrierMat: matShield,
      hpFillPivot,
      hpFgMesh: barFg,
      matStone,
      matRoof,
      matTrim,
      matEmblem,
      tier1Group,
      tier2Group,
      tier3Group,
      tier2Crystals,
      haloPivot,
      tier: 0,
      _phase: 0,
    };
  }

  function updateVillageGateTier(gate, tier = 0) {
    if (!gate) return;
    const t = Math.max(0, Math.min(3, Math.floor(Number(tier) || 0)));
    gate.tier = t;
    if (gate.tier1Group) gate.tier1Group.visible = t >= 1;
    if (gate.tier2Group) gate.tier2Group.visible = t >= 2;
    if (gate.tier3Group) gate.tier3Group.visible = t >= 3;

    if (gate.matStone && gate.matRoof && gate.matEmblem && gate.barrierMat) {
      if (t === 0) {
        gate.matStone.color.setHex(0x7680a1);
        gate.matRoof.color.setHex(0x2563eb);
        gate.matEmblem.color.setHex(0x60efff);
        gate.barrierMat.color.setHex(0x38bdf8);
      } else if (t === 1) {
        gate.matStone.color.setHex(0x647096);
        gate.matRoof.color.setHex(0x1d4ed8);
        gate.matEmblem.color.setHex(0x38bdf8);
        gate.barrierMat.color.setHex(0x22d3ee);
      } else if (t === 2) {
        gate.matStone.color.setHex(0x95a4c8);
        gate.matRoof.color.setHex(0x059669);
        gate.matEmblem.color.setHex(0x34d399);
        gate.barrierMat.color.setHex(0x34d399);
      } else {
        gate.matStone.color.setHex(0xe2e8f6);
        gate.matRoof.color.setHex(0xd97706);
        gate.matEmblem.color.setHex(0xfde047);
        gate.barrierMat.color.setHex(0xfacc15);
      }
    }
  }

  function animateVillageGate(gate, underAttack, dt) {
    if (!gate) return;
    const d = dt || 0.016;
    gate._phase = (gate._phase || 0) + d * (underAttack ? 7.0 : 2.5);
    if (gate.barrierMat) {
      gate.barrierMat.opacity = (underAttack ? 0.42 : 0.24) + Math.sin(gate._phase) * 0.08;
    }
    if (gate.tier >= 2 && gate.tier2Crystals) {
      gate.tier2Crystals.forEach((crys, idx) => {
        crys.rotation.y += d * 1.8;
        crys.position.y = 5.15 + Math.sin(gate._phase + idx * 1.5) * 0.14;
      });
    }
    if (gate.tier >= 3 && gate.haloPivot) {
      gate.haloPivot.rotation.y += d * 1.4;
      gate.haloPivot.rotation.x = Math.sin(gate._phase * 0.6) * 0.18;
      gate.haloPivot.position.y = 4.55 + Math.sin(gate._phase) * 0.12;
    }
  }

  // ===========================================================================
  // 11. District Hub 3D Buildings (⚒️ 대장간, 🧚 길드, 🛡️ 디펜스 연구소)
  // Low-profile <= 2.2m hubs with 4-way directional stone spokes
  // ===========================================================================
  function createCategoryBuilding(kind = "forge") {
    const root = new THREE.Group();
    const matStone = makeToonMat(0x767a99);
    const matTimber = makeToonMat(0x9b6236);
    const matGold = makeToonMat(0xf4be3c, { emissive: 0xb87a10, emissiveIntensity: 0.16 });
    let accentRotor = null;

    // Central Octagonal Plinth + 4 Directional Stone Spokes (N / S / E / W)
    addOutlinedMesh(
      root,
      cachedGeo("hub_plinth", () => new THREE.CylinderGeometry(1.95, 2.15, 0.24, 8)),
      matStone,
      { pos: [0, 0.12, 0], outlineScale: 1.03 }
    );
    const spokeX = cachedGeo("hub_spoke_x", () => new THREE.BoxGeometry(5.6, 0.05, 0.85));
    const spokeZ = cachedGeo("hub_spoke_z", () => new THREE.BoxGeometry(0.85, 0.05, 5.6));
    const matPath = makeToonMat(0xe5d3b3);
    const meshSpokeX = new THREE.Mesh(spokeX, matPath);
    meshSpokeX.position.set(0, 0.03, 0);
    root.add(meshSpokeX);
    const meshSpokeZ = new THREE.Mesh(spokeZ, matPath);
    meshSpokeZ.position.set(0, 0.03, 0);
    root.add(meshSpokeZ);

    if (kind === "forge") {
      // ⚒️ Equipment Enhancement Forge (곡괭이·배낭·부츠 대장간)
      addOutlinedMesh(
        root,
        cachedGeo("forge_hearth", () => new THREE.BoxGeometry(2.1, 1.35, 1.45)),
        makeToonMat(0xb85242),
        { pos: [0, 0.88, -0.35], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        root,
        cachedGeo("forge_chimney", () => new THREE.BoxGeometry(0.75, 0.72, 0.75)),
        matStone,
        { pos: [-0.45, 1.82, -0.45], outlineScale: 1.05 }
      );
      addOutlinedMesh(
        root,
        cachedGeo("forge_fire", () => new THREE.SphereGeometry(0.32, 10, 8)),
        makeToonMat(0xff7728, { emissive: 0xff4500, emissiveIntensity: 0.55 }),
        { pos: [0, 0.65, 0.35], outline: false }
      );
      // Golden Anvil + Spinning Forge Crest
      addOutlinedMesh(
        root,
        cachedGeo("forge_anvil", () => new THREE.BoxGeometry(0.95, 0.42, 0.55)),
        makeToonMat(0x4c4a6b),
        { pos: [0.55, 0.48, 0.58], outlineScale: 1.05 }
      );
      accentRotor = new THREE.Group();
      accentRotor.position.set(0.55, 1.65, -0.15);
      addOutlinedMesh(
        accentRotor,
        cachedGeo("forge_emblem", () => new THREE.OctahedronGeometry(0.34, 0)),
        matGold,
        { outlineScale: 1.06 }
      );
      root.add(accentRotor);
    } else if (kind === "guild") {
      // 🧚 Automation & Harvest Guild Hall (요정 일꾼·트럭·광산/약초 확장 길드)
      addOutlinedMesh(
        root,
        cachedGeo("guild_hall", () => new THREE.BoxGeometry(2.35, 1.18, 1.55)),
        makeToonMat(0x3ba682),
        { pos: [0, 0.80, -0.25], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        root,
        cachedGeo("guild_trim", () => new THREE.BoxGeometry(2.55, 0.22, 1.72)),
        matTimber,
        { pos: [0, 1.48, -0.25], outlineScale: 1.04 }
      );
      // Twin Crystal Spirelets + Floating Guild Star
      [-0.78, 0.78].forEach((gx) => {
        addOutlinedMesh(
          root,
          cachedGeo("guild_spire", () => new THREE.ConeGeometry(0.38, 0.72, 6)),
          makeToonMat(0x5eead4),
          { pos: [gx, 1.92, -0.25], outlineScale: 1.05 }
        );
      });
      accentRotor = new THREE.Group();
      accentRotor.position.set(0, 1.85, 0.25);
      addOutlinedMesh(
        accentRotor,
        cachedGeo("guild_star", () => new THREE.OctahedronGeometry(0.30, 0)),
        matGold,
        { outlineScale: 1.06 }
      );
      root.add(accentRotor);
    } else {
      // 🛡️ Defense Tech Research Lab (디펜스 기술 연구소)
      addOutlinedMesh(
        root,
        cachedGeo("lab_body", () => new THREE.CylinderGeometry(1.15, 1.38, 1.15, 8)),
        makeToonMat(0x524c9e),
        { pos: [0, 0.78, 0], outlineScale: 1.04 }
      );
      addOutlinedMesh(
        root,
        cachedGeo("lab_ring", () => new THREE.TorusGeometry(0.95, 0.11, 8, 18)),
        matGold,
        { pos: [0, 1.42, 0], rot: [Math.PI * 0.5, 0, 0], outlineScale: 1.05 }
      );
      accentRotor = new THREE.Group();
      accentRotor.position.set(0, 1.75, 0);
      addOutlinedMesh(
        accentRotor,
        cachedGeo("lab_crystal", () => new THREE.OctahedronGeometry(0.45, 0)),
        makeToonMat(0x52efff, { emissive: 0x0ea5e9, emissiveIntensity: 0.45 }),
        { scale: [0.85, 1.35, 0.85], outlineScale: 1.06 }
      );
      root.add(accentRotor);
    }

    return { root, accentRotor, kind, _phase: 0 };
  }

  function animateCategoryBuilding(building, dt) {
    if (!building || !building.accentRotor) return;
    const d = dt || 0.016;
    building._phase = (building._phase || 0) + d * 2.2;
    building.accentRotor.rotation.y += d * 1.4;
    building.accentRotor.position.y += Math.sin(building._phase) * 0.002;
  }

  window.ChibiCharacters = {
    CRATE_W,
    CRATE_H,
    CRATE_D,
    makeToonMat,
    addOutlinedMesh,
    createAlchemistHero,
    updateHeroTier,
    animateHero,
    createFairyWorker,
    animateFairy,
    createAnimalCustomer,
    animateCustomer,
    createResourceCrate,
    createProductionMachine,
    animateProductionMachine,
    createHarvesterTruck,
    animateHarvesterTruck,
    createRoyalTradeWagon,
    animateRoyalTradeWagon,
    createCuteMonster,
    animateCuteMonster,
    createDefenseTurret,
    animateDefenseTurret,
    createVillageGate,
    updateVillageGateTier,
    animateVillageGate,
    createCategoryBuilding,
    animateCategoryBuilding,
  };
})();
