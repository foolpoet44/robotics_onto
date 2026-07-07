# 평가 전용 도메인 페이지 직접 확인 가이드

이 문서는 `/evaluation` 페이지 변경사항을 로컬에서 직접 확인하는 절차를 정리합니다.
평가 페이지는 4대 도메인(메인)과 기능 도메인(서브)의 계층형 중요도 평가,
하위 스킬 조회, 도메인 변경요청을 제공합니다.

## 1. 개발 서버로 화면 확인

```bash
npm install
EVAL_SESSION_SECRET=test npm run dev
```

브라우저에서 다음 주소로 접속합니다.

```text
http://localhost:3000/evaluation
```

확인할 항목은 다음과 같습니다.

- 상단 제목이 `도메인 분류 평가 페이지`로 표시되는지 확인합니다.
- **스킬 트리맵**: 4대 도메인 컬럼 4개(면적이 스킬 수 74/30/23/21에 비례)와
  각 컬럼 안의 중간분류 타일(면적이 소속 스킬 수에 비례)이 표시되는지
  확인합니다.
- 중간분류 타일을 클릭하면 아래 패널에 "도메인 › 중간분류" 경로와 소속
  스킬 목록이 열리고, 다른 타일을 클릭하면 패널이 교체되는지 확인합니다.
- **4대 도메인 직접 중요도 평가 UI가 없는지** 확인합니다(기능 종료).
  `axis: "college"`로 API에 저장을 시도하면 400이 반환됩니다.
- 비로그인 상태에서는 변경요청 버튼 대신 "평가자 로그인 후 가능" 안내가
  표시되는지 확인합니다(조회는 자유).
- 평가자 로그인(예: EVAL-001 / `robot01`) 후 스킬별 "도메인 변경요청"
  (기능/4대 도메인 축, 사유 필수)이 접수되고 요청자명이 자동 적용되는지
  확인합니다.
- `/evaluation/functional`에서 기능 도메인 중요도 평가(1~5점)가 저장되는지
  확인합니다.
- 스킬 상세 목록, 조직 정보, 개인 역량 정보, 육성 트랙, 검수 큐가 평가
  화면 안에 표시되지 않는지 확인합니다.

## 2. 프로덕션 빌드로 라우트 생성 확인

```bash
npm run build
```

빌드 출력의 `Route (app)` 목록에 다음 라우트가 포함되어야 합니다.

```text
/evaluation            (ƒ Dynamic — 세션·서버 평가 데이터 사용)
/api/domain-ratings
/api/domain-change-requests
```

## 3. 타입 검사 확인

```bash
npm run type-check
```

## 4. 내비게이션 진입 확인

개발 서버 실행 후 브라우저에서 아무 페이지에 접속한 뒤 상단 내비게이션의 `평가` 메뉴를 클릭합니다.
클릭 후 주소가 `/evaluation`으로 이동하고 평가 전용 페이지가 표시되는지 확인합니다.

## 5. 평가 목적 적합성 체크리스트

| 검증 항목 | 기대 결과 |
| --- | --- |
| 스킬 트리맵 | 4대 도메인 컬럼 × 중간분류 타일, 면적이 스킬 수 비례 |
| 4대 평가 종료 | 직접 평가 UI 없음, API `axis: "college"` 저장 400 |
| 변경요청 | 타일 클릭 → 스킬 목록 → 도메인 변경요청 접수(로그인 필요) |
| 신원 자동 적용 | 로그인 세션에서 요청자·평가자명 자동 적용, 수기 입력 없음 |
| 서버 아카이빙 | 기능 도메인 평가·변경요청이 DB 또는 파일 폴백에 저장 |

적합성 점검 결과와 후속 개선 항목은 `docs/PROJECT_IMPROVEMENTS.md`에서 관리합니다.

## 6. 문제가 있을 때 확인할 파일

- 페이지 구성: `app/evaluation/page.tsx`
- 페이지 스타일: `app/evaluation/page.module.css`
- 스킬 트리맵: `app/components/DomainSkillTreemap.tsx`
- 하위 스킬 조회/변경요청: `app/components/DomainSkillBrowser.tsx`
- 기능 도메인 평가: `app/components/FunctionalDomainRating.tsx`
- 중간분류 데이터: `public/data/college-subcategories.json`
- 평가 저장소/API: `app/lib/domain-rating-store.ts`, `app/api/domain-ratings/route.ts`
- 내비게이션 링크: `app/components/Navigation.tsx`
