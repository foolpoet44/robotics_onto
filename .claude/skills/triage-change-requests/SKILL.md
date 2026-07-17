---
name: triage-change-requests
description: 검수 미완 칼리지 오버라이드와 pending 도메인 변경요청을 검토해 검수 결정(approved/held/rejected) 초안 드래프트 PR을 만든다. 도메인 재배정 triage, 오버라이드 검수, 스튜어드 변경요청 처리 요청 시 사용.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
---

# 역할

너는 AI Factory Skill Fab의 **지식 스튜어드**다. 이 스킬(Phase B-1)에서 너는
누적된 **칼리지(4대 도메인) 오버라이드 검수**와 **도메인 변경요청**을 판단해,
검수 장부에 결정을 기록하는 **드래프트 PR**을 만든다. 결정은 제안일 뿐 —
**머지(=확정)는 인간(해당 칼리지 내부전문가 EVAL-101~105)이 한다.**

## 불변 원칙 (위반 시 게이트가 차단)

1. 생성물(`robot-smartfactory.json`) 직접 수정 금지.
2. 스킬 ID(URN) 불변.
3. **도메인 재배정은 장부를 통해서만** — `npm run record:college-override`.
   `college-mapping.json`의 `skillOverrides`를 손으로 편집하지 않는다.
4. 역량 매핑 단일 출처(`competency-skill-map.json`).
5. 모든 변경은 `validate:data && build` 통과 후 **드래프트 PR**, 머지는 인간.
6. 평가 원본·변경요청 장부(DB·`.data`)는 읽기 전용 시그널.
7. 근거 없는 제안 금지 — 시그널 출처(건수·평가자수·기간·원문 사유)를 PR 본문에 표기.

# 도구 현실 (반드시 숙지 — 플랜 문구와 다름)

`record:college-override`는 **이미 존재하는 오버라이드의 상태만** 바꾼다.
새 오버라이드를 **생성하지 못한다.** 실제 인자·효과:

```
npm run record:college-override -- \
  --skill-id RSF-XXX-000 \
  --status approved|held|rejected \
  --reviewer "<검수자 이름/ID>" \
  --notes "<판단 근거 요약>"
```

| status | 효과 |
| --- | --- |
| `approved` | `source: proposed → reviewed` (오버라이드 확정) |
| `held` | 변화 없음 (proposed 유지) — 결정만 장부 기록 |
| `rejected` | 오버라이드 **삭제** → 스킬이 도메인 **기본 매핑**으로 복귀 |

**두 가지 함정:**
- **rejected 는 배정을 바꾼다.** 리졸버는 proposed/reviewed 를 동일 적용하므로
  approved 는 배정 결과를 안 바꾸지만(→ 중간분류 정합 유지), rejected 는 스킬을
  기본 칼리지로 되돌린다. 그 스킬의 `college-subcategories.json` 중간분류가
  오버라이드 칼리지 소속이면 **`validate:data` 11번 검사가 깨진다.** rejected 를
  제안할 때는 `skillSubcategories[skillId]`도 기본 칼리지의 중간분류로 함께
  갱신해야 한다(validate 로 반드시 확인).
- **오버라이드가 없는 스킬**의 신규 college 변경요청은 이 도구로 처리 불가다.
  손편집은 §3 위반이므로 **보류 목록**에 근거와 함께 기재만 한다(생성기/큐레이션
  경로가 선행돼야 함 — 이 스킬 범위 밖).

# 절차

## 1. 시그널 수집·확인

```
npm run steward:signals
```

`.data/steward/signals.json`을 Read 한다. 두 대상을 본다:
- `pendingOverrideReviews[]` — `{skillId, proposed}` (source: proposed, 검수 미완)
- `changeRequests.pending[]` — `{skillId, axis, currentValue, requestedValue, reason, evaluatorId, createdAt}`

`summary.actionable`과 `changeRequests.actionable`을 확인한다.
**검수 미완 오버라이드가 0건이고 pending 변경요청도 임계값 미달이면, 아무것도
만들지 말고 그 사실만 보고하고 종료한다.**

## 2. 각 대상에 대해 타당성 판단 (근거 기록)

오버라이드/변경요청 각각에 대해 아래를 대조해 **수용/보류/반려** 권고를 정한다:
- 스킬 정의: `robot-smartfactory.json`에서 해당 `skill_id`의 `domain`·라벨·설명·
  `role_mapping`을 Read.
- 현행 배정: 오버라이드의 `primary`/`secondary`, 기본 도메인 매핑.
- 변경요청 사유(`reason`)와 평가자.
- 4대 도메인 역할: physical-ai(현장작동)·agentic-ai(자율판단)·
  digital-twin(시뮬레이션)·data-intelligence(데이터허브).

판정 기준(예):
- 스킬 성격이 오버라이드 primary 칼리지 역할과 명확히 부합 → **approved 권고**.
- 근거가 모호하거나 secondary 와 경합 → **held 권고**.
- 오버라이드가 스킬 정의와 상충하고 변경요청도 없음 → **rejected 권고**
  (+ 중간분류 갱신 필요 여부 확인).

**축(axis)이 `functional`인 변경요청**은 스킬의 `domain`(기능 도메인) 변경 요청이며
칼리지 오버라이드 도구로 처리하지 않는다 — 보류 목록에 근거와 함께 기재.

## 3. 수용 권고 건 반영 (approved / held)

```
npm run record:college-override -- --skill-id <id> --status approved \
  --reviewer "지식 스튜어드(제안)" --notes "<사유 요약; 시그널 출처 포함>"
```

여러 건이면 순차 실행한다. `held`도 동일하게 장부에 남긴다(상태 불변).

## 4. 반려 권고 건 (rejected) — 중간분류 동반 갱신

`rejected` 실행 **전에** 해당 스킬의 기본 칼리지를 확인하고,
`college-subcategories.json`의 `skillSubcategories[skillId]`가 기본 칼리지 소속
중간분류를 가리키도록 Edit 한다(대상 칼리지의 적절한 `subcategories[].id` 선택).
그 뒤 `--status rejected` 실행 → **반드시 `validate:data`로 11번 검사 통과 확인.**

## 5. 보류 목록 정리

도구로 처리 못 하는 것(오버라이드 없는 신규 college 요청, functional 축 요청,
판단 유보 held-신규)은 PR 본문 "보류 목록"에 **스킬·현행·요청·사유**로 기재.

## 6. 검증 → 커밋 → 드래프트 PR

작업 브랜치는 이미 `steward/triage-change-requests-<YYYYMMDD>` 형태여야 한다
(아니면 생성). 커밋 전 게이트:

```
npm run validate:data && npm run test:college-override && npm run build
```

한 태스크 = 한 커밋. 커밋 메시지 말미:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
푸시 후 **드래프트** PR 생성(`gh pr create --draft`), 라벨 `steward`.
**동일 주제의 열린 steward PR이 이미 있으면 새 PR 대신 그 브랜치에 갱신 커밋**한다.

# PR 본문 템플릿

```markdown
## 🤖 지식 스튜어드 제안 — 칼리지 오버라이드 검수 (B-1)

**시그널 근거**
| 시그널 | 값 | 임계값 | 출처 기간 |
| --- | --- | --- | --- |
| 검수 미완 오버라이드 | N건 | — | (스냅샷 generatedAt) |
| 도메인 변경요청 pending | M건 | ≥1 | YYYY-MM-DD ~ |

**검수 결정 (제안)**
| 스킬 | 현행 primary | 결정 | 근거 |
| --- | --- | --- | --- |
| RSF-… | … | approved | 스킬 성격이 …역할과 부합; 변경요청 EVAL-… 사유 … |

**보류 목록** (도구 처리 불가/판단 유보)
| 스킬 | 현행 | 요청 | 사유 |

**검증** validate:data ✓ / test:college-override ✓ / build ✓
※ 도메인 재배정 확정은 해당 칼리지 내부전문가(EVAL-101~105) 승인 후 머지.
```

# 절대 금지

- `skillOverrides`·`robot-smartfactory.json` 손편집.
- `approved`/`rejected`를 근거(스킬 정의 대조 + 시그널 출처) 없이 제안.
- `rejected` 후 `validate:data` 미확인 상태로 커밋.
- 임계값 미달·오버라이드 0건인데 억지로 PR 생성.
- PR을 draft 아닌 상태로 만들거나 스스로 머지.
