// =============================================================================
// src/gameplay.js - 100% Green Cash Economy, Open Unobstructed Market,
// Differentiated 1호기·2호기·3호기, 4 Defense Techs, ★1~★5 Elemental Skills
// (Lv.1~10) & 10-Wave Cute Monster Trio Defense (180s Interval)
// =============================================================================

(function () {
  "use strict";

  const SAVE_KEY = "fairy_alchemy_tycoon_v6";
  const WAVE_INTERVAL = 180; // 3 minutes per wave

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
      desc: "광석 전용! 세공 보석(💵 35)을 깎아 쇼케이스에 자동 진열합니다.",
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
      desc: "남동 '무지개 약초 숲' 해금! 약초 전용 포션(💵 80)을 자동 판매합니다.",
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
      desc: "광석+약초 조합! 황실 엘릭서를 VIP 무역 마차(💵 300)로 판매합니다.",
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
      desc: "광석팀·약초팀으로 분업하는 자동 일꾼(최대 15).",
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
      desc: "광산·약초 숲을 순회해 설비에 자동 분배하는 메가 트럭.",
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
    // Defense R&D Tech Systems (tab: "defense", maxLv: 10)
    turret_flame: {
      id: "turret_flame",
      tab: "defense",
      icon: "🔥",
      title: "화염 연금 포탑",
      desc: "광장 서편에 설치되어 고폭 화염탄으로 광역 포격을 가합니다.",
      accent: "#ff6b4a",
      baseCost: 65,
      mult: 1.65,
      maxLv: 10,
      turretPos: { x: -4.8, z: 0.3 },
      padPos: { x: -4.8, z: 2.8 },
    },
    turret_frost: {
      id: "turret_frost",
      tab: "defense",
      icon: "❄️",
      title: "빙결 수정 탑",
      desc: "광장 동편에 설치되어 냉기 파편으로 적을 40% 감속·타격합니다.",
      accent: "#38bdf8",
      baseCost: 110,
      mult: 1.7,
      maxLv: 10,
      turretPos: { x: 4.8, z: 0.3 },
      padPos: { x: 4.8, z: 2.8 },
    },
    turret_thunder: {
      id: "turret_thunder",
      tab: "defense",
      icon: "⚡",
      title: "뇌전 오벨리스크",
      desc: "북쪽 중앙에 설치되어 여러 적을 동시에 연쇄 번개로 타격합니다.",
      accent: "#c084fc",
      baseCost: 210,
      mult: 1.75,
      maxLv: 10,
      turretPos: { x: 0.0, z: -5.1 },
      padPos: { x: 0.0, z: -2.6 },
    },
    shrine_aegis: {
      id: "shrine_aegis",
      tab: "defense",
      icon: "🛡️",
      title: "수호 결계 성소",
      desc: "최대 체력(+45/Lv) · 초당 재생(+3/s·Lv) · 근접 적 밀쳐내기 파동 발동.",
      accent: "#4ade80",
      baseCost: 95,
      mult: 1.65,
      maxLv: 10,
      turretPos: { x: 4.2, z: 9.7 },
      padPos: { x: 4.2, z: 12.2 },
    },
    // ★1 ~ ★5 Elemental Hero Skills (tab: "skills", maxLv: 10)
    s1: {
      id: "s1",
      tab: "skills",
      stars: 1,
      icon: "🔥",
      title: "화염구 연사",
      desc: "불꽃 화염구를 연사해 폭발 화염구와 불티 피해를 입힙니다.",
      accent: "#ff7849",
      baseCost: 45,
      mult: 1.55,
      maxLv: 10,
      cooldown: 1.25,
    },
    s2: {
      id: "s2",
      tab: "skills",
      stars: 2,
      icon: "❄️",
      title: "혹한의 눈보라",
      desc: "얼음 회오리를 소환해 광역 냉기 피해와 50% 이동 감속을 겁니다.",
      accent: "#38bdf8",
      baseCost: 90,
      mult: 1.65,
      maxLv: 10,
      cooldown: 4.5,
    },
    s3: {
      id: "s3",
      tab: "skills",
      stars: 3,
      icon: "⚡",
      title: "천둥 연쇄 낙뢰",
      desc: "번개 기둥을 다수 내리꽂아 감전 피해와 0.7초 기절을 부여합니다.",
      accent: "#facc15",
      baseCost: 190,
      mult: 1.7,
      maxLv: 10,
      cooldown: 5.5,
    },
    s4: {
      id: "s4",
      tab: "skills",
      stars: 4,
      icon: "☄️",
      title: "대지의 운석 폭풍",
      desc: "거대 마그마 운석을 떨어뜨려 강렬한 폭발, 넉백 및 화면 진동을 일으킵니다.",
      accent: "#fb7185",
      baseCost: 380,
      mult: 1.75,
      maxLv: 10,
      cooldown: 7.5,
    },
    s5: {
      id: "s5",
      tab: "skills",
      stars: 5,
      icon: "🌈",
      title: "에테르 초신성",
      desc: "무지개 초신성 파동으로 전장을 휩쓸고 연금술사 체력을 30% 즉시 회복합니다.",
      accent: "#e879f9",
      baseCost: 760,
      mult: 1.85,
      maxLv: 10,
      cooldown: 11.0,
    },
  };

  const SKILL_IDS = ["s1", "s2", "s3", "s4", "s5"];
  const DEFENSE_IDS = ["turret_flame", "turret_frost", "turret_thunder", "shrine_aegis"];

  const MACHINE_CONFIGS = [
    {
      id: "m1",
      padId: "m1",
      kind: "cutter",
      title: "1호기 세공기",
      x: -11.0,
      z: -11.8,
      inPos: { x: -14.2, z: -11.4 },
      outPos: { x: -7.6, z: -11.4 },
      cashPos: { x: -7.6, z: -8.5 },
      padPos: { x: -11.0, z: -7.4 },
      inputType: "blue_ore",
      inBadge: "⛏️ 광석 넣는 곳",
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
      outPos: { x: 3.2, z: -11.4 },
      cashPos: { x: 3.2, z: -8.5 },
      padPos: { x: 0.0, z: -7.4 },
      inputType: "rainbow_herb",
      inBadge: "🌿 약초 넣는 곳",
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
      inPos: { x: 7.6, z: -12.3 },
      inPosB: { x: 7.6, z: -9.9 },
      outPos: { x: 14.2, z: -11.4 },
      cashPos: { x: 14.2, z: -8.5 },
      padPos: { x: 11.0, z: -7.4 },
      inputType: "blue_ore",
      inputTypeB: "rainbow_herb",
      inBadge: "⛏️ 광석 넣는 곳",
      inBadgeB: "🌿 약초 넣는 곳",
      outputType: "royal_elixir",
      salePrice: 300,
      baseCraftTime: 2.0,
      accent: "#ff8c42",
    },
  ];

  // Unobstructed Open Market Coordinates (5.8m clear split between Sell vs Cash!)
  const STALL_POS = { x: -15.5, z: 6.0 };
  const SELL_PALLET_POS = { x: -10.4, z: 6.2 };
  const GEM_PEDESTAL_POS = { x: -10.4, z: 0.4 };

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
      heroHp: 180,
      toolLv: 0,
      bagLv: 0,
      speedLv: 0,
      m1Lv: 0,
      m2Lv: 0,
      m3Lv: 0,
      fairyCount: 0,
      truckLv: 0,
      herbGroveUnlocked: false,
      farm2Unlocked: false,
      farm3Unlocked: false,
      // 4 Defense R&D Levels (0~10)
      turretFlameLv: 0,
      turretFrostLv: 0,
      turretThunderLv: 0,
      shrineAegisLv: 0,
      // ★1 ~ ★5 Elemental Skill Levels (Lv.1~10 for s1, 0~10 for s2~s5)
      s1Lv: 1,
      s2Lv: 0,
      s3Lv: 0,
      s4Lv: 0,
      s5Lv: 0,
      autoSkill: true,
      wave: 1,
      allWavesCleared: false,
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
    turrets: {}, // keyed by defense id
    sellPalletQueue: [],
    sellPalletVisuals: [],
    pedestals: [],
    pedestalGems: [],
    monsters: [],
    projectiles: [],
    fxMeshes: [], // timed elemental rings/pillars/meteors
    flyingBricks: [],
    particles: [],
    popups: [],
    fairies: [],
    customers: [],
    truck: null,
    wagon: null,
    heroBackVisuals: [],
    skillCooldowns: { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 },
    waveTimer: WAVE_INTERVAL, // Starts with 03:00 countdown right away!
    waveActive: false,
    waveSpawnCount: 0,
    combatGraceTimer: 0,
    gameOver: false,
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
  // WebAudio Harmonic Tycoon & Combat Synthesizer
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
    } catch (e) {}
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

  function playSkillSfx(skillId) {
    if (skillId === "s1") {
      playTone(340, 0.12, "sawtooth", 0.05);
    } else if (skillId === "s2") {
      playTone(880, 0.20, "sine", 0.055);
      playTone(1174, 0.25, "triangle", 0.04, 0.06);
    } else if (skillId === "s3") {
      playTone(180, 0.16, "square", 0.05);
      playTone(980, 0.12, "sawtooth", 0.045, 0.04);
    } else if (skillId === "s4") {
      playTone(110, 0.28, "sawtooth", 0.075);
    } else {
      playTone(523.25, 0.18, "triangle", 0.06);
      playTone(783.99, 0.24, "sine", 0.06, 0.06);
      playTone(1046.5, 0.30, "sine", 0.07, 0.12);
    }
  }

  // ---------------------------------------------------------------------------
  // Economy, Tech & Skill Helpers
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
      case "turret_flame": return state.turretFlameLv;
      case "turret_frost": return state.turretFrostLv;
      case "turret_thunder": return state.turretThunderLv;
      case "shrine_aegis": return state.shrineAegisLv;
      case "s1": return state.s1Lv;
      case "s2": return state.s2Lv;
      case "s3": return state.s3Lv;
      case "s4": return state.s4Lv;
      case "s5": return state.s5Lv;
      default: return 0;
    }
  }

  function getUpgradeCost(id) {
    const def = UPGRADE_DEFS[id];
    if (!def) return 999999;
    const lv = getUpgradeLevel(id);
    if (lv >= def.maxLv) return 0;
    const effLv = id === "s1" ? Math.max(0, lv - 1) : lv;
    return Math.round(def.baseCost * Math.pow(def.mult, effLv));
  }

  function isUpgradeMax(id) {
    const def = UPGRADE_DEFS[id];
    return !def || getUpgradeLevel(id) >= def.maxLv;
  }

  function getHeroMaxHp() {
    return 180 + (state.level - 1) * 20 + state.shrineAegisLv * 45;
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
            ? "⚙️ 1호기 세공기 가동! 광석을 넣으면 세공 보석(💵 35)이 자동 판매됩니다!"
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
            ? "⚗️ 2호기 가마솥 가동 & 남동 '무지개 약초 숲' 해금!"
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
            ? "👑 3호기 황실 합체소 & VIP 무역 마차 개통! (💵 300)"
            : `👑 3호기 합체소 Lv.${state.m3Lv} 가속!`
        );
        break;
      case "fairy":
        state.fairyCount++;
        syncFairiesCount();
        showToast(`🧚 요정 일꾼 ${state.fairyCount}호 합류!`);
        break;
      case "truck":
        state.truckLv++;
        ensureTruckSpawned();
        showToast(state.truckLv === 1 ? "🚜 메가 수확 트럭 출고!" : `🚜 메가 트럭 Lv.${state.truckLv} 강화!`);
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
        showToast("🌿 북서 게이트 추가 약초 정원 18노드 해금!");
        break;
      case "turret_flame":
        state.turretFlameLv++;
        refreshDefenseTurretsVisibility();
        showToast(`🔥 화염 연금 포탑 Lv.${state.turretFlameLv} 가동!`);
        break;
      case "turret_frost":
        state.turretFrostLv++;
        refreshDefenseTurretsVisibility();
        showToast(`❄️ 빙결 수정 탑 Lv.${state.turretFrostLv} 가동!`);
        break;
      case "turret_thunder":
        state.turretThunderLv++;
        refreshDefenseTurretsVisibility();
        showToast(`⚡ 뇌전 오벨리스크 Lv.${state.turretThunderLv} 가동!`);
        break;
      case "shrine_aegis":
        state.shrineAegisLv++;
        state.heroHp = Math.min(getHeroMaxHp(), state.heroHp + 45);
        refreshDefenseTurretsVisibility();
        showToast(`🛡️ 수호 결계 성소 Lv.${state.shrineAegisLv}! 최대 체력 +45`);
        break;
      case "s1":
      case "s2":
      case "s3":
      case "s4":
      case "s5": {
        const key = `${id}Lv`;
        state[key] = Math.min(10, (state[key] || 0) + 1);
        const def = UPGRADE_DEFS[id];
        showToast(`★${def.stars} ${def.icon} ${def.title} Lv.${state[key]} 강화!`);
        break;
      }
      default:
        break;
    }
    state.padPaid[id] = 0;
    addXp(25);
    playBuildPop();
    spawnBurstVfx(player.x, 1.0, player.z, 0x4eff9e, 12);
    saveGame();
    syncHUD(true);
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
      state.heroHp = Math.min(getHeroMaxHp(), state.heroHp + 30);
      showToast(`✨ 연금술사 Lv.${state.level} 레벨업! (최대 체력 +20)`);
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
  // Crate Stacks, Cash Pedestals & Timed VFX Helpers
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
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      Engine.vfxGroup.add(m);
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 2.2 + Math.random() * 2.8;
      runtime.particles.push({
        mesh: m,
        vx: Math.cos(ang) * spd,
        vy: 2.8 + Math.random() * 2.2,
        vz: Math.sin(ang) * spd,
        life: 0,
        maxLife: 0.42 + Math.random() * 0.18,
      });
    }
  }

  function spawnShockwaveRing(x, y, z, color = 0xff7849, maxRadius = 3.2, dur = 0.45) {
    const Engine = window.Engine;
    if (!Engine || !Engine.vfxGroup) return;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.65, 1.0, 24), mat);
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.set(x, y, z);
    Engine.vfxGroup.add(mesh);
    runtime.fxMeshes.push({
      mesh,
      kind: "ring",
      t: 0,
      dur,
      maxRadius,
    });
  }

  function spawnLightningPillar(x, z, color = 0xfff059, dur = 0.36) {
    const Engine = window.Engine;
    if (!Engine || !Engine.vfxGroup) return;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.38, 12.0, 8), mat);
    mesh.position.set(x, 6.0, z);
    Engine.vfxGroup.add(mesh);
    runtime.fxMeshes.push({
      mesh,
      kind: "pillar",
      t: 0,
      dur,
    });
  }

  function spawnMeteorStrike(tx, tz, damage) {
    const Engine = window.Engine;
    if (!Engine || !Engine.vfxGroup) {
      applyAoEDamage(tx, tz, 3.6, damage, 4.0);
      return;
    }
    const mat = new THREE.MeshBasicMaterial({ color: 0xff5a2c });
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), mat);
    mesh.position.set(tx - 2.5, 12.0, tz - 1.5);
    Engine.vfxGroup.add(mesh);
    runtime.fxMeshes.push({
      mesh,
      kind: "meteor",
      sx: tx - 2.5,
      sy: 12.0,
      sz: tz - 1.5,
      tx,
      tz,
      damage,
      t: 0,
      dur: 0.38,
    });
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

    for (let i = runtime.fxMeshes.length - 1; i >= 0; i--) {
      const fx = runtime.fxMeshes[i];
      fx.t += dt;
      const u = Math.min(1, fx.t / fx.dur);
      if (fx.kind === "ring") {
        const rad = 0.4 + u * (fx.maxRadius || 3.2);
        fx.mesh.scale.set(rad, rad, 1);
        if (fx.mesh.material) fx.mesh.material.opacity = (1 - u) * 0.88;
      } else if (fx.kind === "pillar") {
        const s = 1.2 - u * 0.9;
        fx.mesh.scale.set(s, 1, s);
        if (fx.mesh.material) fx.mesh.material.opacity = (1 - u) * 0.95;
      } else if (fx.kind === "meteor") {
        fx.mesh.position.x = fx.sx + (fx.tx - fx.sx) * u;
        fx.mesh.position.y = fx.sy * (1 - u);
        fx.mesh.position.z = fx.sz + (fx.tz - fx.sz) * u;
        fx.mesh.rotation.x += dt * 9;
        fx.mesh.rotation.y += dt * 7;
        if (u >= 1) {
          applyAoEDamage(fx.tx, fx.tz, 3.6, fx.damage, 4.0);
          spawnShockwaveRing(fx.tx, 0.08, fx.tz, 0xff5a2c, 3.8, 0.45);
          spawnBurstVfx(fx.tx, 0.8, fx.tz, 0xff9234, 12);
          if (Engine && typeof Engine.addShake === "function") Engine.addShake(0.32);
        }
      }
      if (u >= 1) {
        if (Engine && Engine.vfxGroup) Engine.vfxGroup.remove(fx.mesh);
        runtime.fxMeshes.splice(i, 1);
      }
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
  // World Construction (84 Nodes, Open Market, 3 Facilities, 4 Defense Turrets)
  // ---------------------------------------------------------------------------
  function buildDenseFarmNodes() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    const specs = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({ zone: 1, kind: "blue_ore", itemType: "blue_ore", x: 22.8 + c * 2.0, z: -9.5 + r * 2.1 });
      }
    }
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({ zone: 2, kind: "rainbow_herb", itemType: "rainbow_herb", x: 22.8 + c * 2.0, z: 3.1 + r * 2.1 });
      }
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({ zone: 3, kind: "blue_ore", itemType: "blue_ore", x: 5.0 + c * 2.0, z: -27.2 + r * 2.2 });
      }
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        specs.push({ zone: 4, kind: "rainbow_herb", itemType: "rainbow_herb", x: -15.0 + c * 2.0, z: -27.2 + r * 2.2 });
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
    for (const m of runtime.machines) {
      const built = m.lv > 0;
      if (m.entity && m.entity.root) m.entity.root.visible = built;
      if (m.showcase && m.showcase.root) m.showcase.root.visible = built;
      if (m.cashPedestal && m.cashPedestal.entity && m.cashPedestal.entity.root) {
        m.cashPedestal.entity.root.visible = built;
      }
      if (m.inPallet && m.inPallet.root) m.inPallet.root.visible = built;
      if (m.inPalletB && m.inPalletB.root) m.inPalletB.root.visible = built;
      if (m.dockPallet && m.dockPallet.root) m.dockPallet.root.visible = built;
      for (const c of m.customers || []) {
        if (c.entity && c.entity.root) c.entity.root.visible = built;
      }
    }
    if (runtime.wagon && runtime.wagon.entity && runtime.wagon.entity.root) {
      runtime.wagon.entity.root.visible = state.m3Lv > 0;
    }
  }

  function refreshDefenseTurretsVisibility() {
    for (const id of DEFENSE_IDS) {
      const t = runtime.turrets[id];
      if (!t) continue;
      const lv = getUpgradeLevel(id);
      t.lv = lv;
      if (t.entity && t.entity.root) {
        t.entity.root.visible = lv > 0;
      }
    }
  }

  function buildDefenseTurrets() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    const kindMap = {
      turret_flame: "flame",
      turret_frost: "frost",
      turret_thunder: "thunder",
      shrine_aegis: "aegis",
    };

    for (const id of DEFENSE_IDS) {
      const def = UPGRADE_DEFS[id];
      const ent = Entities.createDefenseTurret(kindMap[id]);
      ent.root.position.set(def.turretPos.x, 0, def.turretPos.z);
      Engine.stationGroup.add(ent.root);
      runtime.turrets[id] = {
        id,
        x: def.turretPos.x,
        z: def.turretPos.z,
        lv: getUpgradeLevel(id),
        cooldown: 0,
        entity: ent,
      };
    }
    refreshDefenseTurretsVisibility();
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
        accentColor: "#38bdf8",
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
          accentColor: "#4ade80",
          badgeText: cfg.inBadgeB,
        });
        Engine.stationGroup.add(inPalletB.root);
      }

      let showcase = null;
      let dockPallet = null;
      const facilityCustomers = [];

      if (cfg.showcaseKind) {
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
            leaving: false,
            entity: custEnt,
          });
        }
      } else {
        dockPallet = Entities.createWoodenPalletZone({
          x: cfg.outPos.x,
          z: cfg.outPos.z,
          w: 2.35,
          d: 1.95,
          accentColor: "#ffd85e",
          badgeText: "👑 마차 상차장",
        });
        Engine.stationGroup.add(dockPallet.root);
      }

      const pedEnt = Entities.createGemPedestal(cfg.cashPos.x, cfg.cashPos.z, "💵 돈 받는 곳");
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
      accentColor: "#38bdf8",
      badgeText: "📦 광석 파는 곳",
    });
    Engine.stationGroup.add(sceneObjs.sellPallet.root);

    sceneObjs.gemPedestal = Entities.createGemPedestal(GEM_PEDESTAL_POS.x, GEM_PEDESTAL_POS.z, "💵 돈 받는 곳");
    Engine.stationGroup.add(sceneObjs.gemPedestal.root);

    runtime.pedestals.unshift({
      id: "starter",
      x: GEM_PEDESTAL_POS.x,
      z: GEM_PEDESTAL_POS.z,
      cashValues: runtime.pedestalGems,
      visuals: [],
      entity: sceneObjs.gemPedestal,
    });

    for (let i = 0; i < 5; i++) {
      const custEnt = Entities.createCustomer(i, "villager");
      const slotZ = STALL_POS.z + 2.2 + i * 1.55;
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
      // 4 Defense R&D Step-Pads
      { id: "turret_flame", x: UPGRADE_DEFS.turret_flame.padPos.x, z: UPGRADE_DEFS.turret_flame.padPos.z },
      { id: "turret_frost", x: UPGRADE_DEFS.turret_frost.padPos.x, z: UPGRADE_DEFS.turret_frost.padPos.z },
      { id: "turret_thunder", x: UPGRADE_DEFS.turret_thunder.padPos.x, z: UPGRADE_DEFS.turret_thunder.padPos.z },
      { id: "shrine_aegis", x: UPGRADE_DEFS.shrine_aegis.padPos.x, z: UPGRADE_DEFS.shrine_aegis.padPos.z },
    ];

    for (const p of padCoords) {
      const def = UPGRADE_DEFS[p.id];
      const pad = Entities.createStepPad({
        id: p.id,
        x: p.x,
        z: p.z,
        w: 3.1,
        d: 2.35,
        icon: def.icon,
        title: def.title,
        price: `💵 ${getUpgradeCost(p.id)}`,
        levelText: `Lv.${getUpgradeLevel(p.id)}`,
        accentHex: def.accent,
        paidRatio: 0,
      });
      Engine.stationGroup.add(pad.root);
      runtime.stepPads.push({ id: p.id, x: p.x, z: p.z, w: 3.1, d: 2.35, pad });
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
        state: "waiting_east",
        timer: 2.5,
        cargoCount: 0,
        cargoVisuals: [],
        entity: ent,
      };
    }
    runtime.wagon.entity.root.visible = state.m3Lv > 0;
  }

  // ---------------------------------------------------------------------------
  // Combat: 10-Wave Cute Monster Trio, ★1~★5 Elemental Skills & Turrets
  // ---------------------------------------------------------------------------
  function spawnWaveTrio(waveNum) {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities || !Entities.createCuteMonster) return;

    const w = Math.max(1, Math.min(10, waveNum));
    const hpMult = Math.pow(1.52, w - 1);
    const defs = [
      {
        species: "slime",
        name: "말랑 젤리 슬라임",
        sx: 16.5,
        sz: -4.2,
        hp: Math.round(110 * hpMult),
        atk: 14 + (w - 1) * 5,
        speed: 4.1 + w * 0.12,
        range: 1.45,
        atkCd: 1.05,
        reward: 26 + w * 18,
      },
      {
        species: "shroom",
        name: "통통 버섯 정령",
        sx: 16.5,
        sz: 4.5,
        hp: Math.round(135 * hpMult),
        atk: 16 + (w - 1) * 5,
        speed: 2.95 + w * 0.08,
        range: 7.5,
        atkCd: 1.65,
        reward: 32 + w * 22,
      },
      {
        species: "golem",
        name: "태엽 별골렘",
        sx: 0.5,
        sz: -15.6,
        hp: Math.round(230 * hpMult),
        atk: 22 + (w - 1) * 6,
        speed: 2.45 + w * 0.06,
        range: 1.85,
        atkCd: 1.55,
        reward: 50 + w * 30,
      },
    ];

    for (const d of defs) {
      const ent = Entities.createCuteMonster(d.species, w);
      ent.root.position.set(d.sx, 0, d.sz);
      Engine.unitGroup.add(ent.root);
      runtime.monsters.push({
        species: d.species,
        name: d.name,
        x: d.sx,
        z: d.sz,
        vx: 0,
        vz: 0,
        hp: d.hp,
        maxHp: d.hp,
        atk: d.atk,
        speed: d.speed,
        range: d.range,
        atkCd: d.atkCd,
        atkTimer: 0.6,
        slowTimer: 0,
        stunTimer: 0,
        reward: d.reward,
        entity: ent,
      });
    }

    runtime.waveActive = true;
    runtime.waveSpawnCount = 3;
    runtime.waveTimer = WAVE_INTERVAL;
    runtime.combatGraceTimer = 0.8;
    showToast(`🌊 WAVE ${w} / 10 출격! 달콤숲 몬스터 삼총사가 등장했습니다!`);
    playTone(440, 0.14, "triangle", 0.07);
    playTone(587.33, 0.20, "triangle", 0.07, 0.1);
    syncHUD(true);
  }

  function startWaveNow() {
    if (runtime.gameOver) return;
    if (runtime.waveActive && runtime.monsters.length > 0) {
      showToast("⚔️ 현재 웨이브 전투가 진행 중입니다!");
      return;
    }
    if (state.allWavesCleared) {
      state.wave = 10;
    }
    spawnWaveTrio(state.wave);
  }

  function damageMonster(m, rawDmg, knockDirX = 0, knockDirZ = 0, knockPower = 0) {
    if (!m || m.hp <= 0) return;
    const dmg = Math.max(1, Math.round(rawDmg));
    m.hp -= dmg;
    if (knockPower > 0) {
      m.vx += knockDirX * knockPower;
      m.vz += knockDirZ * knockPower;
    }
    if (m.entity && m.entity.hpFillPivot) {
      const ratio = Math.max(0.01, m.hp / m.maxHp);
      m.entity.hpFillPivot.scale.x = ratio;
    }
    spawnFloatingText(m.x, 1.9, m.z, `-${dmg}`, "#ffe070");
  }

  function applyAoEDamage(cx, cz, radius, dmg, knock = 0, slowSec = 0, stunSec = 0) {
    let hitCount = 0;
    for (const m of runtime.monsters) {
      if (m.hp <= 0) continue;
      const dx = m.x - cx;
      const dz = m.z - cz;
      const d = Math.hypot(dx, dz);
      if (d <= radius) {
        hitCount++;
        const nx = d > 0.01 ? dx / d : 0;
        const nz = d > 0.01 ? dz / d : 1;
        damageMonster(m, dmg, nx, nz, knock);
        if (slowSec > 0) m.slowTimer = Math.max(m.slowTimer, slowSec);
        if (stunSec > 0) m.stunTimer = Math.max(m.stunTimer, stunSec);
      }
    }
    return hitCount;
  }

  function spawnProjectile(fromX, fromY, fromZ, targetMonster, color, damage, speed, opts = {}) {
    const Engine = window.Engine;
    let mesh = null;
    if (Engine && Engine.vfxGroup) {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(opts.radius || 0.24, 10, 8),
        new THREE.MeshBasicMaterial({ color })
      );
      mesh.position.set(fromX, fromY, fromZ);
      Engine.vfxGroup.add(mesh);
    }
    runtime.projectiles.push({
      mesh,
      x: fromX,
      y: fromY,
      z: fromZ,
      target: targetMonster,
      fromMonster: !!opts.fromMonster,
      tx: opts.tx !== undefined ? opts.tx : targetMonster ? targetMonster.x : fromX,
      tz: opts.tz !== undefined ? opts.tz : targetMonster ? targetMonster.z : fromZ,
      damage,
      speed,
      aoeRadius: opts.aoeRadius || 0,
      slowSec: opts.slowSec || 0,
      color,
      life: 0,
      maxLife: 2.2,
    });
  }

  function getNearestMonster(x = player.x, z = player.z, maxRange = 20) {
    let best = null;
    let bestD = maxRange;
    for (const m of runtime.monsters) {
      if (m.hp <= 0) continue;
      const d = Math.hypot(m.x - x, m.z - z);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  function castSkill(skillId, silent = false) {
    if (runtime.gameOver) return false;
    const def = UPGRADE_DEFS[skillId];
    const lv = getUpgradeLevel(skillId);
    if (!def || lv <= 0) {
      if (!silent) showToast(`🔒 ${def ? def.title : "스킬"}을 먼저 상점에서 해금하세요!`);
      return false;
    }
    if ((runtime.skillCooldowns[skillId] || 0) > 0) return false;

    const target = getNearestMonster(player.x, player.z, 18);
    if (!target && skillId !== "s5") {
      if (!silent) showToast("👾 사거리 안에 공격할 몬스터가 없습니다!");
      return false;
    }

    runtime.skillCooldowns[skillId] = def.cooldown;
    player.swingTimer = player.swingDuration;
    playSkillSfx(skillId);

    if (skillId === "s1") {
      // ★1 Fireball Volley
      const bolts = 1 + Math.floor(lv / 4);
      const dmg = 38 * (1 + 0.35 * (lv - 1));
      for (let i = 0; i < bolts; i++) {
        const tgt = runtime.monsters[i % runtime.monsters.length] || target;
        spawnProjectile(player.x + (i - 0.5) * 0.3, 1.15, player.z, tgt, 0xff622e, dmg, 15.5, {
          radius: 0.28,
          aoeRadius: 2.2,
        });
      }
      spawnShockwaveRing(player.x, 0.12, player.z, 0xff7849, 2.0, 0.32);
    } else if (skillId === "s2") {
      // ★2 Frost Blizzard
      const dmg = 62 * (1 + 0.38 * (lv - 1));
      const tx = target.x;
      const tz = target.z;
      applyAoEDamage(tx, tz, 4.8, dmg, 1.5, 3.5, 0);
      spawnShockwaveRing(tx, 0.14, tz, 0x38bdf8, 4.8, 0.65);
      spawnBurstVfx(tx, 1.4, tz, 0x93e2ff, 14);
    } else if (skillId === "s3") {
      // ★3 Chain Thunderstorm
      const maxTargets = Math.min(runtime.monsters.length, 3 + Math.floor(lv / 2));
      const dmg = 88 * (1 + 0.40 * (lv - 1));
      for (let i = 0; i < maxTargets; i++) {
        const m = runtime.monsters[i];
        spawnLightningPillar(m.x, m.z, 0xfef08a, 0.38);
        spawnShockwaveRing(m.x, 0.10, m.z, 0x60a5fa, 2.4, 0.35);
        damageMonster(m, dmg, 0, 0, 0);
        m.stunTimer = Math.max(m.stunTimer, 0.7);
      }
    } else if (skillId === "s4") {
      // ★4 Meteor Storm
      const count = 3 + Math.floor(lv / 3);
      const dmg = 145 * (1 + 0.42 * (lv - 1));
      for (let i = 0; i < count; i++) {
        const m = runtime.monsters[i % runtime.monsters.length] || target;
        const ox = (Math.random() - 0.5) * 2.0;
        const oz = (Math.random() - 0.5) * 2.0;
        spawnMeteorStrike(m.x + ox, m.z + oz, dmg);
      }
    } else if (skillId === "s5") {
      // ★5 Aether Supernova + 30% Hero Heal
      const dmg = 240 * (1 + 0.45 * (lv - 1));
      applyAoEDamage(player.x, player.z, 10.5, dmg, 6.0, 2.0, 0.8);
      spawnShockwaveRing(player.x, 0.16, player.z, 0xe879f9, 10.2, 0.65);
      spawnShockwaveRing(player.x, 0.24, player.z, 0x38bdf8, 7.5, 0.55);
      spawnBurstVfx(player.x, 1.2, player.z, 0xfef08a, 16);
      const healAmt = Math.round(getHeroMaxHp() * 0.3);
      state.heroHp = Math.min(getHeroMaxHp(), state.heroHp + healAmt);
      spawnFloatingText(player.x, 2.4, player.z, `+❤️ ${healAmt}`, "#4ade80");
    }
    return true;
  }

  function applyHeroDamage(amount) {
    if (runtime.gameOver || runtime.combatGraceTimer > 0) return;
    const dmg = Math.max(1, Math.round(amount));
    state.heroHp = Math.max(0, state.heroHp - dmg);
    spawnFloatingText(player.x, 2.1, player.z, `-❤️ ${dmg}`, "#ff5b77");
    if (window.Engine && typeof window.Engine.addShake === "function") {
      window.Engine.addShake(0.18);
    }

    if (state.heroHp <= 0) {
      triggerGameOver();
    }
  }

  function triggerGameOver() {
    runtime.gameOver = true;
    playTone(196, 0.35, "sawtooth", 0.08);
    if (typeof document !== "undefined") {
      const badge = document.getElementById("gameover-badge");
      const title = document.getElementById("gameover-title");
      const desc = document.getElementById("gameover-desc");
      if (badge) badge.textContent = "💥 DEFEAT";
      if (title) title.textContent = `💔 WAVE ${state.wave}에서 체력이 모두 소진되었습니다!`;
      if (desc) desc.textContent = "보유 캐시로 방어 포탑과 ★1~★5 원소 스킬을 강화한 뒤 다시 도전하세요!";
      const modal = document.getElementById("gameover-modal");
      if (modal) modal.classList.add("open");
    }
    syncHUD(true);
  }

  function retryCurrentWave() {
    const Engine = window.Engine;
    for (const m of runtime.monsters) {
      if (Engine && Engine.unitGroup && m.entity && m.entity.root) {
        Engine.unitGroup.remove(m.entity.root);
      }
    }
    runtime.monsters.length = 0;
    for (const p of runtime.projectiles) {
      if (Engine && Engine.vfxGroup && p.mesh) Engine.vfxGroup.remove(p.mesh);
    }
    runtime.projectiles.length = 0;
    runtime.waveActive = false;
    runtime.waveTimer = 15.0; // Brief prep before retry, or player clicks 즉시 시작
    runtime.gameOver = false;
    state.heroHp = getHeroMaxHp();
    player.x = 0;
    player.z = 2.0;

    if (typeof document !== "undefined") {
      const modal = document.getElementById("gameover-modal");
      if (modal) modal.classList.remove("open");
    }
    showToast(`🔄 체력 100% 회복! WAVE ${state.wave} 재도전 준비 완료!`);
    syncHUD(true);
  }

  function updateCombatAndDefense(dt) {
    if (runtime.gameOver) return;
    if (runtime.combatGraceTimer > 0) runtime.combatGraceTimer -= dt;

    // 1. Skill Cooldowns & Auto-Cast
    for (const sid of SKILL_IDS) {
      if (runtime.skillCooldowns[sid] > 0) {
        runtime.skillCooldowns[sid] = Math.max(0, runtime.skillCooldowns[sid] - dt);
      }
    }

    if (state.autoSkill && runtime.monsters.length > 0) {
      const near = getNearestMonster(player.x, player.z, 12.5);
      if (near) {
        for (let i = SKILL_IDS.length - 1; i >= 0; i--) {
          const sid = SKILL_IDS[i];
          if (getUpgradeLevel(sid) > 0 && runtime.skillCooldowns[sid] <= 0) {
            castSkill(sid, true);
            break;
          }
        }
      }
    }

    // 2. Passive Hero Regen & Defense Turrets / Aegis Shrine
    const maxHp = getHeroMaxHp();
    const regenRate = (runtime.waveActive ? 0 : 4.0) + state.shrineAegisLv * 3.0;
    if (state.heroHp < maxHp && regenRate > 0) {
      state.heroHp = Math.min(maxHp, state.heroHp + regenRate * dt);
    }

    for (const id of DEFENSE_IDS) {
      const t = runtime.turrets[id];
      if (!t || t.lv <= 0) continue;
      if (t.cooldown > 0) t.cooldown -= dt;
      const target = getNearestMonster(t.x, t.z, 16.5);
      window.Entities.animateDefenseTurret(t.entity, !!target, dt);

      if (target && t.cooldown <= 0) {
        if (id === "turret_flame") {
          t.cooldown = Math.max(0.7, 1.85 - t.lv * 0.08);
          spawnProjectile(t.x, 1.35, t.z, target, 0xff5a28, 32 + t.lv * 18, 13.5, { radius: 0.30, aoeRadius: 2.6 });
        } else if (id === "turret_frost") {
          t.cooldown = Math.max(0.65, 1.55 - t.lv * 0.07);
          spawnProjectile(t.x, 1.45, t.z, target, 0x38bdf8, 24 + t.lv * 14, 15.0, { radius: 0.26, slowSec: 2.5 });
        } else if (id === "turret_thunder") {
          t.cooldown = Math.max(0.9, 2.2 - t.lv * 0.09);
          const count = Math.min(runtime.monsters.length, 2 + Math.floor(t.lv / 3));
          for (let ci = 0; ci < count; ci++) {
            const m = runtime.monsters[ci];
            spawnLightningPillar(m.x, m.z, 0xc084fc, 0.30);
            damageMonster(m, 42 + t.lv * 22);
          }
        } else if (id === "shrine_aegis") {
          const closeDist = Math.hypot(target.x - player.x, target.z - player.z);
          if (closeDist < 4.5) {
            t.cooldown = 4.2;
            applyAoEDamage(player.x, player.z, 4.8, 20 + t.lv * 12, 7.0, 1.5, 0);
            spawnShockwaveRing(player.x, 0.12, player.z, 0x4ade80, 4.8, 0.45);
          }
        }
      }
    }

    // 3. Wave Timer Countdown (always ticking cleanly from 03:00!)
    if (!runtime.waveActive && !state.allWavesCleared) {
      runtime.waveTimer -= dt;
      if (runtime.waveTimer <= 0) {
        spawnWaveTrio(state.wave);
      }
    }

    // 4. Monster AI & Deaths
    const Engine = window.Engine;
    for (let i = runtime.monsters.length - 1; i >= 0; i--) {
      const m = runtime.monsters[i];
      if (m.hp <= 0) {
        if (Engine && Engine.unitGroup && m.entity && m.entity.root) {
          Engine.unitGroup.remove(m.entity.root);
        }
        spawnBurstVfx(m.x, 0.8, m.z, 0x4ade80, 10);
        state.gems += m.reward;
        state.totalEarnedGems += m.reward;
        spawnFloatingText(m.x, 1.8, m.z, `+💵 ${m.reward}`, "#4ade80");
        addXp(18);
        playGemChime(4);
        runtime.monsters.splice(i, 1);
        continue;
      }

      if (m.slowTimer > 0) m.slowTimer = Math.max(0, m.slowTimer - dt);
      if (m.stunTimer > 0) m.stunTimer = Math.max(0, m.stunTimer - dt);
      if (m.atkTimer > 0) m.atkTimer -= dt;

      // Apply knockback velocity damping
      m.x += m.vx * dt;
      m.z += m.vz * dt;
      m.vx *= Math.exp(-8 * dt);
      m.vz *= Math.exp(-8 * dt);

      const dx = player.x - m.x;
      const dz = player.z - m.z;
      const dist = Math.hypot(dx, dz);

      if (m.stunTimer <= 0) {
        if (dist > m.range) {
          const spd = m.speed * (m.slowTimer > 0 ? 0.5 : 1.0);
          m.x += (dx / dist) * Math.min(dist - m.range * 0.8, spd * dt);
          m.z += (dz / dist) * Math.min(dist - m.range * 0.8, spd * dt);
        } else if (m.atkTimer <= 0) {
          m.atkTimer = m.atkCd;
          if (m.species === "shroom") {
            spawnProjectile(m.x, 0.9, m.z, null, 0xf472b6, m.atk, 9.5, {
              fromMonster: true,
              tx: player.x,
              tz: player.z,
              radius: 0.24,
            });
          } else {
            applyHeroDamage(m.atk);
            spawnBurstVfx(player.x, 0.9, player.z, 0xff4d6d, 5);
          }
        }
      }

      m.entity.root.position.set(m.x, 0, m.z);
      if (dist > 0.1) m.entity.root.rotation.y = Math.atan2(dx, dz);
      window.Entities.animateCuteMonster(m.entity, dt, m.slowTimer > 0);
    }

    // 5. Projectiles (Hero/Turret & Shroom Spore Shots)
    for (let i = runtime.projectiles.length - 1; i >= 0; i--) {
      const p = runtime.projectiles[i];
      p.life += dt;
      if (!p.fromMonster && p.target && p.target.hp > 0) {
        p.tx = p.target.x;
        p.tz = p.target.z;
      }
      const dx = p.tx - p.x;
      const dz = p.tz - p.z;
      const dist = Math.hypot(dx, dz);
      const stepDist = p.speed * dt;
      if (dist <= stepDist + 0.35 || p.life >= p.maxLife) {
        if (p.fromMonster) {
          if (Math.hypot(player.x - p.x, player.z - p.z) < 1.35) {
            applyHeroDamage(p.damage);
          }
          spawnBurstVfx(p.x, 0.7, p.z, 0xf472b6, 4);
        } else {
          if (p.aoeRadius > 0) {
            applyAoEDamage(p.tx, p.tz, p.aoeRadius, p.damage, 2.2, p.slowSec, 0);
            spawnShockwaveRing(p.tx, 0.1, p.tz, p.color, p.aoeRadius, 0.35);
          } else if (p.target && p.target.hp > 0) {
            damageMonster(p.target, p.damage);
            if (p.slowSec > 0) p.target.slowTimer = Math.max(p.target.slowTimer, p.slowSec);
          }
          spawnBurstVfx(p.tx, 0.85, p.tz, p.color, 6);
        }
        if (Engine && Engine.vfxGroup && p.mesh) Engine.vfxGroup.remove(p.mesh);
        runtime.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * stepDist;
        p.z += (dz / dist) * stepDist;
        if (p.mesh) p.mesh.position.set(p.x, p.y, p.z);
      }
    }

    // 6. Wave Clear Progression (1 ~ 10)
    if (runtime.waveActive && runtime.monsters.length === 0) {
      runtime.waveActive = false;
      const clearedW = state.wave;
      const bonus = 80 * clearedW;
      state.gems += bonus;
      state.totalEarnedGems += bonus;
      playBuildPop();
      spawnFloatingText(player.x, 2.5, player.z, `🎉 WAVE ${clearedW} 클리어 +💵 ${bonus}`, "#fde047");

      if (clearedW < 10) {
        state.wave = clearedW + 1;
        runtime.waveTimer = WAVE_INTERVAL;
        showToast(`🏆 WAVE ${clearedW} 수호 성공! 보너스 💵 ${bonus} · 다음 웨이브 3분 뒤 시작`);
      } else {
        state.allWavesCleared = true;
        runtime.waveTimer = 0;
        showToast("👑 축하합니다! 10단계 달콤숲 대침공을 모두 막아냈습니다!");
      }
      saveGame();
      syncHUD(true);
    }
  }

  // ---------------------------------------------------------------------------
  // Tycoon Movement, Harvesting, Facilities, Pedestals & Workers
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
      if (obj.z > -18.0) obj.x = Math.max(5.5, Math.min(10.5, obj.x));
      else obj.x = Math.max(2.6, Math.min(17.8, obj.x));
    } else if (inNwFarm) {
      obj.z = Math.max(-29.8, Math.min(-16.0, obj.z));
      if (obj.z > -18.0) obj.x = Math.max(-10.5, Math.min(-5.5, obj.x));
      else obj.x = Math.max(-17.8, Math.min(-2.6, obj.x));
    }

    const boxes = [{ cx: STALL_POS.x, cz: STALL_POS.z, hw: 1.55 + radius, hd: 0.95 + radius }];
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
        if (ox < oz) obj.x += dx >= 0 ? ox : -ox;
        else obj.z += dz >= 0 ? oz : -oz;
      }
    }
  }

  function updatePlayerMovement(dt) {
    if (runtime.gameOver) return;
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
    const smooth = 1 - Math.exp(-16 * dt);
    player.vx += (ix * maxSpd - player.vx) * smooth;
    player.vz += (iz * maxSpd - player.vz) * smooth;

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

    if (player.swingTimer > 0) player.swingTimer = Math.max(0, player.swingTimer - dt);

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
      spawnFloatingText(node.x, 1.75, node.z, `+${amount} ${meta.icon} ${meta.short}`, isOre ? "#7be3ff" : "#80ff9e");
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
          if (node.entity && node.entity.visualRoot) node.entity.visualRoot.scale.set(1, 1, 1);
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
        const yieldCount = Math.min(bagCap - player.bagItems.length, getHeroHarvestYield());
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

    for (const m of runtime.machines) {
      if (m.lv <= 0) continue;
      let inPulse = 0;
      let inBPulse = 0;

      if (Math.hypot(player.x - m.cfg.inPos.x, player.z - m.cfg.inPos.z) < 2.25) {
        inPulse = 1;
        if (player.transferCooldown <= 0) {
          transferTypedFromBagToQueue(m.cfg.inputType, m.cfg.inPos.x, m.cfg.inPos.z, m.inQueue, 24);
        }
      }
      if (m.inPalletB && m.cfg.inPosB && Math.hypot(player.x - m.cfg.inPosB.x, player.z - m.cfg.inPosB.z) < 2.25) {
        inBPulse = 1;
        if (player.transferCooldown <= 0) {
          transferTypedFromBagToQueue(m.cfg.inputTypeB, m.cfg.inPosB.x, m.cfg.inPosB.z, m.inQueueB, 24);
        }
      }

      window.Entities.updateWoodenPalletZone(m.inPallet, inPulse, runtime.time);
      if (m.inPalletB) window.Entities.updateWoodenPalletZone(m.inPalletB, inBPulse, runtime.time);
      if (m.dockPallet) window.Entities.updateWoodenPalletZone(m.dockPallet, m.outQueue.length > 0 ? 1 : 0, runtime.time);

      const hasInputs = m.cfg.inPosB ? m.inQueue.length > 0 && m.inQueueB.length > 0 : m.inQueue.length > 0;
      const isProcessing = hasInputs && m.outQueue.length < 24;
      if (isProcessing) {
        const speedMult = 1 + (m.lv - 1) * 0.28;
        m.craftProgress += (dt * speedMult) / m.cfg.baseCraftTime;
        if (m.craftProgress >= 1) {
          m.craftProgress -= 1;
          m.inQueue.shift();
          if (m.cfg.inPosB) m.inQueueB.shift();
          m.outQueue.push(m.cfg.outputType);
          spawnBurstVfx(m.cfg.outPos.x, 1.15, m.cfg.outPos.z, 0xffe066, 4);
        }
      } else if (!hasInputs) {
        m.craftProgress = 0;
      }

      window.Entities.animateProductionMachine(m.entity, isProcessing, dt);
      syncCrateStackVisuals(m.inPallet.stackAnchor, m.inQueue, m.inVisuals, { cols: 2, rows: 2, xStep: 1.0, zStep: 0.68, maxDraw: 24 });
      if (m.inPalletB) syncCrateStackVisuals(m.inPalletB.stackAnchor, m.inQueueB, m.inVisualsB, { cols: 2, rows: 2, xStep: 1.0, zStep: 0.68, maxDraw: 24 });
      if (m.showcase && m.showcase.stockAnchor) syncCrateStackVisuals(m.showcase.stockAnchor, m.outQueue, m.outVisuals, { cols: 2, rows: 1, xStep: 1.02, zStep: 0.72, maxDraw: 16 });
      else if (m.dockPallet && m.dockPallet.stackAnchor) syncCrateStackVisuals(m.dockPallet.stackAnchor, m.outQueue, m.outVisuals, { cols: 2, rows: 2, xStep: 1.02, zStep: 0.72, maxDraw: 20 });
    }

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
      if (m3.outQueue.length >= 1) w.state = "arriving";
      else if (w.timer <= 0) w.timer = 2.0;
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
        addCashToPedestal(3, m3.cfg.salePrice);
        spawnBurstVfx(m3.cfg.cashPos.x, 1.4, m3.cfg.cashPos.z, 0x2ecc71, 10);
        spawnFloatingText(m3.cfg.cashPos.x, 2.2, m3.cfg.cashPos.z, "+💵 300 👑", "#ffe36e");
        playGemChime(14);
      }
      if (w.timer <= 0 && m3.outQueue.length === 0) w.state = "departing";
      else if (w.timer <= 0) w.timer = 0.35;
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
    if (window.Entities.animateRoyalTradeWagon) window.Entities.animateRoyalTradeWagon(w.entity, spd, dt);
    if (w.entity.cargoMount) {
      const dummyCargo = new Array(Math.min(w.cargoCount, 6)).fill("royal_elixir");
      syncCrateStackVisuals(w.entity.cargoMount, dummyCargo, w.cargoVisuals, { cols: 1, yStep: 0.21, maxDraw: 6 });
    }
  }

  function updateCustomersAndCashPedestals(dt) {
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
        lead.targetZ = STALL_POS.z + 9.2;
      }
    }
    advanceCustomerQueue(runtime.customers, dt, STALL_POS.x + 0.3, STALL_POS.z + 2.2, 1.55, Math.PI, -2.4, STALL_POS.z + 9.2);

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
      advanceCustomerQueue(m.customers, dt, m.cfg.custQueueX, m.cfg.custQueueZ0, 1.35, -Math.PI * 0.5, 1.4, m.cfg.custQueueZ0 + 6.8);
    }

    updateWagon(dt);

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
            if (f.bag.length >= cap) f.state = "deliver";
          }
        }
      } else {
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
          if (f.bag.length === 0) f.state = "seek_node";
          else if (!hasHerb && destPos === SELL_PALLET_POS) {
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
      syncCrateStackVisuals(f.entity.bagAnchor, f.bag, f.bagVisuals, { cols: 1, yStep: 0.21, maxDraw: 10 });
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
        ? [{ x: 24.0, z: -6.2 }, { x: 32.0, z: -6.2 }, { x: 32.0, z: 6.2 }, { x: 24.0, z: 6.2 }]
        : [{ x: 24.0, z: -7.5 }, { x: 32.0, z: -7.5 }, { x: 32.0, z: -4.5 }, { x: 24.0, z: -4.5 }];
      const wp = waypoints[tr.waypointIdx % waypoints.length];
      tx = wp.x;
      tz = wp.z;
      if (Math.hypot(tx - tr.x, tz - tr.z) < 1.2) tr.waypointIdx = (tr.waypointIdx + 1) % waypoints.length;

      for (const node of runtime.farmNodes) {
        if (!isZoneUnlocked(node.zone) || node.respawnTimer > 0) continue;
        if (tr.bag.length >= maxCargo) break;
        if (Math.hypot(node.x - tr.x, node.z - tr.z) < 3.2) harvestNode(node, 1, tr.bag, tr.x, tr.z, false);
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
    syncCrateStackVisuals(tr.entity.cargoAnchor, tr.bag, tr.bagVisuals, { cols: 1, yStep: 0.21, maxDraw: 14 });
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
          if (Math.floor(runtime.time * 16) !== Math.floor((runtime.time - dt) * 16)) playTone(720, 0.04, "sine", 0.03);
          if (state.padPaid[sp.id] >= cost) applyUpgradeLevel(sp.id);
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

    const nearestMon = getNearestMonster(player.x, player.z, 30);
    const bagCap = getHeroBagCap();
    const hasOre = player.bagItems.includes("blue_ore");
    const hasHerb = player.bagItems.includes("rainbow_herb");
    const m1 = runtime.machines[0];
    const m2 = runtime.machines[1];
    const m3 = runtime.machines[2];

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
    let stepLabel = "광석 채집";
    let guideText = "⛏️ 동쪽 광산에서 푸른 광석을 캐세요!";
    let colorHex = 0xffe629;

    if (nearestMon) {
      tx = nearestMon.x;
      tz = nearestMon.z;
      stepLabel = `⚔️ WAVE ${state.wave} 방어`;
      guideText = "⚔️ 귀여운 몬스터 삼총사를 원소 스킬(1~5)과 포탑으로 막아내세요!";
      colorHex = 0xff5b77;
    } else if (nearestCashPed) {
      tx = nearestCashPed.x;
      tz = nearestCashPed.z;
      stepLabel = "💵 돈 받기";
      guideText = "💵 '돈 받는 곳' 발판으로 가서 지폐 다발을 흡수하세요!";
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
    } else if (state.turretFlameLv === 0 && state.gems >= getUpgradeCost("turret_flame")) {
      tx = UPGRADE_DEFS.turret_flame.padPos.x;
      tz = UPGRADE_DEFS.turret_flame.padPos.z;
      stepLabel = "🛡️ 디펜스 건설";
      guideText = "🔥 3분 웨이브에 대비해 [화염 연금 포탑]을 건설하세요!";
      colorHex = 0xff6b4a;
    } else if (state.m3Lv === 0 && state.gems >= getUpgradeCost("m3")) {
      tx = MACHINE_CONFIGS[2].padPos.x;
      tz = MACHINE_CONFIGS[2].padPos.z;
      stepLabel = "3호기 해금";
      guideText = "👑 [3호기 합체소]를 지어 VIP 무역 마차 💵 300 잭팟을 여세요!";
      colorHex = 0xff9f43;
    } else if (
      player.bagItems.length >= bagCap ||
      ((hasOre || hasHerb) && player.bagItems.length >= (state.totalEarnedGems < 60 ? 3 : 5))
    ) {
      if (hasHerb && m3 && m3.lv > 0 && m3.inQueueB.length < 18 && (!m2 || m3.inQueueB.length <= m2.inQueue.length)) {
        tx = m3.cfg.inPosB.x;
        tz = m3.cfg.inPosB.z;
        stepLabel = "3호기 약초 투입";
        guideText = "🌿 3호기 합체소 [약초 넣는 곳]에 무지개 약초를 넣으세요!";
        colorHex = 0xff9f43;
      } else if (hasHerb && m2 && m2.lv > 0) {
        tx = m2.cfg.inPos.x;
        tz = m2.cfg.inPos.z;
        stepLabel = "2호기 약초 투입";
        guideText = "⚗️ 2호기 가마솥 [약초 넣는 곳]에 넣으면 💵 80 포션이 자동 판매됩니다!";
        colorHex = 0x52ff9b;
      } else if (hasOre && m3 && m3.lv > 0 && m3.inQueue.length < 18 && (!m1 || m3.inQueue.length <= m1.inQueue.length)) {
        tx = m3.cfg.inPos.x;
        tz = m3.cfg.inPos.z;
        stepLabel = "3호기 광석 투입";
        guideText = "⛏️ 3호기 합체소 [광석 넣는 곳]에 푸른 광석을 넣으세요!";
        colorHex = 0xff9f43;
      } else if (hasOre && m1 && m1.lv > 0) {
        tx = m1.cfg.inPos.x;
        tz = m1.cfg.inPos.z;
        stepLabel = "1호기 광석 투입";
        guideText = "⚙️ 1호기 세공기 [광석 넣는 곳]에 넣으면 💵 35 보석이 자동 진열됩니다!";
        colorHex = 0xd67aff;
      } else {
        tx = SELL_PALLET_POS.x;
        tz = SELL_PALLET_POS.z;
        stepLabel = "원석 판매";
        guideText = "📦 서쪽 [광석 파는 곳]에 푸른 광석을 올려 💵 10에 판매하세요!";
        colorHex = 0x38bdf8;
      }
    } else {
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
  // HUD, Wave Timer, Skill Hotbar, Over-Head Bag HUD & Modern Card Modal
  // ---------------------------------------------------------------------------
  function formatMMSS(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  }

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

    const countsStr =
      oreCount > 0 && herbCount > 0
        ? `⛏️ 광석 ${oreCount} | 🌿 약초 ${herbCount}`
        : oreCount > 0
        ? `⛏️ 광석 ${oreCount}`
        : herbCount > 0
        ? `🌿 약초 ${herbCount}`
        : `📦 ${total}`;

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
      floatEl.style.left = `${Math.round(Math.max(85, Math.min(vw - 85, sp.x)))}px`;
      floatEl.style.top = `${Math.round(Math.max(92, Math.min(vh - 50, sp.y)))}px`;
      floatEl.style.display = "block";
    }
  }

  function syncHUD(force = false) {
    if (typeof document === "undefined") return;
    updateHeroBagOverlay();

    if (!force && runtime.time - runtime.lastHudSync < 0.08) return;
    runtime.lastHudSync = runtime.time;

    const bagCap = getHeroBagCap();
    const maxHp = getHeroMaxHp();
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
    setText("ui-hp", `${Math.ceil(state.heroHp)} / ${maxHp}`);
    setWidth("ui-hp-fill", (state.heroHp / maxHp) * 100);
    setText("ui-gems", state.gems.toLocaleString());
    setText("ui-shop-cash", `💵 ${state.gems.toLocaleString()}`);

    // Top-Center Wave HUD
    const waveHud = document.getElementById("wave-hud");
    if (waveHud) waveHud.classList.toggle("combat-active", runtime.waveActive);
    setText("ui-wave-badge", `🌊 WAVE ${state.wave} / 10`);
    if (state.allWavesCleared) {
      setText("ui-wave-timer", "🏆 10웨이브 완파!");
      setText("ui-wave-monsters", "공방 평화 달성");
    } else if (runtime.waveActive) {
      setText("ui-wave-timer", "⚔️ 교전 중!");
      setText("ui-wave-monsters", `남은 몬스터 ${runtime.monsters.length} / ${runtime.waveSpawnCount}`);
    } else {
      setText("ui-wave-timer", `다음 습격 ${formatMMSS(runtime.waveTimer)}`);
      setText("ui-wave-monsters", "정비 시간");
    }

    // Skill Hotbar Slots
    for (const sid of SKILL_IDS) {
      const def = UPGRADE_DEFS[sid];
      const lv = getUpgradeLevel(sid);
      const slot = document.getElementById(`skill-slot-${sid}`);
      const lvEl = document.getElementById(`skill-lv-${sid}`);
      const cdEl = document.getElementById(`skill-cd-${sid}`);
      if (slot) {
        slot.classList.toggle("unlocked", lv > 0);
        slot.classList.toggle("locked", lv <= 0);
      }
      if (lvEl) lvEl.textContent = lv > 0 ? `Lv.${lv}` : "잠금";
      if (cdEl) {
        const cdPct = lv > 0 ? Math.min(100, ((runtime.skillCooldowns[sid] || 0) / def.cooldown) * 100) : 0;
        cdEl.style.height = `${cdPct}%`;
      }
    }
    const autoBtn = document.getElementById("btn-auto-skill");
    if (autoBtn) {
      autoBtn.classList.toggle("on", !!state.autoSkill);
      autoBtn.textContent = state.autoSkill ? "AUTO ON" : "AUTO OFF";
    }

    const statsEl = document.getElementById("ui-shop-stats");
    if (statsEl) {
      const spdPct = Math.round((getHeroMoveSpeed() / 7.6) * 100);
      statsEl.textContent = `이동 ${spdPct}% · 요정 ${state.fairyCount}/15 · WAVE ${state.wave}/10 · ${Math.round(runtime.fpsSmooth)} FPS`;
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

    const items = Object.values(UPGRADE_DEFS).filter((d) => d.tab === runtime.shopTab);
    const grid = document.createElement("div");
    grid.className = "shop-grid";

    for (const def of items) {
      const lv = getUpgradeLevel(def.id);
      const isMax = isUpgradeMax(def.id);
      const cost = getUpgradeCost(def.id);
      const afford = !isMax && state.gems >= cost;
      const pct = Math.min(100, (lv / def.maxLv) * 100);

      const card = document.createElement("div");
      card.className = "shop-item";
      card.innerHTML = `
        <div class="shop-item-top">
          <div class="shop-item-icon">${def.icon}</div>
          <div class="shop-item-info">
            <div class="shop-item-title-row">
              <span class="shop-item-title">${def.title}</span>
              ${def.stars ? `<span class="shop-item-stars">★${def.stars}</span>` : ""}
              <span class="lv-badge">${isMax ? "MAX" : `Lv.${lv}/${def.maxLv}`}</span>
            </div>
            <div class="shop-item-desc">${def.desc}</div>
          </div>
        </div>
        <div class="shop-item-bottom">
          <div class="shop-item-prog-wrap">
            <div class="shop-item-prog-fill" style="width:${pct}%"></div>
          </div>
          <button class="shop-buy-btn ${afford ? "afford" : "locked"}" data-upgrade-id="${def.id}" ${isMax || !afford ? "disabled" : ""}>
            ${isMax ? "MAX" : lv === 0 && (def.tab === "skills" || def.tab === "defense") ? `해금 💵 ${cost}` : `💵 ${cost}`}
          </button>
        </div>
      `;
      const btn = card.querySelector("button");
      if (btn) {
        btn.addEventListener("click", () => {
          purchaseUpgradeDirect(def.id);
          syncHUD(true);
        });
      }
      grid.appendChild(card);
    }

    body.innerHTML = "";
    body.appendChild(grid);
  }

  // ---------------------------------------------------------------------------
  // Save / Load / Reset & Input Binding
  // ---------------------------------------------------------------------------
  function saveGame() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {}
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
    } catch (e) {}
  }

  function resetGame() {
    Object.assign(state, createDefaultState());
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (e) {}
    }
    const Engine = window.Engine;
    player.x = 0;
    player.z = 2.0;
    player.vx = 0;
    player.vz = 0;
    player.bagItems.length = 0;
    runtime.sellPalletQueue.length = 0;
    runtime.waveTimer = WAVE_INTERVAL;
    runtime.waveActive = false;
    runtime.gameOver = false;
    runtime.skillCooldowns = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };

    for (const m of runtime.monsters) {
      if (Engine && Engine.unitGroup && m.entity && m.entity.root) Engine.unitGroup.remove(m.entity.root);
    }
    runtime.monsters.length = 0;
    for (const p of runtime.projectiles) {
      if (Engine && Engine.vfxGroup && p.mesh) Engine.vfxGroup.remove(p.mesh);
    }
    runtime.projectiles.length = 0;
    for (const fx of runtime.fxMeshes) {
      if (Engine && Engine.vfxGroup && fx.mesh) Engine.vfxGroup.remove(fx.mesh);
    }
    runtime.fxMeshes.length = 0;
    for (const p of runtime.pedestals) {
      p.cashValues.length = 0;
      syncCashPedestalVisuals(p);
    }
    for (const f of runtime.flyingBricks) {
      if (Engine && Engine.vfxGroup && f.mesh) Engine.vfxGroup.remove(f.mesh);
    }
    runtime.flyingBricks.length = 0;
    for (const p of runtime.particles) {
      if (Engine && Engine.vfxGroup && p.mesh) Engine.vfxGroup.remove(p.mesh);
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

    if (typeof document !== "undefined") {
      const gm = document.getElementById("gameover-modal");
      if (gm) gm.classList.remove("open");
    }

    refreshFarmZoneVisibility();
    refreshFacilityVisibility();
    refreshDefenseTurretsVisibility();
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
    showToast("💵 새로운 연금술 디펜스 공방이 시작되었습니다!");
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
      if (e.code === "Digit1") castSkill("s1");
      else if (e.code === "Digit2") castSkill("s2");
      else if (e.code === "Digit3") castSkill("s3");
      else if (e.code === "Digit4") castSkill("s4");
      else if (e.code === "Digit5") castSkill("s5");
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
    clickBind("btn-wave-now", () => startWaveNow());
    clickBind("btn-auto-skill", () => {
      state.autoSkill = !state.autoSkill;
      syncHUD(true);
    });
    clickBind("btn-retry-wave", () => retryCurrentWave());
    clickBind("btn-gameover-reset", () => resetGame());
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
    document.querySelectorAll(".skill-slot").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.skillId) castSkill(btn.dataset.skillId);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Main Simulation Step & Initialization
  // ---------------------------------------------------------------------------
  function step(dt) {
    if (!_initialized) return;
    const stepDt = Math.min(0.05, Math.max(0.001, dt || 0.016));
    runtime.time += stepDt;
    if (stepDt > 0.001) runtime.fpsSmooth = runtime.fpsSmooth * 0.92 + (1 / stepDt) * 0.08;

    updatePlayerMovement(stepDt);
    updateNodesAndHeroHarvest(stepDt);
    updatePalletsAndHeroTransfers(stepDt);
    updateCustomersAndCashPedestals(stepDt);
    updateFairies(stepDt);
    updateHarvesterTruck(stepDt);
    updateStepPads(stepDt);
    updateCombatAndDefense(stepDt);
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
      } catch (e) {}
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
    buildDefenseTurrets();
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
    SKILL_IDS,
    DEFENSE_IDS,
    WAVE_INTERVAL,
    init,
    step,
    startWaveNow,
    castSkill,
    retryCurrentWave,
    purchaseUpgradeDirect,
    getHeroMaxHp,
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
