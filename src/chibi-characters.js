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

  function makeVerticalDownArrowGeometry(headW = 1.28, headL = 0.88, shaftW = 0.54, shaftL = 0.78, depth = 0.22) {
    return cachedGeo(`varrow_${headW}_${headL}_${shaftW}_${shaftL}_${depth}`, () => {
      if (typeof THREE.Shape !== "function" || typeof THREE.ExtrudeGeometry !== "function") {
        const g = new THREE.ConeGeometry(headW * 0.5, headL + shaftL, 6);
        g.rotateX(Math.PI);
        return g;
      }
      const hw = headW * 0.5;
      const sw = shaftW * 0.5;
      const topY = shaftL * 0.5 + headL * 0.45;
      const neckY = -shaftL * 0.5;
      const tipY = neckY - headL;

      const shape = new THREE.Shape();
      shape.moveTo(0, tipY);
      shape.lineTo(hw, neckY);
      shape.lineTo(sw, neckY);
      shape.lineTo(sw, topY);
      shape.lineTo(-sw, topY);
      shape.lineTo(-sw, neckY);
      shape.lineTo(-hw, neckY);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      geo.center();
      return geo;
    });
  }

  function makeChevronGeometry(w = 1.15, l = 0.75, thickness = 0.34, depth = 0.08) {
    return cachedGeo(`chev_${w}_${l}_${thickness}_${depth}`, () => {
      if (typeof THREE.Shape !== "function" || typeof THREE.ExtrudeGeometry !== "function") {
        return new THREE.BoxGeometry(w, depth, l * 0.5);
      }
      const hw = w * 0.5;
      const hl = l * 0.5;
      const shape = new THREE.Shape();
      shape.moveTo(0, hl);
      shape.lineTo(hw, -hl);
      shape.lineTo(hw - thickness, -hl);
      shape.lineTo(0, hl - thickness * 1.18);
      shape.lineTo(-hw + thickness, -hl);
      shape.lineTo(-hw, -hl);
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

    // Giant Playable-Ad 3D Guide Arrow + Marching Chevrons around Hero feet
    const guideArrowGroup = new THREE.Group();
    guideArrowGroup.position.y = 0.09;
    const guideArrowMat = new THREE.MeshBasicMaterial({
      color: 0xffe629,
    });
    const whiteRimMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    // Crisp white backing rim slightly below golden 3D arrow head
    const arrowGeo = makeArrowShapeGeometry(1.26, 1.02, 0.56, 1.10, 0.12);
    const arrowRim = new THREE.Mesh(arrowGeo, whiteRimMat);
    arrowRim.position.set(0, 0.03, 2.55);
    arrowRim.scale.set(1.13, 0.65, 1.10);
    guideArrowGroup.add(arrowRim);

    addOutlinedMesh(
      guideArrowGroup,
      arrowGeo,
      guideArrowMat,
      { pos: [0, 0.09, 2.55], castShadow: false, receiveShadow: false, outlineScale: 1.09 }
    );

    const chevGeo = makeChevronGeometry(1.04, 0.66, 0.30, 0.07);
    const chevrons = [];
    for (let i = 0; i < 3; i++) {
      const ch = addOutlinedMesh(
        guideArrowGroup,
        chevGeo,
        guideArrowMat,
        { pos: [0, 0.06, 1.25 + i * 0.72], castShadow: false, receiveShadow: false, outlineScale: 1.08 }
      );
      chevrons.push(ch);
    }
    guideArrowGroup.userData.chevrons = chevrons;
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

  function createAnimalCustomer(variantIdx = 0) {
    const v = CUSTOMER_VARIANTS[variantIdx % CUSTOMER_VARIANTS.length];
    const root = new THREE.Group();
    root.add(makeShadowCircle(0.56, 0.22));

    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const matHood = makeToonMat(v.hood);
    const matInner = makeToonMat(v.earInner);
    const matTunic = makeToonMat(v.tunic);
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

  function createResourceCrate(type = "starlight_crystal") {
    const g = new THREE.Group();
    g.userData.itemType = type;

    if (type === "mana_gem") {
      // Compact currency gem/gold-trimmed brick (stacks in 3x3 skyscraper pedestal)
      addOutlinedMesh(
        g,
        cachedGeo("gem_brick_body", () => new THREE.BoxGeometry(0.44, 0.13, 0.32)),
        makeToonMat(0x2fd8ff, { emissive: 0x16a3ff, emissiveIntensity: 0.32 }),
        { pos: [0, 0.065, 0], castShadow: false, receiveShadow: false, outlineScale: 1.07 }
      );
      addOutlinedMesh(
        g,
        cachedGeo("gem_brick_band", () => new THREE.BoxGeometry(0.14, 0.145, 0.34)),
        makeToonMat(0xffe15a, { emissive: 0xffb824, emissiveIntensity: 0.25 }),
        { pos: [0, 0.068, 0], castShadow: false, receiveShadow: false, outline: false }
      );
      return g;
    }

    // Wide wooden crate base + raised edge trim (0.95 x 0.20 x 0.62)
    const matWoodBase = makeToonMat(type === "elixir_5x" ? 0xc28a49 : type === "cut_gem_3x" ? 0x996b47 : 0xb87e48);
    const matWoodTrim = makeToonMat(type === "elixir_5x" ? 0xf5ca52 : 0x7b4c28);

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
    if (type === "starlight_crystal") {
      const matCrys = makeToonMat(0x52e8ff, { emissive: 0x24bfff, emissiveIntensity: 0.3 });
      const matCrysHi = makeToonMat(0xb8f9ff, { emissive: 0x62f2ff, emissiveIntensity: 0.35 });
      const shardGeo = cachedGeo("crate_crystal_shard", () => new THREE.OctahedronGeometry(0.115, 0));
      for (let i = 0; i < 6; i++) {
        const col = i % 3;
        const row = (i / 3) | 0;
        const m = new THREE.Mesh(shardGeo, i % 2 === 0 ? matCrys : matCrysHi);
        m.position.set(-0.27 + col * 0.27, 0.135, -0.12 + row * 0.24);
        m.scale.set(1.05, 0.72, 1.05);
        m.rotation.set(0.2 * (row - 0.5), col * 0.6, 0.18 * (col - 1));
        g.add(m);
      }
    } else if (type === "rainbow_berry") {
      const matB1 = makeToonMat(0xff5e94, { emissive: 0xd62467, emissiveIntensity: 0.18 });
      const matB2 = makeToonMat(0xff9f45, { emissive: 0xd96b16, emissiveIntensity: 0.18 });
      const matLeaf = makeToonMat(0x52c44d);
      const berryGeo = cachedGeo("crate_berry", () => new THREE.SphereGeometry(0.095, 8, 8));
      const leafGeo = cachedGeo("crate_leaf", () => new THREE.BoxGeometry(0.09, 0.03, 0.06));
      for (let i = 0; i < 6; i++) {
        const col = i % 3;
        const row = (i / 3) | 0;
        const x = -0.26 + col * 0.26;
        const z = -0.11 + row * 0.22;
        const b = new THREE.Mesh(berryGeo, i % 2 === 0 ? matB1 : matB2);
        b.position.set(x, 0.13, z);
        g.add(b);
        const lf = new THREE.Mesh(leafGeo, matLeaf);
        lf.position.set(x + 0.03, 0.19, z);
        lf.rotation.y = i * 0.8;
        g.add(lf);
      }
    } else if (type === "potion_2x") {
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
    } else if (type === "cut_gem_3x") {
      const matGem1 = makeToonMat(0xc56bff, { emissive: 0x9b36ff, emissiveIntensity: 0.35 });
      const matGem2 = makeToonMat(0xff7ee6, { emissive: 0xd93abf, emissiveIntensity: 0.35 });
      const gemGeo = cachedGeo("crate_cut_gem", () => new THREE.ConeGeometry(0.11, 0.13, 6));
      for (let i = 0; i < 4; i++) {
        const x = -0.29 + i * 0.195;
        const m = new THREE.Mesh(gemGeo, i % 2 === 0 ? matGem1 : matGem2);
        m.position.set(x, 0.14, (i % 2 - 0.5) * 0.07);
        g.add(m);
      }
    } else {
      // elixir_5x: golden-rainbow elixir ampoules
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
  // 7. World Marching Ground Chevron Trail & Overhead 3D Target Beacon (▼)
  // ===========================================================================
  function createWorldGuideWidgets() {
    const root = new THREE.Group();
    const trailMat = new THREE.MeshBasicMaterial({ color: 0xffe629 });
    const trailNodes = [];
    const chevGeo = makeChevronGeometry(1.18, 0.78, 0.35, 0.08);
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < 8; i++) {
      const node = new THREE.Group();
      const rim = new THREE.Mesh(chevGeo, whiteMat);
      rim.scale.set(1.14, 0.7, 1.14);
      rim.position.y = 0.04;
      node.add(rim);

      addOutlinedMesh(node, chevGeo, trailMat, {
        pos: [0, 0.08, 0],
        castShadow: false,
        receiveShadow: false,
        outlineScale: 1.08,
      });
      node.visible = false;
      root.add(node);
      trailNodes.push(node);
    }

    const beaconGroup = new THREE.Group();
    const beaconRingMat = new THREE.MeshBasicMaterial({
      color: 0xffe629,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    const beaconRing = new THREE.Mesh(
      cachedGeo("guide_beacon_ring", () => new THREE.RingGeometry(1.35, 1.82, 32)),
      beaconRingMat
    );
    beaconRing.rotation.x = -Math.PI * 0.5;
    beaconRing.position.y = 0.055;
    beaconGroup.add(beaconRing);

    const beaconArrow = new THREE.Group();
    beaconArrow.position.y = 2.8;
    const vArrowGeo = makeVerticalDownArrowGeometry(1.32, 0.92, 0.56, 0.82, 0.24);
    addOutlinedMesh(beaconArrow, vArrowGeo, trailMat, {
      castShadow: false,
      receiveShadow: false,
      outlineScale: 1.08,
    });
    beaconGroup.add(beaconArrow);
    root.add(beaconGroup);

    return {
      root,
      trailNodes,
      trailMat,
      beaconGroup,
      beaconArrow,
      beaconRing,
      beaconRingMat,
    };
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
    createWorldGuideWidgets,
  };
})();
