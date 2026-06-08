#!/usr/bin/env node

const assert = require("node:assert/strict");
const { validateOntologySemantics } = require("./lib/ontology-validation");

function createSkill(id, overrides = {}) {
  return {
    skill_id: id,
    skill_type: "skill",
    proficiency_level: 2,
    role_mapping: ["engineer"],
    parent_skill_id: null,
    related_skills: [],
    internal_uri: `urn:rsf:skill:${id.toLowerCase()}`,
    esco_uri: null,
    ...overrides,
  };
}

function createHealthyFixture() {
  return [
    createSkill("RSF-TST-001", {
      related_skills: [
        { target: "RSF-TST-002", type: "co_required" },
        { target: "RSF-TST-003", type: "co_required" },
      ],
    }),
    createSkill("RSF-TST-002", {
      parent_skill_id: "RSF-TST-001",
      related_skills: [
        { target: "RSF-TST-001", type: "co_required" },
        { target: "RSF-TST-003", type: "co_required" },
      ],
    }),
    createSkill("RSF-TST-003", {
      related_skills: [
        { target: "RSF-TST-001", type: "co_required" },
        { target: "RSF-TST-002", type: "co_required" },
      ],
    }),
  ];
}

function expectInvalid(name, mutate, expectedMessage) {
  const skills = createHealthyFixture();
  mutate(skills);
  const result = validateOntologySemantics(skills);
  assert.equal(result.valid, false, `${name}: 오류를 거부해야 합니다.`);
  assert.ok(
    result.errors.some((error) => error.includes(expectedMessage)),
    `${name}: "${expectedMessage}" 오류가 필요합니다. 실제: ${result.errors.join(" | ")}`,
  );
}

const healthy = validateOntologySemantics(createHealthyFixture());
assert.equal(healthy.valid, true, healthy.errors.join(" | "));

expectInvalid(
  "빈 관계망",
  (skills) => skills.forEach((skill) => (skill.related_skills = [])),
  "고립 노드",
);
expectInvalid(
  "가짜 ESCO URI",
  (skills) => {
    skills[0].esco_uri = "http://data.europa.eu/esco/skill/rsf-test-0001";
  },
  "가짜 ESCO URI",
);
expectInvalid(
  "부모 순환",
  (skills) => {
    skills[0].parent_skill_id = "RSF-TST-002";
  },
  "부모 관계 순환",
);
expectInvalid(
  "dangling 관계",
  (skills) => {
    skills[0].related_skills[0].target = "RSF-TST-999";
  },
  "존재하지 않는 related_skills 참조",
);
expectInvalid(
  "enum 범위 위반",
  (skills) => {
    skills[0].skill_type = "invalid";
  },
  "허용되지 않은 skill_type",
);
expectInvalid(
  "관계 출처 범위 위반",
  (skills) => {
    skills[0].related_skills[0].source = "invalid";
  },
  "허용되지 않은 관계 출처",
);

console.log("ontology-validation: 7개 시나리오 통과");
