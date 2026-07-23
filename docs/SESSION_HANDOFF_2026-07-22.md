# 세션 핸드오프 — AI Factory Skill Fab (2026-07-22 갱신)

> Claude Code 세션들의 작업 맥락을 다음 세션/담당자가 이어받기 위한 핸드오프 문서.
> 저장소: `foolpoet44/robotics_onto` · 프로덕션: https://robotics-onto.vercel.app
> ⚠️ 이 문서 작성 시점 기준이며, 최신 상태는 항상 열린 PR 목록과 origin 브랜치로 확인할 것.

---

## 1. 프로젝트 한 줄 요약

로봇·스마트팩토리 스킬 온톨로지(165개 스킬)를 도메인 중심의 **AI Factory Skill Fab**
플랫폼으로 재편 중. 선임급 핵심 인재 ~30명의 육성 로드맵 기반이 되는 스킬 체계·
커리큘럼·평가 인프라를 만든다. 전문가 회의 반영으로 **4대 도메인 → 3대 도메인
(Physical AI / Agentic AI[DI 편입] / Digital Twin) 전환이 PR로 진행 중**(#25, 미머지).

## 2. 절대 규칙 (CLAUDE.md 불변 원칙 — 위반 금지)

1. `public/data/robot-smartfactory.json`은 생성물 — 직접 편집 금지.
   스킬 추가/수정은 `scripts/generate-robot-smartfactory-data.py`(EXTENSION_SKILLS) → `npm run generate:data`
2. 기존 `skill_id`(URN) 불변. 증설은 도메인 시퀀스 말미에만. `clusterId`도 동일하게 취급(PR #26 원칙)
3. 4대 도메인 재배정은 `npm run record:college-override`로만
4. 역량 매핑은 `competency-skill-map.json` 단일 출처
5. 커밋 전 게이트: `npm run validate:data && npm run build` (예상 경고: 미매핑 조직 역량 14개).
   PR은 드래프트, 머지는 인간
6. 평가 원본(DB·`.data`)은 읽기 전용 시그널
7. 제안 PR에는 시그널 출처(건수·평가자수·기간) 표기
- 예외: `governance/daily-log/`만 PR 없이 직접 커밋 가능
- 스킬 폐기(통합)는 `docs/DEPRECATED_FLAG_SCHEMA_PROPOSAL.md` 스키마 확장 선행 (D-1)
- 접속 코드 평문은 저장소 커밋 금지(sha256 codeHash만) · 생성물 재생성 후 항상 `npx prettier --write`

## 3. 열린 PR 지형과 머지 순서 (핵심)

| PR | 브랜치 | 내용 | 베이스 | 상태 |
| --- | --- | --- | --- | --- |
| **#23** | `feature/pa-skill-clusters` | PA 79개 스킬 → **35개 클러스터** 표시(온톨로지 무변경), 배지·강조 테두리 없음, 스킬평가 링크 | main | 드래프트 |
| **#24** | `docs/expert-meeting-agentic-di-pa` | 전문가 회의록 문서(Agentic·DI·PA) — 감사 기록, 데이터 무변경 | main | 드래프트 |
| **#25** | `feature/aa-workflow-di-merge` | **DI→Agentic 편입(3대 도메인)** + AA 8단계 워크플로우 + 심화 도메인 클러스터. 운영 오너 목업 확인 후 확정됨 | main | 드래프트, **#23 선행 필요** |
| **#26** | `feature/pa-cluster-workbench` | **클러스터 평가 워크벤치 `/evaluation/clusters`** (`cluster_review_ratings` 장부, selected 1급 신호, 스냅샷 보존, read-time 스킬 환원) | **#23 브랜치** | 드래프트, **#23 선행 필요** |
| #9 | claude/session-context-import-prdac2 | 역량↔스킬 매핑 Phase 0·1 — **구버전(베이스가 옛 main)**. 내용이 이미 main에 반영됐는지 대조 후 닫거나 리베이스 필요 | 옛 main | 드래프트·정체 |

**권장 머지 순서: #24(독립) → #23 → #25 → #26** (또는 #23 → #26 먼저).
`preview/integration-all` 브랜치 = #23+#25+#26 통합 프리뷰(검증용, 머지 대상 아님).

### 히스토리 주의 (같은 실수 반복 금지)
- 이 세션에서 사용자 지시로 "검증 클러스터 평가" 1차 구현을 **revert**하고 기존
  스킬평가(/evaluation/skills) 연계로 교체했음(#23의 ae6cb2e→ee6bdc2). 이후 세션에서
  클러스터 평가가 **정식 배포안으로 재설계·확정**된 것이 PR #26 (별도 장부, 스킬평가와
  경로 공존). 즉 "클러스터 단위 평가 자체를 하지 말라"가 아니라 **"기존 스킬평가를
  대체하지 말라"**가 사용자 의도였음.
- PA 화면에서 ★핵심/기초 배지·보라 강조 테두리는 사용자 지시로 제거됨 — 재도입 금지.
- 머지된 PR(#3·#6·#7·#22)은 재사용 금지. 새 작업은 최신 main에서 새 브랜치.
- PR #7 스테일 머지 사고 전례: 머지 후에는 반드시 main에 커밋이 실제 반영됐는지 확인.

## 4. 프로덕션 상태 (main)

- PR #22 머지 완료(`dd417df`): DT 7단계 워크플로우(고민석 회의 반영), 원형 배지 제거,
  RFM/VLA 스킬 증설(RSF-IRC-024/025), 리뷰 수정. 배포 success 확인.
- main에는 야간 daily-log 커밋이 계속 쌓임(`[skip ci]`).

## 5. 운영자(사용자) 측 미결 사항

1. **Vercel 환경설정 미완** — Environment Variables가 **완전히 비어 있음** 확인됨.
   프로덕션 평가 데이터도 그동안 휘발돼 왔음. 안내한 절차:
   Storage→Neon Postgres 생성→프로젝트 연결(**Production/Preview/Development 모두 체크**)
   → `POSTGRES_URL` 존재 확인(DATABASE_URL만 있으면 동값으로 수동 추가)
   → `EVAL_SESSION_SECRET` 추가 → Deployment Protection 해제(또는 Shareable Link)
   → 프리뷰·프로덕션 **Redeploy** → 평가 저장 후 새로고침 유지 확인
2. **박석우 책임 평가**: EVAL-102 / 데모 코드 `expert02`(운영 전환 시 교체).
   평가 동선은 #26 머지 전이면 `/evaluation/skills`, #26 반영 프리뷰면 `/evaluation/clusters`.
   집계: `npm run report:cluster-ratings`(#26).
3. **로컬 teleport 이슈**: 로컬 작업트리 불결 오류 반복 — `git status --porcelain` 확인
   또는 새 클론에서 teleport 안내함. 로컬 main에만 있던
   `docs/STEWARD_AGENT_DEV_PLAN.md`(402줄) 커밋의 원격 반영 여부 확인 필요.
4. 로컬 `.claude/settings.json`의 `Write(...)` 규칙 3건 → `Edit(...)`로 변경 권장(경고만).

## 6. 전문가 회의(Agentic·DI·PA) 핵심 — 반영 현황

상세는 PR #24 문서(`docs/EXPERT_MEETING_2026-07_AGENTIC_DI_PA.md`) 참조.

| 회의 결정 | 반영 상태 |
| --- | --- |
| Agentic 분류를 영역별→업무 플로우형 재편(6단계+멀티에이전트) | **PR #25에 구현됨**(8단계로 세분화: ③을 데이터 확보/툴·모델 개발로 분할) |
| DI를 Agentic에 통합(분석·예측=에이전트의 툴) | **PR #25에 구현·운영 오너 확정** — 더 이상 '보류' 아님 |
| PA 커리큘럼: 초/중/고급 레벨링, RFM/VLA는 동향 수준만, 협동로봇 분류 흡수, 일부 스킬 커리큘럼 제외(협력업체 지원·PLC 연동 등) | **커리큘럼 재편 미착수** — 교육 관점 제외이지 온톨로지 삭제 아님(skill_id 유지). 다음 작업 후보 |
| 육성 구조: T자형 + 기술/비즈니스 리더 트랙 이원화 | 방향 합의만 — 트랙 설계 미착수 |
| 멀티에이전트 갭스킬(아키텍처링·구현·검증) 증설 | 전문가 2인 확인 후 별도 증설 예정(#25 후속) |
| 오프닝 특강: 유영재 교수(트렌드, 김대환 위원 추천)·윤병동 교수(AI 네이티브 팩토리) | 운영자 진행 사항 |

## 7. 다음 단계 (우선순위)

1. (운영자) Vercel 환경설정 완료 → 통합 프리뷰(`preview/integration-all`)에서 박석우 평가 개시
2. PR 리뷰·머지 진행: #24 → #23 → #25 → #26 (머지는 인간)
3. PR #9 처리: main 반영분과 대조해 닫기 또는 리베이스
4. PA 커리큘럼 재편(회의 판정 반영, `scripts/generate-curriculum-html.js`) — 신규 브랜치
5. 박석우 평가 집계 후: 분리유지/재구성 클러스터 재설계, 통합 확정분은 D-1(DEPRECATED
   스키마) 경로 검토
6. 장기: 오버라이드 검수 잔여분, 후보자 프로파일(docs/CANDIDATE_PROFILE_PLAN.md),
   DT 2주차(커리큘럼 산출물·선행역량 필드), 기술/비즈니스 트랙 이원화 설계

## 8. 빠른 참조

- 게이트: `npm run validate:data && npm run build` · `npm run type-check`
- 평가자 명부: `public/data/evaluators.json` (EVAL-101~105 = expert01~05, 데모 —
  docs/SKILL_EVALUATION_OPERATIONS.md)
- 발행물: `npm run generate:*-html` → `public/curriculum-rnd.html` · `domains-map.html` ·
  `curriculum-review.html`
- 시그널: `npm run steward:signals` · 클러스터 평가 집계: `npm run report:cluster-ratings`(#26)
- Vercel: `dks-projects-53a4c0ba/robotics-onto` · 배포 판정은 커밋 status API(curl)로
- UI 목업 확인 패턴: 로컬 `npm run start` + `/opt/pw-browsers/chromium`(playwright-core)
  스크린샷 캡처 → 사용자 전달 (이 세션에서 2회 사용, 유효했음)
