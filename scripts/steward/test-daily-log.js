#!/usr/bin/env node
// ============================================================================
// daily-log.js 순수 함수 테스트 (test:daily-log)
// ============================================================================
// 외부(gh/git)에 의존하지 않는 판정·델타·렌더 로직을 픽스처로 검증한다.

const { judge, delta, renderMarkdown } = require("./daily-log");

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) passed += 1;
  else { failed += 1; console.error(`  ❌ ${msg}`); }
}

console.log("🧪 daily-log 테스트");

// --- 배지 판정 ---
assert(judge({ available: true, failure: 0 }, { available: true, actionable: 3 }).badge === "🔴",
  "actionable>0 → 🔴");
assert(judge({ available: true, failure: 2 }, { available: true, actionable: 0 }).badge === "🟡",
  "실패 런 있음 → 🟡");
assert(judge({ available: true, failure: 0 }, { available: true, actionable: 0 }).badge === "🟢",
  "무실패·actionable 0 → 🟢");
assert(judge({ available: true, failure: 5 }, { available: true, actionable: 2 }).badge === "🔴",
  "actionable 우선 → 🔴");

// --- 델타 ---
assert(delta(53, 53) === "±0", "동일 → ±0");
assert(delta(55, 53) === "+2", "증가 → +N");
assert(delta(50, 53) === "-3", "감소 → -N");
assert(delta(53, null) === "—", "전일 없음 → —");

// --- 렌더: 요약 상단 + 상세 하단 구조 ---
const snap = {
  date: "2026-07-18",
  generatedAt: "2026-07-18 18:40 UTC",
  verdict: { badge: "🟢", label: "정상" },
  runs: { available: true, total: 1, success: 1, failure: 0, items: [
    { time: "18:23", event: "schedule", conclusion: "success", url: "http://x/1" },
  ] },
  prs: { available: true, mergedCount: 0, createdCount: 0, stewardCreated: [],
    openStewardCount: 0, merged: [], created: [] },
  commits: { commits: [{ sha: "abc1234", subject: "feat: 예시" }], merges: [] },
  signals: { available: true, store: "file", actionable: 0, watching: 53,
    overrides: 39, unmapped: 14,
    coverage: { mapped: 30, outOfScope: 14, unknown: 0, assessmentMinors: 44 },
    flags: { 중복의심: { total: 0, actionable: 0 } } },
};
const md = renderMarkdown(snap, null);
const summaryIdx = md.indexOf("## 🟢 요약");
const detailIdx = md.indexOf("## 상세");
assert(summaryIdx !== -1, "요약 섹션 존재");
assert(detailIdx !== -1, "상세 섹션 존재");
assert(summaryIdx < detailIdx, "요약이 상세보다 위에");
assert(md.includes("| 스튜어드 런 | 1 (성공 1 / 실패 0) |"), "요약 표에 런 집계");
assert(md.includes("**한 줄 상태**: 🟢 정상"), "한 줄 상태 표기");
assert(md.includes("18:23 UTC · schedule · ✅"), "상세에 런 항목");
assert(md.includes("`abc1234` feat: 예시"), "상세에 커밋");

// --- 델타 반영 렌더 ---
const md2 = renderMarkdown(
  { ...snap, signals: { ...snap.signals, watching: 50 } },
  { signals: { watching: 53, overrides: 39, unmapped: 14, coverage: { unknown: 0 } }, prs: { mergedCount: 0 } },
);
assert(md2.includes("-3 (watching)"), "watching 델타 -3 렌더");

console.log(`\n결과: ✅ ${passed} 통과 / ❌ ${failed} 실패`);
process.exit(failed === 0 ? 0 : 1);
