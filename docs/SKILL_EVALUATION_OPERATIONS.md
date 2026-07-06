# 스킬 평가 워크벤치 운영 가이드

`/evaluation/skills`는 사전 지정된 평가자가 로그인 후 스킬을 한 건씩
중요도(1~5점)와 라벨로 평가하는 전용 페이지입니다. 도메인 평가(`/evaluation`)와
분리되어 있으며, 평가자 신원은 로그인 세션에서 자동 적용되고 평가 결과는
서버에 아카이빙됩니다.

## 구성 요소

| 영역 | 파일 |
| --- | --- |
| 전용 페이지 | `app/evaluation/skills/page.tsx` |
| 로그인 UI | `app/components/EvaluatorLogin.tsx` |
| 평가 워크벤치 UI | `app/components/SkillEvaluationWorkbench.tsx` |
| 평가자 명부 | `public/data/evaluators.json` |
| 명부 로더/검증 | `app/lib/evaluator-data.ts` |
| 세션(서명 쿠키) | `app/lib/session.ts` |
| 로그인/로그아웃 API | `app/api/auth/login`, `app/api/auth/logout` |
| 평가 저장/조회 API | `app/api/skill-evaluations` |
| 저장소 어댑터 | `app/lib/evaluation-store.ts` |
| 공용 상수(점수/라벨) | `app/lib/evaluation-constants.ts` |

## 인증 모델 (경량 명부 + 접속 코드)

- 평가자는 `public/data/evaluators.json` 명부에 사전 등록됩니다.
- 접속 코드 평문은 저장하지 않고 `codeHash = sha256("{id}:{접속코드}")`만 보관합니다.
- 로그인 성공 시 HMAC 서명 쿠키(`rsf_evaluator`, httpOnly, 8시간)가 발급됩니다.
- 평가 저장 시 **평가자 신원은 세션에서만** 가져오므로 클라이언트가 위조할 수
  없습니다. 클라이언트는 `skillId / score / labels / notes`만 전송하며, 서버가
  `skillId` 존재 여부와 도메인을 다시 확정합니다.

### 환경 변수

| 변수 | 용도 | 비고 |
| --- | --- | --- |
| `EVAL_SESSION_SECRET` | 세션 쿠키 서명 키 | **운영 필수.** 미설정 시 개발용 기본값 사용(비보안) |
| `POSTGRES_URL` | 관리형 DB 연결 | 설정 시 DB 저장소, 미설정 시 파일 폴백 |
| `EVAL_DATA_DIR` | 파일 폴백 장부 위치 | 기본 `.data`(gitignore) |

## 평가자 명부 관리

새 평가자를 추가하려면 접속 코드의 해시를 만들어 명부에 넣습니다.

```bash
npm run generate:evaluator-code-hash -- --id EVAL-005 --code "배정코드"
```

출력된 `codeHash`를 `public/data/evaluators.json`에 추가합니다.

```json
{
  "id": "EVAL-005",
  "name": "홍길동",
  "department": "스마트팩토리추진팀",
  "collegeId": "physical-ai",
  "active": true,
  "codeHash": "<위에서 출력된 값>"
}
```

`active: false`로 두면 로그인과 명부 노출에서 제외됩니다.

### 데모용 샘플 접속 코드

샘플 명부의 접속 코드는 데모 목적이며, 운영 전환 시 반드시 교체하십시오.

| 평가자 | 접속 코드 |
| --- | --- |
| EVAL-001 김현장 | `robot01` |
| EVAL-002 이판단 | `robot02` |
| EVAL-003 박트윈 | `robot03` |
| EVAL-004 최데이터 | `robot04` |
| EVAL-101 김대환 (Physical AI 위원) | `expert01` |
| EVAL-102 박석우 (Physical AI 책임) | `expert02` |
| EVAL-103 변재민 (Agentic AI 위원) | `expert03` |
| EVAL-104 고민석 (Digital Twin 팀장) | `expert04` |
| EVAL-105 서우진 (Data Intelligence 팀장) | `expert05` |

내부전문가(EVAL-101~105)는 4대 도메인 재분류 검수를 담당합니다. 검수 절차는
`docs/DOMAIN_RECLASSIFICATION_PLAN.md` 8절(Phase 4)을 따릅니다.

## 라벨 데이터 아카이빙

평가 1건은 다음 스키마로 저장됩니다.

```json
{
  "id": "uuid",
  "skillId": "RSF-IRC-001",
  "domain": "industrial-robot-control",
  "evaluatorId": "EVAL-001",
  "evaluatorName": "김현장",
  "evaluatorCollege": "physical-ai",
  "score": 4,
  "labels": ["현장필수", "교육필요"],
  "notes": "...",
  "createdAt": "ISO-8601",
  "appVersion": "2026-06-22"
}
```

선택 가능한 라벨은 `app/lib/evaluation-constants.ts`의 `EVALUATION_LABELS`에서
관리합니다(현장필수 / 교육필요 / 재정의대상 / 중복의심 / 신규제안).

### 저장소

- **운영(권장): 관리형 DB.** `POSTGRES_URL` 설정 시 `@vercel/postgres`로
  `skill_evaluation_labels` 테이블에 저장합니다. 테이블/인덱스는 첫 요청 시
  자동 생성됩니다(아래 스키마 참고). 동시 평가·실시간 누적·집계 쿼리에 적합합니다.
- **개발/폴백: 파일 장부.** `POSTGRES_URL` 미설정 시 `.data/skill-evaluations.json`에
  누적합니다(서버리스 환경에서는 영속되지 않으므로 운영에는 부적합).

```sql
CREATE TABLE IF NOT EXISTS skill_evaluation_labels (
  id UUID PRIMARY KEY,
  skill_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  evaluator_id TEXT NOT NULL,
  evaluator_name TEXT NOT NULL,
  evaluator_college TEXT NOT NULL,
  score SMALLINT NOT NULL,
  labels TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  app_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_skill_eval_skill
  ON skill_evaluation_labels (skill_id);
```

## 도메인 변경요청 (`/evaluation`)

도메인 분류 평가 페이지의 각 도메인 카드에서 "하위 스킬 조회"를 열면 스킬
목록이 나오고, 로그인한 평가자는 스킬별로 **도메인 변경요청**을 접수할 수
있습니다. 조회는 로그인 없이 가능하고, 변경요청 접수만 로그인이 필요합니다.

- 변경 대상 축은 두 가지입니다: **기능 도메인**(스킬의 `domain`) 또는
  **4대 도메인**(칼리지 배정).
- 현재 값은 서버가 확정하고, 요청 값은 축별 화이트리스트로 검증합니다.
  현재와 동일한 도메인 요청은 거부됩니다. 변경 사유는 필수입니다.
- 요청자 신원은 로그인 세션에서 자동 적용됩니다.
- 요청은 즉시 데이터에 반영되지 않고 `pending` 상태로 아카이빙됩니다
  (API: `/api/domain-change-requests`, 저장소: DB `domain_change_requests`
  테이블 또는 파일 폴백 `.data/domain-change-requests.json`).
- 반영 절차: 4대 도메인 요청은 검수 후 `npm run record:college-override`로
  확정하고, 기능 도메인 요청은 생성기
  (`scripts/generate-robot-smartfactory-data.py`) 정의 이동으로 반영합니다.

```sql
CREATE TABLE IF NOT EXISTS domain_change_requests (
  id UUID PRIMARY KEY,
  skill_id TEXT NOT NULL,
  axis TEXT NOT NULL,
  current_value TEXT NOT NULL,
  requested_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  evaluator_id TEXT NOT NULL,
  evaluator_name TEXT NOT NULL,
  evaluator_college TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  app_version TEXT NOT NULL
);
```

## 직접 확인 절차

```bash
npm install
npm run build
EVAL_SESSION_SECRET=test npm run start
```

1. `http://localhost:3000/evaluation/skills` 접속 → 로그인 화면 표시.
2. EVAL-001 / `robot01`로 로그인 → 워크벤치 진입, 우상단에 신원·진행률 표시.
3. 4대 도메인 필터가 평가자 소속 칼리지로 기본 적용되는지 확인. 기능
   도메인/역할/검색 필터로 스킬을 추리고 "내 미평가만" 토글로 남은 작업 확인.
4. 스킬 선택 → 중요도/라벨/근거 입력 → 저장 시 다음 미평가 스킬로 자동 이동.
5. 로그아웃 후 평가 API가 401을 반환하는지 확인.

## 운영 전환 체크리스트

- [ ] `EVAL_SESSION_SECRET`를 강력한 임의 값으로 설정
- [ ] `POSTGRES_URL` 설정(관리형 DB 연결)
- [ ] 샘플 평가자/코드 교체, 실제 명부 등록
- [ ] (선택) 아카이빙 데이터를 검수 장부(`review-decisions`)와 연계하는 export 설계
