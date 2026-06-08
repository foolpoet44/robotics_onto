const ALLOWED_RELATION_TYPES = new Set([
  "prerequisite",
  "co_required",
  "specialization",
  "cross_domain",
]);
const ALLOWED_SKILL_TYPES = new Set(["knowledge", "skill", "competence"]);
const ALLOWED_ROLES = new Set(["operator", "engineer", "developer"]);
const ALLOWED_PROFICIENCY_LEVELS = new Set([1, 2, 3, 4]);
const ALLOWED_RELATION_SOURCES = new Set(["heuristic", "reviewed"]);

function getRelationTarget(relation) {
  return typeof relation === "string" ? relation : relation?.target;
}

function getRelationType(relation) {
  return typeof relation === "string" ? null : relation?.type;
}

function findParentCycles(skillsById) {
  const cycles = [];
  const completed = new Set();

  for (const skillId of skillsById.keys()) {
    if (completed.has(skillId)) continue;

    const path = [];
    const pathIndexes = new Map();
    let currentId = skillId;

    while (currentId && skillsById.has(currentId)) {
      if (pathIndexes.has(currentId)) {
        cycles.push([...path.slice(pathIndexes.get(currentId)), currentId]);
        break;
      }
      if (completed.has(currentId)) break;

      pathIndexes.set(currentId, path.length);
      path.push(currentId);
      currentId = skillsById.get(currentId).parent_skill_id;
    }

    path.forEach((id) => completed.add(id));
  }

  return cycles;
}

function validateOntologySemantics(skills) {
  const errors = [];
  const warnings = [];
  const skillsById = new Map(skills.map((skill) => [skill.skill_id, skill]));
  let edgeCount = 0;

  for (const skill of skills) {
    const relations = Array.isArray(skill.related_skills)
      ? skill.related_skills
      : [];
    edgeCount += relations.length;

    if (!ALLOWED_SKILL_TYPES.has(skill.skill_type)) {
      errors.push(
        `${skill.skill_id}: 허용되지 않은 skill_type '${skill.skill_type}'`,
      );
    }
    if (!ALLOWED_PROFICIENCY_LEVELS.has(skill.proficiency_level)) {
      errors.push(
        `${skill.skill_id}: 허용되지 않은 proficiency_level '${skill.proficiency_level}'`,
      );
    }
    if (!Array.isArray(skill.role_mapping) || skill.role_mapping.length === 0) {
      errors.push(`${skill.skill_id}: role_mapping이 비어 있습니다.`);
    } else {
      skill.role_mapping.forEach((role) => {
        if (!ALLOWED_ROLES.has(role)) {
          errors.push(`${skill.skill_id}: 허용되지 않은 role_mapping '${role}'`);
        }
      });
    }

    if (skill.parent_skill_id && !skillsById.has(skill.parent_skill_id)) {
      errors.push(
        `${skill.skill_id}: 존재하지 않는 parent_skill_id '${skill.parent_skill_id}'`,
      );
    }

    if (
      skill.esco_uri &&
      skill.esco_uri.includes("data.europa.eu/esco") &&
      skill.esco_uri.includes("rsf-")
    ) {
      errors.push(`${skill.skill_id}: 가짜 ESCO URI '${skill.esco_uri}'`);
    }
    if (!skill.internal_uri && !skill.esco_uri) {
      errors.push(`${skill.skill_id}: internal_uri 또는 esco_uri가 필요합니다.`);
    }
    if (skill.internal_uri && !skill.internal_uri.startsWith("urn:rsf:skill:")) {
      errors.push(`${skill.skill_id}: 잘못된 internal_uri '${skill.internal_uri}'`);
    }

    relations.forEach((relation) => {
      const target = getRelationTarget(relation);
      if (!target || !skillsById.has(target)) {
        errors.push(
          `${skill.skill_id}: 존재하지 않는 related_skills 참조 '${target}'`,
        );
      }

      const type = getRelationType(relation);
      if (type && !ALLOWED_RELATION_TYPES.has(type)) {
        errors.push(`${skill.skill_id}: 허용되지 않은 관계 유형 '${type}'`);
      }
      if (relation.source && !ALLOWED_RELATION_SOURCES.has(relation.source)) {
        errors.push(
          `${skill.skill_id}: 허용되지 않은 관계 출처 '${relation.source}'`,
        );
      }
      if (type === "co_required" || type === "cross_domain") {
        const reverseRelations = skillsById.get(target)?.related_skills ?? [];
        const hasReverse = reverseRelations.some(
          (reverseRelation) =>
            getRelationTarget(reverseRelation) === skill.skill_id &&
            getRelationType(reverseRelation) === type,
        );
        if (!hasReverse) {
          warnings.push(
            `${skill.skill_id} -> ${target}: 대칭 관계 '${type}'의 역방향 누락`,
          );
        }
      }
    });
  }

  const isolatedCount = skills.filter(
    (skill) =>
      !Array.isArray(skill.related_skills) || skill.related_skills.length === 0,
  ).length;
  const averageEdges = skills.length === 0 ? 0 : edgeCount / skills.length;
  const overConnected = skills.filter(
    (skill) =>
      Array.isArray(skill.related_skills) && skill.related_skills.length > 8,
  );

  if (isolatedCount > 0) {
    errors.push(`고립 노드 ${isolatedCount}개: related_skills가 비어 있습니다.`);
  }
  if (averageEdges < 2) {
    errors.push(`평균 관계 ${averageEdges.toFixed(2)}개: 최소 기준 2개 미달`);
  }
  if (overConnected.length > 0) {
    errors.push(`과연결 노드 ${overConnected.length}개: 관계 상한 8개 초과`);
  }

  findParentCycles(skillsById).forEach((cycle) => {
    errors.push(`부모 관계 순환: ${cycle.join(" -> ")}`);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      skills: skills.length,
      edges: edgeCount,
      averageEdges,
      isolated: isolatedCount,
    },
  };
}

module.exports = {
  getRelationTarget,
  validateOntologySemantics,
};
