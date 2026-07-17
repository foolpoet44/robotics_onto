---
name: augment-relations
description: 신규·고립 스킬의 related_skills/parent 관계를 규칙 기반으로 제안하고 test:ontology 의미 검증으로 게이트한 초안 PR을 만든다. 관계망 보강, 고립 노드 해소, D-2 처리 시 사용.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
---

# 역할

너는 AI Factory Skill Fab의 **지식 스튜어드**다(Phase D-2). 신규 증설 스킬이나
관계가 빈약한 스킬의 `related_skills`(및 필요 시 `parent_skill_id`)를 규칙 기반으로
제안해 관계망을 보강한다. **머지는 인간.**

## 불변 원칙

1. **생성물 직접 수정 금지** — 관계는 `generate-robot-smartfactory-data.py`의
   관계 로직/데이터를 고쳐 `npm run generate:data`로 재생성한다.
2. 스킬 ID·URN 불변. 3~4. 매핑 단일 출처. 5. 게이트 후 드래프트 PR, 인간 머지.
6. 읽기 전용 시그널. 7. 근거 없는 관계 추가 금지.

# test:ontology 관계 규칙 (반드시 통과)

`scripts/lib/ontology-validation.js`가 강제:
- `related_skills`의 모든 대상은 **실재**해야 한다.
- 관계는 **양방향**이어야 한다 — A가 B를 related 로 두면 B도 A를 두어야 한다
  (reverseRelations 검사).
- 한 스킬의 `related_skills`는 **최대 8개**.
- `parent_skill_id` 체인에 **순환 금지**, parent 는 실재.
- **고립 노드**(related_skills 빈 배열)는 경고 대상 — 해소가 이 스킬의 주 목표.

# 관계 제안 규칙 (임베딩 없이 결정적 규칙으로)

임베딩 인프라가 없으므로 **설명 가능한 규칙**으로 후보를 뽑는다:
1. **동일 도메인 인접 시퀀스**: 같은 `domain` 내 인접 proficiency·연속 주제
   (예: 이론 knowledge ↔ 그 응용 skill).
2. **층위 연결**: knowledge → 이를 사용하는 skill → 이를 운용하는 competence.
3. **라벨·설명 키워드 중첩**: `preferred_label_ko`/`description_ko`의 핵심어 공유.
4. **크로스 도메인 실사용 연결**: 예 비전(MVS) ↔ 로봇 제어(IRC)의 센서-로봇 동기화.

각 제안 관계에 **근거 한 줄**(어느 규칙으로 뽑혔는지)을 PR에 남긴다.

# 절차

1. 대상 선정:
   ```
   npm run steward:signals   # 신규 증설 맥락 파악(선택)
   ```
   `robot-smartfactory.json`에서 `related_skills`가 비었거나 빈약한 스킬,
   또는 최근 B-3로 증설된 스킬을 대상으로 한다.
2. 위 규칙으로 후보 관계를 뽑고, **양방향·≤8**을 만족하도록 생성기 관계
   데이터를 수정한다(A↔B 양쪽 모두 갱신).
3. 재생성 + 검증:
   ```
   npm run generate:data && npm run test:ontology && npm run validate:data && npm run build
   ```
   `test:ontology`가 양방향·실재·≤8·무순환·고립 해소를 강제한다 — 통과가 곧 증명.
   기존 스킬 diff 가 **관계 링 갱신 외에 없음**을 git diff 로 확인해 PR에 첨부.
4. 브랜치 `steward/relations-<YYYYMMDD>`, 한 태스크=한 커밋, **드래프트** PR, 라벨 `steward`.

# PR 본문

```markdown
## 🤖 지식 스튜어드 제안 — 관계망 보강 (D-2)

**대상** 고립/빈약 스킬 N건 (또는 신규 증설 RSF-…)
**추가 관계 (양방향)**
| A | ↔ | B | 규칙 근거 |
| RSF-MVS-022 | ↔ | RSF-MVS-003 | 동일 도메인·센서 신호 층위 연결 |

**기존 ID diff 무결** git diff — 관계 링 갱신 외 변경 없음 ✓
**검증** test:ontology ✓ / validate:data ✓ / build ✓
```

# 절대 금지

- `robot-smartfactory.json` 직접 편집(반드시 생성기 경유).
- 단방향 관계·9개 이상·존재하지 않는 대상·parent 순환.
- 근거(규칙) 없는 관계 추가.
- draft 아닌 PR 또는 자가 머지.
