/* ============================================================================
 * src/gameplay.js — Commercial 3D Hyper-Casual Fairy Alchemy Core Loop
 * Driven by AssetLoader (.glb), Engine (PerspectiveCamera + RoomEnvironment),
 * and Entities (AnimationMixer, Squash-and-Stretch, 3D Progress-Arc Pads).
 *
 * Step 4 Physics & Game Juice Features:
 *   - 1:1 Screen-Aligned Controls (vx = ix, vz = iy)
 *   - Tangent Wall Sliding Collisions
 *   - Incremental Stack Push/Pop Management (zero full-rebuild frame drops)
 *   - 0.04s Rapid Pop + 360-deg Spin + Quadratic Bezier Arc + Squash/Stretch
 *   - 2x2 Mana Gem Tower + Pop-Up Homing Magnet Vacuum + Rising Marimba/Harp SFX
 *   - Combat Hit-Stop, Knockback, Instant White Flash & 3D Tumbling Debris
 * ============================================================================ */
(function () {
  "use strict";

  var SAVE_KEY = "fairy_alchemy_glb_v2";
  var MEADOW_LIMIT_R = 25.0;
  var MAX_VISIBLE_BACK_STACK = 50;
  var MAX_COUNTER_STOCK = 60;
  var MAX_PEDESTAL_GEMS = 128;
  var BOSS_INTERVAL = 120;

  var CAULDRON_POS = { x: 0, y: 0.95, z: -5.5 };
  var SALES_POS = { x: -7.2, y: 1.35, z: 1.2 };
  var PEDESTAL_POS = { x: -5.2, y: 0.72, z: -1.8 };

  var RESOURCE_INFO = {
    starlight_crystal: { name: "별빛 수정", price: 14, color: 0x6ce8ff, css: "#57d9ff", raw: true },
    rainbow_berry:     { name: "무지개 열매", price: 10, color: 0xff62b8, css: "#ff72c0", raw: true },
    slime_jelly:       { name: "슬라임 젤리", price: 18, color: 0x6ff57e, css: "#6ff57e", raw: true },
    rainbow_potion:    { name: "무지개 포션", price: 42, color: 0xffb86c, css: "#ffd26e", raw: false },
    mana_gem:          { name: "마나 보석", price: 1, color: 0x3ef2ff, css: "#3ef2ff", raw: false }
  };

  var TIER_TITLES = [
    "견습 꼬마 마법사",
    "별빛 정원 마법사",
    "무지개 비술사",
    "숲의 대연금술사",
    "아크메이지 연금왕"
  ];

  var QUEUE_SLOTS = [
    { x: -7.2, z: 3.6 },
    { x: -8.1, z: 5.1 },
    { x: -9.1, z: 6.6 },
    { x: -10.1, z: 8.1 },
    { x: -11.1, z: 9.6 }
  ];
  var TRAIL_SPAWN = { x: -13.8, z: 12.2 };

  var NODE_SPOTS = [
    { type: "starlight_crystal", x: -2.2, z: -12.6 },
    { type: "rainbow_berry", x: 1.6, z: -13.4 },
    { type: "starlight_crystal", x: 10.6, z: -9.8 },
    { type: "rainbow_berry", x: 13.8, z: -6.4 },
    { type: "starlight_crystal", x: 13.4, z: -1.4 },
    { type: "rainbow_berry", x: 16.2, z: 0.4 },
    { type: "starlight_crystal", x: 14.4, z: 9.8 },
    { type: "rainbow_berry", x: 9.8, z: 12.4 },
    { type: "starlight_crystal", x: 4.8, z: 13.8 },
    { type: "rainbow_berry", x: -1.2, z: 13.6 },
    { type: "starlight_crystal", x: -4.8, z: 16.4 },
    { type: "rainbow_berry", x: -13.6, z: 3.4 },
    { type: "starlight_crystal", x: -13.4, z: -2.6 },
    { type: "rainbow_berry", x: -12.4, z: -7.8 },
    { type: "starlight_crystal", x: -8.6, z: -11.4 },
    { type: "rainbow_berry", x: -15.2, z: -12.8 },
    { type: "starlight_crystal", x: -9.8, z: -17.6 },
    { type: "rainbow_berry", x: -3.2, z: -19.2 },
    { type: "starlight_crystal", x: 3.6, z: -19.8 },
    { type: "rainbow_berry", x: 11.4, z: -16.8 },
    { type: "starlight_crystal", x: 17.6, z: -12.2 },
    { type: "rainbow_berry", x: 20.4, z: -5.4 },
    { type: "starlight_crystal", x: 21.2, z: 1.8 },
    { type: "rainbow_berry", x: 19.8, z: 10.6 },
    { type: "starlight_crystal", x: 13.4, z: 17.4 },
    { type: "rainbow_berry", x: 4.8, z: 20.6 },
    { type: "starlight_crystal", x: -18.8, z: 1.8 },
    { type: "rainbow_berry", x: -19.2, z: -6.4 }
  ];

  var CART_WAYPOINTS = [
    { x: -3.8, z: -1.2 },
    { x: 2.0, z: 2.2 },
    { x: 8.54, z: 4.81 },
    { x: 13.8, z: 12.2 },
    { x: 4.5, z: 17.2 },
    { x: -5.6, z: 17.6 },
    { x: -15.2, z: 13.8 },
    { x: -18.2, z: 1.8 },
    { x: -15.6, z: -11.4 },
    { x: -6.8, z: -17.2 },
    { x: 3.8, z: -18.4 },
    { x: 14.8, z: -13.8 },
    { x: 19.4, z: -4.4 },
    { x: 17.2, z: 3.6 },
    { x: 10.6, z: -6.2 },
    { x: 4.65, z: -7.1 },
    { x: 2.4, z: -2.2 }
  ];

  function createDefaultState() {
    return {
      gems: 60,
      totalGemsEarned: 60,
      crystalsHarvested: 0,
      potionsBrewed: 0,
      slimesDefeated: 0,
      level: 1,
      xp: 0,
      wave: 1,
      bossTimer: BOSS_INTERVAL,
      wandLv: 1,
      harvestLv: 1,
      bagLv: 1,
      speedLv: 1,
      cauldronLv: 1,
      fairies: 0,
      fairyLv: 1,
      cartLv: 0,
      wandUpgLv: 1,
      speedUpgLv: 1,
      pedestalGems: 0,
      bag: [],
      counterStock: [],
      muted: false,
      shopTab: "wizard"
    };
  }

  var state = createDefaultState();

  var player = {
    x: 0,
    z: 2.0,
    vx: 0,
    vz: 0,
    yaw: 0,
    walkPhase: 0,
    swingTimer: 0,
    swingDuration: 0.26,
    wandCooldown: 0,
    harvestCooldown: 0,
    feedCooldown: 0,
    sellCooldown: 0,
    gemCooldown: 0,
    stackInertiaX: 0,
    stackInertiaZ: 0,
    stackVelX: 0,
    stackVelZ: 0
  };

  var runtime = {
    initialized: false,
    ready: false,
    time: 0,
    saveTimer: 0,
    hitStopTimer: 0,
    joyX: 0,
    joyY: 0,
    keys: {},
    activePointerId: null,
    shopOpen: false,
    resetOpen: false,
    gemCombo: 0,
    gemComboTimer: 0,
    gemPopupAcc: 0,
    guideYaw: 0,
    lastTier: 1,
    cartWpIdx: 0,
    cartX: -3.8,
    cartZ: -1.2,
    cartYaw: 0,
    cartUnloadCooldown: 0,
    cartBag: [],
    toastTimer: 0
  };

  var audio = {
    ctx: null,
    unlocked: false
  };

  var dom = {};
  var sceneObjs = {
    wizard: null,
    cauldron: null,
    sales: null,
    pedestal: null,
    cart: null,
    nodes: [],
    slimes: [],
    fairies: [],
    customers: [],
    pads: [],
    projectiles: [],
    flyingItems: [],
    magnetGems: [],
    drops: [],
    rings: [],
    slashes: [],
    sparks: [],
    debris: [],
    popups: [],
    stackPool: {},
    activeStackMeshes: [],
    counterMeshes: [],
    pedestalMeshes: [],
    cartCargoMeshes: []
  };

  // =========================================================================
  // Audio Synthesizer (Rising Marimba/Harp SFX & Arcade Feedback)
  // =========================================================================
  var PENTA_FREQS = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];

  function unlockAudio() {
    if (audio.unlocked && audio.ctx) {
      if (audio.ctx.state === "suspended" && typeof audio.ctx.resume === "function") {
        audio.ctx.resume().catch(function () {});
      }
      return;
    }
    var AudioCtx = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AudioCtx) return;
    try {
      audio.ctx = audio.ctx || new AudioCtx();
      if (audio.ctx.state === "suspended" && typeof audio.ctx.resume === "function") {
        audio.ctx.resume().catch(function () {});
      }
      audio.unlocked = true;
    } catch (e) {
      audio.ctx = null;
    }
  }

  function playTone(freq, type, duration, gainPeak, slideTo) {
    if (state.muted || !audio.ctx) return;
    try {
      var now = audio.ctx.currentTime;
      var osc = audio.ctx.createOscillator();
      var gain = audio.ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainPeak || 0.08, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(audio.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) {}
  }

  function playHarvestChime() {
    var freq = PENTA_FREQS[Math.floor(Math.random() * 5)];
    playTone(freq, "triangle", 0.13, 0.075, freq * 1.16);
  }

  function playGemChime(combo) {
    // Rising dual-oscillator Marimba fundamental + bright Harp shimmer overtone
    var c = Math.max(0, combo || 0);
    var baseFreq = 392.0 * Math.pow(1.036, Math.min(32, c));
    playTone(baseFreq, "triangle", 0.11, 0.085, baseFreq * 1.03);
    playTone(baseFreq * 2.0, "sine", 0.16, 0.045, baseFreq * 2.04);
  }

  function playBoltCast() {
    playTone(720, "sine", 0.11, 0.045, 360);
  }

  function playHitPop() {
    playTone(260, "triangle", 0.08, 0.06, 130);
  }

  function playBuildPop() {
    playTone(523.25, "triangle", 0.14, 0.09);
    playTone(659.25, "sine", 0.18, 0.08, 783.99);
    playTone(1046.5, "sine", 0.24, 0.07);
  }

  function playBossFanfare() {
    playTone(392.0, "sawtooth", 0.16, 0.06);
    playTone(523.25, "triangle", 0.22, 0.08);
    playTone(659.25, "triangle", 0.34, 0.09, 783.99);
  }

  // =========================================================================
  // Progression Formulas & Helpers
  // =========================================================================
  function xpNeeded(lv) {
    return Math.round(60 * Math.pow(1.26, lv - 1));
  }

  function getWizardTier() {
    if (state.level >= 20) return 5;
    if (state.level >= 15) return 4;
    if (state.level >= 10) return 3;
    if (state.level >= 5) return 2;
    return 1;
  }

  function getBackpackCap() {
    return 25 + (state.bagLv - 1) * 18 + (state.level - 1) * 8;
  }

  function getMoveSpeed() {
    return 6.6 + (state.speedLv - 1) * 0.42;
  }

  function getHarvestPower() {
    return 12 + (state.harvestLv - 1) * 7 + (state.level - 1) * 2;
  }

  function getHarvestRange() {
    return 2.65 + (state.harvestLv - 1) * 0.14;
  }

  function getWandDamage() {
    return 16 + (state.wandLv - 1) * 9 + (state.level - 1) * 3;
  }

  function getWandRange() {
    return 7.8 + (state.wandLv - 1) * 0.25;
  }

  function getWandCooldown() {
    return Math.max(0.24, 0.72 - (state.wandLv - 1) * 0.03);
  }

  function getMultiShot() {
    if (state.wandLv >= 14) return 5;
    if (state.wandLv >= 9) return 3;
    if (state.wandLv >= 4) return 2;
    return 1;
  }

  function getCauldronMult() {
    return 3.0 + (state.cauldronLv - 1) * 0.25;
  }

  function formatNum(n) {
    var v = Math.floor(n);
    if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
    if (v >= 10000) return (v / 1000).toFixed(1) + "K";
    return String(v);
  }

  function showToast(msg) {
    if (!dom.toastBanner) return;
    dom.toastBanner.textContent = msg;
    dom.toastBanner.classList.add("show");
    runtime.toastTimer = 2.6;
  }

  function gainXp(amount) {
    state.xp += amount;
    var leveled = false;
    while (state.level < 25 && state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level += 1;
      leveled = true;
    }
    if (state.level >= 25) {
      state.xp = xpNeeded(25);
    }
    if (leveled) {
      var tier = getWizardTier();
      if (tier !== runtime.lastTier && sceneObjs.wizard) {
        runtime.lastTier = tier;
        Entities.updateWizardTier(sceneObjs.wizard, tier);
        showToast("각성! " + TIER_TITLES[tier - 1] + " 진화!");
      } else {
        showToast("레벨 업! Lv." + state.level);
      }
      playBuildPop();
      spawnShockwave(player.x, 0.2, player.z, 0xffd26e, 2.8);
      spawnPopup(player.x, 2.2, player.z, "LEVEL " + state.level + "!", "#ffe66d");
    }
  }

  // =========================================================================
  // Incremental Stack Mesh Pool & Push/Pop Management (Zero Full-Rebuild)
  // =========================================================================
  function acquirePooledMesh(type) {
    if (!sceneObjs.stackPool[type]) sceneObjs.stackPool[type] = [];
    var pool = sceneObjs.stackPool[type];
    if (pool.length > 0) {
      var reused = pool.pop();
      reused.visible = true;
      reused.rotation.set(0, 0, 0);
      reused.scale.set(1, 1, 1);
      return reused;
    }
    return Entities.createResourceMesh(type);
  }

  function releaseSingleMesh(type, mesh) {
    if (!mesh) return;
    if (mesh.parent) mesh.parent.remove(mesh);
    mesh.visible = false;
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    if (!sceneObjs.stackPool[type]) sceneObjs.stackPool[type] = [];
    sceneObjs.stackPool[type].push(mesh);
  }

  function releaseTaggedMeshes(list) {
    for (var i = 0; i < list.length; i++) {
      releaseSingleMesh(list[i].type, list[i].mesh);
    }
    list.length = 0;
  }

  function pushBackStackMesh(type) {
    if (!sceneObjs.wizard || !sceneObjs.wizard.backStackAnchor) return;
    if (sceneObjs.activeStackMeshes.length >= MAX_VISIBLE_BACK_STACK) {
      var bottomEntry = sceneObjs.activeStackMeshes.shift();
      releaseSingleMesh(bottomEntry.type, bottomEntry.mesh);
    }
    var idx = sceneObjs.activeStackMeshes.length;
    var mesh = acquirePooledMesh(type);
    mesh.scale.set(1.15, 0.85, 1.15);
    mesh.position.set(0, idx * 0.19, 0);
    sceneObjs.wizard.backStackAnchor.add(mesh);
    sceneObjs.activeStackMeshes.push({ type: type, mesh: mesh });
  }

  function popBackStackMeshAtBagIndex(bagIdx, prevBagLength) {
    var visLen = sceneObjs.activeStackMeshes.length;
    if (visLen === 0) return null;
    var startBagIdx = Math.max(0, prevBagLength - visLen);
    var visIdx = bagIdx - startBagIdx;
    var poppedWorldPos = { x: player.x, y: 1.05 + Math.max(0, visLen - 1) * 0.19, z: player.z };

    if (visIdx >= 0 && visIdx < visLen) {
      var entry = sceneObjs.activeStackMeshes[visIdx];
      if (entry.mesh && typeof entry.mesh.getWorldPosition === "function") {
        var wp = new THREE.Vector3();
        entry.mesh.getWorldPosition(wp);
        poppedWorldPos = { x: wp.x, y: wp.y, z: wp.z };
      }
      sceneObjs.activeStackMeshes.splice(visIdx, 1);
      releaseSingleMesh(entry.type, entry.mesh);
    }

    // If bag still had hidden items below the 50-item window, slide one into bottom
    if (state.bag.length >= MAX_VISIBLE_BACK_STACK && sceneObjs.activeStackMeshes.length < MAX_VISIBLE_BACK_STACK) {
      var revealIdx = state.bag.length - MAX_VISIBLE_BACK_STACK;
      var revealItem = state.bag[revealIdx];
      var revealMesh = acquirePooledMesh(revealItem.type);
      sceneObjs.wizard.backStackAnchor.add(revealMesh);
      sceneObjs.activeStackMeshes.unshift({ type: revealItem.type, mesh: revealMesh });
    }
    return poppedWorldPos;
  }

  function rebuildInitialBackStack() {
    releaseTaggedMeshes(sceneObjs.activeStackMeshes);
    if (!sceneObjs.wizard || !sceneObjs.wizard.backStackAnchor) return;
    var visibleCount = Math.min(MAX_VISIBLE_BACK_STACK, state.bag.length);
    var startIdx = Math.max(0, state.bag.length - visibleCount);
    for (var i = 0; i < visibleCount; i++) {
      var item = state.bag[startIdx + i];
      var mesh = acquirePooledMesh(item.type);
      mesh.position.set(0, i * 0.19, 0);
      sceneObjs.wizard.backStackAnchor.add(mesh);
      sceneObjs.activeStackMeshes.push({ type: item.type, mesh: mesh });
    }
  }

  function addToBag(type, value) {
    if (state.bag.length >= getBackpackCap()) return false;
    var info = RESOURCE_INFO[type] || RESOURCE_INFO.starlight_crystal;
    state.bag.push({
      type: type,
      value: typeof value === "number" ? value : info.price
    });
    if (type === "starlight_crystal" || type === "rainbow_berry" || type === "slime_jelly") {
      state.crystalsHarvested += 1;
    }
    pushBackStackMesh(type);
    return true;
  }

  function removeFromBagAt(idx) {
    if (idx < 0 || idx >= state.bag.length) return null;
    var prevLen = state.bag.length;
    var removed = state.bag.splice(idx, 1)[0];
    var originPos = popBackStackMeshAtBagIndex(idx, prevLen);
    return { item: removed, originPos: originPos || { x: player.x, y: 1.2, z: player.z } };
  }

  function layoutCounterMeshAt(entry, i) {
    var col = i % 3;
    var row = Math.floor(i / 3) % 2;
    var layer = Math.floor(i / 6);
    entry.mesh.scale.set(0.88, 0.88, 0.88);
    entry.mesh.position.set((col - 1.0) * 0.54, layer * 0.16, (row - 0.5) * 0.38);
  }

  function pushCounterStockMesh(type) {
    if (!sceneObjs.sales || !sceneObjs.sales.stockAnchor) return;
    if (sceneObjs.counterMeshes.length >= MAX_COUNTER_STOCK) return;
    var mesh = acquirePooledMesh(type);
    var entry = { type: type, mesh: mesh };
    layoutCounterMeshAt(entry, sceneObjs.counterMeshes.length);
    sceneObjs.sales.stockAnchor.add(mesh);
    sceneObjs.counterMeshes.push(entry);
  }

  function shiftCounterStockMesh() {
    if (sceneObjs.counterMeshes.length === 0) return;
    var entry = sceneObjs.counterMeshes.shift();
    releaseSingleMesh(entry.type, entry.mesh);
    // Reflow remaining visible slots sequentially
    for (var i = 0; i < sceneObjs.counterMeshes.length; i++) {
      layoutCounterMeshAt(sceneObjs.counterMeshes[i], i);
    }
    if (state.counterStock.length >= MAX_COUNTER_STOCK && sceneObjs.counterMeshes.length < MAX_COUNTER_STOCK) {
      var backIdx = MAX_COUNTER_STOCK - 1;
      pushCounterStockMesh(state.counterStock[backIdx].type);
    }
  }

  function addToCounterStock(item) {
    state.counterStock.push({ type: item.type, value: item.value });
    pushCounterStockMesh(item.type);
  }

  function rebuildInitialCounterStock() {
    releaseTaggedMeshes(sceneObjs.counterMeshes);
    var visibleCount = Math.min(MAX_COUNTER_STOCK, state.counterStock.length);
    for (var i = 0; i < visibleCount; i++) {
      pushCounterStockMesh(state.counterStock[i].type);
    }
  }

  function pushPedestalGems(count) {
    if (!sceneObjs.pedestal || !sceneObjs.pedestal.stackAnchor) return;
    var target = Math.min(MAX_PEDESTAL_GEMS, Math.floor(state.pedestalGems + count));
    while (sceneObjs.pedestalMeshes.length < target) {
      var idx = sceneObjs.pedestalMeshes.length;
      var col = idx % 2;
      var row = Math.floor(idx / 2) % 2;
      var layer = Math.floor(idx / 4);
      var mesh = acquirePooledMesh("mana_gem");
      mesh.scale.set(0.95, 0.95, 0.95);
      mesh.position.set((col - 0.5) * 0.44, layer * 0.11, (row - 0.5) * 0.44);
      sceneObjs.pedestal.stackAnchor.add(mesh);
      sceneObjs.pedestalMeshes.push({ type: "mana_gem", mesh: mesh });
    }
  }

  function popPedestalTopGem() {
    var topIdx = sceneObjs.pedestalMeshes.length - 1;
    var spawnWorld = { x: PEDESTAL_POS.x, y: PEDESTAL_POS.y + 0.15, z: PEDESTAL_POS.z };
    if (topIdx >= 0) {
      var entry = sceneObjs.pedestalMeshes.pop();
      if (entry.mesh && typeof entry.mesh.getWorldPosition === "function") {
        var wp = new THREE.Vector3();
        entry.mesh.getWorldPosition(wp);
        spawnWorld = { x: wp.x, y: wp.y, z: wp.z };
      }
      releaseSingleMesh(entry.type, entry.mesh);
    }
    return spawnWorld;
  }

  function rebuildInitialPedestalGems() {
    releaseTaggedMeshes(sceneObjs.pedestalMeshes);
    if (state.pedestalGems > 0) {
      pushPedestalGems(0);
    }
  }

  function updateBackStackPhysics(dt, worldAx, worldAz) {
    if (!sceneObjs.wizard) return;
    var cosY = Math.cos(-player.yaw);
    var sinY = Math.sin(-player.yaw);
    var localAx = worldAx * cosY - worldAz * sinY;
    var localAz = worldAx * sinY + worldAz * cosY;

    var springK = 36;
    var damp = 7.8;
    player.stackVelX += (-localAx * 0.035 - springK * player.stackInertiaX - damp * player.stackVelX) * dt;
    player.stackVelZ += (-localAz * 0.035 - springK * player.stackInertiaZ - damp * player.stackVelZ) * dt;
    player.stackInertiaX = Math.max(-0.55, Math.min(0.55, player.stackInertiaX + player.stackVelX * dt));
    player.stackInertiaZ = Math.max(-0.55, Math.min(0.55, player.stackInertiaZ + player.stackVelZ * dt));

    var count = sceneObjs.activeStackMeshes.length;
    var moveRatio = Math.min(1, Math.hypot(player.vx, player.vz) / 6.0);
    for (var i = 0; i < count; i++) {
      var mesh = sceneObjs.activeStackMeshes[i].mesh;
      // Smooth elastic pop restore when pushed onto stack
      mesh.scale.x += (1 - mesh.scale.x) * Math.min(1, dt * 16);
      mesh.scale.y += (1 - mesh.scale.y) * Math.min(1, dt * 16);
      mesh.scale.z += (1 - mesh.scale.z) * Math.min(1, dt * 16);

      var hFactor = (i + 1) * 0.045;
      var quadFactor = Math.min(3.2, i * i * 0.0024 + hFactor);
      var swayX = player.stackInertiaX * quadFactor + Math.sin(runtime.time * 6.0 - i * 0.25) * 0.016 * moveRatio * (i / 10);
      var swayZ = player.stackInertiaZ * quadFactor - moveRatio * hFactor * 0.32;
      mesh.position.set(swayX, i * 0.19, swayZ);
      mesh.rotation.z = -swayX * 0.18;
      mesh.rotation.x = swayZ * 0.18;
    }
  }

  // =========================================================================
  // VFX, Quadratic Bezier Flying Items, Homing Magnet & 3D Debris
  // =========================================================================
  function spawnShockwave(x, y, z, colorHex, maxScale) {
    var mesh = Entities.createShockwaveRing(colorHex);
    mesh.position.set(x, y, z);
    mesh.scale.set(0.2, 0.2, 0.2);
    Engine.scene.add(mesh);
    sceneObjs.rings.push({
      mesh: mesh,
      life: 0,
      duration: 0.42,
      maxScale: maxScale || 2.0
    });
  }

  function spawnSlashArc(x, y, z, yaw, colorHex, scale) {
    if (!Entities.createSlashArcMesh) return;
    var arcObj = Entities.createSlashArcMesh(colorHex);
    arcObj.root.position.set(x, y, z);
    arcObj.root.rotation.y = yaw - Math.PI * 0.5;
    arcObj.root.rotation.z = (Math.random() - 0.5) * 0.24;
    var baseScale = scale || 1.0;
    arcObj.root.scale.setScalar(baseScale * 0.72);
    Engine.scene.add(arcObj.root);
    sceneObjs.slashes.push({
      mesh: arcObj.root,
      outerMat: arcObj.outerMat,
      innerMat: arcObj.innerMat,
      life: 0,
      duration: 0.22,
      startScale: baseScale * 0.72,
      endScale: baseScale * 1.48
    });
  }

  function spawnSparks(x, y, z, colorHex, count) {
    var total = count || 6;
    for (var i = 0; i < total; i++) {
      var mesh = Entities.createSparkParticle(colorHex);
      mesh.position.set(x, y, z);
      Engine.scene.add(mesh);
      var ang = Math.random() * Math.PI * 2;
      var spd = 2.0 + Math.random() * 3.8;
      sceneObjs.sparks.push({
        mesh: mesh,
        vx: Math.cos(ang) * spd,
        vy: 2.5 + Math.random() * 4.2,
        vz: Math.sin(ang) * spd,
        life: 0,
        duration: 0.42 + Math.random() * 0.22
      });
    }
  }

  function spawnDebrisParticles(x, y, z, colorHex, count) {
    var total = count || 6;
    for (var i = 0; i < total; i++) {
      var mesh = Entities.createDebrisMesh(colorHex);
      mesh.position.set(x, y, z);
      var sc = 0.7 + Math.random() * 0.75;
      mesh.scale.setScalar(sc);
      Engine.scene.add(mesh);
      var ang = Math.random() * Math.PI * 2;
      var spd = 2.2 + Math.random() * 4.2;
      sceneObjs.debris.push({
        mesh: mesh,
        x: x,
        y: y,
        z: z,
        vx: Math.cos(ang) * spd,
        vy: 3.4 + Math.random() * 4.0,
        vz: Math.sin(ang) * spd,
        rx: (Math.random() - 0.5) * 14,
        ry: (Math.random() - 0.5) * 14,
        rz: (Math.random() - 0.5) * 14,
        life: 0,
        duration: 0.65 + Math.random() * 0.25,
        baseScale: sc
      });
    }
  }

  function spawnPopup(x, y, z, text, color) {
    if (!dom.fxOverlay || typeof document === "undefined") return;
    if (sceneObjs.popups.length >= 24) {
      var oldest = sceneObjs.popups.shift();
      if (oldest && oldest.el && oldest.el.parentNode) {
        oldest.el.parentNode.removeChild(oldest.el);
      }
    }
    var el = document.createElement("div");
    el.className = "float-popup";
    el.textContent = text;
    el.style.color = color || "#ffffff";
    dom.fxOverlay.appendChild(el);
    var p = {
      el: el,
      wx: x,
      wy: y,
      wz: z,
      life: 0,
      duration: 0.85
    };
    var screen = Engine.worldToScreen(new THREE.Vector3(x, y, z));
    el.style.left = screen.x.toFixed(1) + "px";
    el.style.top = screen.y.toFixed(1) + "px";
    sceneObjs.popups.push(p);
  }

  function spawnFlyingItem(type, startPos, targetMode, targetPos, onArrive, duration) {
    var mesh = Entities.createResourceMesh(type);
    mesh.position.set(startPos.x, startPos.y, startPos.z);
    Engine.scene.add(mesh);
    var midX = (startPos.x + targetPos.x) * 0.5 + (Math.random() - 0.5) * 0.45;
    var midZ = (startPos.z + targetPos.z) * 0.5 + (Math.random() - 0.5) * 0.45;
    var arcH = duration && duration <= 0.26 ? 1.55 : (2.1 + Math.random() * 0.9);
    var ctrlY = Math.max(startPos.y, targetPos.y) + arcH;

    sceneObjs.flyingItems.push({
      mesh: mesh,
      type: type,
      sx: startPos.x,
      sy: startPos.y,
      sz: startPos.z,
      cx: midX,
      cy: ctrlY,
      cz: midZ,
      targetMode: targetMode,
      tx: targetPos.x,
      ty: targetPos.y,
      tz: targetPos.z,
      life: 0,
      duration: duration || (0.34 + Math.random() * 0.08),
      startYaw: Math.random() * Math.PI * 0.5,
      onArrive: onArrive
    });
  }

  function spawnMagnetGem(startPos, amount, onCollect) {
    var mesh = Entities.createResourceMesh("mana_gem");
    mesh.position.set(startPos.x, startPos.y, startPos.z);
    Engine.scene.add(mesh);
    var popAng = Math.random() * Math.PI * 2;
    sceneObjs.magnetGems.push({
      mesh: mesh,
      x: startPos.x,
      y: startPos.y,
      z: startPos.z,
      vx: Math.cos(popAng) * 1.6,
      vy: 6.4,
      vz: Math.sin(popAng) * 1.6,
      age: 0,
      amount: amount,
      onCollect: onCollect
    });
  }

  function spawnDrop(type, x, z, value) {
    var mesh = Entities.createResourceMesh(type);
    mesh.position.set(x, 0.35, z);
    Engine.scene.add(mesh);
    var ang = Math.random() * Math.PI * 2;
    sceneObjs.drops.push({
      mesh: mesh,
      type: type,
      value: value || (RESOURCE_INFO[type] ? RESOURCE_INFO[type].price : 14),
      x: x + Math.cos(ang) * 0.7,
      z: z + Math.sin(ang) * 0.7,
      age: 0
    });
  }

  // =========================================================================
  // World Initialization
  // =========================================================================
  function buildWorldObjects() {
    var scene = Engine.scene;

    // 1. Wizard
    sceneObjs.wizard = Entities.createWizardModel();
    sceneObjs.wizard.root.position.set(player.x, 0, player.z);
    runtime.lastTier = getWizardTier();
    Entities.updateWizardTier(sceneObjs.wizard, runtime.lastTier);
    scene.add(sceneObjs.wizard.root);

    // 2. Cauldron, Sales Counter & Mana Gem Pedestal (.glb)
    sceneObjs.cauldron = Entities.createCauldronStation();
    sceneObjs.cauldron.root.position.set(CAULDRON_POS.x, 0, CAULDRON_POS.z);
    scene.add(sceneObjs.cauldron.root);

    sceneObjs.sales = Entities.createSalesStation();
    sceneObjs.sales.root.position.set(SALES_POS.x, 0, SALES_POS.z);
    scene.add(sceneObjs.sales.root);

    sceneObjs.pedestal = Entities.createGemPedestal();
    sceneObjs.pedestal.root.position.set(PEDESTAL_POS.x, 0, PEDESTAL_POS.z);
    scene.add(sceneObjs.pedestal.root);

    // 3. Sleek 3D Ring Step-to-Pay & Action Pads
    var padSpecs = [
      { id: "cauldron_feed", x: -2.8, z: -3.8, size: 2.8, accentHex: 0xffb84d, accentCss: "#ffb84d", isActionOnly: true },
      { id: "sell_pad",      x: -4.2, z: 3.2,  size: 3.0, accentHex: 0x4cf099, accentCss: "#4cf099", isActionOnly: true },
      { id: "cauldron_upg",  x: 2.8,  z: -3.8, size: 2.7, accentHex: 0xffd34e, accentCss: "#ffd34e", isActionOnly: false },
      { id: "hire_fairy",    x: 2.35, z: 2.2,  size: 2.7, accentHex: 0xff8ae2, accentCss: "#ff8ae2", isActionOnly: false },
      { id: "upg_wand",      x: 5.5,  z: -0.2, size: 2.7, accentHex: 0x6ae2ff, accentCss: "#6ae2ff", isActionOnly: false },
      { id: "upg_speed",     x: 3.6,  z: 5.6,  size: 2.7, accentHex: 0x9bff78, accentCss: "#9bff78", isActionOnly: false },
      { id: "unlock_cart",   x: -1.4, z: 6.4,  size: 2.8, accentHex: 0xb98cff, accentCss: "#b98cff", isActionOnly: false }
    ];

    for (var i = 0; i < padSpecs.length; i++) {
      var spec = padSpecs[i];
      var padModel = Entities.createStepPad(spec);
      scene.add(padModel.root);
      sceneObjs.pads.push({
        id: spec.id,
        x: spec.x,
        z: spec.z,
        size: spec.size,
        isActionOnly: spec.isActionOnly,
        model: padModel,
        paid: 0,
        cooldown: 0,
        gemFxTimer: 0,
        activeGlow: false
      });
    }
    refreshAllPadTextures();

    // 4. Resource Groves (28 Outer-Wilds Nodes)
    for (var n = 0; n < NODE_SPOTS.length; n++) {
      var spot = NODE_SPOTS[n];
      var nodeModel = Entities.createResourceNodeModel(spot.type);
      nodeModel.root.position.set(spot.x, 0, spot.z);
      scene.add(nodeModel.root);
      sceneObjs.nodes.push({
        type: spot.type,
        x: spot.x,
        z: spot.z,
        model: nodeModel,
        hp: 40,
        maxHp: 40,
        respawnTimer: 0,
        shakeTimer: 0,
        popScale: 1
      });
    }

    // 5. Patrol Slimes (12 Outer-Wilds Monsters)
    var slimeSpots = [
      { ang: 0.15, r: 14.5 }, { ang: 0.72, r: 19.2 }, { ang: 1.28, r: 15.6 },
      { ang: 1.85, r: 20.4 }, { ang: 2.85, r: 16.5 }, { ang: 3.35, r: 19.8 },
      { ang: 3.85, r: 14.2 }, { ang: 4.35, r: 20.5 }, { ang: 4.85, r: 15.8 },
      { ang: 5.38, r: 19.4 }, { ang: 5.82, r: 14.8 }, { ang: 6.12, r: 21.0 }
    ];
    for (var s = 0; s < slimeSpots.length; s++) {
      var ss = slimeSpots[s];
      spawnSlimeEntity(false, Math.cos(ss.ang) * ss.r, 1.0 + Math.sin(ss.ang) * ss.r, s * 0.85);
    }

    // 6. Customer Queue (4 Active Villagers)
    for (var c = 0; c < 4; c++) {
      var custModel = Entities.createCustomerModel(c);
      var slot = QUEUE_SLOTS[c];
      custModel.root.position.set(slot.x, 0, slot.z);
      scene.add(custModel.root);
      sceneObjs.customers.push({
        model: custModel,
        variant: c,
        x: slot.x,
        z: slot.z,
        slotIdx: c,
        state: "queued",
        waitTimer: 0.4 + c * 0.25,
        walkPhase: c * 0.8
      });
    }

    syncFairyEntities();
    syncCartEntity();
    rebuildInitialBackStack();
    rebuildInitialCounterStock();
    rebuildInitialPedestalGems();
  }

  function spawnSlimeEntity(isKing, x, z, phase) {
    var model = Entities.createSlimeModel(isKing);
    model.root.position.set(x, 0, z);
    Engine.scene.add(model.root);
    var maxHp = isKing ? (380 + state.wave * 120) : (45 + (state.wave - 1) * 12);
    var slime = {
      isKing: !!isKing,
      model: model,
      x: x,
      z: z,
      homeX: x,
      homeZ: z,
      hp: maxHp,
      maxHp: maxHp,
      alive: true,
      respawnTimer: 0,
      phase: phase || Math.random() * Math.PI * 2,
      wanderAng: Math.random() * Math.PI * 2,
      wanderTimer: 1.5,
      knockVx: 0,
      knockVz: 0,
      squashTimer: 0
    };
    sceneObjs.slimes.push(slime);
    return slime;
  }

  function syncFairyEntities() {
    while (sceneObjs.fairies.length < state.fairies) {
      var idx = sceneObjs.fairies.length;
      var fModel = Entities.createFairyModel(idx);
      var ang = (idx / Math.max(1, state.fairies)) * Math.PI * 2;
      var fx = Math.cos(ang) * 3.5;
      var fz = Math.sin(ang) * 3.5;
      fModel.root.position.set(fx, 1.35, fz);
      Engine.scene.add(fModel.root);
      sceneObjs.fairies.push({
        idx: idx,
        model: fModel,
        x: fx,
        z: fz,
        yaw: 0,
        state: "seek_node",
        targetNodeIdx: idx % NODE_SPOTS.length,
        waitTimer: 0,
        bag: [],
        bagMesh: null
      });
    }
    while (sceneObjs.fairies.length > state.fairies) {
      var removed = sceneObjs.fairies.pop();
      if (removed && removed.model && removed.model.root.parent) {
        removed.model.root.parent.remove(removed.model.root);
      }
    }
  }

  function syncCartEntity() {
    if (state.cartLv >= 1 && !sceneObjs.cart) {
      sceneObjs.cart = Entities.createHarvesterCartModel();
      sceneObjs.cart.root.position.set(runtime.cartX, 0, runtime.cartZ);
      Engine.scene.add(sceneObjs.cart.root);
    } else if (state.cartLv <= 0 && sceneObjs.cart) {
      if (sceneObjs.cart.root.parent) sceneObjs.cart.root.parent.remove(sceneObjs.cart.root);
      sceneObjs.cart = null;
      runtime.cartBag.length = 0;
    }
  }

  // =========================================================================
  // Pad Details & Step-to-Pay Logic
  // =========================================================================
  function getPadSpecState(pad) {
    if (pad.id === "cauldron_feed") {
      var rawCount = 0;
      for (var i = 0; i < state.bag.length; i++) {
        if (RESOURCE_INFO[state.bag[i].type] && RESOURCE_INFO[state.bag[i].type].raw) rawCount++;
      }
      return {
        title: "포션 연성 (3배)",
        remainingCost: 0,
        totalCost: 0,
        progressRatio: rawCount > 0 ? 1 : 0,
        isDone: false,
        isActionOnly: true,
        actionHint: rawCount > 0 ? "연성 중 (" + rawCount + ")" : "재료 투입"
      };
    }

    if (pad.id === "sell_pad") {
      return {
        title: "판매대 (SELL)",
        remainingCost: 0,
        totalCost: 0,
        progressRatio: state.bag.length > 0 ? 1 : 0,
        isDone: false,
        isActionOnly: true,
        actionHint: state.bag.length > 0 ? "진열 중 (" + state.bag.length + ")" : "진열 납품"
      };
    }

    if (pad.id === "cauldron_upg") {
      var maxC = 15;
      var doneC = state.cauldronLv >= maxC;
      var costC = doneC ? 0 : Math.round(150 * Math.pow(1.5, state.cauldronLv - 1));
      return {
        title: "가마솥 Lv." + state.cauldronLv,
        totalCost: costC,
        remainingCost: Math.max(0, costC - pad.paid),
        progressRatio: costC > 0 ? Math.min(1, pad.paid / costC) : 1,
        isDone: doneC,
        isActionOnly: false
      };
    }

    if (pad.id === "hire_fairy") {
      var maxF = 10;
      var doneF = state.fairies >= maxF;
      var costF = doneF ? 0 : Math.round(80 * Math.pow(1.45, state.fairies));
      return {
        title: "요정 일꾼 (" + state.fairies + "/" + maxF + ")",
        totalCost: costF,
        remainingCost: Math.max(0, costF - pad.paid),
        progressRatio: costF > 0 ? Math.min(1, pad.paid / costF) : 1,
        isDone: doneF,
        isActionOnly: false
      };
    }

    if (pad.id === "upg_wand") {
      var maxW = 20;
      var doneW = state.wandUpgLv >= maxW;
      var costW = doneW ? 0 : Math.round(50 * Math.pow(1.32, state.wandUpgLv - 1));
      return {
        title: "지팡이·채집 강화",
        totalCost: costW,
        remainingCost: Math.max(0, costW - pad.paid),
        progressRatio: costW > 0 ? Math.min(1, pad.paid / costW) : 1,
        isDone: doneW,
        isActionOnly: false
      };
    }

    if (pad.id === "upg_speed") {
      var maxS = 20;
      var doneS = state.speedUpgLv >= maxS;
      var costS = doneS ? 0 : Math.round(50 * Math.pow(1.32, state.speedUpgLv - 1));
      return {
        title: "배낭·이속 강화",
        totalCost: costS,
        remainingCost: Math.max(0, costS - pad.paid),
        progressRatio: costS > 0 ? Math.min(1, pad.paid / costS) : 1,
        isDone: doneS,
        isActionOnly: false
      };
    }

    var maxCart = 10;
    var doneCart = state.cartLv >= maxCart;
    var costCart = doneCart ? 0 : (state.cartLv === 0 ? 250 : Math.round(300 * Math.pow(1.5, state.cartLv - 1)));
    return {
      title: state.cartLv === 0 ? "자동 수확 수레" : "수레 Lv." + state.cartLv,
      totalCost: costCart,
      remainingCost: Math.max(0, costCart - pad.paid),
      progressRatio: costCart > 0 ? Math.min(1, pad.paid / costCart) : 1,
      isDone: doneCart,
      isActionOnly: false
    };
  }

  function applyPadCompletion(pad) {
    if (pad.id === "cauldron_upg") {
      if (state.cauldronLv < 15) state.cauldronLv += 1;
      spawnPopup(pad.x, 2.2, pad.z, "가마솥 Lv." + state.cauldronLv + "!", "#ffd34e");
      showToast("황금 가마솥 승급! 포션 가치 " + getCauldronMult().toFixed(2) + "배!");
    } else if (pad.id === "hire_fairy") {
      if (state.fairies < 10) state.fairies += 1;
      syncFairyEntities();
      spawnPopup(pad.x, 2.2, pad.z, "요정 일꾼 +1!", "#ff8ae2");
      showToast("새로운 요정 일꾼이 합류했습니다! (" + state.fairies + "마리)");
    } else if (pad.id === "upg_wand") {
      if (state.wandUpgLv < 20) {
        if (state.wandUpgLv % 2 === 1 && state.wandLv < 25) {
          state.wandLv += 1;
          spawnPopup(pad.x, 2.2, pad.z, "지팡이 Lv." + state.wandLv + "!", "#6ae2ff");
        } else if (state.harvestLv < 25) {
          state.harvestLv += 1;
          spawnPopup(pad.x, 2.2, pad.z, "채집 Lv." + state.harvestLv + "!", "#6ae2ff");
        } else if (state.wandLv < 25) {
          state.wandLv += 1;
          spawnPopup(pad.x, 2.2, pad.z, "지팡이 Lv." + state.wandLv + "!", "#6ae2ff");
        }
        state.wandUpgLv += 1;
      }
    } else if (pad.id === "upg_speed") {
      if (state.speedUpgLv < 20) {
        if (state.speedUpgLv % 2 === 1 && state.bagLv < 25) {
          state.bagLv += 1;
          spawnPopup(pad.x, 2.2, pad.z, "배낭 확장 (" + getBackpackCap() + ")!", "#9bff78");
        } else if (state.speedLv < 25) {
          state.speedLv += 1;
          spawnPopup(pad.x, 2.2, pad.z, "이속 Lv." + state.speedLv + "!", "#9bff78");
        } else if (state.bagLv < 25) {
          state.bagLv += 1;
          spawnPopup(pad.x, 2.2, pad.z, "배낭 확장 (" + getBackpackCap() + ")!", "#9bff78");
        }
        state.speedUpgLv += 1;
      }
    } else if (pad.id === "unlock_cart") {
      var wasLocked = state.cartLv === 0;
      if (state.cartLv < 10) state.cartLv += 1;
      syncCartEntity();
      spawnPopup(pad.x, 2.2, pad.z, wasLocked ? "수레 해금!" : "수레 Lv." + state.cartLv + "!", "#b98cff");
      showToast(wasLocked ? "자동 수확 마법 수레가 숲 순찰을 시작합니다!" : "수확 수레 Lv." + state.cartLv + " 강화 완료!");
    }

    pad.paid = 0;
    pad.cooldown = 0.45;
    playBuildPop();
    Engine.addShake(0.18);
    spawnShockwave(pad.x, 0.16, pad.z, 0xffffff, 2.6);
    spawnSparks(pad.x, 0.5, pad.z, 0xffe066, 12);
    gainXp(25);
  }

  function refreshAllPadTextures() {
    for (var i = 0; i < sceneObjs.pads.length; i++) {
      var pad = sceneObjs.pads[i];
      var info = getPadSpecState(pad);
      Entities.updateStepPadTexture(pad.model, {
        title: info.title,
        remainingCost: info.remainingCost,
        progressRatio: info.progressRatio,
        isDone: info.isDone,
        isActionOnly: info.isActionOnly,
        actionHint: info.actionHint,
        activeGlow: pad.activeGlow
      });
    }
  }

  // =========================================================================
  // Wall Sliding Collision & 1:1 Player Controls
  // =========================================================================
  function resolvePlayerCollisions(nx, nz) {
    var playerR = 0.48;
    var obstacles = [
      { x: CAULDRON_POS.x, z: CAULDRON_POS.z, r: 1.55 + playerR },
      { x: SALES_POS.x, z: SALES_POS.z, r: 1.5 + playerR },
      { x: PEDESTAL_POS.x, z: PEDESTAL_POS.z, r: 0.55 + playerR }
    ];
    for (var i = 0; i < sceneObjs.nodes.length; i++) {
      var nd = sceneObjs.nodes[i];
      if (nd.respawnTimer <= 0) {
        obstacles.push({ x: nd.x, z: nd.z, r: 0.42 + playerR });
      }
    }
    if (Engine.wallColliders) {
      for (var wcIdx = 0; wcIdx < Engine.wallColliders.length; wcIdx++) {
        var wc = Engine.wallColliders[wcIdx];
        obstacles.push({ x: wc.x, z: wc.z, r: (wc.r || 0.95) * 0.78 + playerR });
      }
    }

    // Two-pass normal projection & tangent velocity sliding
    for (var pass = 0; pass < 2; pass++) {
      for (var k = 0; k < obstacles.length; k++) {
        var ob = obstacles[k];
        var dx = nx - ob.x;
        var dz = nz - ob.z;
        var dist = Math.hypot(dx, dz);
        if (dist < ob.r) {
          var normX = dist > 0.0001 ? dx / dist : 0;
          var normZ = dist > 0.0001 ? dz / dist : 1;
          nx = ob.x + normX * ob.r;
          nz = ob.z + normZ * ob.r;

          // Project velocity onto tangent vector (slide smoothly along obstacle surface)
          var vn = player.vx * normX + player.vz * normZ;
          if (vn < 0) {
            player.vx -= vn * normX;
            player.vz -= vn * normZ;
          }
        }
      }
    }

    var mag = Math.hypot(nx, nz);
    if (mag > MEADOW_LIMIT_R) {
      var limNx = nx / mag;
      var limNz = nz / mag;
      nx = limNx * MEADOW_LIMIT_R;
      nz = limNz * MEADOW_LIMIT_R;
      var rimVn = player.vx * limNx + player.vz * limNz;
      if (rimVn > 0) {
        player.vx -= rimVn * limNx;
        player.vz -= rimVn * limNz;
      }
    }
    return { x: nx, z: nz };
  }

  function updatePlayerMovement(dt) {
    var ix = runtime.joyX;
    var iy = runtime.joyY;
    if (runtime.keys.KeyD || runtime.keys.ArrowRight) ix += 1;
    if (runtime.keys.KeyA || runtime.keys.ArrowLeft) ix -= 1;
    if (runtime.keys.KeyS || runtime.keys.ArrowDown) iy += 1;
    if (runtime.keys.KeyW || runtime.keys.ArrowUp) iy -= 1;

    var mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }

    // 1:1 Screen-aligned controls (PerspectiveCamera behind player: Right=+X, Down=+Z, Up=-Z)
    var wx = ix;
    var wz = iy;

    var maxSpd = getMoveSpeed();
    var targetVx = wx * maxSpd;
    var targetVz = wz * maxSpd;
    var blend = Math.min(1, dt * 15);
    var prevVx = player.vx;
    var prevVz = player.vz;
    player.vx += (targetVx - player.vx) * blend;
    player.vz += (targetVz - player.vz) * blend;

    var worldAx = dt > 0.0001 ? (player.vx - prevVx) / dt : 0;
    var worldAz = dt > 0.0001 ? (player.vz - prevVz) / dt : 0;

    var resolved = resolvePlayerCollisions(player.x + player.vx * dt, player.z + player.vz * dt);
    player.x = resolved.x;
    player.z = resolved.z;

    var speed = Math.hypot(player.vx, player.vz);
    if (speed > 0.25) {
      var desiredYaw = Math.atan2(player.vx, player.vz);
      var diff = desiredYaw - player.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.yaw += diff * Math.min(1, dt * 14);
      player.walkPhase += dt * (4.8 + speed * 1.15);
    }

    if (player.swingTimer > 0) {
      player.swingTimer = Math.max(0, player.swingTimer - dt);
    }

    if (sceneObjs.wizard) {
      sceneObjs.wizard.root.position.set(player.x, 0, player.z);
      sceneObjs.wizard.root.rotation.y = player.yaw;
      Entities.animateWizard(
        sceneObjs.wizard,
        {
          speed: speed,
          walkPhase: player.walkPhase,
          swingTimer: player.swingTimer,
          swingDuration: player.swingDuration,
          time: runtime.time
        },
        dt
      );
    }

    updateBackStackPhysics(dt, worldAx, worldAz);
  }

  function updatePadsAndStations(dt) {
    player.feedCooldown = Math.max(0, player.feedCooldown - dt);
    player.sellCooldown = Math.max(0, player.sellCooldown - dt);
    player.gemCooldown = Math.max(0, player.gemCooldown - dt);

    // 1. Collect Mana Gems from 2x2 Pedestal Tower (0.03s rapid top-down Homing Magnet vacuum)
    if (state.pedestalGems > 0 && player.gemCooldown <= 0) {
      var dp = Math.hypot(player.x - PEDESTAL_POS.x, player.z - PEDESTAL_POS.z);
      if (dp <= 2.8) {
        var drain = Math.min(state.pedestalGems, Math.max(1, Math.ceil(state.pedestalGems / 32)));
        var originGemPos = popPedestalTopGem();

        state.pedestalGems -= drain;
        player.gemCooldown = 0.03;

        spawnMagnetGem(originGemPos, drain, function (collectedAmt) {
          state.gems += collectedAmt;
          state.totalGemsEarned += collectedAmt;
          runtime.gemCombo += 1;
          runtime.gemComboTimer = 0.85;
          runtime.gemPopupAcc += collectedAmt;
          playGemChime(runtime.gemCombo);

          if (runtime.gemCombo % 4 === 1 || state.pedestalGems === 0) {
            spawnPopup(player.x, 2.0, player.z, "+" + formatNum(runtime.gemPopupAcc) + " 💎", "#5ef2ff");
            runtime.gemPopupAcc = 0;
            spawnSparks(originGemPos.x, originGemPos.y + 0.15, originGemPos.z, 0x3ef2ff, 4);
          }
        });
      }
    }

    // 2. Step-to-Pay & Action Pads (0.04s rapid pop + 360-spin Bezier curve + squash-and-stretch)
    for (var i = 0; i < sceneObjs.pads.length; i++) {
      var pad = sceneObjs.pads[i];
      if (pad.cooldown > 0) pad.cooldown = Math.max(0, pad.cooldown - dt);

      var dist = Math.hypot(player.x - pad.x, player.z - pad.z);
      var standing = dist <= pad.size * 0.62;
      pad.activeGlow = standing;

      if (!standing) continue;

      if (pad.id === "cauldron_feed") {
        if (player.feedCooldown <= 0) {
          var rawIdx = -1;
          for (var b = state.bag.length - 1; b >= 0; b--) {
            if (RESOURCE_INFO[state.bag[b].type] && RESOURCE_INFO[state.bag[b].type].raw) {
              rawIdx = b;
              break;
            }
          }
          if (rawIdx >= 0) {
            var popped = removeFromBagAt(rawIdx);
            var rawItem = popped.item;
            player.feedCooldown = 0.04;
            player.swingTimer = Math.max(player.swingTimer, 0.14);
            var potionPrice = Math.round(rawItem.value * getCauldronMult());
            playHarvestChime();
            spawnFlyingItem(
              rawItem.type,
              popped.originPos,
              "world",
              CAULDRON_POS,
              function () {
                Entities.triggerStationSquash(sceneObjs.cauldron);
                state.potionsBrewed += 1;
                gainXp(4);
                spawnSparks(CAULDRON_POS.x, CAULDRON_POS.y, CAULDRON_POS.z, 0xff9ef6, 5);
                spawnFlyingItem(
                  "rainbow_potion",
                  CAULDRON_POS,
                  "world",
                  SALES_POS,
                  function () {
                    Entities.triggerStationSquash(sceneObjs.sales);
                    addToCounterStock({ type: "rainbow_potion", value: potionPrice });
                  },
                  0.32
                );
              },
              0.32
            );
          }
        }
      } else if (pad.id === "sell_pad") {
        if (player.sellCooldown <= 0 && state.bag.length > 0) {
          var poppedSell = removeFromBagAt(state.bag.length - 1);
          var soldItem = poppedSell.item;
          player.sellCooldown = 0.04;
          playHarvestChime();
          spawnFlyingItem(
            soldItem.type,
            poppedSell.originPos,
            "world",
            SALES_POS,
            function () {
              Entities.triggerStationSquash(sceneObjs.sales);
              addToCounterStock(soldItem);
            },
            0.3
          );
        }
      } else if (pad.cooldown <= 0) {
        var spec = getPadSpecState(pad);
        if (!spec.isDone && spec.remainingCost > 0 && state.gems > 0) {
          var rate = Math.max(40, Math.ceil(spec.totalCost * 1.15));
          var spend = Math.min(state.gems, spec.remainingCost, Math.max(1, Math.ceil(rate * dt)));
          if (spend > 0) {
            state.gems -= spend;
            pad.paid += spend;
            pad.gemFxTimer -= dt;
            if (pad.gemFxTimer <= 0) {
              pad.gemFxTimer = 0.09;
              playGemChime(Math.floor(pad.paid / 15));
              spawnFlyingItem(
                "mana_gem",
                { x: player.x, y: 1.0, z: player.z },
                "world",
                { x: pad.x, y: 0.25, z: pad.z },
                null,
                0.24
              );
            }
            if (pad.paid >= spec.totalCost) {
              applyPadCompletion(pad);
            }
          }
        }
      }
    }

    refreshAllPadTextures();

    // 3. Animate Cauldron Glow & Bubbles
    if (sceneObjs.cauldron) {
      sceneObjs.cauldron.stirGroup.rotation.y += dt * 1.75;
      var hue = (runtime.time * 0.18) % 1;
      if (sceneObjs.cauldron.liquidMat && sceneObjs.cauldron.liquidMat.color && typeof sceneObjs.cauldron.liquidMat.color.setHSL === "function") {
        sceneObjs.cauldron.liquidMat.color.setHSL(hue, 0.85, 0.62);
      }
      for (var bi = 0; bi < sceneObjs.cauldron.bubbles.length; bi++) {
        var bObj = sceneObjs.cauldron.bubbles[bi];
        bObj.phase += dt * 1.15;
        var cycle = bObj.phase % 1;
        bObj.mesh.position.y = 1.05 + cycle * 0.65;
        bObj.mesh.position.x = Math.cos(bObj.baseAngle + runtime.time * 0.9) * (0.48 * (1 - cycle * 0.35));
        bObj.mesh.position.z = Math.sin(bObj.baseAngle + runtime.time * 0.9) * (0.48 * (1 - cycle * 0.35));
        var bScale = Math.max(0.05, Math.sin(cycle * Math.PI) * 1.15);
        bObj.mesh.scale.set(bScale, bScale, bScale);
      }
    }
  }

  function updateResourceNodes(dt) {
    player.harvestCooldown = Math.max(0, player.harvestCooldown - dt);

    var bestNode = null;
    var bestDist = Infinity;
    var hRange = getHarvestRange();

    for (var i = 0; i < sceneObjs.nodes.length; i++) {
      var node = sceneObjs.nodes[i];
      if (node.respawnTimer > 0) {
        node.respawnTimer -= dt;
        if (node.respawnTimer <= 0) {
          node.respawnTimer = 0;
          node.hp = node.maxHp;
          node.popScale = 0.15;
          node.model.bodyGroup.visible = true;
          spawnSparks(node.x, 0.6, node.z, RESOURCE_INFO[node.type].color, 5);
        }
        continue;
      }

      if (node.popScale < 1) {
        node.popScale = Math.min(1, node.popScale + dt * 4.5);
      }
      if (node.shakeTimer > 0) {
        node.shakeTimer = Math.max(0, node.shakeTimer - dt);
        var jx = Math.sin(runtime.time * 52) * 0.11 * (node.shakeTimer / 0.3);
        node.model.bodyGroup.position.set(jx, 0, 0);
        var sq = 1 - Math.sin((node.shakeTimer / 0.3) * Math.PI) * 0.26;
        node.model.bodyGroup.scale.set(node.popScale / Math.sqrt(sq), node.popScale * sq, node.popScale / Math.sqrt(sq));
      } else {
        node.model.bodyGroup.position.set(0, 0, 0);
        node.model.bodyGroup.scale.set(node.popScale, node.popScale, node.popScale);
      }

      var dist = Math.hypot(player.x - node.x, player.z - node.z);
      if (dist <= hRange && dist < bestDist) {
        bestDist = dist;
        bestNode = node;
      }
    }

    if (bestNode && player.harvestCooldown <= 0 && state.bag.length < getBackpackCap()) {
      player.harvestCooldown = Math.max(0.22, 0.44 - (state.harvestLv - 1) * 0.015);
      player.swingTimer = player.swingDuration;
      runtime.hitStopTimer = Math.max(runtime.hitStopTimer, 0.022);

      var angToNode = Math.atan2(bestNode.x - player.x, bestNode.z - player.z);
      if (Math.hypot(player.vx, player.vz) < 0.8) {
        player.yaw = angToNode;
      }

      bestNode.hp -= getHarvestPower();
      bestNode.shakeTimer = 0.3;
      Entities.flashModelWhite(bestNode.model, 0.1);
      Engine.addShake(0.08);
      playHarvestChime();

      var info = RESOURCE_INFO[bestNode.type];
      spawnSlashArc(bestNode.x, 0.85, bestNode.z, angToNode, info.color, 1.15);
      spawnShockwave(bestNode.x, 0.25, bestNode.z, info.color, 1.9);
      spawnSparks(bestNode.x, 0.9, bestNode.z, info.color, 6);
      spawnDebrisParticles(bestNode.x, 0.7, bestNode.z, info.color, 5);

      var dropCount = bestNode.hp <= 0 ? (state.harvestLv >= 5 ? 3 : 2) : 1;
      for (var d = 0; d < dropCount; d++) {
        (function (tType, nx, nz) {
          spawnFlyingItem(
            tType,
            { x: nx, y: 0.95, z: nz },
            "player",
            { x: player.x, y: 1.2, z: player.z },
            function () {
              addToBag(tType, RESOURCE_INFO[tType].price);
              gainXp(3);
            }
          );
        })(bestNode.type, bestNode.x, bestNode.z);
      }

      if (bestNode.hp <= 0) {
        bestNode.respawnTimer = 3.6;
        bestNode.model.bodyGroup.visible = false;
        spawnPopup(bestNode.x, 1.5, bestNode.z, "+" + info.name, info.css);
      }
    }
  }

  function updateCustomers(dt) {
    for (var i = 0; i < sceneObjs.customers.length; i++) {
      var c = sceneObjs.customers[i];
      if (c.state === "queued") {
        var slot = QUEUE_SLOTS[c.slotIdx] || TRAIL_SPAWN;
        var dx = slot.x - c.x;
        var dz = slot.z - c.z;
        var dist = Math.hypot(dx, dz);
        if (dist > 0.08) {
          var step = Math.min(dist, 3.2 * dt);
          c.x += (dx / dist) * step;
          c.z += (dz / dist) * step;
          c.model.root.rotation.y = Math.atan2(dx, dz);
          Entities.animateCustomer(c.model, true, dt);
        } else {
          c.model.root.rotation.y = Math.atan2(SALES_POS.x - c.x, SALES_POS.z - c.z);
          Entities.animateCustomer(c.model, false, dt);

          if (c.slotIdx === 0 && state.counterStock.length > 0) {
            c.waitTimer -= dt;
            if (c.waitTimer <= 0) {
              var batch = Math.min(state.counterStock.length, 1 + Math.floor(Math.random() * 2));
              var totalPay = 0;
              for (var k = 0; k < batch; k++) {
                var bought = state.counterStock.shift();
                shiftCounterStockMesh();
                totalPay += bought.value;
              }
              c.state = "leaving";
              playGemChime(2);
              spawnPopup(SALES_POS.x, 2.2, SALES_POS.z, "+" + totalPay + " 💎", "#ffe866");
              spawnFlyingItem(
                "mana_gem",
                SALES_POS,
                "world",
                PEDESTAL_POS,
                function () {
                  Entities.triggerStationSquash(sceneObjs.pedestal);
                  pushPedestalGems(totalPay);
                  state.pedestalGems += totalPay;
                },
                0.32
              );

              for (var q = 0; q < sceneObjs.customers.length; q++) {
                if (sceneObjs.customers[q].state === "queued" && sceneObjs.customers[q].slotIdx > 0) {
                  sceneObjs.customers[q].slotIdx -= 1;
                }
              }
            }
          }
        }
      } else if (c.state === "leaving") {
        var ldx = TRAIL_SPAWN.x - c.x;
        var ldz = TRAIL_SPAWN.z - c.z;
        var ldist = Math.hypot(ldx, ldz);
        if (ldist > 0.2) {
          var lstep = Math.min(ldist, 3.8 * dt);
          c.x += (ldx / ldist) * lstep;
          c.z += (ldz / ldist) * lstep;
          c.model.root.rotation.y = Math.atan2(ldx, ldz);
          Entities.animateCustomer(c.model, true, dt);
        } else {
          c.state = "queued";
          c.slotIdx = 3;
          c.waitTimer = 0.38;
        }
      }

      c.model.root.position.set(c.x, 0, c.z);
    }
  }

  function updateFairies(dt) {
    var fairySpd = 4.4 + (state.fairyLv - 1) * 0.55;
    var fairyCap = 2 + state.fairyLv;

    for (var i = 0; i < sceneObjs.fairies.length; i++) {
      var f = sceneObjs.fairies[i];
      var hoverY = 1.45 + Math.sin(runtime.time * 4.2 + i) * 0.16;

      if (f.state === "seek_node") {
        var node = sceneObjs.nodes[f.targetNodeIdx];
        if (!node || node.respawnTimer > 0) {
          for (var n = 0; n < sceneObjs.nodes.length; n++) {
            var candIdx = (f.targetNodeIdx + n + 1) % sceneObjs.nodes.length;
            if (sceneObjs.nodes[candIdx].respawnTimer <= 0) {
              f.targetNodeIdx = candIdx;
              node = sceneObjs.nodes[candIdx];
              break;
            }
          }
        }
        if (node) {
          var dx = node.x - f.x;
          var dz = node.z - f.z;
          var dist = Math.hypot(dx, dz);
          if (dist > 0.05) f.yaw = Math.atan2(dx, dz);
          if (dist > 0.65) {
            f.x += (dx / dist) * Math.min(dist, fairySpd * dt);
            f.z += (dz / dist) * Math.min(dist, fairySpd * dt);
          } else {
            f.state = "harvest";
            f.waitTimer = 0.45;
          }
        }
      } else if (f.state === "harvest") {
        f.waitTimer -= dt;
        if (f.waitTimer <= 0) {
          var hNode = sceneObjs.nodes[f.targetNodeIdx];
          if (hNode && hNode.respawnTimer <= 0) {
            f.bag.push({ type: hNode.type, value: RESOURCE_INFO[hNode.type].price });
            spawnSparks(hNode.x, 1.0, hNode.z, RESOURCE_INFO[hNode.type].color, 3);
            if (!f.bagMesh && f.model.bagAnchor) {
              f.bagMesh = Entities.createResourceMesh(hNode.type);
              f.bagMesh.scale.set(0.6, 0.6, 0.6);
              f.model.bagAnchor.add(f.bagMesh);
            }
          }
          if (f.bag.length >= fairyCap) {
            f.state = state.cauldronLv >= 2 ? "cauldron" : "deliver";
          } else {
            f.targetNodeIdx = (f.targetNodeIdx + 1) % sceneObjs.nodes.length;
            f.state = "seek_node";
          }
        }
      } else if (f.state === "cauldron") {
        var cdx = CAULDRON_POS.x - f.x;
        var cdz = CAULDRON_POS.z - f.z;
        var cdist = Math.hypot(cdx, cdz);
        if (cdist > 0.05) f.yaw = Math.atan2(cdx, cdz);
        if (cdist > 0.7) {
          f.x += (cdx / cdist) * Math.min(cdist, fairySpd * dt);
          f.z += (cdz / cdist) * Math.min(cdist, fairySpd * dt);
        } else {
          for (var fb = 0; fb < f.bag.length; fb++) {
            f.bag[fb].type = "rainbow_potion";
            f.bag[fb].value = Math.round(f.bag[fb].value * getCauldronMult());
          }
          state.potionsBrewed += f.bag.length;
          Entities.triggerStationSquash(sceneObjs.cauldron);
          spawnSparks(CAULDRON_POS.x, CAULDRON_POS.y, CAULDRON_POS.z, 0xff9ef6, 5);
          f.state = "deliver";
        }
      } else if (f.state === "deliver") {
        var sdx = SALES_POS.x - f.x;
        var sdz = SALES_POS.z - f.z;
        var sdist = Math.hypot(sdx, sdz);
        if (sdist > 0.05) f.yaw = Math.atan2(sdx, sdz);
        if (sdist > 0.7) {
          f.x += (sdx / sdist) * Math.min(sdist, fairySpd * dt);
          f.z += (sdz / sdist) * Math.min(sdist, fairySpd * dt);
        } else {
          Entities.triggerStationSquash(sceneObjs.sales);
          for (var d = 0; d < f.bag.length; d++) {
            addToCounterStock(f.bag[d]);
          }
          f.bag.length = 0;
          if (f.bagMesh) {
            if (f.bagMesh.parent) f.bagMesh.parent.remove(f.bagMesh);
            f.bagMesh = null;
          }
          f.targetNodeIdx = (i + Math.floor(Math.random() * 4)) % sceneObjs.nodes.length;
          f.state = "seek_node";
        }
      }

      f.model.root.position.set(f.x, hoverY, f.z);
      f.model.root.rotation.y = f.yaw;
      Entities.animateFairy(f.model, dt);
    }
  }

  function updateHarvesterCart(dt) {
    if (!sceneObjs.cart || state.cartLv <= 0) return;

    var cartCap = 12 + state.cartLv * 4;
    var cartSpd = 3.8 + (state.cartLv - 1) * 0.55;
    var wp = CART_WAYPOINTS[runtime.cartWpIdx];
    var dx = wp.x - runtime.cartX;
    var dz = wp.z - runtime.cartZ;
    var dist = Math.hypot(dx, dz);

    if (dist < 0.6) {
      runtime.cartWpIdx = (runtime.cartWpIdx + 1) % CART_WAYPOINTS.length;
      wp = CART_WAYPOINTS[runtime.cartWpIdx];
      dx = wp.x - runtime.cartX;
      dz = wp.z - runtime.cartZ;
      dist = Math.hypot(dx, dz);
    }

    if (dist > 0.001) {
      var step = Math.min(dist, cartSpd * dt);
      runtime.cartX += (dx / dist) * step;
      runtime.cartZ += (dz / dist) * step;
      var targetYaw = Math.atan2(dx, dz);
      var diff = targetYaw - runtime.cartYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      runtime.cartYaw += diff * Math.min(1, dt * 8);
    }

    sceneObjs.cart.root.position.set(runtime.cartX, 0, runtime.cartZ);
    sceneObjs.cart.root.rotation.y = runtime.cartYaw;
    if (sceneObjs.cart.bodyPivot) {
      sceneObjs.cart.bodyPivot.position.y = Math.abs(Math.sin(runtime.time * 9.5)) * 0.05;
    }

    // Auto-scoop nearby active nodes & ground drops
    if (runtime.cartBag.length < cartCap) {
      for (var i = 0; i < sceneObjs.nodes.length; i++) {
        var nd = sceneObjs.nodes[i];
        if (nd.respawnTimer <= 0 && Math.hypot(nd.x - runtime.cartX, nd.z - runtime.cartZ) <= 3.4) {
          nd.hp = 0;
          nd.respawnTimer = 3.6;
          nd.model.bodyGroup.visible = false;
          var amt = 2;
          for (var a = 0; a < amt && runtime.cartBag.length < cartCap; a++) {
            runtime.cartBag.push({ type: nd.type, value: RESOURCE_INFO[nd.type].price });
          }
          spawnSparks(nd.x, 0.8, nd.z, RESOURCE_INFO[nd.type].color, 5);
        }
      }
      for (var j = sceneObjs.drops.length - 1; j >= 0; j--) {
        var dr = sceneObjs.drops[j];
        if (Math.hypot(dr.x - runtime.cartX, dr.z - runtime.cartZ) <= 3.8 && runtime.cartBag.length < cartCap) {
          runtime.cartBag.push({ type: dr.type, value: dr.value });
          if (dr.mesh.parent) dr.mesh.parent.remove(dr.mesh);
          sceneObjs.drops.splice(j, 1);
        }
      }
    }

    // Unload at plaza drop point (-3.8, -1.2)
    runtime.cartUnloadCooldown = Math.max(0, runtime.cartUnloadCooldown - dt);
    if (runtime.cartBag.length > 0 && runtime.cartUnloadCooldown <= 0 && Math.hypot(runtime.cartX - (-3.8), runtime.cartZ - (-1.2)) <= 2.4) {
      runtime.cartUnloadCooldown = 0.04;
      var item = runtime.cartBag.pop();
      var refine = state.cauldronLv >= 3 && RESOURCE_INFO[item.type] && RESOURCE_INFO[item.type].raw;
      if (refine) {
        item = { type: "rainbow_potion", value: Math.round(item.value * getCauldronMult()) };
        state.potionsBrewed += 1;
      }
      spawnFlyingItem(
        item.type,
        { x: runtime.cartX, y: 0.9, z: runtime.cartZ },
        "world",
        SALES_POS,
        function () {
          Entities.triggerStationSquash(sceneObjs.sales);
          addToCounterStock(item);
        },
        0.32
      );
    }

    // Visual cargo stack inside cart
    var cargoVis = Math.min(10, Math.ceil(runtime.cartBag.length / 2));
    if (sceneObjs.cartCargoMeshes.length !== cargoVis) {
      releaseTaggedMeshes(sceneObjs.cartCargoMeshes);
      for (var c = 0; c < cargoVis; c++) {
        var cItem = runtime.cartBag[Math.min(runtime.cartBag.length - 1, c * 2)];
        var mesh = acquirePooledMesh(cItem.type);
        mesh.scale.set(0.65, 0.65, 0.65);
        mesh.position.set(((c % 2) - 0.5) * 0.42, Math.floor(c / 2) * 0.22, 0);
        sceneObjs.cart.cargoAnchor.add(mesh);
        sceneObjs.cartCargoMeshes.push({ type: cItem.type, mesh: mesh });
      }
    }
  }

  function updateSlimesAndCombat(dt) {
    var activeKing = null;
    for (var s0 = 0; s0 < sceneObjs.slimes.length; s0++) {
      if (sceneObjs.slimes[s0].isKing && sceneObjs.slimes[s0].alive) {
        activeKing = sceneObjs.slimes[s0];
        break;
      }
    }
    if (!activeKing) {
      state.bossTimer -= dt;
      if (state.bossTimer <= 0) {
        summonBoss();
      }
    }

    for (var i = sceneObjs.slimes.length - 1; i >= 0; i--) {
      var sl = sceneObjs.slimes[i];
      if (!sl.alive) {
        if (sl.isKing) {
          if (sl.model.root.parent) sl.model.root.parent.remove(sl.model.root);
          sceneObjs.slimes.splice(i, 1);
          continue;
        }
        sl.respawnTimer -= dt;
        if (sl.respawnTimer <= 0) {
          sl.alive = true;
          sl.maxHp = 45 + (state.wave - 1) * 12;
          sl.hp = sl.maxHp;
          sl.x = sl.homeX;
          sl.z = sl.homeZ;
          sl.knockVx = 0;
          sl.knockVz = 0;
          sl.squashTimer = 0;
          sl.model.root.visible = true;
          spawnSparks(sl.x, 0.5, sl.z, 0x72f57c, 6);
        }
        continue;
      }

      if (sl.squashTimer > 0) {
        sl.squashTimer = Math.max(0, sl.squashTimer - dt);
      }
      if (sl.model.glb && sl.model.glb.anim) {
        sl.model.glb.anim.update(dt);
      }

      if (sl.isKing && sl.model.hpBarFill) {
        var hpRatio = Math.max(0.001, Math.min(1, sl.hp / Math.max(1, sl.maxHp)));
        sl.model.hpBarFill.scale.x = hpRatio;
        sl.model.hpBarFill.position.x = -1.17 * (1 - hpRatio);
      }

      var pdx = player.x - sl.x;
      var pdz = player.z - sl.z;
      var pdist = Math.hypot(pdx, pdz);
      var chaseRange = sl.isKing ? 24 : 9.2;
      var speed = sl.isKing ? 2.1 : 1.9 + Math.min(1.4, (state.wave - 1) * 0.08);
      var moveDx = 0;
      var moveDz = 0;

      if (pdist < chaseRange && pdist > 1.2) {
        moveDx = pdx / pdist;
        moveDz = pdz / pdist;
      } else {
        sl.wanderTimer -= dt;
        if (sl.wanderTimer <= 0) {
          sl.wanderTimer = 1.4 + Math.random() * 1.4;
          sl.wanderAng = Math.atan2(sl.homeZ - sl.z, sl.homeX - sl.x) + (Math.random() - 0.5) * 2.0;
        }
        moveDx = Math.cos(sl.wanderAng) * 0.5;
        moveDz = Math.sin(sl.wanderAng) * 0.5;
      }

      sl.x += (moveDx * speed + (sl.knockVx || 0)) * dt;
      sl.z += (moveDz * speed + (sl.knockVz || 0)) * dt;
      var kDecay = Math.max(0, 1 - dt * 10);
      sl.knockVx = (sl.knockVx || 0) * kDecay;
      sl.knockVz = (sl.knockVz || 0) * kDecay;

      if (!sl.isKing) {
        var campCx = Engine.CAMP_CENTER ? Engine.CAMP_CENTER.x : 0;
        var campCz = Engine.CAMP_CENTER ? Engine.CAMP_CENTER.z : 1.0;
        var cdx = sl.x - campCx;
        var cdz = sl.z - campCz;
        var cdist = Math.hypot(cdx, cdz);
        if (cdist < 10.6 && cdist > 0.001) {
          sl.x = campCx + (cdx / cdist) * 10.6;
          sl.z = campCz + (cdz / cdist) * 10.6;
        }
      }

      var smag = Math.hypot(sl.x, sl.z);
      if (smag > 24.2) {
        sl.x *= 24.2 / smag;
        sl.z *= 24.2 / smag;
      }

      var minBump = sl.isKing ? 1.8 : 1.05;
      if (pdist < minBump && pdist > 0.001) {
        sl.x -= (pdx / pdist) * (minBump - pdist) * 0.6;
        sl.z -= (pdz / pdist) * (minBump - pdist) * 0.6;
      }

      var hop = Math.abs(Math.sin(runtime.time * (sl.isKing ? 3.2 : 4.4) + sl.phase));
      var hopY = hop * (sl.isKing ? 0.25 : 0.16);
      sl.model.root.position.set(sl.x, hopY, sl.z);
      if (Math.hypot(moveDx, moveDz) > 0.05) {
        sl.model.root.rotation.y = Math.atan2(moveDx, moveDz);
      }
      if (sl.model.shadowMesh) {
        sl.model.shadowMesh.position.y = -hopY + 0.028;
      }

      var hitFlat = sl.squashTimer > 0 ? Math.sin((sl.squashTimer / 0.18) * Math.PI) * 0.28 : 0;
      var squashY = Math.max(0.65, 1.0 - hitFlat);
      var stretchXZ = 1 / Math.sqrt(squashY);
      sl.model.bodyGroup.scale.set(stretchXZ, squashY, stretchXZ);
    }

    // Wizard Auto-Firing Starlight Bolts
    player.wandCooldown = Math.max(0, player.wandCooldown - dt);
    if (player.wandCooldown <= 0) {
      var wRange = getWandRange();
      var candidates = [];
      for (var c = 0; c < sceneObjs.slimes.length; c++) {
        var cand = sceneObjs.slimes[c];
        if (!cand.alive) continue;
        var dCand = Math.hypot(cand.x - player.x, cand.z - player.z);
        if (dCand <= wRange) {
          candidates.push({ slime: cand, dist: dCand });
        }
      }
      if (candidates.length > 0) {
        candidates.sort(function (a, b) { return a.dist - b.dist; });
        var shots = getMultiShot();
        player.wandCooldown = getWandCooldown();
        player.swingTimer = player.swingDuration;
        playBoltCast();

        var primary = candidates[0].slime;
        var baseAng = Math.atan2(primary.x - player.x, primary.z - player.z);
        var castColor = getWizardTier() >= 4 ? 0xffd26e : getWizardTier() >= 2 ? 0xff7be5 : 0x57e6ff;
        spawnSlashArc(player.x + Math.sin(baseAng) * 0.75, 1.05, player.z + Math.cos(baseAng) * 0.75, baseAng, castColor, 1.2);
        spawnShockwave(player.x + Math.sin(baseAng) * 0.9, 1.1, player.z + Math.cos(baseAng) * 0.9, castColor, 1.1);

        for (var m = 0; m < shots; m++) {
          var targetSlime = candidates[m % candidates.length].slime;
          var fanOffset = shots > 1 ? (m - (shots - 1) / 2) * 0.16 : 0;
          var shootAng = Math.atan2(targetSlime.x - player.x, targetSlime.z - player.z) + fanOffset;
          var boltColor = getWizardTier() >= 4 ? 0xffd26e : getWizardTier() >= 2 ? 0xff7be5 : 0x57e6ff;
          var boltMesh = Entities.createProjectileMesh(boltColor);
          boltMesh.position.set(player.x + Math.sin(shootAng) * 0.65, 1.15, player.z + Math.cos(shootAng) * 0.65);
          Engine.scene.add(boltMesh);
          sceneObjs.projectiles.push({
            mesh: boltMesh,
            target: targetSlime,
            x: boltMesh.position.x,
            y: 1.15,
            z: boltMesh.position.z,
            vx: Math.sin(shootAng) * 16,
            vz: Math.cos(shootAng) * 16,
            damage: getWandDamage(),
            color: boltColor,
            life: 0
          });
        }
      }
    }

    // Update Starlight Bolts + Hit-Stop, Knockback, White Flash & 3D Debris
    for (var p = sceneObjs.projectiles.length - 1; p >= 0; p--) {
      var proj = sceneObjs.projectiles[p];
      proj.life += dt;
      if (proj.target && proj.target.alive) {
        var tdx = proj.target.x - proj.x;
        var tdz = proj.target.z - proj.z;
        var tdist = Math.hypot(tdx, tdz);
        if (tdist > 0.001) {
          proj.vx = (tdx / tdist) * 18.5;
          proj.vz = (tdz / tdist) * 18.5;
        }
      }
      proj.x += proj.vx * dt;
      proj.z += proj.vz * dt;
      proj.mesh.position.set(proj.x, proj.y, proj.z);
      proj.mesh.rotation.y += dt * 12;

      var hitTarget = null;
      for (var k = 0; k < sceneObjs.slimes.length; k++) {
        var slHit = sceneObjs.slimes[k];
        if (!slHit.alive) continue;
        var hitRad = slHit.isKing ? 1.65 : 0.95;
        if (Math.hypot(slHit.x - proj.x, slHit.z - proj.z) <= hitRad) {
          hitTarget = slHit;
          break;
        }
      }

      if (hitTarget) {
        hitTarget.hp -= proj.damage;
        hitTarget.squashTimer = 0.18;
        Entities.flashModelWhite(hitTarget.model, 0.12);
        runtime.hitStopTimer = Math.max(runtime.hitStopTimer, hitTarget.isKing ? 0.045 : 0.026);

        var pSpd = Math.hypot(proj.vx, proj.vz) || 1;
        var kbForce = hitTarget.isKing ? 2.8 : 6.8;
        hitTarget.knockVx = (proj.vx / pSpd) * kbForce;
        hitTarget.knockVz = (proj.vz / pSpd) * kbForce;
        Engine.addShake(hitTarget.isKing ? 0.1 : 0.055);
        playHitPop();
        spawnSlashArc(hitTarget.x, hitTarget.isKing ? 1.2 : 0.75, hitTarget.z, Math.atan2(proj.vx, proj.vz), proj.color, hitTarget.isKing ? 1.45 : 0.95);
        spawnSparks(proj.x, 0.75, proj.z, proj.color, 6);
        spawnDebrisParticles(proj.x, 0.8, proj.z, hitTarget.isKing ? 0xff4fa8 : 0x62f58c, hitTarget.isKing ? 8 : 5);
        spawnPopup(hitTarget.x, hitTarget.isKing ? 2.6 : 1.6, hitTarget.z, "-" + proj.damage, "#fff29b");

        if (hitTarget.hp <= 0) {
          hitTarget.alive = false;
          hitTarget.model.root.visible = false;
          state.slimesDefeated += 1;

          if (hitTarget.isKing) {
            state.wave += 1;
            state.bossTimer = BOSS_INTERVAL;
            var bossGems = 120 + state.wave * 35;
            state.gems += bossGems;
            state.totalGemsEarned += bossGems;
            gainXp(120);
            Engine.addShake(0.45);
            playBuildPop();
            spawnShockwave(hitTarget.x, 0.25, hitTarget.z, 0xffd26e, 4.2);
            spawnSparks(hitTarget.x, 1.0, hitTarget.z, 0xffe066, 18);
            spawnDebrisParticles(hitTarget.x, 1.3, hitTarget.z, 0xffd26e, 14);
            spawnPopup(hitTarget.x, 2.8, hitTarget.z, "왕 슬라임 처치! +" + bossGems + " 💎", "#ffe66d");
            showToast("대왕 슬라임 격파! Wave " + state.wave + " 진입!");
            for (var jd = 0; jd < 4; jd++) {
              spawnDrop("slime_jelly", hitTarget.x, hitTarget.z, RESOURCE_INFO.slime_jelly.price);
            }
          } else {
            hitTarget.respawnTimer = 6.5;
            var sGems = 6 + Math.floor(state.wave * 2);
            state.gems += sGems;
            state.totalGemsEarned += sGems;
            gainXp(18);
            spawnShockwave(hitTarget.x, 0.2, hitTarget.z, 0x72f57c, 1.8);
            spawnSparks(hitTarget.x, 0.7, hitTarget.z, 0x72f57c, 8);
            spawnDebrisParticles(hitTarget.x, 0.65, hitTarget.z, 0x72f57c, 6);
            spawnDrop("slime_jelly", hitTarget.x, hitTarget.z, RESOURCE_INFO.slime_jelly.price);
            spawnPopup(hitTarget.x, 1.6, hitTarget.z, "+" + sGems + " 💎", "#9bff78");
          }
        }

        if (proj.mesh.parent) proj.mesh.parent.remove(proj.mesh);
        sceneObjs.projectiles.splice(p, 1);
      } else if (proj.life >= 1.3) {
        if (proj.mesh.parent) proj.mesh.parent.remove(proj.mesh);
        sceneObjs.projectiles.splice(p, 1);
      }
    }

    // Ground Loot Drops Magnet Pickup
    for (var d = sceneObjs.drops.length - 1; d >= 0; d--) {
      var dr = sceneObjs.drops[d];
      dr.age += dt;
      dr.mesh.rotation.y += dt * 3.0;
      dr.mesh.position.y = 0.35 + Math.sin(runtime.time * 4.5 + d) * 0.1;

      var ddist = Math.hypot(player.x - dr.x, player.z - dr.z);
      if (ddist <= 4.5 && state.bag.length < getBackpackCap()) {
        if (ddist > 0.75) {
          dr.x += ((player.x - dr.x) / ddist) * 11 * dt;
          dr.z += ((player.z - dr.z) / ddist) * 11 * dt;
          dr.mesh.position.x = dr.x;
          dr.mesh.position.z = dr.z;
        } else {
          addToBag(dr.type, dr.value);
          playHarvestChime();
          if (dr.mesh.parent) dr.mesh.parent.remove(dr.mesh);
          sceneObjs.drops.splice(d, 1);
          continue;
        }
      }
      if (dr.age > 35) {
        if (dr.mesh.parent) dr.mesh.parent.remove(dr.mesh);
        sceneObjs.drops.splice(d, 1);
      }
    }
  }

  function updateVFX(dt) {
    // 1. Quadratic Bezier Curve Flying Items + 360-degree spin
    for (var i = sceneObjs.flyingItems.length - 1; i >= 0; i--) {
      var fi = sceneObjs.flyingItems[i];
      fi.life += dt;
      var t = Math.min(1, fi.life / fi.duration);
      var oneMinusT = 1 - t;
      var tx = fi.targetMode === "player" ? player.x : fi.tx;
      var ty = fi.targetMode === "player" ? 1.15 : fi.ty;
      var tz = fi.targetMode === "player" ? player.z : fi.tz;

      var x = oneMinusT * oneMinusT * fi.sx + 2 * oneMinusT * t * fi.cx + t * t * tx;
      var y = oneMinusT * oneMinusT * fi.sy + 2 * oneMinusT * t * fi.cy + t * t * ty;
      var z = oneMinusT * oneMinusT * fi.sz + 2 * oneMinusT * t * fi.cz + t * t * tz;

      fi.mesh.position.set(x, y, z);
      fi.mesh.rotation.y = fi.startYaw + t * Math.PI * 2;
      fi.mesh.rotation.x = Math.sin(t * Math.PI) * 0.45;

      if (t >= 1) {
        if (fi.mesh.parent) fi.mesh.parent.remove(fi.mesh);
        var cb = fi.onArrive;
        sceneObjs.flyingItems.splice(i, 1);
        if (typeof cb === "function") cb();
      }
    }

    // 2. Homing Magnet Gems (initial upward hop + accelerating pull into player)
    for (var mg = sceneObjs.magnetGems.length - 1; mg >= 0; mg--) {
      var gem = sceneObjs.magnetGems[mg];
      gem.age += dt;
      gem.vy -= 18.0 * dt;

      var gdx = player.x - gem.x;
      var gdy = 1.05 - gem.y;
      var gdz = player.z - gem.z;
      var gdist = Math.hypot(gdx, gdy, gdz);

      // Pull strength grows rapidly with time^2 after initial 0.08s pop
      var accel = 28 + Math.pow(gem.age, 1.5) * 320;
      if (gdist > 0.001) {
        gem.vx += (gdx / gdist) * accel * dt;
        gem.vy += (gdy / gdist) * accel * dt;
        gem.vz += (gdz / gdist) * accel * dt;
      }
      gem.vx *= 0.94;
      gem.vz *= 0.94;

      gem.x += gem.vx * dt;
      gem.y += gem.vy * dt;
      gem.z += gem.vz * dt;
      gem.mesh.position.set(gem.x, Math.max(0.15, gem.y), gem.z);
      gem.mesh.rotation.y += dt * 14;

      if (gdist <= 0.65 || gem.age >= 0.45) {
        if (gem.mesh.parent) gem.mesh.parent.remove(gem.mesh);
        var mgCb = gem.onCollect;
        var amt = gem.amount;
        sceneObjs.magnetGems.splice(mg, 1);
        if (typeof mgCb === "function") mgCb(amt);
      }
    }

    // 3. Shockwave Rings
    for (var r = sceneObjs.rings.length - 1; r >= 0; r--) {
      var ring = sceneObjs.rings[r];
      ring.life += dt;
      var rt = Math.min(1, ring.life / ring.duration);
      var sc = 0.25 + rt * ring.maxScale;
      ring.mesh.scale.set(sc, sc, sc);
      ring.mesh.material.opacity = 0.85 * (1 - rt);
      if (rt >= 1) {
        if (ring.mesh.parent) ring.mesh.parent.remove(ring.mesh);
        sceneObjs.rings.splice(r, 1);
      }
    }

    // 4. Slash Arcs
    for (var slIdx = sceneObjs.slashes.length - 1; slIdx >= 0; slIdx--) {
      var sa = sceneObjs.slashes[slIdx];
      sa.life += dt;
      var stNorm = Math.min(1, sa.life / sa.duration);
      var saScale = sa.startScale + (sa.endScale - sa.startScale) * stNorm;
      sa.mesh.scale.setScalar(saScale);
      if (sa.outerMat) sa.outerMat.opacity = 0.92 * (1 - stNorm);
      if (sa.innerMat) sa.innerMat.opacity = 0.98 * (1 - stNorm);
      if (sa.life >= sa.duration) {
        if (sa.mesh.parent) sa.mesh.parent.remove(sa.mesh);
        sceneObjs.slashes.splice(slIdx, 1);
      }
    }

    // 5. Additive Sparks
    for (var s = sceneObjs.sparks.length - 1; s >= 0; s--) {
      var sp = sceneObjs.sparks[s];
      sp.life += dt;
      sp.vy -= 14 * dt;
      sp.mesh.position.x += sp.vx * dt;
      sp.mesh.position.y += sp.vy * dt;
      sp.mesh.position.z += sp.vz * dt;
      if (Engine.camera) sp.mesh.lookAt(Engine.camera.position);
      var st = 1 - sp.life / sp.duration;
      sp.mesh.scale.setScalar(Math.max(0.01, st));
      if (sp.life >= sp.duration) {
        if (sp.mesh.parent) sp.mesh.parent.remove(sp.mesh);
        sceneObjs.sparks.splice(s, 1);
      }
    }

    // 6. 3D Tumbling & Bouncing Polyhedral Debris Particles
    for (var db = sceneObjs.debris.length - 1; db >= 0; db--) {
      var dObj = sceneObjs.debris[db];
      dObj.life += dt;
      dObj.vy -= 18 * dt;
      dObj.x += dObj.vx * dt;
      dObj.y += dObj.vy * dt;
      dObj.z += dObj.vz * dt;
      if (dObj.y <= 0.1) {
        dObj.y = 0.1;
        dObj.vy = Math.abs(dObj.vy) * 0.42;
        dObj.vx *= 0.72;
        dObj.vz *= 0.72;
      }
      dObj.mesh.position.set(dObj.x, dObj.y, dObj.z);
      dObj.mesh.rotation.x += dObj.rx * dt;
      dObj.mesh.rotation.y += dObj.ry * dt;
      dObj.mesh.rotation.z += dObj.rz * dt;
      var remScale = Math.max(0.01, dObj.baseScale * (1 - dObj.life / dObj.duration));
      dObj.mesh.scale.setScalar(remScale);
      if (dObj.life >= dObj.duration) {
        if (dObj.mesh.parent) dObj.mesh.parent.remove(dObj.mesh);
        sceneObjs.debris.splice(db, 1);
      }
    }

    // 7. World-to-Screen DOM Popups
    for (var p = sceneObjs.popups.length - 1; p >= 0; p--) {
      var pop = sceneObjs.popups[p];
      pop.life += dt;
      var wy = pop.wy + pop.life * 1.45;
      var screen = Engine.worldToScreen(new THREE.Vector3(pop.wx, wy, pop.wz));
      pop.el.style.left = screen.x.toFixed(1) + "px";
      pop.el.style.top = screen.y.toFixed(1) + "px";
      pop.el.style.opacity = String(Math.max(0, 1 - Math.pow(pop.life / pop.duration, 2)));
      if (pop.life >= pop.duration) {
        if (pop.el.parentNode) pop.el.parentNode.removeChild(pop.el);
        sceneObjs.popups.splice(p, 1);
      }
    }
  }

  function updateGuideArrow(dt) {
    if (!sceneObjs.wizard || !sceneObjs.wizard.guideArrowGroup) return;
    var tx = null;
    var tz = null;

    for (var s = 0; s < sceneObjs.slimes.length; s++) {
      var sl = sceneObjs.slimes[s];
      if (sl.isKing && sl.alive) {
        tx = sl.x;
        tz = sl.z;
        break;
      }
    }

    if (tx === null && state.pedestalGems >= 15) {
      tx = PEDESTAL_POS.x;
      tz = PEDESTAL_POS.z;
    }

    if (tx === null && state.bag.length >= Math.max(12, Math.floor(getBackpackCap() * 0.8))) {
      var hasRaw = false;
      for (var b = state.bag.length - 1; b >= 0; b--) {
        if (RESOURCE_INFO[state.bag[b].type] && RESOURCE_INFO[state.bag[b].type].raw) {
          hasRaw = true;
          break;
        }
      }
      if (hasRaw) {
        tx = -2.8;
        tz = -3.8;
      } else {
        tx = -4.2;
        tz = 3.2;
      }
    }

    if (tx === null) {
      var bestD = Infinity;
      for (var n = 0; n < sceneObjs.nodes.length; n++) {
        var nd = sceneObjs.nodes[n];
        if (nd.respawnTimer > 0) continue;
        var d = Math.hypot(nd.x - player.x, nd.z - player.z);
        if (d < bestD) {
          bestD = d;
          tx = nd.x;
          tz = nd.z;
        }
      }
    }

    if (tx === null) {
      sceneObjs.wizard.guideArrowGroup.visible = false;
      return;
    }

    var dx = tx - player.x;
    var dz = tz - player.z;
    var targetDist = Math.hypot(dx, dz);
    if (targetDist <= 2.2) {
      sceneObjs.wizard.guideArrowGroup.visible = false;
      return;
    }

    sceneObjs.wizard.guideArrowGroup.visible = true;
    var worldAng = Math.atan2(dx, dz);
    var diff = worldAng - runtime.guideYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    runtime.guideYaw += diff * Math.min(1, dt * 12);
    sceneObjs.wizard.guideArrowGroup.rotation.y = runtime.guideYaw - player.yaw;
  }

  // =========================================================================
  // HUD & Shop UI
  // =========================================================================
  function updateHUD() {
    if (dom.uiLv) dom.uiLv.textContent = "Lv." + state.level;
    if (dom.uiTitle) dom.uiTitle.textContent = TIER_TITLES[getWizardTier() - 1];
    if (dom.uiXpFill) {
      var xpPct = state.level >= 25 ? 100 : Math.min(100, (state.xp / xpNeeded(state.level)) * 100);
      dom.uiXpFill.style.width = xpPct.toFixed(1) + "%";
    }
    var bagCap = getBackpackCap();
    if (dom.uiBag) dom.uiBag.textContent = state.bag.length + " / " + bagCap;
    if (dom.uiBagFill) {
      dom.uiBagFill.style.width = Math.min(100, (state.bag.length / bagCap) * 100).toFixed(1) + "%";
      if (state.bag.length >= bagCap) dom.uiBagFill.classList.add("full");
      else dom.uiBagFill.classList.remove("full");
    }

    if (dom.uiGems) dom.uiGems.textContent = formatNum(state.gems);
    if (dom.uiCrystals) dom.uiCrystals.textContent = formatNum(state.crystalsHarvested);
    if (dom.uiPotions) dom.uiPotions.textContent = formatNum(state.potionsBrewed);

    var king = null;
    for (var i = 0; i < sceneObjs.slimes.length; i++) {
      if (sceneObjs.slimes[i].isKing && sceneObjs.slimes[i].alive) {
        king = sceneObjs.slimes[i];
        break;
      }
    }

    if (dom.uiBossTimer) {
      dom.uiBossTimer.textContent = king ? "출현 중!" : Math.ceil(Math.max(0, state.bossTimer)) + "s";
    }
    if (dom.bossBarWrap) {
      if (king) {
        dom.bossBarWrap.classList.add("active");
        if (dom.uiBossName) dom.uiBossName.textContent = "👑 대왕 보스 (Wave " + state.wave + ")";
        if (dom.uiBossHp) dom.uiBossHp.textContent = Math.max(0, Math.ceil(king.hp)) + " / " + king.maxHp;
        if (dom.uiBossFill) dom.uiBossFill.style.width = Math.max(0, (king.hp / king.maxHp) * 100).toFixed(1) + "%";
      } else {
        dom.bossBarWrap.classList.remove("active");
      }
    }
  }

  function getShopCards(tab) {
    if (tab === "wizard") {
      return [
        {
          key: "wandLv",
          title: "✨ 별빛 지팡이 마력",
          lv: state.wandLv,
          max: 25,
          cost: Math.round(65 * Math.pow(1.34, state.wandLv - 1)),
          desc: "마법탄 공격력 " + getWandDamage() + " · 다중 발사 " + getMultiShot() + "갈래",
          action: function () { state.wandLv += 1; }
        },
        {
          key: "harvestLv",
          title: "🔮 수정 채집 파워",
          lv: state.harvestLv,
          max: 25,
          cost: Math.round(55 * Math.pow(1.32, state.harvestLv - 1)),
          desc: "채집 파워 " + getHarvestPower() + " · 채집 반경 " + getHarvestRange().toFixed(1) + "m",
          action: function () { state.harvestLv += 1; }
        },
        {
          key: "bagLv",
          title: "🎒 마법 배낭 확장",
          lv: state.bagLv,
          max: 25,
          cost: Math.round(50 * Math.pow(1.32, state.bagLv - 1)),
          desc: "등 뒤 적재 한도 " + getBackpackCap() + "개",
          action: function () { state.bagLv += 1; }
        },
        {
          key: "speedLv",
          title: "💨 요정 걸음 가속",
          lv: state.speedLv,
          max: 25,
          cost: Math.round(55 * Math.pow(1.33, state.speedLv - 1)),
          desc: "이동 속도 " + getMoveSpeed().toFixed(1) + "m/s",
          action: function () { state.speedLv += 1; }
        }
      ];
    }

    if (tab === "automation") {
      return [
        {
          key: "cauldronLv",
          title: "🍯 황금 가마솥 승급",
          lv: state.cauldronLv,
          max: 15,
          cost: Math.round(150 * Math.pow(1.5, state.cauldronLv - 1)),
          desc: "무지개 포션 판매가 배율 " + getCauldronMult().toFixed(2) + "배",
          action: function () { state.cauldronLv += 1; }
        },
        {
          key: "fairies",
          title: "🧚 요정 일꾼 길드",
          lv: state.fairies,
          max: 10,
          cost: Math.round(80 * Math.pow(1.45, state.fairies)),
          desc: "숲 자원을 자동 채집·납품하는 요정 고용",
          action: function () {
            state.fairies += 1;
            syncFairyEntities();
          }
        },
        {
          key: "fairyLv",
          title: "🌸 요정 날개·가방 훈련",
          lv: state.fairyLv,
          max: 15,
          cost: Math.round(110 * Math.pow(1.42, state.fairyLv - 1)),
          desc: "요정 비행 속도 및 일꾼 적재 용량 강화",
          action: function () { state.fairyLv += 1; }
        },
        {
          key: "cartLv",
          title: "🛒 자동 수확 마법 수레",
          lv: state.cartLv,
          max: 10,
          cost: state.cartLv === 0 ? 250 : Math.round(300 * Math.pow(1.5, state.cartLv - 1)),
          desc: state.cartLv === 0 ? "숲 외곽을 순회하며 자원을 쓸어 담는 마법 수레 해금" : "수레 속도 및 적재량 (" + (12 + state.cartLv * 4) + "개) 강화",
          action: function () {
            state.cartLv += 1;
            syncCartEntity();
          }
        }
      ];
    }
    return [];
  }

  function renderShop() {
    if (!dom.shopBody) return;
    if (dom.uiShopStats) {
      dom.uiShopStats.textContent = "💎 " + formatNum(state.gems) + " · 포션 배율 " + getCauldronMult().toFixed(2) + "배 · 요정 " + state.fairies + "마리";
    }

    var tabs = document.querySelectorAll(".shop-tab");
    for (var t = 0; t < tabs.length; t++) {
      if (tabs[t].getAttribute("data-tab") === state.shopTab) tabs[t].classList.add("active");
      else tabs[t].classList.remove("active");
    }

    if (state.shopTab === "guide") {
      dom.shopBody.innerHTML =
        '<div class="guide-box">' +
        "<b>1. 직관적 1:1 이동 & 빌딩 적재</b><br>WASD / 조이스틱 방향과 1:1로 일치하는 클로즈업 3D 시점으로 숲을 탐험하며 자원을 등 뒤에 적재합니다.<br><br>" +
        "<b>2. 베지어 곡선 투입 & 3배 연성</b><br>원형 링 발판 위에 서면 등 뒤 아이템이 0.04초 간격으로 회전하며 포물선으로 투입되어 3배 가치 포션으로 정제됩니다.<br><br>" +
        "<b>3. 2x2 마나 보석 타워 & 자석 수금</b><br>손님 구매 시 보석 상자에 쌓인 보석이 접근 시 위로 튕겨 오르며 마법사에게 가속 흡입됩니다.<br><br>" +
        "<b>4. 대왕 보스 디펜스</b><br>마법탄 적중 시 히트스톱·넉백·3D 파편 연출과 함께 보스 웨이브 보상을 획득하세요." +
        "</div>";
      return;
    }

    var cards = getShopCards(state.shopTab);
    var html = '<div class="shop-grid">';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var isMax = c.lv >= c.max;
      var canBuy = !isMax && state.gems >= c.cost;
      html +=
        '<div class="upg-card">' +
        '<div class="upg-head"><span class="upg-title">' + c.title + '</span><span class="upg-lv">Lv.' + c.lv + "/" + c.max + "</span></div>" +
        '<div class="upg-desc">' + c.desc + "</div>" +
        '<button class="upg-buy-btn" data-upg="' + c.key + '"' + (canBuy ? "" : " disabled") + ">" +
        (isMax ? "최고 레벨 달성" : "💎 " + formatNum(c.cost) + " 강화") +
        "</button></div>";
    }
    html += "</div>";
    dom.shopBody.innerHTML = html;

    var btns = dom.shopBody.querySelectorAll(".upg-buy-btn");
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener("click", function (ev) {
        var key = ev.currentTarget.getAttribute("data-upg");
        var list = getShopCards(state.shopTab);
        for (var j = 0; j < list.length; j++) {
          if (list[j].key === key) {
            var item = list[j];
            if (item.lv < item.max && state.gems >= item.cost) {
              state.gems -= item.cost;
              item.action();
              playBuildPop();
              refreshAllPadTextures();
              renderShop();
              updateHUD();
              saveGame();
            }
            break;
          }
        }
      });
    }
  }

  function openShop() {
    runtime.shopOpen = true;
    if (dom.shopModal) dom.shopModal.classList.add("open");
    renderShop();
  }

  function closeShop() {
    runtime.shopOpen = false;
    if (dom.shopModal) dom.shopModal.classList.remove("open");
  }

  function summonBoss() {
    for (var i = 0; i < sceneObjs.slimes.length; i++) {
      if (sceneObjs.slimes[i].isKing && sceneObjs.slimes[i].alive) {
        showToast("대왕 보스가 이미 숲에 출현해 있습니다!");
        return false;
      }
    }
    var king = spawnSlimeEntity(true, 5.8, -14.8, 0);
    state.bossTimer = BOSS_INTERVAL;
    playBossFanfare();
    Engine.addShake(0.35);
    spawnShockwave(5.8, 0.2, -14.8, 0xffd26e, 4.0);
    spawnPopup(5.8, 3.0, -14.8, "👑 대왕 보스 등장!", "#ffe66d");
    showToast("👑 대왕 보스 (Wave " + state.wave + ") 출현!");
    return king;
  }

  // =========================================================================
  // Save / Load / Reset & Input Wiring
  // =========================================================================
  function saveGame() {
    try {
      var payload = {
        gems: state.gems,
        totalGemsEarned: state.totalGemsEarned,
        crystalsHarvested: state.crystalsHarvested,
        potionsBrewed: state.potionsBrewed,
        slimesDefeated: state.slimesDefeated,
        level: state.level,
        xp: state.xp,
        wave: state.wave,
        wandLv: state.wandLv,
        harvestLv: state.harvestLv,
        bagLv: state.bagLv,
        speedLv: state.speedLv,
        cauldronLv: state.cauldronLv,
        fairies: state.fairies,
        fairyLv: state.fairyLv,
        cartLv: state.cartLv,
        wandUpgLv: state.wandUpgLv,
        speedUpgLv: state.speedUpgLv,
        pedestalGems: state.pedestalGems,
        bag: state.bag.slice(0, 600),
        counterStock: state.counterStock.slice(0, 200),
        muted: state.muted
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function loadGame() {
    try {
      var raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return false;
      var keys = [
        "gems", "totalGemsEarned", "crystalsHarvested", "potionsBrewed",
        "slimesDefeated", "level", "xp", "wave", "wandLv", "harvestLv",
        "bagLv", "speedLv", "cauldronLv", "fairies", "fairyLv", "cartLv",
        "wandUpgLv", "speedUpgLv", "pedestalGems", "muted"
      ];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (typeof data[k] !== "undefined") state[k] = data[k];
      }
      if (Array.isArray(data.bag)) state.bag = data.bag;
      if (Array.isArray(data.counterStock)) state.counterStock = data.counterStock;
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearTransientSceneItems() {
    var lists = [
      sceneObjs.projectiles, sceneObjs.flyingItems, sceneObjs.magnetGems,
      sceneObjs.drops, sceneObjs.rings, sceneObjs.slashes, sceneObjs.sparks, sceneObjs.debris
    ];
    for (var l = 0; l < lists.length; l++) {
      var arr = lists[l];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].mesh && arr[i].mesh.parent) arr[i].mesh.parent.remove(arr[i].mesh);
      }
      arr.length = 0;
    }
    for (var k = sceneObjs.slimes.length - 1; k >= 0; k--) {
      if (sceneObjs.slimes[k].isKing) {
        if (sceneObjs.slimes[k].model.root.parent) sceneObjs.slimes[k].model.root.parent.remove(sceneObjs.slimes[k].model.root);
        sceneObjs.slimes.splice(k, 1);
      } else {
        sceneObjs.slimes[k].alive = true;
        sceneObjs.slimes[k].maxHp = 45;
        sceneObjs.slimes[k].hp = 45;
        sceneObjs.slimes[k].model.root.visible = true;
      }
    }
    for (var n = 0; n < sceneObjs.nodes.length; n++) {
      sceneObjs.nodes[n].respawnTimer = 0;
      sceneObjs.nodes[n].hp = sceneObjs.nodes[n].maxHp;
      sceneObjs.nodes[n].model.bodyGroup.visible = true;
    }
  }

  function resetGame() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
    state = createDefaultState();
    player.x = 0;
    player.z = 2.0;
    player.vx = 0;
    player.vz = 0;
    player.yaw = 0;
    player.stackInertiaX = 0;
    player.stackInertiaZ = 0;
    player.stackVelX = 0;
    player.stackVelZ = 0;
    runtime.hitStopTimer = 0;
    clearTransientSceneItems();
    for (var i = 0; i < sceneObjs.pads.length; i++) {
      sceneObjs.pads[i].paid = 0;
      sceneObjs.pads[i].cooldown = 0;
      sceneObjs.pads[i].activeGlow = false;
    }
    if (sceneObjs.wizard) {
      runtime.lastTier = 1;
      Entities.updateWizardTier(sceneObjs.wizard, 1);
    }
    syncFairyEntities();
    syncCartEntity();
    rebuildInitialBackStack();
    rebuildInitialCounterStock();
    rebuildInitialPedestalGems();
    refreshAllPadTextures();
    updateHUD();
    showToast("모험 기록이 초기화되었습니다.");
  }

  function bindDOMandInputs() {
    if (typeof document === "undefined") return;

    dom.container = document.getElementById("webgl-container");
    dom.fxOverlay = document.getElementById("fx-overlay");
    dom.uiLv = document.getElementById("ui-lv");
    dom.uiTitle = document.getElementById("ui-title");
    dom.uiXpFill = document.getElementById("ui-xp-fill");
    dom.uiBag = document.getElementById("ui-bag");
    dom.uiBagFill = document.getElementById("ui-bag-fill");
    dom.uiGems = document.getElementById("ui-gems");
    dom.uiCrystals = document.getElementById("ui-crystals");
    dom.uiPotions = document.getElementById("ui-potions");
    dom.uiBossTimer = document.getElementById("ui-boss-timer");
    dom.bossBarWrap = document.getElementById("boss-bar-wrap");
    dom.uiBossName = document.getElementById("ui-boss-name");
    dom.uiBossHp = document.getElementById("ui-boss-hp");
    dom.uiBossFill = document.getElementById("ui-boss-fill");
    dom.toastBanner = document.getElementById("toast-banner");

    dom.joyZone = document.getElementById("joystick-zone");
    dom.joyBase = document.getElementById("joystick-base");
    dom.joyStick = document.getElementById("joystick-stick");
    dom.joyHint = document.getElementById("joystick-hint");

    dom.shopModal = document.getElementById("shop-modal");
    dom.uiShopStats = document.getElementById("ui-shop-stats");
    dom.shopBody = document.getElementById("shop-body");
    dom.resetModal = document.getElementById("reset-modal");

    if (dom.joyZone) {
      var joyOriginX = 0;
      var joyOriginY = 0;
      var maxJoyR = 42;

      var resetJoystick = function () {
        runtime.activePointerId = null;
        runtime.joyX = 0;
        runtime.joyY = 0;
        if (dom.joyBase) {
          dom.joyBase.classList.remove("active");
          dom.joyBase.style.left = "";
          dom.joyBase.style.top = "";
        }
        if (dom.joyStick) {
          dom.joyStick.style.transform = "";
        }
      };

      dom.joyZone.addEventListener("pointerdown", function (e) {
        unlockAudio();
        runtime.activePointerId = e.pointerId;
        if (typeof dom.joyZone.setPointerCapture === "function") {
          try { dom.joyZone.setPointerCapture(e.pointerId); } catch (err) {}
        }
        var vw = window.innerWidth || 800;
        var vh = window.innerHeight || 600;
        joyOriginX = Math.max(66, Math.min(vw - 66, e.clientX));
        joyOriginY = Math.max(76, Math.min(vh - 66, e.clientY));
        if (dom.joyBase) {
          dom.joyBase.classList.add("active");
          dom.joyBase.style.left = joyOriginX + "px";
          dom.joyBase.style.top = joyOriginY + "px";
        }
        if (dom.joyStick) {
          dom.joyStick.style.transform = "translate(0px, 0px)";
        }
        if (dom.joyHint) {
          dom.joyHint.classList.add("hidden");
        }
      });

      dom.joyZone.addEventListener("pointermove", function (e) {
        if (runtime.activePointerId === null || e.pointerId !== runtime.activePointerId) return;
        var dx = e.clientX - joyOriginX;
        var dy = e.clientY - joyOriginY;
        var dist = Math.hypot(dx, dy);
        if (dist > maxJoyR) {
          dx = (dx / dist) * maxJoyR;
          dy = (dy / dist) * maxJoyR;
        }
        runtime.joyX = dx / maxJoyR;
        runtime.joyY = dy / maxJoyR;
        if (dom.joyStick) {
          dom.joyStick.style.transform = "translate(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px)";
        }
      });

      dom.joyZone.addEventListener("pointerup", function (e) {
        if (e.pointerId === runtime.activePointerId) resetJoystick();
      });
      dom.joyZone.addEventListener("pointercancel", function (e) {
        if (e.pointerId === runtime.activePointerId) resetJoystick();
      });
    }

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", function (e) {
        unlockAudio();
        runtime.keys[e.code] = true;
        if (dom.joyHint && (e.code === "KeyW" || e.code === "KeyA" || e.code === "KeyS" || e.code === "KeyD")) {
          dom.joyHint.classList.add("hidden");
        }
        if (e.code === "Escape") {
          closeShop();
          if (dom.resetModal) dom.resetModal.classList.remove("open");
        }
      });
      window.addEventListener("keyup", function (e) {
        runtime.keys[e.code] = false;
      });
    }

    var btnBoss = document.getElementById("btn-summon-boss");
    if (btnBoss) btnBoss.addEventListener("click", function () { unlockAudio(); summonBoss(); });

    var btnShop = document.getElementById("btn-open-shop");
    if (btnShop) btnShop.addEventListener("click", function () { unlockAudio(); openShop(); });

    var btnCloseShop = document.getElementById("btn-close-shop");
    if (btnCloseShop) btnCloseShop.addEventListener("click", closeShop);

    var shopTabs = document.querySelectorAll(".shop-tab");
    for (var i = 0; i < shopTabs.length; i++) {
      shopTabs[i].addEventListener("click", function (ev) {
        state.shopTab = ev.currentTarget.getAttribute("data-tab") || "wizard";
        renderShop();
      });
    }

    var btnHome = document.getElementById("btn-home");
    if (btnHome) {
      btnHome.addEventListener("click", function () {
        unlockAudio();
        player.x = 0;
        player.z = 2.0;
        player.vx = 0;
        player.vz = 0;
        spawnShockwave(0, 0.2, 2.0, 0x6ae2ff, 2.0);
        showToast("마을 광장으로 귀환했습니다.");
      });
    }

    var btnMute = document.getElementById("btn-mute");
    if (btnMute) {
      btnMute.textContent = state.muted ? "🔇" : "🔊";
      btnMute.addEventListener("click", function () {
        state.muted = !state.muted;
        btnMute.textContent = state.muted ? "🔇" : "🔊";
        saveGame();
      });
    }

    var btnSave = document.getElementById("btn-save");
    if (btnSave) {
      btnSave.addEventListener("click", function () {
        saveGame();
        showToast("진행 상황이 안전하게 저장되었습니다.");
      });
    }

    var btnReset = document.getElementById("btn-reset");
    if (btnReset) {
      btnReset.addEventListener("click", function () {
        if (dom.resetModal) dom.resetModal.classList.add("open");
      });
    }
    var btnCancelReset = document.getElementById("btn-cancel-reset");
    if (btnCancelReset) {
      btnCancelReset.addEventListener("click", function () {
        if (dom.resetModal) dom.resetModal.classList.remove("open");
      });
    }
    var btnConfirmReset = document.getElementById("btn-confirm-reset");
    if (btnConfirmReset) {
      btnConfirmReset.addEventListener("click", function () {
        if (dom.resetModal) dom.resetModal.classList.remove("open");
        resetGame();
      });
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", function () {
        Engine.resize();
      });
    }
  }

  // =========================================================================
  // Frame Step & Async GLB Startup
  // =========================================================================
  function step(dt) {
    if (!runtime.ready) return;
    var rawDt = Math.min(0.05, Math.max(0.001, dt || 0.016));
    runtime.time += rawDt;

    // Update model flash, station squash-and-stretch, and floating labels even during hit-stop
    Entities.updateStationSquash(sceneObjs.cauldron, rawDt);
    Entities.updateStationSquash(sceneObjs.sales, rawDt);
    Entities.updateStationSquash(sceneObjs.pedestal, rawDt);

    for (var fi = 0; fi < sceneObjs.nodes.length; fi++) {
      Entities.updateModelFlash(sceneObjs.nodes[fi].model, rawDt);
    }
    for (var si = 0; si < sceneObjs.slimes.length; si++) {
      var slObj = sceneObjs.slimes[si];
      Entities.updateModelFlash(slObj.model, rawDt);
      if (slObj.isKing && slObj.alive && slObj.model.hpBarHolder && Engine.camera) {
        slObj.model.hpBarHolder.lookAt(Engine.camera.position);
      }
    }
    if (Engine.camera) {
      for (var pi = 0; pi < sceneObjs.pads.length; pi++) {
        var lbl = sceneObjs.pads[pi].model && sceneObjs.pads[pi].model.labelMesh;
        if (lbl) lbl.lookAt(Engine.camera.position);
      }
    }

    if (runtime.gemComboTimer > 0) {
      runtime.gemComboTimer -= rawDt;
      if (runtime.gemComboTimer <= 0) {
        runtime.gemCombo = 0;
        runtime.gemPopupAcc = 0;
      }
    }

    if (runtime.toastTimer > 0) {
      runtime.toastTimer -= rawDt;
      if (runtime.toastTimer <= 0 && dom.toastBanner) {
        dom.toastBanner.classList.remove("show");
      }
    }

    if (runtime.hitStopTimer > 0) {
      runtime.hitStopTimer = Math.max(0, runtime.hitStopTimer - rawDt);
      updateVFX(rawDt);
      Engine.update({ x: player.x, z: player.z, vx: player.vx, vz: player.vz, maxSpeed: getMoveSpeed() }, rawDt);
      return;
    }

    updatePlayerMovement(rawDt);
    updatePadsAndStations(rawDt);
    updateResourceNodes(rawDt);
    updateCustomers(rawDt);
    updateFairies(rawDt);
    updateHarvesterCart(rawDt);
    updateSlimesAndCombat(rawDt);
    updateVFX(rawDt);
    updateGuideArrow(rawDt);

    Engine.update({ x: player.x, z: player.z, vx: player.vx, vz: player.vz, maxSpeed: getMoveSpeed() }, rawDt);
    updateHUD();

    runtime.saveTimer += rawDt;
    if (runtime.saveTimer >= 10) {
      runtime.saveTimer = 0;
      saveGame();
    }
  }

  function init() {
    if (runtime.initialized) return Promise.resolve(true);
    runtime.initialized = true;

    loadGame();
    bindDOMandInputs();
    Engine.init(dom.container);
    showToast("🌲 3D 모델 불러오는 중...");

    return AssetLoader.loadAll(function (done, total) {
      if (done === total) showToast("✨ 마법의 숲 3D 월드 준비 완료!");
    }).then(function () {
      Engine.populateGlbScenery();
      buildWorldObjects();
      runtime.ready = true;
      Engine.update({ x: player.x, z: player.z, vx: 0, vz: 0, maxSpeed: getMoveSpeed() }, 0.016);
      updateHUD();

      var lastTime = typeof performance !== "undefined" ? performance.now() : Date.now();
      var raf = (typeof window !== "undefined" && window.requestAnimationFrame)
        ? window.requestAnimationFrame
        : function (cb) { return setTimeout(function () { cb(Date.now()); }, 16); };

      function loop(now) {
        var dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;
        step(dt);
        Engine.render();
        raf(loop);
      }

      if (typeof window === "undefined" || !window.__NO_AUTO_RAF__) {
        raf(loop);
      }
      return true;
    }).catch(function (err) {
      showToast("⚠️ GLB 모델 로드 실패: " + (err && err.message ? err.message : String(err)));
      throw err;
    });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { init(); });
    } else {
      init();
    }
  }

  if (typeof window !== "undefined") {
    window.Gameplay = {
      init: init,
      step: step,
      getState: function () { return state; },
      getPlayer: function () { return player; },
      getRuntime: function () { return runtime; },
      getSceneObjs: function () { return sceneObjs; },
      setInput: function (ix, iy) { runtime.joyX = ix; runtime.joyY = iy; },
      openShop: openShop,
      closeShop: closeShop,
      renderShop: renderShop,
      summonBoss: summonBoss,
      saveGame: saveGame,
      loadGame: loadGame,
      resetGame: resetGame
    };
  }
})();
