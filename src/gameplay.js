// =============================================================================
// src/gameplay.js - 20-Wave Territory Expansion, Lv.20 Mastery Milestones,
// 4 Alchemy Labs, 9 Production Facilities + Vehicles & Overhead Billboard UI
// =============================================================================

(function () {
  "use strict";

  const SAVE_KEY = "fairy_alchemy_tycoon_v10";
  const TOTAL_WAVES = 20;
  const FIRST_WAVE_DELAY = 600; // 10 minutes before Wave 1!
  const WAVE_INTERVAL = 180; // 3 minutes between subsequent waves
  const WAVE_TOTAL_MONSTERS = 60;
  const WAVE_BATCH_SIZE = 10;
  const WAVE_BATCH_INTERVAL = 10.0; // 10 monsters every 10s over 60s = 60 monsters
  const GATE_POS = { x: 24.0, z: 0.0 };
  const SOUTH_GATE_POS = { x: 0.0, z: 20.0 };
  const HERO_SPAWN = { x: 0.0, z: 3.5 };
  const ALCHEMY_LAB_POS = { x: -5.5, z: -2.5 };
  const ALCHEMY_LAB_IN_POS = { x: -9.2, z: -2.5 };
  const ALCHEMY_LAB_PAD_POS = { x: -5.5, z: 2.8 };
  const HERO_ATTACK_RANGE = 8.0;
  const TURRET_ATTACK_RANGE = 9.0;

  const ERA_INFO = {
    1: { era: 1, maxCap: 5, name: "Era 1 · 기본 공방 타운", nextText: "🗺️ 다음 확장: Wave 6 (정령 공학 지구)" },
    2: { era: 2, maxCap: 10, name: "Era 2 · 정령 공학 지구", nextText: "🗺️ 다음 확장: Wave 11 (번개 제련 단지)" },
    3: { era: 3, maxCap: 15, name: "Era 3 · 번개 제련 단지", nextText: "🗺️ 다음 확장: Wave 16 (황금 대성채)" },
    4: { era: 4, maxCap: 20, name: "Era 4 · 황금 대성채 & 비공정 부두", nextText: "👑 최종 영토 대성채 완전 해금!" },
  };

  const LAB_CONFIGS = [
    {
      id: "alchemy_lab",
      kind: "alchemy_lab",
      stateKey: "alchemyLabLv",
      era: 1,
      title: "🔮 제1연금술 연구소",
      inputType: "blue_ore",
      accent: "#c084fc",
      pos: ALCHEMY_LAB_POS,
      inPos: ALCHEMY_LAB_IN_POS,
      padPos: ALCHEMY_LAB_PAD_POS,
      inLabel: "◀ 서쪽 · 🔮 광석→에너지",
    },
    {
      id: "alchemy_lab_2",
      kind: "alchemy_lab_2",
      stateKey: "alchemyLab2Lv",
      era: 2,
      title: "🏭 제2연구소 [물류 공학동]",
      inputType: "fire_mana_stone",
      accent: "#38bdf8",
      pos: { x: -11.8, z: -21.6 },
      inPos: { x: -15.2, z: -21.6 },
      padPos: { x: -8.4, z: -21.6 },
      inLabel: "◀ 화염마나석→차원 에너지",
    },
    {
      id: "alchemy_lab_3",
      kind: "alchemy_lab_3",
      stateKey: "alchemyLab3Lv",
      era: 3,
      title: "⚡ 제3연구소 [연성 증폭동]",
      inputType: "lightning_crystal",
      accent: "#e879f9",
      pos: { x: 11.8, z: -21.4 },
      inPos: { x: 14.8, z: -21.4 },
      padPos: { x: 8.8, z: -21.4 },
      inLabel: "▶ 번개수정→차원 에너지",
    },
    {
      id: "alchemy_lab_4",
      kind: "alchemy_lab_4",
      stateKey: "alchemyLab4Lv",
      era: 4,
      title: "👑 제4연구소 [현자의 마탑]",
      inputType: "star_meteorite",
      accent: "#facc15",
      pos: { x: 0.0, z: -38.0 },
      inPos: { x: -3.8, z: -38.0 },
      padPos: { x: 0.0, z: -34.2 },
      inLabel: "◀ 운석→고차원 에너지",
    },
  ];

  const ITEM_META = {
    blue_ore: { label: "푸른 광석", short: "광석", icon: "⛏️", val: 10 },
    rainbow_herb: { label: "무지개 약초", short: "약초", icon: "🌿", val: 10 },
    fire_mana_stone: { label: "화염 마나석", short: "화염석", icon: "🔥", val: 45 },
    spirit_dew: { label: "정령의 이슬", short: "이슬", icon: "💧", val: 55 },
    lightning_crystal: { label: "번개 수정", short: "번개석", icon: "⚡", val: 110 },
    moon_mushroom: { label: "달빛 버섯", short: "버섯", icon: "🍄", val: 140 },
    star_meteorite: { label: "별똥별 운석", short: "운석", icon: "🌟", val: 350 },
    dragon_scale_flower: { label: "용의 비늘꽃", short: "비늘꽃", icon: "🌺", val: 420 },
    cut_gem: { label: "세공 보석", short: "세공보석", icon: "💠", val: 45 },
    magic_potion: { label: "마법 포션", short: "포션", icon: "🧪", val: 140 },
    royal_elixir: { label: "황실 엘릭서", short: "엘릭서", icon: "👑", val: 360 },
    fire_runestone: { label: "화염 룬스톤", short: "룬스톤", icon: "🪨🔥", val: 750 },
    spirit_music_box: { label: "정령 오르골", short: "오르골", icon: "🎵", val: 1800 },
    arcane_core: { label: "번개 마도핵", short: "마도핵", icon: "⚡🔮", val: 4500 },
    moon_perfume: { label: "달빛 향수", short: "향수", icon: "🌺✨", val: 11000 },
    philosopher_stone: { label: "현자의 돌", short: "현자돌", icon: "💎👑", val: 30000 },
  };

  const UPGRADE_DEFS = {
    tool: {
      id: "tool",
      tab: "wizard",
      dirLabel: "◀ 서쪽",
      icon: "⛏️",
      title: "채집 곡괭이 (생산 능력)",
      desc: "초반 캐시(💵)로 강화 (최대 2회)! Lv.1 채집 속도·범위↑ · Lv.2 2개씩 채집+자석 범위 확대.",
      accent: "#52efff",
      baseCost: 35,
      mult: 2.2,
      maxLv: 2,
    },
    bag: {
      id: "bag",
      tab: "wizard",
      dirLabel: "▼ 남쪽",
      icon: "🎒",
      title: "배낭 적재",
      desc: "초반 캐시(💵)로 강화 (최대 2회)! 등 뒤 지게 적재 칸을 늘립니다 (16→24→34).",
      accent: "#ffd24c",
      baseCost: 30,
      mult: 2.0,
      maxLv: 2,
    },
    speed: {
      id: "speed",
      tab: "wizard",
      dirLabel: "▶ 동쪽",
      icon: "👢",
      title: "신속 부츠",
      desc: "초반 캐시(💵)로 강화 (최대 2회)! 이동 속도를 높입니다.",
      accent: "#7effa2",
      baseCost: 30,
      mult: 2.0,
      maxLv: 2,
    },
    m1: {
      id: "m1",
      tab: "automation",
      dirLabel: "▼ 남쪽",
      icon: "⚙️",
      title: "1호기 크리스탈 세공기",
      desc: "광석→세공보석(💵 45) 자동 가공·판매! 제2연구소 시 4호기 자동 연결 (1회 완공).",
      accent: "#d67aff",
      baseCost: 120,
      mult: 1.0,
      maxLv: 1,
    },
    m2: {
      id: "m2",
      tab: "automation",
      dirLabel: "▼ 남쪽",
      icon: "⚗️",
      title: "2호기 무지개 포션 양조기",
      desc: "무지개 약초 해금 & 포션(💵 140) 자동 판매! 제2연구소 시 6호기 자동 연결.",
      accent: "#52ff9b",
      baseCost: 280,
      mult: 1.0,
      maxLv: 1,
    },
    m3: {
      id: "m3",
      tab: "automation",
      dirLabel: "▼ 남쪽",
      icon: "👑",
      title: "3호기 엘릭서 증류솥",
      desc: "광석+약초→황실 엘릭서(💵 360) · 왕실 무역 마차 납품!",
      accent: "#ff8c42",
      baseCost: 650,
      mult: 1.0,
      maxLv: 1,
    },
    m4: {
      id: "m4",
      tab: "automation",
      dirLabel: "▲ 북쪽",
      icon: "🎈",
      title: "4호기 마나 룬 프레스",
      desc: "[Era 2] 세공보석+화염마나석→화염 룬스톤(💵 750) · 마법 길드 열기구 항공 납품!",
      accent: "#fb7185",
      baseCost: 1500,
      mult: 1.0,
      maxLv: 1,
      unlockEra: 2,
    },
    m5: {
      id: "m5",
      tab: "automation",
      dirLabel: "▲ 북쪽",
      icon: "🎵",
      title: "5호기 정령 오르골 조립기",
      desc: "[Era 2] 약초+정령이슬→오르골(💵 1,800) · 전 일꾼·트럭 이속 +30% 오라 부여!",
      accent: "#2dd4bf",
      baseCost: 3500,
      mult: 1.0,
      maxLv: 1,
      unlockEra: 2,
    },
    m6: {
      id: "m6",
      tab: "automation",
      dirLabel: "▲ 북쪽",
      icon: "🚂",
      title: "6호기 번개 마도핵 충전소",
      desc: "[Era 3] 포션+번개수정→번개 마도핵(💵 4,500) · 드워프 장갑열차 대량 수송!",
      accent: "#facc15",
      baseCost: 9500,
      mult: 1.0,
      maxLv: 1,
      unlockEra: 3,
    },
    m7: {
      id: "m7",
      tab: "automation",
      dirLabel: "▲ 북쪽",
      icon: "🌺",
      title: "7호기 달빛 향수 증류탑",
      desc: "[Era 3] 달빛버섯+이슬→달빛 향수(💵 11,000) · 왕실 특사 가판대 초고속 판매!",
      accent: "#e879f9",
      baseCost: 20000,
      mult: 1.0,
      maxLv: 1,
      unlockEra: 3,
    },
    m8: {
      id: "m8",
      tab: "automation",
      dirLabel: "▲ 북쪽",
      icon: "💎",
      title: "8호기 현자의 돌 융합로",
      desc: "[Era 4] 운석+비늘꽃+마도핵→현자의 돌(💵 30,000) 연성!",
      accent: "#f43f5e",
      baseCost: 48000,
      mult: 1.0,
      maxLv: 1,
      unlockEra: 4,
    },
    m9: {
      id: "m9",
      tab: "automation",
      dirLabel: "▲ 북쪽",
      icon: "🛸",
      title: "9호기 하늘 비공정 무역 부두",
      desc: "[Era 4] 현자의 돌 항공 무역! 거대 황금 비공정(💵 30,000 · 4연구소 2배 💵 60,000)!",
      accent: "#fbbf24",
      baseCost: 90000,
      mult: 1.0,
      maxLv: 1,
      unlockEra: 4,
    },
    fairy: {
      id: "fairy",
      tab: "automation",
      dirLabel: "◀ 서쪽",
      icon: "🧚",
      title: "요정 일꾼",
      desc: "차원 에너지(🔮/💠/🌟)로 소환 (최대 3마리)! 남쪽 출입구로 이동해 자원을 자동 채집·배달합니다.",
      accent: "#ff88c2",
      baseCost: 40,
      mult: 1.0,
      maxLv: 3,
    },
    truck: {
      id: "truck",
      tab: "automation",
      dirLabel: "▶ 동쪽",
      icon: "🚜",
      title: "수확 트럭",
      desc: "남부 자원 계곡 순회 수확 트럭(제2연구소 완공 시 2호기 증설!).",
      accent: "#4ce6d8",
      baseCost: 220,
      mult: 1.85,
      maxLv: 8,
    },
    farm2: {
      id: "farm2",
      tab: "automation",
      dirLabel: "▼ 남서쪽",
      icon: "⛏️",
      title: "심층 광산 확장",
      desc: "남부 광산 심층에 추가 푸른 광석 18노드 해금.",
      accent: "#59b2ff",
      baseCost: 160,
      mult: 1,
      maxLv: 1,
    },
    farm3: {
      id: "farm3",
      tab: "automation",
      dirLabel: "▼ 남동쪽",
      icon: "🌿",
      title: "심층 약초 확장",
      desc: "남부 약초 숲 심층에 추가 무지개 약초 18노드 해금.",
      accent: "#6bff9e",
      baseCost: 340,
      mult: 1,
      maxLv: 1,
    },
    alchemy_lab: {
      id: "alchemy_lab",
      tab: "automation",
      dirLabel: "▼ 남쪽",
      icon: "🔮",
      title: "제1연금술 연구소",
      desc: "광석 투입 시 🔮1차(Lv.1+) · 💠2차(Lv.1+ 소량/Lv.2 대량) · 🌟3차(Lv.2+ 소량/Lv.3 대량) 차원 에너지를 연성합니다.",
      accent: "#c084fc",
      baseCost: 40,
      mult: 4.0,
      maxLv: 3,
      pos: ALCHEMY_LAB_POS,
      inPos: ALCHEMY_LAB_IN_POS,
      padPos: ALCHEMY_LAB_PAD_POS,
    },
    alchemy_lab_2: {
      id: "alchemy_lab_2",
      tab: "automation",
      dirLabel: "▶ 동쪽",
      icon: "🏭",
      title: "제2연구소 [물류 공학동]",
      desc: "[Era 2 · Lv.4~6] 1→4·2→6·6→8호기 자동 컨베이어 연결 + 트럭 2호기 증설!",
      accent: "#38bdf8",
      baseCost: 1200,
      mult: 2.2,
      maxLv: 3,
      unlockEra: 2,
      pos: LAB_CONFIGS[1].pos,
      inPos: LAB_CONFIGS[1].inPos,
      padPos: LAB_CONFIGS[1].padPos,
    },
    alchemy_lab_3: {
      id: "alchemy_lab_3",
      tab: "automation",
      dirLabel: "◀ 서쪽",
      icon: "⚡",
      title: "제3연구소 [연성 증폭동]",
      desc: "[Era 3 · Lv.7~9] 모든 생산시설 제작 시 30%(+) 확률로 1+1 대성공(2배 생산)!",
      accent: "#e879f9",
      baseCost: 8500,
      mult: 2.2,
      maxLv: 3,
      unlockEra: 3,
      pos: LAB_CONFIGS[2].pos,
      inPos: LAB_CONFIGS[2].inPos,
      padPos: LAB_CONFIGS[2].padPos,
    },
    alchemy_lab_4: {
      id: "alchemy_lab_4",
      tab: "automation",
      dirLabel: "▼ 남쪽",
      icon: "👑",
      title: "제4연구소 [현자의 마탑]",
      desc: "[Era 4 · Lv.10~12] 요정 일꾼 순간이동(초고속 워프) + 비공정 황금 보너스 2배!",
      accent: "#facc15",
      baseCost: 42000,
      mult: 2.2,
      maxLv: 3,
      unlockEra: 4,
      pos: LAB_CONFIGS[3].pos,
      inPos: LAB_CONFIGS[3].inPos,
      padPos: LAB_CONFIGS[3].padPos,
    },
    // Gate Fortification (성문 증축·수호 결계)
    shrine_aegis: {
      id: "shrine_aegis",
      tab: "wizard",
      dirLabel: "◀ 서쪽",
      icon: "🏰",
      title: "성문 증축·강화",
      desc: "차원 에너지 3단 성채 진화! 성문 최대 HP(500→1,000→1,800→3,000)와 수호 결계를 강화합니다.",
      accent: "#4ade80",
      baseCost: 25,
      mult: 1.4,
      maxLv: 3,
      turretPos: { x: 23.2, z: 2.4 },
      padPos: { x: 7.9, z: 0.0 },
    },
    // ★1 ~ ★5 Elemental Hero Skills (Era-capped up to Lv.20!)
    s1: {
      id: "s1",
      tab: "skills",
      stars: 1,
      icon: "🔥",
      title: "화염구 연사",
      desc: "초고속 화염구(최대 Lv.3)! 레벨업 시 데미지만 강화됩니다.",
      accent: "#ff7849",
      baseCost: 20,
      mult: 1.0,
      maxLv: 3,
      cooldown: 0.85,
    },
    s2: {
      id: "s2",
      tab: "skills",
      stars: 2,
      icon: "❄️",
      title: "혹한의 눈보라",
      desc: "빙결 회오리(최대 Lv.3)! 50% 감속 + 레벨업 시 데미지만 강화됩니다.",
      accent: "#38bdf8",
      baseCost: 24,
      mult: 1.0,
      maxLv: 3,
      cooldown: 4.2,
    },
    s3: {
      id: "s3",
      tab: "skills",
      stars: 3,
      icon: "⚡",
      title: "천둥 연쇄 낙뢰",
      desc: "연쇄 번개 기둥 & 기절(최대 Lv.3)! 레벨업 시 데미지만 강화됩니다.",
      accent: "#facc15",
      baseCost: 30,
      mult: 1.0,
      maxLv: 3,
      cooldown: 6.8,
    },
    s4: {
      id: "s4",
      tab: "skills",
      stars: 4,
      icon: "☄️",
      title: "대지의 운석 폭풍",
      desc: "마그마 운석 폭격(최대 Lv.3)! 레벨업 시 데미지만 강화됩니다.",
      accent: "#fb7185",
      baseCost: 28,
      mult: 1.0,
      maxLv: 3,
      cooldown: 10.5,
    },
    s5: {
      id: "s5",
      tab: "skills",
      stars: 5,
      icon: "🌈",
      title: "에테르 초신성",
      desc: "전장 초신성 폭발 + 성문 30% 수복(최대 Lv.3)! 레벨업 시 데미지만 강화됩니다.",
      accent: "#e879f9",
      baseCost: 30,
      mult: 1.0,
      maxLv: 3,
      cooldown: 15.0,
    },
  };

  const SKILL_IDS = ["s1", "s2", "s3", "s4", "s5"];
  const DEFENSE_IDS = ["shrine_aegis"];

  const MACHINE_CONFIGS = [
    {
      id: "m1",
      padId: "m1",
      era: 1,
      kind: "cutter",
      title: "1호기 크리스탈 세공기",
      x: -14.0,
      z: -14.2,
      inPos: { x: -17.4, z: -14.2 },
      outPos: { x: -10.4, z: -14.2 },
      cashPos: { x: -10.4, z: -10.2 },
      padPos: { x: -14.0, z: -9.6 },
      inputType: "blue_ore",
      inBadge: "⛏️ 광석 투입",
      showcaseKind: "jewel",
      customerRole: "vip",
      custQueueX: -8.3,
      custQueueZ0: -14.2,
      outputType: "cut_gem",
      salePrice: 45,
      baseCraftTime: 1.4,
      accent: "#d67aff",
    },
    {
      id: "m2",
      padId: "m2",
      era: 1,
      kind: "cauldron",
      title: "2호기 무지개 포션 양조기",
      x: -1.2,
      z: -14.2,
      inPos: { x: -4.6, z: -14.2 },
      outPos: { x: 2.4, z: -14.2 },
      cashPos: { x: 2.4, z: -10.2 },
      padPos: { x: -1.2, z: -9.6 },
      inputType: "rainbow_herb",
      inBadge: "🌿 약초 투입",
      showcaseKind: "potion",
      customerRole: "wizard",
      custQueueX: 4.5,
      custQueueZ0: -14.2,
      outputType: "magic_potion",
      salePrice: 140,
      baseCraftTime: 1.65,
      accent: "#52ff9b",
    },
    {
      id: "m3",
      padId: "m3",
      era: 1,
      kind: "distillery",
      title: "3호기 엘릭서 증류솥",
      x: 11.6,
      z: -14.2,
      inPos: { x: 8.2, z: -15.3 },
      inPosB: { x: 8.2, z: -12.9 },
      outPos: { x: 15.2, z: -13.8 },
      cashPos: { x: 15.2, z: -10.2 },
      padPos: { x: 11.6, z: -9.6 },
      inputType: "blue_ore",
      inputTypeB: "rainbow_herb",
      inBadge: "⛏️ 광석 투입",
      inBadgeB: "🌿 약초 투입",
      outputType: "royal_elixir",
      vehicleKind: "wagon",
      salePrice: 360,
      baseCraftTime: 1.9,
      accent: "#ff8c42",
    },
    {
      id: "m4",
      padId: "m4",
      era: 2,
      kind: "rune_press",
      title: "4호기 마나 룬 프레스",
      x: -18.2,
      z: -27.4,
      inPos: { x: -21.2, z: -28.4 },
      inPosB: { x: -21.2, z: -26.2 },
      outPos: { x: -15.0, z: -27.4 },
      cashPos: { x: -15.0, z: -24.2 },
      padPos: { x: -18.2, z: -23.6 },
      inputType: "cut_gem",
      inputTypeB: "fire_mana_stone",
      inBadge: "💠 세공보석",
      inBadgeB: "🔥 화염마나석",
      outputType: "fire_runestone",
      vehicleKind: "balloon",
      dockBadge: "🎈 열기구 선착장",
      salePrice: 750,
      baseCraftTime: 2.0,
      accent: "#fb7185",
    },
    {
      id: "m5",
      padId: "m5",
      era: 2,
      kind: "music_box_assembler",
      title: "5호기 정령 오르골 조립기",
      x: -5.2,
      z: -27.4,
      inPos: { x: -8.2, z: -28.4 },
      inPosB: { x: -8.2, z: -26.2 },
      outPos: { x: -2.0, z: -27.4 },
      cashPos: { x: -2.0, z: -24.2 },
      padPos: { x: -5.2, z: -23.6 },
      inputType: "rainbow_herb",
      inputTypeB: "spirit_dew",
      inBadge: "🌿 약초",
      inBadgeB: "💧 정령이슬",
      showcaseKind: "jewel",
      customerRole: "vip",
      custQueueX: -0.3,
      custQueueZ0: -28.0,
      outputType: "spirit_music_box",
      salePrice: 1800,
      baseCraftTime: 2.1,
      accent: "#2dd4bf",
    },
    {
      id: "m6",
      padId: "m6",
      era: 3,
      kind: "core_charger",
      title: "6호기 번개 마도핵 충전소",
      x: 5.0,
      z: -26.2,
      inPos: { x: 2.0, z: -27.2 },
      inPosB: { x: 2.0, z: -25.0 },
      outPos: { x: 8.2, z: -26.2 },
      cashPos: { x: 11.4, z: -25.8 },
      padPos: { x: 5.0, z: -22.5 },
      inputType: "magic_potion",
      inputTypeB: "lightning_crystal",
      inBadge: "🧪 포션",
      inBadgeB: "⚡ 번개수정",
      outputType: "arcane_core",
      vehicleKind: "train",
      dockBadge: "🚂 열차 화물역",
      salePrice: 4500,
      baseCraftTime: 2.2,
      accent: "#facc15",
    },
    {
      id: "m7",
      padId: "m7",
      era: 3,
      kind: "perfume_still",
      title: "7호기 달빛 향수 증류탑",
      x: 18.2,
      z: -26.2,
      inPos: { x: 15.2, z: -27.2 },
      inPosB: { x: 15.2, z: -25.0 },
      outPos: { x: 21.0, z: -26.2 },
      cashPos: { x: 21.0, z: -23.2 },
      padPos: { x: 18.2, z: -22.5 },
      inputType: "moon_mushroom",
      inputTypeB: "spirit_dew",
      inBadge: "🍄 달빛버섯",
      inBadgeB: "💧 정령이슬",
      showcaseKind: "potion",
      customerRole: "wizard",
      custQueueX: 22.8,
      custQueueZ0: -26.8,
      outputType: "moon_perfume",
      salePrice: 11000,
      baseCraftTime: 2.3,
      accent: "#e879f9",
    },
    {
      id: "m8",
      padId: "m8",
      era: 4,
      kind: "stone_reactor",
      title: "8호기 현자의 돌 융합로",
      x: -11.6,
      z: -38.0,
      inPos: { x: -15.4, z: -39.2 },
      inPosB: { x: -15.4, z: -36.8 },
      inPosC: { x: -11.6, z: -41.4 },
      outPos: { x: -7.8, z: -38.0 },
      cashPos: { x: -7.8, z: -34.2 },
      padPos: { x: -11.6, z: -34.2 },
      inputType: "star_meteorite",
      inputTypeB: "dragon_scale_flower",
      inputTypeC: "arcane_core",
      inBadge: "🌟 운석",
      inBadgeB: "🌺 비늘꽃",
      inBadgeC: "⚡🔮 마도핵(6호기)",
      outputType: "philosopher_stone",
      dockBadge: "💎 현자의 돌 창고",
      salePrice: 30000,
      baseCraftTime: 2.5,
      accent: "#f43f5e",
    },
    {
      id: "m9",
      padId: "m9",
      era: 4,
      kind: "airship_dock",
      title: "9호기 하늘 비공정 무역 부두",
      x: 11.6,
      z: -38.0,
      inPos: { x: 7.8, z: -38.0 },
      outPos: { x: 15.4, z: -38.0 },
      cashPos: { x: 15.4, z: -34.2 },
      padPos: { x: 11.6, z: -34.2 },
      inputType: "philosopher_stone",
      inBadge: "💎 현자의 돌 상차",
      outputType: "philosopher_stone",
      vehicleKind: "airship",
      dockBadge: "🛸 비공정 선착장",
      salePrice: 30000,
      baseCraftTime: 1.6,
      accent: "#fbbf24",
    },
  ];

  // West Market District: 🏛️ 원석 교역소 center + ▼ 남쪽 Sell / ▲ 북쪽 Cash (9.4m split)
  const STALL_POS = { x: -16.5, z: 0.5 };
  const SELL_PALLET_POS = { x: -16.5, z: 5.2 };
  const GEM_PEDESTAL_POS = { x: -16.5, z: -4.2 };

  // ---------------------------------------------------------------------------
  // State & Runtime Containers
  // ---------------------------------------------------------------------------
  let state = createDefaultState();

  function createDefaultState() {
    return {
      gems: 45,
      totalEarnedGems: 0,
      dim1: 0,
      dim2: 0,
      dim3: 0,
      alchemyLabLv: 0,
      alchemyLab2Lv: 0,
      alchemyLab3Lv: 0,
      alchemyLab4Lv: 0,
      unlockedEra: 1,
      xp: 0,
      xpMax: 100,
      level: 1,
      gateHp: 500,
      heroHp: 500,
      toolLv: 0,
      bagLv: 0,
      speedLv: 0,
      m1Lv: 0,
      m2Lv: 0,
      m3Lv: 0,
      m4Lv: 0,
      m5Lv: 0,
      m6Lv: 0,
      m7Lv: 0,
      m8Lv: 0,
      m9Lv: 0,
      fairyCount: 0,
      truckLv: 0,
      herbGroveUnlocked: false,
      farm2Unlocked: false,
      farm3Unlocked: false,
      turretFlameLv: 0,
      turretFrostLv: 0,
      turretThunderLv: 0,
      shrineAegisLv: 0,
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
    x: HERO_SPAWN.x,
    z: HERO_SPAWN.z,
    vx: 0,
    vz: 0,
    rotY: 0,
    walkPhase: 0,
    swingTimer: 0,
    swingDuration: 0.14,
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
    turrets: {},
    buildings: [],
    labs: {},
    districtVisuals: [],
    zoneHeaders: [],
    alchemyLabBuilding: null,
    alchemyLabInPallet: null,
    alchemyLabQueue: [],
    alchemyLabVisuals: [],
    alchemyLabProgress: 0,
    sellPalletQueue: [],
    sellPalletVisuals: [],
    pedestals: [],
    pedestalGems: [],
    monsters: [],
    projectiles: [],
    fxMeshes: [],
    flyingBricks: [],
    particles: [],
    popups: [],
    fairies: [],
    customers: [],
    truck: null,
    truck2: null,
    wagon: null,
    balloon: null,
    train: null,
    airship: null,
    conveyorTimer: 0,
    archmageAura: null,
    heroBackVisuals: [],
    skillCooldowns: { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 },
    waveTimer: FIRST_WAVE_DELAY,
    waveActive: false,
    waveCurrentNum: 1,
    waveTotalToSpawn: WAVE_TOTAL_MONSTERS,
    waveSpawnCount: 0,
    waveBatchTimer: 0,
    combatGraceTimer: 0,
    gameOver: false,
    sellCooldown: 0,
    gemVacuumCooldown: 0,
    gemCombo: 0,
    shopOpen: false,
    shopTab: "wizard",
    lastHudSync: 0,
    toastTimer: 0,
    audioUnlocked: false,
    bgmTimer: 0.4,
    bgmStep: 0,
    openingDismissed: false,
  };

  const sceneObjs = {
    hero: null,
    stall: null,
    sellPallet: null,
    gemPedestal: null,
    villageGate: null,
    alchemyLab: null,
  };

  let _initialized = false;
  let _domBound = false;
  let _rafId = null;
  let _lastRafTs = 0;

  // ---------------------------------------------------------------------------
  // WebAudio Harmonic Tycoon, Combat & Gentle Peaceful/Wave BGM Synthesizer
  // ---------------------------------------------------------------------------
  let _audioCtx = null;

  function unlockAudio() {
    if (runtime.audioUnlocked || typeof window === "undefined") return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!_audioCtx) _audioCtx = new AC();
      if (_audioCtx.state === "suspended") _audioCtx.resume();
      runtime.audioUnlocked = true;
    } catch (e) {}
  }

  function playTone(freq, dur = 0.08, type = "sine", gainVal = 0.06, delay = 0, allowBeforeGesture = false) {
    if (state.muted || typeof window === "undefined") return;
    if (!runtime.audioUnlocked && !allowBeforeGesture) return;
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
      gain.gain.setValueAtTime(Math.max(0.001, gainVal), now);
      gain.gain.exponentialRampToValueAtTime(0.0004, now + dur);
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (e) {}
  }

  function updateProceduralBgm(dt) {
    if (state.muted || !runtime.audioUnlocked || runtime.gameOver) return;
    runtime.bgmTimer -= dt;
    if (runtime.bgmTimer > 0) return;

    if (runtime.waveActive) {
      const waveMelody = [220.0, 261.63, 329.63, 293.66, 261.63, 349.23, 329.63, 246.94];
      const waveBass = [110.0, 146.83, 130.81, 164.81];
      const note = waveMelody[runtime.bgmStep % waveMelody.length];
      playTone(note, 0.34, "triangle", 0.015);
      if (runtime.bgmStep % 2 === 0) {
        const bass = waveBass[Math.floor(runtime.bgmStep / 2) % waveBass.length];
        playTone(bass, 0.55, "sine", 0.014);
      }
      runtime.bgmStep++;
      runtime.bgmTimer = 0.38;
    } else {
      const peaceMelody = [261.63, 329.63, 392.0, 523.25, 440.0, 392.0, 329.63, 293.66];
      const peaceBass = [130.81, 174.61, 196.0, 164.81];
      const note = peaceMelody[runtime.bgmStep % peaceMelody.length];
      playTone(note, 0.85, "sine", 0.014);
      if (runtime.bgmStep % 4 === 0) {
        const root = peaceBass[Math.floor(runtime.bgmStep / 4) % peaceBass.length];
        playTone(root, 1.35, "sine", 0.011);
      }
      runtime.bgmStep++;
      runtime.bgmTimer = 0.68;
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
  // Economy, 3-Tier Dimensional Energy & Skill Helpers
  // ---------------------------------------------------------------------------
  const ENERGY_META = {
    1: { key: "dim1", icon: "🔮", name: "1차 차원 에너지", color: "#c084fc" },
    2: { key: "dim2", icon: "💠", name: "2차 차원 에너지", color: "#38bdf8" },
    3: { key: "dim3", icon: "🌟", name: "3차 차원 에너지", color: "#facc15" },
  };

  function getEnergyAmount(tier) {
    if (tier === 1) return state.dim1 || 0;
    if (tier === 2) return state.dim2 || 0;
    if (tier === 3) return state.dim3 || 0;
    return 0;
  }

  function addEnergyAmount(tier, amt) {
    if (tier === 1) state.dim1 = Math.max(0, (state.dim1 || 0) + amt);
    else if (tier === 2) state.dim2 = Math.max(0, (state.dim2 || 0) + amt);
    else if (tier === 3) state.dim3 = Math.max(0, (state.dim3 || 0) + amt);
  }

  function getUpgradeLevel(id) {
    switch (id) {
      case "tool": return state.toolLv;
      case "bag": return state.bagLv;
      case "speed": return state.speedLv;
      case "m1": return state.m1Lv;
      case "m2": return state.m2Lv;
      case "m3": return state.m3Lv;
      case "m4": return state.m4Lv || 0;
      case "m5": return state.m5Lv || 0;
      case "m6": return state.m6Lv || 0;
      case "m7": return state.m7Lv || 0;
      case "m8": return state.m8Lv || 0;
      case "m9": return state.m9Lv || 0;
      case "fairy": return state.fairyCount;
      case "truck": return state.truckLv;
      case "farm2": return state.farm2Unlocked ? 1 : 0;
      case "farm3": return state.farm3Unlocked ? 1 : 0;
      case "alchemy_lab": return state.alchemyLabLv || 0;
      case "alchemy_lab_2": return state.alchemyLab2Lv || 0;
      case "alchemy_lab_3": return state.alchemyLab3Lv || 0;
      case "alchemy_lab_4": return state.alchemyLab4Lv || 0;
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

  function getUnlockedEra() {
    const waveEra = state.wave >= 16 ? 4 : state.wave >= 11 ? 3 : state.wave >= 6 ? 2 : 1;
    return Math.max(1, Math.min(4, Math.max(state.unlockedEra || 1, waveEra)));
  }

  function getEraSkillCap() {
    const era = getUnlockedEra();
    return (ERA_INFO[era] && ERA_INFO[era].maxCap) || 5;
  }

  function getEffectiveMaxLv(id) {
    const def = UPGRADE_DEFS[id];
    if (!def) return 0;
    if (["turret_flame", "turret_frost", "turret_thunder"].includes(id)) {
      return Math.min(def.maxLv, getEraSkillCap());
    }
    return def.maxLv;
  }

  function isEraUnlockedFor(id) {
    const def = UPGRADE_DEFS[id];
    if (!def || !def.unlockEra) return true;
    return getUnlockedEra() >= def.unlockEra;
  }

  function getUpgradeCostSpec(id) {
    const def = UPGRADE_DEFS[id];
    if (!def) return { mode: "cash", cash: 999999, energyTier: 0, energy: 0, text: "999999" };
    if (!isEraUnlockedFor(id)) return { mode: "locked", cash: 0, energyTier: 0, energy: 0, text: `🔒 Era ${def.unlockEra}` };
    const lv = getUpgradeLevel(id);
    const effMax = getEffectiveMaxLv(id);
    if (lv >= def.maxLv) return { mode: "max", cash: 0, energyTier: 0, energy: 0, text: "MAX" };
    if (lv >= effMax) {
      const nextEra = getUnlockedEra() + 1;
      const unlockWave = nextEra === 2 ? 6 : nextEra === 3 ? 11 : 16;
      return { mode: "locked", cash: 0, energyTier: 0, energy: 0, text: `🔒 W${unlockWave} 해금` };
    }

    if (["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "truck", "farm2", "farm3", "tool", "bag", "speed"].includes(id)) {
      const cash = Math.round(def.baseCost * Math.pow(def.mult, lv));
      return { mode: "cash", cash, energyTier: 0, energy: 0, text: `💵 ${cash.toLocaleString()}` };
    }

    if (id === "fairy") {
      const tier = Math.min(3, lv + 1);
      const energy = lv === 0 ? 40 : lv === 1 ? 35 : 30;
      return { mode: "energy", cash: 0, energyTier: tier, energy, text: `${ENERGY_META[tier].icon} ${energy}` };
    }

    if (["s1", "s2", "s3", "s4", "s5"].includes(id)) {
      const skillCostTable = {
        s1: [{ tier: 1, energy: 20 }, { tier: 1, energy: 20 }, { tier: 2, energy: 20 }],
        s2: [{ tier: 1, energy: 24 }, { tier: 2, energy: 20 }, { tier: 3, energy: 18 }],
        s3: [{ tier: 1, energy: 30 }, { tier: 2, energy: 25 }, { tier: 3, energy: 22 }],
        s4: [{ tier: 2, energy: 28 }, { tier: 2, energy: 40 }, { tier: 3, energy: 28 }],
        s5: [{ tier: 3, energy: 30 }, { tier: 3, energy: 45 }, { tier: 3, energy: 65 }],
      };
      const entry = (skillCostTable[id] && skillCostTable[id][Math.min(2, lv)]) || { tier: 1, energy: 25 };
      return { mode: "energy", cash: 0, energyTier: entry.tier, energy: entry.energy, text: `${ENERGY_META[entry.tier].icon} ${entry.energy}` };
    }

    if (id === "alchemy_lab") {
      if (lv === 0) return { mode: "cash", cash: 40, energyTier: 0, energy: 0, text: "💵 40" };
      if (lv === 1) return { mode: "hybrid", cash: 160, energyTier: 1, energy: 30, text: "💵160 + 🔮30" };
      return { mode: "hybrid", cash: 420, energyTier: 2, energy: 45, text: "💵420 + 💠45" };
    }
    if (id === "alchemy_lab_2" || id === "alchemy_lab_3" || id === "alchemy_lab_4") {
      const cash = Math.round(def.baseCost * Math.pow(def.mult, lv));
      const eTier = id === "alchemy_lab_4" ? 3 : id === "alchemy_lab_3" ? (lv === 0 ? 2 : 3) : (lv === 0 ? 1 : 2);
      const eAmt = id === "alchemy_lab_4" ? 120 + lv * 80 : id === "alchemy_lab_3" ? 80 + lv * 50 : 45 + lv * 30;
      return { mode: "hybrid", cash, energyTier: eTier, energy: eAmt, text: `💵${cash.toLocaleString()}+${ENERGY_META[eTier].icon}${eAmt}` };
    }

    if (id === "shrine_aegis") {
      const tier = lv + 1;
      const energy = lv === 0 ? 25 : lv === 1 ? 45 : 80;
      return { mode: "energy", cash: 0, energyTier: tier, energy, text: `${ENERGY_META[tier].icon} ${energy}` };
    }

    let tier = 1;
    if (id === "s5") {
      tier = 3;
    } else if (id === "s4") {
      tier = lv < 5 ? 2 : 3;
    } else if (id === "s3" || id === "turret_thunder") {
      tier = lv < 3 ? 1 : lv < 9 ? 2 : 3;
    } else {
      tier = lv < 5 ? 1 : lv < 12 ? 2 : 3;
    }
    const effLv = id === "s1" ? Math.max(0, lv - 1) : lv;
    const rawEnergy = Math.round(def.baseCost * Math.pow(1.20, effLv));
    const tierScaled = tier === 1 ? rawEnergy : tier === 2 ? Math.round(rawEnergy * 0.65) : Math.round(rawEnergy * 0.45);
    const energy = Math.max(12, tierScaled);
    return { mode: "energy", cash: 0, energyTier: tier, energy, text: `${ENERGY_META[tier].icon} ${energy}` };
  }

  function getUpgradeCost(id) {
    const spec = getUpgradeCostSpec(id);
    if (spec.mode === "cash" || spec.mode === "hybrid") return spec.cash;
    return spec.energy;
  }

  function canAffordUpgrade(id) {
    if (isUpgradeMax(id)) return false;
    const spec = getUpgradeCostSpec(id);
    if (spec.mode === "locked" || spec.mode === "max") return false;
    if (spec.mode === "cash") return state.gems >= spec.cash;
    if (spec.mode === "energy") return getEnergyAmount(spec.energyTier) >= spec.energy;
    return state.gems >= spec.cash && getEnergyAmount(spec.energyTier) >= spec.energy;
  }

  function deductUpgradeCost(id) {
    const spec = getUpgradeCostSpec(id);
    if (spec.cash > 0) state.gems -= spec.cash;
    if (spec.energy > 0 && spec.energyTier > 0) addEnergyAmount(spec.energyTier, -spec.energy);
  }

  function isUpgradeMax(id) {
    const def = UPGRADE_DEFS[id];
    if (!def) return true;
    return getUpgradeLevel(id) >= getEffectiveMaxLv(id);
  }

  const GATE_BASE_HP_BY_TIER = [500, 1000, 1800, 3000];

  function isWaveExpansionMilestone(w) {
    return w === 6 || w === 11 || w === 16;
  }

  function getGateMaxHp() {
    const tier = Math.max(0, Math.min(3, state.shrineAegisLv || 0));
    return GATE_BASE_HP_BY_TIER[tier] + (state.level - 1) * 50;
  }

  function getHeroMaxHp() {
    return getGateMaxHp();
  }

  function updateLabOverheadBanners() {
    if (!window.Entities || typeof window.Entities.updateOverheadBannerSprite !== "function") return;
    for (const cfg of LAB_CONFIGS) {
      const labObj = runtime.labs[cfg.id];
      if (!labObj || !labObj.bannerSprite) continue;
      const lv = getUpgradeLevel(cfg.id);
      const txt = lv > 0 ? `${cfg.title} Lv.${lv}` : `${cfg.title} (미건설)`;
      window.Entities.updateOverheadBannerSprite(labObj.bannerSprite, txt, cfg.accent);
    }
    for (const m of runtime.machines) {
      if (m.bannerSprite) {
        const txt = m.lv > 0 ? `${m.cfg.title} Lv.${m.lv}` : m.cfg.title;
        window.Entities.updateOverheadBannerSprite(m.bannerSprite, txt, m.cfg.accent);
      }
    }
    if (sceneObjs.villageGate && sceneObjs.villageGate.bannerSprite) {
      window.Entities.updateOverheadBannerSprite(
        sceneObjs.villageGate.bannerSprite,
        `🏰 동쪽 수호 성문 Lv.${(state.shrineAegisLv || 0) + 1}`,
        "#ffe4e6"
      );
    }
  }

  function applyUpgradeLevel(id) {
    switch (id) {
      case "tool": {
        state.toolLv++;
        if (window.Entities && sceneObjs.hero) {
          window.Entities.updateHeroTier(sceneObjs.hero, Math.min(4, Math.floor(state.toolLv / 4)));
        }
        syncHeroArchmageAura();
        const ms =
          state.toolLv === 5 ? " [🌟 Lv.5 마일스톤: 채집 범위 4.0m 확장!]" :
          state.toolLv === 10 ? " [🌟 Lv.10 마일스톤: 동시 2노드 채집 + 자석 2배!]" :
          state.toolLv === 15 ? " [🌟 Lv.15 마일스톤: 30% 확률 수확량 2배!]" :
          state.toolLv === 20 ? " [👑 Lv.20 MAX 대현자의 황금 오라: 자동 채집 + 전 판매 1.5배!]" : "";
        showToast(`⛏️ 채집 곡괭이 Lv.${state.toolLv} 개발 완료!${ms}`);
        break;
      }
      case "bag":
        state.bagLv++;
        showToast(`🎒 지게 용량 ${getHeroBagCap()}칸으로 확장!`);
        break;
      case "speed":
        state.speedLv++;
        showToast(`👢 이동 속도 Lv.${state.speedLv} 가속!`);
        break;
      case "m1":
      case "m2":
      case "m3":
      case "m4":
      case "m5":
      case "m6":
      case "m7":
      case "m8":
      case "m9": {
        const idx = Number(id.slice(1)) - 1;
        const key = `${id}Lv`;
        state[key] = (state[key] || 0) + 1;
        if (runtime.machines[idx]) runtime.machines[idx].lv = state[key];
        if (id === "m2") {
          state.herbGroveUnlocked = true;
          refreshFarmZoneVisibility();
        }
        refreshFacilityVisibility();
        if (id === "m3") ensureWagonSpawned();
        if (id === "m4" || id === "m6" || id === "m9") ensureSpecialVehiclesSpawned();
        const def = UPGRADE_DEFS[id];
        showToast(state[key] === 1 ? `${def.icon} ${def.title} 완공 & 가동!` : `${def.icon} ${def.title} Lv.${state[key]} 가속!`);
        break;
      }
      case "alchemy_lab":
        state.alchemyLabLv = Math.min(3, (state.alchemyLabLv || 0) + 1);
        refreshFacilityVisibility();
        showToast(`🔮 제1연금술 연구소 Lv.${state.alchemyLabLv} 증축!`);
        break;
      case "alchemy_lab_2":
        state.alchemyLab2Lv = Math.min(3, (state.alchemyLab2Lv || 0) + 1);
        refreshFacilityVisibility();
        ensureTruckSpawned();
        showToast(`🏭 제2연구소 [물류 공학동] Lv.${state.alchemyLab2Lv} 완공! (자동 컨베이어 & 트럭 2호기 가동!)`);
        break;
      case "alchemy_lab_3":
        state.alchemyLab3Lv = Math.min(3, (state.alchemyLab3Lv || 0) + 1);
        refreshFacilityVisibility();
        showToast(`⚡ 제3연구소 [연성 증폭동] Lv.${state.alchemyLab3Lv} 완공! (전 시설 1+1 대성공 가동!)`);
        break;
      case "alchemy_lab_4":
        state.alchemyLab4Lv = Math.min(3, (state.alchemyLab4Lv || 0) + 1);
        refreshFacilityVisibility();
        showToast(`👑 제4연구소 [현자의 마탑] Lv.${state.alchemyLab4Lv} 완공! (요정 순간이동 & 비공정 2배!)`);
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
        showToast("⛏️ 남부 심층 광산에 추가 푸른 광석 18노드 해금!");
        break;
      case "farm3":
        state.farm3Unlocked = true;
        state.herbGroveUnlocked = true;
        refreshFarmZoneVisibility();
        showToast("🌿 남부 심층 정원에 추가 무지개 약초 18노드 해금!");
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
      case "shrine_aegis": {
        const prevMax = getGateMaxHp();
        state.shrineAegisLv = Math.min(3, (state.shrineAegisLv || 0) + 1);
        const nextMax = getGateMaxHp();
        const gain = Math.max(0, nextMax - prevMax);
        state.gateHp = Math.min(nextMax, (state.gateHp || prevMax) + gain);
        state.heroHp = state.gateHp;
        refreshDefenseTurretsVisibility();
        const tierNames = ["왕립 석조 성문", "1단: 철갑 룬 성문", "2단: 에메랄드 성채문", "3단 MAX: 황실 신성 요새문"];
        showToast(`🏰 ${tierNames[state.shrineAegisLv]} 증축 완료! (최대 HP ${nextMax})`);
        break;
      }
      case "s1":
      case "s2":
      case "s3":
      case "s4":
      case "s5": {
        const key = `${id}Lv`;
        state[key] = Math.min(20, (state[key] || 0) + 1);
        const def = UPGRADE_DEFS[id];
        showToast(`★${def.stars} ${def.icon} ${def.title} Lv.${state[key]} 강화!`);
        break;
      }
      default:
        break;
    }
    updateLabOverheadBanners();
    state.padPaid[id] = 0;
    addXp(25);
    playBuildPop();
    spawnBurstVfx(player.x, 1.0, player.z, 0x4eff9e, 12);
    saveGame();
    syncHUD(true);
    if (runtime.shopOpen) renderShop();
  }

  function purchaseUpgradeDirect(id) {
    if (!canAffordUpgrade(id)) return false;
    deductUpgradeCost(id);
    applyUpgradeLevel(id);
    return true;
  }

  function getHeroBagCap() {
    return 16 + (state.bagLv >= 2 ? 18 : state.bagLv === 1 ? 8 : 0);
  }

  function getHeroMoveSpeed() {
    return 7.6 + Math.min(2, state.speedLv) * 1.4;
  }

  function getHeroHarvestInterval() {
    return Math.max(0.14, 0.34 - Math.min(2, state.toolLv) * 0.08);
  }

  function getHeroPickRadius() {
    return state.toolLv >= 1 ? 3.8 : 2.65;
  }

  function getHeroMultiHit() {
    return state.toolLv >= 2 ? 2 : 1;
  }

  function getCashMagnetRadius() {
    return state.toolLv >= 2 ? 5.2 : 2.8;
  }

  function getHeroDoubleDropChance() {
    return state.toolLv >= 2 ? 0.25 : 0;
  }

  function getPriceMultiplier() {
    return 1.0;
  }

  function getHeroHarvestYield() {
    return 1 + (state.toolLv >= 2 ? 1 : 0);
  }

  function syncHeroArchmageAura() {
    if (!sceneObjs.hero || !sceneObjs.hero.root) return;
    if (!runtime.archmageAura && typeof THREE !== "undefined") {
      const geo = new THREE.RingGeometry(1.15, 1.52, 32);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI * 0.5;
      mesh.position.y = 0.06;
      sceneObjs.hero.root.add(mesh);
      runtime.archmageAura = mesh;
    }
    if (runtime.archmageAura) {
      runtime.archmageAura.visible = state.toolLv >= 20;
    }
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

  function spawnMeteorStrike(tx, tz, damage, aoeRadius = 4.2) {
    const Engine = window.Engine;
    if (!Engine || !Engine.vfxGroup) {
      applyAoEDamage(tx, tz, aoeRadius, damage, 4.2);
      return;
    }
    const mat = new THREE.MeshBasicMaterial({ color: 0xff5a2c });
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.76, 0), mat);
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
      aoeRadius,
      t: 0,
      dur: 0.20,
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
          const rad = fx.aoeRadius || 4.2;
          applyAoEDamage(fx.tx, fx.tz, rad, fx.damage, 4.2);
          spawnShockwaveRing(fx.tx, 0.08, fx.tz, 0xff5a2c, rad, 0.42);
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
      for (let c = 0; c < 6; c++) specs.push({ zone: 1, kind: "blue_ore", itemType: "blue_ore", x: -14.6 + c * 1.85, z: 23.4 + r * 2.0 });
    }
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) specs.push({ zone: 2, kind: "rainbow_herb", itemType: "rainbow_herb", x: 5.35 + c * 1.85, z: 23.4 + r * 2.0 });
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) specs.push({ zone: 3, kind: "blue_ore", itemType: "blue_ore", x: -14.6 + c * 1.85, z: 31.6 + r * 2.0 });
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) specs.push({ zone: 4, kind: "rainbow_herb", itemType: "rainbow_herb", x: 5.35 + c * 1.85, z: 31.6 + r * 2.0 });
    }
    const exoticZones = [
      { zone: 5, kind: "fire_mana_stone", x0: -14.6, z0: 39.2 },
      { zone: 6, kind: "spirit_dew", x0: 5.35, z0: 39.2 },
      { zone: 7, kind: "lightning_crystal", x0: -14.6, z0: 46.8 },
      { zone: 8, kind: "moon_mushroom", x0: 5.35, z0: 46.8 },
      { zone: 9, kind: "star_meteorite", x0: -14.6, z0: 54.4 },
      { zone: 10, kind: "dragon_scale_flower", x0: 5.35, z0: 54.4 },
    ];
    for (const ez of exoticZones) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 6; c++) {
          specs.push({ zone: ez.zone, kind: ez.kind, itemType: ez.kind, x: ez.x0 + c * 1.85, z: ez.z0 + r * 2.0 });
        }
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
    const era = getUnlockedEra();
    if (zone === 1) return true;
    if (zone === 2) return !!state.herbGroveUnlocked || state.m2Lv > 0;
    if (zone === 3) return !!state.farm2Unlocked;
    if (zone === 4) return !!state.farm3Unlocked;
    if (zone === 5 || zone === 6) return era >= 2;
    if (zone === 7 || zone === 8) return era >= 3;
    if (zone === 9 || zone === 10) return era >= 4;
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
    const era = getUnlockedEra();
    if (window.Engine && typeof window.Engine.setUnlockedEraVisuals === "function") {
      window.Engine.setUnlockedEraVisuals(era);
    }

    for (const m of runtime.machines) {
      const built = m.lv > 0 && era >= (m.cfg.era || 1);
      if (m.entity && m.entity.root) m.entity.root.visible = built;
      if (m.showcase && m.showcase.root) m.showcase.root.visible = built;
      if (m.cashPedestal && m.cashPedestal.entity && m.cashPedestal.entity.root) {
        m.cashPedestal.entity.root.visible = built;
      }
      if (m.inPallet && m.inPallet.root) m.inPallet.root.visible = built;
      if (m.inPalletB && m.inPalletB.root) m.inPalletB.root.visible = built;
      if (m.inPalletC && m.inPalletC.root) m.inPalletC.root.visible = built;
      if (m.dockPallet && m.dockPallet.root) m.dockPallet.root.visible = built;
      for (const c of m.customers || []) {
        if (c.entity && c.entity.root) c.entity.root.visible = built;
      }
    }

    for (const cfg of LAB_CONFIGS) {
      const labObj = runtime.labs[cfg.id];
      if (!labObj) continue;
      const eraOk = era >= cfg.era;
      const lv = getUpgradeLevel(cfg.id);
      if (labObj.ent && labObj.ent.root) labObj.ent.root.visible = eraOk;
      if (labObj.ent && window.Entities && typeof window.Entities.updateAlchemyLabTier === "function") {
        window.Entities.updateAlchemyLabTier(labObj.ent, lv);
      }
      if (labObj.inPallet && labObj.inPallet.root) labObj.inPallet.root.visible = eraOk && lv > 0;
    }

    for (const dv of runtime.districtVisuals) {
      if (dv.root) dv.root.visible = era >= (dv.era || 1);
    }
    for (const zh of runtime.zoneHeaders) {
      if (zh.sprite) zh.sprite.visible = era >= (zh.era || 1);
    }
    for (const sp of runtime.stepPads) {
      if (sp.pad && sp.pad.root) sp.pad.root.visible = isEraUnlockedFor(sp.id);
    }

    if (runtime.wagon && runtime.wagon.entity && runtime.wagon.entity.root) {
      runtime.wagon.entity.root.visible = state.m3Lv > 0;
    }
    if (runtime.balloon && runtime.balloon.entity && runtime.balloon.entity.root) {
      runtime.balloon.entity.root.visible = (state.m4Lv || 0) > 0 && era >= 2;
    }
    if (runtime.train && runtime.train.entity && runtime.train.entity.root) {
      runtime.train.entity.root.visible = (state.m6Lv || 0) > 0 && era >= 3;
    }
    if (runtime.airship && runtime.airship.entity && runtime.airship.entity.root) {
      runtime.airship.entity.root.visible = (state.m9Lv || 0) > 0 && era >= 4;
    }
    updateLabOverheadBanners();
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
    if (sceneObjs.villageGate && window.Entities && typeof window.Entities.updateVillageGateTier === "function") {
      window.Entities.updateVillageGateTier(sceneObjs.villageGate, state.shrineAegisLv);
    }
  }

  function buildDistrictVisuals() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    if (typeof Entities.createDistrictPlatform === "function") {
      const platforms = [
        { era: 1, theme: "alchemy", x: -6.8, z: -2.0, w: 12.2, d: 11.8 },
        { era: 1, theme: "defense", x: 13.5, z: 0.0, w: 15.8, d: 14.2 },
        { era: 1, theme: "training", x: -12.5, z: 13.0, w: 15.6, d: 13.8 },
        { era: 1, theme: "guild", x: 11.5, z: 13.0, w: 15.6, d: 13.8 },
        { era: 1, theme: "factory", x: -1.2, z: -14.0, w: 36.5, d: 11.0 },
        { era: 2, theme: "factory", x: -12.2, z: -26.0, w: 22.8, d: 11.5 },
        { era: 3, theme: "factory", x: 12.2, z: -26.0, w: 22.8, d: 11.5 },
        { era: 4, theme: "alchemy", x: 0.0, z: -38.0, w: 46.5, d: 11.5 },
      ];
      for (const p of platforms) {
        const root = Entities.createDistrictPlatform(p);
        Engine.stationGroup.add(root);
        runtime.districtVisuals.push({ era: p.era, root });
      }
    }

    if (typeof Entities.createZoneHeaderBanner === "function") {
      const headers = [
        { era: 1, title: "🔮 연금술 연구 단지", sub: "자원 → 차원 에너지 연성", x: -6.2, y: 5.5, z: -2.5, acc: "#e9d5ff", brd: "#9b59b6" },
        { era: 1, title: "🛡️ 디펜스 기술 단지", sub: "성문 증축 & 수호 결계", x: 13.5, y: 5.5, z: 0.0, acc: "#cffafe", brd: "#00e5ff" },
        { era: 1, title: "⚡ 마법사 수련장", sub: "Lv.20 마일스톤 장비 수련", x: -12.5, y: 5.5, z: 13.0, acc: "#dcfce7", brd: "#2ecc71" },
        { era: 1, title: "🧚 자동화·채집 길드", sub: "요정·메가트럭·심층 광산", x: 11.5, y: 5.5, z: 13.0, acc: "#fef3c7", brd: "#1abc9c" },
        { era: 1, title: "⚙️ 마법 자동화 공장 (1~3호기)", sub: "원석·약초 가공 & 왕실 마차", x: -1.2, y: 5.5, z: -14.2, acc: "#ffedd5", brd: "#e67e22" },
        { era: 2, title: "🔥 정령 공학 지구 (4~5호기)", sub: "마나 룬 열기구 & 정령 오르골 오라", x: -12.2, y: 5.6, z: -25.8, acc: "#ffe4e6", brd: "#fb7185" },
        { era: 3, title: "⚡ 번개 제련 단지 (6~7호기)", sub: "드워프 장갑열차 & 달빛 향수", x: 12.2, y: 5.6, z: -25.8, acc: "#fef9c3", brd: "#facc15" },
        { era: 4, title: "👑 황금 대성채 & 비공정 부두 (8~9호기)", sub: "현자의 돌 & 거대 황금 비공정", x: 0.0, y: 5.8, z: -38.0, acc: "#fef08a", brd: "#f59e0b" },
      ];
      for (const h of headers) {
        const sprite = Entities.createZoneHeaderBanner(h.title, h.sub, h.x, h.y, h.z, h.acc, h.brd);
        Engine.stationGroup.add(sprite);
        runtime.zoneHeaders.push({ era: h.era, sprite });
      }
    }
  }

  function buildDistrictBuildings() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities || typeof Entities.createCategoryBuilding !== "function") return;

    buildDistrictVisuals();

    const specs = [
      { kind: "forge", x: -12.5, z: 13.0, badge: "⚒️ 장비 강화 대장간", accent: "#ffd24c" },
      { kind: "guild", x: 11.5, z: 13.0, badge: "🧚 자동화·채집 길드", accent: "#4ce6d8" },
      { kind: "defense_lab", x: 13.5, z: 0.0, badge: "🛡️ 디펜스 기술 연구소", accent: "#38bdf8" },
    ];
    for (const s of specs) {
      const ent = Entities.createCategoryBuilding(s.kind, s.x, s.z, s.badge, s.accent);
      Engine.stationGroup.add(ent.root);
      runtime.buildings.push({ kind: s.kind, x: s.x, z: s.z, ent });
    }

    for (const cfg of LAB_CONFIGS) {
      const ent = Entities.createCategoryBuilding(cfg.kind, cfg.pos.x, cfg.pos.z, cfg.title, cfg.accent);
      Engine.stationGroup.add(ent.root);
      runtime.buildings.push({ kind: cfg.kind, x: cfg.pos.x, z: cfg.pos.z, era: cfg.era, ent });

      let inPallet = null;
      if (typeof Entities.createWoodenPalletZone === "function") {
        inPallet = Entities.createWoodenPalletZone({
          x: cfg.inPos.x,
          z: cfg.inPos.z,
          w: 2.3,
          d: 1.9,
          accentColor: cfg.accent,
          badgeText: cfg.inLabel,
          overheadY: 3.75,
        });
        Engine.stationGroup.add(inPallet.root);
      }
      runtime.labs[cfg.id] = {
        cfg,
        ent,
        inPallet,
        queue: cfg.id === "alchemy_lab" ? runtime.alchemyLabQueue : [],
        visuals: cfg.id === "alchemy_lab" ? runtime.alchemyLabVisuals : [],
        progress: 0,
        bannerSprite: ent.bannerSprite,
      };
      if (cfg.id === "alchemy_lab") {
        sceneObjs.alchemyLab = ent;
        runtime.alchemyLabBuilding = ent;
        runtime.alchemyLabInPallet = inPallet;
      }
    }
    refreshFacilityVisibility();
  }

  function buildDefenseTurrets() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    if (typeof Entities.createVillageGate === "function") {
      sceneObjs.villageGate = Entities.createVillageGate(GATE_POS.x, GATE_POS.z, "🏰 동쪽 수호 성문");
      Engine.stationGroup.add(sceneObjs.villageGate.root);
    }
    if (typeof Entities.createSouthResourceGate === "function") {
      sceneObjs.southGate = Entities.createSouthResourceGate(SOUTH_GATE_POS.x, SOUTH_GATE_POS.z, "⛏️ 남쪽 자원 채집 출입구");
      Engine.stationGroup.add(sceneObjs.southGate);
    }

    buildDistrictBuildings();

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
      let bannerSprite = null;
      if (typeof Entities.createOverheadBannerSprite === "function") {
        bannerSprite = Entities.createOverheadBannerSprite({
          text: cfg.title,
          subtitle: `판매 💵 ${cfg.salePrice.toLocaleString()}`,
          x: 0,
          y: 3.9,
          z: 0,
          w: 4.8,
          h: 1.12,
          accentColor: cfg.accent,
          borderColor: cfg.accent,
          renderOrder: 999,
        });
        ent.root.add(bannerSprite);
      }
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

      let inPalletC = null;
      if (cfg.inPosC) {
        inPalletC = Entities.createWoodenPalletZone({
          x: cfg.inPosC.x,
          z: cfg.inPosC.z,
          w: 2.25,
          d: 1.85,
          accentColor: "#facc15",
          badgeText: cfg.inBadgeC,
        });
        Engine.stationGroup.add(inPalletC.root);
      }

      let showcase = null;
      let dockPallet = null;
      const facilityCustomers = [];

      if (cfg.showcaseKind) {
        showcase = Entities.createShowcaseCounter({
          x: cfg.outPos.x,
          z: cfg.outPos.z,
          kind: cfg.showcaseKind,
          accentColor: cfg.id === "m1" || cfg.id === "m7" ? 0xc56bff : 0x3be898,
        });
        Engine.stationGroup.add(showcase.root);

        for (let ci = 0; ci < 3; ci++) {
          const cz = cfg.custQueueZ0 + ci * 1.35;
          const custEnt = Entities.createCustomer(ci + (i % 4), cfg.customerRole);
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
          badgeText: cfg.dockBadge || "👑 마차 상차장",
          overheadY: 3.6,
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
        bannerSprite,
        inPallet,
        inPalletB,
        inPalletC,
        showcase,
        dockPallet,
        cashPedestal: pedObj,
        customers: facilityCustomers,
        inQueue: [],
        inVisuals: [],
        inQueueB: [],
        inVisualsB: [],
        inQueueC: [],
        inVisualsC: [],
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

    sceneObjs.stall = Entities.createSalesStall(STALL_POS.x, STALL_POS.z, "🏛️ 원석 교역소");
    Engine.stationGroup.add(sceneObjs.stall.root);

    sceneObjs.sellPallet = Entities.createWoodenPalletZone({
      x: SELL_PALLET_POS.x,
      z: SELL_PALLET_POS.z,
      w: 2.65,
      d: 2.15,
      accentColor: "#38bdf8",
      badgeText: "▼ 남쪽 · 📦 원석 파는 곳",
      overheadY: 3.6,
    });
    Engine.stationGroup.add(sceneObjs.sellPallet.root);

    sceneObjs.gemPedestal = Entities.createGemPedestal(GEM_PEDESTAL_POS.x, GEM_PEDESTAL_POS.z, "▲ 북쪽 · 💵 돈 받는 곳");
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
      const slotZ = STALL_POS.z - 2.6 + i * 1.45;
      custEnt.root.position.set(STALL_POS.x - 3.2, 0, slotZ);
      custEnt.root.rotation.y = Math.PI * 0.5;
      Engine.unitGroup.add(custEnt.root);
      runtime.customers.push({
        slot: i,
        x: STALL_POS.x - 3.2,
        z: slotZ,
        targetX: STALL_POS.x - 3.2,
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
      // SW Forge District
      { id: "tool", x: -18.3, z: 13.0 },
      { id: "bag", x: -12.5, z: 18.1 },
      { id: "speed", x: -6.7, z: 13.0 },
      // SE Guild District (건물 위쪽 배치 금지 -> 모두 건물 아래쪽 z: 18.1 배치)
      { id: "fairy", x: 5.7, z: 13.0 },
      { id: "truck", x: 17.3, z: 13.0 },
      { id: "farm2", x: 9.4, z: 18.1 },
      { id: "farm3", x: 13.6, z: 18.1 },
      // East Defense Bastion
      { id: "shrine_aegis", x: UPGRADE_DEFS.shrine_aegis.padPos.x, z: UPGRADE_DEFS.shrine_aegis.padPos.z },
    ];

    for (const cfg of LAB_CONFIGS) {
      padCoords.push({ id: cfg.id, x: cfg.padPos.x, z: cfg.padPos.z });
    }
    for (const mc of MACHINE_CONFIGS) {
      padCoords.push({ id: mc.id, x: mc.padPos.x, z: mc.padPos.z });
    }

    for (const p of padCoords) {
      const def = UPGRADE_DEFS[p.id];
      const spec = getUpgradeCostSpec(p.id);
      const pad = Entities.createStepPad({
        id: p.id,
        x: p.x,
        z: p.z,
        w: 3.1,
        d: 2.35,
        dirLabel: def.dirLabel || "",
        icon: def.icon,
        title: def.title,
        price: spec.text,
        levelText: `Lv.${getUpgradeLevel(p.id)}`,
        accentHex: def.accent,
        paidRatio: 0,
      });
      pad.root.visible = isEraUnlockedFor(p.id);
      Engine.stationGroup.add(pad.root);
      runtime.stepPads.push({ id: p.id, x: p.x, z: p.z, w: 3.1, d: 2.35, pad });
    }
  }

  function syncFairiesCount() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;

    const desired = Math.min(20, state.fairyCount);
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
      if (runtime.truck2) {
        Engine.unitGroup.remove(runtime.truck2.entity.root);
        runtime.truck2 = null;
      }
      return;
    }
    if (!runtime.truck) {
      const ent = Entities.createHarvesterCart();
      ent.root.position.set(0.0, 0, 16.5);
      Engine.unitGroup.add(ent.root);
      runtime.truck = {
        id: 1,
        x: 0.0,
        z: 16.5,
        rotY: 0,
        state: "exit",
        waypointIdx: 0,
        bag: [],
        bagVisuals: [],
        entity: ent,
      };
    }
    if ((state.alchemyLab2Lv || 0) >= 1 && !runtime.truck2) {
      const ent2 = Entities.createHarvesterCart();
      ent2.root.position.set(1.6, 0, 15.5);
      Engine.unitGroup.add(ent2.root);
      runtime.truck2 = {
        id: 2,
        x: 1.6,
        z: 15.5,
        rotY: 0,
        state: "exit",
        waypointIdx: 2,
        bag: [],
        bagVisuals: [],
        entity: ent2,
      };
    }
  }

  function ensureWagonSpawned() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities || typeof Entities.createRoyalTradeWagon !== "function") return;

    if (!runtime.wagon) {
      const ent = Entities.createRoyalTradeWagon();
      ent.root.position.set(35.5, 0, 0.0);
      ent.root.rotation.y = Math.PI;
      Engine.unitGroup.add(ent.root);
      runtime.wagon = {
        x: 35.5,
        z: 0.0,
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

  function ensureSpecialVehiclesSpawned() {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities) return;
    const era = getUnlockedEra();

    if (!runtime.balloon && typeof Entities.createHotAirBalloon === "function") {
      const bEnt = Entities.createHotAirBalloon();
      bEnt.root.position.set(-15.0, 2.2, -29.5);
      Engine.unitGroup.add(bEnt.root);
      runtime.balloon = { x: -15.0, y: 2.2, z: -29.5, state: "dock", timer: 0, cargoCount: 0, cargoVisuals: [], entity: bEnt };
    }
    if (runtime.balloon && runtime.balloon.entity) {
      runtime.balloon.entity.root.visible = (state.m4Lv || 0) > 0 && era >= 2;
    }

    if (!runtime.train && typeof Entities.createArmoredTrain === "function") {
      const tEnt = Entities.createArmoredTrain();
      tEnt.root.position.set(8.2, 0.12, -29.8);
      Engine.unitGroup.add(tEnt.root);
      runtime.train = { x: 8.2, z: -29.8, state: "dock", timer: 0, cargoCount: 0, cargoVisuals: [], entity: tEnt };
    }
    if (runtime.train && runtime.train.entity) {
      runtime.train.entity.root.visible = (state.m6Lv || 0) > 0 && era >= 3;
    }

    if (!runtime.airship && typeof Entities.createGoldenAirship === "function") {
      const aEnt = Entities.createGoldenAirship();
      aEnt.root.position.set(15.4, 3.0, -40.5);
      Engine.unitGroup.add(aEnt.root);
      runtime.airship = { x: 15.4, y: 3.0, z: -40.5, state: "dock", timer: 0, cargoCount: 0, cargoVisuals: [], entity: aEnt };
    }
    if (runtime.airship && runtime.airship.entity) {
      runtime.airship.entity.root.visible = (state.m9Lv || 0) > 0 && era >= 4;
    }
  }

  // ---------------------------------------------------------------------------
  // Combat: 20-Wave 5-Theme Horde (60 Monsters/Wave) + Territory Expansion Eras
  // ---------------------------------------------------------------------------
  const WAVE_THEME_INFO = [
    { tier: 1, title: "숲속 야생 동물 무리 (1~4)", names: ["숲속 멧돼지", "숲속 회색 늑대", "숲속 불곰"] },
    { tier: 2, title: "달빛 묘지 꼬마 좀비떼 (5~8)", names: ["꼬마 좀비", "늪지 포자 좀비", "왕실 근위 좀비"] },
    { tier: 3, title: "붉은 달 뱀파이어 군단 (9~12)", names: ["박쥐 뱀파이어", "혈액 마법 흡혈귀", "드라큘라 백작"] },
    { tier: 4, title: "은빛 송곳니 늑대인간 부족 (13~16)", names: ["늑대인간 척후병", "포효 늑대주술사", "알파 늑대군주"] },
    { tier: 5, title: "심연의 지옥 악마 대군세 (17~20)", names: ["화염 임프 악마", "지옥 마도 악마", "심연 군주 대마왕"] },
  ];

  function getWaveThemeInfo(waveNum) {
    const w = Math.max(1, Math.min(TOTAL_WAVES, waveNum));
    const idx = Math.min(WAVE_THEME_INFO.length - 1, Math.floor((w - 1) / 4));
    return WAVE_THEME_INFO[idx];
  }

  function spawnMonsterBatch(waveNum, count = WAVE_BATCH_SIZE) {
    const Engine = window.Engine;
    const Entities = window.Entities;
    if (!Engine || !Entities || !Entities.createCuteMonster) return 0;

    const w = Math.max(1, Math.min(TOTAL_WAVES, waveNum));
    const themeInfo = getWaveThemeInfo(w);
    const visualWave = Math.min(10, Math.ceil(w / 2));
    const hpMult = Math.pow(1.24, w - 1);
    const eTier = Math.min(3, Math.ceil(w / 6));
    const roleCycle = ["slime", "slime", "shroom", "golem", "slime", "shroom", "slime", "golem", "shroom", "golem"];

    for (let i = 0; i < count; i++) {
      const species = roleCycle[i % roleCycle.length];
      const isRanged = species === "shroom";
      const isBruiser = species === "golem";
      const laneZ = ((i % 5) - 2) * 1.45 + (Math.random() - 0.5) * 0.45;
      const sx = (w <= 3 ? 38.5 : 33.8) + Math.floor(i / 5) * 2.1 + Math.random() * 1.2;

      const baseHp = isBruiser ? 50 : isRanged ? 30 : 25;
      const baseAtk = (isBruiser ? 5 : isRanged ? 4 : 3) + Math.floor(w * 1.05);
      const spd = (isBruiser ? 2.75 : isRanged ? 3.25 : 4.2) + Math.min(2.4, w * 0.09);
      const name = themeInfo.names[isBruiser ? 2 : isRanged ? 1 : 0];

      const ent = Entities.createCuteMonster(species, visualWave);
      ent.root.position.set(sx, 0, laneZ);
      Engine.unitGroup.add(ent.root);
      runtime.monsters.push({
        species,
        name,
        themeTier: themeInfo.tier,
        x: sx,
        z: laneZ,
        targetOffsetZ: Math.max(-3.2, Math.min(3.2, laneZ)),
        vx: 0,
        vz: 0,
        hp: Math.round(baseHp * hpMult),
        maxHp: Math.round(baseHp * hpMult),
        atk: baseAtk,
        speed: spd,
        range: isRanged ? 5.2 : isBruiser ? 1.95 : 1.65,
        atkCd: isRanged ? 1.65 : isBruiser ? 1.45 : 1.05,
        atkTimer: 0.4 + Math.random() * 0.4,
        slowTimer: 0,
        stunTimer: 0,
        reward: 6 + w * 4,
        energyTier: eTier,
        energyReward: 2 + Math.floor(w / 5),
        entity: ent,
      });
    }
    return count;
  }

  function spawnWaveHorde(waveNum) {
    const w = Math.max(1, Math.min(TOTAL_WAVES, waveNum));
    const themeInfo = getWaveThemeInfo(w);
    runtime.waveActive = true;
    runtime.waveCurrentNum = w;
    runtime.waveTotalToSpawn = WAVE_TOTAL_MONSTERS;
    runtime.waveSpawnCount = 0;
    runtime.waveBatchTimer = WAVE_BATCH_INTERVAL;
    runtime.waveTimer = WAVE_INTERVAL;
    runtime.combatGraceTimer = 0.8;

    const spawned = spawnMonsterBatch(w, WAVE_BATCH_SIZE);
    runtime.waveSpawnCount += spawned;

    showToast(`🌊 WAVE ${w}/20 [${themeInfo.title}]! 60초 동안 10초마다 10마리씩 총 60마리가 몰려옵니다!`);
    playTone(440, 0.14, "triangle", 0.07);
    playTone(587.33, 0.20, "triangle", 0.07, 0.1);
    syncHUD(true);
  }

  function spawnWaveTrio(waveNum) {
    spawnWaveHorde(waveNum);
  }

  function startWaveNow() {
    if (runtime.gameOver) return;
    if (runtime.waveActive && (runtime.monsters.length > 0 || runtime.waveSpawnCount < runtime.waveTotalToSpawn)) {
      showToast("⚔️ 현재 웨이브 전투가 진행 중입니다!");
      return;
    }
    if (state.allWavesCleared) {
      state.wave = 20;
    }
    spawnWaveHorde(state.wave);
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
      toGate: !!opts.toGate,
      tx: opts.tx !== undefined ? opts.tx : targetMonster ? targetMonster.x : fromX,
      tz: opts.tz !== undefined ? opts.tz : targetMonster ? targetMonster.z : fromZ,
      damage,
      speed,
      aoeRadius: opts.aoeRadius || 0,
      slowSec: opts.slowSec || 0,
      color,
      life: 0,
      maxLife: opts.maxLife || 2.2,
    });
  }

  function getNearestMonster(x = player.x, z = player.z, maxRange = HERO_ATTACK_RANGE) {
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
    if (player.x < GATE_POS.x + 0.3) {
      if (!silent) showToast("🏰 동쪽 수호 성문 밖으로 나가야 원소 스킬로 공격할 수 있습니다!");
      return false;
    }
    const def = UPGRADE_DEFS[skillId];
    const lv = getUpgradeLevel(skillId);
    if (!def || lv <= 0) {
      if (!silent) showToast(`🔒 ${def ? def.title : "스킬"}을 먼저 상점에서 해금하세요!`);
      return false;
    }
    if ((runtime.skillCooldowns[skillId] || 0) > 0) return false;

    const target = getNearestMonster(player.x, player.z, HERO_ATTACK_RANGE);
    if (!target && skillId !== "s5") {
      if (silent || skillId !== "s1") {
        if (!silent) showToast("👾 화면 사거리(8m) 안에 공격할 몬스터가 없습니다!");
        return false;
      }
    }

    runtime.skillCooldowns[skillId] = def.cooldown;
    player.swingTimer = player.swingDuration;
    playSkillSfx(skillId);

    const inRangeMonsters = runtime.monsters.filter(
      (m) => m.hp > 0 && Math.hypot(m.x - player.x, m.z - player.z) <= HERO_ATTACK_RANGE
    );

    const dmgMult = lv >= 3 ? 2.5 : lv === 2 ? 1.65 : 1.0;

    if (skillId === "s1") {
      const bolts = 1;
      const dmg = 38 * dmgMult;
      const aoeRad = 2.1;
      const dirX = Math.sin(player.rotY);
      const dirZ = Math.cos(player.rotY);
      for (let i = 0; i < bolts; i++) {
        const tgt = inRangeMonsters.length > 0 ? inRangeMonsters[i % inRangeMonsters.length] : null;
        spawnProjectile(player.x + (i - 0.5) * 0.3, 1.15, player.z, tgt, 0xff622e, dmg, 28.0, {
          tx: tgt ? tgt.x : player.x + dirX * 7.5 + (i - 0.5) * 0.4,
          tz: tgt ? tgt.z : player.z + dirZ * 7.5,
          radius: 0.30,
          aoeRadius: aoeRad,
          maxLife: 0.34,
        });
      }
      spawnShockwaveRing(player.x, 0.12, player.z, 0xff7849, 2.0, 0.24);
    } else if (skillId === "s2") {
      const dmg = 65 * dmgMult;
      const aoeRad = 4.2;
      const tx = target.x;
      const tz = target.z;
      applyAoEDamage(tx, tz, aoeRad, dmg, 1.8, 3.8, 0);
      spawnShockwaveRing(tx, 0.14, tz, 0x38bdf8, aoeRad, 0.55);
      spawnShockwaveRing(tx, 0.18, tz, 0xe0f2fe, aoeRad * 0.65, 0.38);
      spawnBurstVfx(tx, 1.4, tz, 0x93e2ff, 14);
    } else if (skillId === "s3") {
      const maxTargets = Math.min(inRangeMonsters.length, 5);
      const dmg = 88 * dmgMult;
      const shockRad = 2.6;
      for (let i = 0; i < maxTargets; i++) {
        const m = inRangeMonsters[i];
        spawnLightningPillar(m.x, m.z, 0xfef08a, 0.32);
        spawnShockwaveRing(m.x, 0.10, m.z, 0x60a5fa, shockRad, 0.32);
        applyAoEDamage(m.x, m.z, shockRad, dmg, 0.8, 0, 0.7);
      }
    } else if (skillId === "s4") {
      const count = 4;
      const dmg = 150 * dmgMult;
      const meteorRad = 4.2;
      for (let i = 0; i < count; i++) {
        const m = inRangeMonsters.length > 0 ? inRangeMonsters[i % inRangeMonsters.length] : target;
        const ox = (Math.random() - 0.5) * 2.2;
        const oz = (Math.random() - 0.5) * 2.2;
        spawnMeteorStrike(m.x + ox, m.z + oz, dmg, meteorRad);
      }
    } else if (skillId === "s5") {
      const dmg = 260 * dmgMult;
      const novaRad = 9.5;
      applyAoEDamage(player.x, player.z, novaRad, dmg, 5.5, 2.5, 0.9);
      applyAoEDamage(GATE_POS.x + 4.0, GATE_POS.z, novaRad, dmg * 0.85, 5.5, 2.5, 0.9);
      spawnShockwaveRing(player.x, 0.16, player.z, 0xe879f9, novaRad, 0.60);
      spawnShockwaveRing(GATE_POS.x + 3.0, 0.24, GATE_POS.z, 0x38bdf8, novaRad * 0.85, 0.52);
      spawnShockwaveRing(GATE_POS.x + 3.0, 0.30, GATE_POS.z, 0xfacc15, novaRad * 0.55, 0.40);
      spawnBurstVfx(player.x, 1.2, player.z, 0xfef08a, 18);
      const maxHp = getGateMaxHp();
      const healAmt = Math.round(maxHp * 0.3);
      state.gateHp = Math.min(maxHp, (state.gateHp || 0) + healAmt);
      state.heroHp = state.gateHp;
      if (sceneObjs.villageGate && sceneObjs.villageGate.hpFillPivot) {
        sceneObjs.villageGate.hpFillPivot.scale.x = Math.max(0.01, state.gateHp / maxHp);
      }
      spawnFloatingText(GATE_POS.x, 3.8, GATE_POS.z, `+🏰 ${healAmt}`, "#4ade80");
    }
    return true;
  }

  function applyGateDamage(amount) {
    if (runtime.gameOver || runtime.combatGraceTimer > 0) return;
    const dmg = Math.max(1, Math.round(amount));
    const maxHp = getGateMaxHp();
    state.gateHp = Math.max(0, (state.gateHp || 0) - dmg);
    state.heroHp = state.gateHp;
    if (sceneObjs.villageGate && sceneObjs.villageGate.hpFillPivot) {
      sceneObjs.villageGate.hpFillPivot.scale.x = Math.max(0.01, state.gateHp / maxHp);
    }
    spawnFloatingText(GATE_POS.x, 3.8, GATE_POS.z, `-🏰 ${dmg}`, "#ff5b77");
    if (window.Engine && typeof window.Engine.addShake === "function") {
      window.Engine.addShake(0.18);
    }

    if (state.gateHp <= 0) {
      triggerGameOver();
    }
  }

  function applyHeroDamage(amount) {
    applyGateDamage(amount);
  }

  function updateGateAttackBanner(show, distMeters = 0) {
    if (typeof document === "undefined") return;
    let banner = document.getElementById("gate-attack-banner");
    if (!banner) {
      if (!document.getElementById("gate-attack-banner-style")) {
        const st = document.createElement("style");
        st.id = "gate-attack-banner-style";
        st.textContent = `
          @keyframes gateWarnPulse {
            0%   { transform: translateX(-50%) scale(0.96); box-shadow: 0 0 18px rgba(239, 68, 68, 0.75); }
            100% { transform: translateX(-50%) scale(1.05); box-shadow: 0 0 34px rgba(250, 204, 21, 0.95); }
          }
        `;
        document.head.appendChild(st);
      }
      banner = document.createElement("div");
      banner.id = "gate-attack-banner";
      Object.assign(banner.style, {
        display: "none",
        position: "fixed",
        top: "14%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "9999",
        padding: "16px 28px",
        borderRadius: "18px",
        background: "linear-gradient(135deg, rgba(185, 28, 28, 0.96), rgba(220, 38, 38, 0.96))",
        border: "3px solid #fde047",
        color: "#ffffff",
        fontSize: "19px",
        fontWeight: "900",
        textAlign: "center",
        lineHeight: "1.45",
        pointerEvents: "none",
        animation: "gateWarnPulse 0.65s infinite alternate",
      });
      document.body.appendChild(banner);
    }

    if (show && !runtime.gameOver) {
      banner.innerHTML = `🚨 성문이 공격받고 있습니다!<br><span style="font-size:15px;color:#fef08a;">동쪽 성문 앞으로 이동해 방어하세요! (남은 거리: ${Math.round(distMeters)}m)</span>`;
      banner.style.display = "block";
    } else {
      banner.style.display = "none";
    }
  }

  function triggerGameOver() {
    runtime.gameOver = true;
    updateGateAttackBanner(false);
    playTone(196, 0.35, "sawtooth", 0.08);
    if (typeof document !== "undefined") {
      const badge = document.getElementById("gameover-badge");
      const title = document.getElementById("gameover-title");
      const desc = document.getElementById("gameover-desc");
      if (badge) badge.textContent = "💥 GATE DESTROYED";
      if (title) title.textContent = "💔 마을 출입구 성문이 무너졌습니다!";
      if (desc) desc.textContent = `WAVE ${state.wave} 공세를 성문이 버티지 못했습니다. 성문 증축과 ★1~★5 원소 스킬을 강화한 뒤 재도전하세요!`;
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
    for (const fx of runtime.fxMeshes) {
      if (Engine && Engine.vfxGroup && fx.mesh) Engine.vfxGroup.remove(fx.mesh);
    }
    runtime.fxMeshes.length = 0;
    for (const p of runtime.particles) {
      if (Engine && Engine.vfxGroup && p.mesh) Engine.vfxGroup.remove(p.mesh);
    }
    runtime.particles.length = 0;
    runtime.waveActive = false;
    runtime.waveSpawnCount = 0;
    runtime.waveBatchTimer = 0;
    runtime.waveTimer = 15.0;
    runtime.gameOver = false;
    updateGateAttackBanner(false);
    state.gateHp = getGateMaxHp();
    state.heroHp = state.gateHp;
    if (sceneObjs.villageGate && sceneObjs.villageGate.hpFillPivot) {
      sceneObjs.villageGate.hpFillPivot.scale.x = 1;
    }
    player.x = HERO_SPAWN.x;
    player.z = HERO_SPAWN.z;

    if (typeof document !== "undefined") {
      const modal = document.getElementById("gameover-modal");
      if (modal) modal.classList.remove("open");
    }
    showToast(`🔄 성문 내구도 100% 수복! WAVE ${state.wave} 재도전 준비 완료!`);
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

    if (state.autoSkill && runtime.monsters.length > 0 && player.x >= GATE_POS.x + 0.3) {
      const near = getNearestMonster(player.x, player.z, HERO_ATTACK_RANGE);
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

    // 2. Passive Village Gate Repair & Defense Turrets / Aegis Shrine
    const maxHp = getGateMaxHp();
    const regenRate = (runtime.waveActive ? 0 : 4.0) + state.shrineAegisLv * 8.0;
    if (state.gateHp < maxHp && regenRate > 0) {
      state.gateHp = Math.min(maxHp, state.gateHp + regenRate * dt);
    }
    state.heroHp = state.gateHp;

    const isUnderSiege = runtime.waveActive || runtime.monsters.length > 0;
    const distToGate = Math.hypot(player.x - GATE_POS.x, player.z - GATE_POS.z);
    updateGateAttackBanner(isUnderSiege && distToGate > 7.5, distToGate);

    if (sceneObjs.villageGate && window.Entities) {
      if (sceneObjs.villageGate.hpFillPivot) {
        sceneObjs.villageGate.hpFillPivot.scale.x = Math.max(0.01, state.gateHp / maxHp);
      }
      const underAttack = runtime.monsters.some((m) => m.x <= GATE_POS.x + 5.0);
      if (window.Entities.animateVillageGate) {
        window.Entities.animateVillageGate(sceneObjs.villageGate, underAttack, dt);
      }
    }

    for (const id of DEFENSE_IDS) {
      const t = runtime.turrets[id];
      if (!t || t.lv <= 0) continue;
      if (t.cooldown > 0) t.cooldown -= dt;
      const target = getNearestMonster(t.x, t.z, TURRET_ATTACK_RANGE);
      window.Entities.animateDefenseTurret(t.entity, !!target, dt);

      if (target && t.cooldown <= 0) {
        if (id === "turret_flame") {
          t.cooldown = Math.max(0.55, 1.45 - t.lv * 0.08);
          spawnProjectile(t.x, 1.35, t.z, target, 0xff5a28, 30 + t.lv * 16, 26.0, { radius: 0.32, aoeRadius: 2.6 + t.lv * 0.14, maxLife: 0.40 });
        } else if (id === "turret_frost") {
          t.cooldown = Math.max(0.55, 1.25 - t.lv * 0.06);
          spawnProjectile(t.x, 1.45, t.z, target, 0x38bdf8, 22 + t.lv * 14, 26.5, { radius: 0.28, aoeRadius: 2.2, slowSec: 2.8, maxLife: 0.40 });
        } else if (id === "turret_thunder") {
          t.cooldown = Math.max(0.85, 2.0 - t.lv * 0.09);
          const inRange = runtime.monsters.filter((m) => m.hp > 0 && Math.hypot(m.x - t.x, m.z - t.z) <= TURRET_ATTACK_RANGE);
          const count = Math.min(inRange.length, 4 + Math.floor(t.lv / 2));
          for (let ci = 0; ci < count; ci++) {
            const m = inRange[ci];
            spawnLightningPillar(m.x, m.z, 0xc084fc, 0.28);
            damageMonster(m, 34 + t.lv * 16);
            m.stunTimer = Math.max(m.stunTimer || 0, 0.35);
          }
        } else if (id === "shrine_aegis") {
          const closeDist = Math.hypot(target.x - GATE_POS.x, target.z - GATE_POS.z);
          if (closeDist < 6.5) {
            t.cooldown = 4.0;
            applyAoEDamage(GATE_POS.x + 1.0, GATE_POS.z, 6.5, 28 + t.lv * 18, 6.0, 1.8, 0);
            spawnShockwaveRing(GATE_POS.x + 1.0, 0.14, GATE_POS.z, 0x4ade80, 6.0, 0.45);
          }
        }
      }
    }

    // 3. Wave Timer & 60-Second Horde Batch Spawner (10 monsters every 10s, total 60)
    if (!runtime.waveActive && !state.allWavesCleared) {
      runtime.waveTimer -= dt;
      if (runtime.waveTimer <= 0) {
        spawnWaveHorde(state.wave);
      }
    } else if (runtime.waveActive && runtime.waveSpawnCount < runtime.waveTotalToSpawn) {
      runtime.waveBatchTimer -= dt;
      if (runtime.waveBatchTimer <= 0) {
        runtime.waveBatchTimer += WAVE_BATCH_INTERVAL;
        const left = runtime.waveTotalToSpawn - runtime.waveSpawnCount;
        const batch = Math.min(WAVE_BATCH_SIZE, left);
        runtime.waveSpawnCount += spawnMonsterBatch(runtime.waveCurrentNum || state.wave, batch);
        showToast(`⚠️ 추가 몬스터 ${batch}마리 출현! (${runtime.waveSpawnCount}/${runtime.waveTotalToSpawn})`);
      }
    }

    // 4. Monster AI (Siege East Gate only, strictly clamped outside village!) & Deaths
    const Engine = window.Engine;
    for (let i = runtime.monsters.length - 1; i >= 0; i--) {
      const m = runtime.monsters[i];
      if (m.hp <= 0) {
        if (Engine && Engine.unitGroup && m.entity && m.entity.root) {
          Engine.unitGroup.remove(m.entity.root);
        }
        spawnBurstVfx(m.x, 0.8, m.z, 0x4ade80, 6);
        state.gems += m.reward;
        state.totalEarnedGems += m.reward;
        const eTier = m.energyTier || 1;
        const eAmt = m.energyReward || 2;
        addEnergyAmount(eTier, eAmt);
        const eIcon = ENERGY_META[eTier] ? ENERGY_META[eTier].icon : "🔮";
        spawnFloatingText(m.x, 1.8, m.z, `+💵${m.reward} +${eIcon}${eAmt}`, "#7effa2");
        addXp(4);
        playGemChime(4);
        runtime.monsters.splice(i, 1);
        continue;
      }

      if (m.slowTimer > 0) m.slowTimer = Math.max(0, m.slowTimer - dt);
      if (m.stunTimer > 0) m.stunTimer = Math.max(0, m.stunTimer - dt);
      if (m.atkTimer > 0) m.atkTimer -= dt;

      m.x += m.vx * dt;
      m.z += m.vz * dt;
      m.vx *= Math.exp(-8 * dt);
      m.vz *= Math.exp(-8 * dt);

      const goalX = GATE_POS.x + 1.35;
      const goalZ = m.targetOffsetZ !== undefined ? m.targetOffsetZ : 0;
      const dx = goalX - m.x;
      const dz = goalZ - m.z;
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
              toGate: true,
              tx: GATE_POS.x,
              tz: GATE_POS.z + (m.targetOffsetZ || 0) * 0.5,
              radius: 0.24,
            });
          } else {
            applyGateDamage(m.atk);
            spawnBurstVfx(GATE_POS.x + 0.5, 1.3, m.z, 0xff4d6d, 5);
          }
        }
      }

      m.x = Math.max(GATE_POS.x + 1.2, Math.min(42.5, m.x));
      m.z = Math.max(-3.8, Math.min(3.8, m.z));

      m.entity.root.position.set(m.x, 0, m.z);
      m.entity.root.rotation.y = Math.atan2(GATE_POS.x - m.x, (m.targetOffsetZ || 0) * 0.5 - m.z);
      window.Entities.animateCuteMonster(m.entity, dt, m.slowTimer > 0);
    }

    // 5. Projectiles
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
          if (p.toGate || p.x <= GATE_POS.x + 1.8) {
            applyGateDamage(p.damage);
          }
          spawnBurstVfx(p.x, 0.9, p.z, 0xf472b6, 4);
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

    // 6. Wave Clear Progression (1 ~ 20) + 5-Wave Territory Expansion (Wave 6, 11, 16)
    if (runtime.waveActive && runtime.waveSpawnCount >= runtime.waveTotalToSpawn && runtime.monsters.length === 0) {
      runtime.waveActive = false;
      updateGateAttackBanner(false);
      const clearedW = state.wave;
      const bonus = 100 * clearedW;
      state.gems += bonus;
      state.totalEarnedGems += bonus;
      playBuildPop();
      spawnFloatingText(GATE_POS.x - 1.5, 2.8, GATE_POS.z, `🎉 WAVE ${clearedW} 클리어 +💵 ${bonus.toLocaleString()}`, "#fde047");

      if (clearedW < TOTAL_WAVES) {
        const nextWave = clearedW + 1;
        state.wave = nextWave;
        runtime.waveTimer = WAVE_INTERVAL;
        if (isWaveExpansionMilestone(nextWave)) {
          const newEra = nextWave === 6 ? 2 : nextWave === 11 ? 3 : 4;
          state.unlockedEra = Math.max(state.unlockedEra || 1, newEra);
          refreshFarmZoneVisibility();
          refreshFacilityVisibility();
          ensureSpecialVehiclesSpawned();
          const panCoords = newEra === 2 ? [-12.2, -25.8] : newEra === 3 ? [12.2, -25.8] : [0.0, -38.0];
          if (window.Engine && typeof window.Engine.panCameraTo === "function") {
            window.Engine.panCameraTo(panCoords[0], panCoords[1], 2.0);
          }
          const eInfo = ERA_INFO[newEra];
          showToast(`🎊 영토 대확장 [Era ${newEra}]! '${eInfo.name}' & 스킬 상한 Lv.${eInfo.maxCap} 해금!`);
        } else {
          showToast(`🏆 WAVE ${clearedW} 성문 수호 성공! 보너스 💵 ${bonus.toLocaleString()} · 다음 웨이브 3분 뒤 시작`);
        }
      } else {
        state.allWavesCleared = true;
        runtime.waveTimer = 0;
        showToast("👑 축하합니다! 총 20단계 대침공으로부터 황금 대성채를 끝까지 지켜냈습니다!");
      }
      saveGame();
      syncHUD(true);
    }
  }

  // ---------------------------------------------------------------------------
  // Tycoon Movement, Harvesting, Facilities, Pedestals & Workers
  // ---------------------------------------------------------------------------
  function resolveWorldBoundsAndCollisions(obj, radius = 0.65) {
    const era = getUnlockedEra();
    if (obj.z > 20.0) {
      if (obj.z < 21.8) {
        obj.x = Math.max(-3.8, Math.min(3.8, obj.x));
      } else {
        obj.x = Math.max(-16.6, Math.min(16.6, obj.x));
      }
      obj.z = Math.min(era >= 4 ? 60.5 : era === 3 ? 52.8 : era === 2 ? 45.2 : 37.5, obj.z);
    } else if (obj.x > 24.0) {
      if (obj.x < 25.4) {
        obj.z = Math.max(-3.6, Math.min(3.6, obj.z));
      } else {
        obj.z = Math.max(-5.2, Math.min(5.2, obj.z));
      }
      obj.x = Math.min(40.5, obj.x);
    } else if (obj.z < -20.0) {
      const minZ = era >= 4 ? -43.8 : era >= 2 ? -31.4 : -19.2;
      let minX = -23.2;
      let maxX = 23.2;
      if (obj.z >= -32.2) {
        if (era === 2) maxX = -0.8;
        else if (era === 3 && era < 2) minX = 0.8;
      }
      obj.x = Math.max(minX, Math.min(maxX, obj.x));
      obj.z = Math.max(minZ, obj.z);
    } else {
      const maxX = Math.abs(obj.z) <= 3.6 ? 40.5 : 23.2;
      const maxZ = Math.abs(obj.x) <= 3.8 ? 60.5 : 19.2;
      let minZ = -19.2;
      if ((era >= 2 && obj.x <= -1.2) || (era >= 3 && obj.x >= 1.2) || era >= 4) {
        minZ = era >= 4 ? -43.8 : -31.4;
      }
      obj.x = Math.max(-23.2, Math.min(maxX, obj.x));
      obj.z = Math.max(minZ, Math.min(maxZ, obj.z));
    }

    const boxes = [{ cx: STALL_POS.x, cz: STALL_POS.z, hw: 1.65 + radius, hd: 1.05 + radius }];
    for (const bld of runtime.buildings) {
      if (bld.era && era < bld.era) continue;
      boxes.push({ cx: bld.x, cz: bld.z, hw: 1.55 + radius, hd: 1.45 + radius });
    }
    for (const m of runtime.machines) {
      if (m.lv <= 0 || era < (m.cfg.era || 1)) continue;
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
    const pickRad = getHeroPickRadius();
    const multiHit = getHeroMultiHit();
    if (player.harvestCooldown <= 0 && player.bagItems.length < bagCap) {
      const candidates = [];
      for (const node of runtime.farmNodes) {
        if (!isZoneUnlocked(node.zone) || node.respawnTimer > 0) continue;
        const d = Math.hypot(node.x - player.x, node.z - player.z);
        if (d < pickRad) candidates.push({ node, d });
      }
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.d - b.d);
        player.swingTimer = player.swingDuration;
        player.harvestCooldown = getHeroHarvestInterval();
        const hitCount = Math.min(multiHit, candidates.length);
        for (let hi = 0; hi < hitCount && player.bagItems.length < bagCap; hi++) {
          let rawYield = getHeroHarvestYield();
          if (Math.random() < getHeroDoubleDropChance()) {
            rawYield *= 2;
            spawnFloatingText(candidates[hi].node.x, 1.8, candidates[hi].node.z, "🍀 2배 수확!", "#fde047");
          }
          const yieldCount = Math.min(bagCap - player.bagItems.length, rawYield);
          harvestNode(candidates[hi].node, yieldCount, player.bagItems, player.x, player.z, true);
        }
        playHarvestChime(player.bagItems.length);
        addXp(3 * hitCount);
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

  function stepAutoConveyors(dt) {
    const lab2Lv = state.alchemyLab2Lv || 0;
    if (lab2Lv <= 0 && (state.m9Lv || 0) <= 0) return;
    runtime.conveyorTimer = (runtime.conveyorTimer || 0) + dt;
    const interval = Math.max(0.32, 0.95 - (lab2Lv - 1) * 0.25);
    if (runtime.conveyorTimer < interval) return;
    runtime.conveyorTimer = 0;

    const links = [
      { reqLab2: true, fromIdx: 0, toIdx: 3, toQueueKey: "inQueue", color: 0xd67aff },
      { reqLab2: true, fromIdx: 1, toIdx: 5, toQueueKey: "inQueue", color: 0x52ff9b },
      { reqLab2: true, fromIdx: 5, toIdx: 7, toQueueKey: "inQueueC", color: 0xfacc15 },
      { reqLab2: false, fromIdx: 7, toIdx: 8, toQueueKey: "inQueue", color: 0xf43f5e },
    ];
    for (const lk of links) {
      if (lk.reqLab2 && lab2Lv <= 0) continue;
      const src = runtime.machines[lk.fromIdx];
      const dst = runtime.machines[lk.toIdx];
      if (!src || !dst || src.lv <= 0 || dst.lv <= 0) continue;
      const dstQ = dst[lk.toQueueKey];
      if (src.outQueue.length > 0 && dstQ.length < 20) {
        const item = src.outQueue.pop();
        const dstPos = lk.toQueueKey === "inQueueC" ? dst.cfg.inPosC : dst.cfg.inPos;
        spawnFlyingItem(item, src.cfg.outPos.x, 1.0, src.cfg.outPos.z, dstPos.x, 0.5, dstPos.z, () => {
          dstQ.push(item);
        });
      }
    }
  }

  function updatePalletsAndHeroTransfers(dt) {
    if (player.transferCooldown > 0) player.transferCooldown -= dt;
    const era = getUnlockedEra();
    stepAutoConveyors(dt);

    for (const m of runtime.machines) {
      if (m.lv <= 0 || era < (m.cfg.era || 1)) continue;
      let inPulse = 0;
      let inBPulse = 0;
      let inCPulse = 0;

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
      if (m.inPalletC && m.cfg.inPosC && Math.hypot(player.x - m.cfg.inPosC.x, player.z - m.cfg.inPosC.z) < 2.25) {
        inCPulse = 1;
        if (player.transferCooldown <= 0) {
          transferTypedFromBagToQueue(m.cfg.inputTypeC, m.cfg.inPosC.x, m.cfg.inPosC.z, m.inQueueC, 24);
        }
      }

      window.Entities.updateWoodenPalletZone(m.inPallet, inPulse, runtime.time);
      if (m.inPalletB) window.Entities.updateWoodenPalletZone(m.inPalletB, inBPulse, runtime.time);
      if (m.inPalletC) window.Entities.updateWoodenPalletZone(m.inPalletC, inCPulse, runtime.time);
      if (m.dockPallet) window.Entities.updateWoodenPalletZone(m.dockPallet, m.outQueue.length > 0 ? 1 : 0, runtime.time);

      const hasInputs =
        m.inQueue.length > 0 &&
        (!m.cfg.inPosB || m.inQueueB.length > 0) &&
        (!m.cfg.inPosC || m.inQueueC.length > 0);
      const isProcessing = hasInputs && m.outQueue.length < 24;
      if (isProcessing) {
        const speedMult = 1 + (m.lv - 1) * 0.28;
        m.craftProgress += (dt * speedMult) / m.cfg.baseCraftTime;
        if (m.craftProgress >= 1) {
          m.craftProgress -= 1;
          m.inQueue.shift();
          if (m.cfg.inPosB) m.inQueueB.shift();
          if (m.cfg.inPosC) m.inQueueC.shift();
          m.outQueue.push(m.cfg.outputType);
          const lab3Lv = state.alchemyLab3Lv || 0;
          if (lab3Lv > 0 && m.outQueue.length < 24 && Math.random() < 0.30 + (lab3Lv - 1) * 0.12) {
            m.outQueue.push(m.cfg.outputType);
            spawnFloatingText(m.cfg.x, 2.6, m.cfg.z, "⚡ 1+1 대성공!", "#e879f9");
          }
          spawnBurstVfx(m.cfg.outPos.x, 1.15, m.cfg.outPos.z, 0xffe066, 4);
        }
      } else if (!hasInputs) {
        m.craftProgress = 0;
      }

      window.Entities.animateProductionMachine(m.entity, isProcessing, dt);
      syncCrateStackVisuals(m.inPallet.stackAnchor, m.inQueue, m.inVisuals, { cols: 2, rows: 2, xStep: 1.0, zStep: 0.68, maxDraw: 24 });
      if (m.inPalletB) syncCrateStackVisuals(m.inPalletB.stackAnchor, m.inQueueB, m.inVisualsB, { cols: 2, rows: 2, xStep: 1.0, zStep: 0.68, maxDraw: 24 });
      if (m.inPalletC) syncCrateStackVisuals(m.inPalletC.stackAnchor, m.inQueueC, m.inVisualsC, { cols: 2, rows: 2, xStep: 1.0, zStep: 0.68, maxDraw: 24 });
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

    for (const cfg of LAB_CONFIGS) {
      const labObj = runtime.labs[cfg.id];
      if (!labObj) continue;
      const lv = getUpgradeLevel(cfg.id);
      let labPulse = 0;
      if (lv >= 1 && era >= cfg.era) {
        if (Math.hypot(player.x - cfg.inPos.x, player.z - cfg.inPos.z) < 2.45) {
          labPulse = 1;
          if (player.transferCooldown <= 0 && labObj.queue.length < 18) {
            transferTypedFromBagToQueue(cfg.inputType, cfg.inPos.x, cfg.inPos.z, labObj.queue, 18);
          }
        }
        if (labObj.queue.length > 0) {
          const cycleSec = Math.max(0.75, 1.45 - (lv - 1) * 0.25);
          labObj.progress += dt;
          while (labObj.progress >= cycleSec && labObj.queue.length > 0) {
            labObj.progress -= cycleSec;
            labObj.queue.pop();
            const tierMult = cfg.era;
            const d1 = (lv >= 3 ? 28 : lv === 2 ? 22 : 18) * tierMult;
            const d2 = (lv >= 2 || cfg.era >= 2 ? 16 + lv * 4 : 4) * tierMult;
            const d3 = (lv >= 3 || cfg.era >= 3 ? 12 + lv * 3 : lv >= 2 ? 3 : 0) * tierMult;
            addEnergyAmount(1, d1);
            if (d2 > 0) addEnergyAmount(2, d2);
            if (d3 > 0) addEnergyAmount(3, d3);
            playTone(940, 0.09, "triangle", 0.04);
          }
        } else {
          labObj.progress = 0;
        }
      }
      if (labObj.inPallet) {
        window.Entities.updateWoodenPalletZone(labObj.inPallet, labPulse, runtime.time);
        if (labObj.inPallet.stackAnchor) {
          syncCrateStackVisuals(labObj.inPallet.stackAnchor, labObj.queue, labObj.visuals, {
            cols: 2,
            rows: 2,
            xStep: 1.04,
            zStep: 0.74,
            maxDraw: 18,
          });
        }
      }
    }
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

    const dockStopX = 16.8;
    const dockZ = -13.8;
    const turnX = 19.8;
    const eastParkX = 39.5;
    let spd = 0;

    const moveToward = (tx, tz, moveSpd) => {
      const dx = tx - w.x;
      const dz = tz - w.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= moveSpd * dt + 0.12) {
        w.x = tx;
        w.z = tz;
        return true;
      }
      w.x += (dx / dist) * moveSpd * dt;
      w.z += (dz / dist) * moveSpd * dt;
      w.rotY = Math.atan2(dx, dz);
      return false;
    };

    if (w.state === "waiting_east") {
      w.timer -= dt;
      if (m3.outQueue.length >= 1) w.state = "arriving";
      else if (w.timer <= 0) w.timer = 2.0;
    } else if (w.state === "arriving") {
      spd = 7.4;
      if (w.x > turnX + 0.3 && Math.abs(w.z) < 1.2) {
        moveToward(turnX, 0.0, spd);
      } else if (w.z > dockZ + 0.3) {
        moveToward(turnX, dockZ, spd);
      } else if (moveToward(dockStopX, dockZ, spd)) {
        w.state = "loading";
        w.timer = 0.85;
      }
    } else if (w.state === "loading") {
      w.timer -= dt;
      if (m3.outQueue.length > 0 && Math.floor((w.timer + dt) * 6) !== Math.floor(w.timer * 6)) {
        m3.outQueue.pop();
        w.cargoCount++;
        const earn = Math.round(m3.cfg.salePrice * getPriceMultiplier());
        addCashToPedestal(3, earn);
        spawnBurstVfx(m3.cfg.cashPos.x, 1.4, m3.cfg.cashPos.z, 0x2ecc71, 10);
        spawnFloatingText(m3.cfg.cashPos.x, 2.2, m3.cfg.cashPos.z, `+💵 ${earn} 👑`, "#ffe36e");
        playGemChime(14);
      }
      if (w.timer <= 0 && m3.outQueue.length === 0) w.state = "departing";
      else if (w.timer <= 0) w.timer = 0.35;
    } else if (w.state === "departing") {
      spd = 8.4;
      if (w.z < -1.0 && w.x < turnX - 0.3) {
        moveToward(turnX, dockZ, spd);
      } else if (w.z < -0.3) {
        moveToward(turnX, 0.0, spd);
      } else if (moveToward(eastParkX, 0.0, spd)) {
        w.cargoCount = 0;
        w.state = "waiting_east";
        w.timer = 3.5;
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

  function updateSpecialVehicles(dt) {
    const era = getUnlockedEra();
    const mult = getPriceMultiplier();
    const m4 = runtime.machines[3];
    const b = runtime.balloon;
    if (b && m4 && m4.lv > 0 && era >= 2) {
      let moving = false;
      if (b.state === "dock") {
        b.x = -15.0; b.z = -29.5; b.y = 2.2 + Math.sin(runtime.time * 2.2) * 0.22;
        if (m4.outQueue.length > 0 && b.timer <= 0) {
          m4.outQueue.pop();
          const earn = Math.round(m4.cfg.salePrice * mult);
          addCashToPedestal(4, earn);
          spawnFloatingText(m4.cfg.cashPos.x, 2.5, m4.cfg.cashPos.z, `+💵 ${earn} 🎈`, "#fb7185");
          b.cargoCount = Math.min(4, b.cargoCount + 1);
          b.timer = 0.7;
          if (b.cargoCount >= 2 || m4.outQueue.length === 0) b.state = "depart";
        } else b.timer = Math.max(0, b.timer - dt);
      } else if (b.state === "depart") {
        moving = true;
        b.x -= 4.8 * dt; b.y = Math.min(5.2, b.y + 1.8 * dt);
        if (b.x < -27.5) b.state = "return";
      } else {
        moving = true;
        b.x += 5.8 * dt; b.y = Math.max(2.2, b.y - 1.8 * dt);
        if (b.x >= -15.0) { b.x = -15.0; b.cargoCount = 0; b.state = "dock"; b.timer = 0.5; }
      }
      b.entity.root.position.set(b.x, b.y, b.z);
      if (window.Entities.animateHotAirBalloon) window.Entities.animateHotAirBalloon(b.entity, dt, moving);
    }

    const m6 = runtime.machines[5];
    const tr = runtime.train;
    if (tr && m6 && m6.lv > 0 && era >= 3) {
      let spd = 0;
      if (tr.state === "dock") {
        tr.x = 8.2;
        if (m6.outQueue.length > 0 && tr.timer <= 0) {
          m6.outQueue.pop();
          const earn = Math.round(m6.cfg.salePrice * mult);
          addCashToPedestal(6, earn);
          spawnFloatingText(m6.cfg.cashPos.x, 2.5, m6.cfg.cashPos.z, `+💵 ${earn.toLocaleString()} 🚂`, "#facc15");
          tr.cargoCount = Math.min(4, tr.cargoCount + 1);
          tr.timer = 0.65;
          if (tr.cargoCount >= 2 || m6.outQueue.length === 0) tr.state = "depart";
        } else tr.timer = Math.max(0, tr.timer - dt);
      } else if (tr.state === "depart") {
        spd = 7.5; tr.x += spd * dt;
        if (tr.x > 26.5) tr.state = "return";
      } else {
        spd = 7.5; tr.x -= spd * dt;
        if (tr.x <= 8.2) { tr.x = 8.2; tr.cargoCount = 0; tr.state = "dock"; tr.timer = 0.5; }
      }
      tr.entity.root.position.set(tr.x, 0.12, -29.8);
      if (window.Entities.animateArmoredTrain) window.Entities.animateArmoredTrain(tr.entity, spd, dt);
    }

    const m9 = runtime.machines[8];
    const a = runtime.airship;
    if (a && m9 && m9.lv > 0 && era >= 4) {
      const lab4Bonus = (state.alchemyLab4Lv || 0) >= 1 ? 2.0 : 1.0;
      if (a.state === "dock") {
        a.x = 15.4; a.z = -40.5; a.y = 3.0 + Math.sin(runtime.time * 1.9) * 0.24;
        if (m9.outQueue.length > 0 && a.timer <= 0) {
          m9.outQueue.pop();
          const earn = Math.round(m9.cfg.salePrice * mult * lab4Bonus);
          addCashToPedestal(9, earn);
          spawnFloatingText(m9.cfg.cashPos.x, 3.0, m9.cfg.cashPos.z, `+💵 ${earn.toLocaleString()} 🛸`, "#fde047");
          playGemChime(18);
          a.cargoCount = Math.min(4, a.cargoCount + 1);
          a.timer = 0.8;
          if (a.cargoCount >= 2 || m9.outQueue.length === 0) a.state = "depart";
        } else a.timer = Math.max(0, a.timer - dt);
      } else if (a.state === "depart") {
        a.x += 6.2 * dt; a.z -= 2.4 * dt; a.y = Math.min(7.5, a.y + 1.4 * dt);
        if (a.x > 29.5) a.state = "return";
      } else {
        a.x -= 6.5 * dt; a.z = Math.min(-40.5, a.z + 2.4 * dt); a.y = Math.max(3.0, a.y - 1.4 * dt);
        if (a.x <= 15.4) { a.x = 15.4; a.cargoCount = 0; a.state = "dock"; a.timer = 0.6; }
      }
      a.entity.root.position.set(a.x, a.y, a.z);
      if (window.Entities.animateGoldenAirship) window.Entities.animateGoldenAirship(a.entity, dt);
    }
  }

  function updateCustomersAndCashPedestals(dt) {
    const era = getUnlockedEra();
    const mult = getPriceMultiplier();
    if (runtime.sellCooldown > 0) runtime.sellCooldown -= dt;
    if (runtime.sellCooldown <= 0 && runtime.sellPalletQueue.length > 0) {
      runtime.sellCooldown = 0.55;
      runtime.sellPalletQueue.pop();
      addCashToPedestal(0, Math.round(10 * mult));
      spawnBurstVfx(STALL_POS.x + 0.5, 1.4, STALL_POS.z + 1.5, 0x2ecc71, 4);

      const lead = runtime.customers.find((c) => c.slot === 0 && !c.leaving);
      if (lead) {
        lead.leaving = true;
        lead.targetX = STALL_POS.x - 5.2;
        lead.targetZ = STALL_POS.z + 5.8;
      }
    }
    advanceCustomerQueue(runtime.customers, dt, STALL_POS.x - 3.2, STALL_POS.z - 2.6, 1.45, Math.PI * 0.5, -5.2, STALL_POS.z + 5.8);

    for (let i = 0; i < runtime.machines.length; i++) {
      const m = runtime.machines[i];
      if (!m || m.lv <= 0 || !m.showcase || era < (m.cfg.era || 1)) continue;
      if (m.saleCooldown > 0) m.saleCooldown -= dt;
      if (m.saleCooldown <= 0 && m.outQueue.length > 0) {
        m.saleCooldown = m.cfg.id === "m7" ? 0.45 : 0.65;
        m.outQueue.pop();
        addCashToPedestal(i + 1, Math.round(m.cfg.salePrice * mult));
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

    const m8 = runtime.machines[7];
    const m9 = runtime.machines[8];
    if (m8 && m8.lv > 0 && (!m9 || m9.lv <= 0) && m8.outQueue.length > 6) {
      if (m8.saleCooldown > 0) m8.saleCooldown -= dt;
      if (m8.saleCooldown <= 0) {
        m8.saleCooldown = 1.5;
        m8.outQueue.pop();
        addCashToPedestal(8, Math.round(m8.cfg.salePrice * mult));
      }
    }

    updateWagon(dt);
    updateSpecialVehicles(dt);

    if (runtime.gemVacuumCooldown > 0) runtime.gemVacuumCooldown -= dt;
    const magnetRad = getCashMagnetRadius();
    let activePed = null;
    for (let i = 0; i < runtime.pedestals.length; i++) {
      const ped = runtime.pedestals[i];
      if (i > 0 && runtime.machines[i - 1] && runtime.machines[i - 1].lv <= 0) continue;
      if (ped.cashValues.length === 0) continue;
      if (Math.hypot(player.x - ped.x, player.z - ped.z) < magnetRad) {
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
    const era = getUnlockedEra();
    const m5AuraMult = (state.m5Lv || 0) > 0 && era >= 2 ? 1.3 : 1.0;
    const hasTeleport = (state.alchemyLab4Lv || 0) >= 1 && era >= 4;

    const wantedTypes = ["blue_ore"];
    if (state.herbGroveUnlocked) wantedTypes.push("rainbow_herb");
    if (era >= 2) wantedTypes.push("fire_mana_stone", "spirit_dew");
    if (era >= 3) wantedTypes.push("lightning_crystal", "moon_mushroom");
    if (era >= 4) wantedTypes.push("star_meteorite", "dragon_scale_flower");

    for (const f of runtime.fairies) {
      if (f.workTimer > 0) f.workTimer -= dt;
      const wantedType = wantedTypes[f.idx % wantedTypes.length];

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
          if (hasTeleport && Math.hypot(tx - f.x, tz - f.z) > 12.0) {
            spawnBurstVfx(f.x, 1.0, f.z, 0xe879f9, 5);
            f.x = tx - 0.8;
            f.z = tz - 0.8;
            spawnBurstVfx(f.x, 1.0, f.z, 0xfacc15, 6);
          }
          if (Math.hypot(tx - f.x, tz - f.z) < 1.25 && f.workTimer <= 0) {
            f.workTimer = 0.38;
            harvestNode(f.targetNode, 1, f.bag, f.x, f.z, false);
            if (f.bag.length >= cap) f.state = "deliver";
          }
        }
      } else {
        const carryType = f.bag[0] || "blue_ore";
        let destPos = SELL_PALLET_POS;
        let destQueue = runtime.sellPalletQueue;
        let maxQ = 36;
        let deliverType = carryType;

        if (carryType === "blue_ore") {
          if (!Array.isArray(runtime.alchemyLabQueue)) runtime.alchemyLabQueue = [];
          if (state.alchemyLabLv >= 1 && runtime.alchemyLabQueue.length < 6) {
            destPos = ALCHEMY_LAB_IN_POS; destQueue = runtime.alchemyLabQueue; maxQ = 18;
          } else if (m3 && m3.lv > 0 && m3.inQueue.length < 18 && (!m1 || m3.inQueue.length <= m1.inQueue.length)) {
            destPos = m3.cfg.inPos; destQueue = m3.inQueue; maxQ = 24;
          } else if (m1 && m1.lv > 0 && m1.inQueue.length < 24) {
            destPos = m1.cfg.inPos; destQueue = m1.inQueue; maxQ = 24;
          }
        } else {
          let matched = false;
          for (const m of runtime.machines) {
            if (m.lv <= 0 || era < (m.cfg.era || 1)) continue;
            if (m.cfg.inputType === carryType && m.inQueue.length < 22) {
              destPos = m.cfg.inPos; destQueue = m.inQueue; maxQ = 24; matched = true; break;
            }
            if (m.cfg.inputTypeB === carryType && m.inQueueB.length < 22) {
              destPos = m.cfg.inPosB; destQueue = m.inQueueB; maxQ = 24; matched = true; break;
            }
          }
          if (!matched) {
            for (const cfg of LAB_CONFIGS) {
              if (era >= cfg.era && getUpgradeLevel(cfg.id) > 0 && cfg.inputType === carryType) {
                const lObj = runtime.labs[cfg.id];
                if (lObj && lObj.queue.length < 18) {
                  destPos = cfg.inPos; destQueue = lObj.queue; maxQ = 18; matched = true; break;
                }
              }
            }
          }
          if (!matched && carryType === "rainbow_herb" && m2 && m2.lv > 0) {
            destPos = m2.cfg.inPos; destQueue = m2.inQueue; maxQ = 24;
          }
        }

        tx = destPos.x;
        tz = destPos.z;
        if (hasTeleport && Math.hypot(tx - f.x, tz - f.z) > 12.0) {
          spawnBurstVfx(f.x, 1.0, f.z, 0xe879f9, 5);
          f.x = tx;
          f.z = tz + 0.8;
          spawnBurstVfx(f.x, 1.0, f.z, 0xfacc15, 6);
        }
        if (Math.hypot(tx - f.x, tz - f.z) < 1.45) {
          for (let bi = f.bag.length - 1; bi >= 0 && destQueue.length < maxQ; bi--) {
            if (f.bag[bi] === deliverType) destQueue.push(f.bag.splice(bi, 1)[0]);
          }
          if (f.bag.length === 0) f.state = "seek_node";
          else if (destPos === SELL_PALLET_POS) {
            f.bag.length = 0;
            f.state = "seek_node";
          } else {
            f.bag.pop();
            if (f.bag.length === 0) f.state = "seek_node";
          }
        }
      }

      let navX = tx;
      let navZ = tz;
      if (!hasTeleport) {
        const fInsideSouth = f.z <= 19.4;
        const tOutsideSouth = tz > 20.4;
        const fOutsideSouth = f.z >= 20.6;
        const tInsideSouth = tz < 19.6;
        if ((fInsideSouth && tOutsideSouth) || (fOutsideSouth && tInsideSouth)) {
          if (Math.hypot(f.x - SOUTH_GATE_POS.x, f.z - SOUTH_GATE_POS.z) > 1.8) {
            navX = SOUTH_GATE_POS.x;
            navZ = SOUTH_GATE_POS.z;
          }
        }
      }

      const dx = navX - f.x;
      const dz = navZ - f.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.15) {
        const spd = (6.4 + state.speedLv * 0.35) * m5AuraMult;
        let nextX = f.x + (dx / dist) * Math.min(dist, spd * dt);
        let nextZ = f.z + (dz / dist) * Math.min(dist, spd * dt);
        if (!hasTeleport) {
          // Keep fairies inside side walls and only cross z=20 through the south gate opening
          if (nextZ < 20.4 && nextZ > 19.2 && Math.abs(nextX) > 2.4) {
            nextZ = f.z <= 19.8 ? 19.2 : 20.4;
          }
          if (nextZ <= 19.8) {
            nextX = Math.max(-23.0, Math.min(23.0, nextX));
          }
        }
        f.x = nextX;
        f.z = nextZ;
        f.entity.root.rotation.y = Math.atan2(dx, dz);
      }
      f.entity.root.position.set(f.x, 0, f.z);
      window.Entities.animateFairy(f.entity, dt);
      syncCrateStackVisuals(f.entity.bagAnchor, f.bag, f.bagVisuals, { cols: 1, yStep: 0.21, maxDraw: 10 });
    }
  }

  function stepSingleTruck(tr, dt) {
    if (!tr) return;
    const era = getUnlockedEra();
    const m5AuraMult = (state.m5Lv || 0) > 0 && era >= 2 ? 1.3 : 1.0;
    const maxCargo = 14 + state.truckLv * 6;
    const speed = (5.4 + state.truckLv * 0.75) * m5AuraMult;

    let tx = 0.0;
    let tz = 26.5;
    if (tr.state === "harvest") {
      const waypoints = [{ x: -12.0, z: 24.5 }, { x: -12.0, z: 29.0 }];
      if (state.herbGroveUnlocked) waypoints.push({ x: 12.0, z: 29.0 }, { x: 12.0, z: 24.5 });
      if (era >= 2) waypoints.push({ x: -12.0, z: 41.2 }, { x: 12.0, z: 41.2 });
      if (era >= 3) waypoints.push({ x: -12.0, z: 48.8 }, { x: 12.0, z: 48.8 });
      if (era >= 4) waypoints.push({ x: -12.0, z: 56.4 }, { x: 12.0, z: 56.4 });

      const wp = waypoints[tr.waypointIdx % waypoints.length];
      tx = wp.x;
      tz = wp.z;
      if (Math.hypot(tx - tr.x, tz - tr.z) < 1.2) tr.waypointIdx = (tr.waypointIdx + 1) % waypoints.length;

      for (const node of runtime.farmNodes) {
        if (!isZoneUnlocked(node.zone) || node.respawnTimer > 0) continue;
        if (tr.bag.length >= maxCargo) break;
        if (Math.hypot(node.x - tr.x, node.z - tr.z) < 3.4) harvestNode(node, 1, tr.bag, tr.x, tr.z, false);
      }
      if (tr.bag.length >= maxCargo) tr.state = "return";
    } else if (tr.state === "return") {
      if (tr.z > 21.8) {
        tx = 0.0; tz = 21.2;
      } else if (tr.z > 18.0) {
        tx = 0.0; tz = 17.0;
      } else {
        tx = 0.0; tz = -7.0;
        if (Math.hypot(tx - tr.x, tz - tr.z) < 2.2) {
          const m1 = runtime.machines[0];
          const m2 = runtime.machines[1];
          const m3 = runtime.machines[2];
          while (tr.bag.length > 0) {
            const item = tr.bag.pop();
            let delivered = false;
            if (item === "blue_ore") {
              if (m3 && m3.lv > 0 && m3.inQueue.length < 24 && (!m1 || m3.inQueue.length <= m1.inQueue.length)) {
                m3.inQueue.push(item); delivered = true;
              } else if (m1 && m1.lv > 0 && m1.inQueue.length < 24) {
                m1.inQueue.push(item); delivered = true;
              }
            } else {
              for (const m of runtime.machines) {
                if (m.lv <= 0 || era < (m.cfg.era || 1)) continue;
                if (m.cfg.inputType === item && m.inQueue.length < 24) { m.inQueue.push(item); delivered = true; break; }
                if (m.cfg.inputTypeB === item && m.inQueueB.length < 24) { m.inQueueB.push(item); delivered = true; break; }
              }
            }
            if (!delivered && item === "rainbow_herb" && m2 && m2.lv > 0 && m2.inQueue.length < 24) {
              m2.inQueue.push(item); delivered = true;
            }
            if (!delivered && runtime.sellPalletQueue.length < 36) {
              runtime.sellPalletQueue.push(item);
            }
          }
          tr.state = "exit";
        }
      }
    } else {
      tx = 0.0; tz = 22.8;
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

  function updateHarvesterTruck(dt) {
    stepSingleTruck(runtime.truck, dt);
    stepSingleTruck(runtime.truck2, dt);
  }

  function updateStepPads(dt) {
    for (const sp of runtime.stepPads) {
      if (!isEraUnlockedFor(sp.id)) continue;
      const def = UPGRADE_DEFS[sp.id];
      const spec = getUpgradeCostSpec(sp.id);
      const isGlobalMax = getUpgradeLevel(sp.id) >= def.maxLv;
      const isCapped = spec.mode === "locked";
      const isMax = isGlobalMax;
      const lv = getUpgradeLevel(sp.id);

      const dx = Math.abs(player.x - sp.x);
      const dz = Math.abs(player.z - sp.z);
      const isStepped = dx < sp.w * 0.48 && dz < sp.d * 0.48;
      if (!isStepped) sp._justUpgraded = false;

      let priceText = isCapped ? spec.text : "MAX";
      let ratio = isGlobalMax ? 1 : 0;
      let canAfford = false;

      if (!isMax && !isCapped) {
        if (spec.mode === "cash") {
          const cost = spec.cash;
          const paid = state.padPaid[sp.id] || 0;
          const remaining = Math.max(0, cost - paid);
          if (isStepped && state.gems > 0 && remaining > 0) {
            const drainRate = Math.max(cost * 1.45, 72);
            const take = Math.min(remaining, state.gems, Math.max(1, Math.ceil(drainRate * dt)));
            if (take > 0) {
              state.gems -= take;
              state.padPaid[sp.id] = paid + take;
              if (Math.floor(runtime.time * 16) !== Math.floor((runtime.time - dt) * 16)) playTone(720, 0.04, "sine", 0.03);
              if (state.padPaid[sp.id] >= cost) {
                applyUpgradeLevel(sp.id);
                sp._justUpgraded = true;
              }
            }
          }
          const newRemaining = Math.max(0, cost - (state.padPaid[sp.id] || 0));
          ratio = cost > 0 ? (state.padPaid[sp.id] || 0) / cost : 0;
          priceText = `💵 ${newRemaining.toLocaleString()}`;
          canAfford = state.gems >= newRemaining;
        } else if (spec.mode === "energy") {
          const cost = spec.energy;
          const paid = state.padPaid[sp.id] || 0;
          const remaining = Math.max(0, cost - paid);
          const avail = getEnergyAmount(spec.energyTier);
          if (isStepped && avail > 0 && remaining > 0) {
            const drainRate = Math.max(cost * 1.45, 36);
            const take = Math.min(remaining, avail, Math.max(1, Math.ceil(drainRate * dt)));
            if (take > 0) {
              addEnergyAmount(spec.energyTier, -take);
              state.padPaid[sp.id] = paid + take;
              if (Math.floor(runtime.time * 16) !== Math.floor((runtime.time - dt) * 16)) playTone(860, 0.04, "triangle", 0.03);
              if (state.padPaid[sp.id] >= cost) {
                applyUpgradeLevel(sp.id);
                sp._justUpgraded = true;
              }
            }
          }
          const newRemaining = Math.max(0, cost - (state.padPaid[sp.id] || 0));
          const icon = (ENERGY_META[spec.energyTier] && ENERGY_META[spec.energyTier].icon) || "🔮";
          ratio = cost > 0 ? (state.padPaid[sp.id] || 0) / cost : 0;
          priceText = `${icon} ${newRemaining}`;
          canAfford = getEnergyAmount(spec.energyTier) >= newRemaining;
        } else {
          priceText = spec.text;
          ratio = 0;
          canAfford = canAffordUpgrade(sp.id);
          if (isStepped && canAfford && !sp._justUpgraded) {
            deductUpgradeCost(sp.id);
            applyUpgradeLevel(sp.id);
            sp._justUpgraded = true;
          }
        }
      }

      window.Entities.updateStepPadTexture(sp.pad, {
        dirLabel: def.dirLabel || "",
        icon: def.icon,
        title: def.title,
        price: priceText,
        levelText: isGlobalMax ? "MAX" : `Lv.${lv}`,
        accentHex: def.accent,
        paidRatio: ratio,
        isMax: isGlobalMax,
        unlocked: !isCapped,
        canAfford: !isMax && !isCapped && canAfford,
        isStepped,
      });
    }
  }

  function updateGuideArrow() {
    const hero = sceneObjs.hero;
    if (!hero || !hero.guideArrowGroup) return;

    const nearestMon = getNearestMonster(player.x, player.z, 30);
    const bagCap = getHeroBagCap();
    const oreCount = player.bagItems.filter((item) => item === "blue_ore").length;
    const hasOre = oreCount > 0;
    const hasHerb = player.bagItems.includes("rainbow_herb");
    const m1 = runtime.machines[0];
    const m2 = runtime.machines[1];
    const starterPed = runtime.pedestals[0];
    const starterCashCount = starterPed ? starterPed.cashValues.length : 0;

    let tx = -10.0;
    let tz = 25.4;
    let stepLabel = "1단계 · 광석 채집";
    let guideText = "⛏️ 남쪽 출입구 광산에서 푸른 광석을 캐세요!";
    let colorHex = 0xffe629;

    // [초반 단일 순차 튜토리얼: 1호기(m1) 완공 전까지는 오직 '광석 -> 원석 교역소 -> 1호기' 순서만 안내]
    if (state.m1Lv === 0) {
      const m1Cost = getUpgradeCost("m1");

      if (state.gems >= m1Cost) {
        tx = MACHINE_CONFIGS[0].padPos.x;
        tz = MACHINE_CONFIGS[0].padPos.z;
        stepLabel = "3단계 · 1호기 건설";
        guideText = "⚙️ 북쪽 공방 [1호기 크리스탈 세공기] 발판을 밟아 건설하세요!";
        colorHex = 0xd67aff;
      } else if (starterCashCount > 0) {
        tx = GEM_PEDESTAL_POS.x;
        tz = GEM_PEDESTAL_POS.z;
        stepLabel = "2단계 · 교역소 수금";
        guideText = "💵 원석 교역소 북쪽 [돈 받는 곳]에서 캐시를 수금하세요!";
        colorHex = 0x2ecc71;
      } else if (hasOre) {
        tx = SELL_PALLET_POS.x;
        tz = SELL_PALLET_POS.z;
        stepLabel = "2단계 · 원석 교역소";
        guideText = "📦 서쪽 [원석 교역소] 남쪽 발판에 푸른 광석을 판매하세요!";
        colorHex = 0x38bdf8;
      } else {
        let bestDist = Infinity;
        for (const n of runtime.farmNodes) {
          if (!isZoneUnlocked(n.zone) || n.respawnTimer > 0 || n.itemType !== "blue_ore") continue;
          const d = Math.hypot(n.x - player.x, n.z - player.z);
          if (d < bestDist) {
            bestDist = d;
            tx = n.x;
            tz = n.z;
          }
        }
        stepLabel = "1단계 · 광석 채집";
        guideText = "⛏️ 남쪽 출입구 광산에서 푸른 광석을 캐세요!";
        colorHex = 0xffe629;
      }
    } else {
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

      if (nearestMon) {
        tx = nearestMon.x;
        tz = nearestMon.z;
        stepLabel = `🏰 WAVE ${state.wave} 성문 수호`;
        guideText = "⚔️ 동쪽 성문 앞으로 이동해 몬스터 공세를 막아내세요!";
        colorHex = 0xff5b77;
      } else if (state.alchemyLabLv === 0 && state.gems >= getUpgradeCost("alchemy_lab")) {
        tx = ALCHEMY_LAB_PAD_POS.x;
        tz = ALCHEMY_LAB_PAD_POS.z;
        stepLabel = "4단계 · 제1연구소";
        guideText = "🔮 남쪽 [제1연금술 연구소] 발판을 밟아 건설하고 차원 에너지를 얻으세요!";
        colorHex = 0xc084fc;
      } else if (state.alchemyLabLv >= 1 && state.dim1 < 40 && state.fairyCount === 0 && hasOre) {
        tx = ALCHEMY_LAB_IN_POS.x;
        tz = ALCHEMY_LAB_IN_POS.z;
        stepLabel = "차원 에너지 연성";
        guideText = "🔮 [제1연구소] 투입구에 광석을 넣으면 차원 에너지(🔮/💠)가 생성됩니다!";
        colorHex = 0xc084fc;
      } else if (state.m2Lv === 0 && state.gems >= getUpgradeCost("m2")) {
        tx = MACHINE_CONFIGS[1].padPos.x;
        tz = MACHINE_CONFIGS[1].padPos.z;
        stepLabel = "약초 숲 해금";
        guideText = "⚗️ [2호기 포션 양조기]를 건설하면 남동쪽 약초 숲(🌿)이 열립니다!";
        colorHex = 0x52ff9b;
      } else if (nearestCashPed) {
        tx = nearestCashPed.x;
        tz = nearestCashPed.z;
        stepLabel = "💵 돈 받기";
        guideText = "💵 '돈 받는 곳' 발판으로 가서 지폐 다발을 수금하세요!";
        colorHex = 0x2ecc71;
      } else if (player.bagItems.length >= bagCap || ((hasOre || hasHerb) && player.bagItems.length >= 4)) {
        if (hasHerb && m2 && m2.lv > 0) {
          tx = m2.cfg.inPos.x;
          tz = m2.cfg.inPos.z;
          stepLabel = "2호기 약초 투입";
          guideText = "⚗️ 2호기 양조기 투입구에 무지개 약초를 넣으세요!";
          colorHex = 0x52ff9b;
        } else if (hasOre && m1 && m1.lv > 0) {
          tx = m1.cfg.inPos.x;
          tz = m1.cfg.inPos.z;
          stepLabel = "1호기 광석 투입";
          guideText = "⚙️ 1호기 세공기 투입구에 푸른 광석을 넣으세요!";
          colorHex = 0xd67aff;
        } else {
          tx = SELL_PALLET_POS.x;
          tz = SELL_PALLET_POS.z;
          stepLabel = "원석 교역소 판매";
          guideText = "📦 서쪽 [원석 교역소]에 광석을 판매하세요!";
          colorHex = 0x38bdf8;
        }
      } else {
        let bestDist = Infinity;
        for (const n of runtime.farmNodes) {
          if (!isZoneUnlocked(n.zone) || n.respawnTimer > 0) continue;
          const d = Math.hypot(n.x - player.x, n.z - player.z);
          if (d < bestDist) {
            bestDist = d;
            tx = n.x;
            tz = n.z;
            stepLabel = n.itemType === "rainbow_herb" ? "약초 채집" : "광석 채집";
            guideText = n.itemType === "rainbow_herb" ? "🌿 무지개 약초를 채집하세요!" : "⛏️ 푸른 광석을 채집하세요!";
            colorHex = n.itemType === "rainbow_herb" ? 0x52ff9b : 0xffe629;
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
    const counts = {};
    for (const t of player.bagItems) {
      counts[t] = (counts[t] || 0) + 1;
    }
    const parts = Object.entries(counts)
      .slice(0, 3)
      .map(([k, cnt]) => {
        const meta = ITEM_META[k];
        return meta ? `${meta.icon} ${meta.short} ${cnt}` : `📦 ${cnt}`;
      });
    const countsStr = parts.length ? parts.join(" | ") : `📦 ${total}`;

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
    const maxHp = getGateMaxHp();
    const gateHp = Math.max(0, state.gateHp ?? state.heroHp ?? maxHp);
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
    setText("ui-hp", `${Math.ceil(gateHp)} / ${maxHp}`);
    setWidth("ui-hp-fill", (gateHp / maxHp) * 100);
    setText("ui-gems", state.gems.toLocaleString());
    setText("ui-dim1", (state.dim1 || 0).toLocaleString());
    setText("ui-dim2", (state.dim2 || 0).toLocaleString());
    setText("ui-dim3", (state.dim3 || 0).toLocaleString());
    setText("ui-shop-cash", `💵 ${state.gems.toLocaleString()}`);
    setText("ui-shop-dim", `🔮 ${(state.dim1 || 0).toLocaleString()} · 💠 ${(state.dim2 || 0).toLocaleString()} · 🌟 ${(state.dim3 || 0).toLocaleString()}`);

    const era = getUnlockedEra();
    const eInfo = ERA_INFO[era] || ERA_INFO[1];
    const waveHud = document.getElementById("wave-hud");
    if (waveHud) waveHud.classList.toggle("combat-active", runtime.waveActive);
    setText("ui-wave-badge", `🌊 WAVE ${state.wave} / ${TOTAL_WAVES}`);
    setText("ui-wave-expansion", eInfo.nextText);
    if (state.allWavesCleared) {
      setText("ui-wave-timer", "🏆 20웨이브 완파!");
      setText("ui-wave-monsters", "황금 대성채 수호 완료");
    } else if (runtime.waveActive) {
      setText("ui-wave-timer", "⚔️ 성문 교전 중!");
      setText("ui-wave-monsters", `남은 적 ${runtime.monsters.length} · 출현 ${runtime.waveSpawnCount}/${runtime.waveTotalToSpawn || WAVE_TOTAL_MONSTERS}`);
    } else {
      const prefix = state.wave === 1 ? "첫 웨이브" : "다음 습격";
      setText("ui-wave-timer", `${prefix} ${formatMMSS(runtime.waveTimer)}`);
      setText("ui-wave-monsters", state.wave === 1 ? "평화 준비 중" : "정비 시간");
    }

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
      statsEl.textContent = `이동 ${spdPct}% · 요정 ${state.fairyCount}/20 · WAVE ${state.wave}/${TOTAL_WAVES} · ${Math.round(runtime.fpsSmooth)} FPS`;
    }
    setText("ui-shop-era", `🗺️ ${eInfo.name} (최대 Lv.3 스킬 · 성문 강화)`);
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
      const spec = getUpgradeCostSpec(def.id);
      const isGlobalMax = lv >= def.maxLv;
      const isLocked = spec.mode === "locked";
      const isMax = isUpgradeMax(def.id);
      const afford = !isMax && !isLocked && canAffordUpgrade(def.id);
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
              <span class="lv-badge">${isGlobalMax ? "MAX" : `Lv.${lv}/${def.maxLv}`}</span>
            </div>
            <div class="shop-item-desc">${def.desc}</div>
          </div>
        </div>
        <div class="shop-item-bottom">
          <div class="shop-item-prog-wrap">
            <div class="shop-item-prog-fill" style="width:${pct}%"></div>
          </div>
          <button class="shop-buy-btn ${afford ? "afford" : "locked"}" data-upgrade-id="${def.id}" ${isGlobalMax || isLocked ? "disabled" : ""}>
            ${isGlobalMax ? "MAX" : isLocked ? spec.text : lv === 0 && (def.tab === "skills" || def.tab === "defense") ? `해금 ${spec.text}` : spec.text}
          </button>
        </div>
      `;
      const btn = card.querySelector("button");
      if (btn) {
        btn.addEventListener("click", () => {
          if (!purchaseUpgradeDirect(def.id)) {
            if (spec.mode === "cash" || (spec.mode === "hybrid" && state.gems < spec.cash)) {
              showToast(`💵 캐시(${spec.cash.toLocaleString()})가 부족합니다! 광석·약초를 캐서 교역소·공장에 판매하세요.`);
            } else if (spec.energyTier === 1) {
              showToast(`🔮 1차 에너지(${spec.energy})가 부족합니다! [제1연구소]에 광석을 넣거나 Wave 1~6을 막으세요.`);
            } else if (spec.energyTier === 2) {
              showToast(`💠 2차 에너지(${spec.energy})가 부족합니다! [제1연구소] 광석 연성 또는 Wave 7~12 처치로 얻으세요.`);
            } else if (spec.energyTier === 3) {
              showToast(`🌟 3차 에너지(${spec.energy})가 부족합니다! [제1연구소 Lv.2+] 광석 연성 또는 Wave 13+ 처치로 얻으세요.`);
            }
          }
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
    state.s1Lv = Math.max(1, state.s1Lv || 1);
    const maxHp = getGateMaxHp();
    state.gateHp = Math.min(maxHp, Math.max(1, state.gateHp !== undefined ? state.gateHp : maxHp));
    state.heroHp = state.gateHp;
  }

  function resetGame() {
    Object.assign(state, createDefaultState());
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (e) {}
    }
    const Engine = window.Engine;
    player.x = HERO_SPAWN.x;
    player.z = HERO_SPAWN.z;
    player.vx = 0;
    player.vz = 0;
    player.bagItems.length = 0;
    runtime.sellPalletQueue.length = 0;
    if (Array.isArray(runtime.alchemyLabQueue)) runtime.alchemyLabQueue.length = 0;
    runtime.alchemyLabProgress = 0;
    for (const cfg of LAB_CONFIGS) {
      const lObj = runtime.labs[cfg.id];
      if (!lObj) continue;
      lObj.queue.length = 0;
      lObj.progress = 0;
      if (lObj.inPallet && lObj.inPallet.stackAnchor) {
        syncCrateStackVisuals(lObj.inPallet.stackAnchor, lObj.queue, lObj.visuals);
      }
    }
    runtime.waveTimer = FIRST_WAVE_DELAY;
    runtime.waveActive = false;
    runtime.waveSpawnCount = 0;
    runtime.waveTotalToSpawn = WAVE_TOTAL_MONSTERS;
    runtime.waveBatchTimer = 0;
    runtime.gameOver = false;
    updateGateAttackBanner(false);
    runtime.skillCooldowns = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
    if (sceneObjs.villageGate && sceneObjs.villageGate.hpFillPivot) {
      sceneObjs.villageGate.hpFillPivot.scale.x = 1;
    }

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
      if (m.inQueueC) m.inQueueC.length = 0;
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
      const om = document.getElementById("opening-modal");
      if (om) om.classList.add("open");
    }

    refreshFarmZoneVisibility();
    refreshFacilityVisibility();
    refreshDefenseTurretsVisibility();
    syncFairiesCount();
    ensureTruckSpawned();
    ensureWagonSpawned();
    ensureSpecialVehiclesSpawned();
    if (sceneObjs.hero) {
      window.Entities.updateHeroTier(sceneObjs.hero, 0);
      syncHeroArchmageAura();
      syncCrateStackVisuals(sceneObjs.hero.backStackAnchor, player.bagItems, runtime.heroBackVisuals);
    }
    updateStepPads(0.016);
    updateGuideArrow();
    syncHUD(true);
    showToast("💵 새로운 20웨이브 연금술 공방이 시작되었습니다!");
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
      unlockAudio();
      const om = document.getElementById("opening-modal");
      if (om && om.classList.contains("open") && (e.code === "Enter" || e.code === "Space")) {
        om.classList.remove("open");
        e.preventDefault();
        return;
      }
      input.keys.add(e.code);
      if (e.code === "Digit1") castSkill("s1");
      else if (e.code === "Digit2") castSkill("s2");
      else if (e.code === "Digit3") castSkill("s3");
      else if (e.code === "Digit4") castSkill("s4");
      else if (e.code === "Digit5") castSkill("s5");
    });
    window.addEventListener("pointerdown", () => unlockAudio(), { passive: true });
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
      const joyHintEl = document.getElementById("joystick-hint");
      if (joyHintEl && (window.innerWidth <= 768 || "ontouchstart" in window)) {
        joyHintEl.textContent = "조이스틱을 드래그해 숲을 탐험하세요";
      }
      joyZone.addEventListener("pointerdown", (e) => {
        if (input.joyActive) return;
        input.joyActive = true;
        input.joyId = e.pointerId;
        const isMobile = window.innerWidth <= 768 || (window.innerWidth <= 1024 && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
        if (isMobile && joyBase) {
          const rect = joyBase.getBoundingClientRect();
          const cx = rect.left + rect.width * 0.5;
          const cy = rect.top + rect.height * 0.5;
          const distToPad = Math.hypot(e.clientX - cx, e.clientY - cy);
          if (distToPad <= rect.width * 0.85) {
            input.originX = cx;
            input.originY = cy;
          } else {
            input.originX = e.clientX;
            input.originY = e.clientY;
          }
          joyBase.classList.add("active");
        } else {
          input.originX = e.clientX;
          input.originY = e.clientY;
          if (joyBase) {
            joyBase.style.left = `${e.clientX}px`;
            joyBase.style.top = `${e.clientY}px`;
            joyBase.classList.add("active");
          }
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
    clickBind("btn-start-mission", () => {
      unlockAudio();
      const om = document.getElementById("opening-modal");
      if (om) om.classList.remove("open");
      showToast("🎯 광석을 캐서 연구소와 기술을 개발하고, 동쪽 성문을 수호하세요!");
    });
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
      player.x = HERO_SPAWN.x;
      player.z = HERO_SPAWN.z;
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

    const popEl = document.getElementById("currency-guide-popover");
    const showCurrencyGuide = (kind) => {
      if (!popEl) return;
      if (popEl.classList.contains("open") && popEl.dataset.kind === kind) {
        popEl.classList.remove("open");
        return;
      }
      popEl.dataset.kind = kind;
      if (kind === "cash") {
        popEl.innerHTML = "<b>💵 캐시 (돈) 안내</b><br>• <b>획득:</b> 광석·약초·포션 판매 및 몬스터 처치<br>• <b>사용:</b> 🎒가방·⛏️곡괭이(최대 2회) 및 1~9호기·연구소 건설";
      } else {
        popEl.innerHTML = "<b>🔮💠🌟 차원 에너지 안내</b><br>• <b>🔮 1차:</b> 제1연구소(광석 투입) · Wave 1~6<br>• <b>💠 2차:</b> 제1연구소(Lv.1+ 소량/Lv.2 대량) · 제2연구소 · Wave 7~12<br>• <b>🌟 3차:</b> 제1연구소(Lv.2+ 소량/Lv.3 대량) · 제3·4연구소 · Wave 13~20<br>• <b>사용:</b> 🧚요정(최대 3) · ⚡스킬(최대 Lv.3) · 🏰성문 강화";
      }
      popEl.classList.add("open");
    };
    clickBind("btn-cash-info", (e) => { e.stopPropagation(); showCurrencyGuide("cash"); });
    clickBind("hud-dim-bar", (e) => { e.stopPropagation(); showCurrencyGuide("dim"); });
    document.addEventListener("click", () => {
      if (popEl) popEl.classList.remove("open");
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
    updateProceduralBgm(stepDt);
    for (const b of runtime.buildings) {
      if (window.Entities && typeof window.Entities.animateCategoryBuilding === "function") {
        window.Entities.animateCategoryBuilding(b.ent, stepDt);
      }
    }
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
    window.Entities.updateHeroTier(sceneObjs.hero, Math.min(4, Math.floor(state.toolLv / 4)));
    syncHeroArchmageAura();
    if (window.Engine) window.Engine.unitGroup.add(sceneObjs.hero.root);

    buildDenseFarmNodes();
    buildMarketAndQueue();
    buildProductionMachines();
    buildDefenseTurrets();
    buildStepPads();
    syncFairiesCount();
    ensureTruckSpawned();
    ensureWagonSpawned();
    ensureSpecialVehiclesSpawned();
    refreshFacilityVisibility();
    updateStepPads(0.016);
    updateGuideArrow();
    syncHUD(true);
    showToast("🎯 남쪽 출입구에서 자원을 캐 4대 연구소 & 1~9호기를 키우고, 10분 뒤 20웨이브 공세를 막아내세요!");

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
    LAB_CONFIGS,
    ERA_INFO,
    TOTAL_WAVES,
    SKILL_IDS,
    DEFENSE_IDS,
    GATE_POS,
    SOUTH_GATE_POS,
    ALCHEMY_LAB_POS,
    ALCHEMY_LAB_IN_POS,
    HERO_ATTACK_RANGE,
    TURRET_ATTACK_RANGE,
    FIRST_WAVE_DELAY,
    WAVE_INTERVAL,
    WAVE_TOTAL_MONSTERS,
    WAVE_BATCH_SIZE,
    getUnlockedEra,
    getEraSkillCap,
    getHeroPickRadius,
    getHeroMultiHit,
    getHeroDoubleDropChance,
    getCashMagnetRadius,
    getPriceMultiplier,
    getUpgradeCostSpec,
    canAffordUpgrade,
    refreshFarmZoneVisibility,
    refreshFacilityVisibility,
    ensureSpecialVehiclesSpawned,
    init,
    step,
    startWaveNow,
    castSkill,
    retryCurrentWave,
    purchaseUpgradeDirect,
    getGateMaxHp,
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

