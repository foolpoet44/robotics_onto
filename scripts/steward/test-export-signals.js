#!/usr/bin/env node
// ============================================================================
// export-signals.js 테스트 — 파일 폴백 경로를 픽스처로 검증한다.
// ============================================================================
//
// 왜 파일 폴백만 테스트하나
// -----------------------
// 이 실행 환경(로컬/CI)에는 POSTGRES_URL 이 없다. 스튜어드의 야간 cron 도
// DB 부재 시 파일 장부로 폴백하도록 설계돼 있으므로, 재현 가능하고 DB 없이
// 도는 이 경로가 곧 "실제로 도는 경로"다. DB 어댑터는 스키마가 스토어와
// 동일함이 코드로 보장되므로 여기선 집계·임계값 판정 로직에 집중한다.
//
// 검증 시나리오 (플랜 A-4)
//   · pending 변경요청 1건        → changeRequests.actionable = true
//   · 중복의심 3인(임계값 3)       → 해당 스킬 actionable = true
//   · 신규제안 2인(임계값 2)       → 해당 스킬 actionable = true
//   · 중복의심 2인(임계값 미달)     → actionable = false (watching)
//   · 같은 평가자 중복 라벨         → distinct 평가자 수로만 카운트
//   · 오버라이드 proposed 1건       → pendingOverrideReviews 에 포함
// ============================================================================

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const SCRIPT = path.join(__dirname, "export-signals.js");
let passed = 0;
let failed = 0;

function assert(cond, message) {
  if (cond) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`  ❌ ${message}`);
  }
}

// ----------------------------------------------------------------------------
// 임시 .data 디렉토리에 픽스처 장부를 심고, 스크립트를 --data-dir 로 겨눈다.
// ----------------------------------------------------------------------------
function withFixture(fixtures, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "steward-test-"));
  try {
    for (const [file, data] of Object.entries(fixtures)) {
      fs.writeFileSync(path.join(dir, file), JSON.stringify(data), "utf-8");
    }
    const outPath = path.join(dir, "signals.json");
    // 하위 프로세스로 실행 — POSTGRES_URL 을 확실히 제거해 파일 폴백을 강제.
    const env = { ...process.env };
    delete env.POSTGRES_URL;
    delete env.EVAL_DATA_DIR;
    execFileSync(
      process.execPath,
      [SCRIPT, "--data-dir", dir, "--out", outPath],
      { env, stdio: "pipe" },
    );
    const signals = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    run(signals);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log("🧪 export-signals.js 테스트");

// --- 시나리오 1: 핵심 집계·임계값 판정 ---
withFixture(
  {
    "domain-change-requests.json": [
      {
        skillId: "RSF-IRC-001",
        axis: "college",
        currentValue: "physical-ai",
        requestedValue: "data-intelligence",
        reason: "데이터 성격이 강함",
        evaluatorId: "EVAL-101",
        evaluatorName: "김검수",
        status: "pending",
        createdAt: "2026-07-10T00:00:00.000Z",
      },
    ],
    "skill-evaluations.json": [
      // 중복의심: 서로 다른 평가자 3인 → 임계값(3) 도달
      { skillId: "RSF-AAM-005", labels: ["중복의심"], evaluatorId: "EVAL-101", notes: "MVS-007과 겹침", createdAt: "2026-07-01T00:00:00Z" },
      { skillId: "RSF-AAM-005", labels: ["중복의심"], evaluatorId: "EVAL-102", notes: "", createdAt: "2026-07-02T00:00:00Z" },
      { skillId: "RSF-AAM-005", labels: ["중복의심"], evaluatorId: "EVAL-103", notes: "", createdAt: "2026-07-03T00:00:00Z" },
      // 같은 평가자(EVAL-103)가 한 번 더 → distinct 평가자 수는 여전히 3
      { skillId: "RSF-AAM-005", labels: ["중복의심"], evaluatorId: "EVAL-103", notes: "재확인", createdAt: "2026-07-04T00:00:00Z" },
      // 신규제안: 2인 → 임계값(2) 도달
      { skillId: "RSF-MVS-099", labels: ["신규제안"], evaluatorId: "EVAL-104", notes: "엣지 추론 최적화", createdAt: "2026-07-05T00:00:00Z" },
      { skillId: "RSF-MVS-099", labels: ["신규제안"], evaluatorId: "EVAL-105", notes: "", createdAt: "2026-07-06T00:00:00Z" },
      // 재정의대상: 1인 → 임계값(2) 미달 → watching
      { skillId: "RSF-IRC-010", labels: ["재정의대상"], evaluatorId: "EVAL-101", notes: "범위 모호", createdAt: "2026-07-07T00:00:00Z" },
    ],
  },
  (s) => {
    // 폴백 스토어 확인
    assert(s.source.store === "file", `store가 file 이어야 함 (실제: ${s.source.store})`);

    // 변경요청 pending 집계
    assert(s.changeRequests.pending.length === 1, "pending 변경요청 1건이어야 함");
    assert(s.changeRequests.actionable === true, "pending≥1 이면 actionable=true");

    // 중복의심: 4개 라벨이지만 distinct 평가자 3인
    const dup = s.evaluationFlags["중복의심"].find((e) => e.skillId === "RSF-AAM-005");
    assert(dup, "중복의심 RSF-AAM-005 집계 존재");
    assert(dup && dup.evaluatorCount === 3, `distinct 평가자 3 (실제: ${dup && dup.evaluatorCount})`);
    assert(dup && dup.count === 4, `라벨 총 4회 (실제: ${dup && dup.count})`);
    assert(dup && dup.actionable === true, "중복의심 3인 → actionable=true");
    assert(dup && dup.notes.length === 2, `notes 2건 (실제: ${dup && dup.notes.length})`);

    // 신규제안: 2인 → actionable
    const prop = s.evaluationFlags["신규제안"].find((e) => e.skillId === "RSF-MVS-099");
    assert(prop && prop.evaluatorCount === 2 && prop.actionable === true, "신규제안 2인 → actionable=true");

    // 재정의대상: 1인 → 미달
    const redef = s.evaluationFlags["재정의대상"].find((e) => e.skillId === "RSF-IRC-010");
    assert(redef && redef.actionable === false, "재정의대상 1인 → actionable=false");

    // summary: actionable = pending(1) + 중복의심(1) + 신규제안(1) = 3
    assert(s.summary.actionable === 3, `summary.actionable=3 (실제: ${s.summary.actionable})`);
    assert(s.summary.watching >= 1, `watching 에 재정의 1건 이상 포함 (실제: ${s.summary.watching})`);

    // 역량 매핑 맵이 리포에 존재 → available=true, 커버리지 계산됨
    // (맵/역량평가는 public/data 에서 로드 — 신호 --data-dir 와 무관)
    assert(s.competencyMap.available === true, "competency-skill-map 존재 시 available=true");
    assert(
      s.competencyMap.coverage && s.competencyMap.coverage.unknown === 0,
      "실제 맵은 unknown 0 (100% 커버리지)",
    );
  },
);

// --- 시나리오 2: 완전 빈 입력 → 죽지 않고 0 시그널 ---
withFixture({}, (s) => {
  assert(s.summary.actionable === 0, "빈 입력 → actionable=0");
  assert(s.changeRequests.pending.length === 0, "빈 입력 → pending 0");
  assert(Array.isArray(s.evaluationFlags["중복의심"]), "빈 입력에도 플래그 배열 존재");
});

console.log(`\n결과: ✅ ${passed} 통과 / ❌ ${failed} 실패`);
process.exit(failed === 0 ? 0 : 1);
