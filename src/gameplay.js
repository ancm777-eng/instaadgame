// =============================================================================
// src/gameplay.js - Fairy Alchemy Atelier v2.1
// Guides 01~04 Implementation: 5 Resources, 4 Buildings + 4x 1-Tile Storages,
// Monggle Energy Lab (Lv.1~5), 4 Fairies, 5-Tier Wall + Repair,
// 25-Stage / 5-Phase Defense, and 6-Stage Skill Evolution + 3D VFX
// =============================================================================

(function () {
  "use strict";

  const SAVE_KEY = "fairy_alchemy_atelier_v2_1";

  // Timing Constants (Guide 03)
  const TOTAL_STAGES = 25;
  const FIRST_STAGE_DELAY = 300; // 5 minutes
  const STAGE_BREAK_INTERVAL = 90; // 1.5 minutes
  const STAGE_BATTLE_DURATION = 60; // 1 minute
  const SPAWN_TICK_INTERVAL = 10; // every 10 seconds
  const NORMAL_SPAWN_COUNT = 5;

  const HERO_SPAWN = { x: 0.0, z: 4.5 };
  const GATE_POS = { x: 18.0, z: 0.0 };
  const HERO_COMBAT_X_MIN = 5.0;

  // Guide 01: Physical Items (5 types)
  const ITEM_META = {
    ore: { id: "ore", label: "광석", icon: "⛏️", sellValue: 10, canDirectSell: true, color: 0x3b82f6 },
    stardust: { id: "stardust", label: "별가루", icon: "✨", sellValue: 0, canDirectSell: false, color: 0xd8b4fe },
    gold: { id: "gold", label: "금", icon: "🪙", sellValue: 200, canDirectSell: true, color: 0xf5b942 },
    star_crystal: { id: "star_crystal", label: "별빛 결정", icon: "💠", sellValue: 0, canDirectSell: false, color: 0x38bdf8 },
    philosopher_stone: { id: "philosopher_stone", label: "현자의 돌", icon: "💎", sellValue: 5000, canDirectSell: true, color: 0xf43f5e },
  };

  const ENERGY_META = {
    1: { key: "dim1", icon: "🔮", name: "1차 차원 에너지", accent: "#c084fc", hex: 0xc084fc },
    2: { key: "dim2", icon: "💠", name: "2차 차원 에너지", accent: "#38bdf8", hex: 0x38bdf8 },
    3: { key: "dim3", icon: "🌟", name: "3차 차원 에너지", accent: "#facc15", hex: 0xfacc15 },
  };

  // Guide 02: 4 Buildings + 4x 1-Tile Storages + Monggle Energy Lab
  const BUILDING_POS = {
    ore_market: { x: -11.8, z: -3.8 },
    storage_ore: { x: -7.8, z: -3.8 },
    gold_kiln: { x: -3.8, z: -3.8 },
    storage_gold: { x: 0.2, z: -3.8 },
    star_crystal_workshop: { x: 4.2, z: -3.8 },
    storage_star_crystal: { x: 7.8, z: -3.8 },
    star_gold_mixer: { x: 11.8, z: -3.8 },
    storage_stardust: { x: 4.2, z: 0.2 },
    energy_lab: { x: 0.0, z: -12.6 },
  };

  const LAB_LEVELS = [
    null,
    { lv: 1, cost: 500, reqSkillStage: 1, reqSkillLv: 1, inputType: "stardust", inputAmt: 10, out: { 1: 10 }, desc: "별가루 10 → 🔮 1차 10 (18초)" },
    { lv: 2, cost: 2000, reqSkillStage: 1, reqSkillLv: 1, inputType: "stardust", inputAmt: 10, out: { 1: 20 }, desc: "별가루 10 → 🔮 1차 20 (18초)" },
    { lv: 3, cost: 8000, reqSkillStage: 2, reqSkillLv: 3, inputType: "stardust", inputAmt: 20, out: { 2: 10 }, desc: "별가루 20 → 💠 2차 10 (18초) · 스킬 2단계 Lv.3 필요" },
    { lv: 4, cost: 32000, reqSkillStage: 2, reqSkillLv: 3, inputType: "stardust", inputAmt: 20, out: { 2: 20 }, desc: "별가루 20 → 💠 2차 20 (18초)" },
    { lv: 5, cost: 128000, reqSkillStage: 4, reqSkillLv: 3, inputType: "star_crystal", inputAmt: 5, out: { 3: 10 }, desc: "별빛 결정 5 → 🌟 3차 10 (18초) · 스킬 4단계 Lv.3 필요" },
  ];

  const FAIRY_DEFS = [
    { idx: 0, role: "ore", storage: "storage_ore", tier: 1, cost: 50, speed: 5.2, carryCap: 5, yieldPerHit: 1, title: "1번째 요정 (광석)", desc: "광석을 채집해 광석 창고로 운반" },
    { idx: 1, role: "stardust", storage: "storage_stardust", tier: 1, cost: 100, speed: 5.2, carryCap: 5, yieldPerHit: 1, title: "2번째 요정 (별가루)", desc: "별가루를 채집해 별가루 창고로 운반" },
    { idx: 2, role: "ore", storage: "storage_ore", tier: 2, cost: 50, speed: 10.4, carryCap: 10, yieldPerHit: 2, title: "3번째 고급 요정 (광석 ×2)", desc: "이속·채집량 2배! 광석 창고 전담" },
    { idx: 3, role: "stardust", storage: "storage_stardust", tier: 2, cost: 150, speed: 10.4, carryCap: 10, yieldPerHit: 2, title: "4번째 고급 요정 (별가루 ×2)", desc: "이속·채집량 2배! 별가루 창고 전담" },
  ];

  const WALL_HP_BY_TIER = [0, 1000, 2000, 3000, 4000, 5000];
  const BAG_CAPS = [15, 30, 50];
  const BAG_UPGRADE_COSTS = [500, 1000];

  // Guide 04: 6-Stage Skill Evolution Tree
  const SKILL_EVOLUTIONS = [
    null,
    {
      stage: 1, name: "기초 원소 조합", element: "4원소 (불·물·바람·땅)", icon: "🔥",
      vfxDesc: "발밑 작은 마법진 + 4색 원소 방울이 톡톡 튀며 합체",
      maxLv: 3, cooldown: 0.90, radius: 1.8, damages: [0, 18, 28, 42],
      costs: [null, { tier: 0, amt: 0 }, { tier: 1, amt: 50 }, { tier: 1, amt: 100 }],
    },
    {
      stage: 2, name: "다중 원소 증폭", element: "4원소 + 별가루", icon: "✨",
      vfxDesc: "원소 방울 회오리 공전 + 은은한 별빛 가루 + 지팡이 끝 발광",
      maxLv: 3, cooldown: 0.85, radius: 3.2, damages: [0, 95, 140, 210],
      costs: [null, { tier: 1, amt: 100 }, { tier: 1, amt: 100 }, { tier: 1, amt: 200 }],
    },
    {
      stage: 3, name: "황금 연성술", element: "원소 융합 + 황금", icon: "⚙️",
      vfxDesc: "넓은 황금 연성진 + 금빛 파동과 톱니바퀴 잔상 확산",
      maxLv: 3, cooldown: 0.80, radius: 4.8, damages: [0, 420, 620, 920],
      costs: [null, { tier: 2, amt: 50 }, { tier: 2, amt: 50 }, { tier: 2, amt: 100 }],
    },
    {
      stage: 4, name: "현자의 연성술", element: "현자의 돌 개방", icon: "💎",
      vfxDesc: "머리 위 붉은 현자의 돌 환영 + 무지갯빛 빛줄기 폭격",
      maxLv: 3, cooldown: 0.75, radius: 6.2, damages: [0, 1800, 2700, 4000],
      costs: [null, { tier: 2, amt: 100 }, { tier: 2, amt: 100 }, { tier: 2, amt: 200 }],
    },
    {
      stage: 5, name: "차원 초월 연성", element: "모든 원소 + 차원 에너지", icon: "🌌",
      vfxDesc: "하늘 차원의 문 개방 + 별빛·황금·원소 융합 거대 빛기둥",
      maxLv: 3, cooldown: 0.70, radius: 8.0, damages: [0, 7500, 11500, 17000],
      costs: [null, { tier: 3, amt: 50 }, { tier: 3, amt: 50 }, { tier: 3, amt: 100 }],
    },
    {
      stage: 6, name: "창세 연성술", element: "차원 에너지 + 창조의 빛", icon: "🌠",
      vfxDesc: "은하수 빛 전장 + 거대 입체 마법진 + 작은 우주 탄생 폭발",
      maxLv: 1, cooldown: 0.65, radius: 18.0, damages: [0, 65000],
      costs: [null, { tier: 3, amt: 200 }],
    },
  ];

  // Guide 03: 5-Phase Monster Roster (20 normal + 5 bosses)
  const PHASE_THEMES = {
    1: { name: "숲속 동물", species: "forest", monsters: [
      { name: "숲 다람쥐", hp: 40, spd: 4.2, atk: 3, cash: 12, scale: 0.85 },
      { name: "가시 고슴도치", hp: 75, spd: 3.6, atk: 4, cash: 16, scale: 0.95 },
      { name: "뿔 사슴 전사", hp: 85, spd: 4.0, atk: 5, cash: 22, scale: 1.05 },
      { name: "회색 늑대 우두머리", hp: 140, spd: 4.5, atk: 6, cash: 30, scale: 1.15 },
    ], boss: { name: "고대 숲의 곰왕", hp: 3500, spd: 2.1, atk: 15, cash: 400, scale: 2.3 } },
    2: { name: "오크", species: "orc", monsters: [
      { name: "오크 정찰병", hp: 320, spd: 3.9, atk: 8, cash: 40, scale: 0.92 },
      { name: "오크 도끼병", hp: 500, spd: 3.5, atk: 10, cash: 55, scale: 1.02 },
      { name: "오크 주술사", hp: 720, spd: 3.3, atk: 12, cash: 70, scale: 1.0, ranged: true },
      { name: "강철 오크 광전사", hp: 1100, spd: 3.8, atk: 14, cash: 95, scale: 1.18 },
    ], boss: { name: "대족장 오크 워로드", hp: 18000, spd: 2.2, atk: 30, cash: 1500, scale: 2.45 } },
    3: { name: "좀비", species: "zombie", monsters: [
      { name: "묘지 좀비", hp: 1600, spd: 3.0, atk: 15, cash: 130, scale: 0.94 },
      { name: "독안개 구울", hp: 2400, spd: 4.2, atk: 18, cash: 170, scale: 1.0 },
      { name: "해골 저주술사", hp: 3400, spd: 3.2, atk: 21, cash: 220, scale: 1.02, ranged: true },
      { name: "중갑 좀비 기사", hp: 5000, spd: 3.1, atk: 25, cash: 300, scale: 1.16 },
    ], boss: { name: "네크로 타이탄", hp: 85000, spd: 2.0, atk: 55, cash: 4500, scale: 2.6 } },
    4: { name: "뱀파이어", species: "vampire", monsters: [
      { name: "핏빛 박쥐 사역마", hp: 7500, spd: 4.8, atk: 25, cash: 150, scale: 0.9 },
      { name: "뱀파이어 시종", hp: 11500, spd: 4.2, atk: 30, cash: 200, scale: 1.0 },
      { name: "혈마법사 귀족", hp: 16500, spd: 3.8, atk: 35, cash: 260, scale: 1.04, ranged: true },
      { name: "진홍의 백작 기사", hp: 24000, spd: 4.3, atk: 40, cash: 340, scale: 1.15 },
    ], boss: { name: "진조 블러드 로드", hp: 380000, spd: 2.4, atk: 90, cash: 4000, scale: 2.75 } },
    5: { name: "악마", species: "demon", monsters: [
      { name: "심연 임프", hp: 36000, spd: 4.7, atk: 40, cash: 420, scale: 0.95 },
      { name: "지옥 화염견", hp: 54000, spd: 5.0, atk: 48, cash: 500, scale: 1.05 },
      { name: "타락 대악마 마도사", hp: 78000, spd: 3.9, atk: 56, cash: 600, scale: 1.08, ranged: true },
      { name: "지옥 군단장", hp: 115000, spd: 4.1, atk: 65, cash: 700, scale: 1.2 },
    ], boss: { name: "심연의 대마왕", hp: 1800000, spd: 2.2, atk: 150, cash: 15000, scale: 3.0 } },
  };

  let state = createDefaultState();

  function createDefaultState() {
    return {
      gems: 50,
      dim1: 0,
      dim2: 0,
      dim3: 0,
      bagLv: 0,
      goldKilnBuilt: false,
      starWorkshopBuilt: false,
      mixerBuilt: false,
      labLv: 0,
      fairyCount: 0,
      wallLv: 1,
      gateHp: 1000,
      skillStage: 1,
      skillLv: 1,
      stage: 1,
      allCleared: false,
      muted: false,
      tutStep: 1,
      tutSoldOre: false,
      storages: {
        storage_ore: [],
        storage_gold: [],
        storage_stardust: [],
        storage_star_crystal: [],
      },
      labStored: { 1: 0, 2: 0, 3: 0 },
    };
  }

  const player = {
    x: HERO_SPAWN.x,
    z: HERO_SPAWN.z,
    vx: 0,
    vz: 0,
    rotY: 0,
    swingTimer: 0,
    swingDuration: 0.14,
    bagItems: [],
    harvestCooldown: 0,
    transferCooldown: 0,
  };

  const input = { keys: new Set(), joyX: 0, joyY: 0, joyActive: false, joyId: null, originX: 0, originY: 0 };

  const runtime = {
    time: 0,
    farmNodes: [],
    storages: {},
    buildings: {},
    labTiles: {},
    labInputQueue: [],
    labInputVisuals: [],
    labProgress: 0,
    fairies: [],
    stepPads: [],
    monsters: [],
    projectiles: [],
    fxMeshes: [],
    flyingBricks: [],
    heroBackVisuals: [],
    popAnims: [],
    dustTimer: 0,
    skillCooldown: 0,
    stageActive: false,
    stageTimer: FIRST_STAGE_DELAY,
    battleElapsed: 0,
    spawnTickTimer: 0,
    gameOver: false,
    shopOpen: false,
    shopTab: "workshop",
    toastTimer: 0,
    missingResTimer: 0,
    missingResCd: 0,
    tutPopupTimer: 0,
    lastShownTutStep: 0,
    tutorialRing: null,
    lastHudSync: 0,
    philosopherHalo: null,
    sageAuraRing: null,
    genesisTimer: 0,
  };

  const sceneObjs = { hero: null, gate: null };
  let _initialized = false;
  let _domBound = false;
  let _rafId = null;
  let _lastRafTs = 0;

  // ---------------------------------------------------------------------------
  // Audio Helper
  // ---------------------------------------------------------------------------
  let _audioCtx = null;
  function playTone(freq, dur = 0.08, type = "sine", gainVal = 0.10) {
    if (state.muted || typeof window === "undefined") return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!_audioCtx) _audioCtx = new AC();
      if (_audioCtx.state === "suspended") _audioCtx.resume();
      const now = _audioCtx.currentTime;
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(Math.max(0.001, gainVal * 2.0), now);
      gain.gain.exponentialRampToValueAtTime(0.0004, now + dur);
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (e) {}
  }

  function showToast(msg) {
    runtime.toastTimer = 2.6;
    const el = document.getElementById("toast-banner");
    if (el) {
      el.textContent = msg;
      el.classList.add("show");
    }
  }

  const RESOURCE_SOURCES = {
    ore: "남서쪽 광석 광산 또는 ⛏️ 광석 창고",
    stardust: "남동쪽 별빛 채집지 또는 ✨ 별가루 창고",
    gold: "🔥 금 나와라 뚝딱 가마(광석 10) 또는 🪙 금 창고",
    star_crystal: "✨ 별가루 뭉치기 공방(별가루 10) 또는 💠 결정 창고",
  };

  function showMissingResourcePopup(itemType) {
    if (runtime.missingResCd > 0) return;
    const meta = ITEM_META[itemType];
    const src = RESOURCE_SOURCES[itemType];
    if (!meta || !src) return;
    runtime.missingResCd = 1.6;
    runtime.missingResTimer = 2.2;
    const el = document.getElementById("missing-resource-popup");
    if (!el) return;
    document.getElementById("mrp-ico").textContent = meta.icon;
    document.getElementById("mrp-title").textContent = `${meta.label}이(가) 없습니다!`;
    document.getElementById("mrp-src").textContent = `얻는 곳: ${src}`;
    el.classList.add("show");
  }

  function spawnFloatingText(x, y, z, text, color = "#f7dca1") {
    const overlay = document.getElementById("fx-overlay");
    if (!overlay || !window.Engine) return;
    const pos = window.Engine.worldToScreen({ x, y, z });
    const div = document.createElement("div");
    div.className = "float-txt";
    div.textContent = text;
    div.style.left = `${pos.x}px`;
    div.style.top = `${pos.y}px`;
    div.style.color = color;
    overlay.appendChild(div);
    setTimeout(() => div.remove(), 1050);
  }

  // ---------------------------------------------------------------------------
  // Helpers: Phase, Wall, Bag, Lab, Skill
  // ---------------------------------------------------------------------------
  function getCurrentPhase() {
    return Math.min(5, Math.ceil(state.stage / 5));
  }

  function getWallMaxHp() {
    return WALL_HP_BY_TIER[Math.max(1, Math.min(5, state.wallLv))] || 1000;
  }

  function getHeroBagCap() {
    return BAG_CAPS[Math.max(0, Math.min(2, state.bagLv))] || 15;
  }

  function getRepairCostPer100() {
    return getCurrentPhase() * 100;
  }

  function getFullRepairCost() {
    const missing = Math.max(0, getWallMaxHp() - state.gateHp);
    if (missing <= 0) return 0;
    return Math.max(1, Math.ceil((missing / 100) * getRepairCostPer100()));
  }

  function isSkillAtLeast(reqStage, reqLv) {
    if (state.skillStage > reqStage) return true;
    if (state.skillStage === reqStage && state.skillLv >= reqLv) return true;
    return false;
  }

  function canUpgradeLab() {
    if (state.labLv >= 5) return { ok: false, reason: "MAX" };
    const next = LAB_LEVELS[state.labLv + 1];
    if (!isSkillAtLeast(next.reqSkillStage, next.reqSkillLv)) {
      return { ok: false, reason: `스킬 ${next.reqSkillStage}단계 Lv.${next.reqSkillLv} 필요` };
    }
    if (state.gems < next.cost) return { ok: false, reason: `💵 ${next.cost.toLocaleString()}` };
    return { ok: true, next };
  }

  function getNextSkillUpgradeSpec() {
    const cur = SKILL_EVOLUTIONS[state.skillStage];
    if (!cur) return null;
    if (state.skillLv < cur.maxLv) {
      const nextLv = state.skillLv + 1;
      const cost = cur.costs[nextLv];
      return { action: "levelup", targetStage: state.skillStage, targetLv: nextLv, cost, title: `${cur.stage}단계 Lv.${nextLv} 강화` };
    }
    if (state.skillStage < 6) {
      const nextDef = SKILL_EVOLUTIONS[state.skillStage + 1];
      const cost = nextDef.costs[1];
      return { action: "evolve", targetStage: nextDef.stage, targetLv: 1, cost, title: `${nextDef.stage}단계 [${nextDef.name}] 스킬 진화!` };
    }
    return { action: "max", title: "최종 창세 연성술 완성" };
  }

  function getEnergyAmount(tier) {
    return tier === 1 ? state.dim1 : tier === 2 ? state.dim2 : tier === 3 ? state.dim3 : 0;
  }

  function addEnergyAmount(tier, amt) {
    if (tier === 1) state.dim1 = Math.max(0, state.dim1 + amt);
    else if (tier === 2) state.dim2 = Math.max(0, state.dim2 + amt);
    else if (tier === 3) state.dim3 = Math.max(0, state.dim3 + amt);
  }

  // ---------------------------------------------------------------------------
  // World Setup: Nodes, 1-Tile Storages, 4 Buildings, Lab & 3 Energy Tiles
  // ---------------------------------------------------------------------------
  function buildWorld() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    Engine.populateGlbScenery();

    // Hero
    sceneObjs.hero = Entities.createPlayerHero();
    sceneObjs.hero.root.position.set(player.x, 0, player.z);
    if (sceneObjs.hero.guideArrowGroup) sceneObjs.hero.guideArrowGroup.visible = state.tutStep <= 6;
    Engine.unitGroup.add(sceneObjs.hero.root);

    // Tutorial 3D Target Ring on ground
    const tutRing = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.48, 28),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
    );
    tutRing.rotation.x = -Math.PI * 0.5;
    tutRing.position.y = 0.08;
    tutRing.visible = false;
    Engine.vfxGroup.add(tutRing);
    runtime.tutorialRing = tutRing;

    // East Gate
    sceneObjs.gate = Entities.createVillageGate(GATE_POS.x, GATE_POS.z, "🏰 동쪽 수호 성벽");
    Engine.stationGroup.add(sceneObjs.gate.root);
    Entities.updateVillageGateTier(sceneObjs.gate, Math.min(3, state.wallLv - 1));

    // South Resource Nodes: 18 Ore (SW) & 18 Stardust (SE)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        const ox = -11.4 + c * 1.7;
        const oz = 14.5 + r * 2.2;
        const oreEnt = Entities.createResourceNode("ore", ox, oz);
        Engine.nodeGroup.add(oreEnt.root);
        runtime.farmNodes.push({ kind: "ore", x: ox, z: oz, hp: 2, maxHp: 2, respawnTimer: 0, entity: oreEnt });

        const sx = 2.9 + c * 1.7;
        const sz = 14.5 + r * 2.2;
        const starEnt = Entities.createResourceNode("stardust", sx, sz);
        Engine.nodeGroup.add(starEnt.root);
        runtime.farmNodes.push({ kind: "stardust", x: sx, z: sz, hp: 2, maxHp: 2, respawnTimer: 0, entity: starEnt });
      }
    }

    // 4 x 1-Tile Storages
    const storageSpecs = [
      { id: "storage_ore", itemType: "ore", title: "⛏️ 광석 창고", accent: "#60a5fa" },
      { id: "storage_gold", itemType: "gold", title: "🪙 금 창고", accent: "#f5b942" },
      { id: "storage_star_crystal", itemType: "star_crystal", title: "💠 결정 창고", accent: "#38bdf8" },
      { id: "storage_stardust", itemType: "stardust", title: "✨ 별가루 창고", accent: "#d8b4fe" },
    ];
    for (const sp of storageSpecs) {
      const p = BUILDING_POS[sp.id];
      const stEnt = Entities.createSmallStorage({ x: p.x, z: p.z, title: sp.title, accent: sp.accent });
      Engine.stationGroup.add(stEnt.root);
      runtime.storages[sp.id] = { ...sp, x: p.x, z: p.z, entity: stEnt, visuals: [] };
    }

    // 1) Ore Market + Dedicated Ore Drop-off Pallet + Non-Overlapping Cash Pedestal
    const omPos = BUILDING_POS.ore_market;
    const omEnt = Entities.createSalesStall(omPos.x, omPos.z, "🏛️ 원석 교역소 (10💵)");
    Engine.stationGroup.add(omEnt.root);
    const omPallet = Entities.createWoodenPalletZone({ x: omPos.x, z: omPos.z + 2.3, accent: "#60a5fa", badgeText: "⛏️ 광석 놓는 곳" });
    Engine.stationGroup.add(omPallet.root);
    const omPed = Entities.createGemPedestal(omPos.x - 2.5, omPos.z + 2.3, "💵 교역소 수익");
    Engine.stationGroup.add(omPed.root);
    runtime.buildings.ore_market = { x: omPos.x, z: omPos.z, sellX: omPos.x, sellZ: omPos.z + 2.3, cashX: omPos.x - 2.5, cashZ: omPos.z + 2.3, entity: omEnt, sellPallet: omPallet, pedestal: omPed, cash: 0, queue: [], cooldown: 0 };

    // 2) Gold Kiln
    const gkPos = BUILDING_POS.gold_kiln;
    const gkEnt = Entities.createProductionMachine("cutter");
    gkEnt.root.position.set(gkPos.x, 0, gkPos.z);
    const gkBanner = Entities.createOverheadBannerSprite({ text: "🔥 금 나와라 뚝딱 가마", accentColor: "#f5b942", borderColor: "#f5b942", scaleX: 3.6, scaleY: 0.8 });
    gkBanner.position.set(0, 3.8, 0);
    gkEnt.root.add(gkBanner);
    Engine.stationGroup.add(gkEnt.root);
    const gkPed = Entities.createGemPedestal(gkPos.x, gkPos.z + 2.4, "🪙 금 판매 (200💵)");
    Engine.stationGroup.add(gkPed.root);
    runtime.buildings.gold_kiln = { x: gkPos.x, z: gkPos.z, entity: gkEnt, pedestal: gkPed, cash: 0, inQueue: [], progress: 0 };

    // 3) Star Crystal Workshop
    const swPos = BUILDING_POS.star_crystal_workshop;
    const swEnt = Entities.createProductionMachine("cauldron");
    swEnt.root.position.set(swPos.x, 0, swPos.z);
    const swBanner = Entities.createOverheadBannerSprite({ text: "✨ 별가루 뭉치기 공방", accentColor: "#38bdf8", borderColor: "#38bdf8", scaleX: 3.6, scaleY: 0.8 });
    swBanner.position.set(0, 3.8, 0);
    swEnt.root.add(swBanner);
    Engine.stationGroup.add(swEnt.root);
    runtime.buildings.star_crystal_workshop = { x: swPos.x, z: swPos.z, entity: swEnt, inQueue: [], progress: 0 };

    // 4) Star Gold Mixer
    const mxPos = BUILDING_POS.star_gold_mixer;
    const mxEnt = Entities.createProductionMachine("distillery");
    mxEnt.root.position.set(mxPos.x, 0, mxPos.z);
    const mxBanner = Entities.createOverheadBannerSprite({ text: "💎 우주최강 금별 믹서기", accentColor: "#f43f5e", borderColor: "#f43f5e", scaleX: 3.8, scaleY: 0.85 });
    mxBanner.position.set(0, 3.9, 0);
    mxEnt.root.add(mxBanner);
    Engine.stationGroup.add(mxEnt.root);
    const mxPed = Entities.createGemPedestal(mxPos.x, mxPos.z + 2.4, "💎 현자의 돌 (5,000💵)");
    Engine.stationGroup.add(mxPed.root);
    runtime.buildings.star_gold_mixer = { x: mxPos.x, z: mxPos.z, entity: mxEnt, pedestal: mxPed, cash: 0, inGold: [], inCrystal: [], progress: 0 };

    // 5) Monggle Dimensional Energy Lab + 3 Dynamic Energy Tiles
    const labPos = BUILDING_POS.energy_lab;
    const labEnt = Entities.createCategoryBuilding("alchemy_lab", labPos.x, labPos.z, "🔮 몽글몽글 차원 에너지 연구실", "#c084fc");
    Engine.stationGroup.add(labEnt.root);
    const labPallet = Entities.createWoodenPalletZone({ x: labPos.x - 4.2, z: labPos.z + 1.8, accent: "#d8b4fe", badgeText: "✨ 연구 재료 투입" });
    Engine.stationGroup.add(labPallet.root);
    runtime.buildings.energy_lab = { x: labPos.x, z: labPos.z, entity: labEnt, pallet: labPallet };

    const tilePositions = { 1: { x: -3.2, z: -9.4 }, 2: { x: 0.0, z: -9.4 }, 3: { x: 3.2, z: -9.4 } };
    for (const t of [1, 2, 3]) {
      const tp = tilePositions[t];
      const tile = Entities.createEnergyTile({ x: tp.x, z: tp.z, accent: ENERGY_META[t].accent });
      Engine.stationGroup.add(tile.root);
      runtime.labTiles[t] = tile;
    }

    // Build / Upgrade 3D Step Pads on the floor
    const padConfigs = [
      { id: "energy_lab", x: 0.0, z: -10.8, icon: "🔮", title: "몽글몽글 연구실", accent: "#c084fc" },
      { id: "gold_kiln", x: BUILDING_POS.gold_kiln.x, z: BUILDING_POS.gold_kiln.z + 2.3, icon: "🔥", title: "금 나와라 뚝딱 가마", accent: "#f5b942" },
      { id: "star_crystal_workshop", x: BUILDING_POS.star_crystal_workshop.x, z: BUILDING_POS.star_crystal_workshop.z + 2.3, icon: "✨", title: "별가루 뭉치기 공방", accent: "#38bdf8" },
      { id: "star_gold_mixer", x: BUILDING_POS.star_gold_mixer.x, z: BUILDING_POS.star_gold_mixer.z + 2.3, icon: "💎", title: "우주최강 금별 믹서기", accent: "#f43f5e" },
    ];
    for (const pc of padConfigs) {
      const padEnt = Entities.createStepPad({ id: pc.id, x: pc.x, z: pc.z, icon: pc.icon, title: pc.title, accent: pc.accent, priceText: "건설", canAfford: false });
      Engine.stationGroup.add(padEnt.root);
      runtime.stepPads.push({ ...pc, entity: padEnt, progress: 0 });
    }

    // Hero Skill 4 Floating Philosopher's Stone Halo & Stage 1~6 Aura Ring
    const halo = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshLambertMaterial({ color: 0xff1e56, emissive: 0xe11d48, emissiveIntensity: 0.8 })
    );
    halo.position.set(0, 2.6, 0);
    halo.visible = false;
    sceneObjs.hero.root.add(halo);
    runtime.philosopherHalo = halo;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.4, 28),
      new THREE.MeshBasicMaterial({ color: 0xf5c451, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.07;
    sceneObjs.hero.root.add(ring);
    runtime.sageAuraRing = ring;

    syncBuildingVisibility();
    syncFairiesCount();
  }

  function syncBuildingVisibility() {
    if (runtime.buildings.gold_kiln) {
      runtime.buildings.gold_kiln.entity.root.visible = state.goldKilnBuilt;
      runtime.buildings.gold_kiln.pedestal.root.visible = state.goldKilnBuilt;
    }
    if (runtime.buildings.star_crystal_workshop) {
      runtime.buildings.star_crystal_workshop.entity.root.visible = state.starWorkshopBuilt;
    }
    if (runtime.buildings.star_gold_mixer) {
      runtime.buildings.star_gold_mixer.entity.root.visible = state.mixerBuilt;
      runtime.buildings.star_gold_mixer.pedestal.root.visible = state.mixerBuilt;
    }
    if (runtime.buildings.energy_lab) {
      const built = state.labLv > 0;
      runtime.buildings.energy_lab.entity.root.visible = built;
      runtime.buildings.energy_lab.pallet.root.visible = built;
      if (window.Entities && window.Entities.updateAlchemyLabTier) {
        window.Entities.updateAlchemyLabTier(runtime.buildings.energy_lab.entity, Math.min(3, state.labLv));
      }
      if (window.Entities && window.Entities.updateOverheadBannerSprite && runtime.buildings.energy_lab.entity.bannerSprite) {
        window.Entities.updateOverheadBannerSprite(
          runtime.buildings.energy_lab.entity.bannerSprite,
          `🔮 몽글몽글 연구실 Lv.${state.labLv}`,
          "#c084fc"
        );
      }
    }
    if (runtime.labTiles[1]) runtime.labTiles[1].root.visible = state.labLv >= 1;
    if (runtime.labTiles[2]) runtime.labTiles[2].root.visible = state.labLv >= 3;
    if (runtime.labTiles[3]) runtime.labTiles[3].root.visible = state.labLv >= 5;
  }

  function syncFairiesCount() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;
    while (runtime.fairies.length < state.fairyCount) {
      const idx = runtime.fairies.length;
      const def = FAIRY_DEFS[idx];
      const ent = Entities.createFairyWorker(idx);
      ent.root.position.set(HERO_SPAWN.x + (idx - 1.5) * 1.4, 0, HERO_SPAWN.z + 1.5);
      Engine.unitGroup.add(ent.root);
      runtime.fairies.push({ idx, def, x: ent.root.position.x, z: ent.root.position.z, bag: [], state: "seek", targetNode: null, workCd: 0, entity: ent });
    }
  }

  // ---------------------------------------------------------------------------
  // VFX & Combat (6-Stage Skill Evolution + Boss Immunity)
  // ---------------------------------------------------------------------------
  function spawnBurstVfx(x, y, z, color, count = 6) {
    const Engine = window.Engine;
    if (!Engine || !Engine.vfxGroup) return;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshBasicMaterial({ color })
      );
      mesh.position.set(x, y, z);
      Engine.vfxGroup.add(mesh);
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 2.0 + Math.random() * 3.0;
      runtime.fxMeshes.push({ mesh, vx: Math.cos(ang) * spd, vy: 2.2 + Math.random() * 2.0, vz: Math.sin(ang) * spd, life: 0, maxLife: 0.45, gravity: 7.5 });
    }
  }

  function spawnFlyingItem(itemType, sx, sy, sz, tx, ty, tz, onArrive) {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Engine.vfxGroup || !Entities) {
      if (onArrive) onArrive();
      return;
    }
    const mesh = Entities.createItemBlock(itemType);
    mesh.scale.setScalar(0.68);
    mesh.position.set(sx, sy, sz);
    Engine.vfxGroup.add(mesh);
    runtime.flyingBricks.push({ mesh, sx, sy, sz, tx, ty, tz, t: 0, dur: 0.22, onArrive });
  }

  function triggerBuildingPopIn(rootObj) {
    if (!rootObj) return;
    rootObj.scale.set(0.05, 0.05, 0.05);
    runtime.popAnims.push({ obj: rootObj, t: 0, dur: 0.42 });
    spawnBurstVfx(rootObj.position.x, 1.2, rootObj.position.z, 0xf7dca1, 14);
  }

  function syncCrateStack(anchor, itemList, poolList, maxDraw = 12, cols = 1) {
    if (!anchor || !window.Entities) return;
    const count = Math.min(itemList.length, maxDraw);
    while (poolList.length < count) {
      const m = window.Entities.createItemBlock(itemList[poolList.length] || "ore");
      m.scale.setScalar(0.75);
      anchor.add(m);
      poolList.push(m);
    }
    while (poolList.length > count) {
      anchor.remove(poolList.pop());
    }
    for (let i = 0; i < count; i++) {
      const col = cols > 1 ? i % cols : 0;
      const layer = Math.floor(i / cols);
      poolList[i].position.set(cols > 1 ? (col - 0.5) * 0.72 : 0, layer * 0.19, 0);
    }
  }

  function spawnShockwaveRing(x, y, z, color, maxScale, dur = 0.4) {
    const Engine = window.Engine;
    if (!Engine || !Engine.vfxGroup) return;
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.8, 28),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.set(x, y, z);
    Engine.vfxGroup.add(mesh);
    runtime.fxMeshes.push({ mesh, isRing: true, maxScale, life: 0, maxLife: dur });
  }

  function damageMonster(m, rawDmg) {
    if (m.hp <= 0) return;
    if (m.isBoss) {
      const reqStage = m.phase + 1; // Phase 1→2, 2→3, 3→4, 4→5, 5→6
      if (state.skillStage < reqStage) {
        if (!m._immuneToastCd || runtime.time > m._immuneToastCd) {
          m._immuneToastCd = runtime.time + 1.2;
          spawnFloatingText(m.x, 2.8, m.z, `🛡️ 스킬 ${reqStage}단계 필요!`, "#fb7185");
          spawnShockwaveRing(m.x, 0.2, m.z, 0xfb7185, 2.2, 0.3);
        }
        return;
      }
    }
    m.hp -= rawDmg;
    const ratio = Math.max(0, m.hp / Math.max(1, m.maxHp));
    if (m.entity && m.entity.hpFillPivot) {
      m.entity.hpFillPivot.scale.x = Math.max(0.001, ratio);
    }
  }

  function castEvolvedSkill(target) {
    const def = SKILL_EVOLUTIONS[state.skillStage];
    if (!def) return;
    const dmg = def.damages[Math.min(def.damages.length - 1, state.skillLv)] || 18;
    const tx = target.x;
    const tz = target.z;
    const st = state.skillStage;

    // Apply damage in radius
    for (const m of runtime.monsters) {
      if (m.hp <= 0) continue;
      if (st === 6 || Math.hypot(m.x - tx, m.z - tz) <= def.radius) {
        damageMonster(m, dmg);
      }
    }

    // Distinct 3D VFX per Stage (Guide 04)
    if (st === 1) {
      const colors = [0xef4444, 0x3b82f6, 0x22c55e, 0xfacc15];
      colors.forEach((c) => spawnBurstVfx(player.x, 0.5, player.z, c, 2));
      spawnBurstVfx(tx, 0.9, tz, colors[Math.floor(Math.random() * 4)], 6);
      playTone(520, 0.08, "triangle", 0.04);
    } else if (st === 2) {
      spawnShockwaveRing(player.x, 0.15, player.z, 0xd8b4fe, 2.4, 0.35);
      spawnBurstVfx(tx, 1.0, tz, 0xd8b4fe, 10);
      spawnBurstVfx(tx, 1.2, tz, 0xfef08a, 6);
      playTone(640, 0.10, "sine", 0.05);
    } else if (st === 3) {
      spawnShockwaveRing(tx, 0.12, tz, 0xf5c451, def.radius, 0.45);
      spawnBurstVfx(tx, 1.0, tz, 0xfacc15, 12);
      playTone(440, 0.12, "sawtooth", 0.04);
    } else if (st === 4) {
      const rainbow = [0xff2e63, 0xfacc15, 0x4ade80, 0x38bdf8, 0xc084fc];
      rainbow.forEach((c, idx) => spawnBurstVfx(tx + (idx - 2) * 0.6, 2.5, tz, c, 3));
      spawnShockwaveRing(tx, 0.15, tz, 0xff2e63, def.radius, 0.5);
      playTone(760, 0.14, "triangle", 0.05);
    } else if (st === 5) {
      spawnShockwaveRing(tx, 6.0, tz, 0xc084fc, 4.0, 0.55);
      spawnShockwaveRing(tx, 0.15, tz, 0xfacc15, def.radius, 0.55);
      spawnBurstVfx(tx, 2.2, tz, 0x38bdf8, 16);
      if (window.Engine) window.Engine.addShake(0.18);
      playTone(320, 0.18, "sawtooth", 0.05);
    } else if (st === 6) {
      runtime.genesisTimer = 0.7;
      spawnShockwaveRing(tx, 0.2, tz, 0xfacc15, 16.0, 0.65);
      spawnShockwaveRing(tx, 3.0, tz, 0xc084fc, 10.0, 0.65);
      spawnBurstVfx(tx, 2.5, tz, 0xfef08a, 24);
      if (window.Engine) window.Engine.addShake(0.32);
      playTone(260, 0.22, "triangle", 0.06);
    }
  }

  // ---------------------------------------------------------------------------
  // Stage & Monster Spawner (25 Stages / 5 Phases)
  // ---------------------------------------------------------------------------
  function spawnMonster(theme, spec, isBoss, phase) {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    const ent = Entities.createCuteMonster(theme.species, phase);
    const sx = 34.0 + Math.random() * 2.5;
    const sz = (Math.random() - 0.5) * 5.6;
    ent.root.position.set(sx, 0, sz);
    ent.root.scale.setScalar(spec.scale || 1.0);
    Engine.unitGroup.add(ent.root);

    runtime.monsters.push({
      name: spec.name,
      phase,
      isBoss,
      ranged: !!spec.ranged,
      x: sx,
      z: sz,
      hp: spec.hp,
      maxHp: spec.hp,
      atk: spec.atk,
      speed: spec.spd,
      cash: spec.cash,
      range: spec.ranged ? 4.8 : isBoss ? 2.2 : 1.5,
      atkCd: isBoss ? 1.5 : 1.2,
      atkTimer: 0.4,
      entity: ent,
    });
  }

  function startStage(stageNum, isEarlyBonus = false) {
    const s = Math.max(1, Math.min(TOTAL_STAGES, stageNum));
    state.stage = s;
    runtime.stageActive = true;
    runtime.battleElapsed = 0;
    runtime.spawnTickTimer = 0;
    if (window.ClassicalBGM) window.ClassicalBGM.setMode("battle");

    if (isEarlyBonus) {
      const bonus = s * 30;
      state.gems += bonus;
      spawnFloatingText(player.x, 2.2, player.z, `⚡ 조기 시작 +💵 ${bonus}`, "#f7dca1");
    }

    const phase = getCurrentPhase();
    const theme = PHASE_THEMES[phase];
    const isBossStage = s % 5 === 0;
    if (isBossStage) {
      spawnMonster(theme, theme.boss, true, phase);
      showToast(`👑 STAGE ${s} 보스 출현! [${theme.boss.name}] (스킬 ${phase + 1}단계부터 피해!)`);
      if (window.Engine) window.Engine.panCameraTo(22, 0, 1.3);
    } else {
      showToast(`⚔️ STAGE ${s}/25 시작! [${theme.name}]`);
    }
    spawnStageTick();
  }

  function spawnStageTick() {
    const phase = getCurrentPhase();
    const theme = PHASE_THEMES[phase];
    const idxInPhase = (state.stage - 1) % 5; // 0..4
    if (idxInPhase === 4) {
      // Boss stage: all 4 normal monsters x 1 every 10s
      for (const spec of theme.monsters) {
        spawnMonster(theme, spec, false, phase);
      }
    } else {
      const spec = theme.monsters[idxInPhase];
      for (let i = 0; i < NORMAL_SPAWN_COUNT; i++) {
        spawnMonster(theme, spec, false, phase);
      }
    }
  }

  function startNextStageNow() {
    if (runtime.gameOver || state.allCleared) return;
    if (runtime.stageActive) {
      showToast("⚔️ 현재 Stage 전투가 진행 중입니다!");
      return;
    }
    startStage(state.stage, true);
  }

  // ---------------------------------------------------------------------------
  // Main Update Loops
  // ---------------------------------------------------------------------------
  function updatePlayer(dt) {
    let mx = input.joyActive ? input.joyX : 0;
    let mz = input.joyActive ? input.joyY : 0;
    if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) mz -= 1;
    if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) mz += 1;
    if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) mx -= 1;
    if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) mx += 1;

    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const spd = 8.2;
    player.vx = mx * spd;
    player.vz = mz * spd;

    const maxX = Math.abs(player.z) <= 4.6 ? 28.0 : 17.2;
    player.x = Math.max(-16.5, Math.min(maxX, player.x + player.vx * dt));
    player.z = Math.max(-15.0, Math.min(20.5, player.z + player.vz * dt));

    // Prevent hero from clipping through solid buildings
    const blockers = [
      { x: BUILDING_POS.ore_market.x, z: BUILDING_POS.ore_market.z, rx: 1.85, rz: 1.25 },
    ];
    if (state.goldKilnBuilt) blockers.push({ x: BUILDING_POS.gold_kiln.x, z: BUILDING_POS.gold_kiln.z, rx: 1.6, rz: 1.3 });
    if (state.starWorkshopBuilt) blockers.push({ x: BUILDING_POS.star_crystal_workshop.x, z: BUILDING_POS.star_crystal_workshop.z, rx: 1.6, rz: 1.3 });
    if (state.mixerBuilt) blockers.push({ x: BUILDING_POS.star_gold_mixer.x, z: BUILDING_POS.star_gold_mixer.z, rx: 1.6, rz: 1.3 });
    if (state.labLv > 0) blockers.push({ x: BUILDING_POS.energy_lab.x, z: BUILDING_POS.energy_lab.z, rx: 2.2, rz: 1.6 });
    for (const b of blockers) {
      const dx = player.x - b.x;
      const dz = player.z - b.z;
      if (Math.abs(dx) < b.rx && Math.abs(dz) < b.rz) {
        const ox = b.rx - Math.abs(dx);
        const oz = b.rz - Math.abs(dz);
        if (ox < oz) player.x = b.x + Math.sign(dx || 1) * b.rx;
        else player.z = b.z + Math.sign(dz || 1) * b.rz;
      }
    }

    if (Math.hypot(player.vx, player.vz) > 0.3) {
      player.rotY = Math.atan2(player.vx, player.vz);
    }
    if (player.swingTimer > 0) player.swingTimer = Math.max(0, player.swingTimer - dt);

    if (sceneObjs.hero && window.Entities) {
      sceneObjs.hero.root.position.set(player.x, 0, player.z);
      sceneObjs.hero.root.rotation.y = player.rotY;
      window.Entities.animatePlayerHero(sceneObjs.hero, {
        vx: player.vx, vz: player.vz, moveSpeed: spd,
        swingProgress: player.swingTimer > 0 ? 1 - player.swingTimer / player.swingDuration : 0,
        bagCount: player.bagItems.length, dt,
      });
    }

    if (runtime.philosopherHalo) {
      runtime.philosopherHalo.visible = state.skillStage >= 4;
      runtime.philosopherHalo.rotation.y += dt * 2.2;
    }
    if (runtime.sageAuraRing) {
      const colors = [0xffffff, 0x60a5fa, 0xd8b4fe, 0xf5c451, 0xff2e63, 0xc084fc, 0xfef08a];
      runtime.sageAuraRing.material.color.setHex(colors[state.skillStage] || 0xf5c451);
      runtime.sageAuraRing.rotation.z += dt * 1.2;
    }
  }

  function updateHarvestAndLogistics(dt) {
    // 1. Node respawn, hit wobble & hero harvest with parabolic flying item juice
    for (const node of runtime.farmNodes) {
      if (node.respawnTimer > 0) {
        node.respawnTimer -= dt;
        if (node.respawnTimer <= 0) {
          node.respawnTimer = 0;
          node.hp = node.maxHp;
          if (node.entity && node.entity.visualRoot) node.entity.visualRoot.scale.set(1, 1, 1);
        }
      } else if (node.hitAnim > 0) {
        node.hitAnim = Math.max(0, node.hitAnim - dt);
        if (node.entity && node.entity.visualRoot) {
          const wob = 1 + Math.sin(node.hitAnim * 36) * 0.18;
          node.entity.visualRoot.scale.set(wob, 2 - wob, wob);
        }
      }
    }

    if (player.harvestCooldown > 0) player.harvestCooldown -= dt;
    const bagCap = getHeroBagCap();
    if (player.harvestCooldown <= 0 && player.bagItems.length < bagCap) {
      let best = null;
      let bestD = 2.8;
      for (const n of runtime.farmNodes) {
        if (n.respawnTimer > 0) continue;
        const d = Math.hypot(n.x - player.x, n.z - player.z);
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best) {
        player.harvestCooldown = 0.28;
        player.swingTimer = player.swingDuration;
        best.hp -= 1;
        best.hitAnim = 0.22;
        const meta = ITEM_META[best.kind];
        spawnBurstVfx(best.x, 0.85, best.z, meta.color, 5);
        if (best.hp <= 0) {
          best.respawnTimer = 4.0;
          if (best.entity && best.entity.visualRoot) best.entity.visualRoot.scale.set(0.01, 0.01, 0.01);
        }
        player.bagItems.push(best.kind);
        spawnFlyingItem(best.kind, best.x, 0.9, best.z, player.x, 1.4, player.z);
        spawnFloatingText(best.x, 1.5, best.z, `+1 ${meta.icon}`, "#bae6fd");
        playTone(540 + Math.min(260, player.bagItems.length * 14), 0.05, "sine", 0.06);
      }
    }

    // 2. Manual Hero Transfers (Storages <-> Bag -> Buildings)
    if (player.transferCooldown > 0) player.transferCooldown -= dt;
    if (player.transferCooldown <= 0) {
      // Withdraw from 1-tile storages when bag has space
      for (const id of Object.keys(runtime.storages)) {
        const st = runtime.storages[id];
        const arr = state.storages[id];
        if (Math.hypot(player.x - st.x, player.z - st.z) < 2.1 && arr.length > 0 && player.bagItems.length < bagCap) {
          const item = arr.pop();
          player.bagItems.push(item);
          player.transferCooldown = 0.07;
          playTone(480, 0.04, "sine", 0.03);
          break;
        }
      }
    }

    if (player.transferCooldown <= 0) {
      const takeFromBag = (type) => {
        const idx = player.bagItems.indexOf(type);
        if (idx === -1) return false;
        player.bagItems.splice(idx, 1);
        player.transferCooldown = 0.06;
        playTone(420, 0.04, "triangle", 0.03);
        return true;
      };

      // Ore Market: sell ore (10) at dedicated front pallet
      const om = runtime.buildings.ore_market;
      if (om) {
        const onPallet = Math.hypot(player.x - om.sellX, player.z - om.sellZ) < 1.8;
        if (window.Entities && om.sellPallet) window.Entities.updateWoodenPalletZone(om.sellPallet, onPallet ? 1 : 0, runtime.time);
        if (onPallet) {
          if (takeFromBag("ore")) {
            om.cash += 10;
            spawnFloatingText(om.sellX, 2.0, om.sellZ, "+💵 10", "#4ade80");
          } else if (om.cash <= 0) {
            showMissingResourcePopup("ore");
          }
        }
      }

      // Gold Kiln: deposit ore (10 -> 1 gold)
      const gk = runtime.buildings.gold_kiln;
      if (gk && state.goldKilnBuilt && Math.hypot(player.x - gk.x, player.z - gk.z) < 2.3 && gk.inQueue.length < 30) {
        if (!takeFromBag("ore")) showMissingResourcePopup("ore");
        else gk.inQueue.push("ore");
      }
      // Gold Kiln front pedestal: sell gold (200) or collect cash
      if (gk && state.goldKilnBuilt && Math.hypot(player.x - gk.x, player.z - (gk.z + 2.4)) < 2.1) {
        if (takeFromBag("gold")) {
          gk.cash += 200;
          spawnFloatingText(gk.x, 2.0, gk.z + 2.4, "+💵 200", "#facc15");
        } else if (gk.cash <= 0) {
          showMissingResourcePopup("gold");
        }
      }

      // Star Crystal Workshop: deposit stardust (10 -> 1 star_crystal)
      const sw = runtime.buildings.star_crystal_workshop;
      if (sw && state.starWorkshopBuilt && Math.hypot(player.x - sw.x, player.z - sw.z) < 2.3 && sw.inQueue.length < 30) {
        if (!takeFromBag("stardust")) showMissingResourcePopup("stardust");
        else sw.inQueue.push("stardust");
      }

      // Star Gold Mixer: deposit gold & star_crystal (5 + 5 -> 1 philosopher_stone)
      const mx = runtime.buildings.star_gold_mixer;
      if (mx && state.mixerBuilt && Math.hypot(player.x - mx.x, player.z - mx.z) < 2.4) {
        const needGold = mx.inGold.length < 20;
        const needCrystal = mx.inCrystal.length < 20;
        if (needGold && takeFromBag("gold")) {
          // taken
        } else if (needCrystal && takeFromBag("star_crystal")) {
          // taken
        } else {
          if (mx.inGold.length < 5) showMissingResourcePopup("gold");
          else if (mx.inCrystal.length < 5) showMissingResourcePopup("star_crystal");
        }
      }

      // Energy Lab input pallet
      const lab = runtime.buildings.energy_lab;
      if (lab && state.labLv > 0 && Math.hypot(player.x - (lab.x - 4.2), player.z - (lab.z + 1.8)) < 2.3) {
        const reqType = LAB_LEVELS[state.labLv].inputType;
        if (runtime.labInputQueue.length < 60) {
          if (!takeFromBag(reqType)) showMissingResourcePopup(reqType);
          else runtime.labInputQueue.push(reqType);
        }
      }
    }

    // Collect cash pedestals
    for (const key of ["ore_market", "gold_kiln", "star_gold_mixer"]) {
      const b = runtime.buildings[key];
      if (!b || !b.pedestal || b.cash <= 0) continue;
      const px = b.cashX !== undefined ? b.cashX : b.x;
      const pz = b.cashZ !== undefined ? b.cashZ : b.z + 2.4;
      if (Math.hypot(player.x - px, player.z - pz) < 2.1) {
        const amt = b.cash;
        b.cash = 0;
        state.gems += amt;
        if (key === "ore_market") state.tutSoldOre = true;
        spawnFloatingText(player.x, 2.1, player.z, `+💵 ${amt.toLocaleString()}`, "#4ade80");
        playTone(740, 0.08, "sine", 0.05);
      }
    }

    // Collect Energy Tiles
    for (const tier of [1, 2, 3]) {
      const tile = runtime.labTiles[tier];
      if (!tile || !tile.root.visible) continue;
      if (state.labStored[tier] > 0 && Math.hypot(player.x - tile.x, player.z - tile.z) < 2.0) {
        const amt = state.labStored[tier];
        state.labStored[tier] = 0;
        addEnergyAmount(tier, amt);
        spawnFloatingText(player.x, 2.2, player.z, `+${ENERGY_META[tier].icon} ${amt}`, ENERGY_META[tier].accent);
        playTone(880, 0.08, "triangle", 0.05);
      }
    }

    // 3. Building Craft Loops
    const gk = runtime.buildings.gold_kiln;
    if (gk && state.goldKilnBuilt) {
      const active = gk.inQueue.length >= 10;
      window.Entities.animateProductionMachine(gk.entity, active, dt);
      if (active) {
        gk.progress += dt;
        if (gk.progress >= 1.0) {
          gk.progress -= 1.0;
          gk.inQueue.splice(0, 10);
          state.storages.storage_gold.push("gold");
          spawnBurstVfx(BUILDING_POS.storage_gold.x, 1.0, BUILDING_POS.storage_gold.z, 0xf5b942, 5);
        }
      } else gk.progress = 0;
    }

    const sw = runtime.buildings.star_crystal_workshop;
    if (sw && state.starWorkshopBuilt) {
      const active = sw.inQueue.length >= 10;
      window.Entities.animateProductionMachine(sw.entity, active, dt);
      if (active) {
        sw.progress += dt;
        if (sw.progress >= 1.0) {
          sw.progress -= 1.0;
          sw.inQueue.splice(0, 10);
          state.storages.storage_star_crystal.push("star_crystal");
          spawnBurstVfx(BUILDING_POS.storage_star_crystal.x, 1.0, BUILDING_POS.storage_star_crystal.z, 0x38bdf8, 5);
        }
      } else sw.progress = 0;
    }

    const mx = runtime.buildings.star_gold_mixer;
    if (mx && state.mixerBuilt) {
      const active = mx.inGold.length >= 5 && mx.inCrystal.length >= 5;
      window.Entities.animateProductionMachine(mx.entity, active, dt);
      if (active) {
        mx.progress += dt;
        if (mx.progress >= 2.0) {
          mx.progress -= 2.0;
          mx.inGold.splice(0, 5);
          mx.inCrystal.splice(0, 5);
          mx.cash += 5000;
          spawnFloatingText(mx.x, 2.4, mx.z + 2.4, "+💎 현자의 돌 5,000💵!", "#f43f5e");
          spawnBurstVfx(mx.x, 1.4, mx.z + 2.4, 0xf43f5e, 10);
        }
      } else mx.progress = 0;
    }

    // 4. Monggle Energy Lab (30s cycle)
    if (state.labLv > 0) {
      const spec = LAB_LEVELS[state.labLv];
      const hasMat = runtime.labInputQueue.length >= spec.inputAmt;
      if (hasMat) {
        runtime.labProgress += dt;
        if (runtime.labProgress >= 18.0) {
          runtime.labProgress -= 18.0;
          runtime.labInputQueue.splice(0, spec.inputAmt);
          for (const [tStr, amt] of Object.entries(spec.out)) {
            const t = Number(tStr);
            state.labStored[t] = (state.labStored[t] || 0) + amt;
          }
          playTone(960, 0.12, "triangle", 0.05);
        }
      } else {
        runtime.labProgress = 0;
      }

      // Update Tile Billboards
      for (const t of [1, 2, 3]) {
        const tile = runtime.labTiles[t];
        if (!tile || !tile.root.visible) continue;
        tile.orb.rotation.y += dt * 1.8;
        const outAmt = spec.out[t];
        const topText = outAmt
          ? (hasMat ? `${ENERGY_META[t].icon} +${outAmt} · ${Math.ceil(18 - runtime.labProgress)}s` : `${ITEM_META[spec.inputType].icon} ${runtime.labInputQueue.length}/${spec.inputAmt}`)
          : `${ENERGY_META[t].icon} 대기`;
        window.Entities.updateOverheadBannerSprite(tile.topSprite, topText, ENERGY_META[t].accent);
        window.Entities.updateOverheadBannerSprite(tile.bottomSprite, `보관: ${state.labStored[t] || 0}`, "#f7dca1");
      }
    }

    // 5. Update 1-Tile Storage Counts & Visible 3D Stacked Crates
    for (const id of Object.keys(runtime.storages)) {
      const st = runtime.storages[id];
      const arr = state.storages[id];
      window.Entities.updateOverheadBannerSprite(st.entity.bannerSprite, `${st.title} · ${arr.length}`, st.accent);
      syncCrateStack(st.entity.stackAnchor, arr, st.visuals, 12, 2);
    }
    if (sceneObjs.hero && sceneObjs.hero.backStackAnchor) {
      syncCrateStack(sceneObjs.hero.backStackAnchor, player.bagItems, runtime.heroBackVisuals, 10, 1);
    }
  }

  function updateFairies(dt) {
    for (const f of runtime.fairies) {
      if (f.workCd > 0) f.workCd -= dt;
      const d = f.def;
      if (f.state === "seek") {
        if (!f.targetNode || f.targetNode.respawnTimer > 0) {
          const list = runtime.farmNodes.filter((n) => n.kind === d.role && n.respawnTimer <= 0);
          if (list.length > 0) f.targetNode = list[(f.idx * 5 + Math.floor(runtime.time * 2)) % list.length];
        }
        if (f.targetNode) {
          const dx = f.targetNode.x - f.x;
          const dz = f.targetNode.z - f.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 1.0) {
            f.x += (dx / dist) * d.speed * dt;
            f.z += (dz / dist) * d.speed * dt;
            f.entity.root.rotation.y = Math.atan2(dx, dz);
          } else if (f.workCd <= 0) {
            f.workCd = 0.45;
            for (let k = 0; k < d.yieldPerHit && f.bag.length < d.carryCap; k++) {
              f.bag.push(d.role);
            }
            f.targetNode.hp -= 1;
            if (f.targetNode.hp <= 0) {
              f.targetNode.respawnTimer = 4.0;
              if (f.targetNode.entity && f.targetNode.entity.visualRoot) f.targetNode.entity.visualRoot.scale.set(0.01, 0.01, 0.01);
              f.targetNode = null;
            }
            if (f.bag.length >= d.carryCap) f.state = "deliver";
          }
        }
      } else {
        const st = runtime.storages[d.storage];
        const dx = st.x - f.x;
        const dz = st.z - f.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 1.1) {
          f.x += (dx / dist) * d.speed * dt;
          f.z += (dz / dist) * d.speed * dt;
          f.entity.root.rotation.y = Math.atan2(dx, dz);
        } else {
          while (f.bag.length > 0) {
            state.storages[d.storage].push(f.bag.pop());
          }
          f.state = "seek";
        }
      }
      f.entity.root.position.set(f.x, 0, f.z);
      window.Entities.animateFairy(f.entity, dt);
    }
  }

  function updateCombatAndStages(dt) {
    // Stage Timer
    if (!runtime.stageActive && !state.allCleared) {
      runtime.stageTimer -= dt;
      if (runtime.stageTimer <= 0) {
        startStage(state.stage, false);
      }
    } else if (runtime.stageActive) {
      runtime.battleElapsed += dt;
      if (runtime.battleElapsed < STAGE_BATTLE_DURATION) {
        runtime.spawnTickTimer += dt;
        if (runtime.spawnTickTimer >= SPAWN_TICK_INTERVAL) {
          runtime.spawnTickTimer -= SPAWN_TICK_INTERVAL;
          spawnStageTick();
        }
      } else if (runtime.monsters.length === 0) {
        // Stage Clear!
        runtime.stageActive = false;
        if (window.ClassicalBGM) window.ClassicalBGM.setMode("peace");
        const cleared = state.stage;
        const bonus = cleared * 150 * (cleared % 5 === 0 ? 3 : 1);
        state.gems += bonus;
        spawnFloatingText(GATE_POS.x - 1, 2.5, 0, `🎉 STAGE ${cleared} 클리어 +💵 ${bonus.toLocaleString()}`, "#facc15");
        if (cleared >= TOTAL_STAGES) {
          state.allCleared = true;
          showGameOverModal(true);
        } else {
          state.stage = cleared + 1;
          runtime.stageTimer = STAGE_BREAK_INTERVAL;
          showToast(`🏆 STAGE ${cleared} 클리어! 1분 30초 휴식 후 STAGE ${state.stage} 시작`);
        }
      }
    }

    // Auto-Skill when hero is near East Gate combat zone
    if (runtime.skillCooldown > 0) runtime.skillCooldown -= dt;
    if (player.x >= HERO_COMBAT_X_MIN && runtime.skillCooldown <= 0 && runtime.monsters.length > 0) {
      let nearest = null;
      let bestD = 12.0;
      for (const m of runtime.monsters) {
        if (m.hp <= 0) continue;
        const d = Math.hypot(m.x - player.x, m.z - player.z);
        if (d < bestD) { bestD = d; nearest = m; }
      }
      if (nearest) {
        const def = SKILL_EVOLUTIONS[state.skillStage];
        runtime.skillCooldown = def.cooldown;
        player.swingTimer = player.swingDuration;
        castEvolvedSkill(nearest);
      }
    }

    // Monsters AI & Deaths
    const Engine = window.Engine;
    for (let i = runtime.monsters.length - 1; i >= 0; i--) {
      const m = runtime.monsters[i];
      if (m.hp <= 0) {
        if (Engine && Engine.unitGroup && m.entity && m.entity.root) Engine.unitGroup.remove(m.entity.root);
        state.gems += m.cash;
        spawnBurstVfx(m.x, 0.8, m.z, 0x4ade80, 5);
        spawnFloatingText(m.x, 1.8, m.z, `+💵 ${m.cash}`, "#4ade80");
        runtime.monsters.splice(i, 1);
        continue;
      }

      if (m.atkTimer > 0) m.atkTimer -= dt;
      const goalX = GATE_POS.x + 1.2;
      const dx = goalX - m.x;
      const dist = Math.abs(dx);
      if (dist > m.range) {
        m.x += Math.sign(dx) * Math.min(dist - m.range * 0.8, m.speed * dt);
      } else if (m.atkTimer <= 0) {
        m.atkTimer = m.atkCd;
        state.gateHp = Math.max(0, state.gateHp - m.atk);
        spawnBurstVfx(GATE_POS.x + 0.4, 1.2, m.z, 0xfb7185, 4);
        if (state.gateHp <= 0 && !runtime.gameOver) {
          runtime.gameOver = true;
          showGameOverModal(false);
        }
      }
      m.entity.root.position.set(m.x, 0, m.z);
      m.entity.root.rotation.y = -Math.PI * 0.5;
      window.Entities.animateCuteMonster(m.entity, dt, false);
    }
  }

  function updateVfx(dt) {
    const Engine = window.Engine;
    for (let i = runtime.fxMeshes.length - 1; i >= 0; i--) {
      const fx = runtime.fxMeshes[i];
      fx.life += dt;
      if (fx.life >= fx.maxLife) {
        if (Engine && Engine.vfxGroup && fx.mesh) Engine.vfxGroup.remove(fx.mesh);
        runtime.fxMeshes.splice(i, 1);
        continue;
      }
      const p = fx.life / fx.maxLife;
      if (fx.isRing) {
        const sc = 0.5 + p * fx.maxScale;
        fx.mesh.scale.set(sc, sc, 1);
        fx.mesh.material.opacity = 1 - p;
      } else {
        fx.vy -= (fx.gravity || 0) * dt;
        fx.mesh.position.x += fx.vx * dt;
        fx.mesh.position.y = Math.max(0.1, fx.mesh.position.y + fx.vy * dt);
        fx.mesh.position.z += fx.vz * dt;
        fx.mesh.scale.setScalar(1 - p * 0.8);
      }
    }

    const genEl = document.getElementById("genesis-overlay");
    if (genEl) {
      if (runtime.genesisTimer > 0) {
        runtime.genesisTimer -= dt;
        genEl.classList.add("active");
      } else {
        genEl.classList.remove("active");
      }
    }

    // Animate parabolic flying item blocks
    for (let i = runtime.flyingBricks.length - 1; i >= 0; i--) {
      const fb = runtime.flyingBricks[i];
      fb.t += dt;
      const p = Math.min(1, fb.t / fb.dur);
      fb.mesh.position.set(
        fb.sx + (fb.tx - fb.sx) * p,
        fb.sy + (fb.ty - fb.sy) * p + Math.sin(p * Math.PI) * 1.45,
        fb.sz + (fb.tz - fb.sz) * p
      );
      fb.mesh.rotation.y += dt * 7;
      if (p >= 1) {
        if (Engine && Engine.vfxGroup) Engine.vfxGroup.remove(fb.mesh);
        if (fb.onArrive) fb.onArrive();
        runtime.flyingBricks.splice(i, 1);
      }
    }

    // Animate elastic building pop-in bounce
    for (let i = runtime.popAnims.length - 1; i >= 0; i--) {
      const pa = runtime.popAnims[i];
      pa.t += dt;
      const p = Math.min(1, pa.t / pa.dur);
      const ease = p < 0.65 ? (p / 0.65) * 1.15 : 1.15 - ((p - 0.65) / 0.35) * 0.15;
      pa.obj.scale.setScalar(Math.max(0.05, ease));
      if (p >= 1) {
        pa.obj.scale.setScalar(1);
        runtime.popAnims.splice(i, 1);
      }
    }

    // Subtle footstep starlight dust while hero runs
    if (Math.hypot(player.vx, player.vz) > 1.5) {
      runtime.dustTimer += dt;
      if (runtime.dustTimer >= 0.16) {
        runtime.dustTimer = 0;
        spawnBurstVfx(player.x, 0.15, player.z, 0xd8b4fe, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HUD & Bottom-Sheet Shop UI
  // ---------------------------------------------------------------------------
  function formatClock(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  function syncHUD(force = false) {
    if (!force && runtime.time - runtime.lastHudSync < 0.1) return;
    runtime.lastHudSync = runtime.time;

    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const phase = getCurrentPhase();
    setText("ui-stage-badge", `STAGE ${state.stage}/25 · P${phase}`);

    const timerEl = document.getElementById("ui-wave-timer");
    const nowBtn = document.getElementById("btn-wave-now");
    if (runtime.stageActive) {
      const left = Math.max(0, STAGE_BATTLE_DURATION - runtime.battleElapsed);
      if (timerEl) { timerEl.textContent = `전투 ${formatClock(left)}`; timerEl.classList.add("battle"); }
      if (nowBtn) nowBtn.style.display = "none";
    } else if (state.allCleared) {
      if (timerEl) { timerEl.textContent = "완전 클리어!"; timerEl.classList.remove("battle"); }
      if (nowBtn) nowBtn.style.display = "none";
    } else {
      if (timerEl) { timerEl.textContent = formatClock(runtime.stageTimer); timerEl.classList.remove("battle"); }
      if (nowBtn) nowBtn.style.display = "inline-block";
    }

    const maxHp = getWallMaxHp();
    setText("ui-hp", `${Math.ceil(state.gateHp).toLocaleString()} / ${maxHp.toLocaleString()}`);
    const hpFill = document.getElementById("ui-hp-fill");
    if (hpFill) hpFill.style.width = `${Math.max(0, Math.min(100, (state.gateHp / maxHp) * 100))}%`;

    setText("ui-gems", state.gems.toLocaleString());
    setText("ui-dim1", state.dim1.toLocaleString());
    setText("ui-dim2", state.dim2.toLocaleString());
    setText("ui-dim3", state.dim3.toLocaleString());

    const cap = getHeroBagCap();
    setText("ui-bag", `${player.bagItems.length}/${cap}`);

    const invEl = document.getElementById("invasion-banner");
    if (invEl) {
      const hunting = player.x >= HERO_COMBAT_X_MIN && Math.abs(player.z) <= 9.0;
      const showInv = runtime.stageActive && runtime.monsters.length > 0 && !hunting;
      invEl.style.display = showInv ? "block" : "none";
    }

    const curSkill = SKILL_EVOLUTIONS[state.skillStage];
    setText("ui-skill-ico", curSkill.icon);
    setText("ui-skill-stage", `${curSkill.stage}단계 · Lv.${state.skillLv}`);
    setText("ui-skill-name", curSkill.name);
    const cdEl = document.getElementById("ui-skill-cd");
    if (cdEl) cdEl.style.height = `${Math.max(0, Math.min(100, (runtime.skillCooldown / curSkill.cooldown) * 100))}%`;

    // Minimal Hero floating bag pill (only visible while carrying items)
    const hbf = document.getElementById("hero-bag-float");
    if (hbf && window.Engine) {
      if (player.bagItems.length === 0) {
        hbf.style.display = "none";
      } else {
        const p = window.Engine.worldToScreen({ x: player.x, y: 2.95, z: player.z });
        hbf.style.display = "block";
        hbf.style.left = `${p.x}px`;
        hbf.style.top = `${p.y}px`;
        setText("hbf-cap", `${player.bagItems.length} / ${cap}`);
        const fill = document.getElementById("hbf-bar-fill");
        if (fill) fill.style.width = `${Math.min(100, (player.bagItems.length / cap) * 100)}%`;
        const maxBadge = document.getElementById("hbf-max-badge");
        if (maxBadge) maxBadge.style.display = player.bagItems.length >= cap ? "block" : "none";
      }
    }

    // Skill ready dot
    const nextSk = getNextSkillUpgradeSpec();
    const skDot = document.getElementById("dot-skill-ready");
    if (skDot) {
      const canSk = nextSk && nextSk.cost && getEnergyAmount(nextSk.cost.tier) >= nextSk.cost.amt;
      skDot.style.display = canSk ? "block" : "none";
    }

    if (runtime.shopOpen) renderShop();
  }

  function renderShop() {
    const body = document.getElementById("shop-body");
    if (!body) return;
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const phase = getCurrentPhase();
    setText("ui-shop-stats", `Stage ${state.stage}/25 · Phase ${phase} (${PHASE_THEMES[phase].name}) · 요정 ${state.fairyCount}/4`);
    setText("ui-shop-cash", `💵 ${state.gems.toLocaleString()}`);
    setText("ui-shop-dim", `🔮 ${state.dim1} · 💠 ${state.dim2} · 🌟 ${state.dim3}`);

    const cards = [];
    const addCard = (ico, title, lvTxt, desc, btnTxt, disabled, onClick, active = false) => {
      const card = document.createElement("div");
      card.className = `upgrade-card${active ? " active-tier" : ""}`;
      card.innerHTML = `
        <div class="uc-left">
          <div class="uc-ico">${ico}</div>
          <div>
            <div class="uc-title">${title}<span class="uc-lv">${lvTxt}</span></div>
            <div class="uc-desc">${desc}</div>
          </div>
        </div>
      `;
      const btn = document.createElement("button");
      btn.className = "uc-btn";
      btn.textContent = btnTxt;
      btn.disabled = disabled;
      btn.onclick = onClick;
      card.appendChild(btn);
      cards.push(card);
    };

    if (runtime.shopTab === "workshop") {
      const bagCap = getHeroBagCap();
      const bagCost = BAG_UPGRADE_COSTS[state.bagLv];
      addCard("🎒", "가방 용량", `현재 ${bagCap}칸`, "15 → 30 → 50칸 확장",
        state.bagLv >= 2 ? "MAX" : `💵 ${bagCost.toLocaleString()}`,
        state.bagLv >= 2 || state.gems < bagCost,
        () => { state.gems -= bagCost; state.bagLv++; showToast(`🎒 가방 ${getHeroBagCap()}칸 확장!`); syncHUD(true); });

      addCard("🔥", "금 나와라 뚝딱 가마", state.goldKilnBuilt ? "완공" : "미건설", "광석 10 → 금 1 (1초) · 금 판매 200💵",
        state.goldKilnBuilt ? "가동 중" : "💵 1,000",
        state.goldKilnBuilt || state.gems < 1000,
        () => { state.gems -= 1000; state.goldKilnBuilt = true; syncBuildingVisibility(); showToast("🔥 금 나와라 뚝딱 가마 완공!"); syncHUD(true); });

      addCard("✨", "별가루 뭉치기 공방", state.starWorkshopBuilt ? "완공" : "미건설", "별가루 10 → 별빛 결정 1 (1초)",
        state.starWorkshopBuilt ? "가동 중" : "💵 1,000",
        state.starWorkshopBuilt || state.gems < 1000,
        () => { state.gems -= 1000; state.starWorkshopBuilt = true; syncBuildingVisibility(); showToast("✨ 별가루 뭉치기 공방 완공!"); syncHUD(true); });

      addCard("💎", "우주최강 금별 믹서기", state.mixerBuilt ? "완공" : "미건설", "금 5 + 별빛 결정 5 → 현자의 돌 1 (5,000💵)",
        state.mixerBuilt ? "가동 중" : "💵 10,000",
        state.mixerBuilt || state.gems < 10000,
        () => { state.gems -= 10000; state.mixerBuilt = true; syncBuildingVisibility(); showToast("💎 우주최강 금별 믹서기 완공!"); syncHUD(true); });
    } else if (runtime.shopTab === "lab") {
      const check = canUpgradeLab();
      const curDesc = state.labLv > 0 ? LAB_LEVELS[state.labLv].desc : "건설 시 별가루 10 → 🔮 1차 10 생산 (30초)";
      const nextDesc = state.labLv < 5 ? `다음: ${LAB_LEVELS[state.labLv + 1].desc}` : "최고 레벨 달성";
      addCard("🔮", "몽글몽글 차원 에너지 연구실", `Lv.${state.labLv}/5`, `${curDesc}<br>${nextDesc}`,
        state.labLv >= 5 ? "MAX" : (check.ok ? `💵 ${check.next.cost.toLocaleString()}` : check.reason),
        !check.ok,
        () => {
          state.gems -= check.next.cost;
          state.labLv++;
          syncBuildingVisibility();
          showToast(`🔮 몽글몽글 연구실 Lv.${state.labLv} 업그레이드!`);
          syncHUD(true);
        });

      for (const f of FAIRY_DEFS) {
        const hired = state.fairyCount > f.idx;
        const isNext = state.fairyCount === f.idx;
        const canHire = isNext && getEnergyAmount(f.tier) >= f.cost;
        addCard("🧚", f.title, hired ? "소환됨" : (isNext ? "소환 가능" : "순서 대기"), f.desc,
          hired ? "활동 중" : `${ENERGY_META[f.tier].icon} ${f.cost}`,
          !canHire,
          () => {
            addEnergyAmount(f.tier, -f.cost);
            state.fairyCount++;
            syncFairiesCount();
            showToast(`🧚 ${f.title} 소환 완료!`);
            syncHUD(true);
          });
      }
    } else if (runtime.shopTab === "wall") {
      const nextWall = state.wallLv + 1;
      const canPhase = phase >= nextWall;
      const upCost = nextWall * 1000;
      addCard("🏰", "성벽 최대 체력 강화", `${state.wallLv}/5단계 (HP ${getWallMaxHp().toLocaleString()})`,
        state.wallLv >= 5 ? "최고 단계 성벽 완성" : `다음 단계: HP ${WALL_HP_BY_TIER[nextWall].toLocaleString()} (Phase ${nextWall} 해금)`,
        state.wallLv >= 5 ? "MAX" : (!canPhase ? `Phase ${nextWall} 필요` : `💵 ${upCost.toLocaleString()}`),
        state.wallLv >= 5 || !canPhase || state.gems < upCost,
        () => {
          state.gems -= upCost;
          state.wallLv++;
          state.gateHp += 1000;
          if (window.Entities && sceneObjs.gate) window.Entities.updateVillageGateTier(sceneObjs.gate, Math.min(3, state.wallLv - 1));
          showToast(`🏰 성벽 ${state.wallLv}단계 강화! (최대 HP ${getWallMaxHp().toLocaleString()})`);
          syncHUD(true);
        });

      const repairCost = getFullRepairCost();
      const missing = Math.max(0, getWallMaxHp() - state.gateHp);
      addCard("🛠️", "성벽 긴급 보수", `손실 ${Math.ceil(missing)} HP`,
        `체력 100당 💵 ${getRepairCostPer100()} (현재 Phase ${phase})`,
        missing <= 0 ? "완전함" : `전량 보수 💵 ${repairCost.toLocaleString()}`,
        missing <= 0 || state.gems < repairCost,
        () => {
          state.gems -= repairCost;
          state.gateHp = getWallMaxHp();
          showToast("🛠️ 성벽을 100% 보수했습니다!");
          syncHUD(true);
        });
    } else if (runtime.shopTab === "skills") {
      const nextSpec = getNextSkillUpgradeSpec();
      for (let s = 1; s <= 6; s++) {
        const def = SKILL_EVOLUTIONS[s];
        const isCurrent = state.skillStage === s;
        const isDone = state.skillStage > s;
        const isNextEvo = nextSpec && nextSpec.action === "evolve" && nextSpec.targetStage === s;
        const isCurLvUp = isCurrent && nextSpec && nextSpec.action === "levelup";

        let btnTxt = isDone ? "진화 완료" : isCurrent ? (s === 6 ? "최종 완성" : "MAX") : "잠김";
        let canClick = false;
        if (isCurLvUp) {
          btnTxt = `Lv.${nextSpec.targetLv} (${ENERGY_META[nextSpec.cost.tier].icon} ${nextSpec.cost.amt})`;
          canClick = getEnergyAmount(nextSpec.cost.tier) >= nextSpec.cost.amt;
        } else if (isNextEvo) {
          btnTxt = `스킬 진화 (${ENERGY_META[nextSpec.cost.tier].icon} ${nextSpec.cost.amt})`;
          canClick = getEnergyAmount(nextSpec.cost.tier) >= nextSpec.cost.amt;
        }

        addCard(def.icon, `${s}단계 · ${def.name}`, isCurrent ? `Lv.${state.skillLv}/${def.maxLv}` : (isDone ? "완료" : ""),
          `<b>${def.element}</b><br>${def.vfxDesc}`,
          btnTxt, !canClick,
          () => {
            addEnergyAmount(nextSpec.cost.tier, -nextSpec.cost.amt);
            state.skillStage = nextSpec.targetStage;
            state.skillLv = nextSpec.targetLv;
            showToast(`✨ ${def.name} ${nextSpec.action === "evolve" ? "스킬 진화!" : `Lv.${state.skillLv} 달성!`}`);
            playTone(880, 0.14, "triangle", 0.06);
            syncHUD(true);
          }, isCurrent);
      }
    }

    body.innerHTML = "";
    cards.forEach((c) => body.appendChild(c));
  }

  function openShop(tab = "workshop") {
    runtime.shopOpen = true;
    runtime.shopTab = tab;
    document.querySelectorAll(".shop-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    const modal = document.getElementById("shop-modal");
    if (modal) modal.classList.add("open");
    renderShop();
  }

  function closeShop() {
    runtime.shopOpen = false;
    const modal = document.getElementById("shop-modal");
    if (modal) modal.classList.remove("open");
  }

  function showGameOverModal(victory) {
    const modal = document.getElementById("gameover-modal");
    if (!modal) return;
    document.getElementById("gameover-badge").textContent = victory ? "👑 VICTORY" : "💥 DEFEAT";
    document.getElementById("gameover-title").textContent = victory ? "🎉 25 Stage 최종 대마왕 격파!" : "💔 성벽이 무너졌습니다!";
    document.getElementById("gameover-desc").textContent = victory
      ? "축하합니다! 창세 연성술로 모든 악마 군단을 물리쳤습니다."
      : "성벽을 보수·강화하고 스킬 진화를 올려 다시 도전하세요.";
    modal.classList.add("open");
  }

  // ---------------------------------------------------------------------------
  // Save / Load & DOM Bindings
  // ---------------------------------------------------------------------------
  function saveGame(toast = false) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ state, bag: player.bagItems }));
      if (toast) showToast("💾 진행 상황이 저장되었습니다!");
    } catch (e) {}
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.state) {
        state = { ...createDefaultState(), ...parsed.state };
        state.storages = { ...createDefaultState().storages, ...(parsed.state.storages || {}) };
        state.labStored = { 1: 0, 2: 0, 3: 0, ...(parsed.state.labStored || {}) };
      }
      if (parsed && Array.isArray(parsed.bag)) player.bagItems = parsed.bag;
    } catch (e) {}
  }

  function bindDOM() {
    if (_domBound) return;
    _domBound = true;

    window.addEventListener("keydown", (e) => input.keys.add(e.code));
    window.addEventListener("keyup", (e) => input.keys.delete(e.code));

    const joyZone = document.getElementById("joystick-zone");
    const joyBase = document.getElementById("joystick-base");
    const joyStick = document.getElementById("joystick-stick");
    const joyHint = document.getElementById("joystick-hint");

    if (joyZone) {
      joyZone.addEventListener("pointerdown", (e) => {
        input.joyActive = true;
        input.joyId = e.pointerId;
        const rect = joyZone.getBoundingClientRect();
        input.originX = e.clientX - rect.left;
        input.originY = e.clientY - rect.top;
        input.joyX = 0; input.joyY = 0;
        if (joyBase) {
          joyBase.style.display = "block";
          joyBase.style.left = `${input.originX}px`;
          joyBase.style.top = `${input.originY}px`;
        }
        if (joyStick) joyStick.style.transform = "translate(0px, 0px)";
        if (joyHint) joyHint.style.display = "none";
      });
      window.addEventListener("pointermove", (e) => {
        if (!input.joyActive || e.pointerId !== input.joyId) return;
        const rect = joyZone.getBoundingClientRect();
        const dx = (e.clientX - rect.left) - input.originX;
        const dy = (e.clientY - rect.top) - input.originY;
        const maxR = 38;
        const d = Math.hypot(dx, dy);
        const cl = Math.min(maxR, d);
        const ang = Math.atan2(dy, dx);
        const sx = d > 0 ? Math.cos(ang) * cl : 0;
        const sy = d > 0 ? Math.sin(ang) * cl : 0;
        input.joyX = sx / maxR;
        input.joyY = sy / maxR;
        if (joyStick) joyStick.style.transform = `translate(${sx}px, ${sy}px)`;
      });
      const endJoy = (e) => {
        if (e.pointerId !== input.joyId) return;
        input.joyActive = false; input.joyX = 0; input.joyY = 0;
        if (joyBase) {
          joyBase.style.display = "block";
          joyBase.style.left = "";
          joyBase.style.top = "";
        }
        if (joyStick) joyStick.style.transform = "translate(0px, 0px)";
      };
      window.addEventListener("pointerup", endJoy);
      window.addEventListener("pointercancel", endJoy);
    }

    document.getElementById("btn-start-mission")?.addEventListener("click", () => {
      document.getElementById("opening-modal")?.classList.remove("open");
      if (window.ClassicalBGM) window.ClassicalBGM.start();
      triggerTutorialStepPopup(state.tutStep);
    });
    window.addEventListener("pointerdown", () => {
      if (window.ClassicalBGM) window.ClassicalBGM.start();
    }, { once: true });
    document.getElementById("btn-wave-now")?.addEventListener("click", startNextStageNow);
    document.getElementById("btn-open-shop")?.addEventListener("click", () => openShop("workshop"));
    document.getElementById("btn-open-skills")?.addEventListener("click", () => openShop("skills"));
    document.getElementById("active-skill-pill")?.addEventListener("click", () => openShop("skills"));
    document.getElementById("btn-wall-quick")?.addEventListener("click", () => openShop("wall"));
    document.getElementById("btn-close-shop")?.addEventListener("click", closeShop);
    document.getElementById("sheet-close-bar")?.addEventListener("click", closeShop);

    document.querySelectorAll(".shop-tab").forEach((btn) => {
      btn.addEventListener("click", () => openShop(btn.dataset.tab));
    });

    const settingsPop = document.getElementById("settings-popover");
    document.getElementById("btn-settings-toggle")?.addEventListener("click", (e) => {
      e.stopPropagation();
      settingsPop?.classList.toggle("open");
    });

    document.getElementById("btn-home")?.addEventListener("click", () => {
      player.x = HERO_SPAWN.x; player.z = HERO_SPAWN.z;
      settingsPop?.classList.remove("open");
      showToast("🏡 중앙 광장으로 귀환했습니다.");
    });
    document.getElementById("btn-mute")?.addEventListener("click", (e) => {
      state.muted = !state.muted;
      e.currentTarget.textContent = state.muted ? "🔇 사운드 OFF" : "🔊 사운드 ON";
      if (window.ClassicalBGM) window.ClassicalBGM.setMuted(state.muted);
    });
    document.getElementById("btn-save")?.addEventListener("click", () => {
      settingsPop?.classList.remove("open");
      saveGame(true);
    });
    document.getElementById("btn-reset")?.addEventListener("click", () => {
      settingsPop?.classList.remove("open");
      document.getElementById("reset-modal")?.classList.add("open");
    });
    document.getElementById("btn-cancel-reset")?.addEventListener("click", () => document.getElementById("reset-modal")?.classList.remove("open"));
    document.getElementById("btn-confirm-reset")?.addEventListener("click", () => {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    });

    document.getElementById("btn-retry-wave")?.addEventListener("click", () => {
      document.getElementById("gameover-modal")?.classList.remove("open");
      runtime.gameOver = false;
      runtime.monsters.forEach((m) => window.Engine?.unitGroup?.remove(m.entity.root));
      runtime.monsters = [];
      runtime.stageActive = false;
      runtime.stageTimer = 10;
      if (window.ClassicalBGM) window.ClassicalBGM.setMode("peace");
      state.gateHp = getWallMaxHp();
      syncHUD(true);
    });
    document.getElementById("btn-gameover-reset")?.addEventListener("click", () => {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    });
  }

  const TUTORIAL_STEPS = {
    1: { title: "1. 광석 캐서 돈으로 받아보기", desc: "화살표를 따라 남서쪽 광산에서 광석을 캐고, 원석 교역소에 팔아 수익을 수거하세요!" },
    2: { title: "2. 연구실 Lv.1 지어보기", desc: "💵 500원을 모아 우측 하단 [🏛️ 공방·성벽] → [🔮 연구실·요정]에서 연구실을 지으세요!" },
    3: { title: "3. 별가루 캐서 1차 에너지 만들기", desc: "남동쪽에서 별가루 10개를 캐서 북쪽 연구실 투입구에 넣고 🔮 1차 에너지를 수거하세요!" },
    4: { title: "4. 스킬 레벨업 해보기", desc: "🔮 1차 에너지 50개를 모아 [✨ 스킬 진화] 버튼에서 1단계 Lv.2로 강화하세요!" },
    5: { title: "5. 별가루 뭉치기 공방 만들기", desc: "💵 1,000원을 모아 [🏛️ 공방·성벽]에서 ✨ 별가루 뭉치기 공방을 건설하세요!" },
    6: { title: "6. 별가루 캐서 별빛결정 만들기", desc: "별가루 10개를 캐서 별가루 뭉치기 공방에 투입해 💠 별빛 결정을 완성하세요!" },
  };

  function triggerTutorialStepPopup(stepNum) {
    if (stepNum < 1 || stepNum > 6) return;
    if (runtime.lastShownTutStep === stepNum) return;
    runtime.lastShownTutStep = stepNum;
    const info = TUTORIAL_STEPS[stepNum];
    const el = document.getElementById("tutorial-popup");
    if (!el || !info) return;
    document.getElementById("tp-step").textContent = `초보자 가이드 ${stepNum} / 6`;
    document.getElementById("tp-title").textContent = info.title;
    document.getElementById("tp-desc").textContent = info.desc;
    el.classList.add("show");
    runtime.tutPopupTimer = 2.8;
  }

  function updateTutorial(dt) {
    if (runtime.tutPopupTimer > 0) {
      runtime.tutPopupTimer -= dt;
      if (runtime.tutPopupTimer <= 0) {
        document.getElementById("tutorial-popup")?.classList.remove("show");
      }
    }

    const stepNum = state.tutStep || 1;
    const stepEl = document.getElementById("ui-guide-step");
    const textEl = document.getElementById("ui-guide-text");

    if (stepNum > 6) {
      if (sceneObjs.hero && sceneObjs.hero.guideArrowGroup) sceneObjs.hero.guideArrowGroup.visible = false;
      if (runtime.tutorialRing) runtime.tutorialRing.visible = false;
      if (stepEl) stepEl.textContent = `P${getCurrentPhase()}`;
      if (textEl) {
        const hunting = player.x >= HERO_COMBAT_X_MIN && Math.abs(player.z) <= 9.0;
        textEl.textContent = runtime.stageActive
          ? (hunting
            ? `⚔️ Stage ${state.stage} 전투 중! (남은 몬스터 ${runtime.monsters.length}마리)`
            : `⚔️ Stage ${state.stage} 몬스터 침공! 동쪽 성문으로 이동하세요.`)
          : `휴식 시간! 자원 가공·연구·스킬 진화를 준비하세요.`;
      }
      return;
    }

    const oreCount = player.bagItems.filter((x) => x === "ore").length;
    const starCount = player.bagItems.filter((x) => x === "stardust").length;
    const om = runtime.buildings.ore_market;
    let target = { x: -7.2, z: 16.5 };
    let msg = "";

    if (stepNum === 1) {
      if (state.tutSoldOre) {
        state.tutStep = 2;
        triggerTutorialStepPopup(2);
        return;
      }
      if (om && om.cash > 0) {
        target = { x: om.cashX, z: om.cashZ };
        msg = "교역소 왼쪽 초록 캐시 받침대를 밟아 돈을 수거하세요!";
      } else if (oreCount > 0) {
        target = { x: om.sellX, z: om.sellZ };
        msg = `원석 교역소 앞 [⛏️ 광석 놓는 곳] 타일에 광석(${oreCount}개)을 올리세요!`;
      } else {
        target = { x: -7.2, z: 16.5 };
        msg = "화살표를 따라 남서쪽 광산에서 광석을 캐세요!";
      }
    } else if (stepNum === 2) {
      if (state.labLv >= 1) {
        state.tutStep = 3;
        triggerTutorialStepPopup(3);
        return;
      }
      if (state.gems >= 500) {
        target = { x: 0.0, z: -10.8 };
        msg = "💵 500 확보! 북쪽 [🔮 몽글몽글 연구실] 건설 타일 위로 올라가세요!";
      } else if (om && om.cash > 0) {
        target = { x: om.cashX, z: om.cashZ };
        msg = `교역소 수익을 수거하세요! (💵 ${state.gems}/500)`;
      } else if (oreCount > 0) {
        target = { x: om.sellX, z: om.sellZ };
        msg = `광석을 [⛏️ 광석 놓는 곳]에 팔아 💵 500을 모으세요! (${state.gems}/500)`;
      } else {
        target = { x: -7.2, z: 16.5 };
        msg = `광석을 캐서 💵 500원을 모으세요! (${state.gems}/500)`;
      }
    } else if (stepNum === 3) {
      if (state.dim1 > 0) {
        state.tutStep = 4;
        triggerTutorialStepPopup(4);
        return;
      }
      if (state.labStored[1] > 0) {
        target = { x: -3.2, z: -9.4 };
        msg = "🔮 1차 에너지 타일 위로 걸어가 에너지를 수거하세요!";
      } else if (runtime.labInputQueue.length >= 10) {
        target = { x: -3.2, z: -9.4 };
        msg = "연구실 연성 중... 1차 타일 앞에서 에너지를 기다리세요!";
      } else if (starCount > 0) {
        target = { x: BUILDING_POS.energy_lab.x - 4.2, z: BUILDING_POS.energy_lab.z + 1.8 };
        msg = `북쪽 연구실 투입구로 별가루(${starCount}개)를 넣으세요!`;
      } else {
        target = { x: 7.2, z: 16.5 };
        msg = `남동쪽 별빛 채집지에서 별가루 10개를 캐세요! (${runtime.labInputQueue.length}/10)`;
      }
    } else if (stepNum === 4) {
      if (state.skillStage >= 2 || state.skillLv >= 2) {
        state.tutStep = 5;
        triggerTutorialStepPopup(5);
        return;
      }
      if (state.dim1 >= 50) {
        target = { x: player.x, z: player.z };
        msg = "🔮 50 달성! 우측 하단 [✨ 스킬 진화]에서 Lv.2로 레벨업하세요!";
      } else if (state.labStored[1] > 0) {
        target = { x: -3.2, z: -9.4 };
        msg = `🔮 1차 에너지 타일에서 에너지를 수거하세요! (${state.dim1}/50)`;
      } else if (starCount > 0) {
        target = { x: BUILDING_POS.energy_lab.x - 4.2, z: BUILDING_POS.energy_lab.z + 1.8 };
        msg = `연구실에 별가루를 넣어 🔮 50개를 모으세요! (${state.dim1}/50)`;
      } else {
        target = { x: 7.2, z: 16.5 };
        msg = `별가루를 캐서 연구실에 넣고 🔮 50개를 모으세요! (${state.dim1}/50)`;
      }
    } else if (stepNum === 5) {
      if (state.starWorkshopBuilt) {
        state.tutStep = 6;
        triggerTutorialStepPopup(6);
        return;
      }
      if (state.gems >= 1000) {
        target = { x: BUILDING_POS.star_crystal_workshop.x, z: BUILDING_POS.star_crystal_workshop.z + 2.3 };
        msg = "💵 1,000 확보! [✨ 별가루 뭉치기 공방] 건설 타일 위로 올라가세요!";
      } else if (om && om.cash > 0) {
        target = { x: om.cashX, z: om.cashZ };
        msg = `교역소 수익을 수거하세요! (💵 ${state.gems}/1,000)`;
      } else if (oreCount > 0) {
        target = { x: om.sellX, z: om.sellZ };
        msg = `광석을 팔아 💵 1,000원을 모으세요! (${state.gems}/1,000)`;
      } else {
        target = { x: -7.2, z: 16.5 };
        msg = `광석을 캐서 💵 1,000원을 모으세요! (${state.gems}/1,000)`;
      }
    } else if (stepNum === 6) {
      if (state.storages.storage_star_crystal.length > 0) {
        state.tutStep = 7;
        state.gems += 200;
        showToast("🎉 초보자 가이드 6단계 완료! 보너스 +💵 200 지급!");
        playTone(987, 0.16, "triangle", 0.07);
        return;
      }
      if (starCount > 0) {
        target = { x: BUILDING_POS.star_crystal_workshop.x, z: BUILDING_POS.star_crystal_workshop.z };
        msg = `별가루 10개를 ✨ 별가루 뭉치기 공방에 투입하세요! (보유 ${starCount})`;
      } else {
        target = { x: 7.2, z: 16.5 };
        msg = "남동쪽에서 별가루 10개를 캐서 별빛 결정을 만드세요!";
      }
    }

    if (stepEl) stepEl.textContent = `가이드 ${stepNum}/6`;
    if (textEl) textEl.textContent = msg;

    // Point 3D Hero Guide Arrow & Pulsing Ground Ring toward target
    const dx = target.x - player.x;
    const dz = target.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (sceneObjs.hero && sceneObjs.hero.guideArrowGroup) {
      sceneObjs.hero.guideArrowGroup.visible = dist > 1.8;
      if (dist > 0.2) {
        sceneObjs.hero.guideArrowGroup.rotation.y = Math.atan2(dx, dz) - player.rotY;
      }
    }
    if (runtime.tutorialRing) {
      runtime.tutorialRing.visible = dist > 1.8;
      runtime.tutorialRing.position.set(target.x, 0.08, target.z);
      const pulse = 1.0 + Math.sin(runtime.time * 5.0) * 0.14;
      runtime.tutorialRing.scale.set(pulse, pulse, 1);
    }
  }

  function updateStepPads(dt) {
    if (!window.Entities || !window.Entities.updateStepPadTexture) return;
    for (const pad of runtime.stepPads) {
      let lvTxt = "미건설";
      let priceTxt = "MAX";
      let canAfford = false;
      let isMax = false;
      let onBuy = null;

      if (pad.id === "energy_lab") {
        lvTxt = `Lv.${state.labLv}/5`;
        if (state.labLv >= 5) {
          isMax = true;
          priceTxt = "MAX";
        } else {
          const chk = canUpgradeLab();
          canAfford = chk.ok;
          priceTxt = chk.ok ? `💵 ${chk.next.cost.toLocaleString()}` : chk.reason;
          onBuy = () => {
            state.gems -= chk.next.cost;
            state.labLv++;
            syncBuildingVisibility();
            triggerBuildingPopIn(runtime.buildings.energy_lab.entity.root);
            showToast(`🔮 몽글몽글 연구실 Lv.${state.labLv} 완공!`);
            playTone(880, 0.14, "triangle", 0.12);
          };
        }
      } else if (pad.id === "gold_kiln") {
        isMax = state.goldKilnBuilt;
        lvTxt = isMax ? "가동 중" : "미건설";
        priceTxt = isMax ? "완공" : "💵 1,000";
        canAfford = !isMax && state.gems >= 1000;
        onBuy = () => {
          state.gems -= 1000;
          state.goldKilnBuilt = true;
          syncBuildingVisibility();
          triggerBuildingPopIn(runtime.buildings.gold_kiln.entity.root);
          showToast("🔥 금 나와라 뚝딱 가마 완공!");
          playTone(880, 0.14, "triangle", 0.12);
        };
      } else if (pad.id === "star_crystal_workshop") {
        isMax = state.starWorkshopBuilt;
        lvTxt = isMax ? "가동 중" : "미건설";
        priceTxt = isMax ? "완공" : "💵 1,000";
        canAfford = !isMax && state.gems >= 1000;
        onBuy = () => {
          state.gems -= 1000;
          state.starWorkshopBuilt = true;
          syncBuildingVisibility();
          triggerBuildingPopIn(runtime.buildings.star_crystal_workshop.entity.root);
          showToast("✨ 별가루 뭉치기 공방 완공!");
          playTone(880, 0.14, "triangle", 0.12);
        };
      } else if (pad.id === "star_gold_mixer") {
        isMax = state.mixerBuilt;
        lvTxt = isMax ? "가동 중" : "미건설";
        priceTxt = isMax ? "완공" : "💵 10,000";
        canAfford = !isMax && state.gems >= 10000;
        onBuy = () => {
          state.gems -= 10000;
          state.mixerBuilt = true;
          syncBuildingVisibility();
          triggerBuildingPopIn(runtime.buildings.star_gold_mixer.entity.root);
          showToast("💎 우주최강 금별 믹서기 완공!");
          playTone(880, 0.14, "triangle", 0.12);
        };
      }

      // Hide production pads once built (keep energy_lab pad visible until Lv.5 MAX)
      pad.entity.root.visible = pad.id === "energy_lab" ? !isMax : !isMax;

      const onPad = pad.entity.root.visible && Math.abs(player.x - pad.x) < 1.65 && Math.abs(player.z - pad.z) < 1.35;
      if (onPad && canAfford && onBuy) {
        pad.progress = Math.min(1, pad.progress + dt / 0.45);
        if (pad.progress >= 1) {
          pad.progress = 0;
          onBuy();
        }
      } else {
        pad.progress = Math.max(0, pad.progress - dt * 2.5);
      }

      window.Entities.updateStepPadTexture(pad.entity, {
        title: pad.title,
        icon: pad.icon,
        accent: pad.accent,
        levelText: lvTxt,
        priceText: priceTxt,
        canAfford,
        isMax,
        progress: pad.progress,
      });
    }
  }

  function step(dt) {
    if (runtime.gameOver) return;
    runtime.time += dt;
    if (runtime.toastTimer > 0) {
      runtime.toastTimer -= dt;
      if (runtime.toastTimer <= 0) document.getElementById("toast-banner")?.classList.remove("show");
    }
    if (runtime.missingResCd > 0) runtime.missingResCd -= dt;
    if (runtime.missingResTimer > 0) {
      runtime.missingResTimer -= dt;
      if (runtime.missingResTimer <= 0) document.getElementById("missing-resource-popup")?.classList.remove("show");
    }
    updatePlayer(dt);
    updateHarvestAndLogistics(dt);
    updateStepPads(dt);
    updateFairies(dt);
    updateCombatAndStages(dt);
    updateVfx(dt);
    updateTutorial(dt);
    if (window.Engine) {
      window.Engine.update({ x: player.x, z: player.z }, { x: player.vx, z: player.vz }, dt);
    }
    syncHUD(false);
  }

  function loop(ts) {
    if (!_lastRafTs) _lastRafTs = ts;
    const dt = Math.min(0.05, Math.max(0.001, (ts - _lastRafTs) / 1000));
    _lastRafTs = ts;
    step(dt);
    if (window.Engine) window.Engine.render();
    _rafId = requestAnimationFrame(loop);
  }

  function init() {
    if (_initialized) return;
    _initialized = true;
    loadGame();
    const container = document.getElementById("webgl-container");
    if (window.Engine) window.Engine.init(container);
    window.addEventListener("resize", () => window.Engine && window.Engine.resize());
    buildWorld();
    bindDOM();
    syncHUD(true);
    _rafId = requestAnimationFrame(loop);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }
})();
