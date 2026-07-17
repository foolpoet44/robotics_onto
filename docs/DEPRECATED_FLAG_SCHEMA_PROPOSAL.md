# 스킬 Deprecated 플래그 스키마 확장 제안 (D-1 선행)

## 왜 필요한가

지식 스튜어드의 D-1(중복의심 통합)은 평가자들이 "중복의심" 라벨로 지목한 스킬
쌍을 통합할 수 있어야 한다. 그러나 **불변원칙 2(스킬 ID/URN 불변)** 때문에 스킬을
물리적으로 **삭제할 수 없다** — 기존 매핑·평가·역량 연결이 전부 깨진다. 따라서
"논리적 폐기(deprecate)"를 표현할 스키마가 선행돼야 한다. 이 문서는 그 설계를
발의한다. **이것은 제안이며, 스키마 변경 자체는 별도 gate-change PR(2인 리뷰)로 한다.**

## 현재 스킬 레코드 (robot-smartfactory.json 생성물)

```json
{
  "skill_id": "RSF-AAM-005",
  "internal_uri": "urn:rsf:skill:aam-0005",
  "preferred_label_ko": "...", "skill_type": "knowledge|skill|competence",
  "proficiency_level": 1, "parent_skill_id": null,
  "related_skills": ["RSF-..."], ...
}
```

## 제안: 3개 선택 필드 추가 (하위호환)

| 필드 | 타입 | 의미 |
| --- | --- | --- |
| `lifecycle_status` | `"active"` \| `"deprecated"` | 기본 `"active"`. 폐기 시 `"deprecated"`. |
| `superseded_by` | `string \| null` | 이 스킬을 대체하는 **존치 스킬**의 `skill_id`(통합 시). |
| `deprecation_reason` | `string \| null` | 폐기 사유(중복의심 통합·노후 등). |

원칙:
- **ID·URN·시퀀스는 그대로 보존**한다(불변원칙 2 준수). 레코드는 남되 상태만 바뀐다.
- `deprecated` 스킬은 **새 매핑/평가의 대상이 되지 않는다**. 기존 참조는 유지하되
  `superseded_by`로 후속을 안내한다.
- 생성기(`generate-robot-smartfactory-data.py`)에 폐기 목록(`DEPRECATED_SKILLS`)을
  두어 결정론적으로 상태를 부여한다(EXTENSION_SKILLS 패턴과 동일 철학).

## 검증 규칙 확장 (validate:data / test:ontology)

- `lifecycle_status ∈ {"active","deprecated"}`.
- `deprecated`이면 `superseded_by`는 **존치(active) 스킬**의 실재 id 이거나 null.
- `superseded_by`가 자기 자신·다른 deprecated 스킬을 가리키면 오류.
- `related_skills`·`parent_skill_id`가 deprecated 스킬을 새로 가리키면 경고
  (기존 참조는 마이그레이션 유예).
- 커버리지 계산(조직·역량·칼리지)은 active 스킬 기준으로 하되, deprecated 도
  집계에서 제외하지 않고 "폐기됨"으로 표기(감사 추적 유지).

## 발행물·UI 영향

- 도메인/커리큘럼 발행물은 `deprecated` 스킬에 배지("폐기 · → 후속 스킬")를 달고
  기본 필터에서 숨김(감사용 토글 제공).
- 체계도는 폐기 스킬을 흐리게 표시하고 `superseded_by`로 화살표.

## 롤아웃

1. (이 문서) 설계 발의 → 검토.
2. gate-change PR: 스키마·검증·생성기 확장(2인 리뷰).
3. D-1 `/dedup-suspects` 스킬이 이 필드를 사용해 통합 제안 PR 생성.

이 선행 없이 D-1은 **판단 문서(통합/구분 권고)만** 생성하고 실제 폐기는 하지 않는다.
