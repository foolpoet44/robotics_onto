# Brownfield Map

## P1 렌더링 경계

- `app/lib/robotics-data.ts`, `app/lib/organization-data.ts`: 브라우저와 서버가 함께 쓰는 타입과 순수 함수.
- `app/lib/server-data.ts`: `public/data/` 파일을 읽는 서버 전용 진입점. 페이지는 데이터 파일 경로를 직접 알지 않는다.
- `app/components/SkillExplorer.tsx`: 홈 검색·필터 상태를 가진 클라이언트 아일랜드.
- `app/components/DomainSkillExplorer.tsx`: 도메인 상세 검색 상태를 가진 클라이언트 아일랜드.
- `app/domains/page.tsx`, `app/organizations/page.tsx`, `app/organizations/[orgId]/page.tsx`: 상태가 없는 서버 컴포넌트.
- `app/domains/[domain]/page.tsx`, `app/organizations/[orgId]/page.tsx`: 유한한 파라미터를 `generateStaticParams`로 빌드 시 생성.

## 유지할 불변식

- `app/lib/`가 타입·도메인 상수·데이터 접근의 단일 출처다.
- 데이터 변경 없이 기존 127개 스킬과 조직 화면 내용을 보존한다.
- 홈과 도메인 상세의 검색·필터 동작을 보존한다.
- `type-check`, `validate:data`, `test:data`, `build`를 모두 통과한다.

## 위험과 대응

- 서버 컴포넌트에 `styled-jsx`를 남기면 클라이언트 경계가 다시 넓어진다. 상태 없는 페이지 스타일은 CSS 모듈로 옮긴다.
- 동적 라우트에서 임의 파일 경로를 읽으면 경로 순회 위험이 생긴다. 조직 ID는 허용 목록으로 제한한다.

## 조직 카탈로그 연결 계약

- 조직 역량 `RS_*`는 기준 온톨로지 `RSF-*`와 목적이 다른 별도 카탈로그다.
- 조직 역량의 원래 ID와 `urn:rsf:org-skill:*` 내부 URI를 유지한다.
- 의미가 충분히 겹치는 항목만 `ontology_skill_id`로 연결하고, 조직 고유 역량은
  `null`로 보존한다. 억지 매핑보다 설명 가능한 미매핑이 더 정확하다.
- `npm run enrich:organization`으로 보정을 반복 적용하고, `npm run
validate:data`의 strict 모드에서 연결 대상과 ESCO 출처 형식을 검증한다.

## 전문가 리뷰 큐

- `npm run generate:review-queue`는 조직 근사 매핑과 `source: "heuristic"`
  관계를 `public/data/review-queue.json`으로 모은다.
- 대칭 관계는 한 번만 보여 검수 중복을 줄인다.
- `/reviews`는 후보를 우선순위별로 보여주는 읽기 전용 작업대다. 승인 저장과
  `reviewed` 승격은 결정 장부 자동화로 다룬다.
- `public/data/review-decisions.json`은 검수 결과의 source of truth다. 정적
  화면에서 직접 쓰지 않고 `npm run apply:review-decisions`로 승인만 원본에
  반영한다.
- 보류와 반려는 후보 원본을 바꾸지 않는다. 승인 관계는 `source:
"reviewed"`로, 승인 조직 근사 매핑은 `ontology_review_status:
"approved"`로 기록한다.
- `npm run record:review-decision -- --item-id ... --status ... --reviewer
...`로 결정 장부를 안전하게 갱신한다.

## 스킬 정의 페이지

- `/skills/[skillId]`는 127개 기준 스킬을 정적 생성한다.
- 정의, 현장 맥락, 숙련도, 역할, 상위 스킬, 관련 스킬과 검수 상태를 한
  페이지에서 보여준다.
- 홈, 도메인, 조직, 검수 큐의 기준 스킬 링크는 상세 페이지로 통일한다.
- Next.js 15의 동적 라우트 `params`는 비동기 계약으로 처리한다.

## 전문가 육성 프레임워크 확장 경계

- 기존 6개 로보틱스 도메인은 스킬 분류 축으로 유지한다.
- 육성 트랙의 전문 영역 프로필은 여러 도메인과 핵심 스킬을 묶는 별도 축이다.
- 후보자의 단계, 직능 역량, 현장 임팩트 과제는 신규 `development-*` 데이터로
  분리한다. 기준 온톨로지와 조직 JSON에 사람 상태를 섞지 않는다.
- 첫 구현은 익명 샘플 데이터 기반 읽기 중심 프로토타입이다. 실제 인사정보는
  인증, 권한, 감사 로그가 설계되기 전까지 정적 JSON에 넣지 않는다.
- 상세 실행 계획은 `tech-expert-development-framework.md`, 검증 기준은
  `tech-expert-development-framework-verification.md`를 따른다.
