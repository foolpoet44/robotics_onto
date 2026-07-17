#!/usr/bin/env node
// ============================================================================
// 일일 작업 로그 생성기 (결정적) — governance/daily-log/<날짜>.md
// ============================================================================
//
// 왜 이 파일이 필요한가
// -------------------
// 스튜어드 루프·거버넌스의 하루치 결과물(런·신호·PR·커밋)을 한 장으로 갈무리해
// 저장소에 축적한다. 상단 요약(5초 판단)·하단 상세(감사 추적). 사람이 아니라
// 결정적 스크립트가 gh/git/signals.json 에서 사실만 모아 렌더한다.
//
// 산출물
//   governance/daily-log/<YYYY-MM-DD>.md      사람이 읽는 로그
//   governance/daily-log/data/<YYYY-MM-DD>.json 기계가독 스냅샷(델타·재현용)
//   governance/daily-log/README.md            data/*.json 로 재생성되는 인덱스
//
// 사용법
//   node scripts/steward/daily-log.js [--date YYYY-MM-DD] [--repo owner/name]
//   npm run daily-log
//
// 설계 근거: docs/DAILY_LOG_PLAN.md
// ============================================================================

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const LOG_DIR = path.join(ROOT, "governance", "daily-log");
const DATA_DIR = path.join(LOG_DIR, "data");

// ----------------------------------------------------------------------------
// 유틸
// ----------------------------------------------------------------------------
function getArg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

// UTC 날짜(YYYY-MM-DD). GitHub Actions·git·gh 모두 UTC 기준이라 UTC 로 통일한다.
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}
function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function weekdayKo(dateStr) {
  const w = ["일", "월", "화", "수", "목", "금", "토"];
  return w[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
}

// 외부 명령을 안전하게 실행 — 실패해도 죽지 않고 null 을 돌려준다(수집 불가 표기용).
function run(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 20 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}
function ghJson(args) {
  const out = run("gh", args);
  if (out == null) return null;
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function detectRepo() {
  const cli = getArg("repo");
  if (cli) return cli;
  const j = ghJson(["repo", "view", "--json", "nameWithOwner"]);
  return j?.nameWithOwner ?? null;
}

// ----------------------------------------------------------------------------
// 수집기
// ----------------------------------------------------------------------------

// 신호 스냅샷 — signals.json 을 읽고, 없으면 수집기를 돌린다.
function collectSignals() {
  const p = path.join(ROOT, ".data", "steward", "signals.json");
  if (!fs.existsSync(p)) {
    // 워크플로는 daily-log 앞에 steward:signals 를 돌리지만, 로컬 대비 안전망.
    try {
      require("./export-signals").main();
    } catch {
      /* 수집 실패는 아래에서 available:false 로 표기 */
    }
  }
  if (!fs.existsSync(p)) return { available: false };
  try {
    const s = JSON.parse(fs.readFileSync(p, "utf-8"));
    const flags = {};
    for (const [k, v] of Object.entries(s.evaluationFlags ?? {})) {
      flags[k] = {
        total: v.length,
        actionable: v.filter((e) => e.actionable).length,
      };
    }
    return {
      available: true,
      store: s.source?.store ?? "?",
      actionable: s.summary?.actionable ?? 0,
      watching: s.summary?.watching ?? 0,
      overrides: (s.pendingOverrideReviews ?? []).length,
      unmapped: (s.organizationUnmapped ?? []).length,
      coverage: s.competencyMap?.coverage ?? null,
      flags,
    };
  } catch {
    return { available: false };
  }
}

// 스튜어드 워크플로 런 — 해당 날짜(UTC)에 생성된 것만.
function collectRuns(repo, date) {
  if (!repo) return { available: false, items: [] };
  const rows = ghJson([
    "run", "list", "--workflow", "Knowledge Steward", "-R", repo,
    "--limit", "60", "--json", "event,conclusion,createdAt,databaseId,url",
  ]);
  if (rows == null) return { available: false, items: [] };
  const items = rows
    .filter((r) => (r.createdAt ?? "").startsWith(date))
    .map((r) => ({
      time: (r.createdAt ?? "").slice(11, 16),
      event: r.event,
      conclusion: r.conclusion ?? "running",
      url: r.url,
    }))
    .sort((a, b) => b.time.localeCompare(a.time));
  const success = items.filter((r) => r.conclusion === "success").length;
  const failure = items.filter((r) => r.conclusion === "failure").length;
  const scheduleFailure = items.some(
    (r) => r.event === "schedule" && r.conclusion === "failure",
  );
  return { available: true, total: items.length, success, failure, scheduleFailure, items };
}

// PR 활동 — 그날 머지된 것 / 생성된 것.
function collectPRs(repo, date) {
  if (!repo) return { available: false, merged: [], created: [] };
  const map = (rows) =>
    (rows ?? []).map((p) => ({
      number: p.number,
      title: p.title,
      url: p.url,
      steward: (p.labels ?? []).some((l) => l.name === "steward"),
    }));
  const merged = map(
    ghJson([
      "pr", "list", "-R", repo, "--state", "merged", "--limit", "50",
      "--search", `merged:${date}`, "--json", "number,title,url,labels",
    ]),
  );
  const created = map(
    ghJson([
      "pr", "list", "-R", repo, "--state", "all", "--limit", "50",
      "--search", `created:${date}`, "--json", "number,title,url,labels",
    ]),
  );
  const openSteward = ghJson([
    "pr", "list", "-R", repo, "--state", "open", "--label", "steward",
    "--json", "number",
  ]);
  return {
    available: true,
    merged,
    created,
    stewardCreated: created.filter((p) => p.steward),
    openStewardCount: (openSteward ?? []).length,
  };
}

// 그날 main 커밋.
function collectCommits(date) {
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]) || "HEAD";
  const out = run("git", [
    "log", branch,
    `--since=${date}T00:00:00Z`, `--until=${shiftDate(date, 1)}T00:00:00Z`,
    "--format=%h%s", "--no-merges",
  ]);
  const merges = run("git", [
    "log", branch,
    `--since=${date}T00:00:00Z`, `--until=${shiftDate(date, 1)}T00:00:00Z`,
    "--format=%h%s", "--merges",
  ]);
  const parse = (s) =>
    (s ?? "").split("\n").filter(Boolean).map((l) => {
      const [sha, subject] = l.split("");
      return { sha, subject };
    });
  return { commits: parse(out), merges: parse(merges) };
}

// ----------------------------------------------------------------------------
// 배지·상태 판정 (직관적 규칙)
//   🔴 actionable>0        — 신호가 쌓였는데 미처리, 사람 조치 필요
//   🟡 실행 이상(실패 런) 또는 스케줄 런 실패
//   🟢 그 외 (정상)
// ----------------------------------------------------------------------------
function judge(runs, signals) {
  if (signals.available && signals.actionable > 0)
    return { badge: "🔴", label: "조치 필요" };
  if (runs.available && runs.failure > 0)
    return { badge: "🟡", label: "관찰" };
  return { badge: "🟢", label: "정상" };
}

// 전일 대비 델타 문자열.
function delta(today, yesterday) {
  if (yesterday == null || typeof today !== "number" || typeof yesterday !== "number")
    return "—";
  const d = today - yesterday;
  if (d === 0) return "±0";
  return d > 0 ? `+${d}` : `${d}`;
}

// ----------------------------------------------------------------------------
// 렌더
// ----------------------------------------------------------------------------
function renderMarkdown(snap, prev) {
  const { date, runs, prs, commits, signals, verdict } = snap;
  const cov = signals.coverage;
  const py = prev?.signals ?? {};
  const L = [];

  L.push(`# 일일 작업 로그 — ${date} (${weekdayKo(date)})`);
  L.push(`> 지식 스튜어드 · AI Factory Skill Fab · 자동 생성 ${snap.generatedAt}`);
  L.push("");

  // ---------- 상단 요약 ----------
  L.push(`## ${verdict.badge} 요약`);
  L.push("");
  L.push(`| 지표 | 오늘 | 전일 대비 |`);
  L.push(`| --- | --- | --- |`);
  const runCell = runs.available
    ? `${runs.total} (성공 ${runs.success} / 실패 ${runs.failure})`
    : "수집 불가";
  L.push(`| 스튜어드 런 | ${runCell} | — |`);
  L.push(`| 신규 steward PR | ${prs.available ? prs.stewardCreated.length : "?"} | — |`);
  L.push(`| 머지된 PR | ${prs.available ? prs.merged.length : "?"} | ${delta(prs.available ? prs.merged.length : null, prev?.prs?.mergedCount)} |`);
  if (signals.available) {
    L.push(`| actionable / watching | ${signals.actionable} / ${signals.watching} | ${delta(signals.watching, py.watching)} (watching) |`);
    if (cov) L.push(`| 역량 커버리지 | ${cov.mapped + cov.outOfScope} / ${cov.assessmentMinors ?? cov.total} | ${delta(cov.unknown, py.coverage?.unknown)} (unknown) |`);
    L.push(`| 검수 미완 오버라이드 | ${signals.overrides} | ${delta(signals.overrides, py.overrides)} |`);
    L.push(`| 조직 역량 미매핑 | ${signals.unmapped} | ${delta(signals.unmapped, py.unmapped)} |`);
  }
  L.push("");
  L.push(`**한 줄 상태**: ${verdict.badge} ${verdict.label} — ${statusSentence(snap)}`);
  const need = signals.available && signals.actionable > 0
    ? `**오늘의 조치 필요**: actionable ${signals.actionable}건 → \`/steward\` 위임 대상.`
    : `**오늘의 조치 필요**: 없음.`;
  L.push("");
  L.push(need);
  L.push("");
  L.push("---");
  L.push("");

  // ---------- 하단 상세 ----------
  L.push("## 상세");
  L.push("");

  L.push("### 🤖 스튜어드 실행");
  if (!runs.available) L.push("- 수집 불가 (gh 접근 실패)");
  else if (runs.items.length === 0) L.push("- 실행 없음");
  else
    for (const r of runs.items) {
      const mark = r.conclusion === "success" ? "✅" : r.conclusion === "failure" ? "❌" : "⏳";
      L.push(`- ${r.time} UTC · ${r.event} · ${mark} ${r.conclusion} · [run](${r.url})`);
    }
  L.push("");

  L.push("### 🔀 제안·PR 활동");
  if (!prs.available) L.push("- 수집 불가");
  else {
    L.push(`- 열린 steward PR: **${prs.openStewardCount}건**`);
    L.push(`- 신규 PR(생성): ${prs.created.length}건${prs.stewardCreated.length ? ` (steward ${prs.stewardCreated.length})` : ""}`);
    for (const p of prs.stewardCreated) L.push(`  - 🆕 #${p.number} ${p.title} — [PR](${p.url})`);
    if (prs.merged.length) {
      L.push(`- 머지: ${prs.merged.length}건`);
      for (const p of prs.merged) L.push(`  - ${p.steward ? "🤖" : "•"} #${p.number} ${p.title} — [PR](${p.url})`);
    } else L.push("- 머지: 없음");
  }
  L.push("");

  L.push("### 📡 신호 스냅샷");
  if (!signals.available) L.push("- 수집 불가 (signals.json 없음)");
  else {
    L.push(`- store=**${signals.store}** · actionable **${signals.actionable}** / watching **${signals.watching}**`);
    L.push(`- 검수 미완 오버라이드 **${signals.overrides}** · 조직 역량 미매핑 **${signals.unmapped}**`);
    if (cov) L.push(`- 역량 커버리지 mapped ${cov.mapped} / outOfScope ${cov.outOfScope} / **unknown ${cov.unknown}**`);
    const fl = Object.entries(signals.flags)
      .map(([k, v]) => `${k} ${v.total}(actionable ${v.actionable})`)
      .join(" · ");
    if (fl) L.push(`- 평가 플래그: ${fl}`);
  }
  L.push("");

  L.push("### 📝 main 커밋");
  const all = [...commits.merges, ...commits.commits];
  if (all.length === 0) L.push("- 없음");
  else {
    L.push(`- 총 ${all.length}건 (일반 ${commits.commits.length} · 머지 ${commits.merges.length})`);
    for (const c of all.slice(0, 20)) L.push(`  - \`${c.sha}\` ${c.subject}`);
    if (all.length > 20) L.push(`  - … 외 ${all.length - 20}건`);
  }
  L.push("");
  L.push("---");
  L.push(`<sub>자동 생성 · 설계 docs/DAILY_LOG_PLAN.md · 수정은 생성기에서만</sub>`);
  L.push("");
  return L.join("\n");
}

function statusSentence(snap) {
  const { runs, signals } = snap;
  if (signals.available && signals.actionable > 0)
    return `임계값 도달 신호 ${signals.actionable}건 — 처리 대기.`;
  if (runs.available && runs.failure > 0)
    return `실패 런 ${runs.failure}건 확인 필요(설정·일시 오류 여부).`;
  return "루프 정상, 조치 대기 신호 없음.";
}

// data/*.json 로부터 README 인덱스를 재생성(멱등).
function rebuildIndex() {
  const files = fs.existsSync(DATA_DIR)
    ? fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).sort().reverse()
    : [];
  const L = [
    "# 일일 작업 로그 인덱스",
    "",
    "지식 스튜어드 루프의 하루치 결과물 아카이브. 최신순. (자동 생성)",
    "",
    "| 날짜 | 상태 | 런(성공/실패) | 머지 | actionable/watching |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const f of files.slice(0, 60)) {
    const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf-8"));
    const date = d.date;
    const r = d.runs?.available ? `${d.runs.success}/${d.runs.failure}` : "—";
    const m = d.prs?.mergedCount ?? "—";
    const aw = d.signals?.available ? `${d.signals.actionable}/${d.signals.watching}` : "—";
    L.push(`| [${date}](${date}.md) | ${d.verdict?.badge ?? ""} | ${r} | ${m} | ${aw} |`);
  }
  L.push("");
  return L.join("\n");
}

// ----------------------------------------------------------------------------
// 메인
// ----------------------------------------------------------------------------
function main() {
  const date = getArg("date", todayUTC());
  const repo = detectRepo();

  const runs = collectRuns(repo, date);
  const prs = collectPRs(repo, date);
  const commits = collectCommits(date);
  const signals = collectSignals();
  const verdict = judge(runs, signals);

  // 기계가독 스냅샷(델타·인덱스용) — md 보다 먼저 확정한다.
  const snap = {
    date,
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    verdict,
    runs,
    prs: {
      available: prs.available,
      mergedCount: prs.merged?.length ?? null,
      createdCount: prs.created?.length ?? null,
      stewardCreated: prs.stewardCreated ?? [],
      openStewardCount: prs.openStewardCount ?? null,
      merged: prs.merged ?? [],
      created: prs.created ?? [],
    },
    commits,
    signals,
  };

  // 전일 스냅샷(델타).
  const prevPath = path.join(DATA_DIR, `${shiftDate(date, -1)}.json`);
  const prev = fs.existsSync(prevPath)
    ? JSON.parse(fs.readFileSync(prevPath, "utf-8"))
    : null;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, `${date}.json`), JSON.stringify(snap, null, 2) + "\n");
  fs.writeFileSync(path.join(LOG_DIR, `${date}.md`), renderMarkdown(snap, prev));
  fs.writeFileSync(path.join(LOG_DIR, "README.md"), rebuildIndex());

  console.log(
    `✅ 일일 로그 생성: ${verdict.badge} ${date} ` +
      `(런 ${runs.available ? runs.total : "?"}, 머지 ${snap.prs.mergedCount ?? "?"}, ` +
      `actionable ${signals.available ? signals.actionable : "?"}) → governance/daily-log/${date}.md`,
  );
  return snap;
}

module.exports = { main, renderMarkdown, judge, delta, collectSignals, rebuildIndex };

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`❌ 일일 로그 생성 실패: ${err.stack || err.message}`);
    process.exit(1);
  }
}
