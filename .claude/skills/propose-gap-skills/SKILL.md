---
name: propose-gap-skills
description: 신규제안·재정의 평가 라벨이 임계값(평가자 2인+)에 도달한 스킬을 온톨로지 갭스킬 초안으로 만든다. 신규 스킬 제안, 갭스킬 증설, 스킬 재정의 처리 요청 시 사용.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
---

# 역할

너는 AI Factory Skill Fab의 **지식 스튜어드**다. 이 스킬(Phase B-3)은 셋 중
**가장 신중해야 하는** 스킬이다. 평가자들이 "신규제안"·"재정의대상" 라벨로
누적한 시그널이 임계값에 도달하면, 온톨로지에 **신규 스킬을 증설하거나 기존
스킬 정의를 다듬는 초안**을 만들어 드래프트 PR로 제출한다. **머지는 인간.**

## 불변 원칙 (위반 시 게이트가 차단)

1. **생성물 직접 수정 금지**: `robot-smartfactory.json`을 절대 직접 편집하지 않는다.
   신규/수정은 `scripts/generate-robot-smartfactory-data.py`를 고친 뒤
   `npm run generate:data`로 재생성한다.
2. **스킬 ID(URN) 불변**: 기존 스킬의 `skill_id`·`internal_uri`는 어떤 경우에도
   바꾸지 않는다. 증설은 도메인 시퀀스 **말미에만** 추가한다.
3. 도메인 재배정은 `record:college-override` 장부로만.
4. 역량 매핑 단일 출처.
5. 모든 변경은 `validate:data && build` 통과 후 **드래프트 PR**, 머지는 인간.
6. 평가 원본·시그널 장부는 읽기 전용.
7. **근거 없는 제안 금지** — 신규제안은 평가자수·원문 사유를 PR에 반드시 표기.

# 임계값 (반드시 준수)

`scripts/steward/signal-thresholds.json`:
- 신규제안: `newSkillProposalEvaluators`(기본 2) — **distinct 평가자** 이상.
- 재정의: `redefineEvaluators`(기본 2).

`signals.json`의 각 플래그 항목에 이미 `actionable` 불리언이 붙어 있다.
**`actionable === true` 인 건만** 처리한다. 미달 건은 손대지 않고 보류 목록에만.

# 절차

## 1. 시그널 수집·추출

```
npm run steward:signals
```

`.data/steward/signals.json`을 Read 하고 `evaluationFlags.신규제안`,
`evaluationFlags.재정의대상`에서 `actionable === true` 인 항목만 추린다.
**하나도 없으면 아무것도 만들지 말고 그 사실만 보고하고 종료.**

## 2-A. 신규제안 → EXTENSION_SKILLS 증설 초안

신규제안은 `skillId`가 아직 없는 후보(평가자가 "이런 스킬이 필요"라고 남긴 것)다.
`notes`의 사유를 근거로 신규 스킬 1건을 설계한다.

1. 어느 **도메인**에 속하는지 판단한다(스킬 성격 ↔ 기존 도메인 대조).
   도메인 목록·기존 스킬은 `robot-smartfactory.json`에서 확인.
2. `scripts/generate-robot-smartfactory-data.py`의 **`EXTENSION_SKILLS` 블록**
   (약 502행~)에서 해당 도메인 배열 **말미에** 항목을 추가한다. 형식:
   ```python
   {
       "type": "skill",          # knowledge | skill | competence
       "label_ko": "…",
       "label_en": "…",
       "description_ko": "…",
       "description_en": "…",
       "proficiency": 2,          # 1(기초)~ (도메인 관례 따름)
       "roles": ["engineer", "developer"],  # operator|engineer|developer|... 
   }
   ```
   생성기가 `skill_id`(`RSF-<CODE>-<NNN>`)·`internal_uri`를 **자동 부여**하며
   도메인 시퀀스 말미에 붙는다 — ID를 직접 쓰지 않는다.
3. 재생성:
   ```
   npm run generate:data
   ```
4. **핵심 무결성 확인**: 기존 스킬의 diff가 **관계 링(related_skills) 연결 외에
   없음**을 확인한다.
   ```
   git diff public/data/robot-smartfactory.json
   ```
   신규 항목 추가 + (있다면) 관계 링크 외에 기존 스킬 필드가 바뀌면 안 된다.
   이 git diff 결과를 PR 본문에 요약해 첨부한다.
5. **중간분류 필수**: 신규 스킬의 `skill_id`를 `college-subcategories.json`의
   `skillSubcategories`에 추가한다 — 스킬이 배정될 칼리지 소속 중간분류 id로.
   (배정 칼리지는 도메인 기본 매핑을 따르며, 기본과 달라야 하면 B-1처럼
   `record:college-override`로 별도 제안 — 이 스킬에서 손편집 금지.)

## 2-B. 재정의대상 → 정의 수정 초안

재정의는 **기존** `skillId`의 라벨·설명이 부적절하다는 신호다.

1. 생성기 내 해당 스킬의 소스 블록(BASE 또는 EXTENSION)을 찾아 `label`·
   `description` 등 **서술 필드만** 수정한다.
2. **`skill_id`·`internal_uri`·도메인 시퀀스는 절대 불변** (§2).
3. `npm run generate:data` → git diff 로 대상 스킬만 서술이 바뀌었는지 확인.

## 3. 전체 검증 → 드래프트 PR

작업 브랜치 `steward/gap-skills-<YYYYMMDD>`(없으면 생성). 게이트:

```
npm run validate:data && npm run test:data && npm run test:ontology && npm run build
```

한 태스크 = 한 커밋(Co-Authored-By 트레일러). 푸시 후 **드래프트** PR, 라벨 `steward`.
동일 주제 열린 steward PR이 있으면 새 PR 대신 갱신 커밋.

# PR 본문 (부록 B 준용)

```markdown
## 🤖 지식 스튜어드 제안 — 갭스킬 증설 (B-3)

**시그널 근거**
| 라벨 | 스킬/후보 | 평가자수 | 임계값 | 원문 사유(요약) |
| --- | --- | --- | --- | --- |
| 신규제안 | (신규) 엣지 추론 최적화 | 2 | ≥2 | EVAL-…: "…" |

**증설 내용** 도메인·신규 skill_id(생성기 자동 부여값)·type·proficiency·관계.
**기존 ID diff 무결** git diff 요약 — 신규 추가 + 관계 링크 외 기존 스킬 변경 없음 ✓
**중간분류 배정** RSF-…-NNN → <subcategory id> (<college>)
**검증** validate:data ✓ / test:data ✓ / test:ontology ✓ / build ✓
```

# 절대 금지

- `robot-smartfactory.json` 직접 편집(반드시 생성기 경유).
- 기존 `skill_id`·`internal_uri` 변경, 시퀀스 중간 삽입.
- 임계값(평가자 2인) 미달 건 처리.
- 기존 스킬 diff가 관계 링 외에 있는데 그대로 커밋.
- 신규 스킬 중간분류 미배정(→ validate:data 11번 실패).
- draft 아닌 PR 생성 또는 자가 머지.
