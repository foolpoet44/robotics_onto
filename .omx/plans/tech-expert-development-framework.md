# 스마트팩토리 기술 전문가 육성 프레임워크 반영 계획

## 1. 목표

현재 프로젝트는 로보틱스 스킬 온톨로지, 조직별 필요 역량, 전문가 검수 큐를 제공한다.
다음 단계에서는 이를 사람의 성장 여정과 연결한다.

이미지의 핵심은 교육 과정 목록이 아니라 **선발 → 통합 학습 → 현장 동료 과제 →
개인 과제 → 인증**으로 이어지는 단계형 육성 퍼널이다. 프로젝트에서는 각 후보자가
어떤 전문 영역을 목표로 하고, 어느 단계에 있으며, 다음 단계로 가기 위해 어떤 스킬과
현장 결과물이 필요한지 추적할 수 있어야 한다.

## 2. 이미지에서 가져올 핵심 구조

| 구간     | 이미지의 의미                             | 프로젝트 반영 명칭   | 기본 정원 예시 |
| -------- | ----------------------------------------- | -------------------- | -------------: |
| 진입     | 사내 기술 직무 잠재 후보군                | 잠재 후보군          |          1000+ |
| Stage 01 | 잠재력·적성 평가                          | 조기 선발            |             50 |
| Stage 02 | 통합 PoC 시연 통과                        | 통합 부트캠프        |             45 |
| Stage 03 | Production 솔루션 1건                     | 페어 임베드          |             38 |
| Stage 04 | 단독 과제 해결                            | 솔로 임베드          |             32 |
| Stage 05 | 스마트팩토리 솔루션 사업을 이끌 인증 인재 | Lv3 Tech Leader 인증 |             30 |

이미지의 수치는 데이터로 설정 가능하게 만든다. 특정 연도나 조직에 고정된 상수가
아니라 트랙별 목표값이다.

## 3. 개념 모델

### 3.1 기존 데이터와 새 데이터의 관계

기존 `RobotSkill` 127개와 6개 로보틱스 도메인은 지식 지도를 담당한다. 새 육성 모델은
이 지도를 사람의 성장 여정에 연결하는 항해 기록이다. 둘은 합치지 않는다.

- **기술 도메인**: 현재 유지. 예: 자율이동로봇, 머신비전, 디지털트윈.
- **전문 영역 프로필**: 신규. 여러 기술 도메인과 핵심 스킬을 묶는 육성 목표.
- **직능 역량 축**: 신규. 이미지의 `5역량 IT직능 프로파일`을 표현하는 별도 평가 축.
- **현장 임팩트 과제**: 신규. 이미지의 `1人1案`을 후보자별 결과물로 기록.
- **육성 단계**: 신규. 후보자의 현재 위치와 단계 이동 이력을 기록.

이렇게 분리하는 이유는 한 명의 전문가가 머신비전과 로봇 제어를 함께 다룰 수 있고,
반대로 같은 도메인 안에서도 솔루션 설계형과 운영 최적화형의 육성 목표가 다를 수 있기
때문이다.

### 3.2 신규 타입 초안

`app/lib/development-data.ts`에 아래 계약을 둔다.

```ts
export type DevelopmentStageId =
  | "potential_pool"
  | "early_selection"
  | "integrated_bootcamp"
  | "pair_embed"
  | "solo_embed"
  | "lv3_certification";

export interface ExpertAreaProfile {
  id: string;
  name: string;
  description: string;
  domain_keys: string[];
  core_skill_ids: string[];
  target_proficiency_level: 1 | 2 | 3 | 4;
}

export interface CompetencyAxis {
  id: string;
  name: string;
  description: string;
  scale_max: number;
}

export interface DevelopmentStage {
  id: DevelopmentStageId;
  order: number;
  name: string;
  description: string;
  target_headcount: number;
  completion_evidence: string[];
  required_skill_ids: string[];
}

export interface DevelopmentTrack {
  id: string;
  name: string;
  cohort: string;
  organization_id: string;
  expert_area_profiles: ExpertAreaProfile[];
  competency_axes: CompetencyAxis[];
  stages: DevelopmentStage[];
}

export interface CandidateDevelopmentRecord {
  candidate_id: string;
  display_name: string;
  track_id: string;
  expert_area_profile_id: string;
  current_stage_id: DevelopmentStageId;
  stage_history: Array<{
    stage_id: DevelopmentStageId;
    status: "pending" | "in_progress" | "completed" | "held";
    assessed_at?: string;
    reviewer?: string;
    notes?: string;
  }>;
  skill_assessments: Array<{
    skill_id: string;
    current_level: 1 | 2 | 3 | 4;
    target_level: 1 | 2 | 3 | 4;
  }>;
  competency_assessments: Array<{
    axis_id: string;
    score: number;
  }>;
  impact_proposal?: {
    title: string;
    problem: string;
    expected_impact: string;
    status: "draft" | "approved" | "delivered";
  };
}
```

## 4. MVP 범위

첫 구현은 HR 운영자가 구조를 검증할 수 있는 **읽기 중심 프로토타입**으로 제한한다.
로그인, 개인정보 권한, 실제 평가 승인 워크플로는 후속 단계로 둔다.

MVP에서 반드시 보여줄 화면은 두 개다.

### 4.1 `/development-tracks`

트랙 전체를 한눈에 보는 대시보드다.

- 이미지와 유사한 퍼널 시각화
- 단계별 목표 인원과 현재 인원
- 단계별 이탈 또는 보류 인원
- 전문 영역별 후보자 분포
- `5역량` 평균 프로필 요약
- 후보자 목록과 현재 단계 필터

### 4.2 `/development-tracks/[trackId]/candidates/[candidateId]`

후보자 한 명의 육성 카드를 보여준다.

- 현재 단계와 단계 이력
- 목표 전문 영역
- 핵심 스킬별 현재 수준과 목표 수준의 차이
- 5개 직능 역량 레이더 또는 막대형 요약
- `1人1案` 현장 임팩트 과제
- 다음 단계 진입 조건과 아직 충족하지 못한 증빙

레이더 차트는 MVP에서 외부 차트 라이브러리를 추가하지 않는다. 먼저 CSS 막대형 요약으로
구현하고, 실제 사용성이 확인된 뒤 시각화를 확장한다.

## 5. 구현 파동과 슬라이스

### Wave 1. 데이터 계약과 검증

#### Slice 1-1. 육성 프레임워크 데이터 계약

- **수정 파일**:
  - 신규 `app/lib/development-data.ts`
  - 신규 `public/data/development-tracks/smartfactory-tech-leader.json`
  - 신규 `public/data/development-candidates/sample-candidates.json`
- **해야 할 일**:
  - 이미지의 6단계 퍼널을 JSON으로 정의한다.
  - 전문 영역 프로필은 현재 6개 도메인을 조합할 수 있게 만든다.
  - 5개 직능 역량 축은 초기 샘플 데이터로 정의한다.
  - 후보자 데이터는 익명 샘플 ID로 시작한다.
- **검증**:
  - JSON 파싱 성공
  - 모든 `domain_keys`가 `ROBOT_DOMAINS`에 존재
  - 모든 `core_skill_ids`, `required_skill_ids`가 기준 온톨로지에 존재
- **종료 조건**:
  - 트랙, 후보자, 스킬 간 dangling 참조가 0개다.

#### Slice 1-2. 검증 자동화

- **수정 파일**:
  - 신규 `scripts/lib/development-validation.js`
  - 신규 `scripts/test-development-validation.js`
  - 신규 `scripts/validate-development-data.js`
  - 수정 `package.json`
  - 수정 `.github/workflows/ci.yml`
- **해야 할 일**:
  - 단계 순서 중복, 목표 인원 역전, 알 수 없는 전문 영역, 잘못된 스킬 참조를 거부한다.
  - 후보자의 현재 단계가 이력과 모순되면 실패한다.
  - 평가 점수가 허용 범위를 벗어나면 실패한다.
- **검증**:
  - `npm run test:development`
  - `npm run validate:development`
- **종료 조건**:
  - 정상 fixture는 통과하고, 오류 fixture는 각각 실패한다.

### Wave 2. 서버 로더와 대시보드

#### Slice 2-1. 서버 데이터 로더

- **수정 파일**:
  - 수정 `app/lib/server-data.ts`
- **해야 할 일**:
  - `getDevelopmentTrack(trackId)`
  - `getDevelopmentTrackIds()`
  - `getDevelopmentCandidates(trackId)`
  - `getDevelopmentCandidate(trackId, candidateId)`
  - 허용 목록 기반 파일 접근으로 경로 순회를 차단한다.
- **검증**:
  - `npm run type-check`
- **종료 조건**:
  - 페이지가 JSON 파일 경로를 직접 알지 않고 서버 로더만 사용한다.

#### Slice 2-2. 퍼널 대시보드

- **수정 파일**:
  - 신규 `app/development-tracks/page.tsx`
  - 신규 `app/development-tracks/page.module.css`
  - 신규 `app/components/DevelopmentTrackDashboard.tsx`
  - 신규 `app/components/DevelopmentTrackDashboard.module.css`
  - 수정 `app/components/Navigation.tsx`
- **해야 할 일**:
  - 퍼널, 단계별 인원, 전문 영역 분포, 후보자 필터를 구현한다.
  - 콘텐츠는 서버에서 렌더하고 필터만 클라이언트 아일랜드로 둔다.
  - 내비게이션에 `육성` 메뉴를 추가한다.
- **검증**:
  - `npm run type-check`
  - `npm run build`
  - 브라우저에서 `/development-tracks` 퍼널과 후보자 필터 확인
- **종료 조건**:
  - JS가 비활성화되어도 퍼널의 핵심 정보가 초기 HTML에 포함된다.

### Wave 3. 후보자 육성 카드

#### Slice 3-1. 개인 상세 화면

- **수정 파일**:
  - 신규 `app/development-tracks/[trackId]/candidates/[candidateId]/page.tsx`
  - 신규 `app/development-tracks/[trackId]/candidates/[candidateId]/page.module.css`
- **해야 할 일**:
  - 단계 이력, 스킬 갭, 직능 역량, 임팩트 과제, 다음 단계 조건을 표시한다.
  - 스킬 ID는 기존 `/skills/[skillId]` 상세로 연결한다.
  - 정적 샘플 데이터이므로 `generateStaticParams`를 추가한다.
- **검증**:
  - `npm run type-check`
  - `npm run build`
  - 브라우저에서 샘플 후보자 상세 링크와 스킬 링크 이동 확인
- **종료 조건**:
  - 후보자의 “현재 위치”, “목표”, “다음 행동”을 한 화면에서 읽을 수 있다.

#### Slice 3-2. 조직 역량과 육성 트랙 연결

- **수정 파일**:
  - 수정 `app/organizations/[orgId]/page.tsx`
  - 필요 시 수정 `app/organizations/[orgId]/page.module.css`
- **해야 할 일**:
  - 조직 상세에 연관 육성 트랙을 노출한다.
  - 조직의 필요 스킬과 트랙의 핵심 스킬이 어떻게 이어지는지 링크로 제공한다.
- **검증**:
  - `npm run type-check`
  - `npm run build`
  - `/organizations/robot-solution`에서 트랙 이동 확인
- **종료 조건**:
  - 조직의 전략적 필요 역량에서 육성 프로그램으로 이동할 수 있다.

### Wave 4. 운영 자동화

#### Slice 4-1. 후보자 데이터 갱신 명령

- **수정 파일**:
  - 신규 `scripts/update-development-candidate.js`
  - 신규 `scripts/test-development-candidate-update.js`
  - 수정 `package.json`
  - 수정 `README.md`
- **해야 할 일**:
  - JSON을 직접 편집하지 않고 단계 상태, 평가 점수, 임팩트 과제 상태를 갱신한다.
  - 예시:

```bash
npm run update:development-candidate -- \
  --candidate-id CAND-001 \
  --stage pair_embed \
  --status completed \
  --reviewer "육성위원회"
```

- **검증**:
  - `npm run test:development-update`
  - `npm run validate:development`
- **종료 조건**:
  - 반복되는 운영 변경을 명령 하나로 안전하게 기록할 수 있다.

#### Slice 4-2. 실제 운영 전환 설계

- **수정 파일**:
  - 신규 `docs/DEVELOPMENT_TRACK_OPERATIONS.md`
- **해야 할 일**:
  - 실제 임직원 데이터를 넣기 전 개인정보, 인증, 권한, 평가 이력 보존 정책을 문서화한다.
  - `localStorage` 기반 전문가 중요도 평가는 팀 공유 저장소로 이동할 대상임을 명시한다.
  - HRIS 또는 사내 DB 연동 경계를 정의한다.
- **검증**:
  - 운영 체크리스트 리뷰
- **종료 조건**:
  - 프로토타입 데이터와 실제 개인정보 데이터의 경계가 명확하다.

## 6. 전체 검증 게이트

각 Wave가 끝날 때 아래 명령을 통과시킨다.

```bash
npm run type-check
npm run test:ontology
npm run test:organization
npm run test:review-queue
npm run test:review-decisions
npm run test:skill-detail
npm run test:development
npm run validate:review-decisions
npm run validate:data
npm run validate:development
npm run test:data
npm run build
```

브라우저 검증은 `/development-tracks`,
`/development-tracks/smartfactory-tech-leader/candidates/CAND-001`,
`/organizations/robot-solution`, `/skills/RSF-AMR-001` 네 화면을 기준으로 한다.

## 7. 명시적으로 뒤로 미룰 것

MVP에서 아래 항목은 구현하지 않는다.

- 실제 사번과 개인정보 저장
- 로그인과 역할별 접근 제어
- 평가 승인 결재
- HRIS 자동 동기화
- 외부 차트 라이브러리
- AI 기반 자동 후보 추천

이 항목들은 샘플 데이터를 사용한 퍼널 구조 검증이 끝난 뒤 도입한다.

## 8. 구현 전 확인할 제품 결정

실행 전 아래 세 가지는 HR 운영 관점에서 확정해야 한다.

1. 이미지의 `4영역`을 어떤 전문 영역 프로필로 정의할지
2. 이미지의 `5역량`을 어떤 직능 역량 축으로 정의할지
3. 단계별 숫자 `50 → 45 → 38 → 32 → 30`을 예시값으로 둘지 실제 목표로 둘지

이 결정은 데이터 파일의 설정값이므로 화면 구조 구현과 분리할 수 있다.
