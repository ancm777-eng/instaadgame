// =============================================================================
// src/gameplay.js - Pure 3-Stage Fairy Alchemy Tycoon Simulation, Pallets,
// 3-Machine Production Line, 84 Dense Farm Nodes, 3x3 Gem Skyscraper & Shop
// =============================================================================

(function () {
  "use strict";

  const SAVE_KEY = "fairy_alchemy_tycoon_v4";

  const ITEM_META = {
    starlight_crystal: { label: "별빛 수정", val: 10 },
    rainbow_berry: { label: "무지개 열매", val: 10 },
    potion_2x: { label: "황금 포션(2x)", val: 20 },
    cut_gem_3x: { label: "가공 보석(3x)", val: 30 },
    elixir_5x: { label: "무지개 엘릭서(5x)", val: 50 },
  };

  const UPGRADE_DEFS = {
    tool: {
      id: "tool",
      tab: "wizard",
      icon: "🪄",
      title: "수확 속도",
      desc: "크리스탈·열매 채집 속도와 수확 배율을 높입니다.",
      accent: "#52efff",
      baseCost: 30,
      mult: 1.85,
      maxLv: 8,
    },
    bag: {
      id: "bag",
      tab: "wizard",
      icon: "🎒",
      title: "지게 적재",
      desc: "등 뒤 나무 지게에 쌓이는 상자 최대 수를 늘립니다.",
      accent: "#ffd24c",
      baseCost: 35,
      mult: 1.8,
      maxLv: 8,
    },
    speed: {
      id: "speed",
      tab: "wizard",
      icon: "👢",
      title: "신속 부츠",
      desc: "꼬마 연금술사의 이동 속도를 크게 높입니다.",
      accent: "#7effa2",
      baseCost: 40,
      mult: 1.8,
      maxLv: 6,
    },
    m1: {
      id: "m1",
      tab: "automation",
      icon: "⚗️",
      title: "1호기 가마솥",
      desc: "원석/열매 상자를 2배 가치 황금 포션으로 연성합니다.",
      accent: "#52ff9b",
      baseCost: 50,
      mult: 1.9,
      maxLv: 6,
    },
    m2: {
      id: "m2",
      tab: "automation",
      icon: "💎",
      title: "2호기 커팅기",
      desc: "크리스탈을 3배 가치 빛나는 보석으로 세공합니다.",
      accent: "#d67aff",
      baseCost: 180,
      mult: 1.9,
      maxLv: 6,
    },
    m3: {
      id: "m3",
      tab: "automation",
      icon: "🌈",
      title: "3호기 증류기",
      desc: "마력 자원을 5배 가치 무지개 엘릭서로 증류합니다.",
      accent: "#ff78d2",
      baseCost: 480,
      mult: 1.9,
      maxLv: 6,
    },
    fairy: {
      id: "fairy",
      tab: "automation",
      icon: "🧚",
      title: "요정 일꾼",
      desc: "자동으로 채집하고 설비·판매대에 납품하는 요정(최대 15).",
      accent: "#ff88c2",
      baseCost: 60,
      mult: 1.55,
      maxLv: 15,
    },
    truck: {
      id: "truck",
      tab: "automation",
      icon: "🚜",
      title: "수확 트럭",
      desc: "농장을 휩쓸며 대량으로 상자를 수확하는 메가 트럭.",
      accent: "#4ce6d8",
      baseCost: 220,
      mult: 1.95,
      maxLv: 5,
    },
    farm2: {
      id: "farm2",
      tab: "automation",
      icon: "🌿",
      title: "북동 농장",
      desc: "24개 고밀도 별빛 수정·열매 농장을 북동 게이트에 해금.",
      accent: "#6bff9e",
      baseCost: 160,
      mult: 1,
      maxLv: 1,
    },
    farm3: {
      id: "farm3",
      tab: "automation",
      icon: "🌺",
      title: "북서 농장",
      desc: "24개 최고밀도 마법 농장을 북서 게이트에 해금.",
      accent: "#c985ff",
      baseCost: 360,
      mult: 1,
      maxLv: 1,
    },
  };

  const MACHINE_CONFIGS = [
    {
      id: "m1",
      padId: "m1",
      kind: "cauldron",
      x: -10.5,
      z: -12.8,
      inPos: { x: -13.6, z: -11.4 },
      outPos: { x: -7.4, z: -11.4 },
      padPos: { x: -10.5, z: -7.4 },
      outputType: "potion_2x",
      baseCraftTime: 1.55,
      accent: "#52ff9b",
    },
    {
      id: "m2",
      padId: "m2",
      kind: "cutter",
      x: 0.0,
      z: -12.8,
      inPos: { x: -3.1, z: -11.4 },
      outPos: { x: 3.1, z: -11.4 },
      padPos: { x: 0.0, z: -7.4 },
      outputType: "cut_gem_3x",
      baseCraftTime: 1.85,
      accent: "#d67aff",
    },
    {
      id: "m3",
      padId: "m3",
      kind: "distillery",
      x: 10.5,
      z: -12.8,
      inPos: { x: 7.4, z: -11.4 },
      outPos: { x: 13.6, z: -11.4 },
      padPos: { x: 10.5, z: -7.4 },
      outputType: "elixir_5x",
      baseCraftTime: 2.15,
      accent: "#ff78d2",
    },
  ];

  const STALL_POS = { x: -14.2, z: 2.2 };
  const SELL_PALLET_POS = { x: -9.8, z: 2.4 };
  const GEM_PEDESTAL_POS = { x: -9.8, z: -2.2 };

  // ---------------------------------------------------------------------------
  // State & Runtime Containers
  // ---------------------------------------------------------------------------
  let state = createDefaultState();

  function createDefaultState() {
    return {
      gems: 20,
      totalEarnedGems: 0,
      xp: 0,
      xpMax: 100,
      level: 1,
      toolLv: 0,
      bagLv: 0,
      speedLv: 0,
      m1Lv: 0,
      m2Lv: 0,
      m3Lv: 0,
      fairyCount: 0,
      truckLv: 0,
      farm2Unlocked: false,
      farm3Unlocked: false,
      muted: false,
      padPaid: {},
    };
  }

  const player = {
    x: 0,
    z: 2.0,
    vx: 0,
    vz: 0,
    rotY: 0,
    walkPhase: 0,
    swingTimer: 0,
    swingDuration: 0.26,
    bagItems: [],
    harvestCooldown: 0,
    transferCooldown: 0,
  };

  const input = {
    keys: new Set(),
    joyX: 0,
    joyY: 0,
    joyActive: false,
    joyId: null,
    originX: 0,
    originY: 0,
  };

  const runtime = {
    time: 0,
    fpsSmooth: 60,
    farmNodes: [],
    machines: [],
    stepPads: [],
    sellPalletQueue: [],
    sellPalletVisuals: [],
    pedestalGems: [], // array of brick value/visual items
    pedestalVisuals: [],
    flyingBricks: [],
    particles: [],
    fairies: [],
    customers: [],
    truck: null,
    heroBackVisuals: [],
    sellCooldown: 0,
    gemVacuumCooldown: 0,
    gemCombo: 0,
    shopOpen: false,
    shopTab: "wizard",
    lastHudSync: 0,
    toastTimer: 0,
  };

  const sceneObjs = {
    hero: null,
    stall: null,
    sellPallet: null,
    gemPedestal: null,
  };

  let _initialized = false;
  let _domBound = false;
  let _rafId = null;
  let _lastRafTs = 0;

  // ---------------------------------------------------------------------------
  // WebAudio Harmonic Tycoon Synthesizer (Safe when AudioContext unavailable)
  // ---------------------------------------------------------------------------
  let _audioCtx = null;

  function playTone(freq, dur = 0.08, type = "sine", gainVal = 0.06, delay = 0) {
    if (state.muted || typeof window === "undefined") return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!_audioCtx) _audioCtx = new AC();
      if (_audioCtx.state === "suspended") _audioCtx.resume();
      const now = _audioCtx.currentTime + delay;
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (e) {
      // ignore autoplay blocks
    }
  }

  function playHarvestChime(pitchIdx = 0) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0];
    playTone(scale[pitchIdx % scale.length], 0.09, "triangle", 0.055);
  }

  function playGemChime(combo = 0) {
    const semitones = Math.min(20, combo);
    const freq = 587.33 * Math.pow(2, semitones / 14);
    playTone(freq, 0.075, "sine", 0.05);
  }

  function playBuildPop() {
    playTone(523.25, 0.09, "triangle", 0.07, 0);
    playTone(659.25, 0.10, "triangle", 0.07, 0.06);
    playTone(783.99, 0.16, "triangle", 0.08, 0.12);
  }

  // ---------------------------------------------------------------------------
  // Economy Helpers
  // ---------------------------------------------------------------------------
  function getUpgradeLevel(id) {
    switch (id) {
      case "tool": return state.toolLv;
      case "bag": return state.bagLv;
      case "speed": return state.speedLv;
      case "m1": return state.m1Lv;
      case "m2": return state.m2Lv;
      case "m3": return state.m3Lv;
      case "fairy": return state.fairyCount;
      case "truck": return state.truckLv;
      case "farm2": return state.farm2Unlocked ? 1 : 0;
      case "farm3": return state.farm3Unlocked ? 1 : 0;
      default: return 0;
    }
  }

  function getUpgradeCost(id) {
    const def = UPGRADE_DEFS[id];
    if (!def) return 999999;
    const lv = getUpgradeLevel(id);
    if (lv >= def.maxLv) return 0;
    return Math.round(def.baseCost * Math.pow(def.mult, lv));
  }

  function isUpgradeMax(id) {
    const def = UPGRADE_DEFS[id];
    return !def || getUpgradeLevel(id) >= def.maxLv;
  }

  function applyUpgradeLevel(id) {
    switch (id) {
      case "tool":
        state.toolLv++;
        if (window.Entities && sceneObjs.hero) {
          window.Entities.updateHeroTier(sceneObjs.hero, Math.min(4, Math.floor(state.toolLv / 2)));
        }
        showToast(`🪄 수확 속도 Lv.${state.toolLv} 달성!`);
        break;
      case "bag":
        state.bagLv++;
        showToast(`🎒 지게 용량 ${getHeroBagCap()}칸으로 확장!`);
        break;
      case "speed":
        state.speedLv++;
        showToast(`👢 이동 속도 Lv.${state.speedLv} 가속!`);
        break;
      case "m1":
        state.m1Lv++;
        if (runtime.machines[0]) runtime.machines[0].lv = state.m1Lv;
        showToast(state.m1Lv === 1 ? "⚗️ 1호기 황금 가마솥(2x) 가동 시작!" : `⚗️ 1호기 Lv.${state.m1Lv} 가속!`);
        break;
      case "m2":
        state.m2Lv++;
        if (runtime.machines[1]) runtime.machines[1].lv = state.m2Lv;
        showToast(state.m2Lv === 1 ? "💎 2호기 크리스탈 커팅기(3x) 가동!" : `💎 2호기 Lv.${state.m2Lv} 가속!`);
        break;
      case "m3":
        state.m3Lv++;
        if (runtime.machines[2]) runtime.machines[2].lv = state.m3Lv;
        showToast(state.m3Lv === 1 ? "🌈 3호기 무지개 증류기(5x) 가동!" : `🌈 3호기 Lv.${state.m3Lv} 가속!`);
        break;
      case "fairy":
        state.fairyCount++;
        syncFairiesCount();
        showToast(`🧚 요정 일꾼 ${state.fairyCount}호 합류!`);
        break;
      case "truck":
        state.truckLv++;
        ensureTruckSpawned();
        showToast(state.truckLv === 1 ? "🚜 메가 수확 트럭 출고!" : `🚜 메가 트럭 Lv.${state.truckLv} 업그레이드!`);
        break;
      case "farm2":
        state.farm2Unlocked = true;
        refreshFarmZoneVisibility();
        showToast("🌿 북동 게이트 24노드 농장 해금!");
        break;
      case "farm3":
        state.farm3Unlocked = true;
        refreshFarmZoneVisibility();
        showToast("🌺 북서 게이트 24노드 농장 해금!");
        break;
      default:
        break;
    }
    state.padPaid[id] = 0;
    addXp(25);
    playBuildPop();
    spawnBurstVfx(player.x, 1.0, player.z, 0x62ffaa, 12);
    saveGame();
    if (runtime.shopOpen) renderShop();
  }

  function purchaseUpgradeDirect(id) {
    if (isUpgradeMax(id)) return false;
    const cost = getUpgradeCost(id);
    if (state.gems < cost) return false;
    state.gems -= cost;
    applyUpgradeLevel(id);
    return true;
  }

  function getHeroBagCap() {
    return 16 + state.bagLv * 8;
  }

  function getHeroMoveSpeed() {
    return 7.6 + state.speedLv * 0.95;
  }

  function getHeroHarvestInterval() {
    return Math.max(0.11, 0.34 - state.toolLv * 0.032);
  }

  function getHeroHarvestYield() {
    return 1 + Math.floor(state.toolLv / 3);
  }

  function addXp(amount) {
    state.xp += amount;
    while (state.xp >= state.xpMax) {
      state.xp -= state.xpMax;
      state.level++;
      state.xpMax = Math.round(state.xpMax * 1.35);
      showToast(`✨ 연금술사 Lv.${state.level} 달성!`);
    }
  }

  function showToast(msg) {
    runtime.toastTimer = 2.6;
    if (typeof document !== "undefined") {
      const el = document.getElementById("toast-banner");
      if (el) {
        el.textContent = msg;
        el.classList.add("show");
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pooled 3D Wide Crate Stacking (Backpacks, Pallets, 3x3 Gem Skyscraper)
  // ---------------------------------------------------------------------------
  function syncCrateStackVisuals(anchor, itemList, poolList, opts = {}) {
    if (!anchor || !window.Entities) return;
    const cols = opts.cols || 1;
    const xStep = opts.xStep || 1.02;
    const zStep = opts.zStep || 0.72;
    const yStep = opts.yStep || 0.21;
    const maxDraw = opts.maxDraw || 40;
    const drawCount = Math.min(itemList.length, maxDraw);

    while (poolList.length < drawCount) {
      const idx = poolList.length;
      const type = itemList[idx];
      const mesh = window.Entities.createItemBlock(type);
      anchor.add(mesh);
      poolList.push({ mesh, type });
    }
    while (poolList.length > drawCount) {
      const popped = poolList.pop();
      anchor.remove(popped.mesh);
    }

    for (let i = 0; i < drawCount; i++) {
      const entry = poolList[i];
      const desiredType = itemList[i];
      if (entry.type !== desiredType) {
        anchor.remove(entry.mesh);
        entry.mesh = window.Entities.createItemBlock(desiredType);
        entry.type = desiredType;
        anchor.add(entry.mesh);
      }
      if (cols <= 1) {
        // Neat Hero Backpack Column (stacks up cleanly, 2nd column after 18)
        const col = Math.floor(i / 18);
        const layer = i % 18;
        entry.mesh.position.set(col * 0.98, layer * yStep, 0);
      } else {
        const slot = i % (cols * (opts.rows || 2));
        const layer = Math.floor(i / (cols * (opts.rows || 2)));
        const cx = slot % cols;
        const cz = Math.floor(slot / cols);
        entry.mesh.position.set(
          (cx - (cols - 1) * 0.5) * xStep,
          layer * yStep,
          (cz - ((opts.rows || 2) - 1) * 0.5) * zStep
        );
      }
    }
  }

  function syncGemPedestalVisuals() {
    const anchor = sceneObjs.gemPedestal && sceneObjs.gemPedestal.stackAnchor;
    if (!anchor || !window.Entities) return;
    const total = Math.min(runtime.pedestalGems.length, 108);
    const pool = runtime.pedestalVisuals;

    while (pool.length < total) {
      const m = window.Entities.createItemBlock("mana_gem");
      anchor.add(m);
      pool.push(m);
    }
    while (pool.length > total) {
      const m = pool.pop();
      anchor.remove(m);
    }

    // Strict 3x3 Skyscraper grid
    for (let i = 0; i < total; i++) {
      const slot = i % 9;
      const layer = Math.floor(i / 9);
      const col = slot % 3;
      const row = Math.floor(slot / 3);
      pool[i].position.set(
        (col - 1) * 0.54,
        layer * 0.135,
        (row - 1) * 0.44
      );
    }
  }

  // ---------------------------------------------------------------------------
  // VFX: Particles & Curved Magnet Arcs
  // ---------------------------------------------------------------------------
  function spawnBurstVfx(x, y, z, color = 0x5effb8, count = 8) {
    const Engine = window.Engine;
    if (!Engine || !Engine.vfxGroup) return;
    const geo = new THREE.SphereGeometry(0.11, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      Engine.vfxGroup.add(m);
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 2.0 + Math.random() * 2.5;
      runtime.particles.push({
        mesh: m,
        vx: Math.cos(ang) * spd,
        vy: 2.6 + Math.random() * 2.2,
        vz: Math.sin(ang) * spd,
        life: 0,
        maxLife: 0.42 + Math.random() * 0.16,
      });
    }
  }

  function spawnFlyingItem(itemType, fromX, fromY, fromZ, toX, toY, toZ, onArrive) {
    const Engine = window.Engine;
    if (!Engine || !Engine.vfxGroup || !window.Entities) {
      if (onArrive) onArrive();
      return;
    }
    const mesh = window.Entities.createItemBlock(itemType);
    mesh.position.set(fromX, fromY, fromZ);
    mesh.scale.set(0.85, 0.85, 0.85);
    Engine.vfxGroup.add(mesh);
    runtime.flyingBricks.push({
      mesh,
      sx: fromX,
      sy: fromY,
      sz: fromZ,
      tx: toX,
      ty: toY,
      tz: toZ,
      t: 0,
      dur: 0.24,
      onArrive,
    });
  }

  function updateVFX(dt) {
    const Engine = window.Engine;
    for (let i = runtime.particles.length - 1; i >= 0; i--) {
      const p = runtime.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        if (Engine && Engine.vfxGroup) Engine.vfxGroup.remove(p.mesh);
        runtime.particles.splice(i, 1);
        continue;
      }
      p.vy -= 9.5 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const s = 1 - p.life / p.maxLife;
      p.mesh.scale.set(s, s, s);
    }

    for (let i = runtime.flyingBricks.length - 1; i >= 0; i--) {
      const f = runtime.flyingBricks[i];
      f.t += dt / f.dur;
      if (f.t >= 1) {
        if (Engine && Engine.vfxGroup) Engine.vfxGroup.remove(f.mesh);
        const cb = f.onArrive;
        runtime.flyingBricks.splice(i, 1);
        if (cb) cb();
        continue;
      }
      const p = f.t;
      const arc = Math.sin(p * Math.PI) * 1.45;
      // Track player dynamically if target is gem vacuum
      const tx = f.trackPlayer ? player.x : f.tx;
      const ty = f.trackPlayer ? 1.15 : f.ty;
      const tz = f.trackPlayer ? player.z : f.tz;
      f.mesh.position.set(
        f.sx + (tx - f.sx) * p,
        f.sy + (ty - f.sy) * p + arc,
        f.sz + (tz - f.sz) * p
      );
      f.mesh.rotation.y += dt * 9;
    }
  }

  // ---------------------------------------------------------------------------
  // World Population: 84 Dense Farm Nodes, 3 North Machines, Market & Pads
  // ---------------------------------------------------------------------------
  function buildDenseFarmNodes() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    const specs = [];
    // Zone 1: East Gate Dense Farm (6 x 6 = 36 nodes, 2.0m spacing, unlocked)
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({
          zone: 1,
          kind: (r + c) % 2 === 0 ? "crystal" : "berry",
          x: 23.0 + c * 2.0,
          z: -5.0 + r * 2.0,
        });
      }
    }
    // Zone 2: North-East Dense Farm (6 x 4 = 24 nodes, 2.0m spacing)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({
          zone: 2,
          kind: (r + c) % 2 === 0 ? "crystal" : "berry",
          x: 5.0 + c * 2.0,
          z: -27.5 + r * 2.0,
        });
      }
    }
    // Zone 3: North-West Dense Farm (6 x 4 = 24 nodes, 2.0m spacing)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({
          zone: 3,
          kind: (r + c) % 2 === 0 ? "berry" : "crystal",
          x: -15.0 + c * 2.0,
          z: -27.5 + r * 2.0,
        });
      }
    }

    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const entity = Entities.createResourceNode(s.kind, s.x, s.z);
      Engine.nodeGroup.add(entity.root);
      runtime.farmNodes.push({
        id: `node_${i}`,
        zone: s.zone,
        kind: s.kind,
        itemType: s.kind === "crystal" ? "starlight_crystal" : "rainbow_berry",
        x: s.x,
        z: s.z,
        hp: 2,
        maxHp: 2,
        respawnTimer: 0,
        hitAnim: 0,
        entity,
      });
    }
    refreshFarmZoneVisibility();
  }

  function isZoneUnlocked(zone) {
    if (zone === 1) return true;
    if (zone === 2) return !!state.farm2Unlocked;
    if (zone === 3) return !!state.farm3Unlocked;
    return false;
  }

  function refreshFarmZoneVisibility() {
    for (const node of runtime.farmNodes) {
      const active = isZoneUnlocked(node.zone) && node.respawnTimer <= 0;
      if (node.entity && node.entity.root) {
        node.entity.root.visible = isZoneUnlocked(node.zone);
        if (!active && node.entity.visualRoot) {
          node.entity.visualRoot.scale.set(0.01, 0.01, 0.01);
        } else if (active && node.entity.visualRoot) {
          node.entity.visualRoot.scale.set(1, 1, 1);
        }
      }
    }
  }

  function buildProductionMachines() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    for (const cfg of MACHINE_CONFIGS) {
      const ent = Entities.createProductionMachine(cfg.kind);
      ent.root.position.set(cfg.x, 0, cfg.z);
      Engine.stationGroup.add(ent.root);

      const inPallet = Entities.createWoodenPalletZone({
        x: cfg.inPos.x,
        z: cfg.inPos.z,
        w: 2.35,
        d: 1.95,
        accentColor: "#5ef0ff",
        badgeText: "IN",
      });
      Engine.stationGroup.add(inPallet.root);

      const outPallet = Entities.createWoodenPalletZone({
        x: cfg.outPos.x,
        z: cfg.outPos.z,
        w: 2.35,
        d: 1.95,
        accentColor: "#ffd85e",
        badgeText: "OUT",
      });
      Engine.stationGroup.add(outPallet.root);

      runtime.machines.push({
        cfg,
        lv: getUpgradeLevel(cfg.id),
        entity: ent,
        inPallet,
        outPallet,
        inQueue: [],
        inVisuals: [],
        outQueue: [],
        outVisuals: [],
        craftProgress: 0,
      });
    }
  }

  function buildMarketAndQueue() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    sceneObjs.stall = Entities.createSalesStall(STALL_POS.x, STALL_POS.z);
    Engine.stationGroup.add(sceneObjs.stall.root);

    sceneObjs.sellPallet = Entities.createWoodenPalletZone({
      x: SELL_PALLET_POS.x,
      z: SELL_PALLET_POS.z,
      w: 2.75,
      d: 2.25,
      accentColor: "#58ff9c",
      badgeText: "SELL",
    });
    Engine.stationGroup.add(sceneObjs.sellPallet.root);

    sceneObjs.gemPedestal = Entities.createGemPedestal(GEM_PEDESTAL_POS.x, GEM_PEDESTAL_POS.z);
    Engine.stationGroup.add(sceneObjs.gemPedestal.root);

    // 5 cute Animal-Hood Villager Customers lined up at West Market Plaza
    for (let i = 0; i < 5; i++) {
      const custEnt = Entities.createCustomer(i);
      const slotZ = 5.0 + i * 1.9;
      custEnt.root.position.set(STALL_POS.x + 0.4, 0, slotZ);
      custEnt.root.rotation.y = Math.PI;
      Engine.unitGroup.add(custEnt.root);
      runtime.customers.push({
        slot: i,
        x: STALL_POS.x + 0.4,
        z: slotZ,
        targetX: STALL_POS.x + 0.4,
        targetZ: slotZ,
        leaving: false,
        entity: custEnt,
      });
    }
  }

  function buildStepPads() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    const padCoords = [
      { id: "tool", x: -3.8, z: 7.5 },
      { id: "bag", x: 0.2, z: 7.5 },
      { id: "speed", x: 4.2, z: 7.5 },
      { id: "fairy", x: -3.8, z: 12.2 },
      { id: "truck", x: 0.2, z: 12.2 },
      { id: "m1", x: MACHINE_CONFIGS[0].padPos.x, z: MACHINE_CONFIGS[0].padPos.z },
      { id: "m2", x: MACHINE_CONFIGS[1].padPos.x, z: MACHINE_CONFIGS[1].padPos.z },
      { id: "m3", x: MACHINE_CONFIGS[2].padPos.x, z: MACHINE_CONFIGS[2].padPos.z },
      { id: "farm2", x: 8.0, z: -14.2 },
      { id: "farm3", x: -8.0, z: -14.2 },
    ];

    for (const p of padCoords) {
      const def = UPGRADE_DEFS[p.id];
      const pad = Entities.createStepPad({
        id: p.id,
        x: p.x,
        z: p.z,
        w: 3.3,
        d: 2.55,
        icon: def.icon,
        title: def.title,
        price: `💎 ${getUpgradeCost(p.id)}`,
        levelText: `Lv.${getUpgradeLevel(p.id)}`,
        accentHex: def.accent,
        paidRatio: 0,
      });
      Engine.stationGroup.add(pad.root);
      runtime.stepPads.push({
        id: p.id,
        x: p.x,
        z: p.z,
        w: 3.3,
        d: 2.55,
        pad,
      });
    }
  }

  function syncFairiesCount() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    const desired = Math.min(15, state.fairyCount);
    while (runtime.fairies.length < desired) {
      const idx = runtime.fairies.length;
      const ent = Entities.createFairyWorker(idx);
      const sx = -2.0 + (idx % 5) * 1.1;
      const sz = 4.2 + Math.floor(idx / 5) * 1.1;
      ent.root.position.set(sx, 0, sz);
      Engine.unitGroup.add(ent.root);
      runtime.fairies.push({
        idx,
        x: sx,
        z: sz,
        bag: [],
        bagVisuals: [],
        state: "seek_node",
        targetNode: null,
        targetMachineIdx: -1,
        workTimer: 0,
        entity: ent,
      });
    }
    while (runtime.fairies.length > desired) {
      const removed = runtime.fairies.pop();
      Engine.unitGroup.remove(removed.entity.root);
    }
  }

  function ensureTruckSpawned() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    if (state.truckLv <= 0) {
      if (runtime.truck) {
        Engine.unitGroup.remove(runtime.truck.entity.root);
        runtime.truck = null;
      }
      return;
    }
    if (!runtime.truck) {
      const ent = Entities.createHarvesterCart();
      ent.root.position.set(16.0, 0, 0);
      Engine.unitGroup.add(ent.root);
      runtime.truck = {
        x: 16.0,
        z: 0,
        rotY: Math.PI * 0.5,
        state: "harvest",
        waypointIdx: 0,
        bag: [],
        bagVisuals: [],
        entity: ent,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Simulation Steps
  // ---------------------------------------------------------------------------
  function resolveWorldBoundsAndCollisions(obj, radius = 0.65) {
    const inEastGate = obj.x > 17.5 && Math.abs(obj.z) < 4.0;
    const inEastFarm = obj.x >= 18.6;
    const inNeGate = state.farm2Unlocked && obj.z < -15.5 && obj.x >= 5.2 && obj.x <= 10.8;
    const inNeFarm = state.farm2Unlocked && obj.z <= -17.0 && obj.x >= 2.2 && obj.x <= 18.2;
    const inNwGate = state.farm3Unlocked && obj.z < -15.5 && obj.x >= -10.8 && obj.x <= -5.2;
    const inNwFarm = state.farm3Unlocked && obj.z <= -17.0 && obj.x >= -18.2 && obj.x <= -2.2;

    if (!inEastFarm && !inNeFarm && !inNwFarm) {
      obj.x = Math.max(-18.2, Math.min(inEastGate ? 35.2 : 18.2, obj.x));
      obj.z = Math.max(inNeGate || inNwGate ? -29.8 : -16.2, Math.min(16.2, obj.z));
    } else if (inEastFarm) {
      obj.x = Math.max(18.0, Math.min(35.2, obj.x));
      if (obj.x < 19.6) {
        obj.z = Math.max(-3.8, Math.min(3.8, obj.z));
      } else {
        obj.z = Math.max(-13.0, Math.min(13.0, obj.z));
      }
    } else if (inNeFarm) {
      obj.z = Math.max(-29.8, Math.min(-16.0, obj.z));
      if (obj.z > -18.0) {
        obj.x = Math.max(5.5, Math.min(10.5, obj.x));
      } else {
        obj.x = Math.max(2.6, Math.min(17.8, obj.x));
      }
    } else if (inNwFarm) {
      obj.z = Math.max(-29.8, Math.min(-16.0, obj.z));
      if (obj.z > -18.0) {
        obj.x = Math.max(-10.5, Math.min(-5.5, obj.x));
      } else {
        obj.x = Math.max(-17.8, Math.min(-2.6, obj.x));
      }
    }

    // Solid obstacle pushouts (Sales Stall & 3 North Machine Cores)
    const boxes = [
      { cx: STALL_POS.x, cz: STALL_POS.z, hw: 1.75 + radius, hd: 1.05 + radius },
    ];
    for (const cfg of MACHINE_CONFIGS) {
      boxes.push({ cx: cfg.x, cz: cfg.z, hw: 1.35 + radius, hd: 1.15 + radius });
    }
    for (const b of boxes) {
      const dx = obj.x - b.cx;
      const dz = obj.z - b.cz;
      if (Math.abs(dx) < b.hw && Math.abs(dz) < b.hd) {
        const ox = b.hw - Math.abs(dx);
        const oz = b.hd - Math.abs(dz);
        if (ox < oz) {
          obj.x += dx >= 0 ? ox : -ox;
        } else {
          obj.z += dz >= 0 ? oz : -oz;
        }
      }
    }
  }

  function updatePlayerMovement(dt) {
    let moveX = 0;
    let moveZ = 0;
    if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) moveZ -= 1;
    if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) moveZ += 1;
    if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) moveX -= 1;
    if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) moveX += 1;

    if (input.joyActive) {
      moveX += input.joyX;
      moveZ += input.joyY;
    }

    const len = Math.hypot(moveX, moveZ);
    const maxSpd = getHeroMoveSpeed();
    if (len > 0.08) {
      const nx = moveX / Math.max(1, len);
      const nz = moveZ / Math.max(1, len);
      player.vx = nx * maxSpd;
      player.vz = nz * maxSpd;
    } else {
      const damp = Math.exp(-14 * dt);
      player.vx *= damp;
      player.vz *= damp;
      if (Math.hypot(player.vx, player.vz) < 0.05) {
        player.vx = 0;
        player.vz = 0;
      }
    }

    player.x += player.vx * dt;
    player.z += player.vz * dt;
    resolveWorldBoundsAndCollisions(player, 0.58);

    const speed = Math.hypot(player.vx, player.vz);
    if (speed > 0.35) {
      player.walkPhase += dt * (4.8 + speed * 0.85);
      const desiredRot = Math.atan2(player.vx, player.vz);
      let diff = desiredRot - player.rotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.rotY += diff * Math.min(1, dt * 14);
    }

    if (player.swingTimer > 0) player.swingTimer = Math.max(0, player.swingTimer - dt);

    const hero = sceneObjs.hero;
    if (hero && hero.root) {
      hero.root.position.set(player.x, 0, player.z);
      hero.root.rotation.y = player.rotY;
      window.Entities.animatePlayerHero(hero, {
        speed,
        walkPhase: player.walkPhase,
        swingTimer: player.swingTimer,
        swingDuration: player.swingDuration,
        time: runtime.time,
      }, dt);

      // Gentle stack sway on hero backpack crates
      if (hero.backStackAnchor) {
        hero.backStackAnchor.rotation.z = Math.sin(player.walkPhase) * 0.035 * Math.min(1, speed / 7);
        hero.backStackAnchor.rotation.x = -0.05 * Math.min(1, speed / 7);
      }
    }
  }

  function harvestNode(node, amount, toBag, xOrig, zOrig) {
    node.hp -= 1;
    node.hitAnim = 0.22;
    spawnBurstVfx(node.x, 0.8, node.z, node.kind === "crystal" ? 0x52efff : 0xff709e, 5);
    if (node.hp <= 0) {
      node.respawnTimer = 4.2;
      if (node.entity && node.entity.visualRoot) {
        node.entity.visualRoot.scale.set(0.01, 0.01, 0.01);
      }
    }
    for (let i = 0; i < amount; i++) {
      spawnFlyingItem(node.itemType, node.x, 0.85, node.z, xOrig, 1.3, zOrig, () => {
        toBag.push(node.itemType);
      });
    }
  }

  function updateNodesAndHeroHarvest(dt) {
    // Respawn & hit wobble animation across all 84 nodes
    for (const node of runtime.farmNodes) {
      if (!isZoneUnlocked(node.zone)) continue;
      if (node.respawnTimer > 0) {
        node.respawnTimer -= dt;
        if (node.respawnTimer <= 0) {
          node.respawnTimer = 0;
          node.hp = node.maxHp;
          if (node.entity && node.entity.visualRoot) {
            node.entity.visualRoot.scale.set(1, 1, 1);
          }
        }
      } else if (node.hitAnim > 0) {
        node.hitAnim = Math.max(0, node.hitAnim - dt);
        if (node.entity && node.entity.visualRoot) {
          const wob = 1 + Math.sin(node.hitAnim * 34) * 0.14;
          node.entity.visualRoot.scale.set(wob, 2 - wob, wob);
        }
      }
    }

    // Player auto-swing harvest
    if (player.harvestCooldown > 0) player.harvestCooldown -= dt;
    const bagCap = getHeroBagCap();
    if (player.harvestCooldown <= 0 && player.bagItems.length < bagCap) {
      let best = null;
      let bestDist = 2.65;
      for (const node of runtime.farmNodes) {
        if (!isZoneUnlocked(node.zone) || node.respawnTimer > 0) continue;
        const d = Math.hypot(node.x - player.x, node.z - player.z);
        if (d < bestDist) {
          bestDist = d;
          best = node;
        }
      }
      if (best) {
        player.swingTimer = player.swingDuration;
        player.harvestCooldown = getHeroHarvestInterval();
        const space = bagCap - player.bagItems.length;
        const yieldCount = Math.min(space, getHeroHarvestYield());
        harvestNode(best, yieldCount, player.bagItems, player.x, player.z);
        playHarvestChime(player.bagItems.length);
        addXp(3);
      }
    }
  }

  function updatePalletsAndHeroTransfers(dt) {
    if (player.transferCooldown > 0) player.transferCooldown -= dt;

    // 1. Machine Input & Output Wooden Pallet Transfers
    for (const m of runtime.machines) {
      let inPulse = 0;
      let outPulse = 0;

      // Drop raw crates from Hero back -> Unlocked Machine IN pallet
      if (m.lv > 0 && Math.hypot(player.x - m.cfg.inPos.x, player.z - m.cfg.inPos.z) < 2.25) {
        inPulse = 1;
        if (player.transferCooldown <= 0 && m.inQueue.length < 24) {
          const rawIdx = player.bagItems.findIndex(
            (t) => t === "starlight_crystal" || t === "rainbow_berry"
          );
          if (rawIdx !== -1) {
            const item = player.bagItems.splice(rawIdx, 1)[0];
            player.transferCooldown = 0.055;
            spawnFlyingItem(item, player.x, 1.3, player.z, m.cfg.inPos.x, 0.35, m.cfg.inPos.z, () => {
              m.inQueue.push(item);
            });
            playTone(440, 0.05, "sine", 0.04);
          }
        }
      }

      // Pick up crafted crates from Machine OUT pallet -> Hero back
      const bagCap = getHeroBagCap();
      if (Math.hypot(player.x - m.cfg.outPos.x, player.z - m.cfg.outPos.z) < 2.25) {
        outPulse = 1;
        if (player.transferCooldown <= 0 && m.outQueue.length > 0 && player.bagItems.length < bagCap) {
          const crafted = m.outQueue.pop();
          player.transferCooldown = 0.045;
          spawnFlyingItem(crafted, m.cfg.outPos.x, 0.45, m.cfg.outPos.z, player.x, 1.35, player.z, () => {
            player.bagItems.push(crafted);
          });
          playTone(660, 0.06, "triangle", 0.045);
        }
      }

      window.Entities.updateWoodenPalletZone(m.inPallet, inPulse, runtime.time);
      window.Entities.updateWoodenPalletZone(m.outPallet, outPulse, runtime.time);

      // Process conveyor & production
      const isProcessing = m.lv > 0 && m.inQueue.length > 0 && m.outQueue.length < 28;
      if (isProcessing) {
        const speedMult = 1 + (m.lv - 1) * 0.28;
        m.craftProgress += (dt * speedMult) / m.cfg.baseCraftTime;
        if (m.craftProgress >= 1) {
          m.craftProgress -= 1;
          m.inQueue.shift();
          m.outQueue.push(m.cfg.outputType);
          spawnBurstVfx(m.cfg.outPos.x, 0.55, m.cfg.outPos.z, 0xffe066, 4);
        }
      } else if (m.inQueue.length === 0) {
        m.craftProgress = 0;
      }

      window.Entities.animateProductionMachine(m.entity, isProcessing, dt);
      syncCrateStackVisuals(m.inPallet.stackAnchor, m.inQueue, m.inVisuals, {
        cols: 2,
        rows: 2,
        xStep: 1.02,
        zStep: 0.72,
        maxDraw: 24,
      });
      syncCrateStackVisuals(m.outPallet.stackAnchor, m.outQueue, m.outVisuals, {
        cols: 2,
        rows: 2,
        xStep: 1.02,
        zStep: 0.72,
        maxDraw: 28,
      });
    }

    // 2. Sales Stall SELL Wooden Pallet Drop-Off
    let sellPulse = 0;
    if (Math.hypot(player.x - SELL_PALLET_POS.x, player.z - SELL_PALLET_POS.z) < 2.45) {
      sellPulse = 1;
      if (player.transferCooldown <= 0 && player.bagItems.length > 0 && runtime.sellPalletQueue.length < 36) {
        // Prefer selling crafted crates first, otherwise raw harvested crates
        let idx = player.bagItems.findIndex(
          (t) => t === "elixir_5x" || t === "cut_gem_3x" || t === "potion_2x"
        );
        if (idx === -1) idx = player.bagItems.length - 1;
        const item = player.bagItems.splice(idx, 1)[0];
        player.transferCooldown = 0.045;
        spawnFlyingItem(item, player.x, 1.3, player.z, SELL_PALLET_POS.x, 0.35, SELL_PALLET_POS.z, () => {
          runtime.sellPalletQueue.push(item);
        });
        playTone(540, 0.05, "triangle", 0.04);
      }
    }
    window.Entities.updateWoodenPalletZone(sceneObjs.sellPallet, sellPulse, runtime.time);
    syncCrateStackVisuals(sceneObjs.sellPallet.stackAnchor, runtime.sellPalletQueue, runtime.sellPalletVisuals, {
      cols: 2,
      rows: 2,
      xStep: 1.04,
      zStep: 0.74,
      maxDraw: 36,
    });
  }

  function updateCustomersAndGemTower(dt) {
    if (runtime.sellCooldown > 0) runtime.sellCooldown -= dt;

    if (runtime.sellCooldown <= 0 && runtime.sellPalletQueue.length > 0) {
      runtime.sellCooldown = 0.55;
      const item = runtime.sellPalletQueue.pop();
      const meta = ITEM_META[item] || { val: 10 };
      const bricksToSpawn = Math.max(1, Math.round(meta.val / 10));
      for (let i = 0; i < bricksToSpawn; i++) {
        runtime.pedestalGems.push(10);
      }
      syncGemPedestalVisuals();
      spawnBurstVfx(STALL_POS.x + 0.5, 1.4, STALL_POS.z + 1.5, 0x52efff, 4);

      // Lead customer walks a cheerful cycle & rotates queue
      const lead = runtime.customers.find((c) => c.slot === 0 && !c.leaving);
      if (lead) {
        lead.leaving = true;
        lead.targetX = STALL_POS.x - 2.6;
        lead.targetZ = STALL_POS.z + 12.5;
      }
    }

    for (const c of runtime.customers) {
      const dx = c.targetX - c.x;
      const dz = c.targetZ - c.z;
      const dist = Math.hypot(dx, dz);
      const walking = dist > 0.12;
      if (walking) {
        const spd = 3.2;
        c.x += (dx / dist) * Math.min(dist, spd * dt);
        c.z += (dz / dist) * Math.min(dist, spd * dt);
        c.entity.root.rotation.y = Math.atan2(dx, dz);
      } else {
        c.entity.root.rotation.y = Math.PI;
        if (c.leaving) {
          c.leaving = false;
          c.x = STALL_POS.x + 0.4;
          c.z = STALL_POS.z + 13.5;
          // Push to back of queue and advance everyone
          for (const o of runtime.customers) {
            if (o !== c && !o.leaving) {
              o.slot = Math.max(0, o.slot - 1);
              o.targetX = STALL_POS.x + 0.4;
              o.targetZ = 5.0 + o.slot * 1.9;
            }
          }
          c.slot = runtime.customers.length - 1;
          c.targetX = STALL_POS.x + 0.4;
          c.targetZ = 5.0 + c.slot * 1.9;
        }
      }
      c.entity.root.position.set(c.x, 0, c.z);
      window.Entities.animateCustomer(c.entity, walking, dt);
    }

    // 3x3 Tall Mana Gem Skyscraper Rapid Magnet Vacuum (0.025s interval)
    if (runtime.gemVacuumCooldown > 0) runtime.gemVacuumCooldown -= dt;
    if (Math.hypot(player.x - GEM_PEDESTAL_POS.x, player.z - GEM_PEDESTAL_POS.z) < 2.8) {
      if (runtime.gemVacuumCooldown <= 0 && runtime.pedestalGems.length > 0) {
        runtime.gemVacuumCooldown = 0.025;
        const val = runtime.pedestalGems.pop();
        syncGemPedestalVisuals();
        runtime.gemCombo = Math.min(20, runtime.gemCombo + 1);
        playGemChime(runtime.gemCombo);

        const Engine = window.Engine;
        if (Engine && Engine.vfxGroup && window.Entities) {
          const mesh = window.Entities.createItemBlock("mana_gem");
          mesh.position.set(GEM_PEDESTAL_POS.x, 1.0, GEM_PEDESTAL_POS.z);
          Engine.vfxGroup.add(mesh);
          runtime.flyingBricks.push({
            mesh,
            sx: GEM_PEDESTAL_POS.x,
            sy: 1.0,
            sz: GEM_PEDESTAL_POS.z,
            tx: player.x,
            ty: 1.1,
            tz: player.z,
            trackPlayer: true,
            t: 0,
            dur: 0.18,
            onArrive: () => {
              state.gems += val;
              state.totalEarnedGems += val;
              addXp(2);
            },
          });
        } else {
          state.gems += val;
          state.totalEarnedGems += val;
          addXp(2);
        }
      }
    } else {
      runtime.gemCombo = 0;
    }
  }

  function updateFairies(dt) {
    const cap = 4 + Math.floor(state.toolLv / 2);
    for (const f of runtime.fairies) {
      if (f.workTimer > 0) f.workTimer -= dt;

      let tx = f.x;
      let tz = f.z;
      if (f.state === "seek_node") {
        if (!f.targetNode || f.targetNode.respawnTimer > 0 || !isZoneUnlocked(f.targetNode.zone)) {
          const candidates = runtime.farmNodes.filter((n) => isZoneUnlocked(n.zone) && n.respawnTimer <= 0);
          if (candidates.length > 0) {
            f.targetNode = candidates[(f.idx * 7 + Math.floor(runtime.time * 3)) % candidates.length];
          }
        }
        if (f.targetNode) {
          tx = f.targetNode.x;
          tz = f.targetNode.z;
          if (Math.hypot(tx - f.x, tz - f.z) < 1.25 && f.workTimer <= 0) {
            f.workTimer = 0.42;
            harvestNode(f.targetNode, 1, f.bag, f.x, f.z);
            if (f.bag.length >= cap) {
              // Pick active machine with lowest queue, or sell pallet
              const openM = runtime.machines.filter((m) => m.lv > 0 && m.inQueue.length < 20);
              if (openM.length > 0) {
                f.targetMachineIdx = runtime.machines.indexOf(openM[f.idx % openM.length]);
                f.state = "deliver_machine";
              } else {
                f.state = "deliver_sell";
              }
            }
          }
        }
      } else if (f.state === "deliver_machine") {
        const m = runtime.machines[f.targetMachineIdx];
        if (!m || m.lv <= 0 || m.inQueue.length >= 24) {
          f.state = "deliver_sell";
        } else {
          tx = m.cfg.inPos.x;
          tz = m.cfg.inPos.z;
          if (Math.hypot(tx - f.x, tz - f.z) < 1.35) {
            while (f.bag.length > 0 && m.inQueue.length < 24) {
              m.inQueue.push(f.bag.pop());
            }
            if (m.outQueue.length > 0 && f.bag.length < cap) {
              while (m.outQueue.length > 0 && f.bag.length < cap) {
                f.bag.push(m.outQueue.pop());
              }
              f.state = "deliver_sell";
            } else {
              f.state = "seek_node";
            }
          }
        }
      } else {
        tx = SELL_PALLET_POS.x;
        tz = SELL_PALLET_POS.z;
        if (Math.hypot(tx - f.x, tz - f.z) < 1.45) {
          while (f.bag.length > 0 && runtime.sellPalletQueue.length < 36) {
            runtime.sellPalletQueue.push(f.bag.pop());
          }
          f.state = "seek_node";
        }
      }

      const dx = tx - f.x;
      const dz = tz - f.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.15) {
        const spd = 6.2 + state.speedLv * 0.4;
        f.x += (dx / dist) * Math.min(dist, spd * dt);
        f.z += (dz / dist) * Math.min(dist, spd * dt);
        f.entity.root.rotation.y = Math.atan2(dx, dz);
      }
      f.entity.root.position.set(f.x, 0, f.z);
      window.Entities.animateFairy(f.entity, dt);
      syncCrateStackVisuals(f.entity.bagAnchor, f.bag, f.bagVisuals, {
        cols: 1,
        yStep: 0.21,
        maxDraw: 10,
      });
    }
  }

  function updateHarvesterTruck(dt) {
    const tr = runtime.truck;
    if (!tr) return;
    const maxCargo = 14 + state.truckLv * 6;
    const speed = 5.4 + state.truckLv * 0.8;

    let tx = 28.0;
    let tz = 0;
    if (tr.state === "harvest") {
      const waypoints = [
        { x: 24.0, z: -4.0 },
        { x: 32.0, z: -4.0 },
        { x: 32.0, z: 4.0 },
        { x: 24.0, z: 4.0 },
      ];
      const wp = waypoints[tr.waypointIdx % waypoints.length];
      tx = wp.x;
      tz = wp.z;
      if (Math.hypot(tx - tr.x, tz - tr.z) < 1.2) {
        tr.waypointIdx = (tr.waypointIdx + 1) % waypoints.length;
      }
      // Sweep nodes within 3.2m
      for (const node of runtime.farmNodes) {
        if (!isZoneUnlocked(node.zone) || node.respawnTimer > 0) continue;
        if (tr.bag.length >= maxCargo) break;
        if (Math.hypot(node.x - tr.x, node.z - tr.z) < 3.1) {
          harvestNode(node, 1, tr.bag, tr.x, tr.z);
        }
      }
      if (tr.bag.length >= maxCargo) tr.state = "return";
    } else if (tr.state === "return") {
      // Drive back through East Gate to Sell Pallet or active machine
      if (tr.x > 16.0) {
        tx = 15.0;
        tz = 0;
      } else {
        tx = SELL_PALLET_POS.x + 2.2;
        tz = SELL_PALLET_POS.z;
        if (Math.hypot(tx - tr.x, tz - tr.z) < 2.2) {
          while (tr.bag.length > 0 && runtime.sellPalletQueue.length < 36) {
            runtime.sellPalletQueue.push(tr.bag.pop());
          }
          tr.bag.length = 0;
          tr.state = "exit";
        }
      }
    } else {
      tx = 20.5;
      tz = 0;
      if (Math.hypot(tx - tr.x, tz - tr.z) < 1.5) tr.state = "harvest";
    }

    const dx = tx - tr.x;
    const dz = tz - tr.z;
    const dist = Math.hypot(dx, dz);
    let actualSpd = 0;
    if (dist > 0.1) {
      actualSpd = speed;
      tr.x += (dx / dist) * Math.min(dist, speed * dt);
      tr.z += (dz / dist) * Math.min(dist, speed * dt);
      tr.rotY = Math.atan2(dx, dz);
    }
    tr.entity.root.position.set(tr.x, 0, tr.z);
    tr.entity.root.rotation.y = tr.rotY;
    window.Entities.animateHarvesterTruck(tr.entity, actualSpd, dt);
    syncCrateStackVisuals(tr.entity.cargoAnchor, tr.bag, tr.bagVisuals, {
      cols: 1,
      yStep: 0.21,
      maxDraw: 14,
    });
  }

  function updateStepPads(dt) {
    for (const sp of runtime.stepPads) {
      const def = UPGRADE_DEFS[sp.id];
      const isMax = isUpgradeMax(sp.id);
      const cost = getUpgradeCost(sp.id);
      const lv = getUpgradeLevel(sp.id);
      const paid = state.padPaid[sp.id] || 0;
      const remaining = Math.max(0, cost - paid);

      const dx = Math.abs(player.x - sp.x);
      const dz = Math.abs(player.z - sp.z);
      const isStepped = dx < sp.w * 0.48 && dz < sp.d * 0.48;

      if (isStepped && !isMax && state.gems > 0 && remaining > 0) {
        const drainRate = Math.max(cost * 1.45, 72);
        const take = Math.min(remaining, state.gems, Math.max(1, Math.ceil(drainRate * dt)));
        if (take > 0) {
          state.gems -= take;
          state.padPaid[sp.id] = paid + take;
          if (Math.floor(runtime.time * 16) !== Math.floor((runtime.time - dt) * 16)) {
            playTone(720, 0.04, "sine", 0.03);
          }
          if (state.padPaid[sp.id] >= cost) {
            applyUpgradeLevel(sp.id);
          }
        }
      }

      const newRemaining = Math.max(0, cost - (state.padPaid[sp.id] || 0));
      const ratio = isMax ? 1 : cost > 0 ? (state.padPaid[sp.id] || 0) / cost : 0;

      window.Entities.updateStepPadTexture(sp.pad, {
        icon: def.icon,
        title: def.title,
        price: isMax ? "MAX" : `💎 ${newRemaining}`,
        levelText: isMax ? "MAX" : `Lv.${lv}`,
        accentHex: def.accent,
        paidRatio: ratio,
        isMax,
        unlocked: true,
        canAfford: !isMax && state.gems >= newRemaining,
        isStepped,
      });
    }
  }

  function updateGuideArrow(dt) {
    const hero = sceneObjs.hero;
    if (!hero || !hero.guideArrowGroup) return;

    let tx = 25.0;
    let tz = 0;
    if (runtime.pedestalGems.length >= 3) {
      tx = GEM_PEDESTAL_POS.x;
      tz = GEM_PEDESTAL_POS.z;
    } else if (player.bagItems.length >= Math.max(6, Math.floor(getHeroBagCap() * 0.55))) {
      const m1 = runtime.machines[0];
      if (m1 && m1.lv > 0 && m1.inQueue.length < 12 && player.bagItems.some((t) => t === "starlight_crystal" || t === "rainbow_berry")) {
        tx = m1.cfg.inPos.x;
        tz = m1.cfg.inPos.z;
      } else {
        tx = SELL_PALLET_POS.x;
        tz = SELL_PALLET_POS.z;
      }
    } else {
      const nearestOut = runtime.machines.find((m) => m.outQueue.length >= 2);
      if (nearestOut && player.bagItems.length < getHeroBagCap()) {
        tx = nearestOut.cfg.outPos.x;
        tz = nearestOut.cfg.outPos.z;
      }
    }

    const ang = Math.atan2(tx - player.x, tz - player.z);
    hero.guideArrowGroup.rotation.y = ang - player.rotY;
    const pulse = 1 + Math.sin(runtime.time * 5.2) * 0.12;
    hero.guideArrowGroup.scale.set(pulse, pulse, pulse);
  }

  // ---------------------------------------------------------------------------
  // HUD & Shop UI Sync
  // ---------------------------------------------------------------------------
  function syncHUD(force = false) {
    if (typeof document === "undefined") return;
    if (!force && runtime.time - runtime.lastHudSync < 0.08) return;
    runtime.lastHudSync = runtime.time;

    const rawCount = player.bagItems.filter(
      (t) => t === "starlight_crystal" || t === "rainbow_berry"
    ).length;
    const craftedCount = player.bagItems.length - rawCount;
    const bagCap = getHeroBagCap();

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el && el.textContent !== String(text)) el.textContent = String(text);
    };
    const setWidth = (id, pct) => {
      const el = document.getElementById(id);
      if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    };

    setText("ui-lv", `Lv.${state.level}`);
    setText("ui-bag", `${player.bagItems.length} / ${bagCap}`);
    setWidth("ui-bag-fill", (player.bagItems.length / bagCap) * 100);
    setWidth("ui-xp-fill", (state.xp / state.xpMax) * 100);
    setText("ui-gems", state.gems.toLocaleString());
    setText("ui-crystals", rawCount);
    setText("ui-potions", craftedCount);

    const statsEl = document.getElementById("ui-shop-stats");
    if (statsEl) {
      const spdPct = Math.round((getHeroMoveSpeed() / 7.6) * 100);
      statsEl.textContent = `이동 ${spdPct}% · 요정 ${state.fairyCount}/15 · ${Math.round(runtime.fpsSmooth)} FPS`;
    }
  }

  function openShop(tab) {
    if (tab) runtime.shopTab = tab;
    runtime.shopOpen = true;
    renderShop();
    if (typeof document !== "undefined") {
      const modal = document.getElementById("shop-modal");
      if (modal) modal.classList.add("open");
    }
  }

  function closeShop() {
    runtime.shopOpen = false;
    if (typeof document !== "undefined") {
      const modal = document.getElementById("shop-modal");
      if (modal) modal.classList.remove("open");
    }
  }

  function renderShop() {
    if (typeof document === "undefined") return;
    const body = document.getElementById("shop-body");
    if (!body) return;

    document.querySelectorAll(".shop-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === runtime.shopTab);
    });

    if (runtime.shopTab === "guide") {
      body.innerHTML = `
        <div class="shop-item">
          <div class="shop-item-info">
            <div class="shop-item-title">🌱 1단계 · 동쪽 숲 농장 채집 & 판매</div>
            <div class="shop-item-desc">동쪽 게이트 농장에서 별빛 수정과 열매를 등 뒤 지게에 묵직하게 쌓고 서쪽 판매대 SELL 팔레트에 납품하세요. 3×3 마나 보석 타워에서 0.025초 고속 흡입으로 수금합니다.</div>
          </div>
        </div>
        <div class="shop-item">
          <div class="shop-item-info">
            <div class="shop-item-title">⚙️ 2단계 · 북쪽 3종 연금술 가공 라인</div>
            <div class="shop-item-desc">1호기 가마솥(2× 포션), 2호기 크리스탈 커팅기(3× 보석), 3호기 무지개 증류기(5× 엘릭서)의 IN 나무 팔레트에 상자를 넣으면 컨베이어를 거쳐 고가치 상자가 생산됩니다!</div>
          </div>
        </div>
        <div class="shop-item">
          <div class="shop-item-info">
            <div class="shop-item-title">🧚 3단계 · 요정 15명 · 수확 트럭 · 북쪽 확장 농장</div>
            <div class="shop-item-desc">요정 일꾼(최대 15명)과 대형 수확 트럭, 북동/북서 48노드 확장 농장을 해금해 연금술 공방 제국을 자동화하세요!</div>
          </div>
        </div>
      `;
      return;
    }

    const items = Object.values(UPGRADE_DEFS).filter((d) => d.tab === runtime.shopTab);
    body.innerHTML = "";
    for (const def of items) {
      const lv = getUpgradeLevel(def.id);
      const isMax = isUpgradeMax(def.id);
      const cost = getUpgradeCost(def.id);
      const afford = !isMax && state.gems >= cost;

      const row = document.createElement("div");
      row.className = "shop-item";
      row.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-title">${def.icon} ${def.title} <span class="lv-badge">${isMax ? "MAX" : `Lv.${lv}/${def.maxLv}`}</span></div>
          <div class="shop-item-desc">${def.desc}</div>
        </div>
        <button class="fairy-btn ${afford ? "shop-btn" : "neutral-btn"}" data-upgrade-id="${def.id}" ${isMax || !afford ? "disabled" : ""}>
          ${isMax ? "MAX" : `💎 ${cost}`}
        </button>
      `;
      const btn = row.querySelector("button");
      if (btn) {
        btn.addEventListener("click", () => {
          purchaseUpgradeDirect(def.id);
          syncHUD(true);
        });
      }
      body.appendChild(row);
    }
  }

  // ---------------------------------------------------------------------------
  // Save / Load / Reset & Input Binding
  // ---------------------------------------------------------------------------
  function saveGame() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore quota error
    }
  }

  function loadGame() {
    if (typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        Object.assign(state, createDefaultState(), parsed);
      }
    } catch (e) {
      // fallback default
    }
  }

  function resetGame() {
    Object.assign(state, createDefaultState());
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (e) {}
    }
    player.x = 0;
    player.z = 2.0;
    player.vx = 0;
    player.vz = 0;
    player.bagItems.length = 0;
    runtime.sellPalletQueue.length = 0;
    runtime.pedestalGems.length = 0;
    for (const f of runtime.flyingBricks) {
      if (window.Engine && window.Engine.vfxGroup && f.mesh) window.Engine.vfxGroup.remove(f.mesh);
    }
    runtime.flyingBricks.length = 0;
    for (const p of runtime.particles) {
      if (window.Engine && window.Engine.vfxGroup && p.mesh) window.Engine.vfxGroup.remove(p.mesh);
    }
    runtime.particles.length = 0;
    for (const m of runtime.machines) {
      m.lv = 0;
      m.inQueue.length = 0;
      m.outQueue.length = 0;
      m.craftProgress = 0;
    }
    for (const node of runtime.farmNodes) {
      node.respawnTimer = 0;
      node.hp = node.maxHp;
    }
    refreshFarmZoneVisibility();
    syncFairiesCount();
    ensureTruckSpawned();
    if (sceneObjs.hero) {
      window.Entities.updateHeroTier(sceneObjs.hero, 0);
      syncCrateStackVisuals(sceneObjs.hero.backStackAnchor, player.bagItems, runtime.heroBackVisuals);
    }
    syncGemPedestalVisuals();
    updateStepPads(0.016);
    syncHUD(true);
    showToast("🌱 새로운 연금술 공방이 시작되었습니다!");
  }

  function setInput(dx, dz) {
    input.joyActive = Math.hypot(dx, dz) > 0.01;
    input.joyX = dx;
    input.joyY = dz;
  }

  function bindDOMandInputs() {
    if (_domBound || typeof document === "undefined") return;
    _domBound = true;

    window.addEventListener("keydown", (e) => {
      input.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => {
      input.keys.delete(e.code);
    });
    window.addEventListener("resize", () => {
      if (window.Engine) window.Engine.resize();
    });

    const joyZone = document.getElementById("joystick-zone");
    const joyBase = document.getElementById("joystick-base");
    const joyStick = document.getElementById("joystick-stick");
    if (joyZone) {
      const endJoy = () => {
        input.joyActive = false;
        input.joyX = 0;
        input.joyY = 0;
        input.joyId = null;
        if (joyBase) joyBase.classList.remove("active");
        if (joyStick) joyStick.style.transform = "translate(0px, 0px)";
      };
      joyZone.addEventListener("pointerdown", (e) => {
        input.joyActive = true;
        input.joyId = e.pointerId;
        input.originX = e.clientX;
        input.originY = e.clientY;
        if (joyBase) {
          joyBase.style.left = `${e.clientX}px`;
          joyBase.style.top = `${e.clientY}px`;
          joyBase.classList.add("active");
        }
      });
      window.addEventListener("pointermove", (e) => {
        if (!input.joyActive || e.pointerId !== input.joyId) return;
        const maxR = 46;
        let dx = e.clientX - input.originX;
        let dy = e.clientY - input.originY;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        input.joyX = dx / maxR;
        input.joyY = dy / maxR;
        if (joyStick) joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      window.addEventListener("pointerup", endJoy);
      window.addEventListener("pointercancel", endJoy);
    }

    const clickBind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    };
    clickBind("btn-open-shop", () => openShop());
    clickBind("btn-close-shop", () => closeShop());
    clickBind("btn-home", () => {
      player.x = 0;
      player.z = 2.0;
      player.vx = 0;
      player.vz = 0;
      showToast("🏡 중앙 광장으로 귀환했습니다!");
    });
    clickBind("btn-mute", () => {
      state.muted = !state.muted;
      const el = document.getElementById("btn-mute");
      if (el) el.textContent = state.muted ? "🔇" : "🔊";
    });
    clickBind("btn-save", () => {
      saveGame();
      showToast("💾 공방 진행 상황이 저장되었습니다!");
    });
    clickBind("btn-reset", () => {
      const m = document.getElementById("reset-modal");
      if (m) m.classList.add("open");
    });
    clickBind("btn-cancel-reset", () => {
      const m = document.getElementById("reset-modal");
      if (m) m.classList.remove("open");
    });
    clickBind("btn-confirm-reset", () => {
      const m = document.getElementById("reset-modal");
      if (m) m.classList.remove("open");
      resetGame();
    });
    document.querySelectorAll(".shop-tab").forEach((btn) => {
      btn.addEventListener("click", () => openShop(btn.dataset.tab));
    });
  }

  // ---------------------------------------------------------------------------
  // Main Simulation Step & Initialization
  // ---------------------------------------------------------------------------
  function step(dt) {
    if (!_initialized) return;
    const stepDt = Math.min(0.05, Math.max(0.001, dt || 0.016));
    runtime.time += stepDt;
    if (stepDt > 0.001) {
      runtime.fpsSmooth = runtime.fpsSmooth * 0.92 + (1 / stepDt) * 0.08;
    }

    updatePlayerMovement(stepDt);
    updateNodesAndHeroHarvest(stepDt);
    updatePalletsAndHeroTransfers(stepDt);
    updateCustomersAndGemTower(stepDt);
    updateFairies(stepDt);
    updateHarvesterTruck(stepDt);
    updateStepPads(stepDt);
    updateVFX(stepDt);
    updateGuideArrow(stepDt);

    if (sceneObjs.hero && sceneObjs.hero.backStackAnchor) {
      syncCrateStackVisuals(sceneObjs.hero.backStackAnchor, player.bagItems, runtime.heroBackVisuals);
    }

    if (runtime.toastTimer > 0) {
      runtime.toastTimer -= stepDt;
      if (runtime.toastTimer <= 0 && typeof document !== "undefined") {
        const el = document.getElementById("toast-banner");
        if (el) el.classList.remove("show");
      }
    }

    if (window.Engine) {
      window.Engine.update({ x: player.x, z: player.z }, { x: player.vx, z: player.vz }, stepDt);
      window.Engine.render();
    }
    syncHUD(false);
  }

  function rafLoop(ts) {
    if (!_lastRafTs) _lastRafTs = ts;
    const dt = (ts - _lastRafTs) / 1000;
    _lastRafTs = ts;
    step(dt);
    _rafId = window.requestAnimationFrame(rafLoop);
  }

  async function init() {
    if (_initialized) return;
    _initialized = true;

    loadGame();
    bindDOMandInputs();

    const container = typeof document !== "undefined" ? document.getElementById("webgl-container") : null;
    if (window.AssetLoader && typeof window.AssetLoader.loadAll === "function") {
      try {
        await window.AssetLoader.loadAll();
      } catch (e) {
        // Proceed cleanly with procedural toon fallbacks if GLB load errors
      }
    }

    if (window.Engine) {
      window.Engine.init(container);
      window.Engine.populateGlbScenery();
    }

    sceneObjs.hero = window.Entities.createPlayerHero();
    sceneObjs.hero.root.position.set(player.x, 0, player.z);
    window.Entities.updateHeroTier(sceneObjs.hero, Math.min(4, Math.floor(state.toolLv / 2)));
    if (window.Engine) window.Engine.unitGroup.add(sceneObjs.hero.root);

    buildDenseFarmNodes();
    buildProductionMachines();
    buildMarketAndQueue();
    buildStepPads();
    syncFairiesCount();
    ensureTruckSpawned();
    updateStepPads(0.016);
    syncHUD(true);

    if (typeof window !== "undefined" && !window.__NO_AUTO_RAF__ && typeof window.requestAnimationFrame === "function") {
      _rafId = window.requestAnimationFrame(rafLoop);
    }
  }

  if (typeof window !== "undefined" && !window.__NO_AUTO_INIT__ && typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        init();
      });
    } else {
      init();
    }
  }

  window.Gameplay = {
    UPGRADE_DEFS,
    MACHINE_CONFIGS,
    init,
    step,
    getState: () => state,
    getPlayer: () => player,
    getRuntime: () => runtime,
    getSceneObjs: () => sceneObjs,
    setInput,
    openShop,
    closeShop,
    renderShop,
    saveGame,
    loadGame,
    resetGame,
  };
})();
