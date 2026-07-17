const assert = require("assert");
const path = require("path");
const fs = require("fs");
const {
  loadCompetencySkillResolver,
} = require("./lib/competency-skill-resolver-loader");

const dataDir = path.join(__dirname, "../public/data");
const map = JSON.parse(
  fs.readFileSync(path.join(dataDir, "competency-skill-map.json"), "utf-8"),
);
const skills = JSON.parse(
  fs.readFileSync(path.join(dataDir, "robot-smartfactory.json"), "utf-8"),
);
const competency = JSON.parse(
  fs.readFileSync(
    path.join(dataDir, "employee-competency-assessments.json"),
    "utf-8",
  ),
);

const { resolveCompetencySkills, collectSkillIdsForCompetencies } =
  loadCompetencySkillResolver();

let scenarios = 0;
function scenario(label, fn) {
  fn();
  scenarios += 1;
}

const knownSkillIds = new Set(skills.map((skill) => skill.skill_id));
const actualMinors = new Set();
competency.employees.forEach((employee) => {
  employee.competencies.forEach((item) => actualMinors.add(item.minorCategory));
});

// 1) 매핑된 소분류는 mapped 상태로 스킬ID를 반환한다
scenario("mapped 소분류 해석", () => {
  const [minor, rule] = Object.entries(map.mappings)[0];
  const resolution = resolveCompetencySkills(minor, map);
  assert.strictEqual(resolution.status, "mapped");
  // vm 샌드박스 realm 경계를 넘어오므로 내용만 비교한다.
  assert.deepStrictEqual(Array.from(resolution.skillIds), rule.skillIds);
  assert.ok(["direct", "adjacent"].includes(resolution.relation));
});

// 2) 범위외 소분류는 out-of-scope 상태로 사유를 반환하고 스킬은 없다
scenario("out-of-scope 소분류 해석", () => {
  const minor = Object.keys(map.outOfScope)[0];
  const resolution = resolveCompetencySkills(minor, map);
  assert.strictEqual(resolution.status, "out-of-scope");
  assert.strictEqual(resolution.skillIds.length, 0);
  assert.ok(resolution.reason && resolution.reason.length > 0);
});

// 3) 매핑에 없는 소분류는 unknown
scenario("unknown 소분류 해석", () => {
  const resolution = resolveCompetencySkills("__없는소분류__", map);
  assert.strictEqual(resolution.status, "unknown");
  assert.strictEqual(resolution.skillIds.length, 0);
});

// 4) 매핑의 모든 skillId가 온톨로지에 실재한다
scenario("매핑 스킬ID 실재성", () => {
  Object.entries(map.mappings).forEach(([minor, rule]) => {
    assert.ok(rule.skillIds.length > 0, `${minor}: skillIds 비어 있음`);
    rule.skillIds.forEach((skillId) => {
      assert.ok(
        knownSkillIds.has(skillId),
        `${minor}: 존재하지 않는 스킬ID ${skillId}`,
      );
    });
  });
});

// 5) 44개 소분류가 매핑 또는 범위외로 100% 결정된다
scenario("소분류 전수 커버리지", () => {
  const uncovered = [...actualMinors].filter(
    (minor) => !map.mappings[minor] && !map.outOfScope[minor],
  );
  assert.strictEqual(uncovered.length, 0, `미결: ${uncovered.join(", ")}`);
  assert.strictEqual(
    Object.keys(map.mappings).length + Object.keys(map.outOfScope).length,
    actualMinors.size,
  );
});

// 6) 매핑/범위외 키가 실제 소분류다(유령 키 없음)
scenario("유령 키 없음", () => {
  [...Object.keys(map.mappings), ...Object.keys(map.outOfScope)].forEach(
    (minor) => {
      assert.ok(actualMinors.has(minor), `실재하지 않는 소분류 키: ${minor}`);
    },
  );
});

// 7) collectSkillIdsForCompetencies는 중복 없이 집계한다
scenario("직원 역량 스킬 집계(중복 제거)", () => {
  const minors = Object.keys(map.mappings).slice(0, 3);
  const collected = collectSkillIdsForCompetencies(minors, map);
  assert.strictEqual(new Set(collected).size, collected.length);
  collected.forEach((skillId) => assert.ok(knownSkillIds.has(skillId)));
});

console.log(`competency-skill 매핑 테스트 통과: ${scenarios}개 시나리오`);
