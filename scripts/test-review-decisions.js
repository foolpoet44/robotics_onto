const assert = require("assert");
const {
  applyApprovedDecisions,
  mergeReviewDecisions,
  upsertReviewDecision,
  validateReviewDecisions,
} = require("./lib/review-decisions");

const queue = {
  stats: { total: 2, organizationMappings: 1, ontologyRelations: 1 },
  items: [
    {
      id: "organization_mapping:robot_solution:RS_010",
      kind: "organization_mapping",
      status: "pending",
      organization_id: "robot_solution",
      organization_skill: { skill_id: "RS_010" },
    },
    {
      id: "ontology_relation:co_required:RSF-IRC-001:RSF-IRC-002",
      kind: "ontology_relation",
      status: "pending",
      relation_type: "co_required",
      source_skill: { skill_id: "RSF-IRC-001" },
      target_skill: { skill_id: "RSF-IRC-002" },
    },
  ],
};

const decisions = {
  decisions: [
    {
      item_id: "organization_mapping:robot_solution:RS_010",
      status: "approved",
      reviewer: "현장 전문가",
      reviewed_at: "2026-05-31T00:00:00.000Z",
    },
    {
      item_id: "ontology_relation:co_required:RSF-IRC-001:RSF-IRC-002",
      status: "approved",
      reviewer: "현장 전문가",
      reviewed_at: "2026-05-31T00:00:00.000Z",
    },
  ],
};

const validation = validateReviewDecisions(queue, decisions);
assert.strictEqual(validation.valid, true);

const merged = mergeReviewDecisions(queue, decisions);
assert.deepStrictEqual(merged.stats.statuses, {
  pending: 0,
  approved: 2,
  held: 0,
  rejected: 0,
});

const ontologySkills = [
  {
    skill_id: "RSF-IRC-001",
    related_skills: [
      {
        target: "RSF-IRC-002",
        type: "co_required",
        source: "heuristic",
      },
    ],
  },
  {
    skill_id: "RSF-IRC-002",
    related_skills: [
      {
        target: "RSF-IRC-001",
        type: "co_required",
        source: "heuristic",
      },
    ],
  },
];
const organizations = [
  {
    organization: { id: "robot_solution" },
    enablers: [
      {
        skills: [
          {
            skill_id: "RS_010",
            ontology_skill_id: "RSF-IRC-002",
            ontology_match_type: "approximate",
          },
        ],
      },
    ],
  },
];

const result = applyApprovedDecisions(
  ontologySkills,
  organizations,
  queue,
  decisions,
);
assert.strictEqual(result.metrics.relationsPromoted, 2);
assert.strictEqual(result.metrics.organizationMappingsPromoted, 1);
assert.strictEqual(ontologySkills[0].related_skills[0].source, "reviewed");
assert.strictEqual(ontologySkills[1].related_skills[0].source, "reviewed");
assert.strictEqual(
  organizations[0].enablers[0].skills[0].ontology_review_status,
  "approved",
);

const invalid = validateReviewDecisions(queue, {
  decisions: [
    {
      item_id: "unknown",
      status: "approved",
      reviewer: "",
      reviewed_at: "not-a-date",
    },
  ],
});
assert.strictEqual(invalid.valid, false);
assert.ok(invalid.errors.length >= 3);

const updated = upsertReviewDecision(decisions, {
  ...decisions.decisions[0],
  status: "held",
});
assert.strictEqual(updated.decisions.length, 2);
assert.strictEqual(updated.decisions[0].status, "held");

console.log("리뷰 결정 테스트 통과: 검증, 상태 병합, 승인 승격, 기록 갱신");
