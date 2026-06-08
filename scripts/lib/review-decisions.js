const ALLOWED_STATUSES = new Set(["approved", "held", "rejected"]);
const SYMMETRIC_RELATION_TYPES = new Set(["co_required", "cross_domain"]);

function validateReviewDecisions(queue, reviewDecisions) {
  const errors = [];
  const queueIds = new Set(queue.items.map((item) => item.id));
  const decisionIds = new Set();

  for (const decision of reviewDecisions.decisions ?? []) {
    if (decisionIds.has(decision.item_id)) {
      errors.push(`중복 리뷰 결정: ${decision.item_id}`);
    }
    decisionIds.add(decision.item_id);

    if (!queueIds.has(decision.item_id)) {
      errors.push(`리뷰 큐에 없는 항목: ${decision.item_id}`);
    }
    if (!ALLOWED_STATUSES.has(decision.status)) {
      errors.push(`${decision.item_id}: 허용되지 않은 상태 '${decision.status}'`);
    }
    if (!decision.reviewer?.trim()) {
      errors.push(`${decision.item_id}: reviewer가 필요합니다.`);
    }
    if (Number.isNaN(Date.parse(decision.reviewed_at))) {
      errors.push(`${decision.item_id}: 유효한 reviewed_at이 필요합니다.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function mergeReviewDecisions(queue, reviewDecisions) {
  const decisionsById = new Map(
    (reviewDecisions.decisions ?? []).map((decision) => [
      decision.item_id,
      decision,
    ]),
  );
  const statuses = { pending: 0, approved: 0, held: 0, rejected: 0 };
  const items = queue.items.map((item) => {
    const decision = decisionsById.get(item.id);
    const merged = decision
      ? { ...item, status: decision.status, decision }
      : item;
    statuses[merged.status] += 1;
    return merged;
  });

  return { ...queue, stats: { ...queue.stats, statuses }, items };
}

function upsertReviewDecision(reviewDecisions, decision) {
  const decisions = [...(reviewDecisions.decisions ?? [])];
  const index = decisions.findIndex(
    (candidate) => candidate.item_id === decision.item_id,
  );
  if (index === -1) {
    decisions.push(decision);
  } else {
    decisions[index] = decision;
  }
  return { decisions };
}

function promoteRelation(item, skillsById) {
  const promote = (sourceId, targetId) => {
    const relation = skillsById
      .get(sourceId)
      ?.related_skills.find(
        (candidate) =>
          candidate.target === targetId && candidate.type === item.relation_type,
      );
    if (!relation || relation.source === "reviewed") return 0;
    relation.source = "reviewed";
    return 1;
  };

  let promoted = promote(item.source_skill.skill_id, item.target_skill.skill_id);
  if (SYMMETRIC_RELATION_TYPES.has(item.relation_type)) {
    promoted += promote(item.target_skill.skill_id, item.source_skill.skill_id);
  }
  return promoted;
}

function promoteOrganizationMapping(item, organizations) {
  const organization = organizations.find(
    (candidate) => candidate.organization.id === item.organization_id,
  );
  const skill = organization?.enablers
    .flatMap((enabler) => enabler.skills)
    .find((candidate) => candidate.skill_id === item.organization_skill.skill_id);
  if (!skill || skill.ontology_review_status === "approved") return 0;
  skill.ontology_review_status = "approved";
  return 1;
}

function applyApprovedDecisions(
  ontologySkills,
  organizations,
  queue,
  reviewDecisions,
) {
  const queueById = new Map(queue.items.map((item) => [item.id, item]));
  const skillsById = new Map(
    ontologySkills.map((skill) => [skill.skill_id, skill]),
  );
  const metrics = { relationsPromoted: 0, organizationMappingsPromoted: 0 };

  for (const decision of reviewDecisions.decisions ?? []) {
    if (decision.status !== "approved") continue;
    const item = queueById.get(decision.item_id);
    if (!item) continue;

    if (item.kind === "ontology_relation") {
      metrics.relationsPromoted += promoteRelation(item, skillsById);
    } else {
      metrics.organizationMappingsPromoted += promoteOrganizationMapping(
        item,
        organizations,
      );
    }
  }

  return { metrics };
}

module.exports = {
  applyApprovedDecisions,
  mergeReviewDecisions,
  upsertReviewDecision,
  validateReviewDecisions,
};
