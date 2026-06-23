# 02 · 태스크 카드 (실행 명세)

각 카드는 Claude Code가 단독으로 집어 실행할 수 있도록 **문제 → 근거 → 목표 → 손댈 파일 →
구현 지침 → DoD(검증)** 형식을 따른다. 카드 1개 = 커밋 1개(원칙). 구현 전 변경 계획을
사람에게 보고하고 승인받는다(`CLAUDE.md` 4항).

> 표기: DoD의 `$` 줄은 그대로 실행해 통과를 확인할 검증 커맨드다.

---

## P0-1 · RobotSkill 중복 제거

- **문제**: `RobotSkill` 인터페이스가 `app/lib/robotics-data.ts`와 `app/page.tsx`에 이중 정의.
  홈은 lib의 로더/상수를 안 쓰고 fetch·도메인 목록·도메인명 맵을 인라인 재구현.
- **근거**: 진단 F-4.
- **목표**: 타입·도메인 상수·데이터 접근의 단일 출처를 `app/lib/robotics-data.ts`로 통일.
- **손댈 파일**: `app/page.tsx` (그리고 필요 시 `app/lib/robotics-data.ts`에 헬퍼 추가).
- **구현 지침**:
  1. `app/page.tsx` 상단의 인라인 `interface RobotSkill {...}` 삭제 →
     `import { RobotSkill, ROBOT_DOMAINS, loadRobotSkills, getDomainName } from "./lib/robotics-data";`
  2. 인라인 `domains` 배열·`domainNames` 맵을 `ROBOT_DOMAINS`/`getDomainName`로 대체.
  3. 인라인 `fetch("/data/...")`를 `loadRobotSkills()` 호출로 대체.
  4. 통계 계산 로직은 유지하되, lib에 `computeStatistics(skills)` 헬퍼로 추출하면 재사용성↑(선택).
- **DoD**:
  - `app/page.tsx`에 `interface RobotSkill`이 더 이상 없다.
  - `$ grep -rn "interface RobotSkill" app/` → `app/lib/robotics-data.ts` 한 곳만.
  - `$ npm run type-check` → 0 에러
  - `$ npm run build` → 성공

---

## P0-2 · 조직 카드 카운트 파생화

- **문제**: `organizations/page.tsx` 카드가 `enablerCount: 3, skillCount: 29`를 하드코딩.
- **근거**: 진단 F-4.
- **목표**: 표시 수치를 조직 JSON에서 파생. 데이터가 바뀌면 화면도 따라 바뀐다.
- **손댈 파일**: `app/organizations/page.tsx`, `app/lib/organization-data.ts`.
- **구현 지침**:
  1. `organization-data.ts`에 `listOrganizations()`(메타 + 파생 카운트 반환) 또는
     `countEnablersAndSkills(org)` 헬퍼 추가.
  2. P1 이후라면 빌드 타임에 JSON을 읽어 카운트를 계산. P1 이전이면 최소한 단일 출처 상수에서
     읽도록 정리(하드코딩 리터럴 제거).
- **DoD**:
  - 카드 수치가 `public/data/organizations/robot-solution.json`의 실제 enabler/skill 수와 일치.
  - `$ grep -n "skillCount: 29\|enablerCount: 3" app/organizations/page.tsx` → 결과 없음.
  - `$ npm run type-check && npm run build` → 통과

---

## P0-3 · 공유 Loading / Empty / Error 컴포넌트

- **문제**: 페이지마다 로딩·실패 처리가 제각각. 홈은 실패 시 빈 화면("0개")으로 _조용히 실패_.
  도메인 상세는 `.catch`가 없다.
- **근거**: 진단 F-6(에러 UX), F-3.
- **목표**: 공유 상태 컴포넌트 3종으로 모든 데이터 화면의 로딩/빈/에러를 명시적으로 표현.
- **손댈 파일**: 신규 `app/components/{LoadingState,EmptyState,ErrorState}.tsx`,
  그리고 각 페이지에 적용.
- **구현 지침**:
  1. 세 컴포넌트는 메시지/아이콘을 prop으로 받는 단순 표현 컴포넌트.
  2. 데이터 로드 실패 시 `ErrorState`(재시도 안내 포함), 결과 0건 시 `EmptyState`를 렌더.
  3. 모든 데이터 페이지의 fetch에 실패 경로(`catch`)를 둔다. 절대 빈 화면+0으로 끝내지 않는다.
- **DoD**:
  - 네트워크 차단 상태에서 각 페이지가 명시적 에러 메시지를 보인다(빈 "0개" 아님).
  - `$ grep -rn "\.catch\|ErrorState" app/` → 모든 데이터 페이지가 실패 경로를 가진다.
  - `$ npm run type-check && npm run build` → 통과

---

## P0-4 · tsconfig target es2020

- **문제**: `target: "es5"` — 과도하게 낮아 번들이 커지고 다운레벨 변환이 불필요.
- **근거**: 진단 F-6.
- **목표**: `target`을 `es2020`(또는 `es2021`)으로 상향.
- **손댈 파일**: `tsconfig.json`.
- **구현 지침**: `compilerOptions.target`을 `"es2020"`으로. `downlevelIteration`은 유지해도 무방.
- **DoD**:
  - `$ npm run type-check` → 0 에러
  - `$ npm run build` → 성공 (라우트 표 정상)

---

## P1-1 · 빌드 타임 데이터 접근

- **문제**: 런타임 상대 경로 `fetch("/data/...")`로 모든 데이터를 클라이언트에서 받음.
- **근거**: 진단 F-3.
- **목표**: 데이터를 빌드 타임에 확보(직접 import 또는 서버에서 `fs` 읽기). 로더를 lib에 일원화.
- **손댈 파일**: `app/lib/robotics-data.ts`, `app/lib/organization-data.ts`, 각 페이지.
- **구현 지침**:
  1. 서버 컴포넌트에서 쓸 동기/비동기 로더를 추가: 예) `getAllSkills()`가
     `import data from "@/public/data/robot-smartfactory.json"` 또는
     `fs.readFile(path.join(process.cwd(), "public/data/..."))`로 읽어 타입을 부여해 반환.
  2. `resolveJsonModule`은 이미 켜져 있으므로 직접 import도 가능(빌드에 굽힘).
  3. 클라이언트 전용 상호작용이 데이터를 필요로 하면, 서버에서 props로 내려준다(P1-3과 연계).
  4. 기존 `loadRobotSkills`(클라이언트 fetch)는 P1-3 완료 후 제거하거나 아일랜드 전용으로 한정.
- **DoD**:
  - 데이터 페이지의 초기 HTML에 스킬/도메인 텍스트가 포함된다.
    `$ npm run build && grep -c "산업용 로봇 제어" .next/server/app/domains.html` (또는 RSC payload) > 0
  - `$ npm run type-check && npm run build` → 통과

---

## P1-2 · generateStaticParams

- **문제**: `domains/[domain]`, `organizations/[orgId]`가 `ƒ Dynamic`(요청 시 렌더)로 남음.
  파라미터 집합이 유한·고정인데 정적 생성을 안 함.
- **근거**: 진단 F-3(빌드 라우트 표).
- **목표**: 두 동적 라우트를 빌드 타임 정적 생성.
- **손댈 파일**: `app/domains/[domain]/page.tsx`, `app/organizations/[orgId]/page.tsx`.
- **구현 지침**:
  1. 각 라우트에 `export function generateStaticParams()` 추가 — 도메인 키(`ROBOT_DOMAINS`)와
     조직 ID(데이터에서 열거)를 반환.
  2. 페이지를 서버 컴포넌트로 전환(또는 서버 셸 + 클라이언트 아일랜드, P1-3).
- **DoD**:
  - `$ npm run build` 라우트 표에서 `domains/[domain]`, `organizations/[orgId]`가
    `ƒ Dynamic`이 아니라 정적(예: `● SSG`)으로 표기된다.
  - `$ npm run type-check && npm run build` → 통과

---

## P1-3 · 서버/클라이언트 아일랜드 분리

- **문제**: 페이지 전체가 `"use client"`라 콘텐츠가 초기 HTML에 없음.
- **근거**: 진단 F-3.
- **목표**: 데이터·콘텐츠는 서버 컴포넌트가 렌더, 검색/필터 등 상호작용만 작은 클라이언트
  아일랜드로 격리.
- **손댈 파일**: 각 페이지 + 신규 `*Filters`/`*Search` 클라이언트 컴포넌트.
- **구현 지침**:
  1. 예: `app/page.tsx`는 서버에서 전체 스킬·통계를 렌더. 검색·필터 칩만
     `app/components/SkillFilters.tsx`(`"use client"`)로 분리해 props로 데이터 주입.
  2. `useParams` 대신 서버 컴포넌트의 `params` 인자를 사용(동적 라우트).
  3. 상호작용 아일랜드는 최소 표면적으로.
- **DoD**:
  - 페이지 최상단 `"use client"`가 콘텐츠 컴포넌트에서 사라지고, 아일랜드에만 남는다.
  - JS 비활성 상태에서도 콘텐츠가 보인다(상호작용만 비활성).
  - `$ npm run type-check && npm run build` → 통과

---

## P2-1 · 관계 의미론 정의

- **문제**: `related_skills`가 의미 없는 빈 배열. 관계의 *종류*가 없다.
- **근거**: 진단 F-1. 설계: `03_DATA_ONTOLOGY_SPEC.md`.
- **목표**: 관계 엣지에 유형을 부여하는 데이터 모델 확정(스펙 문서 §2).
- **손댈 파일**: `app/lib/robotics-data.ts`(타입), `docs/improvement/03_DATA_ONTOLOGY_SPEC.md`(확정).
- **구현 지침**: 스펙의 `SkillRelation` 모델을 타입에 반영. 하위호환을 위해 단순 ID 배열과
  병행 가능한 형태로 설계(스펙 §2.3 마이그레이션 노트 참조).
- **DoD**:
  - 타입이 관계 유형을 표현한다. `$ npm run type-check` → 0 에러.
  - 스펙 문서의 모델 섹션이 "확정"으로 표시됨.

---

## P2-2 · 관계 생성 로직

- **문제**: 생성기가 엣지를 만들지 않음(0%).
- **근거**: 진단 F-1.
- **목표**: 생성기가 근거 기반으로 관계 엣지를 산출. 고립 노드 0, 스킬당 평균 ≥ 2 관계.
- **손댈 파일**: `scripts/generate-robot-smartfactory-data.py`(+ 재생성된 JSON).
- **구현 지침**: 스펙 §3의 휴리스틱(같은 도메인 인접 숙련도, 부모-자식, 역할 공유,
  도메인 간 브리지)으로 엣지 생성. 대칭성 유지. 생성 후 `validate:data` 통과 확인.
- **DoD**:
  - `$ python3 -c "import json;d=json.load(open('public/data/robot-smartfactory.json'));import sys;e=sum(len(s['related_skills']) for s in d);print('edges',e);print('isolated',sum(1 for s in d if not s['related_skills']))"`
    → edges > 0, isolated == 0
  - `$ npm run validate:data` → 통과
  - dangling 참조 0(검증기 #6).

---

## P2-3 · ESCO 출처 정직화

- **문제**: `esco_uri` 100%가 ESCO 네임스페이스를 빌린 가짜 슬러그.
- **근거**: 진단 F-2. 설계: 스펙 §4.
- **목표**: 출처를 정직하게. (a) 실제 ESCO 매핑 + 신뢰도 등급, 또는 (b) 내부 URN으로 전환하고
  `esco_uri`는 실재할 때만 채움(없으면 `null`).
- **손댈 파일**: `scripts/...py`, 타입(`robotics-data.ts`), 화면(출처 라벨).
- **구현 지침**: 스펙 §4의 선택지 중 하나를 명시적으로 택해 구현. 화면에는 "내부 식별자" /
  "ESCO 매핑(신뢰도 X)"를 구분 표기.
- **DoD**:
  - ESCO 네임스페이스를 쓰는 URI는 실재 매핑만 남는다(가짜 슬러그 0).
    `$ python3 -c "import json;d=json.load(open('public/data/robot-smartfactory.json'));print(sum(1 for s in d if 'data.europa.eu/esco' in (s.get('esco_uri') or '') and 'rsf-' in (s.get('esco_uri') or '')))"` → 0
  - `$ npm run validate:data` → 통과(P3-2 검사 포함 시).

---

## P2-4 · 관련 스킬 화면 반영

- **문제**: 관계가 생겨도 화면에 노출이 없으면 사용자 가치가 0.
- **근거**: 진단 F-1.
- **목표**: 스킬/도메인 상세에 "관련 스킬"을 관계 유형과 함께 노출(서버 렌더).
- **손댈 파일**: `app/domains/[domain]/page.tsx` 등.
- **구현 지침**: 관계 유형별 그룹핑(선수/동반/특화). 클릭 시 해당 스킬로 이동.
- **DoD**:
  - 상세 페이지 초기 HTML에 관련 스킬 링크가 포함된다.
  - `$ npm run type-check && npm run build` → 통과

---

## P3-1 · 관계 실질 검사

- **문제**: 검증기가 빈 관계망에 초록불(거짓 안심).
- **근거**: 진단 F-5.
- **목표**: 비어 있으면 **실패**. 고립 노드 0, 양방향 대칭 권장 점검.
- **손댈 파일**: `scripts/validate-robot-data.js`.
- **구현 지침**: related_skills 커버리지 임계값(예: 평균 ≥ 2, 고립 0)을 `errors`로 승격.
  A→B면 B→A 누락 시 `warnings`.
- **DoD**:
  - 일부러 빈 배열로 만든 픽스처에서 검증기가 **비정상 종료(exit ≠ 0)**.
  - 정상 데이터에서 `$ npm run validate:data` → 통과.

---

## P3-2 · URI 진위/네임스페이스 검사

- **문제**: `esco_uri`를 존재만 검사, 진위 미검사.
- **근거**: 진단 F-5, F-2.
- **목표**: ESCO 네임스페이스 + 가짜 슬러그 조합이면 실패. 내부 URN 규칙 검사.
- **손댈 파일**: `scripts/validate-robot-data.js`.
- **구현 지침**: 스펙 §4의 규칙을 검사로 코드화.
- **DoD**:
  - 가짜 `rsf-` ESCO URI 픽스처에서 검증기 exit ≠ 0.
  - `$ npm run validate:data` → 통과(정직화된 데이터에서).

---

## P3-3 · 사이클·일관성 검사

- **문제**: `parent_skill_id` 순환·enum 일관성 미점검.
- **근거**: 진단 F-5(확장).
- **목표**: 부모 체인 순환 탐지, 역할/숙련도/타입 enum 검증.
- **손댈 파일**: `scripts/validate-robot-data.js`.
- **DoD**:
  - 순환을 심은 픽스처에서 exit ≠ 0. 정상 데이터 통과.

---

## P3-4 · 게이트 연결 (pre-commit / CI)

- **문제**: 검증/타입체크가 사람 기억에 의존.
- **근거**: 진단 F-5, 불변식.
- **목표**: `type-check` + `validate:data` + `build`를 자동 게이트로 묶음.
- **손댈 파일**: `.husky/`(또는 간단한 git hook), 그리고/또는 `.github/workflows/ci.yml`.
- **구현 지침**: pre-commit에서 `type-check`+`validate:data`, CI에서 3종 모두.
- **DoD**:
  - 게이트가 실패하면 커밋/머지가 막힌다(로컬 훅 또는 CI 로그로 확인).

---

## P4-1 · 접근성

- **목표**: 검색 인풋 `<label>`(혹은 `aria-label`), 전역 skip-link, 포커스 가시성, 색 대비.
- **손댈 파일**: `app/layout.tsx`, 검색 인풋 포함 페이지, `globals.css`.
- **DoD**: 키보드만으로 전 페이지 탐색·검색 가능. axe/Lighthouse a11y 경고 0(주요 항목).

## P4-2 · 스타일 일관성

- **목표**: globals.css 전역 클래스와 styled-jsx 혼재를 단일 체계로 통일(권장: 토큰화된
  globals + 페이지 모듈). 디자인 토큰(색/간격) 정리.
- **DoD**: 한 가지 스타일링 방식으로 수렴. 시각 회귀 없음(육안 확인).

## P4-3 · README 데이터 단일 출처

- **목표**: 스킬 수 등 수치를 데이터/검증기 출력에서 가져오거나, "검증기 출력이 진실"임을 명시.
- **DoD**: README 수치가 실제 데이터와 일치.

## P4-4 · (선택) 관계 시각화

- **목표**: P2의 엣지를 네트워크 그래프로. **클라이언트 아일랜드**로만, `dynamic(..,{ssr:false})`
  - ErrorBoundary로 감싼다(ESCON의 SSR 붕괴 교훈).
- **DoD**: 그래프 컴포넌트 오류가 페이지 전체를 죽이지 않는다(경계 격리). 빌드 통과.
