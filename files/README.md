# 개선 패키지 사용법 (robotics_onto Improvement Harness)

이 폴더는 `robotics_onto` 저장소를 비평가 관점에서 진단한 결과와, 그것을 **Claude Code가
스스로 집어 실행할 수 있도록** 만든 실행 명세의 묶음이다. 사람이 한 줄씩 지시하지 않아도,
Claude Code가 이 문서들을 읽고 다음 할 일을 고르고, 구현하고, 스스로 검증하고, 보고하도록
설계했다.

## 설치 (저장소에 떨구기)

이 패키지의 파일들은 저장소 루트 기준 경로를 그대로 미러링한다. 아래처럼 병합한다.

```
robotics_onto/
├── CLAUDE.md                         ← 패키지의 CLAUDE.md (기존에 없으면 그대로, 있으면 병합)
├── .claude/
│   └── commands/
│       └── next-task.md              ← /next-task 슬래시 커맨드
└── docs/
    └── improvement/
        ├── README.md                 ← (이 파일)
        ├── 00_DIAGNOSIS.md
        ├── 01_ROADMAP.md
        ├── 02_TASKS.md
        ├── 03_DATA_ONTOLOGY_SPEC.md
        └── 04_VERIFICATION.md
```

## 읽는 순서

1. **`CLAUDE.md`** — 불변식과 작업 사이클. (반드시 먼저)
2. **`00_DIAGNOSIS.md`** — 무엇이 왜 문제인지. 증거는 모두 실측이다.
3. **`01_ROADMAP.md`** — 어떤 순서로 고칠지(P0→P4). 의존 관계 포함.
4. **`02_TASKS.md`** — 실제로 무엇을 어떻게 손댈지. 카드 단위.
5. **`03_DATA_ONTOLOGY_SPEC.md`** — 가장 어려운 부분(관계망·ESCO 출처)의 설계.
6. **`04_VERIFICATION.md`** — 끝났는지 어떻게 아는지.

## Claude Code로 시작하기

가장 간단한 시작:

```
/next-task
```

또는 자연어로:

> `docs/improvement/`의 개선 패키지를 읽고, ROADMAP에서 아직 끝나지 않은 가장 앞 순서의
> 태스크 1개를 골라. 변경 계획을 먼저 보고하고 승인받은 뒤 구현하고, 카드의 DoD를
> 검증 커맨드로 확인해서 결과를 붙여줘.

## 설계 원칙 (이 패키지가 따른 규율)

- **증거 우선**: 모든 진단에는 실측 수치/파일·라인 근거가 붙는다. 추측은 "가설"로 표시한다.
- **작은 단위**: 태스크는 한 번에 검증 가능한 최소 단위로 쪼갠다(애자일의 thin vertical slice).
- **회귀 금지 게이트**: 모든 변경은 type-check·build·validate:data 게이트를 통과해야 한다.
- **정직성**: 데이터의 출처와 한계를 사용자에게 속이지 않는다(특히 ESCO 매핑).
- **관심사 분리**: 데이터 생성(scripts) / 데이터 계약(lib types) / 표현(app)은 분리한다.
