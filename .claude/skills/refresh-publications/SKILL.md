---
name: refresh-publications
description: 온톨로지·매핑 변경 후 정적 발행물(커리큘럼·도메인·검토용 HTML)을 재생성하고, 날짜 스탬프가 아닌 실질 내용 드리프트가 있을 때만 재발행 PR을 만든다. 발행물 재생성·재발행 요청 시 사용.
allowed-tools: Bash(npm run generate:domains-html), Bash(npm run generate:curriculum-html), Bash(npm run generate:curriculum-review-html), Bash(git diff:*), Bash(git status:*), Bash(git checkout:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(gh pr:*), Read, Grep, Glob
---

# 역할

너는 AI Factory Skill Fab의 **지식 스튜어드**다(Phase C-3). 진실 원천(온톨로지·
매핑)이 바뀌면 그 파생물인 **정적 발행물**도 신선하게 유지해야 한다. 이 스킬은
발행물을 재생성하고, **실질 내용이 바뀐 경우에만** 재발행 드래프트 PR을 만든다.

## 왜 "날짜만 바뀐 드리프트"를 걸러야 하나 (핵심)

세 생성기는 발행일을 `new Date().toISOString().slice(0,10)`(YYYY-MM-DD)로 HTML에
박아 넣는다. 그래서 **내용이 완전히 같아도 실행일이 다르면 항상 diff가 난다.**
날짜만 바뀐 재생성으로 PR을 만들면 노이즈 PR이 쌓인다 — 반드시 걸러야 한다.

# 트리거

- 온톨로지·매핑을 바꾼 steward PR이 **머지된 뒤** 수동 호출, 또는
- steward 루프 시작 시 "지난 실행 이후 main 에 온톨로지/매핑 diff 존재" 감지 시.

대상 SSOT: `public/data/robot-smartfactory.json`·`college-mapping.json`·
`college-subcategories.json`·`competency-skill-map.json`(존재 시)·`organizations/*`.

# 절차

## 1. 재생성 (결정론 확보)

작업 트리가 깨끗한지 먼저 확인(`git status`). 그다음 세 생성기를 모두 돌린다:

```
npm run generate:domains-html
npm run generate:curriculum-html
npm run generate:curriculum-review-html
```

## 2. 드리프트 판별 — 날짜 vs 실질 내용

```
git diff --stat public/
git diff public/
```

각 변경 HTML에 대해 diff 를 본다:
- **바뀐 줄이 발행일 날짜(`발행일 YYYY-MM-DD`·`(YYYY-MM-DD)` 패턴)뿐**이면
  → **내용 드리프트 없음.** 그 파일은 `git checkout -- <file>`로 원복한다.
- 발행일 외 라인(스킬·과목·매핑·수치·구조)이 바뀌었으면 → **실질 드리프트.**
  재발행 대상으로 유지한다.

**모든 변경이 날짜뿐이면**: 아무 PR도 만들지 않고 "내용 드리프트 없음(날짜만)"으로
보고하고 종료. 발행물을 모두 원복해 작업 트리를 깨끗이 남긴다.

## 3. 실질 드리프트가 있으면 재발행 PR

브랜치 `steward/refresh-publications-<YYYYMMDD>`(없으면 생성). 실질 변경 파일만
스테이징한다(날짜만 바뀐 파일은 이미 원복됨).

```
npm run validate:data && npm run build
git add public/<변경된 발행물들>
git commit   # Co-Authored-By 트레일러
git push -u origin <branch>
gh pr create --draft --label steward
```

동일 주제 열린 steward PR이 있으면 새 PR 대신 그 브랜치에 갱신 커밋.

# PR 본문

```markdown
## 🤖 지식 스튜어드 — 발행물 재발행 (C-3)

**계기** <머지된 온톨로지/매핑 변경 PR 번호 또는 감지된 SSOT diff>
**재발행 대상** (날짜 스탬프 제외 실질 드리프트)
| 발행물 | 실질 변경 요약 |
| --- | --- |
| domains-map.html | 신규 스킬 N건 반영 · 도메인 트리맵 면적 변화 |

**검증** validate:data ✓ / build ✓
※ 날짜만 바뀐 파일은 제외(노이즈 방지).
```

# 절대 금지

- SSOT(온톨로지·매핑) 수정 — 이 스킬은 **발행물만** 다룬다.
- 날짜만 바뀐 드리프트로 재발행 PR 생성.
- 발행물을 손으로 편집(반드시 생성기 재생성으로만).
- 게이트 미통과 커밋 또는 자가 머지.
