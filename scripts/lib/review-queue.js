const SYMMETRIC_RELATION_TYPES = new Set(["co_required", "cross_domain"]);
const PRIORITY_ORDER = { high: 0, normal: 1 };
const KIND_ORDER = { organization_mapping: 0, ontology_relation: 1 };
const { mergeReviewDecisions } = require("./review-decisions");

function getSkillReference(skillsById, skillId) {
  const skill = skillsById.get(skillId);
  return {
    skill_id: skillId,
    label_ko: skill?.preferred_label_ko ?? skillId,
    domain: skill?.domain ?? "",
  };
}

function getRelationKey(sourceId, targetId, relationType) {
  const skillIds = SYMMETRIC_RELATION_TYPES.has(relationType)
    ? [sourceId, targetId].sort()
    : [sourceId, targetId];
  return `${relationType}:${skillIds.join(":")}`;
}

function buildOrganizationMappingItems(organizations, skillsById) {
  return organizations.flatMap((organization) =>
    (organization.enablers ?? []).flatMap((enabler) =>
      (enabler.skills ?? [])
        .filter((skill) => skill.ontology_match_type === "approximate")
        .map((skill) => ({
          id: `organization_mapping:${organization.organization.id}:${skill.skill_id}`,
          kind: "organization_mapping",
          priority: "high",
          status:
            skill.ontology_review_status === "approved"
              ? "approved"
              : "pending",
          organization_id: organization.organization.id,
          organization_name: organization.organization.name,
          enabler_name: enabler.name,
          organization_skill: {
            skill_id: skill.skill_id,
            label_ko: skill.label_ko,
          },
          ontology_skill: getSkillReference(
            skillsById,
            skill.ontology_skill_id,
          ),
        })),
    ),
  );
}

function buildOntologyRelationItems(ontologySkills, skillsById) {
  const seen = new Set();
  const items = [];

  ontologySkills.forEach((skill) => {
    (skill.related_skills ?? []).forEach((relation) => {
      if (!["heuristic", "reviewed"].includes(relation.source)) return;

      const key = getRelationKey(skill.skill_id, relation.target, relation.type);
      if (seen.has(key)) return;
      seen.add(key);

      items.push({
        id: `ontology_relation:${key}`,
        kind: "ontology_relation",
        priority: relation.type === "cross_domain" ? "high" : "normal",
        status: relation.source === "reviewed" ? "approved" : "pending",
        relation_type: relation.type,
        source_skill: getSkillReference(skillsById, skill.skill_id),
        target_skill: getSkillReference(skillsById, relation.target),
      });
    });
  });

  return items;
}

function buildReviewQueue(
  ontologySkills,
  organizations,
  reviewDecisions = { decisions: [] },
) {
  const skillsById = new Map(
    ontologySkills.map((skill) => [skill.skill_id, skill]),
  );
  const organizationItems = buildOrganizationMappingItems(
    organizations,
    skillsById,
  );
  const relationItems = buildOntologyRelationItems(ontologySkills, skillsById);
  const items = [...organizationItems, ...relationItems].sort(
    (a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.id.localeCompare(b.id),
  );

  return mergeReviewDecisions({
    stats: {
      total: items.length,
      organizationMappings: organizationItems.length,
      ontologyRelations: relationItems.length,
    },
    items,
  }, reviewDecisions);
}

module.exports = { buildReviewQueue };
