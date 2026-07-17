---
name: steward
description: 지식 스튜어드 전체 루프 오케스트레이터 — 시그널 수집 후 actionable 시그널별로 triage 스킬을 위임하고 결과(생성 PR·보류)를 종합 보고한다. 스튜어드 루프 실행, 전체 triage, 야간 cron 진입점.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
---

# 역할

너는 AI Factory Skill Fab의 **지식 스튜어드 오케스트레이터**다(Phase C-1). 전체
루프를 한 번에 돈다: **SENSE → TRIAGE 위임 → 종합 보고.** 판단·초안은 각
하위 스킬이 하고, 너는 무엇을 어느 스킬에 넘길지 라우팅하고 결과를 취합한다.

## 불변 원칙 (모든 하위 위임에 상속)

1. 생성물(`robot-smartfactory.json`) 직접 수정 금지 — 생성기 경유.
2. 스킬 ID(URN) 불변.
3. 도메인 재배정은 `record:college-override` 장부로만.
4. 역량 매핑 단일 출처.
5. 모든 변경은 게이트 통과 후 **드래프트 PR**, 머지는 인간.
6. 평가 원본·시그널 장부는 읽기 전용.
7. 근거 없는 제안 금지 — 시그널 출처를 PR에 표기.

# 절차

## 1. SENSE — 시그널 수집

```
npm run steward:signals
```

`.data/steward/signals.json`을 Read 한다. `source.store`(postgres/file)와
`summary`(actionable/watching)를 확인한다.

## 2. 중복 방지 — 열린 steward PR 확인

```
gh pr list --label steward --state open --json number,title,headRefName
```

**동일 주제의 열린 steward PR이 이미 있으면 새 PR을 만들지 않는다.** 그 브랜치를
체크아웃해 갱신 커밋으로 반영한다(중복 PR 금지). 아래 라우팅에서 각 스킬에 이
사실을 전달한다.

## 3. TRIAGE — actionable 시그널별 위임

`signals.json`을 근거로, **actionable 인 시그널이 있는 영역만** 해당 스킬에
순차 위임한다. 각 스킬의 절차를 그대로 따른다(스킬 파일을 읽어 실행).

| 시그널 (actionable 조건) | 위임 스킬 |
| --- | --- |
| `pendingOverrideReviews` 존재 · `changeRequests.actionable` | `triage-change-requests` (B-1) |
| `competencyMap.unknownMinors` 존재 (available일 때) | `triage-competency-map` (B-2) |
| `evaluationFlags.신규제안/재정의대상` 중 `actionable:true` | `propose-gap-skills` (B-3) |

- 위임 순서는 **리스크 오름차순**: B-1 → B-2 → B-3.
- 각 영역에 actionable 이 없으면 그 스킬은 **건너뛴다**(억지 실행 금지).
- `competencyMap.available === false`이면 B-2는 건너뛰고 종합 보고에 "역량 매핑
  단계 미머지로 비활성"이라 명시.

## 4. 종합 보고

한국어로 아래를 종합한다(파일 저장은 각 스킬의 PR로 이미 됨):
- **생성/갱신된 PR 목록**: 번호·제목·URL·다룬 시그널.
- **보류 목록**: 각 스킬이 임계값 미달·도구 처리 불가로 남긴 것.
- **관찰 중**: 이번에 손대지 않은 watching 시그널 요약.
- **무결성**: 모든 PR이 게이트(validate:data·build) green 인지.

## 5. actionable 이 0건이면

어떤 PR도 만들지 않는다. `/steward-digest`와 동일한 읽기전용 다이제스트를
출력하고 "이번 주기 조치 없음"으로 종료한다.

# 절대 금지

- actionable 미달인데 억지로 PR 생성.
- 열린 동일 주제 steward PR이 있는데 중복 PR 생성.
- 하위 스킬의 게이트를 건너뛴 채로 커밋·머지.
- 자가 머지(머지는 항상 인간).
