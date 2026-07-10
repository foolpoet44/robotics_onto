#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { loadCollegeResolver } = require("./lib/college-resolver-loader");

const projectRoot = process.cwd();
const mappingPath = path.join(projectRoot, "public/data/college-mapping.json");
const robotDataPath = path.join(
  projectRoot,
  "public/data/robot-smartfactory.json",
);

const mappingData = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
const robotSkills = JSON.parse(fs.readFileSync(robotDataPath, "utf-8"));
const {
  resolveCollege,
  resolveSkillCollege,
  resolvePrerequisiteChain,
  hasHubPrerequisite,
  validateCollegeMappingData,
} = loadCollegeResolver();

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

assert.strictEqual(mappingData.colleges.length, 4, "4개 칼리지가 필요합니다.");
assert.strictEqual(
  mappingData.levels.length,
  16,
  "4개 칼리지 x 4개 레벨이 필요합니다.",
);

const knownSkillIds = new Set(robotSkills.map((skill) => skill.skill_id));
const validationErrors = validateCollegeMappingData(mappingData, knownSkillIds);
assert.strictEqual(validationErrors.length, 0, validationErrors.join("\n"));

// skillOverrides 무결성 검증이 실제로 오류를 잡는지 확인한다.
const brokenMapping = JSON.parse(JSON.stringify(mappingData));
brokenMapping.skillOverrides["RSF-XXX-999"] = {
  primary: "no-such-college",
  secondary: ["agentic-ai", "agentic-ai"],
  source: "guessed",
};
const brokenErrors = validateCollegeMappingData(brokenMapping, knownSkillIds);
assert.ok(
  brokenErrors.some((error) => error.includes("존재하지 않는 스킬")),
  "존재하지 않는 스킬 ID를 잡아야 합니다.",
);
assert.ok(
  brokenErrors.some((error) => error.includes("primary college")),
  "존재하지 않는 primary college를 잡아야 합니다.",
);
assert.ok(
  brokenErrors.some((error) => error.includes("source")),
  "허용되지 않은 source를 잡아야 합니다.",
);

const collegeIds = new Set(mappingData.colleges.map((college) => college.id));
assert.ok(
  collegeIds.has("data-intelligence"),
  "Data Intelligence HUB 칼리지가 필요합니다.",
);
assert.strictEqual(
  mappingData.colleges.find((college) => college.id === "data-intelligence")
    .isHub,
  true,
  "Data Intelligence는 HUB로 표시되어야 합니다.",
);

const skillDomains = new Set(robotSkills.map((skill) => skill.domain));
const mappedDomains = new Set(Object.keys(mappingData.domainMapping));
for (const domain of skillDomains) {
  assert.ok(mappedDomains.has(domain), `스킬 도메인 매핑 누락: ${domain}`);
}

const industrialRobot = resolveCollege(
  "industrial-robot-control",
  mappingData.domainMapping,
);
assert.deepStrictEqual(normalize(industrialRobot), {
  primary: "physical-ai",
  secondary: ["agentic-ai"],
  levelTier: 2,
  levelId: "physical-ai-lv2",
});

const digitalTwinSkill = resolveSkillCollege(
  { domain: "digital-twin-simulation", proficiency_level: 3 },
  mappingData.domainMapping,
);
assert.deepStrictEqual(normalize(digitalTwinSkill), {
  primary: "digital-twin",
  secondary: ["data-intelligence"],
  levelTier: 3,
  levelId: "digital-twin-lv3",
});

// 스킬 오버라이드: 결함 검출은 machine-vision-sensor 도메인이지만 agentic-ai가 primary.
const overriddenSkill = resolveSkillCollege(
  {
    skill_id: "RSF-MVS-007",
    domain: "machine-vision-sensor",
    proficiency_level: 3,
  },
  mappingData.domainMapping,
  mappingData.skillOverrides,
);
assert.deepStrictEqual(normalize(overriddenSkill), {
  primary: "agentic-ai",
  secondary: ["data-intelligence"],
  levelTier: 3,
  levelId: "agentic-ai-lv3",
});

// 오버라이드가 없는 스킬은 오버라이드 테이블을 넘겨도 도메인 기본값을 따른다.
const nonOverriddenSkill = resolveSkillCollege(
  {
    skill_id: "RSF-MVS-002",
    domain: "machine-vision-sensor",
    proficiency_level: 1,
  },
  mappingData.domainMapping,
  mappingData.skillOverrides,
);
assert.deepStrictEqual(normalize(nonOverriddenSkill), {
  primary: "physical-ai",
  secondary: ["data-intelligence"],
  levelTier: 1,
  levelId: "physical-ai-lv1",
});

// 신규 도메인은 오버라이드 없이 agentic-ai를 primary로 갖는다.
const agenticDomainSkill = resolveSkillCollege(
  {
    skill_id: "RSF-AAM-001",
    domain: "agentic-ai-manufacturing",
    proficiency_level: 1,
  },
  mappingData.domainMapping,
  mappingData.skillOverrides,
);
assert.deepStrictEqual(normalize(agenticDomainSkill), {
  primary: "agentic-ai",
  secondary: ["data-intelligence"],
  levelTier: 1,
  levelId: "agentic-ai-lv1",
});

const prerequisiteChain = resolvePrerequisiteChain(
  "agentic-ai-lv3",
  mappingData.levels,
);
assert.deepStrictEqual(normalize(prerequisiteChain), [
  "agentic-ai-lv2",
  "agentic-ai-lv1",
  "data-intelligence-lv1",
  "data-intelligence-lv2",
]);

assert.strictEqual(
  hasHubPrerequisite(
    "agentic-ai-lv3",
    ["agentic-ai-lv1", "agentic-ai-lv2", "data-intelligence-lv1"],
    mappingData.levels,
  ),
  false,
  "HUB Lv2 선수가 없으면 미충족이어야 합니다.",
);
assert.strictEqual(
  hasHubPrerequisite(
    "agentic-ai-lv3",
    [
      "agentic-ai-lv1",
      "agentic-ai-lv2",
      "data-intelligence-lv1",
      "data-intelligence-lv2",
    ],
    mappingData.levels,
  ),
  true,
  "HUB 선수 체인이 모두 있으면 충족이어야 합니다.",
);

console.log("college/level 메타데이터 테스트 통과: 13개 시나리오");
