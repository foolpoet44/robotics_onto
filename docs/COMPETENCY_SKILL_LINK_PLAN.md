# 역량 ↔ 스킬 연결 보완 계획

직무역량평가(`employee-competency-assessments.json`)를 스킬 온톨로지
(`robot-smartfactory.json`)에 정식·검증된 데이터 계층으로 연결하여,
"직원의 보유/부족 역량 → 관련 스킬 → 커리큘럼 과목" 경로를 완성한다.

## 1. 배경 — 왜 필요한가

연결성 점검에서 역량평가는 **4대 도메인(collegeId) 수준으로만** 스킬 체계에
연결되고, 개별 역량 항목(`minorCategory`, 예: "Lean생산방식(TPS)")이 특정
`skill_id`로 매핑되지 않는 것이 가장 약한 고리로 확인되었다. 그 결과
역량평가 결과를 개별 스킬·커리큘럼 과목으로 자동 연결(갭 → 추천)할 수 없었다.

한편 역량 소분류 → 스킬 매핑 자체는 이미
`scripts/generate-competency-skill-map-html.js`의 `directRules`에 30건이
하드코딩돼 있었으나, **HTML/xlsx 발행 스크립트 안에만 존재**하여 정식 데이터가
아니고, `validate:data`·테스트가 검증하지 않으며, 앱이 소비하지 못했다.

## 2. 설계 원칙

- **단일 출처**: 매핑은 `public/data/competency-skill-map.json` 한 곳에만 둔다.
  발행 스크립트·앱·검증기 모두 이 파일을 읽는다.
- **원본 불변**: 273건 역량평가 원본은 수정하지 않고 리졸버로 해석한다
  (스킬↔4대도메인의 `college-resolver` 패턴 승계).
- **명시적 범위외**: 스킬 온톨로지에 대응 스킬이 없는 소분류(영업·경영·마케팅
  등)는 침묵 누락이 아니라 `outOfScope`로 사유와 함께 명시한다.
- **하드 검증**: 존재하지 않는 스킬ID·유령 소분류·미결 소분류는
  `validate:data --strict`에서 실패시킨다.

## 3. 데이터 모델 — `competency-skill-map.json`

```json
{
  "version": "2026-07-17",
  "coverage": { "totalMinorCategories": 44, "mapped": 30, "outOfScope": 14 },
  "mappings": {
    "AI비젼 (Vision)": {
      "skillIds": ["RSF-MVS-001", "RSF-MVS-004", "..."],
      "relation": "direct",
      "note": "매핑 근거"
    }
  },
  "outOfScope": {
    "장비영업": {
      "majorCategory": "Sales",
      "reason": "영업 직무 — 제조 스킬 온톨로지 범위 외"
    }
  }
}
```

- `relation`: `direct`(직접 대응) | `adjacent`(인접·선후행 연결).
- 소분류 44종이 `mappings` 또는 `outOfScope`로 100% 결정된다(미결 0).

## 4. 커버리지 근거

| 구분 | 수 | 비고 |
| --- | --- | --- |
| 매핑됨(mapped) | 30 | 기존 `directRules` 승격, 참조 스킬ID 전부 온톨로지 실재 |
| 범위외(outOfScope) | 14 | Sales/Marketing/경영전략/상품기획/경영기획/디자인/가공(연마) — 대응 스킬 없음, 영향 21/273명 |
| **합계** | **44** | 전체 소분류 = 매핑 + 범위외 (미결 0) |

## 5. 구현 로드맵

### Phase 0 — 정식 매핑 데이터 확립 *(본 PR)*
- `directRules` 30건 → `competency-skill-map.json` 승격.
- 미매핑 14건을 `outOfScope`로 triage(기존 저신뢰 억지매핑 제거).
- 발행 스크립트가 이 파일을 소비하도록 단일 출처화.

### Phase 1 — 리졸버 + 검증 *(본 PR)*
- `app/lib/competency-skill-resolver.ts`: `resolveCompetencySkills(minor)` →
  `mapped | out-of-scope | unknown`, `collectSkillIdsForCompetencies(...)`.
- `app/lib/server-data.ts`: `getCompetencySkillMap()` 로더.
- `validate:data --strict`에 검증 12번 항목 추가(스킬ID 실재·유령 키·중복·
  전수 커버리지). `test:competency-skill` 테스트 7종.

### Phase 2 — 앱 표면 연결 *(후속)*
- 역량 대시보드: 역량 항목별 연결 스킬 링크(`/skills/{id}`) 노출, 범위외 배지.
- 후보자 프로파일(`docs/CANDIDATE_PROFILE_PLAN.md`)의 준비도·갭 산식이 이
  매핑을 데이터 소스로 사용.

### Phase 3 — 갭 → 커리큘럼 추천 *(후속)*
- 부족 역량 → (매핑) 스킬 → 온톨로지 관계망으로 다음 스킬 추천 → 소속
  커리큘럼 과목(중간분류 × 숙련도) 제시. 스킬↔커리큘럼은 이미 무결하므로 이
  마지막 간선만 이으면 역량평가 → 개인화 육성 경로가 관통된다.

## 6. 검증 방법

```bash
npm run validate:data          # 12번 항목: 역량↔스킬 매핑 (mapped/범위외/미결)
npm run test:competency-skill  # 리졸버 7 시나리오
npm run build                  # 앱 컴파일
```
