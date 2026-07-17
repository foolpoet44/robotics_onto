# AI Factory Skill Fab — 저장소 운영 규칙

이 리포는 로봇·스마트팩토리 스킬 온톨로지와 그 파생물(4대 도메인 매핑·중간분류·
조직 역량 매핑·발행물)을 **버전 관리·검증·발행**한다. 진실 원천(SSOT)은
생성기 스크립트와 큐레이션된 JSON이고, `public/data/robot-smartfactory.json`과
`public/*.html`은 전부 **생성물**이다.

---

## 지식 스튜어드 (Living Ontology Loop)

시그널(평가·변경요청·미매핑)은 실시간으로 쌓이지만, 이를 온톨로지·매핑에 반영하는
경로는 수동이다. **지식 스튜어드 에이전트**가 이 고리를 자동화한다 — 단,
머지 게이트는 인간에게 남긴다(2속도 아키텍처). 상세 설계는
`docs/STEWARD_AGENT_DEV_PLAN.md`.

- **Fast lane (완성)**: 평가·변경요청 → Postgres/`.data` → 동적 페이지 즉시 반영.
- **Governed lane (스튜어드)**: 시그널 감지·분류 → 진실 원천만 수정하는 **드래프트
  PR** → 기존 검증 게이트 통과 → **인간 머지** → CI/Vercel 배포로 지식 반영.

온톨로지의 무검증 실시간 변이는 ID 안정성·검수 거버넌스를 파괴하므로 채택하지 않는다.

### 불변 원칙 (에이전트 가드레일 — 위반 금지)

1. **생성물 직접 수정 금지**: `public/data/robot-smartfactory.json`은 절대 직접
   편집하지 않는다. 스킬 추가/변경은 `scripts/generate-robot-smartfactory-data.py`
   (신규는 EXTENSION_SKILLS 블록)를 수정한 뒤 `npm run generate:data`로 재생성.
2. **스킬 ID(URN) 불변**: 기존 스킬의 `skill_id`는 어떤 경우에도 바꾸지 않는다.
   증설은 도메인 시퀀스 말미에만 추가한다.
3. **도메인 재배정은 장부를 통해서만**: 4대 도메인 변경은
   `npm run record:college-override`(검수 장부 기록)로만 수행한다.
   `college-mapping.json`의 skillOverrides를 손으로 편집하지 않는다.
4. **역량 매핑 단일 출처**: 역량 소분류↔스킬은 `competency-skill-map.json`만
   수정한다. 전 항목은 항상 mapped 또는 outOfScope로 100% 결정.
5. **모든 변경은 게이트 통과 후 PR**: `npm run validate:data && npm run build`
   실패 상태로 커밋·푸시하지 않는다. PR은 항상 드래프트로 만들고 머지는 인간이 한다.
6. **평가 원본 불변**: `employee-competency-assessments.json`과 평가/변경요청
   장부(DB·`.data`)는 읽기 전용 시그널이다. 에이전트가 수정하지 않는다.
7. **근거 없는 제안 금지**: 모든 제안 PR에는 시그널 출처(건수·평가자수·기간)를
   본문에 표기한다. 임계값 미달 시그널은 다이제스트에만 기록한다.

### 데이터 흐름 (진실 원천 → 생성물 → 발행물)

```
[SSOT]  generate-robot-smartfactory-data.py (EXTENSION_SKILLS)   ─ npm run generate:data ─▶
[생성물] public/data/robot-smartfactory.json  (온톨로지, 직접편집 금지)
        college-mapping.json · college-subcategories.json · organizations/*.json (큐레이션)
        competency-skill-map.json (역량↔스킬)                    ─ generate:*-html ─▶
[발행물] public/*.html (커리큘럼·도메인·검토용)
```

시그널 원천(읽기 전용): `skill_evaluation_labels`·`domain_change_requests`·
`domain_importance_ratings` (POSTGRES_URL 설정 시 DB, 미설정 시 `.data/*.json` 폴백).

### 어떤 변경은 어떤 도구로

| 변경하려는 것 | 유일한 진입 도구 | 직접 편집 금지 대상 |
| --- | --- | --- |
| 스킬 추가/정의 수정 | `generate-robot-smartfactory-data.py` → `npm run generate:data` | `robot-smartfactory.json` |
| 4대 도메인(칼리지) 재배정 | `npm run record:college-override` | `college-mapping.json` skillOverrides |
| 역량 소분류↔스킬 매핑 | `competency-skill-map.json` 편집 | (단일 출처, 손편집 대상 아님) |
| 발행물 갱신 | `npm run generate:*-html` | `public/*.html` |
| 시그널 확인(읽기) | `npm run steward:signals` → `/steward-digest` | (수정 없음) |

---

## 검증 게이트 (커밋 전 필수)

```
npm run validate:data   # strict — 온톨로지·조직·칼리지·중간분류 정합 (예상 경고: 미매핑 조직 역량 14개)
npm run build           # Next.js 빌드
```

전체 테스트: `npm run test:ontology test:organization test:review-queue
test:review-decisions test:skill-detail test:development test:college-override
test:employee-competency test:data test:steward` (개별 스크립트는 package.json 참조).

## 스튜어드 관련 명령·스킬

- 시그널 수집(결정적): `npm run steward:signals` → `.data/steward/signals.json`
- 수집기 테스트: `npm run test:steward` · 역량 커버리지: `npm run test:competency-skill`
- 임계값 설정: `scripts/steward/signal-thresholds.json`
  (변경요청 1건·중복의심 3인·신규제안 2인·재정의 2인·unknown 소분류 1건).

스킬(`.claude/skills/`):

| 스킬 | Phase | 역할 |
| --- | --- | --- |
| `steward-digest` | A | 읽기전용 다이제스트(수정 0건) |
| `steward` | C-1 | 전체 루프 오케스트레이터(actionable→위임) |
| `triage-change-requests` | B-1 | 칼리지 오버라이드 검수 결정 초안 |
| `triage-competency-map` | B-2 | unknown 소분류 → 역량 매핑 초안 |
| `propose-gap-skills` | B-3 | 신규제안·재정의 → 갭스킬 증설 초안 |
| `refresh-publications` | C-3 | 발행물 재발행(날짜 드리프트 필터) |
| `triage-organization-map` | D-4 | 조직 역량 미매핑 → 매핑 초안 |
| `dedup-suspects` | D-1 | 중복의심 통합/구분 판단 문서 |
| `augment-relations` | D-2 | 관계망 보강(test:ontology 게이트) |
| `competency-gap-curriculum` | D-3 | 역량 갭 → 학습 경로 추천(읽기전용) |

D-1 실제 폐기는 `docs/DEPRECATED_FLAG_SCHEMA_PROPOSAL.md`(스키마 확장) 선행 필요.
자동화: `.github/workflows/steward.yml`(야간 cron, `/steward` 헤드리스).
