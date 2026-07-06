# Factory Robotics 도메인 → 4대 도메인(칼리지) 재분류 설계안

조직 운영 체계가 4개 도메인으로 확정됨에 따라(Physical AI & Robotics /
Agentic AI Manufacturing / Digital Twin & Simulation / Data Intelligence Hub,
총 30명), 기존 Factory Robotics 온톨로지의 6개 기능 도메인 127개 스킬을
4대 도메인 체계로 재분류하는 설계안입니다.

## 1. 현황 진단

- 4대 도메인 체계는 이미 `public/data/college-mapping.json`의 `colleges`로
  존재합니다(`physical-ai`, `agentic-ai`, `digital-twin`, `data-intelligence`
  — Data Intelligence는 `isHub: true`).
- 그러나 현행 매핑(`domainMapping`)은 **도메인 단위**여서, 6개 기능 도메인 중
  5개(산업용 로봇 제어, 머신비전·센서, 협동로봇, AMR, 유지보수·진단)가 통째로
  `physical-ai`에 배정됩니다. 결과적으로 127개 스킬 중 106개(83%)가
  Physical AI에 몰리고, **Agentic AI와 Data Intelligence의 primary 스킬은
  0건**입니다. 8명이 배정된 Agentic AI 도메인이 담당할 스킬이 없는 구조로,
  조직 체계와 온톨로지가 어긋나 있습니다.

## 2. 설계 대안 비교

| 대안 | 내용 | 평가 |
| --- | --- | --- |
| A. 도메인 단위 재매핑 | 현행 `domainMapping`의 primary만 조정 | 작업 최소. 그러나 6개 기능 도메인이 4대 도메인과 1:1로 안 떨어져(예: 머신비전 도메인 안에 광학 하드웨어와 비전 알고리즘이 공존) 쏠림이 해소되지 않음 |
| B. 온톨로지 자체를 4도메인으로 개편 | `skill_id`/URN을 4도메인 기준으로 재발급 | 구조는 깔끔하나 URN 안정성 파괴. `related_skills` 관계망, 검수 장부(`review-decisions`), 조직 매핑, 이미 아카이빙된 평가 라벨(`domain` 필드)이 전부 깨져 마이그레이션 비용·리스크 과다 |
| **C. 2계층 + 스킬 단위 오버라이드 (권장)** | 6개 기능 도메인은 "스킬 내용 분류"로 유지하고, 4대 도메인을 "운영·거버넌스 계층"으로 스킬마다 primary/secondary 배정. 기본값은 도메인 매핑, 예외는 스킬 단위 오버라이드 표로 관리 | 기존 식별자·관계망·장부 전부 무변경. 재분류는 데이터 1개 파일로 관리되어 전문가 검수·롤백 용이. 기존 `collegeId`/`levelTier` 필드(`RobotSkill`에 이미 optional로 예약됨)를 그대로 활용 |

**C안을 권장합니다.** 이미지의 4대 도메인은 "사람·조직·인증" 축이고, 기존
6도메인은 "스킬 내용" 축이므로 두 축을 모두 보존하는 것이 정보 손실이 없습니다.

## 3. 분류 기준 (rubric)

스킬의 **작업 대상과 산출물**을 기준으로 primary를 1개 배정하고, 상호 의존이
뚜렷한 경우 secondary를 부여합니다.

| 대상 도메인 | 배정 기준 | 예시 |
| --- | --- | --- |
| Physical AI & Robotics | 물리 로봇·하드웨어가 대상: 제어, 티칭, 안전, 캘리브레이션 실작업, 주행·도킹, 정비 실무 | 로봇 프로그래밍, 협동로봇 안전 설정, SLAM, 베어링 교체 |
| Agentic AI Manufacturing | 자율 판단·오케스트레이션·품질 판정이 대상: 다중 로봇 관제, 라인 최적화 의사결정, MES 연계, 결함 판정 | 함대 관리, 멀티-로봇 교통 관제, 라인 밸런싱, 결함 검출 |
| Digital Twin & Simulation | 가상 모델·시뮬레이션이 대상: 모델링, 가상 검증, 시나리오·최적화 시뮬레이션 | 시뮬레이션 기반 프로그래밍, 레이아웃 검증, 배치 최적화 |
| Data Intelligence (Hub) | 데이터 자체가 대상: 신호·이미지 처리 알고리즘, 파이프라인, 로깅, 트렌드·예측 분석, KPI, OT 통신 | 센서 신호 처리, 트렌드 분석, 부품 수명 예측, 네트워크 통신 |

경계 판정 규칙:

- 작업 지식의 기록(매뉴얼·작업 문서화)은 해당 현장 도메인에 남기고, **데이터
  기반 성능 보고·지표 분석**만 Data Intelligence로 보냅니다.
- "무엇을 최적화하는가"로 구분: 로봇 모션 최적화 → Physical AI, 생산
  계획·라인 수준 최적화 → Agentic AI, 시뮬레이션 내 최적화 → Digital Twin.
- Hub 특성상 Data Intelligence는 다수 스킬의 secondary로 넓게 걸립니다
  (현행 `domainMapping`의 secondary 설계와 일치).

## 4. 재분류 결과 요약

기본값(도메인 매핑) + 스킬 단위 오버라이드 36건 적용 결과:

| 4대 도메인 | 스킬 수 | 비중 | 기존(도메인 단위) |
| --- | --- | --- | --- |
| Physical AI & Robotics | 74 | 58% | 106 (83%) |
| Data Intelligence (Hub) | 23 | 18% | 0 |
| Digital Twin & Simulation | 21 | 17% | 21 (17%) |
| Agentic AI Manufacturing | 9 | 7% | 0 |
| 합계 | 127 | 100% | 127 |

Physical AI 비중이 높은 것은 온톨로지 자체가 로봇 현장 역량 중심으로 구축된
결과로 자연스럽습니다. 다만 **Agentic AI 9건은 조직 배정(8명) 대비 부족**하며,
이는 재분류가 아니라 온톨로지의 커버리지 갭입니다(6절 참고).

## 5. 스킬 단위 매핑

### 5.1 기본 매핑 (91건, 현행 `domainMapping` 유지)

| 기능 도메인 | primary | 잔여 스킬 수 |
| --- | --- | --- |
| industrial-robot-control | physical-ai | 18 |
| machine-vision-sensor | physical-ai | 9 |
| collaborative-robot | physical-ai | 18 |
| autonomous-mobile-robot | physical-ai | 14 |
| robot-maintenance-diagnostics | physical-ai | 15 |
| digital-twin-simulation | digital-twin | 17 |

### 5.2 스킬 오버라이드 (36건)

#### → Agentic AI Manufacturing (9건)

| 스킬 | 명칭 | secondary | 근거 |
| --- | --- | --- | --- |
| RSF-IRC-020 | 라인 밸런싱 | digital-twin | 라인 수준 생산 최적화 의사결정 |
| RSF-IRC-022 | 생산성 향상 제안 | data-intelligence | 데이터 기반 개선 판단·제안 |
| RSF-MVS-007 | 이미지 기반 결함 검출 | data-intelligence | 품질 자동 판정(도메인 02의 품질관리) |
| RSF-MVS-016 | 검출율 목표 달성 | data-intelligence | 품질 KPI 운영·판정 기준 관리 |
| RSF-AMR-005 | 함대 관리 시스템 | physical-ai | 다중 로봇 오케스트레이션 |
| RSF-AMR-009 | 멀티-로봇 교통 관제 | physical-ai | 자율 관제·조정 판단 |
| RSF-AMR-021 | 확장성 계획 | digital-twin | 함대 확장 의사결정·계획 |
| RSF-RMD-018 | 재고 관리 | data-intelligence | MES/자재 시스템 연계 운영 |
| RSF-DTS-021 | 의사결정 지원 | digital-twin | 시뮬레이션 결과 기반 자율 판단 지원 |

#### → Data Intelligence Hub (23건)

| 스킬 | 명칭 | secondary | 근거 |
| --- | --- | --- | --- |
| RSF-IRC-015 | 에러 로그 분석 | physical-ai | 로그 데이터 분석 |
| RSF-MVS-001 | 디지털 이미지 처리 | — | 데이터 처리 알고리즘 기초 |
| RSF-MVS-003 | 센서 신호 처리 | — | 신호 데이터 처리 |
| RSF-MVS-004 | 컴퓨터 비전 알고리즘 | — | 분석 알고리즘 |
| RSF-MVS-008 | 센서 신호 수집 및 필터링 | physical-ai | 데이터 수집 파이프라인 |
| RSF-MVS-012 | 특징 추출 및 매칭 | — | 데이터 분석 기법 |
| RSF-MVS-013 | 실시간 이미지 처리 | — | 실시간 데이터 처리 |
| RSF-MVS-014 | 멀티 센서 융합 | physical-ai | 이종 데이터 융합 |
| RSF-MVS-019 | 센서 데이터 로깅 | — | 데이터 파이프라인·저장 |
| RSF-MVS-020 | 성능 보고서 작성 | — | 지표 기반 성능 보고 |
| RSF-CRO-017 | 협동 작업 사이클 타임 측정 | physical-ai | 지표 측정·집계 |
| RSF-AMR-004 | 무선 네트워크 및 통신 | — | OT 통신 인프라 |
| RSF-AMR-010 | 함대 성능 모니터링 | agentic-ai | 운영 데이터 모니터링 |
| RSF-AMR-014 | 네트워크 통신 설정 | — | OT 네트워크 구성 |
| RSF-AMR-020 | 성능 지표 분석 | — | KPI 분석 |
| RSF-RMD-006 | 로봇 상태 모니터링 | physical-ai | 상태 데이터 수집·감시 |
| RSF-RMD-007 | 트렌드 분석 | — | 시계열 분석 |
| RSF-RMD-012 | 성능 벤치마크 테스트 | physical-ai | 성능 데이터 측정·비교 |
| RSF-RMD-017 | 부품 수명 예측 | physical-ai | 예측 분석(제조 인텔리전스) |
| RSF-RMD-020 | 성능 지표 개선 | agentic-ai | 지표 기반 개선 분석 |
| RSF-DTS-005 | 실시간 데이터 파이프라인 | digital-twin | 트윈-현장 데이터 파이프라인 |
| RSF-DTS-011 | 성능 데이터 수집 | digital-twin | 시뮬레이션 데이터 수집 |
| RSF-DTS-014 | 결과 분석 및 시각화 | digital-twin | 분석·시각화 |

#### → Digital Twin & Simulation (4건)

| 스킬 | 명칭 | secondary | 근거 |
| --- | --- | --- | --- |
| RSF-IRC-012 | 시뮬레이션 기반 프로그래밍 | physical-ai | 오프라인 프로그래밍(OLP)은 가상 검증 작업 |
| RSF-MVS-010 | 시뮬레이션 비전 파이프라인 | data-intelligence | 가상 환경 비전 검증 |
| RSF-CRO-012 | 협동 작업 시뮬레이션 | physical-ai | 협동 셀 가상 검증 |
| RSF-CRO-021 | 협동 로봇 배치 최적화 | physical-ai | 레이아웃 최적화는 시뮬레이션 기반 |

오버라이드 없는 스킬은 5.1의 기본 매핑을 따릅니다. `levelTier`는 현행 로직
(스킬 `proficiency_level` 우선, 없으면 도메인 `defaultLevelTier`)을 유지합니다.

## 6. 갭 분석 — Agentic AI Manufacturing

이미지의 도메인 02 범위(AI 에이전트 · MES 자율화 · 품질관리) 대비 현행
온톨로지는 로봇 현장 역량 중심이어서 에이전트·MES 스킬이 사실상 없습니다.
재분류로 해결되지 않는 갭이므로 **신규 스킬 증설**을 별도 트랙으로 권장합니다.

신규 스킬 후보(예시, RSF-AAM-* 신규 도메인 또는 기존 도메인 증분):

- AI 에이전트 설계·오케스트레이션 (LLM 기반 공정 에이전트, 도구 호출 설계)
- MES 워크플로 자율화 (작업지시 자동 생성, 이상 시 자동 재계획)
- 생산계획 자동 수립(APS) 및 승인 흐름(Human-in-the-loop) 설계
- SPC 기반 품질관리, 품질 이상 자동 판정·격리
- 에이전트 안전 가드레일·감사 로그 설계

신규 스킬 제안은 기존 절차를 재사용합니다: 스킬 평가 워크벤치의
`신규제안` 라벨로 수집 → 검수 장부(`review-decisions`)로 확정.

## 7. 구현 단계

**Phase 1 — 데이터.** `college-mapping.json`에 `skillOverrides` 블록 추가
(또는 `public/data/college-skill-overrides.json` 분리):

```json
"skillOverrides": {
  "RSF-AMR-005": { "primary": "agentic-ai", "secondary": ["physical-ai"] },
  "RSF-MVS-007": { "primary": "agentic-ai", "secondary": ["data-intelligence"] }
}
```

**Phase 2 — 리졸버.** `resolveSkillCollege()`(`app/lib/college-resolver.ts`)에
스킬 오버라이드 우선 조회를 추가: `skillOverrides[skill_id]` →
`domainMapping[domain]` 순. `validateCollegeMappingData()`에 오버라이드의
스킬 ID 실존·칼리지 실존 검증을 추가하고 `validate:data`에 연결합니다.

**Phase 3 — 데이터 굽기·화면.** 생성 파이프라인에서 각 스킬에
`collegeId`/`secondaryColleges`를 스탬핑(이미 `RobotSkill`에 optional 필드
예약됨). 화면 반영: 도메인/평가 페이지에 4대 도메인 그룹 뷰, 스킬 평가
워크벤치에 칼리지 필터(평가자 명부의 `collegeId`와 연결해 "내 도메인 스킬"
기본 큐 제공), 통계에 칼리지별 분포 추가.

**Phase 4 — 전문가 검수·확정.** 이 문서의 36건 오버라이드는 초안입니다.
이미지의 내부전문가(도메인별 위원·팀장)를 평가자 명부(`evaluators.json`)에
칼리지별로 등록하고, 워크벤치의 `재정의대상` 라벨로 이견을 수집한 뒤 검수
장부로 확정합니다. 확정 전까지 오버라이드에는 `source: "proposed"`,
확정 후 `"reviewed"`를 표기해 온톨로지의 기존 검수 관행과 통일합니다.

## 8. 진행 현황

- [x] **Phase 1 완료.** `college-mapping.json`에 `skillOverrides` 36건을
  `source: "proposed"`로 추가했고, 6절의 갭 해소를 위해 신규 기능 도메인
  `agentic-ai-manufacturing`(RSF-AAM-001~021, Knowledge 5 / Skill 9 /
  Competence 7)을 생성 파이프라인에 증설했습니다. 신규 도메인의 primary는
  `agentic-ai`입니다. 반영 후 primary 분포:
  **Physical AI 74 / Agentic AI 30 / Data Intelligence 23 / Digital Twin 21
  (총 148개 스킬)**.
- [x] **Phase 2 완료.** `resolveSkillCollege()`가 `skillOverrides`를 우선
  조회하도록 확장했고(칼리지 배정만 대체, levelTier 규칙은 유지),
  `validateCollegeMappingData()`에 오버라이드 무결성 검증(스킬 실존·칼리지
  실존·primary/secondary 중복·source 화이트리스트)을 추가해 `validate:data`
  strict에 연결했습니다. 스크립트는 `scripts/lib/college-resolver-loader.js`로
  TS 리졸버를 단일 진실 원천으로 재사용합니다.
- [x] **Phase 3 완료.** 스킬의 칼리지는 데이터 스탬핑 대신 서버 사이드에서
  리졸버로 계산해 노출합니다(이중 관리 방지). 스킬 상세 페이지에 칼리지
  배지·연계 칼리지·재분류 상태(제안/확정), `/evaluation`에 4대 도메인 분포
  카드, 스킬 평가 워크벤치에 4대 도메인 필터(평가자 소속 칼리지가 기본
  큐)를 추가했습니다.
- [x] **Phase 4 준비 완료 — 검수 실행은 내부전문가 몫.** 검수 인프라를
  구축했고, 오버라이드 36건은 전문가 결정이 기록될 때까지 `proposed`로
  유지됩니다.
  - 내부전문가 5인을 평가자 명부에 등록: EVAL-101 김대환·EVAL-102 박석우
    (Physical AI), EVAL-103 변재민(Agentic AI), EVAL-104 고민석(Digital
    Twin), EVAL-105 서우진(Data Intelligence). 데모 접속 코드는
    `docs/SKILL_EVALUATION_OPERATIONS.md` 참고(운영 전환 시 교체).
  - 결정 기록 도구: 결정은 JSON 직접 편집 없이 다음 명령으로 기록하며,
    `public/data/college-override-decisions.json` 장부에 검수자·시각·제안
    스냅샷과 함께 남습니다.

    ```bash
    npm run record:college-override -- \
      --skill-id RSF-MVS-007 \
      --status approved \
      --reviewer "변재민" \
      --notes "품질 자동 판정은 Agentic AI 소관"
    ```

    `approved`는 오버라이드를 `reviewed`로 승격, `rejected`는 오버라이드를
    제거해 도메인 기본 매핑으로 복귀, `held`는 `proposed`를 유지합니다.
    상태 전이는 `npm run test:college-override`로 검증됩니다.
  - 검수 흐름: ① 전문가가 워크벤치(`/evaluation/skills`)에서 자기 칼리지
    스킬을 평가하며 `재정의대상` 라벨로 이견 표시 → ② 재분류 협의 →
    ③ `record:college-override`로 스킬별 결정 기록 → ④ `npm run
    validate:data`로 무결성 확인(proposed/reviewed 잔량이 리포트에 집계됨).

## 9. 영향도·비변경 사항

- `skill_id`, `urn:rsf:skill:*`, `related_skills`, 검수 장부, 조직 매핑,
  아카이빙된 평가 라벨은 **전혀 변경되지 않습니다** (2계층 설계).
- 기존 6도메인 화면·필터는 그대로 동작하며, 4대 도메인 뷰가 추가됩니다.
- `domainMapping`은 기본값 역할로 유지되므로 오버라이드 파일만 롤백하면
  현행 동작으로 복귀합니다.
