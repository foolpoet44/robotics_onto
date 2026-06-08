function findSkillById(skills, skillId) {
  return skills.find((skill) => skill.skill_id === skillId);
}

function buildSkillReferences(skills) {
  return Object.fromEntries(
    skills.map((skill) => [
      skill.skill_id,
      {
        skill_id: skill.skill_id,
        label_ko: skill.preferred_label_ko,
        domain: skill.domain,
      },
    ]),
  );
}

module.exports = { buildSkillReferences, findSkillById };
