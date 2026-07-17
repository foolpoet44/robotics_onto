# 지식 스튜어드 에이전트 개발 명세 (Living Ontology Loop)

AI Factory Skill Fab의 스킬·역량·도메인 지식체계를 "살아있는" 상태로 유지하는
에이전트를 Claude Code CLI로 구현하기 위한 개발 문서다. 이 문서 하나로
Claude Code 세션에서 단계별 구현이 가능하도록 명세 수준으로 작성한다.

> 구현 시작 명령 예: `claude` 실행 후
> "docs/STEWARD_AGENT_DEV_PLAN.md 를 읽고 Phase A부터 구현해줘"

---

## 0. 배경과 문제 정의

### 현재 상태 (2026-07 기준)

| 계층 | 상태 |
| --- | --- |
| 스킬 온톨로지 | `public/data/robot-smartfactory.json` 159스킬 — **생성물**. 진실 원천은 `scripts/generate-robot-smartfactory-data.py` (EXTENSION_SKILLS 블록으로 기존 ID 보존) |
| 4대 도메인 | `college-mapping.json` (domainMapping + skillOverrides 39건), 검수 도구 `npm run record:college-override` |
| 중간분류 | `college-subcategories.json` 21종, 159스킬 전수 배정 |
| 역량↔스킬 | `competency-skill-map.json` (mappings 30 + outOfScope 14), 리졸버 `app/lib/competency-skill-resolver.ts` |
| 실시간 시그널 | 평가 라벨(`skill_evaluation_labels`)·도메인 변경요청(`domain_change_requests`)·기능도메인 평가(`domain_importance_ratings`) — Postgres(`POSTGRES_URL`) 또는 파일 폴백(`.data/*.json`) |
| 검증 게이트 | `npm run validate:data`(strict 12항목) + 테스트 15종 + CI(`.github/workflows/ci.yml`) + `npm run build` |
| 발행물 | `generate:curriculum-html`, `generate:domains-html`, `generate:curriculum-review-html` → `public/*.html` |

### 결손 (에이전트가 채울 자리)

시그널(평가·변경요청·미매핑)은 실시간으로 쌓이지만, **온톨로지·매핑에 반영하는
경로가 전부 수동**이다(사람이 시그널을 읽고 스크립트를 직접 실행). 이 고리를
에이전트가 자동화한다 — 단, 머지 게이트는 인간에게 남긴다.

### 설계 결론: 2속도(two-speed) 아키텍처

- **Fast lane (이미 완성)**: 평가·변경요청 → DB → force-dynamic 페이지 즉시 반영.
- **Governed lane (이번 구현)**: 에이전트가 시그널을 감지·분류하고 진실 원천을
  수정하는 **드래프트 PR**을 생성 → 기존 검증 게이트 통과 → 인간 머지 →
  CI/Vercel 배포로 지식 반영.

온톨로지의 무검증 실시간 변이는 ID 안정성·검수 거버넌스를 파괴하므로 채택하지
않는다.

---

## 1. 아키텍처

```
      ┌─ Fast lane (완성) ─────────────────────────────────────┐
      │ 평가 워크벤치/변경요청 → Postgres/.data → 동적 페이지  │
      └───────────────┬────────────────────────────────────────┘
                      │ 시그널
                      ▼
┌─ 지식 스튜어드 에이전트 (Claude Code CLI) ────────────────────┐
│ ① SENSE   scripts/steward/export-signals.js (결정적 수집)     │
│ ② TRIAGE  임계값 기반 분류 — 무엇이 온톨로지 변경감인가        │
│ ③ DRAFT   진실 원천만 수정 (생성기/오버라이드/매핑 JSON)      │
│ ④ VERIFY  validate:data --strict + 테스트 + build             │
│ ⑤ PUBLISH 근거 첨부 드래프트 PR (+ 발행물 재생성)             │
└───────────────┬───────────────────────────────────────────────┘
                ▼
   인간 검수·머지 → CI → Vercel 배포 → 동적 페이지 반영
                       → 정적 발행물 재발행
```

**역할 분담 원칙**: 수집·검증은 결정적 스크립트가, 판단(triage·초안 작성)만
에이전트 지능이 담당한다. 비용·재현성·안전 모두 이 분담에서 나온다.

---

## 2. 불변 원칙 (에이전트 가드레일)

구현되는 모든 스킬·프롬프트·CLAUDE.md에 아래 원칙을 명시한다.

1. **생성물 직접 수정 금지**: `public/data/robot-smartfactory.json`은 절대 직접
   편집하지 않는다. 스킬 추가/변경은 `scripts/generate-robot-smartfactory-data.py`
   (신규는 EXTENSION_SKILLS 블록)를 수정한 뒤 `npm run generate:data`로 재생성.
2. **스킬 ID(URN) 불변**: 기존 스킬의 `skill_id`는 어떤 경우에도 바꾸지 않는다.
   증설은 도메인 시퀀스 말미에만 추가한다.
3. **도메인 재배정은 장부를 통해서만**: 4대 도메인 변경은
   `npm run record:college-override`(검수 장부 기록)로만 수행한다.
   `college-mapping.json`의 skillOverrides를 손으로 편집하지 않는다.
4. **역량 매핑 단일 출처**: 역량 소분류↔스킬은 `competency-skill-map.json`만
   수정한다. 44종(이후 증가분 포함)은 항상 mapped 또는 outOfScope로 100% 결정.
5. **모든 변경은 게이트 통과 후 PR**: `npm run validate:data && npm run build`
   실패 상태로 커밋·푸시하지 않는다. PR은 항상 드래프트로 만들고 머지는
   인간이 한다.
6. **평가 원본 불변**: `employee-competency-assessments.json`과 평가/변경요청
   장부(DB·`.data`)는 읽기 전용 시그널이다. 에이전트가 수정하지 않는다.
7. **근거 없는 제안 금지**: 모든 제안 PR에는 시그널 출처(건수·평가자수·기간)를
   본문에 표기한다. 임계값 미달 시그널은 다이제스트에만 기록한다.

---

## 3. 구현 파일 트리 (전체 조감)

```
robotics_onto/
├─ CLAUDE.md                                  # [A] 스튜어드 헌법 추가
├─ .claude/skills/
│  ├─ steward/SKILL.md                        # [C] /steward 전체 루프
│  ├─ steward-digest/SKILL.md                 # [A] 읽기전용 다이제스트
│  ├─ triage-change-requests/SKILL.md         # [B] 변경요청 → 오버라이드 초안
│  ├─ triage-competency-map/SKILL.md          # [B] unknown 소분류 → 매핑 초안
│  ├─ propose-gap-skills/SKILL.md             # [B] 신규제안 라벨 → 갭스킬 초안
│  └─ refresh-publications/SKILL.md           # [C] 발행물 재생성
├─ scripts/steward/
│  ├─ export-signals.js                       # [A] 시그널 수집기 (결정적)
│  ├─ signal-thresholds.json                  # [A] 임계값 설정
│  └─ test-export-signals.js                  # [A] 수집기 테스트
├─ .data/steward/                             # (gitignore) 시그널 스냅샷 출력
└─ .github/workflows/steward.yml              # [C] cron 헤드리스 실행
```

`[A]`/`[B]`/`[C]`는 아래 Phase 번호다. 순서대로 구현한다.

---

## 4. Phase A — 감각 계층 (읽기 전용, 리스크 없음)

### A-1. `scripts/steward/export-signals.js`

모든 시그널을 하나의 정형 JSON으로 수집하는 결정적 스크립트.
LLM 없이 동작해야 하며, 이 출력이 에이전트의 유일한 시그널 입력이다.

**데이터 소스 (읽기 전용)**

| 소스 | 접근 방법 |
| --- | --- |
| 스킬 평가 라벨 | `POSTGRES_URL` 설정 시 `skill_evaluation_labels` 테이블, 미설정 시 `.data/skill-evaluations.json` (스키마는 `app/lib/evaluation-store.ts` 참조) |
| 도메인 변경요청 | `domain_change_requests` 테이블 또는 `.data/domain-change-requests.json` |
| 기능도메인 평가 | `domain_importance_ratings` 테이블 또는 `.data/domain-importance-ratings.json` |
| 역량↔스킬 매핑 상태 | `public/data/competency-skill-map.json` + `employee-competency-assessments.json` (리졸버 unknown 검출: `scripts/lib/competency-skill-resolver-loader.js` 재사용) |
| 조직 역량 미매핑 | `public/data/organizations/robot-solution.json` (validate:data가 경고하는 미매핑 항목) |
| 오버라이드 검수 상태 | `college-mapping.json` skillOverrides 중 `source: "proposed"` (검수 미완) |

**출력 계약** — `.data/steward/signals.json` (경로는 `--out` 인자로 변경 가능):

```json
{
  "generatedAt": "ISO-8601",
  "source": { "store": "postgres | file" },
  "changeRequests": {
    "pending": [
      { "skillId": "RSF-…", "axis": "college|functional",
        "currentValue": "…", "requestedValue": "…", "reason": "…",
        "evaluatorId": "EVAL-…", "createdAt": "…" }
    ]
  },
  "evaluationFlags": {
    "중복의심": [ { "skillId": "RSF-…", "evaluators": ["EVAL-…"], "count": 3, "notes": ["…"] } ],
    "신규제안": [ … ], "재정의대상": [ … ]
  },
  "competencyMap": {
    "unknownMinors": [ { "minorCategory": "…", "majorCategory": "…", "employeeCount": 2 } ],
    "coverage": { "total": 44, "mapped": 30, "outOfScope": 14 }
  },
  "organizationUnmapped": [ { "name": "…", "org": "robot-solution" } ],
  "pendingOverrideReviews": [ { "skillId": "RSF-…", "proposed": "data-intelligence" } ],
  "summary": { "actionable": 5, "watching": 12 }
}
```

**요구사항**
- 라벨 시그널은 스킬 단위로 집계하고 **평가자 수(distinct evaluatorId)** 를
  포함할 것 — 임계값 판정은 건수가 아니라 평가자 수로 한다.
- `signal-thresholds.json`을 읽어 `summary.actionable`(임계값 도달)과
  `watching`(미달)을 구분해 출력할 것.
- DB 접근 실패 시 파일 폴백으로 자동 전환하고 `source.store`에 명시.
- `npm run steward:signals` 스크립트로 등록.

**`scripts/steward/signal-thresholds.json` 초기값**

```json
{
  "changeRequestPending": 1,
  "duplicateSuspectEvaluators": 3,
  "newSkillProposalEvaluators": 2,
  "redefineEvaluators": 2,
  "unknownMinorImmediate": 1
}
```

### A-2. `.claude/skills/steward-digest/SKILL.md`

읽기 전용 다이제스트 스킬. 프론트매터에 `disable-model-invocation: false`,
`allowed-tools: Bash(npm run steward:signals), Read, Grep, Glob` 수준으로 제한.

**동작 명세**
1. `npm run steward:signals` 실행 후 `.data/steward/signals.json`을 읽는다.
2. 다음 구조의 한국어 다이제스트를 출력한다(파일 저장 없음, 콘솔 보고):
   - 🔴 조치 필요(actionable): 임계값 도달 시그널과 권장 다음 행동
     (어느 [B] 스킬을 실행하면 되는지 명시)
   - 🟡 관찰 중(watching): 임계값 미달 시그널 현황
   - 🟢 무결성: validate:data 요약(실행해서 확인)
3. **어떤 파일도 수정하지 않는다.**

### A-3. CLAUDE.md 추가 조항

`CLAUDE.md`(없으면 생성)에 "지식 스튜어드" 섹션을 추가하고 §2 불변 원칙
7개를 그대로 수록한다. 데이터 흐름 요약(진실 원천 → 생성물 → 발행물)과
"어떤 변경은 어떤 도구로"의 대응표를 포함한다.

### A-4. 테스트 & 수용 기준

- `scripts/steward/test-export-signals.js`: 픽스처(임시 `.data`)로 파일 폴백
  경로 검증 — pending 변경요청 1건·중복의심 3인·unknown 소분류 1건을 넣고
  signals.json의 집계·actionable 판정을 assert. `npm run test:steward` 등록.
- 수용 기준: ① `npm run steward:signals`가 DB 없이(파일 폴백) 성공,
  ② `claude -p "/steward-digest"`가 수정 0건으로 다이제스트 출력,
  ③ 기존 `validate:data`·전체 테스트·`build` 무영향 통과.

---

## 5. Phase B — 제안 계층 (드래프트 PR 생성)

세 개의 독립 스킬. 공통 규약:

- 작업 브랜치: `steward/<topic>-<YYYYMMDD>` 형식으로 새로 생성.
- 커밋 전 필수: `npm run validate:data && npm run test:competency-skill &&
  npm run build` (해당 영역 테스트 추가 실행).
- PR은 **드래프트**로 생성, 본문에 시그널 근거 표(건수·평가자·기간·원문 사유)
  를 포함. 라벨 `steward` 부여(가능한 경우).
- 시그널이 임계값 미달이면 **아무것도 만들지 않고** 그 사실만 보고.

### B-1. `/triage-change-requests` — 변경요청 → 오버라이드 초안

1. signals.json의 `changeRequests.pending`을 읽는다.
2. 각 요청에 대해 스킬 정의(`robot-smartfactory.json`에서 조회)·현행 배정·
   요청 사유를 대조해 **타당성 판단**을 기록한다(수용/보류 권고 + 근거).
3. 수용 권고 건: `npm run record:college-override -- --skill <id>
   --college <requested> --by <검수자ID> --note "<사유 요약>"` 실행.
   (도구의 정확한 인자는 `scripts/record-college-override-decision.js` 헤더를
   읽고 맞출 것. 중간분류 이동이 필요하면 `college-subcategories.json`의
   `skillSubcategories`도 함께 갱신 — validate:data 12·11항목이 정합성을 강제.)
4. 보류 권고 건은 PR 본문의 "보류 목록"에 사유와 함께 기재만 한다.
5. 검증 → 커밋 → 푸시 → 드래프트 PR.

### B-2. `/triage-competency-map` — unknown 소분류 → 매핑 초안

1. `competencyMap.unknownMinors`를 읽는다 (신규 역량평가 임포트 시 발생).
2. 각 소분류에 대해 온톨로지 159스킬에서 후보를 탐색(라벨·설명·도메인 매칭)
   해 `competency-skill-map.json`에 추가한다:
   - 대응 스킬이 있으면 `mappings`(relation: direct|adjacent, note에 근거)
   - 없으면(영업·경영 등) `outOfScope`(majorCategory, reason)
3. `coverage` 카운트 갱신. `npm run test:competency-skill`과 validate:data
   12항목이 전수 커버리지를 강제하므로 통과가 곧 정합성 증명이다.
4. 검증 → 드래프트 PR.

### B-3. `/propose-gap-skills` — 신규제안·재정의 라벨 → 갭스킬 초안

가장 신중해야 하는 스킬. 임계값(평가자 2인+)을 반드시 지킨다.

1. `evaluationFlags.신규제안`(및 `재정의대상`)에서 임계값 도달 건을 추출.
2. 신규 스킬 초안: `scripts/generate-robot-smartfactory-data.py`의
   **EXTENSION_SKILLS 블록 말미**에만 추가한다(기존 ID 완전 보존 — PR #6의
   증설 패턴을 따를 것). 도메인 코드·시퀀스 번호는 기존 규칙(RSF-<CODE>-<NNN>)
   을 따르고, 한/영 라벨·설명·역할·proficiency_level·관계를 온톨로지 스타일로
   작성한다.
3. `npm run generate:data`로 재생성 → **기존 148+α 스킬의 diff가 관계 링
   연결 외에 없음을 git diff로 확인**하고 그 결과를 PR 본문에 기재.
4. 4대 도메인 배정이 domainMapping 기본과 다르면 B-1과 동일하게 오버라이드
   장부로 제안. 중간분류 배정(`skillSubcategories`) 필수.
5. `재정의대상`은 스킬 정의 수정 초안(생성기 내 해당 스킬 블록)으로 처리하되
   ID·URN은 불변.
6. 전체 검증(테스트 15종 + validate + build) → 드래프트 PR.

### B 수용 기준

각 스킬에 대해: 픽스처 시그널로 실행 시 ① 임계값 미달이면 무변경 보고,
② 도달이면 검증 통과 상태의 드래프트 PR 1개 생성, ③ PR 본문에 근거 표 존재.

---

## 6. Phase C — 순환 계층 (자동화·상시화)

### C-1. `/steward` 오케스트레이터 스킬

전체 루프를 한 번에: `steward:signals` 실행 → actionable 시그널별로 B-1/B-2/B-3
스킬을 순차 위임 → 결과(생성된 PR 목록 + 보류 목록)를 종합 보고.
동일 주제의 열린 steward PR이 이미 있으면 새 PR을 만들지 않고 해당 브랜치에
갱신 커밋한다(중복 PR 방지).

### C-2. `.github/workflows/steward.yml` — 야간 cron 헤드리스

```yaml
name: Knowledge Steward
on:
  schedule:
    - cron: "23 18 * * 1-5"   # 평일 KST 새벽 3:23 (정각 회피)
  workflow_dispatch: {}

jobs:
  steward:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: npm }
      - run: npm ci
      - name: Run steward loop
        uses: anthropics/claude-code-action@v1   # 또는 npm i -g @anthropic-ai/claude-code 후 claude -p
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "/steward"
          claude_args: "--max-turns 60"
        env:
          POSTGRES_URL: ${{ secrets.POSTGRES_URL }}
```

- 정확한 액션 버전·인자는 구현 시점의 공식 문서(claude-code-action)를 확인해
  맞춘다. 핵심 계약: **secrets로 API키·DB URL 주입, `/steward` 헤드리스 실행,
  PR 생성 권한**.
- 실행 로그의 다이제스트를 workflow summary에 남긴다.

### C-3. 발행물 재발행 `/refresh-publications`

트리거: 온톨로지·매핑을 바꾸는 steward PR이 머지된 뒤 (수동 호출 또는
steward 루프 시작 시 "지난 실행 이후 main에 온톨로지 diff 존재" 감지).
`generate:curriculum-html`·`generate:domains-html`·`generate:curriculum-review-html`
실행 → 산출물 diff가 있으면 재발행 PR.

### C-4. (선택) Claude Code 원격 세션 Routine

Actions cron과 별개로, Claude Code on the web 세션에서 시간 단위 Routine으로
`/steward-digest`를 돌려 반응성을 높일 수 있다. steward가 만든 PR은
`subscribe_pr_activity`로 babysit(CI 실패 자동 수정, 리뷰 코멘트 대응)한다.

---

## 7. Phase D — 심화 (후속 백로그)

1. **중복의심 통합 제안**: 임계값 도달 스킬 쌍의 정의·관계·평가근거를 대조해
   통합/구분 유지 판단 문서를 생성(스킬 삭제는 ID 불변 원칙상 deprecated
   플래그 설계가 선행돼야 함 — 스키마 확장 제안 포함).
2. **관계망 자동 보강**: 신규 스킬의 related/prerequisite 관계를 온톨로지
   임베딩·규칙으로 제안, `test:ontology` 의미 검증으로 게이트.
3. **역량 갭 → 커리큘럼 추천**: `COMPETENCY_SKILL_LINK_PLAN.md` Phase 3와 합류
   — 직원 부족역량 → 매핑 스킬 → 관계망 다음 스킬 → 커리큘럼 과목 제시.
4. **조직 역량 미매핑 14건 소진**: B-2와 같은 패턴으로 organizations 매핑 제안.

---

## 8. 롤아웃 및 운영 체크리스트

- [ ] Phase A 머지 → 1주간 `/steward-digest` 수동 실행으로 시그널 품질 관찰
- [ ] 임계값(`signal-thresholds.json`) 현장 보정
- [ ] Phase B 스킬을 하나씩 활성화 (B-1 → B-2 → B-3 순서: 리스크 오름차순)
- [ ] Phase C cron 활성화 전: `workflow_dispatch`로 3회 이상 드라이런
- [ ] Actions secrets 등록: `ANTHROPIC_API_KEY`, `POSTGRES_URL`
- [ ] steward PR 리뷰 규칙 합의: 도메인 재배정은 해당 칼리지 내부전문가
  (EVAL-101~105, `docs/DOMAIN_RECLASSIFICATION_PLAN.md` 8절)가 승인

## 9. 성공 지표

| 지표 | 목표 |
| --- | --- |
| 시그널 → 제안 PR 리드타임 | 수동(무기한) → 24h 이내 |
| pending 변경요청 체류 | 0건 유지 (모두 제안/보류 판정 부여) |
| unknown 소분류 체류 | 다음 steward 실행 내 해소 |
| 검증 게이트 우회 | 0건 (steward 커밋은 전부 CI green) |
| 발행물 신선도 | 온톨로지 머지 후 1 실행 주기 내 재발행 |

---

## 부록 A. SKILL.md 프론트매터 템플릿

```markdown
---
name: triage-change-requests
description: pending 도메인 변경요청을 검토해 오버라이드 초안 PR을 만든다.
  도메인 변경요청 처리, 스튜어드 triage 요청 시 사용.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
---

# 역할
너는 AI Factory Skill Fab의 지식 스튜어드다. …(§2 불변 원칙 7개 수록)…

# 절차
1. …
```

## 부록 B. steward PR 본문 템플릿

```markdown
## 🤖 지식 스튜어드 제안

**시그널 근거**
| 시그널 | 값 | 임계값 | 출처 기간 |
| --- | --- | --- | --- |
| 도메인 변경요청 pending | N건 | ≥1 | YYYY-MM-DD ~ |

**제안 내용** … (변경 파일·판단 근거)
**보류 목록** … (임계값 미달/판단 유보 + 사유)
**검증** validate:data ✓ / 테스트 ✓ / build ✓ / (해당 시) 기존 ID diff 무결 ✓
```
