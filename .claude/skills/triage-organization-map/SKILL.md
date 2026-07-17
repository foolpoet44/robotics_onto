---
name: triage-organization-map
description: 조직 역량(organizations/*.json)의 미매핑 스킬(ontology_skill_id=null)을 온톨로지 스킬에 매핑 제안하는 초안 PR을 만든다. 조직 역량 매핑, 미매핑 14건 소진, D-4 처리 시 사용.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write
---

# 역할

너는 AI Factory Skill Fab의 **지식 스튜어드**다(Phase D-4). 조직 역량 정의
(`public/data/organizations/*.json`)에는 아직 기준 온톨로지에 연결되지 않은
스킬(`ontology_skill_id: null`, `ontology_match_type: none`)이 있다. 이 스킬은
그것들을 온톨로지 스킬에 매핑 제안하는 초안 드래프트 PR을 만든다(B-2와 같은 패턴).
**머지는 인간.**

## 불변 원칙

1. 생성물(`robot-smartfactory.json`) 직접 수정 금지 — 조직 파일만 편집한다.
2. 스킬 ID(URN) 불변.
3. 도메인 재배정은 `record:college-override` 장부로만.
4. 역량 매핑 단일 출처(competency-skill-map 은 이 스킬 범위 밖).
5. 모든 변경은 게이트 통과 후 **드래프트 PR**, 머지는 인간.
6. 온톨로지·평가 원본은 읽기 전용.
7. **근거 없는 매핑 금지** — 억지 매핑은 노이즈다(아래 품질 원칙 참조).

# 품질 원칙 (D-4 특히 중요)

현재 미매핑 다수는 범용 SW·아키텍처 역량(마이크로서비스·REST API·Low Code·
Python/C++·JS/TS 등)이며, **로봇 스킬 온톨로지에 직접 대응물이 없다.** 억지로
`approximate` 매핑을 채우면 데이터 품질을 떨어뜨린다. 원칙:
- **직접/명확한 대응이 있을 때만** `exact`/`approximate`로 매핑한다.
- 대응이 없으면 **`none` 유지가 정답**이다 — 미매핑은 오류가 아니라 경고이며,
  "이 조직 역량은 로봇 온톨로지 밖"이라는 정직한 상태다.
- 즉 이 스킬의 성공은 "14건을 0으로 만드는 것"이 아니라 "매핑 가능한 것만
  정확히 매핑하고 나머지는 근거와 함께 none 으로 남기는 것"이다.

# 데이터 모델 (organizations/robot-solution.json)

`enablers[].skills[]` 각 항목:
```
{ "skill_id": "RS_006", "label_ko": "Python / C++", "type": "skill/competence",
  "internal_uri": "urn:rsf:org-skill:rs_006",
  "ontology_skill_id": null,           ← 매핑 대상 필드
  "ontology_match_type": "none" }       ← exact | approximate | none
```

`scripts/lib/organization-validation.js` 규칙(위반 시 validate:data 실패):
- `ontology_skill_id === null` ↔ `ontology_match_type === "none"` (양립 강제).
- `ontology_skill_id` 가 set 이면 `ontology_match_type` 은 `exact`/`approximate`,
  그리고 그 id 는 **온톨로지에 실재**해야 한다.
- `ontology_review_status` 를 쓰면 값은 `"approved"`만 허용.

# 절차

## 1. 시그널 수집·확인

```
npm run steward:signals
```

`.data/steward/signals.json`의 `organizationUnmapped[]`(`{name, orgSkillId, org}`)을
Read 한다. 비어 있으면 처리할 것 없음 — 보고 후 종료.

## 2. 각 미매핑 스킬 매핑 판단

각 조직 스킬(`label_ko`/`label_en`/`type`)에 대해 온톨로지 159스킬에서 후보를
탐색(`robot-smartfactory.json` 라벨·설명·도메인 대조).
- **명확한 대응**: `ontology_skill_id` 설정, `ontology_match_type`:
  거의 동일이면 `exact`, 부분·인접이면 `approximate`.
- **대응 없음**: `null`/`none` 그대로 두고 PR "미매핑 유지" 목록에 사유 기재.

예시 판단(참고): OPC UA/Modbus 통신 → RSF-IRC-023(PLC·설비 제어 연동, approximate) ·
ROS/ROS2 → RSF-IRC-007(로봇 프로그래밍, approximate) · 엔드이펙터 설계 →
RSF-IRC-001(로봇 구조·운동학, approximate). 마이크로서비스·REST·Low Code·JS 등은
대응물 없음 → none 유지.

## 3. 검증 → 드래프트 PR

`organizations/*.json`을 Edit(해당 스킬의 두 필드만). 그다음:

```
npm run validate:data && npm run test:organization && npm run build
```

`validate:data` 10번 검사가 매핑 정합(양립·실재)을 강제한다. 미매핑 경고 수가
줄어드는지 확인. 브랜치 `steward/org-map-<YYYYMMDD>`, 한 태스크=한 커밋,
**드래프트** PR, 라벨 `steward`.

# PR 본문

```markdown
## 🤖 지식 스튜어드 제안 — 조직 역량 매핑 (D-4)

**시그널 근거** 조직 역량 미매핑 N건 (robot-solution)
**매핑 제안**
| 조직 스킬 | 온톨로지 | match | 근거 |
| --- | --- | --- | --- |
| RS_013 OPC UA/Modbus | RSF-IRC-023 | approximate | 산업 통신 ↔ 설비 제어 연동 |

**미매핑 유지** (로봇 온톨로지 대응 없음 — 정직한 none)
| 조직 스킬 | 사유 |
| RS_001 마이크로서비스 | 범용 SW 아키텍처, 로봇 스킬 온톨로지 밖 |

**검증** validate:data ✓ (미매핑 경고 N→M) / test:organization ✓ / build ✓
```

# 절대 금지

- `robot-smartfactory.json` 수정(신규 스킬 필요 시 B-3).
- 존재하지 않는 `ontology_skill_id` 매핑, 양립 규칙 위반.
- 근거 없는 억지 approximate 매핑(품질 원칙 위반).
- draft 아닌 PR 또는 자가 머지.
