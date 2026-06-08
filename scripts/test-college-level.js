#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const projectRoot = process.cwd();
const mappingPath = path.join(projectRoot, "public/data/college-mapping.json");
const resolverPath = path.join(projectRoot, "app/lib/college-resolver.ts");
const robotDataPath = path.join(projectRoot, "public/data/robot-smartfactory.json");

function loadResolver() {
  const source = fs.readFileSync(resolverPath, "utf-8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const exportsObject = {};
  const sandbox = {
    exports: exportsObject,
    require,
    module: { exports: exportsObject },
  };

  vm.runInNewContext(transpiled.outputText, sandbox, {
    filename: resolverPath,
  });

  return sandbox.module.exports;
}

const mappingData = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
const robotSkills = JSON.parse(fs.readFileSync(robotDataPath, "utf-8"));
const {
  resolveCollege,
  resolveSkillCollege,
  resolvePrerequisiteChain,
  hasHubPrerequisite,
  validateCollegeMappingData,
} = loadResolver();

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

assert.strictEqual(mappingData.colleges.length, 4, "4개 칼리지가 필요합니다.");
assert.strictEqual(mappingData.levels.length, 16, "4개 칼리지 x 4개 레벨이 필요합니다.");

const validationErrors = validateCollegeMappingData(mappingData);
assert.strictEqual(validationErrors.length, 0, validationErrors.join("\n"));

const collegeIds = new Set(mappingData.colleges.map((college) => college.id));
assert.ok(collegeIds.has("data-intelligence"), "Data Intelligence HUB 칼리지가 필요합니다.");
assert.strictEqual(
  mappingData.colleges.find((college) => college.id === "data-intelligence").isHub,
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

console.log("college/level 메타데이터 테스트 통과: 9개 시나리오");
