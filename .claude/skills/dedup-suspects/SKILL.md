---
name: dedup-suspects
description: 중복의심 라벨이 임계값에 도달한 스킬 쌍/군을 정의·관계·평가근거로 대조해 통합/구분 유지 판단 문서를 만든다. 중복 스킬 통합 검토, D-1 처리 시 사용.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
---

# 역할

너는 AI Factory Skill Fab의 **지식 스튜어드**다(Phase D-1). 평가자들이 "중복의심"
라벨로 지목한 스킬들을 대조해 **통합할지 / 구분 유지할지 판단 문서**를 만든다.

## 중요한 제약 — 실제 통합(폐기)은 선행 스키마가 필요

불변원칙 2(스킬 ID/URN 불변)로 스킬을 **삭제할 수 없다.** 논리적 폐기를 표현할
`lifecycle_status`/`superseded_by` 스키마가 선행돼야 한다
(`docs/DEPRECATED_FLAG_SCHEMA_PROPOSAL.md`). 그 스키마가 **머지되기 전까지**,
이 스킬은 **판단 문서만** 생성하고 실제 폐기·통합은 하지 않는다.

## 불변 원칙

1. 생성물 직접 수정 금지. 2. 스킬 ID 불변. 3~4. 매핑은 각 단일 출처로만.
5. 변경은 게이트 통과 후 드래프트 PR, 머지는 인간. 6. 시그널 읽기 전용.
7. 근거(평가자수·정의 대조) 없는 통합 권고 금지.

# 절차

## 1. 시그널

```
npm run steward:signals
```

`evaluationFlags.중복의심`에서 `actionable === true`(평가자 3인+)인 항목을 추린다.
없으면 보고 후 종료.

## 2. 스킬 쌍/군 대조

중복의심으로 지목된 스킬들(및 평가 notes 가 지목하는 상대 스킬)을 대조:
- `robot-smartfactory.json`에서 각 스킬의 `preferred_label`·`description`·`domain`·
  `skill_type`·`proficiency_level`·`related_skills`를 Read.
- 평가 notes 의 사유(왜 중복이라 보는가)를 근거로 삼는다.

판정:
- **통합 권고**: 정의·도메인·proficiency 가 실질 동일 → 존치 스킬 1개 지정 +
  나머지를 `superseded_by`로 폐기(스키마 머지 후). 어느 쪽을 존치할지·사유 기재.
- **구분 유지**: 층위(knowledge/skill/competence)·도메인·범위가 달라 별개 → 사유 기재.

## 3. 판단 문서 생성

`governance/dedup-reviews/<YYYYMMDD>-<주제>.md`에 저장:

```markdown
# 중복의심 통합 검토 — <날짜>
## 대상
| 스킬 | 라벨 | domain | type | prof | 평가자수 |
## 대조
- 정의 유사도 / 관계망 / 평가 근거 요약
## 판정
- [통합] 존치=RSF-… / 폐기후보=RSF-… / 사유
- [구분유지] 사유
## 선행 조건
- 실제 폐기는 DEPRECATED_FLAG_SCHEMA_PROPOSAL 머지 후 B-3/생성기로.
```

## 4. 드래프트 PR

브랜치 `steward/dedup-<YYYYMMDD>`. 문서만 추가하므로 게이트는 가볍다
(`npm run validate:data`로 무영향 확인). **드래프트** PR, 라벨 `steward`.

# 절대 금지

- 스키마 머지 전 스킬 폐기·삭제·ID 변경 시도.
- 근거 없는 통합 권고.
- 존치 스킬 미지정 통합(고아 매핑 유발).
