# 일일 작업 로그 자동 아카이빙 — 설계 (기획)

지식 스튜어드 루프와 거버넌스 활동의 **하루치 결과물**을 매일 한 장의 Markdown으로
갈무리해 저장소에 자동 축적하는 시스템의 설계다. 상단은 5초 요약, 하단은 감사
추적용 상세. 사람이 아니라 **결정적 스크립트**가 생성하고, 워크플로가 커밋한다.

## 1. 목적과 원칙

- **하루 = 한 파일**: 날짜 파일명으로 정렬·검색·비교가 쉽다.
- **상단 요약 → 하단 상세**: 대부분은 요약만 보고 넘어가고, 필요할 때만 상세로.
- **결정적 생성**: 같은 날 데이터면 같은 문서. gh/git/`signals.json`에서 사실만 모은다.
- **읽기 전용 기록**: 로그는 SSOT를 바꾸지 않는다. 온톨로지·매핑·발행물과 무관한
  **감사 기록물**이다(§7 거버넌스 예외 참조).
- **자기 완결**: 어제 로그의 데이터를 읽어 **델타(전일 대비 변화)**를 계산한다.

## 2. 무엇을 기록하나 — 데이터 소스

| 항목 | 소스 | 수집 방법 |
| --- | --- | --- |
| 스튜어드 런 | GitHub Actions | `gh run list --workflow "Knowledge Steward" --json event,conclusion,createdAt,url` (당일 필터) |
| 신호 스냅샷 | `.data/steward/signals.json` | `npm run steward:signals` 후 읽기 (actionable/watching·플래그·오버라이드·미매핑·커버리지) |
| PR 활동 | GitHub | `gh pr list --search "created:<날짜>"` / `"merged:<날짜>"` (라벨 steward 우선) |
| main 커밋 | git | `git log --since <날짜> --until <다음날>` |
| 검증 무결성 | 최근 CI/게이트 | steward 런의 단계 결과 요약 |
| 델타 | 전일 로그 데이터 | `governance/daily-log/data/<어제>.json` 읽어 비교 |

## 3. 파일 레이아웃 & 아카이빙

```
governance/daily-log/
├─ README.md                 # 롤링 인덱스 — 최근 N일 링크 + 상태 배지(자동 갱신)
├─ 2026-07-18.md             # 하루치 로그 (사람이 읽는 문서)
├─ 2026-07-17.md
└─ data/
   ├─ 2026-07-18.json        # 같은 날 기계가독 스냅샷 (델타 계산·재현용)
   └─ 2026-07-17.json
```

- 파일명 `YYYY-MM-DD` — 사전식 정렬 = 시간순. 규모가 커지면 `YYYY/MM/DD.md`로 승격.
- `data/*.json`을 함께 남겨 **마크다운을 파싱하지 않고** 델타를 계산한다(견고함).
- **멱등**: 같은 날 재실행 시 그 날짜 파일을 덮어써 최신 상태 반영.

## 4. 문서 구조 (상단 요약 · 하단 상세)

```markdown
# 일일 작업 로그 — 2026-07-18 (토)
> 지식 스튜어드 · AI Factory Skill Fab · 자동 생성 03:40 KST

## 🟢 요약
| 지표 | 오늘 | 전일 대비 |
| --- | --- | --- |
| 스튜어드 런 | 8 (성공 4 / 실패 4) | — |
| 신규 steward PR | 0 | 0 |
| 머지 | 9 | +9 |
| actionable / watching | 0 / 53 | 0 / -0 |
| 역량 커버리지 | 44 / 44 | 0 |

**한 줄 상태**: 🟢 정상 — 루프 상시화 완료, 조치 대기 신호 없음.
**오늘의 조치 필요**: 없음.

---

## 상세

### 🤖 스튜어드 실행
- 08:30 UTC · dispatch · ✅ · actionable 0/watching 53 · [run](…)
- 07:37 UTC · schedule · ❌ · (설정 전 창, claude 단계) · [run](…)
  …

### 🔀 제안·PR 활동
- 머지: #14 Phase D 백로그, #13 B-2, #12 B-3+C, #15 B-1, #10 Phase A …
- 신규 steward PR: 없음

### 📡 신호 스냅샷 (store=file)
- 검수 미완 오버라이드 **39** · 조직 역량 미매핑 **14**
- 플래그: 중복의심 0 · 신규제안 0 · 재정의 0 (actionable 0)

### ✅ 검증·무결성
- validate:data ✓ / test:steward ✓ / test:competency-skill ✓ / build ✓

### 📝 main 커밋 (8)
- `bd21a6e` Phase D 백로그 …
```

원칙: **요약 표 + 한 줄 상태**만으로 그날을 판단할 수 있어야 한다. 색 배지(🟢/🟡/🔴)는
"실패 런 있음·actionable>0·게이트 red" 중 하나라도면 🟡/🔴로 승격.

## 5. 자동 생성기 — `scripts/steward/daily-log.js`

- 입력 인자: `--date YYYY-MM-DD`(기본 오늘 UTC), `--out governance/daily-log`.
- 절차: ① `steward:signals` 실행/읽기 → ② gh로 당일 런·PR 조회 → ③ git으로 당일
  커밋 → ④ `data/<어제>.json` 읽어 델타 → ⑤ md + `data/<오늘>.json` 렌더 → ⑥ README
  인덱스 상단에 오늘 줄 추가/갱신.
- 순수 Node + `gh`/`git` 호출만. 실패 소스는 "수집 불가"로 표기하고 죽지 않는다.
- 테스트: 픽스처 런·PR·signals로 요약 표·델타·배지 승격을 assert (`test:daily-log`).

## 6. 자동 아카이빙 — `.github/workflows/daily-log.yml`

```yaml
on:
  schedule:
    - cron: "40 18 * * *"   # 매일 KST 03:40 (steward 03:23 런 이후)
  workflow_dispatch: {}
permissions:
  contents: write            # 로그 커밋
```

- 스텝: checkout → node/npm ci → `node scripts/steward/daily-log.js` →
  변경 있으면 `git commit -m "docs(log): 일일 로그 <날짜> [skip ci]"` → push.
- **매일(7일)** 실행 — 주말 사람 활동도 기록(steward cron은 평일만).
- steward 런 **이후**에 돌려 그날 신호·PR을 포함한다.

## 7. 거버넌스 예외 — 왜 직접 커밋인가

불변원칙 5는 "모든 변경은 드래프트 PR"이다. 그러나 일일 로그는 **온톨로지·매핑·
발행물이 아니라 감사 기록물**이며, 매일 PR을 여는 것은 노이즈다. 따라서:
- 로그는 `governance/daily-log/`에 **직접 커밋**하되 `[skip ci]`로 CI 루프를 막는다.
- 이 예외는 **로그 파일 경로에 한정**한다(SSOT는 여전히 PR 경유).
- CLAUDE.md에 이 예외를 명문화한다.

## 8. 구현 로드맵

1. `scripts/steward/daily-log.js` + `governance/daily-log/README.md` 초기화 + 테스트.
2. `daily-log.yml` 워크플로 — `workflow_dispatch`로 3회 시험 생성 후 schedule 활성화
   (steward 롤아웃과 동일 규율).
3. CLAUDE.md에 로그 직접 커밋 예외·명령 추가.
4. (선택) 주간 롤업 `governance/weekly-log/` — 7일 요약 자동 집계.

## 부록. 확장 아이디어

- **주간/월간 롤업**: 일일 데이터(`data/*.json`)를 집계해 추세 그래프(발행물에 임베드).
- **리드타임 지표**: 신호 등장 → 제안 PR → 머지까지 시간을 로그에서 산출(성공지표 §9).
- **Slack/Telegram 요약 푸시**: 그날 로그의 요약 블록만 채널로.
