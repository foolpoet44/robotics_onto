#!/usr/bin/env node
// 칼리지 스킬 오버라이드(4대 도메인 재분류)의 검수 결정을 기록한다.
//
// 사용법:
//   npm run record:college-override -- \
//     --skill-id RSF-MVS-007 \
//     --status approved \
//     --reviewer "변재민" \
//     --notes "품질 자동 판정은 Agentic AI 소관이 맞음"
//
// 상태 의미:
//   approved  오버라이드를 확정한다 (source: proposed -> reviewed)
//   held      판단을 보류한다 (오버라이드는 proposed 유지)
//   rejected  오버라이드를 반려·제거한다 (스킬은 도메인 기본 매핑으로 복귀)
//
// 모든 결정은 public/data/college-override-decisions.json 장부에 남는다.

const fs = require("fs");
const path = require("path");
const { loadCollegeResolver } = require("./lib/college-resolver-loader");

const ALLOWED_STATUSES = new Set(["approved", "held", "rejected"]);

function getArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

const dataDir = getArgument("data-dir")
  ? path.resolve(getArgument("data-dir"))
  : path.join(__dirname, "../public/data");
const mappingPath = path.join(dataDir, "college-mapping.json");
const ledgerPath = path.join(dataDir, "college-override-decisions.json");
const robotDataPath = path.join(dataDir, "robot-smartfactory.json");

const skillId = getArgument("skill-id");
const status = getArgument("status");
const reviewer = getArgument("reviewer");
const notes = getArgument("notes");
const reviewedAt = getArgument("reviewed-at") ?? new Date().toISOString();

if (!skillId || !status || !reviewer) {
  fail(
    "필수 인자: --skill-id, --status(approved|held|rejected), --reviewer",
  );
}
if (!ALLOWED_STATUSES.has(status)) {
  fail(`허용되지 않은 status '${status}' (approved|held|rejected)`);
}

const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf-8"));
const robotSkills = JSON.parse(fs.readFileSync(robotDataPath, "utf-8"));
const knownSkillIds = new Set(robotSkills.map((skill) => skill.skill_id));

if (!knownSkillIds.has(skillId)) {
  fail(`존재하지 않는 스킬입니다: ${skillId}`);
}

const overrides = mapping.skillOverrides ?? {};
const override = overrides[skillId];
if (!override) {
  fail(
    `${skillId}에는 칼리지 오버라이드가 없습니다. ` +
      "(이미 반려·제거되었거나 도메인 기본 매핑만 존재)",
  );
}
if (override.source === "reviewed" && status !== "rejected") {
  fail(`${skillId} 오버라이드는 이미 reviewed 상태입니다.`);
}

// 오버라이드 상태 반영
if (status === "approved") {
  override.source = "reviewed";
} else if (status === "rejected") {
  delete overrides[skillId];
}

// 장부 기록 (같은 스킬의 기존 결정은 최신 결정으로 대체)
const decision = {
  skill_id: skillId,
  status,
  reviewer,
  reviewed_at: reviewedAt,
  override_snapshot: {
    primary: override.primary,
    secondary: [...override.secondary],
  },
};
if (notes) decision.notes = notes;

ledger.decisions = [
  ...ledger.decisions.filter((item) => item.skill_id !== skillId),
  decision,
];

// 변경 결과가 여전히 유효한지 리졸버 검증으로 확인한 뒤에만 저장한다.
const { validateCollegeMappingData } = loadCollegeResolver();
const errors = validateCollegeMappingData(mapping, knownSkillIds);
if (errors.length > 0) {
  errors.forEach((error) => console.error(`❌ ${error}`));
  process.exit(1);
}

fs.writeFileSync(mappingPath, `${JSON.stringify(mapping, null, 2)}\n`, "utf-8");
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf-8");

const effect =
  status === "approved"
    ? "오버라이드 확정 (source: reviewed)"
    : status === "rejected"
      ? "오버라이드 제거 (도메인 기본 매핑 복귀)"
      : "보류 (proposed 유지)";
console.log(`칼리지 오버라이드 결정 기록 완료: ${skillId} -> ${status}`);
console.log(`  효과: ${effect}`);
