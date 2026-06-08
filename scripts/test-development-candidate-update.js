const assert = require("assert");
const {
  updateDevelopmentCandidate,
} = require("./lib/development-candidate-update");

const candidates = [
  {
    candidate_id: "CAND-001",
    current_stage_id: "early_selection",
    stage_history: [{ stage_id: "early_selection", status: "in_progress" }],
    competency_assessments: [{ axis_id: "problem-framing", score: 2 }],
    impact_proposal: {
      title: "테스트 과제",
      problem: "문제",
      expected_impact: "효과",
      status: "draft",
    },
  },
];

const stageUpdated = updateDevelopmentCandidate(candidates, {
  candidateId: "CAND-001",
  stageId: "integrated_bootcamp",
  stageStatus: "in_progress",
  reviewer: "육성위원회",
});
assert.strictEqual(stageUpdated[0].current_stage_id, "integrated_bootcamp");
assert.strictEqual(stageUpdated[0].stage_history[1].reviewer, "육성위원회");
assert.strictEqual(candidates[0].current_stage_id, "early_selection");

const competencyUpdated = updateDevelopmentCandidate(candidates, {
  candidateId: "CAND-001",
  axisId: "problem-framing",
  axisScore: 4,
});
assert.strictEqual(competencyUpdated[0].competency_assessments[0].score, 4);

const impactUpdated = updateDevelopmentCandidate(candidates, {
  candidateId: "CAND-001",
  impactStatus: "approved",
});
assert.strictEqual(impactUpdated[0].impact_proposal.status, "approved");

assert.throws(
  () => updateDevelopmentCandidate(candidates, { candidateId: "MISSING" }),
  /후보자를 찾을 수 없습니다/,
);
assert.throws(
  () =>
    updateDevelopmentCandidate(candidates, {
      candidateId: "CAND-001",
      stageId: "pair_embed",
    }),
  /--stage와 --status/,
);

console.log("육성 기록 갱신 테스트 통과: 단계, 직능 역량, 현장 과제 상태");
