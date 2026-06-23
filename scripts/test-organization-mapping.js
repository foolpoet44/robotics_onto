const assert = require("assert");
const {
  validateOrganizationMapping,
} = require("./lib/organization-validation");

const ontologySkills = [
  { skill_id: "RSF-IRC-001" },
  { skill_id: "RSF-MVS-011" },
];

function makeOrganization(skills) {
  return {
    organization: { id: "test_org" },
    enablers: [{ id: "enabler_1", skills }],
  };
}

function makeSkill(overrides = {}) {
  return {
    skill_id: "RS_001",
    internal_uri: "urn:rsf:org-skill:rs_001",
    esco_uri: null,
    ontology_skill_id: "RSF-IRC-001",
    ontology_match_type: "exact",
    ...overrides,
  };
}

function expectError(name, organization, expectedText) {
  const result = validateOrganizationMapping(organization, ontologySkills);
  assert.strictEqual(result.valid, false, `${name}: 오류가 감지되어야 합니다.`);
  assert.ok(
    result.errors.some((error) => error.includes(expectedText)),
    `${name}: "${expectedText}" 오류가 필요합니다.\n${result.errors.join("\n")}`,
  );
}

const healthy = validateOrganizationMapping(
  makeOrganization([
    makeSkill(),
    makeSkill({
      skill_id: "RS_002",
      internal_uri: "urn:rsf:org-skill:rs_002",
      ontology_skill_id: null,
      ontology_match_type: "none",
    }),
  ]),
  ontologySkills,
);
assert.strictEqual(healthy.valid, true);
assert.deepStrictEqual(healthy.metrics, {
  skills: 2,
  mapped: 1,
  unmapped: 1,
  coverage: 50,
});

expectError(
  "매핑 필드 누락",
  makeOrganization([makeSkill({ ontology_skill_id: undefined })]),
  "ontology_skill_id",
);
expectError(
  "존재하지 않는 기준 스킬",
  makeOrganization([makeSkill({ ontology_skill_id: "RSF-IRC-999" })]),
  "존재하지 않는 기준 스킬",
);
expectError(
  "중복 조직 스킬 ID",
  makeOrganization([makeSkill(), makeSkill()]),
  "중복 조직 스킬 ID",
);
expectError(
  "매핑 유형 불일치",
  makeOrganization([
    makeSkill({ ontology_skill_id: null, ontology_match_type: "exact" }),
  ]),
  "ontology_match_type",
);
expectError(
  "가짜 ESCO URI",
  makeOrganization([
    makeSkill({ esco_uri: "https://data.europa.eu/esco/skill/python" }),
  ]),
  "검증되지 않은 ESCO URI",
);
expectError(
  "리뷰 상태 범위 위반",
  makeOrganization([makeSkill({ ontology_review_status: "invalid" })]),
  "ontology_review_status",
);

console.log("조직 매핑 검증 테스트 통과: 7개 시나리오");
