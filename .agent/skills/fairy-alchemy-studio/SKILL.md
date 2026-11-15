---
name: fairy-alchemy-studio
description: Studio production pipeline, UI/Market visibility standards, Chibi 3D rendering architecture, 20-Wave Territory Expansion, Lv.20 Mastery, 4 Alchemy Labs, 9 Production Facilities, and Overhead Billboard UI specs for Fairy Alchemy Tycoon & Defense.
---

# Fairy Alchemy Tycoon & Defense — Studio Specification (v10)

## 1. Visual & Chibi 3D Art Direction
- **Strict No-Robot Rule**: Never load `RobotExpressive.glb`. Every character (Alchemist Hero, Fairies, Customers, Waves 1~20 Monsters) and facility must be built procedurally with **2-head Chibi toon proportions** (`MeshToonMaterial` + dark brown/indigo silhouette outline meshes via `addOutlinedMesh`).
- **Dual-Walled Town & Territory Expansion**:
  - South Wall Gate (`z = 20`): Safe resource farming corridor leading to Southern Resource Valleys (Zones 1~10). Hero combat skills cannot fire inside town; East Siege Gate (`x = 24`) is the sole monster ingress point.
  - 5-Wave Expansion eras tear down north barriers (`z = -20` NW/NE and `z = -32` North Citadel) and pan the camera (`Engine.panCameraTo`) with celebration banners.
- **Chunky Crate Stacking**: Carried resources stack on the wooden backpack/fairy tray as wide `0.95m x 0.20m x 0.62m` themed crates with distinct 3D tops for all raw ores/herbs/stones/crystals/fungi/meteorites/scales and crafted goods (`cut_gem`, `magic_potion`, `royal_elixir`, `fire_runestone`, `spirit_music_box`, `arcane_core`, `moon_perfume`, `philosopher_stone`).

## 2. World Readability & UI Visibility Standards
- **Overhead Floating Billboard Sprites (Zero Roof Occlusion)**:
  - All District Hub Buildings, Production Machines (`m1..m9`), Energy Converters, Market/Envoy Stalls, and Gates must use overhead `THREE.Sprite` banners at `y = 3.8~4.5m` with `depthTest: false`, `depthWrite: false`, and `renderOrder: 999`.
  - Floor nameplates on buildings/machines/stalls are forbidden because roofs or stacked crates occlude them.
  - Banners displaying levels (e.g., `🔮 제1연금술 연구소 Lv.2`) must update dynamically via `updateOverheadBannerSprite`.
- **1.5x Giant Floating Zone Headers**:
  - Major districts render enlarged `7.2m x 1.65m` floating zone title headers at `y = 5.3~5.8m` (`renderOrder: 1000`, `depthTest: false`) so players identify districts even at zoomed-out camera scale.
- **Wide Cross (`+`) Step Pads (`+1.3m` clearance)**:
  - Category Hub spoke arms (`hub_spoke_x`, `hub_spoke_z`) span `8.4m`, keeping N/S/E/W step pads clear of building roofs.
- **Distinct Color-Coded District Floor Platforms**:
  - `alchemy`: Royal purple velvet stone with gold rune border (`#9b59b6` / `#f1c40f`).
  - `defense`: Slate-blue fortress tile with cyan energy border (`#2980b9` / `#00e5ff`) and 4 corner shield pillars.
  - `training`: Emerald academy tile (`#2ecc71` / `#a3ffcb`).
  - `factory`: Warm iron-brick workshop with orange-brass frame (`#e67e22` / `#ffd280`) and floor directional input arrows.
  - `guild`: Teal & gold logistics tile (`#1abc9c` / `#f9e79f`).

## 3. Core Economy, Territory Eras & 20-Wave Loop
- **Unified Cash Currency**: All pad prices, coin stacks, customer payments, and top-right HUD display Cash (`💵`). Dimensional Energies (`🌟`, `🌌`, `🔱`) power skill/tech/lab/gate progression.
- **20 Waves & 10-Min Initial Prep**:
  - `TOTAL_WAVES = 20`, `FIRST_WAVE_DELAY = 600` (10 minutes), `WAVE_INTERVAL = 180` (3 minutes). Each wave spawns 60 non-grotesque themed Chibi monsters (10 every 10s over 60s).
  - **Era 1 (Wave 1~5)**: Base Workshop Town (Cap `Lv.5`, Lab #1 `Lv.1~3`, Machines `1~3호기`, Zones `1~4`).
  - **Era 2 (Wave 6~10)**: NW `정령 공학 지구` unlocked (`Lv.10` cap, Lab #2 `Lv.4~6`, 🔥 화염 마나석 & 💧 정령의 이슬 Zones `5~6`, Machines `4~5호기` + `마법 길드 열기구`).
  - **Era 3 (Wave 11~15)**: NE `번개 제련 단지` unlocked (`Lv.15` cap, Lab #3 `Lv.7~9`, ⚡ 번개 수정 & 🍄 달빛 버섯 Zones `7~8`, Machines `6~7호기` + rail tracks & `드워프 장갑열차`).
  - **Era 4 (Wave 16~20)**: North `황금 대성채 & 비공정 부두` unlocked (`Lv.20 MAX` cap, Lab #4 `Lv.10~12`, 🌟 별똥별 운석 & 🌺 용의 비늘꽃 Zones `9~10`, Machines `8~9호기` + `거대 황금 비공정`).
- **Lv.20 Mastery & 5-Level Milestone Passives**:
  - `Lv.5`: Expanded harvest radius (`2.65 -> 4.0m`).
  - `Lv.10`: Dual-node multi-hit (`2` nodes) + `2x` cash vacuum radius (`2.8 -> 5.6m`).
  - `Lv.15`: `30%` chance for double (`2x`) resource yield.
  - `Lv.20`: **Archmage Golden Aura** (visible gold ring, zero-cooldown instant pass-by harvest, `1.5x` all Cash sale prices).
- **4 Labs Auto-Logistics**:
  - Lab #2 enables auto-conveyors (`m1 -> m4`, `m2 -> m6`, `m6 -> m8`) + Harvester Truck #2.
  - Lab #3 grants `30%` (`+5%/lv` above Lv.7) chance of 1+1 bonus output on all production machines.
  - Lab #4 grants fairy instant warp teleportation + `2x` Golden Airship payout.
