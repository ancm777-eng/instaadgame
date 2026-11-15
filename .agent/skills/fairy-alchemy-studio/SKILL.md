---
name: fairy-alchemy-studio
description: Studio production pipeline, coding prohibitions, and 2.5D HD-3D asset-driven architecture skill for Fairy Alchemy Tycoon & Defense.
---

# Fairy Alchemy Studio Pipeline Skill

이 Skill은 **동화풍 마법 숲 연금술 상점 타이쿤 & 디펜스 아케이드** 프로젝트의 공식 스튜디오 제작 파이프라인과 코드 아키텍처 규칙을 정의한다.

---

## 1. 핵심 코딩 금지 규칙 (Mandatory Anti-Primitive Rule)

> **절대로 Three.js 기본 도형(Sphere, Cylinder, Cone) 몇 개를 합쳐서 캐릭터나 건물을 대충 조립하지 말고, 반드시 `assets/` 폴더에 생성된 고해상도 3D 렌더링 텍스처/스프라이트 에셋을 로드해 렌더링할 것.**

### 상세 준수 사항
1. `src/entities.js` 및 `src/engine.js`에서 캐릭터, 요정, 손님, 슬라임, 가마솥, 판매대, 보석 받침대, 수확 수레, 나무, 버섯, 자원 노드를 `new THREE.SphereGeometry`, `CylinderGeometry`, `ConeGeometry` 조합(이른바 찰흙 눈사람 프리팹)으로 조립하는 것을 **전면 금지**한다.
2. 모든 개체와 건물은 `assets/asset_manifest.json`에 명시된 **512×512 고해상도 3D 프리렌더 투명 PNG 에셋**(`assets/characters/`, `assets/buildings/`, `assets/environment/`, `assets/items/`, `assets/ui/`)을 텍스처로 로드하여 2.5D 빌보드 메쉬 또는 텍스처 매핑 3D 블록으로 렌더링한다.
3. Three.js 3D 공간에서는 바닥 지형(타일 텍스처 반복 적용), 실시간 그림자(`PCFSoftShadowMap`), 포인트 라이트(`PointLight`), 등 뒤 스택 3D 블록 물리, 마법탄/참격/충격파 이펙트, 가이드 화살표 회전을 담당한다.

---

## 2. 엄격한 3단계 제작 파이프라인 (Strict Sequential Phases)

| 단계 | 산출물 | 게이트 조건 |
|---|---|---|
| **Phase 1: 기획·명세** | `.agent/skills/fairy-alchemy-studio/SKILL.md`, `docs/GDD.md`, `assets/asset_manifest.json` | 모든 코어 루프와 35종 에셋 경로·해상도·피벗 명세 완료 후에만 Phase 2 착수 |
| **Phase 2: 3D 에셋 베이킹 & 검수** | `scripts/gen_ai_sprites.py`, `scripts/generate_3d_assets.js`, `assets/**/*.png` (35장), `assets/asset_bundle.js`, `asset_preview.html` | `assets/` 폴더에 512×512 PNG 35종 생성 및 PNG 헤더·시각 검수 완료 후에만 Phase 3 착수 |
| **Phase 3: 2.5D/3D 하이브리드 엔진 구현** | `index.html`, `style.css`, `src/engine.js`, `src/entities.js`, `src/gameplay.js` | 에셋 매니페스트 전량 로드 및 전체 게임플레이 시나리오 헤드리스·구문 검증 통과 |

---

## 3. 게임 코어 루프 & 시나리오 체크리스트

1. **자원 채집 (`crystal_node`, `berry_node`)**:
   - 마법사가 공방 울타리 관문(`사냥터 출구`, `자원지 출구`) 밖 28개 외곽 자원 노드에 접근하면 지팡이 스윙 모션(`wizard_swing.png`)과 참격 아크(`slash_arc.png`), 노드 스쿼시, 포물선 흡입이 발생한다.
2. **등 뒤 고층 스택 적재 & 관성 물리 (`brick_crystal`, `brick_berry`, `brick_jelly`, `brick_potion`)**:
   - 채집/획득한 자원은 규격화된 `0.58 × 0.16 × 0.38` 3D 블록(`brick_*.png` 텍스처 매핑)으로 등 뒤에 최대 50층까지 수직 적재되며, 이동·급회전 시 2차 스프링-댐퍼 관성에 따라 휘어진다.
3. **황금 가마솥 3배 포션 연성 (`cauldron_station`)**:
   - `재료 투입` 발판에 서면 원재료가 가마솥으로 날아가 **3.0배 이상** 가치의 무지개 포션(`brick_potion`)으로 연성되어 판매대로 직행한다.
4. **판매대 3×2 진열 & 손님 대기열 (`sales_stall`, `customer_1~4`)**:
   - `손님 방문길` 관문으로 입장한 동물·요정 손님 4명이 판매대 앞에 줄을 서고, 진열된 3×2 격자(최대 60블록) 아이템을 순차 구매한다.
5. **보석 타워 연속 수금 (`gem_pedestal`, `hex_mana_gem`, `0.03s` 흡입)**:
   - 판매 대금은 받침대 위에 2×2 격자 육각 마나 보석 주괴 타워(최대 128개, 32층)로 쌓인다.
   - 플레이어가 다가가면 `0.03초` 간격으로 꼭대기 보석부터 마법사에게 `0.22초` 포물선으로 연속 흡입되며 연속 상승 음계(`playGemChime`)가 울린다.
6. **바닥 발판(Step-to-Pay) 성장 & 자동화**:
   - 투명 마법 테두리 + 크림-골드 간판형 발판(`재료 투입`, `판매대 진열`, `가마솥 강화`, `요정 일꾼`, `지팡이 강화`, `신속 장화`, `수확 수레`) 위에서 보유 보석이 빠르게 투입된다.
   - `fairy_worker` 요정 일꾼과 `harvester_cart` 자동 수확 수레가 해금되면 각각 채집/정제/운반 및 동남·북동 관문 순회 대량 수확을 자동 수행한다.
7. **대왕 슬라임 디펜스 & 발밑 3D 가이드 화살표**:
   - 울타리 밖 12마리 정찰 슬라임(`slime_normal`)과 웨이브 보스 `대왕 슬라임`(`slime_king`)을 별빛 탄환으로 요격한다(넉백 + 스쿼시 앤 스트레치 + 카메라 셰이크).
   - 발밑 오라 링 밖의 `guide_arrow`는 `대왕 슬라임 → 보석 받침대(15개 이상) → 가방 가득 시 가마솥/판매대 → 최근접 자원 노드` 순으로 동적 조준한다.
