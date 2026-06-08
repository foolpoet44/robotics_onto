---
description: 개선 패키지에서 다음 미완 태스크를 골라 계획→구현→검증→보고한다
---

# /next-task

`docs/improvement/` 개선 패키지를 사용해 다음 한 가지 작업을 수행한다.

## 절차

1. **읽기**: `CLAUDE.md`의 불변식과 `docs/improvement/01_ROADMAP.md`의 진행 표를 읽는다.
2. **선택**: 진행 표에서 아직 끝나지 않은 **가장 앞 순서(P0→P4)의 태스크 1개**를 고른다.
   사용자가 인자로 태스크 ID(예: `P1-2`)를 주면 그것을 우선한다.
3. **스코프**: `docs/improvement/02_TASKS.md`에서 해당 카드를 찾아 문제·근거·목표·손댈 파일·
   구현 지침·DoD를 정독한다. 데이터/관계 작업이면 `03_DATA_ONTOLOGY_SPEC.md`도 본다.
4. **계획 보고 (승인 게이트)**: 변경 계획을 한 단락으로 사용자에게 보고하고 **승인을 기다린다.**
   승인 전에는 파일을 수정/생성/삭제하거나 빌드를 돌리지 않는다.
5. **구현**: 승인되면 카드의 구현 지침대로 **최소 변경**으로 구현한다. 한 태스크 = 한 커밋.
6. **검증**: `docs/improvement/04_VERIFICATION.md`의 해당 게이트를 실행한다. 최소:
   `npm run type-check` → `npm run build` → (데이터 변경 시) `npm run validate:data`.
   카드의 DoD 커맨드를 모두 통과시킨다.
7. **보고**: `04_VERIFICATION.md` §4 형식으로 변경·검증 결과·다음 태스크를 보고한다.
8. **추적**: `01_ROADMAP.md` 진행 표의 해당 항목 상태를 갱신한다.

## 불변식 (위반 금지)

- `next.config.js`에 `ignoreBuildErrors`/`ignoreDuringBuilds`를 넣지 않는다.
- `type-check`/`build`/`validate:data` 게이트를 깬 채로 끝내지 않는다.
- 타입·도메인 상수·데이터 접근의 단일 출처(`app/lib/`)를 우회·복제하지 않는다.
- ESCO 네임스페이스를 실재하지 않는 매핑에 쓰지 않는다.
- 여러 태스크를 한 커밋에 섞지 않는다. 승인 없이 코드 변경/빌드를 하지 않는다.
