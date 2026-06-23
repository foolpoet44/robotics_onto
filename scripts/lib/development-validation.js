const STAGE_STATUSES = new Set(["pending", "in_progress", "completed", "held"]);
const IMPACT_STATUSES = new Set(["draft", "approved", "delivered"]);

function validateDevelopmentData(
  track,
  candidates,
  ontologySkills,
  domainKeys,
) {
  const errors = [];
  const warnings = [];
  const ontologySkillIds = new Set(
    ontologySkills.map((skill) => skill.skill_id),
  );
  const validDomainKeys = new Set(domainKeys);
  const stagesById = new Map();
  const orders = new Set();

  for (const stage of track.stages ?? []) {
    if (stagesById.has(stage.id)) {
      errors.push(`중복 육성 단계 ID: ${stage.id}`);
    }
    stagesById.set(stage.id, stage);
    if (orders.has(stage.order)) {
      errors.push(`중복 육성 단계 순서: ${stage.order}`);
    }
    orders.add(stage.order);
    validateSkillReferences(
      errors,
      ontologySkillIds,
      stage.required_skill_ids,
      `${stage.id} 단계`,
    );
  }

  const sortedStages = [...stagesById.values()].sort(
    (a, b) => a.order - b.order,
  );
  for (let index = 1; index < sortedStages.length; index += 1) {
    if (
      sortedStages[index].target_headcount >
      sortedStages[index - 1].target_headcount
    ) {
      errors.push(
        `${sortedStages[index].id}: 뒤 단계 목표 인원이 앞 단계보다 많습니다.`,
      );
    }
  }

  const areasById = new Map();
  for (const area of track.expert_area_profiles ?? []) {
    if (areasById.has(area.id)) {
      errors.push(`중복 전문 영역 ID: ${area.id}`);
    }
    areasById.set(area.id, area);
    for (const domainKey of area.domain_keys ?? []) {
      if (!validDomainKeys.has(domainKey)) {
        errors.push(`${area.id}: 존재하지 않는 도메인 ${domainKey}`);
      }
    }
    validateSkillReferences(
      errors,
      ontologySkillIds,
      area.core_skill_ids,
      `${area.id} 전문 영역`,
    );
  }

  const axesById = new Map();
  for (const axis of track.competency_axes ?? []) {
    if (axesById.has(axis.id)) {
      errors.push(`중복 직능 역량 ID: ${axis.id}`);
    }
    axesById.set(axis.id, axis);
    if (!Number.isInteger(axis.scale_max) || axis.scale_max < 1) {
      errors.push(`${axis.id}: scale_max는 1 이상의 정수여야 합니다.`);
    }
  }

  const candidateIds = new Set();
  for (const candidate of candidates ?? []) {
    if (candidateIds.has(candidate.candidate_id)) {
      errors.push(`중복 후보자 ID: ${candidate.candidate_id}`);
    }
    candidateIds.add(candidate.candidate_id);

    if (candidate.track_id !== track.id) {
      errors.push(`${candidate.candidate_id}: 트랙 ID가 일치하지 않습니다.`);
    }
    if (!areasById.has(candidate.expert_area_profile_id)) {
      errors.push(`${candidate.candidate_id}: 존재하지 않는 전문 영역`);
    }
    const currentStage = stagesById.get(candidate.current_stage_id);
    if (!currentStage) {
      errors.push(`${candidate.candidate_id}: 존재하지 않는 현재 단계`);
      continue;
    }

    validateStageHistory(errors, candidate, stagesById, currentStage.order);
    validateSkillAssessments(errors, candidate, ontologySkillIds);
    validateCompetencyAssessments(errors, candidate, axesById);
    validateImpactProposal(errors, candidate);
  }

  if ((track.competency_axes ?? []).length !== 5) {
    warnings.push("이미지 기준 직능 역량 축은 5개를 권장합니다.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      stages: stagesById.size,
      expertAreas: areasById.size,
      competencyAxes: axesById.size,
      candidates: candidateIds.size,
    },
  };
}

function validateSkillReferences(errors, ontologySkillIds, skillIds, owner) {
  for (const skillId of skillIds ?? []) {
    if (!ontologySkillIds.has(skillId)) {
      errors.push(`${owner}: 존재하지 않는 기준 스킬 ${skillId}`);
    }
  }
}

function validateStageHistory(errors, candidate, stagesById, currentOrder) {
  const historyByStage = new Map();
  for (const history of candidate.stage_history ?? []) {
    const stage = stagesById.get(history.stage_id);
    if (!stage) {
      errors.push(
        `${candidate.candidate_id}: 이력에 존재하지 않는 단계 ${history.stage_id}`,
      );
      continue;
    }
    if (!STAGE_STATUSES.has(history.status)) {
      errors.push(
        `${candidate.candidate_id}: 유효하지 않은 단계 상태 ${history.status}`,
      );
    }
    if (historyByStage.has(history.stage_id)) {
      errors.push(
        `${candidate.candidate_id}: 중복 단계 이력 ${history.stage_id}`,
      );
    }
    historyByStage.set(history.stage_id, history);
    if (stage.order > currentOrder && history.status === "completed") {
      errors.push(
        `${candidate.candidate_id}: 현재 단계보다 뒤 단계가 완료 처리되었습니다.`,
      );
    }
  }

  if (!historyByStage.has(candidate.current_stage_id)) {
    errors.push(`${candidate.candidate_id}: 현재 단계 이력이 없습니다.`);
  }
}

function validateSkillAssessments(errors, candidate, ontologySkillIds) {
  for (const assessment of candidate.skill_assessments ?? []) {
    if (!ontologySkillIds.has(assessment.skill_id)) {
      errors.push(
        `${candidate.candidate_id}: 존재하지 않는 평가 스킬 ${assessment.skill_id}`,
      );
    }
    for (const level of [assessment.current_level, assessment.target_level]) {
      if (!Number.isInteger(level) || level < 1 || level > 4) {
        errors.push(
          `${candidate.candidate_id}: 스킬 숙련도는 1~4 범위여야 합니다.`,
        );
      }
    }
  }
}

function validateCompetencyAssessments(errors, candidate, axesById) {
  for (const assessment of candidate.competency_assessments ?? []) {
    const axis = axesById.get(assessment.axis_id);
    if (!axis) {
      errors.push(
        `${candidate.candidate_id}: 존재하지 않는 직능 역량 ${assessment.axis_id}`,
      );
      continue;
    }
    if (
      typeof assessment.score !== "number" ||
      assessment.score < 0 ||
      assessment.score > axis.scale_max
    ) {
      errors.push(
        `${candidate.candidate_id}: ${assessment.axis_id} 점수 범위 위반`,
      );
    }
  }
}

function validateImpactProposal(errors, candidate) {
  if (!candidate.impact_proposal) return;
  const proposal = candidate.impact_proposal;
  if (!proposal.title || !proposal.problem || !proposal.expected_impact) {
    errors.push(`${candidate.candidate_id}: 현장 임팩트 과제 필수 설명 누락`);
  }
  if (!IMPACT_STATUSES.has(proposal.status)) {
    errors.push(
      `${candidate.candidate_id}: 유효하지 않은 현장 임팩트 과제 상태`,
    );
  }
}

module.exports = { validateDevelopmentData };
