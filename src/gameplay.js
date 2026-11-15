// =============================================================================
// src/gameplay.js - 100% Green Cash Economy, Differentiated 1호기·2호기·3호기
// Production Facilities, VIP Trade Wagon, Smart Worker Division & Over-Head HUD
// =============================================================================

(function () {
  "use strict";

  const SAVE_KEY = "fairy_alchemy_tycoon_v5";

  const ITEM_META = {
    blue_ore: { label: "푸른 광석", short: "광석", icon: "⛏️", val: 10 },
    rainbow_herb: { label: "무지개 약초", short: "약초", icon: "🌿", val: 10 },
    cut_gem: { label: "세공 보석", short: "세공보석", icon: "💠", val: 35 },
    magic_potion: { label: "마법 포션", short: "포션", icon: "🧪", val: 80 },
    royal_elixir: { label: "황실 엘릭서", short: "엘릭서", icon: "👑", val: 300 },
  };

  const UPGRADE_DEFS = {
    tool: {
      id: "tool",
      tab: "wizard",
      icon: "⛏️",
      title: "채집 곡괭이",
      desc: "광석·약초 채집 속도와 수확량을 높입니다.",
      accent: "#52efff",
      baseCost: 30,
      mult: 1.85,
      maxLv: 8,
    },
    bag: {
      id: "bag",
      tab: "wizard",
      icon: "🎒",
      title: "배낭 적재",
      desc: "등 뒤 나무 지게에 쌓이는 자원 최대 수를 늘립니다.",
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
      desc: "연금술사의 이동 속도를 크게 높입니다.",
      accent: "#7effa2",
      baseCost: 40,
      mult: 1.8,
      maxLv: 6,
    },
    m1: {
      id: "m1",
      tab: "automation",
      icon: "⚙️",
      title: "1호기 세공기",
      desc: "푸른 광석 전용! 세공 보석(💵 35)을 깎아 쇼케이스에 자동 진열합니다.",
      accent: "#d67aff",
      baseCost: 50,
      mult: 1.9,
      maxLv: 6,
    },
    m2: {
      id: "m2",
      tab: "automation",
      icon: "⚗️",
      title: "2호기 가마솥",
      desc: "남동쪽 '무지개 약초 숲' 해금! 약초 전용 마법 포션(💵 80)을 자동 판매합니다.",
      accent: "#52ff9b",
      baseCost: 140,
      mult: 1.9,
      maxLv: 6,
    },
    m3: {
      id: "m3",
      tab: "automation",
      icon: "👑",
      title: "3호기 합체소",
      desc: "광석+약초 조합! 황실 엘릭서 상자를 VIP 무역 마차에 실어 💵 300 잭팟 판매!",
      accent: "#ff8c42",
      baseCost: 380,
      mult: 1.9,
      maxLv: 6,
    },
    fairy: {
      id: "fairy",
      tab: "automation",
      icon: "🧚",
      title: "요정 일꾼",
      desc: "광석팀·약초팀으로 똑똑하게 분업하는 자동 일꾼(최대 15).",
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
      desc: "광산·약초 숲을 휩쓸어 설비에 자동 분배하는 메가 트럭.",
      accent: "#4ce6d8",
      baseCost: 220,
      mult: 1.95,
      maxLv: 5,
    },
    farm2: {
      id: "farm2",
      tab: "automation",
      icon: "⛏️",
      title: "북동 광산 확장",
      desc: "18개 추가 푸른 광석 광맥을 북동 게이트에 해금합니다.",
      accent: "#59b2ff",
      baseCost: 160,
      mult: 1,
      maxLv: 1,
    },
    farm3: {
      id: "farm3",
      tab: "automation",
      icon: "🌿",
      title: "북서 약초 확장",
      desc: "18개 추가 무지개 약초 정원을 북서 게이트에 해금합니다.",
      accent: "#6bff9e",
      baseCost: 340,
      mult: 1,
      maxLv: 1,
    },
  };

  // Strict Differentiated Layout for 1호기, 2호기, 3호기
  const MACHINE_CONFIGS = [
    {
      id: "m1",
      padId: "m1",
      kind: "cutter",
      title: "1호기 세공기",
      x: -11.0,
      z: -11.8,
      inPos: { x: -14.2, z: -11.4 },
      outPos: { x: -7.6, z: -11.4 }, // Connected Jewel Showcase
      cashPos: { x: -7.6, z: -8.5 },
      padPos: { x: -11.0, z: -7.4 },
      inputType: "blue_ore",
      inBadge: "광석 IN",
      showcaseKind: "jewel",
      customerRole: "vip",
      custQueueX: -5.3,
      custQueueZ0: -11.4,
      outputType: "cut_gem",
      salePrice: 35,
      baseCraftTime: 1.5,
      accent: "#d67aff",
    },
    {
      id: "m2",
      padId: "m2",
      kind: "cauldron",
      title: "2호기 가마솥",
      x: 0.0,
      z: -11.8,
      inPos: { x: -3.2, z: -11.4 },
      outPos: { x: 3.2, z: -11.4 }, // Connected Potion Stand
      cashPos: { x: 3.2, z: -8.5 },
      padPos: { x: 0.0, z: -7.4 },
      inputType: "rainbow_herb",
      inBadge: "약초 IN",
      showcaseKind: "potion",
      customerRole: "wizard",
      custQueueX: 5.4,
      custQueueZ0: -11.4,
      outputType: "magic_potion",
      salePrice: 80,
      baseCraftTime: 1.75,
      accent: "#52ff9b",
    },
    {
      id: "m3",
      padId: "m3",
      kind: "distillery",
      title: "3호기 합체소",
      x: 11.0,
      z: -11.8,
      inPos: { x: 7.6, z: -12.3 }, // Ore IN
      inPosB: { x: 7.6, z: -9.9 }, // Herb IN
      outPos: { x: 14.2, z: -11.4 }, // Royal Trade Wagon Loading Dock
      cashPos: { x: 14.2, z: -8.5 },
      padPos: { x: 11.0, z: -7.4 },
      inputType: "blue_ore",
      inputTypeB: "rainbow_herb",
      inBadge: "광석 IN",
      inBadgeB: "약초 IN",
      outputType: "royal_elixir",
      salePrice: 300,
      baseCraftTime: 2.0,
      accent: "#ff8c42",
    },
  ];

  // Starter Station (West Market Plaza)
  const STALL_POS = { x: -15.2, z: 5.2 };
  const SELL_PALLET_POS = { x: -10.2, z: 5.2 };
  const GEM_PEDESTAL_POS = { x: -10.2, z: 1.6 }; // Starter Cash Pedestal

  // ---------------------------------------------------------------------------
  // State & Runtime Containers
  // ---------------------------------------------------------------------------
  let state = createDefaultState();

  function createDefaultState() {
    return {
      gems: 20, // 100% Green Cash (💵)
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
      herbGroveUnlocked: false, // Unlocked automatically when 2호기 Lv >= 1
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
    pedestals: [], // [0]=Starter, [1]=m1, [2]=m2, [3]=m3 cash pedestals
    pedestalGems: [], // Legacy alias reference kept synced with Starter pedestal cash array
    flyingBricks: [],
    particles: [],
    popups: [], // 2D projected floating popups (+1 광석, +💵 10, etc.)
    fairies: [],
    customers: [], // Starter villagers
    truck: null,
    wagon: null, // 3호기 VIP Royal Trade Wagon
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
        showToast(`⛏️ 채집 곡괭이 Lv.${state.toolLv} 달성!`);
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
        refreshFacilityVisibility();
        showToast(
          state.m1Lv === 1
            ? "⚙️ 1호기 크리스탈 세공기 가동! 광석을 넣으면 보석 쇼케이스에 자동 진열됩니다!"
            : `⚙️ 1호기 세공기 Lv.${state.m1Lv} 가속!`
        );
        break;
      case "m2":
        state.m2Lv++;
        state.herbGroveUnlocked = true;
        if (runtime.machines[1]) runtime.machines[1].lv = state.m2Lv;
        refreshFarmZoneVisibility();
        refreshFacilityVisibility();
        showToast(
          state.m2Lv === 1
            ? "⚗️ 2호기 포션 가마솥 가동 & 남동쪽 '무지개 약초 숲' 해금!"
            : `⚗️ 2호기 가마솥 Lv.${state.m2Lv} 가속!`
        );
        break;
      case "m3":
        state.m3Lv++;
        if (runtime.machines[2]) runtime.machines[2].lv = state.m3Lv;
        refreshFacilityVisibility();
        ensureWagonSpawned();
        showToast(
          state.m3Lv === 1
            ? "👑 3호기 황실 연금 합체소 & VIP 무역 마차 개통! (광석+약초=💵 300)"
            : `👑 3호기 합체소 Lv.${state.m3Lv} 가속!`
        );
        break;
      case "fairy":
        state.fairyCount++;
        syncFairiesCount();
        showToast(`🧚 요정 일꾼 ${state.fairyCount}호 합류! (광석·약초 스마트 분업)`);
        break;
      case "truck":
        state.truckLv++;
        ensureTruckSpawned();
        showToast(state.truckLv === 1 ? "🚜 메가 수확 트럭 출고!" : `🚜 메가 트럭 Lv.${state.truckLv} 업그레이드!`);
        break;
      case "farm2":
        state.farm2Unlocked = true;
        refreshFarmZoneVisibility();
        showToast("⛏️ 북동 게이트 추가 광석 광맥 18노드 해금!");
        break;
      case "farm3":
        state.farm3Unlocked = true;
        state.herbGroveUnlocked = true;
        refreshFarmZoneVisibility();
        showToast("🌿 북서 게이트 추가 무지개 약초 정원 18노드 해금!");
        break;
      default:
        break;
    }
    state.padPaid[id] = 0;
    addXp(25);
    playBuildPop();
    spawnBurstVfx(player.x, 1.0, player.z, 0x4eff9e, 12);
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
      showToast(`✨ 연금술사 Lv.${state.level} 레벨업!`);
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
  // Crate Stacking, Cash Pedestals & World Popups
  // ---------------------------------------------------------------------------
  function syncCrateStackVisuals(anchor, itemList, poolList, opts = {}) {
    if (!anchor || !window.Entities) return;
    const cols = opts.cols || 1;
    const rows = opts.rows || 1;
    const maxDraw = opts.maxDraw || 32;
    const yStep = opts.yStep || 0.21;
    const xStep = opts.xStep || 1.0;
    const zStep = opts.zStep || 0.7;

    const visibleCount = Math.min(itemList.length, maxDraw);
    while (poolList.length < visibleCount) {
      const t = itemList[poolList.length] || "blue_ore";
      const mesh = window.Entities.createItemBlock(t);
      anchor.add(mesh);
      poolList.push(mesh);
    }
    while (poolList.length > visibleCount) {
      const m = poolList.pop();
      anchor.remove(m);
    }

    for (let i = 0; i < visibleCount; i++) {
      const wantType = itemList[i];
      if (poolList[i].userData.itemType !== wantType) {
        anchor.remove(poolList[i]);
        const fresh = window.Entities.createItemBlock(wantType);
        anchor.add(fresh);
        poolList[i] = fresh;
      }

      if (cols === 1 && rows === 1) {
        poolList[i].position.set(0, i * yStep, 0);
      } else {
        const perLayer = cols * rows;
        const slot = i % perLayer;
        const layer = Math.floor(i / perLayer);
        const cx = (slot % cols) - (cols - 1) * 0.5;
        const cz = Math.floor(slot / cols) - (rows - 1) * 0.5;
        poolList[i].position.set(cx * xStep, layer * yStep, cz * zStep);
      }
    }
  }

  function addCashToPedestal(pedestalIdx, totalAmount) {
    const ped = runtime.pedestals[pedestalIdx];
    if (!ped) return;
    // Break revenue into clean 💵 10 green cash bundles (+ remainder bill bundle, e.g., 35 -> [10,10,10,5])
    let rem = Math.max(1, Math.round(totalAmount));
    while (rem > 0) {
      const chunk = rem >= 10 ? 10 : rem;
      ped.cashValues.push(chunk);
      rem -= chunk;
    }
    syncCashPedestalVisuals(ped);
  }

  function syncCashPedestalVisuals(ped) {
    if (!ped || !ped.entity || !ped.entity.stackAnchor || !window.Entities) return;
    const anchor = ped.entity.stackAnchor;
    const total = Math.min(ped.cashValues.length, 117);
    const pool = ped.visuals;

    while (pool.length < total) {
      const m = window.Entities.createItemBlock("cash_bundle");
      anchor.add(m);
      pool.push(m);
    }
    while (pool.length > total) {
      const m = pool.pop();
      anchor.remove(m);
    }

    // Strict 3x3 Cash Skyscraper Grid
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

  function spawnFloatingText(wx, wy, wz, text, color = "#fff6a8") {
    if (typeof document === "undefined" || !window.Engine || !window.Engine.worldToScreen) return;
    const layer = document.getElementById("fx-overlay");
    if (!layer) return;

    const el = document.createElement("div");
    el.className = "float-popup";
    el.style.color = color;
    el.textContent = text;
    layer.appendChild(el);

    runtime.popups.push({
      el,
      wx,
      wy,
      wz,
      offsetY: 0,
      life: 0,
      maxLife: 0.85,
    });
  }

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
      p.vy -= 14.0 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      const s = 1 - p.life / p.maxLife;
      p.mesh.scale.set(s, s, s);
    }

    for (let i = runtime.flyingBricks.length - 1; i >= 0; i--) {
      const f = runtime.flyingBricks[i];
      f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      const tx = f.trackPlayer ? player.x : f.tx;
      const tz = f.trackPlayer ? player.z : f.tz;
      const ty = f.trackPlayer ? 1.15 : f.ty;
      const px = f.sx + (tx - f.sx) * u;
      const pz = f.sz + (tz - f.sz) * u;
      const arc = Math.sin(u * Math.PI) * 1.45;
      const py = f.sy + (ty - f.sy) * u + arc;
      f.mesh.position.set(px, py, pz);
      f.mesh.rotation.y += dt * 7;
      if (u >= 1) {
        if (Engine && Engine.vfxGroup) Engine.vfxGroup.remove(f.mesh);
        runtime.flyingBricks.splice(i, 1);
        if (f.onArrive) f.onArrive();
      }
    }

    // 2D World-Projected Floating Popups
    for (let i = runtime.popups.length - 1; i >= 0; i--) {
      const pop = runtime.popups[i];
      pop.life += dt;
      if (pop.life >= pop.maxLife) {
        if (pop.el && pop.el.parentNode) pop.el.parentNode.removeChild(pop.el);
        runtime.popups.splice(i, 1);
        continue;
      }
      const pRatio = pop.life / pop.maxLife;
      pop.offsetY -= 46 * dt;
      if (Engine && Engine.worldToScreen) {
        const sp = Engine.worldToScreen(new THREE.Vector3(pop.wx, pop.wy, pop.wz));
        pop.el.style.transform = `translate(${Math.round(sp.x)}px, ${Math.round(sp.y + pop.offsetY)}px) translate(-50%, -50%)`;
        pop.el.style.opacity = String(pRatio < 0.7 ? 1 : 1 - (pRatio - 0.7) / 0.3);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // World Construction (84 Distinct Ore/Herb Nodes, 3 Differentiated Facilities, 4 Cash Pedestals)
  // ---------------------------------------------------------------------------
  function buildDenseFarmNodes() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    const specs = [];
    // Zone 1: East Gate Blue Ore Mine (6 cols x 4 rows = 24 ore nodes, z in [-9.8..-3.2], unlocked)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({
          zone: 1,
          kind: "blue_ore",
          itemType: "blue_ore",
          x: 22.8 + c * 2.0,
          z: -9.5 + r * 2.1,
        });
      }
    }
    // Zone 2: South-East Rainbow Herb Grove (6 cols x 4 rows = 24 herb nodes, z in [3.2..9.8], unlocked by 2호기!)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({
          zone: 2,
          kind: "rainbow_herb",
          itemType: "rainbow_herb",
          x: 22.8 + c * 2.0,
          z: 3.1 + r * 2.1,
        });
      }
    }
    // Zone 3: North-East Ore Annex (6 cols x 3 rows = 18 ore nodes, unlocked by farm2 pad)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({
          zone: 3,
          kind: "blue_ore",
          itemType: "blue_ore",
          x: 5.0 + c * 2.0,
          z: -27.2 + r * 2.2,
        });
      }
    }
    // Zone 4: North-West Herb Annex (6 cols x 3 rows = 18 herb nodes, unlocked by farm3 pad)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({
          zone: 4,
          kind: "rainbow_herb",
          itemType: "rainbow_herb",
          x: -15.0 + c * 2.0,
          z: -27.2 + r * 2.2,
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
        itemType: s.itemType,
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
    if (zone === 2) return !!state.herbGroveUnlocked || state.m2Lv > 0;
    if (zone === 3) return !!state.farm2Unlocked;
    if (zone === 4) return !!state.farm3Unlocked;
    return false;
  }

  function refreshFarmZoneVisibility() {
    for (const node of runtime.farmNodes) {
      const unlocked = isZoneUnlocked(node.zone);
      const active = unlocked && node.respawnTimer <= 0;
      if (node.entity && node.entity.root) {
        node.entity.root.visible = unlocked;
        if (!active && node.entity.visualRoot) {
          node.entity.visualRoot.scale.set(0.01, 0.01, 0.01);
        } else if (active && node.entity.visualRoot) {
          node.entity.visualRoot.scale.set(1, 1, 1);
        }
      }
    }
  }

  function refreshFacilityVisibility() {
    for (let i = 0; i < runtime.machines.length; i++) {
      const m = runtime.machines[i];
      const built = m.lv > 0;
      if (m.entity && m.entity.root) {
        m.entity.root.visible = built;
      }
      if (m.showcase && m.showcase.root) {
        m.showcase.root.visible = built;
      }
      if (m.cashPedestal && m.cashPedestal.entity && m.cashPedestal.entity.root) {
        m.cashPedestal.entity.root.visible = built;
      }
      if (m.inPallet && m.inPallet.root) {
        m.inPallet.root.visible = built;
      }
      if (m.inPalletB && m.inPalletB.root) {
        m.inPalletB.root.visible = built;
      }
      if (m.dockPallet && m.dockPallet.root) {
        m.dockPallet.root.visible = built;
      }
      for (const c of m.customers || []) {
        if (c.entity && c.entity.root) {
          c.entity.root.visible = built;
        }
      }
    }
    if (runtime.wagon && runtime.wagon.entity && runtime.wagon.entity.root) {
      runtime.wagon.entity.root.visible = state.m3Lv > 0;
    }
  }

  function buildProductionMachines() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    for (let i = 0; i < MACHINE_CONFIGS.length; i++) {
      const cfg = MACHINE_CONFIGS[i];
      const ent = Entities.createProductionMachine(cfg.kind);
      ent.root.position.set(cfg.x, 0, cfg.z);
      Engine.stationGroup.add(ent.root);

      const inPallet = Entities.createWoodenPalletZone({
        x: cfg.inPos.x,
        z: cfg.inPos.z,
        w: 2.25,
        d: 1.85,
        accentColor: "#5ef0ff",
        badgeText: cfg.inBadge,
      });
      Engine.stationGroup.add(inPallet.root);

      let inPalletB = null;
      if (cfg.inPosB) {
        inPalletB = Entities.createWoodenPalletZone({
          x: cfg.inPosB.x,
          z: cfg.inPosB.z,
          w: 2.25,
          d: 1.85,
          accentColor: "#6bff9e",
          badgeText: cfg.inBadgeB,
        });
        Engine.stationGroup.add(inPalletB.root);
      }

      let showcase = null;
      let dockPallet = null;
      const facilityCustomers = [];

      if (cfg.showcaseKind) {
        // 1호기 Jewel Showcase & 2호기 Potion Stand (auto-stocked from conveyor!)
        showcase = Entities.createShowcaseCounter({
          x: cfg.outPos.x,
          z: cfg.outPos.z,
          kind: cfg.showcaseKind,
          accentColor: cfg.id === "m1" ? 0xc56bff : 0x3be898,
        });
        Engine.stationGroup.add(showcase.root);

        for (let ci = 0; ci < 3; ci++) {
          const cz = cfg.custQueueZ0 + ci * 1.35;
          const custEnt = Entities.createCustomer(ci + (cfg.id === "m2" ? 2 : 0), cfg.customerRole);
          custEnt.root.position.set(cfg.custQueueX, 0, cz);
          custEnt.root.rotation.y = -Math.PI * 0.5;
          Engine.unitGroup.add(custEnt.root);
          facilityCustomers.push({
            slot: ci,
            x: cfg.custQueueX,
            z: cz,
            targetX: cfg.custQueueX,
            targetZ: cz,
            homeX: cfg.custQueueX,
            leaving: false,
            entity: custEnt,
          });
        }
      } else {
        // 3호기 Royal Loading Dock Pallet for VIP Trade Wagon
        dockPallet = Entities.createWoodenPalletZone({
          x: cfg.outPos.x,
          z: cfg.outPos.z,
          w: 2.35,
          d: 1.95,
          accentColor: "#ffd85e",
          badgeText: "VIP 적재",
        });
        Engine.stationGroup.add(dockPallet.root);
      }

      // Dedicated Green Cash Pedestal per facility (indices 1, 2, 3)
      const pedEnt = Entities.createGemPedestal(cfg.cashPos.x, cfg.cashPos.z);
      Engine.stationGroup.add(pedEnt.root);
      const pedObj = {
        id: cfg.id,
        x: cfg.cashPos.x,
        z: cfg.cashPos.z,
        cashValues: [],
        visuals: [],
        entity: pedEnt,
      };
      runtime.pedestals.push(pedObj);

      runtime.machines.push({
        cfg,
        lv: getUpgradeLevel(cfg.id),
        entity: ent,
        inPallet,
        inPalletB,
        showcase,
        dockPallet,
        cashPedestal: pedObj,
        customers: facilityCustomers,
        inQueue: [],
        inVisuals: [],
        inQueueB: [],
        inVisualsB: [],
        outQueue: [],
        outVisuals: [],
        craftProgress: 0,
        saleCooldown: 0,
      });
    }
    refreshFacilityVisibility();
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
      w: 2.65,
      d: 2.15,
      accentColor: "#58b8ff",
      badgeText: "광석 판매",
    });
    Engine.stationGroup.add(sceneObjs.sellPallet.root);

    sceneObjs.gemPedestal = Entities.createGemPedestal(GEM_PEDESTAL_POS.x, GEM_PEDESTAL_POS.z);
    Engine.stationGroup.add(sceneObjs.gemPedestal.root);

    // Index 0 = Starter Cash Pedestal (unshift so index 0 is always Starter, 1..3 are m1..m3)
    const starterPed = {
      id: "starter",
      x: GEM_PEDESTAL_POS.x,
      z: GEM_PEDESTAL_POS.z,
      cashValues: runtime.pedestalGems,
      visuals: [],
      entity: sceneObjs.gemPedestal,
    };
    runtime.pedestals.unshift(starterPed);

    // 5 cute Villager Customers at Starter Raw Ore Stall
    for (let i = 0; i < 5; i++) {
      const custEnt = Entities.createCustomer(i, "villager");
      const slotZ = STALL_POS.z + 2.3 + i * 1.65;
      custEnt.root.position.set(STALL_POS.x + 0.3, 0, slotZ);
      custEnt.root.rotation.y = Math.PI;
      Engine.unitGroup.add(custEnt.root);
      runtime.customers.push({
        slot: i,
        x: STALL_POS.x + 0.3,
        z: slotZ,
        targetX: STALL_POS.x + 0.3,
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
      { id: "farm2", x: 6.6, z: -15.2 },
      { id: "farm3", x: -6.6, z: -15.2 },
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
        price: `💵 ${getUpgradeCost(p.id)}`,
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
        role: idx % 2 === 0 ? "ore" : "herb",
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

  function ensureWagonSpawned() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities || typeof Entities.createRoyalTradeWagon !== "function") return;

    if (!runtime.wagon) {
      const ent = Entities.createRoyalTradeWagon();
      ent.root.position.set(29.0, 0, -14.2);
      ent.root.rotation.y = Math.PI;
      Engine.unitGroup.add(ent.root);
      runtime.wagon = {
        x: 29.0,
        z: -14.2,
        rotY: Math.PI,
        state: "waiting_east", // waiting_east -> arriving -> loading -> departing
        timer: 2.5,
        cargoCount: 0,
        cargoVisuals: [],
        entity: ent,
      };
    }
    runtime.wagon.entity.root.visible = state.m3Lv > 0;
  }

  // ---------------------------------------------------------------------------
  // Simulation Steps
  // ---------------------------------------------------------------------------
  function resolveWorldBoundsAndCollisions(obj, radius = 0.65) {
    const inEastGate = obj.x > 17.5 && Math.abs(obj.z) < 4.5;
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
      const herbOk = isZoneUnlocked(2);
      if (obj.x < 19.8) {
        obj.z = Math.max(-4.2, Math.min(4.2, obj.z));
      } else {
        obj.z = Math.max(-11.8, Math.min(herbOk ? 11.8 : 0.2, obj.z));
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

    // Solid obstacle pushouts (Starter Stall & Built North Machine Cores/Showcases)
    const boxes = [
      { cx: STALL_POS.x, cz: STALL_POS.z, hw: 1.75 + radius, hd: 1.05 + radius },
    ];
    for (const m of runtime.machines) {
      if (m.lv <= 0) continue;
      boxes.push({ cx: m.cfg.x, cz: m.cfg.z, hw: 1.35 + radius, hd: 1.15 + radius });
      if (m.cfg.showcaseKind) {
        boxes.push({ cx: m.cfg.outPos.x, cz: m.cfg.outPos.z, hw: 1.3 + radius, hd: 0.95 + radius });
      }
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
    let ix = input.joyActive ? input.joyX : 0;
    let iz = input.joyActive ? input.joyY : 0;

    if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) iz -= 1;
    if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) iz += 1;
    if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) ix -= 1;
    if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) ix += 1;

    const len = Math.hypot(ix, iz);
    if (len > 1) {
      ix /= len;
      iz /= len;
    }

    const maxSpd = getHeroMoveSpeed();
    const targetVx = ix * maxSpd;
    const targetVz = iz * maxSpd;
    const smooth = 1 - Math.exp(-16 * dt);
    player.vx += (targetVx - player.vx) * smooth;
    player.vz += (targetVz - player.vz) * smooth;

    player.x += player.vx * dt;
    player.z += player.vz * dt;
    resolveWorldBoundsAndCollisions(player, 0.65);

    const speedNow = Math.hypot(player.vx, player.vz);
    if (speedNow > 0.35) {
      const desiredRot = Math.atan2(player.vx, player.vz);
      let diff = desiredRot - player.rotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.rotY += diff * (1 - Math.exp(-14 * dt));
    }

    if (player.swingTimer > 0) {
      player.swingTimer = Math.max(0, player.swingTimer - dt);
    }

    if (sceneObjs.hero && window.Entities) {
      sceneObjs.hero.root.position.set(player.x, 0, player.z);
      sceneObjs.hero.root.rotation.y = player.rotY;
      window.Entities.animatePlayerHero(sceneObjs.hero, {
        vx: player.vx,
        vz: player.vz,
        moveSpeed: maxSpd,
        swingProgress: player.swingTimer > 0 ? 1 - player.swingTimer / player.swingDuration : 0,
        bagCount: player.bagItems.length,
        dt,
      });
    }
  }

  function harvestNode(node, amount, toBag, xOrig, zOrig, showPopup = false) {
    node.hp -= 1;
    node.hitAnim = 0.22;
    const isOre = node.itemType === "blue_ore";
    spawnBurstVfx(node.x, 0.8, node.z, isOre ? 0x3b9eff : 0x52eb7d, 5);
    if (node.hp <= 0) {
      node.respawnTimer = 4.2;
      if (node.entity && node.entity.visualRoot) {
        node.entity.visualRoot.scale.set(0.01, 0.01, 0.01);
      }
    }
    if (showPopup && amount > 0) {
      const meta = ITEM_META[node.itemType] || { icon: "📦", short: "자원" };
      spawnFloatingText(
        node.x,
        1.75,
        node.z,
        `+${amount} ${meta.icon} ${meta.short}`,
        isOre ? "#7be3ff" : "#80ff9e"
      );
    }
    for (let i = 0; i < amount; i++) {
      spawnFlyingItem(node.itemType, node.x, 0.85, node.z, xOrig, 1.3, zOrig, () => {
        toBag.push(node.itemType);
      });
    }
  }

  function updateNodesAndHeroHarvest(dt) {
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
        harvestNode(best, yieldCount, player.bagItems, player.x, player.z, true);
        playHarvestChime(player.bagItems.length);
        addXp(3);
      }
    }
  }

  function transferTypedFromBagToQueue(wantedType, toX, toZ, targetQueue, maxQueueLen) {
    if (targetQueue.length >= maxQueueLen) return false;
    const idx = player.bagItems.indexOf(wantedType);
    if (idx === -1) return false;
    const item = player.bagItems.splice(idx, 1)[0];
    player.transferCooldown = 0.05;
    spawnFlyingItem(item, player.x, 1.3, player.z, toX, 0.35, toZ, () => {
      targetQueue.push(item);
    });
    playTone(460, 0.05, "sine", 0.04);
    return true;
  }

  function updatePalletsAndHeroTransfers(dt) {
    if (player.transferCooldown > 0) player.transferCooldown -= dt;

    // 1. Differentiated Production Machines (m1 Ore, m2 Herb, m3 Ore+Herb)
    for (const m of runtime.machines) {
      if (m.lv <= 0) continue;
      let inPulse = 0;
      let inBPulse = 0;

      // Primary Input Pallet
      if (Math.hypot(player.x - m.cfg.inPos.x, player.z - m.cfg.inPos.z) < 2.25) {
        inPulse = 1;
        if (player.transferCooldown <= 0) {
          transferTypedFromBagToQueue(m.cfg.inputType, m.cfg.inPos.x, m.cfg.inPos.z, m.inQueue, 24);
        }
      }

      // Secondary Input Pallet (3호기 약초 IN)
      if (m.inPalletB && m.cfg.inPosB && Math.hypot(player.x - m.cfg.inPosB.x, player.z - m.cfg.inPosB.z) < 2.25) {
        inBPulse = 1;
        if (player.transferCooldown <= 0) {
          transferTypedFromBagToQueue(m.cfg.inputTypeB, m.cfg.inPosB.x, m.cfg.inPosB.z, m.inQueueB, 24);
        }
      }

      window.Entities.updateWoodenPalletZone(m.inPallet, inPulse, runtime.time);
      if (m.inPalletB) {
        window.Entities.updateWoodenPalletZone(m.inPalletB, inBPulse, runtime.time);
      }
      if (m.dockPallet) {
        window.Entities.updateWoodenPalletZone(m.dockPallet, m.outQueue.length > 0 ? 1 : 0, runtime.time);
      }

      // Processing -> Automatic Conveyor to Showcase / VIP Dock (Zero player carry needed!)
      const hasInputs = m.cfg.inPosB ? m.inQueue.length > 0 && m.inQueueB.length > 0 : m.inQueue.length > 0;
      const isProcessing = hasInputs && m.outQueue.length < 24;
      if (isProcessing) {
        const speedMult = 1 + (m.lv - 1) * 0.28;
        m.craftProgress += (dt * speedMult) / m.cfg.baseCraftTime;
        if (m.craftProgress >= 1) {
          m.craftProgress -= 1;
          m.inQueue.shift();
          if (m.cfg.inPosB) m.inQueueB.shift();
          // Conveyor delivers directly to Showcase or Loading Dock
          m.outQueue.push(m.cfg.outputType);
          spawnBurstVfx(m.cfg.outPos.x, 1.15, m.cfg.outPos.z, 0xffe066, 4);
        }
      } else if (!hasInputs) {
        m.craftProgress = 0;
      }

      window.Entities.animateProductionMachine(m.entity, isProcessing, dt);

      syncCrateStackVisuals(m.inPallet.stackAnchor, m.inQueue, m.inVisuals, {
        cols: 2,
        rows: 2,
        xStep: 1.0,
        zStep: 0.68,
        maxDraw: 24,
      });
      if (m.inPalletB) {
        syncCrateStackVisuals(m.inPalletB.stackAnchor, m.inQueueB, m.inVisualsB, {
          cols: 2,
          rows: 2,
          xStep: 1.0,
          zStep: 0.68,
          maxDraw: 24,
        });
      }
      if (m.showcase && m.showcase.stockAnchor) {
        syncCrateStackVisuals(m.showcase.stockAnchor, m.outQueue, m.outVisuals, {
          cols: 2,
          rows: 1,
          xStep: 1.02,
          zStep: 0.72,
          maxDraw: 16,
        });
      } else if (m.dockPallet && m.dockPallet.stackAnchor) {
        syncCrateStackVisuals(m.dockPallet.stackAnchor, m.outQueue, m.outVisuals, {
          cols: 2,
          rows: 2,
          xStep: 1.02,
          zStep: 0.72,
          maxDraw: 20,
        });
      }
    }

    // 2. Starter Raw Ore Stall SELL Pallet (accepts blue_ore ONLY -> 💵 10 per crate)
    let sellPulse = 0;
    if (Math.hypot(player.x - SELL_PALLET_POS.x, player.z - SELL_PALLET_POS.z) < 2.45) {
      sellPulse = 1;
      if (player.transferCooldown <= 0 && runtime.sellPalletQueue.length < 36) {
        transferTypedFromBagToQueue("blue_ore", SELL_PALLET_POS.x, SELL_PALLET_POS.z, runtime.sellPalletQueue, 36);
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

  function advanceCustomerQueue(custList, dt, homeX, homeZ0, zStep, faceAngle, exitOffsetX, exitZ) {
    for (const c of custList) {
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
        c.entity.root.rotation.y = faceAngle;
        if (c.leaving) {
          c.leaving = false;
          c.x = homeX;
          c.z = exitZ;
          for (const o of custList) {
            if (o !== c && !o.leaving) {
              o.slot = Math.max(0, o.slot - 1);
              o.targetX = homeX;
              o.targetZ = homeZ0 + o.slot * zStep;
            }
          }
          c.slot = custList.length - 1;
          c.targetX = homeX;
          c.targetZ = homeZ0 + c.slot * zStep;
        }
      }
      c.entity.root.position.set(c.x, 0, c.z);
      window.Entities.animateCustomer(c.entity, walking, dt);
    }
  }

  function updateWagon(dt) {
    const m3 = runtime.machines[2];
    const w = runtime.wagon;
    if (!m3 || m3.lv <= 0 || !w) return;

    const dockStopX = 15.2;
    const eastParkX = 29.0;
    let spd = 0;

    if (w.state === "waiting_east") {
      w.timer -= dt;
      if (m3.outQueue.length >= 1 || w.timer <= 0) {
        if (m3.outQueue.length >= 1) {
          w.state = "arriving";
        } else {
          w.timer = 2.0;
        }
      }
    } else if (w.state === "arriving") {
      spd = 7.2;
      const dx = dockStopX - w.x;
      if (Math.abs(dx) <= spd * dt + 0.1) {
        w.x = dockStopX;
        w.state = "loading";
        w.timer = 0.85;
      } else {
        w.x += Math.sign(dx) * spd * dt;
        w.rotY = Math.PI;
      }
    } else if (w.state === "loading") {
      w.timer -= dt;
      if (m3.outQueue.length > 0 && Math.floor((w.timer + dt) * 6) !== Math.floor(w.timer * 6)) {
        m3.outQueue.pop();
        w.cargoCount++;
        // Burst 💵 300 in 30 cash bundles onto 3호기 Cash Pedestal
        addCashToPedestal(3, m3.cfg.salePrice);
        spawnBurstVfx(m3.cfg.cashPos.x, 1.4, m3.cfg.cashPos.z, 0x2ecc71, 10);
        spawnFloatingText(m3.cfg.cashPos.x, 2.2, m3.cfg.cashPos.z, "+💵 300 👑", "#ffe36e");
        playGemChime(14);
      }
      if (w.timer <= 0 && m3.outQueue.length === 0) {
        w.state = "departing";
      } else if (w.timer <= 0 && m3.outQueue.length > 0) {
        w.timer = 0.35;
      }
    } else if (w.state === "departing") {
      spd = 8.4;
      const dx = eastParkX - w.x;
      if (Math.abs(dx) <= spd * dt + 0.1) {
        w.x = eastParkX;
        w.cargoCount = 0;
        w.state = "waiting_east";
        w.timer = 3.5;
      } else {
        w.x += Math.sign(dx) * spd * dt;
        w.rotY = 0;
      }
    }

    w.entity.root.position.set(w.x, 0, w.z);
    w.entity.root.rotation.y = w.rotY;
    if (window.Entities.animateRoyalTradeWagon) {
      window.Entities.animateRoyalTradeWagon(w.entity, spd, dt);
    }
    if (w.entity.cargoMount) {
      const dummyCargo = new Array(Math.min(w.cargoCount, 6)).fill("royal_elixir");
      syncCrateStackVisuals(w.entity.cargoMount, dummyCargo, w.cargoVisuals, {
        cols: 1,
        yStep: 0.21,
        maxDraw: 6,
      });
    }
  }

  function updateCustomersAndCashPedestals(dt) {
    // 1. Starter Stall Sales (Villagers buy blue_ore for 💵 10)
    if (runtime.sellCooldown > 0) runtime.sellCooldown -= dt;
    if (runtime.sellCooldown <= 0 && runtime.sellPalletQueue.length > 0) {
      runtime.sellCooldown = 0.55;
      runtime.sellPalletQueue.pop();
      addCashToPedestal(0, 10);
      spawnBurstVfx(STALL_POS.x + 0.5, 1.4, STALL_POS.z + 1.5, 0x2ecc71, 4);

      const lead = runtime.customers.find((c) => c.slot === 0 && !c.leaving);
      if (lead) {
        lead.leaving = true;
        lead.targetX = STALL_POS.x - 2.4;
        lead.targetZ = STALL_POS.z + 11.5;
      }
    }
    advanceCustomerQueue(
      runtime.customers,
      dt,
      STALL_POS.x + 0.3,
      STALL_POS.z + 2.3,
      1.65,
      Math.PI,
      -2.4,
      STALL_POS.z + 11.5
    );

    // 2. Facility 1 (VIP Showcase 💵 35) & Facility 2 (Wizard Potion Stand 💵 80) Automatic Sales
    for (let i = 0; i < 2; i++) {
      const m = runtime.machines[i];
      if (!m || m.lv <= 0 || !m.showcase) continue;
      if (m.saleCooldown > 0) m.saleCooldown -= dt;
      if (m.saleCooldown <= 0 && m.outQueue.length > 0) {
        m.saleCooldown = 0.65;
        m.outQueue.pop();
        addCashToPedestal(i + 1, m.cfg.salePrice);
        spawnBurstVfx(m.cfg.outPos.x, 1.35, m.cfg.outPos.z, 0x2ecc71, 6);

        const lead = m.customers.find((c) => c.slot === 0 && !c.leaving);
        if (lead) {
          lead.leaving = true;
          lead.targetX = m.cfg.custQueueX + 1.4;
          lead.targetZ = m.cfg.custQueueZ0 + 6.5;
        }
      }
      advanceCustomerQueue(
        m.customers,
        dt,
        m.cfg.custQueueX,
        m.cfg.custQueueZ0,
        1.35,
        -Math.PI * 0.5,
        1.4,
        m.cfg.custQueueZ0 + 6.8
      );
    }

    // 3. 3호기 VIP Royal Trade Wagon
    updateWagon(dt);

    // 4. Rapid Magnet Cash Vacuum across ALL 4 Green Cash Pedestals (0.025s interval)
    if (runtime.gemVacuumCooldown > 0) runtime.gemVacuumCooldown -= dt;
    let activePed = null;
    for (let i = 0; i < runtime.pedestals.length; i++) {
      const ped = runtime.pedestals[i];
      if (i > 0 && runtime.machines[i - 1] && runtime.machines[i - 1].lv <= 0) continue;
      if (ped.cashValues.length === 0) continue;
      if (Math.hypot(player.x - ped.x, player.z - ped.z) < 2.8) {
        activePed = ped;
        break;
      }
    }

    if (activePed) {
      if (runtime.gemVacuumCooldown <= 0) {
        runtime.gemVacuumCooldown = 0.025;
        const val = activePed.cashValues.pop();
        syncCashPedestalVisuals(activePed);
        runtime.gemCombo = Math.min(20, runtime.gemCombo + 1);
        playGemChime(runtime.gemCombo);

        if (runtime.gemCombo % 2 === 1 || activePed.cashValues.length === 0) {
          spawnFloatingText(player.x, 2.2, player.z, `+💵 ${val}`, "#5effa0");
        }

        const Engine = window.Engine;
        if (Engine && Engine.vfxGroup && window.Entities) {
          const mesh = window.Entities.createItemBlock("cash_bundle");
          mesh.position.set(activePed.x, 1.0, activePed.z);
          Engine.vfxGroup.add(mesh);
          runtime.flyingBricks.push({
            mesh,
            sx: activePed.x,
            sy: 1.0,
            sz: activePed.z,
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
    const m1 = runtime.machines[0];
    const m2 = runtime.machines[1];
    const m3 = runtime.machines[2];

    for (const f of runtime.fairies) {
      if (f.workTimer > 0) f.workTimer -= dt;

      // Smart role: even fairies gather blue_ore; odd fairies gather rainbow_herb once 2호기 unlocked
      const wantHerb = f.idx % 2 === 1 && state.herbGroveUnlocked;
      const wantedType = wantHerb ? "rainbow_herb" : "blue_ore";

      let tx = f.x;
      let tz = f.z;
      if (f.state === "seek_node") {
        if (
          !f.targetNode ||
          f.targetNode.respawnTimer > 0 ||
          !isZoneUnlocked(f.targetNode.zone) ||
          f.targetNode.itemType !== wantedType
        ) {
          let candidates = runtime.farmNodes.filter(
            (n) => isZoneUnlocked(n.zone) && n.respawnTimer <= 0 && n.itemType === wantedType
          );
          if (candidates.length === 0) {
            candidates = runtime.farmNodes.filter((n) => isZoneUnlocked(n.zone) && n.respawnTimer <= 0);
          }
          if (candidates.length > 0) {
            f.targetNode = candidates[(f.idx * 7 + Math.floor(runtime.time * 3)) % candidates.length];
          }
        }
        if (f.targetNode) {
          tx = f.targetNode.x;
          tz = f.targetNode.z;
          if (Math.hypot(tx - f.x, tz - f.z) < 1.25 && f.workTimer <= 0) {
            f.workTimer = 0.42;
            harvestNode(f.targetNode, 1, f.bag, f.x, f.z, false);
            if (f.bag.length >= cap) {
              f.state = "deliver";
            }
          }
        }
      } else {
        // Smart Routing by resource type in fairy bag!
        const hasHerb = f.bag.includes("rainbow_herb");
        let destPos = SELL_PALLET_POS;
        let destQueue = runtime.sellPalletQueue;
        let maxQ = 36;
        let deliverType = "blue_ore";

        if (hasHerb) {
          deliverType = "rainbow_herb";
          if (m3 && m3.lv > 0 && m3.inQueueB.length < 18 && (!m2 || m3.inQueueB.length <= m2.inQueue.length)) {
            destPos = m3.cfg.inPosB;
            destQueue = m3.inQueueB;
            maxQ = 24;
          } else if (m2 && m2.lv > 0 && m2.inQueue.length < 24) {
            destPos = m2.cfg.inPos;
            destQueue = m2.inQueue;
            maxQ = 24;
          } else if (m3 && m3.lv > 0 && m3.inQueueB.length < 24) {
            destPos = m3.cfg.inPosB;
            destQueue = m3.inQueueB;
            maxQ = 24;
          }
        } else {
          deliverType = "blue_ore";
          if (m3 && m3.lv > 0 && m3.inQueue.length < 18 && (!m1 || m3.inQueue.length <= m1.inQueue.length)) {
            destPos = m3.cfg.inPos;
            destQueue = m3.inQueue;
            maxQ = 24;
          } else if (m1 && m1.lv > 0 && m1.inQueue.length < 24) {
            destPos = m1.cfg.inPos;
            destQueue = m1.inQueue;
            maxQ = 24;
          }
        }

        tx = destPos.x;
        tz = destPos.z;
        if (Math.hypot(tx - f.x, tz - f.z) < 1.45) {
          for (let bi = f.bag.length - 1; bi >= 0 && destQueue.length < maxQ; bi--) {
            if (f.bag[bi] === deliverType || (!hasHerb && f.bag[bi] === "blue_ore")) {
              destQueue.push(f.bag.splice(bi, 1)[0]);
            }
          }
          // Discard leftover unmatched item into starter stall queue if full or switch
          if (f.bag.length === 0) {
            f.state = "seek_node";
          } else if (!hasHerb && destPos === SELL_PALLET_POS) {
            f.bag.length = 0;
            f.state = "seek_node";
          }
        }
      }

      const dx = tx - f.x;
      const dz = tz - f.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.15) {
        const spd = 6.4 + state.speedLv * 0.4;
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
      const waypoints = state.herbGroveUnlocked
        ? [
            { x: 24.0, z: -6.2 },
            { x: 32.0, z: -6.2 },
            { x: 32.0, z: 6.2 },
            { x: 24.0, z: 6.2 },
          ]
        : [
            { x: 24.0, z: -7.5 },
            { x: 32.0, z: -7.5 },
            { x: 32.0, z: -4.5 },
            { x: 24.0, z: -4.5 },
          ];
      const wp = waypoints[tr.waypointIdx % waypoints.length];
      tx = wp.x;
      tz = wp.z;
      if (Math.hypot(tx - tr.x, tz - tr.z) < 1.2) {
        tr.waypointIdx = (tr.waypointIdx + 1) % waypoints.length;
      }
      for (const node of runtime.farmNodes) {
        if (!isZoneUnlocked(node.zone) || node.respawnTimer > 0) continue;
        if (tr.bag.length >= maxCargo) break;
        if (Math.hypot(node.x - tr.x, node.z - tr.z) < 3.2) {
          harvestNode(node, 1, tr.bag, tr.x, tr.z, false);
        }
      }
      if (tr.bag.length >= maxCargo) tr.state = "return";
    } else if (tr.state === "return") {
      if (tr.x > 16.0) {
        tx = 15.0;
        tz = 0;
      } else {
        tx = 0.0;
        tz = -4.5;
        if (Math.hypot(tx - tr.x, tz - tr.z) < 2.2) {
          const m1 = runtime.machines[0];
          const m2 = runtime.machines[1];
          const m3 = runtime.machines[2];
          while (tr.bag.length > 0) {
            const item = tr.bag.pop();
            if (item === "rainbow_herb") {
              if (m3 && m3.lv > 0 && m3.inQueueB.length < 24 && (!m2 || m3.inQueueB.length <= m2.inQueue.length)) {
                m3.inQueueB.push(item);
              } else if (m2 && m2.lv > 0 && m2.inQueue.length < 24) {
                m2.inQueue.push(item);
              }
            } else {
              if (m3 && m3.lv > 0 && m3.inQueue.length < 24 && (!m1 || m3.inQueue.length <= m1.inQueue.length)) {
                m3.inQueue.push(item);
              } else if (m1 && m1.lv > 0 && m1.inQueue.length < 24) {
                m1.inQueue.push(item);
              } else if (runtime.sellPalletQueue.length < 36) {
                runtime.sellPalletQueue.push(item);
              }
            }
          }
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
        price: isMax ? "MAX" : `💵 ${newRemaining}`,
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

  function updateGuideArrow() {
    const hero = sceneObjs.hero;
    if (!hero || !hero.guideArrowGroup) return;

    const bagCap = getHeroBagCap();
    const hasOre = player.bagItems.includes("blue_ore");
    const hasHerb = player.bagItems.includes("rainbow_herb");
    const m1 = runtime.machines[0];
    const m2 = runtime.machines[1];
    const m3 = runtime.machines[2];

    // Check nearest Cash Pedestal with uncollected cash stacks
    let nearestCashPed = null;
    let nearestCashDist = Infinity;
    for (let i = 0; i < runtime.pedestals.length; i++) {
      const p = runtime.pedestals[i];
      if (i > 0 && runtime.machines[i - 1] && runtime.machines[i - 1].lv <= 0) continue;
      if (p.cashValues.length > 0) {
        const d = Math.hypot(p.x - player.x, p.z - player.z);
        if (d < nearestCashDist) {
          nearestCashDist = d;
          nearestCashPed = p;
        }
      }
    }

    let tx = 23.0;
    let tz = -6.2;
    let stepLabel = "1단계 채집";
    let guideText = "👉 오른쪽 동쪽 광산으로 가서 푸른 광석을 캐세요!";
    let colorHex = 0xffe629;

    if (nearestCashPed) {
      tx = nearestCashPed.x;
      tz = nearestCashPed.z;
      stepLabel = "💵 수금";
      guideText = "💵 초록 캐시 수금대로 가서 지폐 다발을 흡수하세요!";
      colorHex = 0x2ecc71;
    } else if (state.m1Lv === 0 && state.gems >= getUpgradeCost("m1") && !hasOre) {
      tx = MACHINE_CONFIGS[0].padPos.x;
      tz = MACHINE_CONFIGS[0].padPos.z;
      stepLabel = "1호기 해금";
      guideText = "⚙️ [1호기 세공기]를 지어 광석을 💵 35 세공 보석으로 자동 판매하세요!";
      colorHex = 0xd67aff;
    } else if (state.m2Lv === 0 && state.gems >= getUpgradeCost("m2") && !hasHerb) {
      tx = MACHINE_CONFIGS[1].padPos.x;
      tz = MACHINE_CONFIGS[1].padPos.z;
      stepLabel = "2호기 해금";
      guideText = "🌿 [2호기 가마솥]을 지어 남동쪽 '무지개 약초 숲' & 💵 80 포션을 여세요!";
      colorHex = 0x52ff9b;
    } else if (state.m3Lv === 0 && state.gems >= getUpgradeCost("m3")) {
      tx = MACHINE_CONFIGS[2].padPos.x;
      tz = MACHINE_CONFIGS[2].padPos.z;
      stepLabel = "3호기 해금";
      guideText = "👑 [3호기 합체소]를 지어 VIP 무역 마차 💵 300 잭팟 판매를 여세요!";
      colorHex = 0xff9f43;
    } else if (
      player.bagItems.length >= bagCap ||
      ((hasOre || hasHerb) && player.bagItems.length >= (state.totalEarnedGems < 60 ? 3 : 5))
    ) {
      if (hasHerb && m3 && m3.lv > 0 && m3.inQueueB.length < 18 && (!m2 || m3.inQueueB.length <= m2.inQueue.length)) {
        tx = m3.cfg.inPosB.x;
        tz = m3.cfg.inPosB.z;
        stepLabel = "3호기 약초 투입";
        guideText = "🌿 3호기 합체소 [약초 IN] 팔레트에 무지개 약초를 넣으세요!";
        colorHex = 0xff9f43;
      } else if (hasHerb && m2 && m2.lv > 0) {
        tx = m2.cfg.inPos.x;
        tz = m2.cfg.inPos.z;
        stepLabel = "2호기 약초 투입";
        guideText = "⚗️ 2호기 가마솥 [약초 IN]에 약초를 넣으면 포션(💵 80)이 자동 판매됩니다!";
        colorHex = 0x52ff9b;
      } else if (hasOre && m3 && m3.lv > 0 && m3.inQueue.length < 18 && (!m1 || m3.inQueue.length <= m1.inQueue.length)) {
        tx = m3.cfg.inPos.x;
        tz = m3.cfg.inPos.z;
        stepLabel = "3호기 광석 투입";
        guideText = "⛏️ 3호기 합체소 [광석 IN] 팔레트에 푸른 광석을 넣으세요!";
        colorHex = 0xff9f43;
      } else if (hasOre && m1 && m1.lv > 0) {
        tx = m1.cfg.inPos.x;
        tz = m1.cfg.inPos.z;
        stepLabel = "1호기 광석 투입";
        guideText = "⚙️ 1호기 세공기 [광석 IN]에 넣으면 세공 보석(💵 35)이 쇼케이스에 자동 진열됩니다!";
        colorHex = 0xd67aff;
      } else {
        tx = SELL_PALLET_POS.x;
        tz = SELL_PALLET_POS.z;
        stepLabel = "원석 판매";
        guideText = "💵 원석 직판 가판대에 푸른 광석을 올려 💵 10에 판매하세요!";
        colorHex = 0x58b8ff;
      }
    } else if (state.fairyCount === 0 && state.gems >= getUpgradeCost("fairy")) {
      tx = -3.8;
      tz = 12.2;
      stepLabel = "일꾼 고용";
      guideText = "🧚 [요정 일꾼] 카드를 밟아 자동 광석·약초 분업을 시작하세요!";
      colorHex = 0xff88c2;
    } else {
      // Nearest needed active resource node
      const needHerbNode =
        state.herbGroveUnlocked &&
        m2 &&
        m2.lv > 0 &&
        (!m1 || m2.inQueue.length < m1.inQueue.length || (m3 && m3.lv > 0 && m3.inQueueB.length < m3.inQueue.length));
      let bestDist = Infinity;
      for (const n of runtime.farmNodes) {
        if (!isZoneUnlocked(n.zone) || n.respawnTimer > 0) continue;
        if (needHerbNode && n.itemType !== "rainbow_herb") continue;
        const d = Math.hypot(n.x - player.x, n.z - player.z);
        if (d < bestDist) {
          bestDist = d;
          tx = n.x;
          tz = n.z;
          if (n.itemType === "rainbow_herb") {
            stepLabel = "약초 채집";
            guideText = "🌿 남동쪽 무지개 약초 숲에서 약초를 채집하세요!";
            colorHex = 0x52ff9b;
          } else {
            stepLabel = "광석 채집";
            guideText = "⛏️ 동쪽 광산에서 푸른 광석을 캐세요!";
            colorHex = 0xffe629;
          }
        }
      }
      if (bestDist === Infinity) {
        for (const n of runtime.farmNodes) {
          if (!isZoneUnlocked(n.zone) || n.respawnTimer > 0) continue;
          const d = Math.hypot(n.x - player.x, n.z - player.z);
          if (d < bestDist) {
            bestDist = d;
            tx = n.x;
            tz = n.z;
          }
        }
      }
    }

    const dx = tx - player.x;
    const dz = tz - player.z;
    const distToTarget = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);

    hero.guideArrowGroup.visible = distToTarget > 1.6;
    hero.guideArrowGroup.rotation.y = ang - player.rotY;
    hero.guideArrowGroup.scale.set(1, 1, 1);

    if (hero.guideArrowGroup.userData && hero.guideArrowGroup.userData.arrowMesh) {
      hero.guideArrowGroup.userData.arrowMesh.position.z = 1.80 + Math.sin(runtime.time * 6.0) * 0.22;
    }
    if (hero.guideArrowMat && hero.guideArrowMat.color) {
      hero.guideArrowMat.color.setHex(colorHex);
      if (hero.guideArrowMat.emissive) hero.guideArrowMat.emissive.setHex(colorHex);
    }

    if (typeof document !== "undefined") {
      const stepEl = document.getElementById("ui-guide-step");
      const textEl = document.getElementById("ui-guide-text");
      const distEl = document.getElementById("ui-guide-dist");
      if (stepEl && stepEl.textContent !== stepLabel) stepEl.textContent = stepLabel;
      if (textEl && textEl.textContent !== guideText) textEl.textContent = guideText;
      const distStr = `${Math.max(0, Math.round(distToTarget))}m`;
      if (distEl && distEl.textContent !== distStr) distEl.textContent = distStr;
    }
  }

  // ---------------------------------------------------------------------------
  // HUD, Over-Head Real-Time 3D-Tracked Backpack Float (#hero-bag-float) & Shop UI
  // ---------------------------------------------------------------------------
  function updateHeroBagOverlay() {
    if (typeof document === "undefined") return;
    const floatEl = document.getElementById("hero-bag-float");
    if (!floatEl) return;

    const total = player.bagItems.length;
    if (total <= 0) {
      floatEl.style.display = "none";
      return;
    }

    const cap = getHeroBagCap();
    const isMax = total >= cap;
    let oreCount = 0;
    let herbCount = 0;
    for (const t of player.bagItems) {
      if (t === "blue_ore") oreCount++;
      else if (t === "rainbow_herb") herbCount++;
    }

    let countsStr = "";
    if (oreCount > 0 && herbCount > 0) {
      countsStr = `⛏️ 광석 ${oreCount} | 🌿 약초 ${herbCount}`;
    } else if (oreCount > 0) {
      countsStr = `⛏️ 광석 ${oreCount}`;
    } else if (herbCount > 0) {
      countsStr = `🌿 약초 ${herbCount}`;
    } else {
      countsStr = `📦 ${total}`;
    }

    const countsEl = document.getElementById("hbf-counts");
    const capEl = document.getElementById("hbf-cap");
    const fillEl = document.getElementById("hbf-bar-fill");
    const maxBadge = document.getElementById("hbf-max-badge");
    if (countsEl && countsEl.textContent !== countsStr) countsEl.textContent = countsStr;
    const capText = `${total} / ${cap}`;
    if (capEl && capEl.textContent !== capText) capEl.textContent = capText;
    if (fillEl) fillEl.style.width = `${Math.min(100, (total / cap) * 100)}%`;
    if (maxBadge) maxBadge.style.display = isMax ? "block" : "none";
    floatEl.classList.toggle("is-max", isMax);

    if (window.Engine && window.Engine.worldToScreen) {
      const stackH = Math.min(total, 16) * 0.205;
      const sp = window.Engine.worldToScreen(new THREE.Vector3(player.x, 2.35 + stackH, player.z));
      const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
      const vh = typeof window !== "undefined" ? window.innerHeight : 720;
      const cx = Math.max(85, Math.min(vw - 85, sp.x));
      const cy = Math.max(92, Math.min(vh - 50, sp.y));
      floatEl.style.left = `${Math.round(cx)}px`;
      floatEl.style.top = `${Math.round(cy)}px`;
      floatEl.style.display = "block";
    }
  }

  function syncHUD(force = false) {
    if (typeof document === "undefined") return;
    // Always project #hero-bag-float at display framerate for silky 3D tracking
    updateHeroBagOverlay();

    if (!force && runtime.time - runtime.lastHudSync < 0.08) return;
    runtime.lastHudSync = runtime.time;

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
            <div class="shop-item-title">⛏️ 1단계 · 원석 직판 & 1호기 크리스탈 세공기 (광석)</div>
            <div class="shop-item-desc">동쪽 광산에서 푸른 광석을 캐 원석 가판대(💵 10)로 첫 자금을 모으세요. 1호기를 지으면 광석을 넣기만 해도 회전 톱날이 세공 보석(💵 35)을 깎아 쇼케이스에 자동 진열하고 VIP가 사 갑니다!</div>
          </div>
        </div>
        <div class="shop-item">
          <div class="shop-item-info">
            <div class="shop-item-title">🌿 2단계 · 2호기 가마솥 & 무지개 약초 숲 (약초)</div>
            <div class="shop-item-desc">2호기 가마솥을 지으면 남동쪽 '무지개 약초 숲'이 해금됩니다! 약초만 넣으면 마법사 손님이 사 가는 💵 80 포션 가판대로 자동 공급됩니다.</div>
          </div>
        </div>
        <div class="shop-item">
          <div class="shop-item-info">
            <div class="shop-item-title">👑 3단계 · 황실 연금 합체소 & VIP 무역 마차 (💵 300 잭팟)</div>
            <div class="shop-item-desc">광석과 약초를 동시에 투입해 황실 엘릭서 상자를 만드세요! VIP 무역 마차가 도착해 상자를 싣고 💵 300 지폐 기둥을 쏟아냅니다.</div>
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
          ${isMax ? "MAX" : `💵 ${cost}`}
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
    for (const p of runtime.pedestals) {
      p.cashValues.length = 0;
      syncCashPedestalVisuals(p);
    }
    for (const f of runtime.flyingBricks) {
      if (window.Engine && window.Engine.vfxGroup && f.mesh) window.Engine.vfxGroup.remove(f.mesh);
    }
    runtime.flyingBricks.length = 0;
    for (const p of runtime.particles) {
      if (window.Engine && window.Engine.vfxGroup && p.mesh) window.Engine.vfxGroup.remove(p.mesh);
    }
    runtime.particles.length = 0;
    for (const pop of runtime.popups) {
      if (pop.el && pop.el.parentNode) pop.el.parentNode.removeChild(pop.el);
    }
    runtime.popups.length = 0;
    for (const m of runtime.machines) {
      m.lv = 0;
      m.inQueue.length = 0;
      m.inQueueB.length = 0;
      m.outQueue.length = 0;
      m.craftProgress = 0;
    }
    for (const node of runtime.farmNodes) {
      node.respawnTimer = 0;
      node.hp = node.maxHp;
    }
    refreshFarmZoneVisibility();
    refreshFacilityVisibility();
    syncFairiesCount();
    ensureTruckSpawned();
    ensureWagonSpawned();
    if (sceneObjs.hero) {
      window.Entities.updateHeroTier(sceneObjs.hero, 0);
      syncCrateStackVisuals(sceneObjs.hero.backStackAnchor, player.bagItems, runtime.heroBackVisuals);
    }
    updateStepPads(0.016);
    updateGuideArrow();
    syncHUD(true);
    showToast("💵 새로운 연금술 타이쿤 공방이 시작되었습니다!");
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
    updateCustomersAndCashPedestals(stepDt);
    updateFairies(stepDt);
    updateHarvesterTruck(stepDt);
    updateStepPads(stepDt);
    updateVFX(stepDt);
    updateGuideArrow();

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
        // Proceed cleanly with procedural toon fallbacks
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
    buildMarketAndQueue();
    buildProductionMachines();
    buildStepPads();
    syncFairiesCount();
    ensureTruckSpawned();
    ensureWagonSpawned();
    updateStepPads(0.016);
    updateGuideArrow();
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
    purchaseUpgradeDirect,
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
