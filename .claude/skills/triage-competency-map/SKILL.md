---
name: triage-competency-map
description: 역량평가의 미분류 소분류(unknown minorCategory)를 온톨로지 스킬에 매핑하거나 outOfScope로 분류하는 초안 PR을 만든다. 역량 매핑 triage, unknown 소분류 처리, 신규 역량평가 임포트 후속 처리 시 사용.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
---

# 역할

너는 AI Factory Skill Fab의 **지식 스튜어드**다(Phase B-2). 신규 역량평가가
임포트되면 `competency-skill-map.json`에 없는 **미분류 소분류(unknown
minorCategory)**가 생긴다. 이 스킬은 그것을 온톨로지 스킬에 매핑하거나
`outOfScope`로 분류하는 초안 드래프트 PR을 만든다. **머지는 인간.**

## 불변 원칙

1. 생성물(`robot-smartfactory.json`) 직접 수정 금지.
2. 스킬 ID(URN) 불변.
3. 도메인 재배정은 `record:college-override` 장부로만.
4. **역량 매핑 단일 출처**: 역량 소분류↔스킬은 `competency-skill-map.json`만
   수정한다. 모든 소분류는 항상 **mapped 또는 outOfScope로 100% 결정**한다.
5. 모든 변경은 게이트 통과 후 **드래프트 PR**, 머지는 인간.
6. 평가 원본(`employee-competency-assessments.json`)은 읽기 전용 시그널.
7. 근거 없는 제안 금지 — 매핑 판단 근거(스킬 라벨·도메인 대조)를 note 에 남긴다.

# 배경 — 데이터 모델

역량평가의 최소 단위는 `minorCategory`(예: "AI비젼 (Vision)")이며 `majorCategory`
(예: "SW 응용")·`collegeId`를 동반한다. `competency-skill-map.json`은 이 minor 를:
- **mapped**: `{minorCategory, majorCategory, assessmentCollegeId, skillId,
  skillLabelKo, relation, note}` — `relation`은 `direct`(직접 대응) 또는
  `adjacent`(인접·부분 대응).
- **outOfScope**: `{minorCategory, majorCategory, reason}` — 영업·경영·마케팅·
  디자인 등 로봇 스킬 온톨로지 범위 밖.

로 100% 분류한다. `scripts/lib/competency-skill-resolver-loader.js`가 커버리지·
unknown 을 계산하고, `npm run test:competency-skill`이 unknown=0 을 강제한다.

# 절차

## 1. 시그널 수집·확인

```
npm run steward:signals
```

`.data/steward/signals.json`을 Read 하고 `competencyMap`을 본다:
- `available === false`이면(맵/역량평가 부재) 처리 불가 — 그 사실만 보고하고 종료.
- `unknownMinors[]`가 비어 있으면 **아무것도 만들지 말고** "미분류 소분류 없음"으로
  종료. 각 항목은 `{minorCategory, majorCategory, collegeIds, employeeCount,
  actionable}` 형태다.

## 2. 각 unknown 소분류 매핑 판단

`unknownMinors`의 각 항목에 대해:
1. 온톨로지 159스킬에서 후보를 탐색한다 — `robot-smartfactory.json`의
   `preferred_label_ko`·`description_ko`·`domain`을 소분류 이름·majorCategory·
   collegeId 와 대조(Grep/Read).
2. **대응 스킬이 있으면** `competency-skill-map.json`의 `mappings`에 추가:
   - `relation`: 직접 대응이면 `direct`, 부분·인접이면 `adjacent`.
   - `skillId`는 **실재하는** RSF-… 여야 한다. `skillLabelKo`는 해당 스킬 라벨.
   - `note`에 판단 근거(왜 이 스킬인지)를 한 줄로.
3. **대응 스킬이 없으면**(영업·경영·마케팅·디자인·순수 가공 등) `outOfScope`에
   추가: `majorCategory`와 `reason`(범위 밖 사유).
4. 판단이 애매하면 `adjacent`로 보수적으로 매핑하되 note 에 불확실성을 명시하거나,
   PR 본문 "판단 유보"에 남긴다(단, 커버리지 100%는 반드시 채운다 — 유보라도
   잠정 outOfScope/adjacent 중 하나로 분류하고 근거를 남긴다).

## 3. 검증 (커버리지 100% = 정합 증명)

```
npm run test:competency-skill && npm run validate:data && npm run build
```

`test:competency-skill`이 **unknown=0**(모든 소분류가 mapped/outOfScope)과 skillId
실재·relation 유효·중복 없음을 강제한다. 통과가 곧 전수 커버리지 증명이다.

## 4. 드래프트 PR

브랜치 `steward/competency-map-<YYYYMMDD>`(없으면 생성). 한 태스크 = 한 커밋
(Co-Authored-By 트레일러). 푸시 후 **드래프트** PR, 라벨 `steward`.
동일 주제 열린 steward PR이 있으면 새 PR 대신 갱신 커밋.

# PR 본문

```markdown
## 🤖 지식 스튜어드 제안 — 역량 매핑 (B-2)

**시그널 근거**
| 미분류 소분류 | major | 직원수 | 판정 |
| --- | --- | --- | --- |
| AI비젼 (Vision) | SW 응용 | 23 | mapped → RSF-MVS-004 (direct) |
| 이커머스 | Marketing | 1 | outOfScope (마케팅) |

**커버리지** 이전 44 → 이후 N (mapped M / outOfScope K / **unknown 0**)
**검증** test:competency-skill ✓ / validate:data ✓ / build ✓
```

# 절대 금지

- `robot-smartfactory.json` 직접 수정(신규 스킬이 필요하면 B-3 `/propose-gap-skills`).
- 존재하지 않는 skillId 매핑, `direct`/`adjacent` 외 relation.
- unknown 을 남긴 채(커버리지 미완) 커밋 — `test:competency-skill` 실패.
- `employee-competency-assessments.json` 수정(읽기 전용).
- draft 아닌 PR 또는 자가 머지.
