# CLAUDE.md — Factory Robotics Skill Map (robotics_onto)

> 이 파일은 Claude Code의 진입점이자 영속 메모리다. 작업을 시작하기 전 항상 이 문서를
> 먼저 읽고, 이어서 `docs/improvement/README.md`의 안내를 따른다.

## 0. 한 문장 정의

이 저장소는 **스마트팩토리 로보틱스 현장 역량을 6개 도메인 · 3개 역할 · 4단계 숙련도로
구조화한 스킬 맵**이다. ESCON 모노리포에서 로보틱스만 떼어내 독립시킨 프로젝트이며,
지향점은 "평평한 분류표(taxonomy)"가 아니라 **관계로 엮인 온톨로지(ontology)**다.

현재 상태는 토대는 깨끗하지만(타입체크 0 에러, 빌드 통과) 그 약속의 절반만 지켜져 있다.
이 패키지의 목적은 나머지 절반 — 관계망, 정직한 출처, 정상적인 렌더링 아키텍처 — 을
채우는 것이다.

## 1. 기술 스택 (실측 기준)

- Next.js **15.5.18** (App Router), React 18.2, TypeScript 5.9 (`strict: true`)
- 외부 런타임 의존성 없음. DB·SDK·시각화 라이브러리 없음 (의도된 미니멀리즘)
- 데이터: `public/data/robot-smartfactory.json` (127개 스킬) + `public/data/organizations/*.json`
- 데이터 파이프라인: `scripts/` (Python 생성기 + Node 검증기)

## 2. 절대 어기면 안 되는 불변식 (Invariants)

작업 중 아래는 **회귀 금지**다. 위반 시 그 변경은 잘못된 것이다.

1. **`next.config.js`에 `ignoreBuildErrors`/`ignoreDuringBuilds`를 다시 넣지 않는다.**
   (전신 프로젝트 ESCON이 이걸로 77개 타입 에러를 숨겼다. 그 길로 돌아가지 않는다.)
2. **`npm run type-check`는 항상 0 에러여야 한다.** 커밋 전 필수 게이트.
3. **`npm run build`는 항상 통과해야 한다.** 깨면 그 작업은 미완이다.
4. **`npm run validate:data`는 항상 통과해야 한다.** 데이터 변경 후 필수.
5. **타입·도메인 상수·데이터 접근 함수의 단일 출처(Single Source of Truth)를 지킨다.**
   `app/lib/`가 정전(正典)이다. 페이지 안에 인터페이스나 fetch 로직을 다시 복제하지 않는다.
6. **출처를 속이지 않는다.** ESCO URI는 실제 ESCO 자원이 아니면 ESCO 네임스페이스를
   쓰지 않는다 (자세한 규칙은 `docs/improvement/03_DATA_ONTOLOGY_SPEC.md`).

## 3. 작업 사이클 (모든 태스크 공통)

```
READ   → docs/improvement/01_ROADMAP.md 에서 다음 미완 태스크 1개를 고른다
SCOPE  → 02_TASKS.md 의 해당 카드를 읽고, 손댈 파일과 DoD를 확인한다
PLAN   → 변경 계획을 사람에게 한 단락으로 보고하고 승인을 받는다 (아래 4항)
BUILD  → 카드의 "구현 지침" 대로 최소 변경으로 구현한다
VERIFY → 카드의 DoD 커맨드를 모두 실행해 통과를 확인한다 (04_VERIFICATION.md)
COMMIT → 의미 단위로 커밋한다. 커밋 메시지에 태스크 ID를 적는다 (예: "P1-2: ...")
```

## 4. 사람 확인 규칙 (중요)

- 코드 파일을 **수정/생성/삭제하거나 빌드를 돌리기 전에는** 변경 계획을 먼저 보고하고
  승인을 받는다. 백그라운드 자동 빌드 금지.
- 단, 읽기(파일 열람, `type-check`, `validate:data` 같은 검증성 실행)는 승인 없이 해도 된다.
- 한 번에 한 태스크. 여러 태스크를 한 커밋에 섞지 않는다.

## 5. 자주 쓰는 명령

```bash
npm run dev            # 개발 서버
npm run build          # 프로덕션 빌드 (게이트)
npm run type-check     # tsc --noEmit (게이트)
npm run validate:data  # 데이터 무결성 검증 (게이트)
npm run generate:data  # Python 데이터 생성기 (스킬 본문 재생성)
npm run generate:raw   # 개별 스킬 JSON 재생성
npm run test:data      # 데이터 스모크 테스트
```

## 6. 글로벌 Definition of Done

어떤 태스크든 아래를 모두 만족해야 "완료"다.

- [ ] `npm run type-check` → 0 에러
- [ ] `npm run build` → 성공
- [ ] (데이터를 건드렸다면) `npm run validate:data` → 통과
- [ ] 불변식(2항) 위반 없음
- [ ] 카드별 DoD(`02_TASKS.md`) 충족
- [ ] 변경 요약 1단락 + 검증 커맨드 출력 첨부 보고

## 7. 패키지 지도

| 파일                                        | 역할                                |
| ------------------------------------------- | ----------------------------------- |
| `CLAUDE.md`                                 | (이 문서) 진입점·불변식·작업 사이클 |
| `docs/improvement/README.md`                | 패키지 사용법, Claude Code 온보딩   |
| `docs/improvement/00_DIAGNOSIS.md`          | 비평가 관점 진단과 증거(실측)       |
| `docs/improvement/01_ROADMAP.md`            | 5단계(P0~P4) 로드맵과 시퀀싱        |
| `docs/improvement/02_TASKS.md`              | 실행 가능한 태스크 카드 + DoD       |
| `docs/improvement/03_DATA_ONTOLOGY_SPEC.md` | 관계망·ESCO 출처 설계 명세          |
| `docs/improvement/04_VERIFICATION.md`       | 검증 절차·게이트·체크 스크립트      |
| `.claude/commands/next-task.md`             | `/next-task` 슬래시 커맨드          |
