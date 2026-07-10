#!/usr/bin/env node
// record-college-override-decision.js 의 상태 전이를 임시 데이터 사본으로 검증한다.

const assert = require("assert");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const projectRoot = process.cwd();
const scriptPath = path.join(
  projectRoot,
  "scripts/record-college-override-decision.js",
);
const sourceDataDir = path.join(projectRoot, "public/data");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "college-override-"));
for (const file of [
  "college-mapping.json",
  "college-override-decisions.json",
  "robot-smartfactory.json",
]) {
  fs.copyFileSync(path.join(sourceDataDir, file), path.join(tempDir, file));
}

function run(args) {
  return execFileSync(
    process.execPath,
    [scriptPath, "--data-dir", tempDir, ...args],
    { encoding: "utf-8" },
  );
}

function runExpectFailure(args) {
  try {
    run(args);
  } catch (error) {
    return error.status;
  }
  throw new Error(`실패해야 하는 호출이 성공했습니다: ${args.join(" ")}`);
}

function readMapping() {
  return JSON.parse(
    fs.readFileSync(path.join(tempDir, "college-mapping.json"), "utf-8"),
  );
}

function readLedger() {
  return JSON.parse(
    fs.readFileSync(
      path.join(tempDir, "college-override-decisions.json"),
      "utf-8",
    ),
  );
}

// 1. approved: proposed -> reviewed 승격 + 장부 기록
run([
  "--skill-id",
  "RSF-MVS-007",
  "--status",
  "approved",
  "--reviewer",
  "테스트 검수자",
  "--reviewed-at",
  "2026-07-06T00:00:00.000Z",
]);
assert.strictEqual(
  readMapping().skillOverrides["RSF-MVS-007"].source,
  "reviewed",
  "approved는 source를 reviewed로 바꿔야 합니다.",
);
assert.strictEqual(readLedger().decisions.length, 1);
assert.strictEqual(readLedger().decisions[0].status, "approved");

// 2. held: proposed 유지 + 장부 기록
run([
  "--skill-id",
  "RSF-IRC-020",
  "--status",
  "held",
  "--reviewer",
  "테스트 검수자",
  "--reviewed-at",
  "2026-07-06T00:00:00.000Z",
  "--notes",
  "라인 밸런싱 소관 재논의 필요",
]);
assert.strictEqual(
  readMapping().skillOverrides["RSF-IRC-020"].source,
  "proposed",
  "held는 오버라이드를 바꾸지 않아야 합니다.",
);
assert.strictEqual(readLedger().decisions.length, 2);

// 3. rejected: 오버라이드 제거(도메인 기본 매핑 복귀) + 장부 기록
run([
  "--skill-id",
  "RSF-CRO-017",
  "--status",
  "rejected",
  "--reviewer",
  "테스트 검수자",
  "--reviewed-at",
  "2026-07-06T00:00:00.000Z",
]);
assert.strictEqual(
  readMapping().skillOverrides["RSF-CRO-017"],
  undefined,
  "rejected는 오버라이드를 제거해야 합니다.",
);
const rejected = readLedger().decisions.find(
  (decision) => decision.skill_id === "RSF-CRO-017",
);
assert.strictEqual(rejected.status, "rejected");
assert.strictEqual(
  rejected.override_snapshot.primary,
  "data-intelligence",
  "반려 결정에도 원래 제안 내용이 스냅샷으로 남아야 합니다.",
);

// 4. 같은 스킬 재결정: 최신 결정으로 대체(중복 누적 금지)
runExpectFailure([
  "--skill-id",
  "RSF-CRO-017",
  "--status",
  "approved",
  "--reviewer",
  "테스트 검수자",
]);

// 5. 오류 케이스: 존재하지 않는 스킬 / 이미 reviewed 재승인 / 잘못된 status
runExpectFailure([
  "--skill-id",
  "RSF-XXX-999",
  "--status",
  "approved",
  "--reviewer",
  "테스트 검수자",
]);
runExpectFailure([
  "--skill-id",
  "RSF-MVS-007",
  "--status",
  "approved",
  "--reviewer",
  "테스트 검수자",
]);
runExpectFailure([
  "--skill-id",
  "RSF-IRC-022",
  "--status",
  "maybe",
  "--reviewer",
  "테스트 검수자",
]);

// 원본 데이터는 건드리지 않았는지 확인
const originalMapping = JSON.parse(
  fs.readFileSync(path.join(sourceDataDir, "college-mapping.json"), "utf-8"),
);
assert.strictEqual(
  originalMapping.skillOverrides["RSF-MVS-007"].source,
  "proposed",
  "테스트가 원본 데이터를 수정하면 안 됩니다.",
);

fs.rmSync(tempDir, { recursive: true, force: true });
console.log("칼리지 오버라이드 결정 테스트 통과: 8개 시나리오");
