# Factory Robotics Skill Map

스마트팩토리 로보틱스 현장 역량에 집중한 독립 프로젝트입니다.

## 포함 범위

- 산업용 로봇 제어
- 머신비전 및 센서 통합
- 협동로봇 운용
- 자율이동로봇
- 로봇 유지보수 및 진단
- 디지털트윈 및 시뮬레이션
- Agentic AI 제조 (AI 에이전트 · MES 자율화 · 품질 자동 판정)

## 실행

```bash
npm install
npm run type-check
npm run test:ontology
npm run test:organization
npm run test:review-queue
npm run test:review-decisions
npm run test:skill-detail
npm run test:development
npm run test:development-update
npm run validate:review-decisions
npm run validate:data
npm run validate:development
npm run test:data
npm run build
npm run dev
```

## 데이터 갱신

```bash
npm run generate:data
npm run generate:raw
npm run enrich:organization
npm run generate:review-queue
npm run apply:review-decisions
npm run validate:data
```

`public/data/robot-smartfactory.json`이 화면에서 사용하는 기준 데이터입니다.
개별 스킬 JSON은 `npm run generate:raw`로 다시 생성합니다.

## 온톨로지 무결성

`npm run validate:data`는 관계망과 출처를 strict 모드로 검증합니다. 빈 관계망,
존재하지 않는 참조, 부모 순환, 가짜 ESCO URI가 들어오면 실패합니다.

현재 로보틱스 스킬은 내부 식별자 `urn:rsf:skill:*`를 사용합니다. 실제 ESCO
자원으로 확인된 항목만 `esco_uri`를 채웁니다.

현재 `related_skills` 관계는 생성기 휴리스틱으로 만든 후보이며 `source:
"heuristic"`으로 표시됩니다. 도메인 전문가 검수 후 확정된 관계만 `reviewed`로
승격합니다.

조직 카탈로그는 별도 내부 식별자 `urn:rsf:org-skill:*`를 유지합니다.
`npm run enrich:organization`은 의미가 충분히 겹치는 항목만 기준 온톨로지에
연결하며, 조직 고유 역량은 `ontology_skill_id: null`로 보존합니다.

`npm run generate:review-queue`는 조직의 근사 매핑과 휴리스틱 온톨로지 관계를
`public/data/review-queue.json`으로 모읍니다. 대칭 관계는 한 번만 보여주며,
`/reviews` 화면에서 현장 전문가가 우선순위에 따라 검수할 수 있습니다.

검수 결과는 `public/data/review-decisions.json`에 기록합니다. 상태는
`approved`, `held`, `rejected` 중 하나이며 검수자와 검수 시각을 함께
남깁니다. `npm run apply:review-decisions`는 결정 장부를 검증한 뒤 승인된
관계만 `reviewed`로 승격하고, 조직 근사 매핑에는 승인 상태를 기록합니다.
보류와 반려는 후보 원본을 바꾸지 않습니다.

검수 결과는 JSON을 직접 편집하지 않고 다음처럼 기록할 수 있습니다.

```bash
npm run record:review-decision -- \
  --item-id organization_mapping:robot_solution:RS_010 \
  --status held \
  --reviewer "현장 전문가" \
  --notes "매개변수 관리 범위 재확인 필요"
```

각 기준 스킬은 `/skills/[skillId]` 상세 페이지에서 정의, 스마트팩토리 적용
맥락, 숙련도, 역할, 상위 스킬, 관련 스킬을 확인할 수 있습니다.

## 4대 도메인(칼리지) 재분류

기능 도메인과 별개로 모든 스킬은 4대 운영 도메인(Physical AI / Agentic AI /
Digital Twin / Data Intelligence)에 배정됩니다. 기본값은 도메인 매핑이고,
예외는 `public/data/college-mapping.json`의 `skillOverrides`로 관리합니다.
오버라이드 검수 결정은 다음 명령으로 기록합니다(장부:
`public/data/college-override-decisions.json`).

```bash
npm run record:college-override -- \
  --skill-id RSF-MVS-007 \
  --status approved \
  --reviewer "변재민"
```

설계와 검수 절차는 `docs/DOMAIN_RECLASSIFICATION_PLAN.md`를 따릅니다.

## 스킬 평가 워크벤치

`/evaluation`은 **4대 도메인 중요도 평가 전용** 화면입니다. 카드마다
중간분류 단위로 하위 스킬을 조회하고 스킬별 도메인 변경요청을 접수할 수
있습니다. 기능 도메인 평가는 서브 페이지(`/evaluation/functional`)에서
진행하며, 그 스킬 수 가중 평균이 4대 도메인 카드의 참고치(서브 롤업)로
표시됩니다. 평가는 로그인 신원으로 서버에 아카이빙됩니다.
`/evaluation/skills`는 스킬 단위 평가 전용 화면입니다.

도메인 탐색도 4대 도메인 중심입니다: `/domains`(4대 허브) →
`/domains/college/[collegeId]`(중간분류 섹션별 스킬). 기능 도메인은 세부
기준(참고 분류)으로 `/domains/functional`에서 유지됩니다. 중간분류 정의와
스킬 배정은 `public/data/college-subcategories.json`에서 관리하고
`npm run validate:data`가 배정 무결성을 검증합니다. 스킬 평가 워크벤치는 사전 지정 평가자 명부(`public/data/evaluators.json`)
로그인으로 신원을 자동 적용하고(수기 입력 제거), 4대 도메인(칼리지)·기능
도메인·역할 필터와 "내 미평가만" 큐로 스킬을 한 건씩 중요도(1~5점)·라벨로
평가합니다. 4대 도메인 필터는 평가자 소속 칼리지가 기본값입니다. 평가 라벨은 서버에
아카이빙되며 운영은 관리형 DB(`POSTGRES_URL`), 로컬은 파일 폴백을 사용합니다.

운영·명부 관리·환경 변수·DB 스키마는 `docs/SKILL_EVALUATION_OPERATIONS.md`를
따릅니다. 새 평가자 접속 코드 해시는 다음으로 생성합니다.

```bash
npm run generate:evaluator-code-hash -- --id EVAL-005 --code "배정코드"
```

## 기술 전문가 육성 트랙

`/development-tracks`는 잠재 후보군부터 `Lv3 Tech Leader` 인증까지 이어지는
단계형 육성 퍼널을 보여줍니다. 전문 영역, 5개 직능 역량, 후보자별 스킬 갭,
`1人1案` 현장 임팩트 과제를 함께 확인할 수 있습니다.

MVP 후보자는 익명 샘플 데이터입니다. 실제 인사정보를 연결하기 전 운영 원칙과
개인정보 경계는 `docs/DEVELOPMENT_TRACK_OPERATIONS.md`를 따릅니다.

후보자 단계 상태는 JSON을 직접 편집하지 않고 다음 명령으로 갱신합니다.

```bash
npm run update:development-candidate -- \
  --candidate-id CAND-001 \
  --stage pair_embed \
  --status completed \
  --reviewer "육성위원회"
```
