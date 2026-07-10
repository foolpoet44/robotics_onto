# 프로젝트 개선 백로그

평가 전용 페이지(`/evaluation`)에 화면으로 노출하던 "평가 목적 적합성 검증"과
"보완사항" 섹션을 화면에서 제거하고, 그 내용을 프로젝트 개선 항목으로 이관해
관리합니다. 평가자는 화면에서 도메인별 스킬 중요도 평가에 집중하고, 적합성
점검과 후속 개선 과제는 이 문서에서 추적합니다.

## 1. 평가 목적 적합성 점검 결과

`/evaluation` 페이지가 평가 전용 목적에 부합하는지 점검한 결과입니다.

| 점검 항목 | 상태 | 설명 |
| --- | --- | --- |
| 도메인만 표시 | 적합 | 스킬, 조직, 역량, 육성, 검수 정보는 제외하고 6개 도메인 요약만 노출합니다. |
| 평가 목적 명확성 | 적합 | 상단 안내와 검증 기준을 통해 도메인 분류 평가용 페이지임을 명시합니다. |
| 데이터 완전성 확인 | 완료 | 도메인별 스킬 수 자동 집계에 더해, 도메인별 중요도 평가 입력/저장 기능을 제공합니다. |

## 2. 개선 항목

- [x] 평가자가 도메인별 의견(중요도·근거)을 남길 수 있는 입력 폼 추가
  - 도메인별 스킬 중요도 5점 척도 평가 + 평가 근거 입력 기능으로 반영
    (`app/components/DomainImportanceRating.tsx`).
- [x] 스킬 평가 전용 페이지 분리 + 로그인 기반 신원 자동 적용 + 라벨 아카이빙
  - `/evaluation/skills` 워크벤치 신설. 사전 지정 평가자 명부 로그인으로 신원을
    자동 적용하고(수기 입력 제거), 평가 라벨을 서버에 아카이빙합니다.
  - 운영은 관리형 DB(`@vercel/postgres`), 로컬은 파일 폴백. 상세는
    `docs/SKILL_EVALUATION_OPERATIONS.md` 참고.
- [ ] 도메인별 대표 스킬 예시를 토글 방식으로 선택 노출해 평가 근거 강화.
- [ ] 육성 트랙 후보자 개인별 프로파일 구축.
  - 구축안 확정: `docs/CANDIDATE_PROFILE_PLAN.md` (Workday·SuccessFactors·
    Degreed·Eightfold·Gloat 벤치마킹, 5블록 화면 설계, 준비도 산식,
    온톨로지 그래프 기반 스킬 추천, P1~P4 로드맵). 구현 승인 대기.
- [ ] Factory Robotics 기능 도메인을 4대 도메인(칼리지) 체계로 재분류.
  - 설계안 확정: `docs/DOMAIN_RECLASSIFICATION_PLAN.md` (2계층 + 스킬 단위
    오버라이드 36건, Agentic AI 갭 분석 포함). 구현은 Phase 1~4 순서로 진행.
  - Phase 1 완료: `skillOverrides` 36건 + 신규 도메인
    `agentic-ai-manufacturing`(21개 스킬) 증설. Phase 2~4 남음.
- [ ] 평가 결과를 `review-decisions` 데이터와 연계해 후속 보완 이력 관리.
  - 스킬 평가 라벨은 서버(DB/파일)에 아카이빙됩니다. 검수 장부와 연계하려면
    `skill_evaluation_labels` → `public/data/review-decisions.json` export
    파이프라인 설계가 필요합니다.
  - ~~도메인 중요도 평가(`DomainImportanceRating`)는 아직 `localStorage` 기반~~
    → 완료: 4대 도메인(메인)+기능 도메인(서브) 계층형 평가로 개편하면서
    서버 아카이빙(`domain_importance_ratings`, 파일 폴백)으로 이관.
    평가자 신원은 로그인 세션 자동 적용, 서브 평가의 스킬 수 가중 롤업을
    메인 카드에 참고치로 표시(괴리 Δ≥1.0 배지).
