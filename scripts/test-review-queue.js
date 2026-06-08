const assert = require("assert");
const { buildReviewQueue } = require("./lib/review-queue");

const ontologySkills = [
  {
    skill_id: "RSF-IRC-001",
    preferred_label_ko: "로봇 구조 및 운동학",
    domain: "industrial-robot-control",
    related_skills: [
      {
        target: "RSF-IRC-002",
        type: "co_required",
        source: "heuristic",
      },
      {
        target: "RSF-MVS-001",
        type: "cross_domain",
        source: "reviewed",
      },
    ],
  },
  {
    skill_id: "RSF-IRC-002",
    preferred_label_ko: "로봇 제어 이론",
    domain: "industrial-robot-control",
    related_skills: [
      {
        target: "RSF-IRC-001",
        type: "co_required",
        source: "heuristic",
      },
    ],
  },
  {
    skill_id: "RSF-MVS-001",
    preferred_label_ko: "머신비전 기초",
    domain: "machine-vision-sensor",
    related_skills: [],
  },
];

const organization = {
  organization: { id: "robot_solution", name: "로봇솔루션 Task" },
  enablers: [
    {
      id: "enabler_1",
      name: "모듈화 구조",
      skills: [
        {
          skill_id: "RS_010",
          label_ko: "로봇 매개변수 관리",
          ontology_skill_id: "RSF-IRC-002",
          ontology_match_type: "approximate",
        },
        {
          skill_id: "RS_011",
          label_ko: "로봇 제어 알고리즘",
          ontology_skill_id: "RSF-IRC-002",
          ontology_match_type: "exact",
        },
      ],
    },
  ],
};

const queue = buildReviewQueue(ontologySkills, [organization]);
assert.deepStrictEqual(queue.stats, {
  total: 3,
  organizationMappings: 1,
  ontologyRelations: 2,
  statuses: {
    pending: 2,
    approved: 1,
    held: 0,
    rejected: 0,
  },
});
assert.strictEqual(queue.items[0].kind, "organization_mapping");
assert.strictEqual(queue.items[0].priority, "high");
const coRequired = queue.items.find(
  (item) => item.relation_type === "co_required",
);
assert.strictEqual(coRequired.kind, "ontology_relation");
assert.strictEqual(coRequired.priority, "normal");
assert.ok(
  coRequired.id.includes("RSF-IRC-001") &&
    coRequired.id.includes("RSF-IRC-002"),
  "대칭 관계는 안정적인 하나의 ID로 접혀야 합니다.",
);

console.log("리뷰 큐 테스트 통과: 근사 매핑 우선순위와 대칭 관계 중복 제거");
