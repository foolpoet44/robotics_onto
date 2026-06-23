# 00 · 진단 (비평가 관점)

> 측정 기준 시점에 저장소를 클론하여 정적 분석 + `tsc --noEmit` + `next build`로 직접
> 확인한 결과다. 수치는 모두 실측이며, 파일·라인 근거를 명시한다.

## 총평

robotics_onto는 ESCON에서 분리되며 **올바른 다이어트**를 했다. `ignoreBuildErrors`가 사라졌고,
의존성은 `next`/`react`/`react-dom`만 남았으며, 타입체크는 0 에러, 빌드는 깨끗이 통과한다.
전신 프로젝트의 만성 부채(가려진 타입 에러, 이중 타입 시스템, 동작 불가 실시간 기능)를
대부분 떼어냈다는 점은 분명히 칭찬할 만하다.

그러나 비평가의 임무는 칭찬이 아니라 다음 한 발을 정확히 가리키는 것이다. 핵심 문제는
**"이 프로젝트가 스스로 한 약속을 절반만 지켰다"**로 요약된다. 저장소 이름은 `_onto`
(온톨로지)이고 README와 데이터 스키마는 ESCO 표준 정렬을 표방하지만, 실제 데이터에는
**관계도, ESCO 연결도 없다.** 그리고 Next.js 15를 쓰면서도 그 핵심 가치(서버 컴포넌트·정적
생성)를 전혀 사용하지 않아, 사실상 Next 외피를 두른 클라이언트 SPA로 동작한다.

아래 다섯 가지가 우선순위 순서다.

---

## F-1. 온톨로지가 비어 있다 — 이름값을 못 한다 (★ 최우선 · 실질)

데이터(`public/data/robot-smartfactory.json`, 총 **127개 스킬**)를 전수 분석한 결과:

| 관계 필드                     | 채워진 비율      | 의미                             |
| ----------------------------- | ---------------- | -------------------------------- |
| `related_skills` (수평 연결)  | **0 / 127 (0%)** | 스킬 간 관계망이 **통째로 없음** |
| `esco_broader` (ESCO 상위)    | **0 / 127 (0%)** | ESCO 계층 연결 전무              |
| `parent_skill_id` (수직 부모) | 72 / 127 (56%)   | 트리 일부만 존재                 |

`related_skills`의 총 엣지 수는 **0개**다. 즉 현재 산출물은 **온톨로지가 아니라 잘 태깅된
평면 목록(taxonomy)**이다. 온톨로지를 taxonomy와 구분 짓는 본질 — "개념 사이의 명시적
관계" — 이 0%다. ESCON에서 사람들의 흥미를 끌던 네트워크 그래프가 여기서 불가능한 이유도
이것이다(연결할 엣지가 없다).

**근거**: `scripts/generate-robot-smartfactory-data.py`의 생성 함수가 `esco_broader`를 항상
`None`으로, `related_skills`를 사실상 빈 배열로 산출한다(파라미터는 있으나 채워 호출하지 않음).

---

## F-2. ESCO URI가 100% 가짜다 — 출처를 속이고 있다 (★ 신뢰성)

127개 스킬의 `esco_uri`가 전부 다음 형태다:

```
http://data.europa.eu/esco/skill/rsf-irc-0001
http://data.europa.eu/esco/skill/rsf-irc-0002
...
```

이는 **실제 ESCO 자원이 아니다.** 진짜 ESCO URI는 `rsf-...` 슬러그가 아니라 UUID
(예: `http://data.europa.eu/esco/skill/3457f4f9-xxxx-...`)를 쓴다. 즉 EU 공식 네임스페이스
(`data.europa.eu/esco`)를 빌려와 내부에서 만든 ID를 끼워 넣어, **마치 ESCO에 매핑된 것처럼
보이게** 하고 있다. 스킬 온톨로지의 신뢰는 출처에서 나오는데, 그 출처가 위조돼 있다.

**근거**: `scripts/...py`의 `generate_esco_uri()`가
`f"http://data.europa.eu/esco/skill/rsf-{domain}-{index:04d}"`로 URI를 합성한다.

이건 거짓말을 하려던 게 아니라 "나중에 진짜로 채우겠다"는 placeholder일 가능성이 높다.
그러나 사용자 화면과 데이터에 그대로 노출되는 한, 비평가 관점에서는 **허위 출처**다.
해결책은 `03_DATA_ONTOLOGY_SPEC.md`에서 정의한다(실제 매핑 or 정직한 내부 URN).

---

## F-3. 렌더링 아키텍처가 Next 15를 낭비한다 (★ 엔지니어링)

모든 페이지가 `"use client"`이고, 데이터를 **런타임에 상대 경로로 fetch**한다.

- `app/page.tsx` (700줄, client) → `useEffect`에서 `fetch("/data/robot-smartfactory.json")`
- `app/domains/page.tsx`, `app/domains/[domain]/page.tsx` → 동일 패턴
- `app/organizations/[orgId]/page.tsx` → `fetch("/data/organizations/${orgId}.json")`
- **`generateStaticParams`는 어디에도 없다.**

빌드 결과가 이 문제를 그대로 보여준다:

```
○ /                      (Static)   ← 그러나 내용은 빈 셸, 클라이언트가 다시 fetch
○ /domains               (Static)   ← 동일
ƒ /domains/[domain]      (Dynamic, server-rendered on demand)  ← 정적화 안 됨
ƒ /organizations/[orgId] (Dynamic, server-rendered on demand)  ← 정적화 안 됨
```

결과적으로:

- **초기 HTML에 콘텐츠가 없다** → SEO 약함, 첫 페인트에 "로딩 중..." 깜빡임.
- 도메인은 6개, 조직은 1개로 **유한·고정**인데도 빌드 시 정적 생성하지 않고 요청마다
  서버리스 함수를 깨운다(그마저 빈 셸을 반환).
- 데이터(94KB JSON)를 빌드에 굽지 않고 매번 네트워크로 받는다.

즉 Next 15의 서버 컴포넌트·정적 생성이라는 가장 큰 자산을 통째로 놀리고 있다.
이건 "동작은 한다"의 영역이라 게이트에 안 걸리지만, 제품 품질의 핵심 누수다.

---

## F-4. 단일 출처 위반 — 복제와 드리프트 (유지보수성)

- `RobotSkill` 인터페이스가 **두 곳에 정의**돼 있다: 정전인 `app/lib/robotics-data.ts`와,
  그것을 그대로 복붙한 `app/page.tsx` 상단. 한쪽만 바뀌면 조용히 어긋난다.
- `app/page.tsx`는 `lib`의 `loadRobotSkills`/`ROBOT_DOMAINS`/도메인명 맵을 쓰지 않고
  **fetch·도메인 목록·도메인명 매핑을 인라인으로 재구현**한다. (ESCON에서 chat 라우트가
  llm-client 추상화를 무시했던 것과 같은 결의 안티패턴.)
- `app/organizations/page.tsx`는 카드에 `enablerCount: 3, skillCount: 29`를 **하드코딩**한다.
  지금은 실제 JSON(enablers 3, skills 29)과 우연히 일치하지만, 데이터가 바뀌면 화면이
  거짓을 말하게 된다. 표시값은 데이터에서 파생되어야 한다.

---

## F-5. 검증 게이트가 형태만 보고 실질을 못 본다 (품질 보증의 맹점)

`scripts/validate-robot-data.js`는 6개 검사(스킬 수, 도메인 분포, 타입 분포, 역할, 고아 스킬,
related_skills 상호참조)를 수행한다 — 구조 검증으로는 훌륭하다. 그러나:

- **related_skills가 0%여도 "✅ 모든 related_skills 참조가 유효함"을 출력한다.**
  비어 있으면 검사가 *공허하게 참(vacuously true)*이 되기 때문이다. 관계가 0개인 온톨로지에
  초록불을 켜 준다 → **거짓 안심(false confidence).**
- `esco_uri`는 **존재 여부만** 본다(필수 필드 검사). 진위·네임스페이스는 보지 않는다.
  그래서 F-2의 가짜 URI가 그대로 통과한다.

검증기가 "모양"이 아니라 "의미"를 보도록 끌어올려야, 초록불이 비로소 *번 초록불*이 된다.

---

## F-6. 표면 위생 (낮은 우선순위, 빠른 수선)

- `tsconfig.json`의 `target: "es5"` — ESCON에서 넘어온 유물. 2026년 타깃으로는 과도하게
  낮아 번들이 커진다. `es2020`+ 권장.
- 스타일이 두 방식 혼재: `app/globals.css`의 전역 클래스(홈) vs `styled-jsx`(도메인 페이지).
  일관성 결정 필요.
- 접근성: 검색 인풋에 `<label>` 없음(placeholder만), 전역 skip-link 없음(ESCON엔 있었다).
- 에러 UX 불일치: 홈은 fetch 실패 시 `console.error` 후 빈 화면("0개")을 보여주는
  _조용한 실패_. 도메인 상세는 `.then`에 `.catch`가 아예 없다(조직 상세는 처리함).
  공유 Loading/Empty/Error 컴포넌트가 없어 페이지마다 제각각이다.

---

## 무엇이 이미 좋은가 (회귀시키지 말 것)

- `ignoreBuildErrors` 제거 + `strict: true` 유지 → 컴파일러의 입이 열려 있다.
- 의존성 미니멀리즘 → 공급망·번들·보안 표면이 작다.
- 데이터 생성·검증 파이프라인이 코드로 존재한다(재현 가능성). 검증기는 실질만 보강하면 된다.
- 빌드·타입체크가 깨끗하다. 이 게이트를 **항상 초록으로 유지**하는 것이 최우선 불변식이다.
