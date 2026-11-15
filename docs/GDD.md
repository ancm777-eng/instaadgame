# Fairy Alchemy Tycoon & Defense — 상세 기획서 (GDD)

## 1. 프로젝트 개요 및 비주얼 아키텍처

- **장르**: 동화풍 마법 숲 연금술 상점 타이쿤 & 디펜스 아케이드
- **렌더링 방식**: **2.5D HD-3D 하이브리드** (`Three.js` 3D 공간 + `assets/` 프리렌더 512×512 3D 스프라이트)
  - 지형(잔디/목재 공방 바닥), 실시간 그림자(`PCFSoftShadowMap`), 포인트 라이트, 참격 아크, 마법탄, 등 뒤 고층 스택 물리는 3D 월드에서 연산한다.
  - 캐릭터, 건물, 나무, 몬스터, 아이템 블록 표면에 적용되는 아트워크는 모두 `scripts/generate_3d_assets.js`(및 선택적 Gemini API 스크립트 `scripts/gen_ai_sprites.py`)로 사전 제작된 **512×512 RGBA 투명 배경 3D 셰이딩 에셋**(4단계 툰 음영 + 림 라이트 + 스페큘러 + 앰비언트 오클루전 + `#241434` 외곽선)을 로드해 사용한다.
- **카메라**: 아이소메트릭 직교 카메라 (`OrthographicCamera`, 데스크톱 `frustumHalfH = 9.6`, 모바일 `12.2`).

---

## 2. 게임 시나리오 & 코어 루프

```text
[외곽 숲 채집/사냥] ──(수정·열매·젤리 50층 등 뒤 적재)──▶ [재료 투입 발판]
        ▲                                                      │ (가마솥 3x 연성)
        │ (보석 강화: 지팡이·이동속도·요정·수확수레)                  ▼
[보석 타워 0.03초 연속 수금] ◀──(손님 4인 대기열 구매)── [판매대 3x2 60층 진열]
```

### 2.1 핵심 수치 및 메커니즘 사양
1. **고층 스택 적재 & 스프링 관성 물리**:
   - 가방 기본 용량 25에서 업그레이드/레벨에 따라 확장되며, 등 뒤에 최대 `50`개까지 `0.58 × 0.16 × 0.38` 규격 블록(`brick_crystal`, `brick_berry`, `brick_jelly`, `brick_potion`)이 `0.165` 간격으로 수직 적재된다.
   - 플레이어 가속도와 회전 요(`player.yaw`)에 연동된 스프링-댐퍼(`springK = 36`, `damp = 7.8`)로 고층 빌딩이 휘청거린다.
2. **황금 가마솥 연성**:
   - 위치 `(0, 0, -5.5)`, 연성 배율 기본 `3.0x` (+가마솥 레벨당 `0.25x`).
   - `재료 투입` 발판(`(-2.8, -3.8)`)에서 원재료를 넣으면 무지개 포션으로 변환되어 판매대 진열대로 포물선 이동한다.
3. **판매대 & 보석 받침대 `0.03s` 연속 흡입**:
   - 판매대(`(-7.2, 0, 1.2)`)는 `3 × 2` 격자 다층 진열(최대 `60`블록, 층간 `0.145`)을 지원한다.
   - 보석 받침대(`(-5.2, 0, -1.8)`)는 `2 × 2` 격자 수직 타워(최대 `128`개 육각 마나 보석 주괴, 32층)를 표시한다.
   - 플레이어 접근 시 `gemCooldown = 0.03s` 주기로 최상층 주괴부터 `0.22s` 고속 포물선으로 흡입되며 `playGemChime` 주파수가 `360 * 1.032^combo` Hz로 연속 상승한다.
4. **자동화 유닛 (요정 일꾼 & 자동 수확 마법 수레)**:
   - `요정 일꾼(fairy_worker)`: 최대 6명 고용, 외곽 노드를 순회 채집해(레벨 2 이상 가마솥 경유 후) 판매대에 납품.
   - `자동 수확 마법 수레(harvester_cart)`: 캠프 내부 `(-3.8, -1.2)`에서 **남동 관문 `(8.54, 4.81)`** 으로 출발해 외곽 28개 자원지를 일주한 뒤 **북동 관문 `(4.65, -7.1)`** 으로 귀환·하역.
5. **전투 & 타격감 연출**:
   - 지팡이 자동 사격 시 `wizard_swing.png` 포즈 전환, 참격 아크(`slash_arc.png`), 타격 대상 넉백(`knockVx/Vz`) 및 스쿼시 애니메이션(`0.18s`), 미세 카메라 셰이크(`ThreeScene` 진동) 발생.
   - 대왕 슬라임(`slime_king`)은 120초 주기 또는 즉시 소환 버튼으로 **북동 사냥터 관문 밖 `(5.8, -14.8)`** 에 등장.
6. **발밑 동적 3D 가이드 화살표**:
   - 우선순위: `1) 생존 중인 대왕 슬라임 → 2) 받침대 보석 15개 이상 → 3) 가방 80% 이상 포화 시 가마솥 투입/판매대 → 4) 가장 가까운 활성 자원 노드`.

---

## 3. 월드 공간 분할 설계

- **중앙 목재 공방 캠프**: 중심 `(0, 1.0)`, 반경 `9.2` (`timber_plank_tile.png` 반복 타일).
  - 내부 광장 발판 7종(캠프 경계 및 관문 통로를 침범하지 않도록 `r <= 5.85` 내 배치):
    - `cauldron_feed (-2.8, -3.8)`, `cauldron_upg (2.8, -3.8)`, `sell_pad (-4.2, 3.2)`, `hire_fairy (1.6, 2.2)`, `upg_wand (5.5, -0.2)`, `upg_speed (3.6, 5.6)`, `unlock_cart (-1.4, 6.4)`.
- **외곽 울타리 & 3대 관문 (`CAMP_WALL_R = 9.35`)**:
  - `사냥터 출구` (`-1.05 rad`), `자원지 출구` (`0.42 rad`), `손님 방문길` (`2.42 rad`) 3개 아치 관문과 23개 통나무 울타리 충돌체(`wallColliders`).
- **외곽 야생 초원 (`r = 29.5`, `meadow_tile.png`)**:
  - 외곽 나무 54그루(`fairy_tree_1~3`), 발광 버섯 36개(`glow_mushroom_1~2`), 채집 노드 **28개**(별빛 수정 14 / 무지개 열매 14), 정찰 슬라임 **12마리**(`r >= 10.6` 유지).

---

## 4. 에셋 목록 요약 (총 35종, 512×512 PNG)

- **Characters (`assets/characters/`)**: `wizard_idle`, `wizard_run`, `wizard_swing`, `fairy_worker`, `customer_1~4`, `slime_normal`, `slime_king` (10종)
- **Buildings (`assets/buildings/`)**: `cauldron_station`, `sales_stall`, `gem_pedestal`, `harvester_cart`, `arch_gate`, `fence_segment` (6종)
- **Environment (`assets/environment/`)**: `fairy_tree_1~3`, `glow_mushroom_1~2`, `crystal_node`, `berry_node`, `meadow_tile`, `timber_plank_tile` (9종)
- **Items (`assets/items/`)**: `brick_crystal`, `brick_berry`, `brick_jelly`, `brick_potion`, `hex_mana_gem` (5종)
- **UI / FX (`assets/ui/`)**: `guide_arrow`, `slash_arc`, `gem_icon`, `potion_icon`, `crystal_icon` (5종)

세부 경로, 해상도, 피벗 앵커(`anchor`), 월드 스케일(`worldSize`)은 [asset_manifest.json](file:///d:/이광복의%20딥러닝%20공부/Ochestrator%20test/assets/asset_manifest.json)을 기준으로 단일 관리한다.
