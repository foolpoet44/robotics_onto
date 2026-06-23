# 03 · 데이터 온톨로지 명세 (관계망 · ESCO 출처)

진단 F-1/F-2의 해결 설계다. P2 태스크들이 이 문서를 근거로 구현한다. 목표는 단순하다:
**이 산출물이 taxonomy가 아니라 ontology가 되게 하고, 출처를 정직하게 만든다.**

## 1. taxonomy vs ontology — 우리가 채워야 할 것

- **Taxonomy**: 항목을 범주로 분류한 것. 현재 상태(도메인·역할·숙련도 태그 + 부분적 부모 트리).
- **Ontology**: 개념 + **개념 사이의 명시적·유형화된 관계** + (이상적으로) 외부 표준 정렬.

현재 부족분: ① 수평 관계(`related_skills`) 0%, ② 외부 표준 정렬(`esco_broader`/`esco_uri`)
부재 또는 위조. 이 문서가 ①②의 데이터 모델과 생성 규칙을 정의한다.

## 2. 관계 모델 (`related_skills`의 격상)

### 2.1 관계 유형 (엣지 타입)

| 유형             | 의미                      | 방향성     | 예                                       |
| ---------------- | ------------------------- | ---------- | ---------------------------------------- |
| `prerequisite`   | A를 배우려면 B가 선행     | 유향 (A→B) | "역운동학" → "선형대수 기초"             |
| `co_required`    | 현장에서 함께 요구        | 무향(대칭) | "비전 캘리브레이션" ↔ "좌표계 변환"      |
| `specialization` | A가 B의 구체화/하위       | 유향 (A→B) | "협동로봇 안전설정" → "로봇 안전 일반"   |
| `cross_domain`   | 도메인 경계를 잇는 브리지 | 무향       | "디지털트윈 동기화" ↔ "센서 데이터 수집" |

### 2.2 권장 스키마

`related_skills`를 단순 `string[]`에서 유형 있는 엣지 배열로 격상한다.

```ts
export type RelationType =
  | "prerequisite"
  | "co_required"
  | "specialization"
  | "cross_domain";

export interface SkillRelation {
  target: string;        // 대상 skill_id (반드시 데이터에 존재)
  type: RelationType;
  weight?: number;       // 0~1, 관계 강도(선택)
}

// RobotSkill 내부
related_skills: SkillRelation[];   // 기존 string[] → SkillRelation[]
```

### 2.3 마이그레이션 노트 (하위호환)

- 화면/검증기가 기존 `string[]`을 가정하는 곳이 있으면, 우선 `SkillRelation`로 바꾸되
  읽는 쪽을 함께 수정한다(단일 출처이므로 영향 범위가 작다).
- 점진적 전환이 필요하면 한 릴리스 동안 `related_skill_ids?: string[]`(파생, 읽기 전용)을
  병행 제공한 뒤 제거한다.

## 3. 관계 생성 휴리스틱 (생성기 규칙)

`scripts/generate-robot-smartfactory-data.py`가 아래 규칙으로 엣지를 산출한다. 모든 무향
관계는 **대칭으로 양쪽에** 기록한다.

1. **부모-자식 → specialization**: `parent_skill_id`가 있으면 자식→부모 `specialization` 엣지.
   (이미 56% 부모가 있으니 즉시 확보 가능.)
2. **같은 도메인 인접 숙련도 → prerequisite**: 동일 도메인에서 LV(n)인 스킬은 같은 계열의
   LV(n-1) 스킬을 `prerequisite`로 후보 연결(라벨/키워드 유사도로 후보 좁히기).
3. **역할 공유 + 동일 도메인 → co_required**: 같은 도메인에서 `role_mapping`이 겹치고 숙련도가
   비슷하면 `co_required` 후보.
4. **도메인 브리지 → cross_domain**: 사전 정의한 도메인 쌍(예: digital-twin ↔ machine-vision,
   AMR ↔ industrial-robot-control)에서 대표 스킬을 소수 연결.

**커버리지 목표(게이트)**: 고립 노드 0, 스킬당 평균 관계 ≥ 2, dangling(미존재 ID) 0.
과연결(노이즈)도 경계 — 스킬당 상한(예: ≤ 8)을 둔다.

> 주의: 휴리스틱은 *후보*를 만든다. 가능하면 도메인 전문가 검수 1패스를 거치는 게 이상적이며,
> 자동 생성분은 `weight`나 별도 플래그로 "자동/검수됨"을 구분할 수 있다.

## 4. ESCO 출처 정직화 (둘 중 하나를 명시적으로 선택)

핵심 원칙: **`data.europa.eu/esco` 네임스페이스는 실제 ESCO 자원에만 쓴다.**

### 옵션 A — 실제 ESCO 매핑 (정합성 최상, 비용 높음)

- ESCO API/덤프에서 라벨·설명 기반으로 후보를 찾아 매핑하고, 매핑 신뢰도 등급을 부여.

```ts
esco_mapping: {
  uri: string | null;             // 실제 ESCO UUID URI (없으면 null)
  confidence: "exact" | "broad" | "narrow" | "none";
  matched_label?: string;
} | null;
```

- 화면에는 "ESCO: <라벨> (신뢰도 broad)"처럼 등급을 함께 노출. 매핑이 없으면 "미매핑".

### 옵션 B — 정직한 내부 URN (저비용, 즉시 가능 · 권장 출발점)

- 내부 식별자임을 드러내는 네임스페이스로 전환하고, `esco_uri`는 실재 매핑이 있을 때만 채움.

```
internal_uri: "urn:rsf:skill:irc-0001"     // 우리 식별자 (항상)
esco_uri:     null | "<진짜 ESCO UUID URI>" // 실재 매핑이 있을 때만
```

- 화면 라벨: "내부 식별자" vs "ESCO 매핑". 사용자가 출처를 오해하지 않게 한다.

> 권장: **B로 즉시 정직성을 확보**하고(가짜 ESCO 제거), 이후 A를 점진 적용해 진짜 매핑을 채운다.
> 어느 쪽이든 "ESCO 네임스페이스 + 가짜 슬러그" 조합은 P3-2 검증에서 실패 처리한다.

## 5. 데이터 계약 (요약)

```ts
export interface RobotSkill {
  skill_id: string; // 내부 PK, 데이터 내 유일
  domain: string; // ROBOT_DOMAINS.key 중 하나
  domain_en: string;
  preferred_label_ko: string;
  preferred_label_en: string;
  description_ko: string;
  description_en: string;
  skill_type: "knowledge" | "skill" | "competence";
  proficiency_level: 1 | 2 | 3 | 4;
  role_mapping: ("operator" | "engineer" | "developer")[];
  parent_skill_id: string | null; // 존재하는 skill_id 또는 null (순환 금지)
  related_skills: SkillRelation[]; // §2.2 — 비어 있으면 P3-1 실패
  // 출처(§4): 옵션 A 또는 B 중 택일하여 구현
  internal_uri?: string; // 옵션 B
  esco_uri: string | null; // 실재 ESCO 매핑일 때만 채움
  esco_mapping?: {
    uri: string | null;
    confidence: string;
    matched_label?: string;
  }; // 옵션 A
  smartfactory_context: string;
}
```

## 6. 불변(데이터 무결성 규칙) — P3 검증으로 강제

- 모든 `parent_skill_id`·`related_skills[].target`은 존재하는 `skill_id`여야 한다(dangling 0).
- `parent_skill_id` 체인에 순환이 없어야 한다.
- 고립 노드(관계 0개) 0, 스킬당 평균 관계 ≥ 2, 스킬당 관계 ≤ 8.
- `esco_uri`가 `data.europa.eu/esco`를 포함하면 가짜 슬러그(`rsf-`) 금지 — 실재 UUID만 허용.
- enum(`skill_type`/`role_mapping`/`proficiency_level`) 값은 계약 범위 내.
