const ESCO_SKILL_URI =
  /^https?:\/\/data\.europa\.eu\/esco\/skill\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTERNAL_URI = /^urn:rsf:org-skill:rs_\d{3}$/;
const ONTOLOGY_MATCH_TYPES = new Set(["exact", "approximate", "none"]);

function validateOrganizationMapping(organization, ontologySkills) {
  const errors = [];
  const warnings = [];
  const ontologySkillIds = new Set(
    ontologySkills.map((skill) => skill.skill_id),
  );
  const organizationSkillIds = new Set();
  let skills = 0;
  let mapped = 0;

  for (const enabler of organization.enablers ?? []) {
    for (const skill of enabler.skills ?? []) {
      skills += 1;

      if (organizationSkillIds.has(skill.skill_id)) {
        errors.push(`중복 조직 스킬 ID: ${skill.skill_id}`);
      }
      organizationSkillIds.add(skill.skill_id);

      if (!INTERNAL_URI.test(skill.internal_uri ?? "")) {
        errors.push(`${skill.skill_id}: 유효하지 않은 internal_uri`);
      }

      if (skill.esco_uri && !ESCO_SKILL_URI.test(skill.esco_uri)) {
        errors.push(`${skill.skill_id}: 검증되지 않은 ESCO URI`);
      }

      if (
        !Object.hasOwn(skill, "ontology_skill_id") ||
        skill.ontology_skill_id === undefined
      ) {
        errors.push(`${skill.skill_id}: ontology_skill_id 필드 누락`);
        continue;
      }

      if (!ONTOLOGY_MATCH_TYPES.has(skill.ontology_match_type)) {
        errors.push(`${skill.skill_id}: 유효하지 않은 ontology_match_type`);
      }
      if (
        skill.ontology_review_status &&
        skill.ontology_review_status !== "approved"
      ) {
        errors.push(`${skill.skill_id}: 유효하지 않은 ontology_review_status`);
      }

      if (skill.ontology_skill_id === null) {
        if (skill.ontology_match_type !== "none") {
          errors.push(
            `${skill.skill_id}: ontology_skill_id가 null이면 ontology_match_type은 none이어야 합니다.`,
          );
        }
        continue;
      }

      mapped += 1;
      if (skill.ontology_match_type === "none") {
        errors.push(
          `${skill.skill_id}: 매핑된 스킬의 ontology_match_type은 none일 수 없습니다.`,
        );
      }
      if (!ontologySkillIds.has(skill.ontology_skill_id)) {
        errors.push(
          `${skill.skill_id}: 존재하지 않는 기준 스킬 ${skill.ontology_skill_id}`,
        );
      }
    }
  }

  const unmapped = skills - mapped;
  if (unmapped > 0) {
    warnings.push(`미매핑 조직 역량: ${unmapped}개`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      skills,
      mapped,
      unmapped,
      coverage: skills === 0 ? 0 : Number(((mapped / skills) * 100).toFixed(1)),
    },
  };
}

module.exports = { validateOrganizationMapping };
