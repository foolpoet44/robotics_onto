# 04 · 검증 (게이트 · 절차)

"끝났다"의 정의를 코드로 환원한 문서다. 모든 태스크는 여기 정의된 게이트를 통과해야 완료다.

## 1. 3종 핵심 게이트 (매 변경)

```bash
npm run type-check     # tsc --noEmit → 0 에러여야 함
npm run build          # next build → 성공해야 함
npm run validate:data  # 데이터를 건드렸다면 필수 → 통과해야 함
```

> 회귀 금지: 위 셋 중 하나라도 깨지면 그 변경은 미완이다. `ignoreBuildErrors`로
> 우회하는 행위는 불변식 위반(`CLAUDE.md` 2항).

## 2. 단계별 종료 검증

### P0 종료

```bash
grep -rn "interface RobotSkill" app/          # → lib 한 곳만
grep -n "skillCount: 29\|enablerCount: 3" app/organizations/page.tsx   # → 결과 없음
grep -rn "\.catch\|ErrorState" app/           # → 데이터 페이지마다 실패 경로 존재
npm run type-check && npm run build
```

### P1 종료

```bash
npm run build      # 라우트 표에서 [domain],[orgId]가 Dynamic(ƒ)이 아니라 정적이어야 함
# 초기 HTML에 콘텐츠 포함 확인 (예시 — 실제 산출 경로는 빌드 로그로 확인)
grep -rl "산업용 로봇 제어" .next/server/app 2>/dev/null | head
```

### P2 종료 (온톨로지 실질화 — 핵심 측정)

```bash
python3 - <<'PY'
import json
d = json.load(open("public/data/robot-smartfactory.json"))
ids = {s["skill_id"] for s in d}
def edges(s):
    rel = s.get("related_skills", [])
    return [r["target"] if isinstance(r, dict) else r for r in rel]
total = sum(len(edges(s)) for s in d)
isolated = sum(1 for s in d if len(edges(s)) == 0)
dangling = sum(1 for s in d for t in edges(s) if t not in ids)
fake_esco = sum(1 for s in d
                if "data.europa.eu/esco" in (s.get("esco_uri") or "")
                and "rsf-" in (s.get("esco_uri") or ""))
print(f"skills={len(d)} edges={total} isolated={isolated} dangling={dangling} fake_esco={fake_esco}")
assert total > 0,        "관계 엣지가 0 — 온톨로지가 비어 있음 (F-1 미해결)"
assert isolated == 0,    "고립 노드 존재"
assert dangling == 0,    "존재하지 않는 skill_id 참조"
assert fake_esco == 0,   "가짜 ESCO URI 잔존 (F-2 미해결)"
print("P2 OK")
PY
npm run validate:data
```

### P3 종료 (검증기가 실질을 잡는지 — 음성 테스트)

```bash
# 일부러 망가뜨린 픽스처로 검증기가 '실패'하는지 확인 (실패해야 정상)
# 예: related_skills를 모두 비우거나, 가짜 esco_uri를 심은 임시 JSON으로 validate 실행 → exit ≠ 0
```

### P4 종료

- 키보드만으로 전 페이지 탐색/검색 가능(수동).
- Lighthouse/axe 접근성 주요 경고 0.
- README 수치 = 실제 데이터.

## 3. (선택) 온톨로지 헬스 스냅샷 스크립트

반복 측정을 위해 `scripts/ontology-health.js`(신규, 선택)를 두면 좋다. 매 P2 작업 후 한 줄로
건강도를 본다.

```js
// node scripts/ontology-health.js
const fs = require("fs");
const d = JSON.parse(
  fs.readFileSync("public/data/robot-smartfactory.json", "utf8"),
);
const ids = new Set(d.map((s) => s.skill_id));
const edges = (s) =>
  (s.related_skills || []).map((r) => (typeof r === "string" ? r : r.target));
const total = d.reduce((a, s) => a + edges(s).length, 0);
const isolated = d.filter((s) => edges(s).length === 0).length;
const dangling = d.flatMap((s) => edges(s)).filter((t) => !ids.has(t)).length;
const withParent = d.filter((s) => s.parent_skill_id).length;
console.table({
  skills: d.length,
  edges: total,
  avgEdges: +(total / d.length).toFixed(2),
  isolated,
  dangling,
  parentCoverage: `${Math.round((withParent / d.length) * 100)}%`,
});
```

## 4. 보고 형식 (태스크 완료 시 사람에게)

각 태스크를 끝내면 아래를 보고한다.

```
[태스크 ID] 한 줄 요약
- 변경: (손댄 파일과 핵심 변경 1~3줄)
- 검증: (실행한 게이트 커맨드와 그 결과 — 통과/수치)
- 영향/위험: (있다면) / 롤백: (되돌리는 법)
- 다음: (이어질 태스크 ID 제안)
```

## 5. 측정된 출발점 (기준선)

개선 전 실측값(이 값들이 개선됐는지 비교의 기준).

| 지표                  | 출발점              |
| --------------------- | ------------------- |
| type-check 에러       | 0                   |
| build                 | 통과 (Next 15.5.18) |
| 총 스킬               | 127                 |
| related_skills 엣지   | 0 (0%)              |
| esco_broader          | 0%                  |
| parent_skill_id       | 56%                 |
| 가짜 ESCO URI         | 127 / 127 (100%)    |
| 정적 생성 동적 라우트 | 0 (둘 다 ƒ Dynamic) |
| 페이지 "use client"   | 전체                |
