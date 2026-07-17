#!/usr/bin/env node
// ============================================================================
// competency-skill-map.json 정합 테스트 (test:competency-skill)
// ============================================================================
//
// 이 테스트 통과 = "역량 소분류 100% 커버리지"의 증명이다(불변원칙 4).
// 신규 역량평가 임포트로 새 minorCategory 가 생기면 이 테스트가 즉시 빨개져
// B-2(/triage-competency-map)가 처리해야 함을 알린다.

const fs = require("fs");
const path = require("path");
const {
  loadCompetencySkillResolver,
  computeCoverage,
  validateCompetencySkillMap,
} = require("./lib/competency-skill-resolver-loader");

let passed = 0;
let failed = 0;
function assert(cond, message) {
  if (cond) passed += 1;
  else {
    failed += 1;
    console.error(`  ❌ ${message}`);
  }
}

console.log("🧪 competency-skill-map 정합 테스트");

// --- 실제 리포 맵: 100% 커버리지 강제 ---
const ctx = loadCompetencySkillResolver();
assert(ctx.available, "competency-skill-map.json 과 역량평가가 로드되어야 함");

if (ctx.available) {
  const errors = ctx.validate();
  if (errors.length) errors.forEach((e) => console.error(`  ❌ ${e}`));
  assert(errors.length === 0, `맵 무결성 오류 ${errors.length}건 (0이어야 함)`);
  assert(
    ctx.coverage.unknown === 0,
    `미분류 minor ${ctx.coverage.unknown}건 (0이어야 함)`,
  );
  assert(
    ctx.coverage.mapped + ctx.coverage.outOfScope ===
      ctx.coverage.assessmentMinors,
    `mapped(${ctx.coverage.mapped}) + outOfScope(${ctx.coverage.outOfScope}) ` +
      `= 역량평가 minor(${ctx.coverage.assessmentMinors}) 이어야 함`,
  );
  console.log(
    `  ℹ️  커버리지: total=${ctx.coverage.total} ` +
      `mapped=${ctx.coverage.mapped} outOfScope=${ctx.coverage.outOfScope} ` +
      `unknown=${ctx.coverage.unknown}`,
  );
}

// --- 픽스처: unknown minor 를 심으면 검증이 잡아내는지 ---
const map = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "public", "data", "competency-skill-map.json"),
    "utf-8",
  ),
);
const fakeAssessments = {
  employees: [
    {
      employeeId: "TEST-1",
      competencies: [
        { minorCategory: "존재하지않는신규역량", majorCategory: "테스트", collegeId: "physical-ai" },
      ],
    },
  ],
};
const cov = computeCoverage(map, fakeAssessments);
assert(cov.coverage.unknown === 1, "심어둔 미분류 minor 1건을 unknown 으로 검출");
assert(
  cov.unknownMinors[0].minorCategory === "존재하지않는신규역량",
  "unknownMinors 에 해당 minor 포함",
);
const errs = validateCompetencySkillMap(map, fakeAssessments, new Set());
assert(errs.length >= 1, "미분류 minor 가 있으면 검증이 오류를 반환");

console.log(`\n결과: ✅ ${passed} 통과 / ❌ ${failed} 실패`);
process.exit(failed === 0 ? 0 : 1);
