const assert = require("assert");
const { validateDevelopmentData } = require("./lib/development-validation");

const ontologySkills = [
  { skill_id: "RSF-IRC-001" },
  { skill_id: "RSF-MVS-001" },
];
const domainKeys = ["industrial-robot-control", "machine-vision-sensor"];

function makeTrack(overrides = {}) {
  return {
    id: "test-track",
    expert_area_profiles: [
      {
        id: "control",
        domain_keys: ["industrial-robot-control"],
        core_skill_ids: ["RSF-IRC-001"],
      },
    ],
    competency_axes: [
      { id: "problem", scale_max: 5 },
      { id: "design", scale_max: 5 },
      { id: "delivery", scale_max: 5 },
      { id: "validation", scale_max: 5 },
      { id: "leadership", scale_max: 5 },
    ],
    stages: [
      { id: "potential_pool", order: 0, target_headcount: 100, required_skill_ids: [] },
      { id: "early_selection", order: 1, target_headcount: 50, required_skill_ids: [] },
    ],
    ...overrides,
  };
}

function makeCandidate(overrides = {}) {
  return {
    candidate_id: "CAND-001",
    track_id: "test-track",
    expert_area_profile_id: "control",
    current_stage_id: "early_selection",
    stage_history: [
      { stage_id: "potential_pool", status: "completed" },
      { stage_id: "early_selection", status: "in_progress" },
    ],
    skill_assessments: [
      { skill_id: "RSF-IRC-001", current_level: 2, target_level: 3 },
    ],
    competency_assessments: [{ axis_id: "problem", score: 3 }],
    ...overrides,
  };
}

function expectError(name, track, candidates, expectedText) {
  const result = validateDevelopmentData(track, candidates, ontologySkills, domainKeys);
  assert.strictEqual(result.valid, false, `${name}: 오류가 감지되어야 합니다.`);
  assert.ok(
    result.errors.some((error) => error.includes(expectedText)),
    `${name}: "${expectedText}" 오류가 필요합니다.\n${result.errors.join("\n")}`,
  );
}

assert.strictEqual(
  validateDevelopmentData(makeTrack(), [makeCandidate()], ontologySkills, domainKeys).valid,
  true,
);
expectError(
  "존재하지 않는 도메인",
  makeTrack({
    expert_area_profiles: [{ id: "control", domain_keys: ["missing"], core_skill_ids: [] }],
  }),
  [makeCandidate()],
  "존재하지 않는 도메인",
);
expectError(
  "존재하지 않는 핵심 스킬",
  makeTrack({
    expert_area_profiles: [{ id: "control", domain_keys: [], core_skill_ids: ["RSF-XXX-999"] }],
  }),
  [makeCandidate()],
  "존재하지 않는 기준 스킬",
);
expectError(
  "단계 순서 중복",
  makeTrack({
    stages: [
      { id: "potential_pool", order: 0, target_headcount: 100, required_skill_ids: [] },
      { id: "early_selection", order: 0, target_headcount: 50, required_skill_ids: [] },
    ],
  }),
  [makeCandidate()],
  "중복 육성 단계 순서",
);
expectError(
  "목표 인원 역전",
  makeTrack({
    stages: [
      { id: "potential_pool", order: 0, target_headcount: 50, required_skill_ids: [] },
      { id: "early_selection", order: 1, target_headcount: 60, required_skill_ids: [] },
    ],
  }),
  [makeCandidate()],
  "뒤 단계 목표 인원",
);
expectError(
  "존재하지 않는 현재 단계",
  makeTrack(),
  [makeCandidate({ current_stage_id: "missing" })],
  "존재하지 않는 현재 단계",
);
expectError(
  "존재하지 않는 전문 영역",
  makeTrack(),
  [makeCandidate({ expert_area_profile_id: "missing" })],
  "존재하지 않는 전문 영역",
);
expectError(
  "직능 점수 범위 위반",
  makeTrack(),
  [makeCandidate({ competency_assessments: [{ axis_id: "problem", score: 6 }] })],
  "점수 범위 위반",
);
expectError(
  "현장 과제 설명 누락",
  makeTrack(),
  [makeCandidate({ impact_proposal: { title: "", problem: "", expected_impact: "", status: "draft" } })],
  "필수 설명 누락",
);
expectError(
  "미래 단계 완료",
  makeTrack({
    stages: [
      { id: "potential_pool", order: 0, target_headcount: 100, required_skill_ids: [] },
      { id: "early_selection", order: 1, target_headcount: 50, required_skill_ids: [] },
      { id: "integrated_bootcamp", order: 2, target_headcount: 40, required_skill_ids: [] },
    ],
  }),
  [
    makeCandidate({
      stage_history: [
        { stage_id: "early_selection", status: "in_progress" },
        { stage_id: "integrated_bootcamp", status: "completed" },
      ],
    }),
  ],
  "현재 단계보다 뒤 단계",
);

console.log("육성 데이터 검증 테스트 통과: 정상 1개, 음성 9개 시나리오");
