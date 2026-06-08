const STAGE_STATUSES = new Set(["pending", "in_progress", "completed", "held"]);
const IMPACT_STATUSES = new Set(["draft", "approved", "delivered"]);

function updateDevelopmentCandidate(candidates, options) {
  const nextCandidates = structuredClone(candidates);
  const candidate = nextCandidates.find(
    (item) => item.candidate_id === options.candidateId,
  );
  if (!candidate) {
    throw new Error(`후보자를 찾을 수 없습니다: ${options.candidateId}`);
  }

  if (options.stageId || options.stageStatus) {
    updateStage(candidate, options);
  }
  if (options.axisId || options.axisScore !== undefined) {
    updateCompetency(candidate, options);
  }
  if (options.impactStatus) {
    updateImpactProposal(candidate, options.impactStatus);
  }
  return nextCandidates;
}

function updateStage(candidate, options) {
  if (!options.stageId || !options.stageStatus) {
    throw new Error("단계 갱신에는 --stage와 --status가 모두 필요합니다.");
  }
  if (!STAGE_STATUSES.has(options.stageStatus)) {
    throw new Error(`유효하지 않은 단계 상태: ${options.stageStatus}`);
  }

  const history = candidate.stage_history.find(
    (item) => item.stage_id === options.stageId,
  );
  const nextHistory = {
    stage_id: options.stageId,
    status: options.stageStatus,
    assessed_at: new Date().toISOString(),
    ...(options.reviewer ? { reviewer: options.reviewer } : {}),
    ...(options.notes ? { notes: options.notes } : {}),
  };
  if (history) {
    Object.assign(history, nextHistory);
  } else {
    candidate.stage_history.push(nextHistory);
  }
  candidate.current_stage_id = options.stageId;
}

function updateCompetency(candidate, options) {
  if (!options.axisId || options.axisScore === undefined) {
    throw new Error("역량 갱신에는 --axis와 --score가 모두 필요합니다.");
  }
  const assessment = candidate.competency_assessments.find(
    (item) => item.axis_id === options.axisId,
  );
  if (assessment) {
    assessment.score = options.axisScore;
  } else {
    candidate.competency_assessments.push({
      axis_id: options.axisId,
      score: options.axisScore,
    });
  }
}

function updateImpactProposal(candidate, impactStatus) {
  if (!IMPACT_STATUSES.has(impactStatus)) {
    throw new Error(`유효하지 않은 현장 과제 상태: ${impactStatus}`);
  }
  if (!candidate.impact_proposal) {
    throw new Error("등록된 현장 임팩트 과제가 없습니다.");
  }
  candidate.impact_proposal.status = impactStatus;
}

module.exports = { updateDevelopmentCandidate };
