const assert = require("assert");
const {
  buildSkillReferences,
  findSkillById,
} = require("./lib/skill-detail");

const skills = [
  {
    skill_id: "RSF-IRC-001",
    preferred_label_ko: "로봇 구조 및 운동학",
    domain: "industrial-robot-control",
  },
  {
    skill_id: "RSF-MVS-001",
    preferred_label_ko: "디지털 이미지 처리",
    domain: "machine-vision-sensor",
  },
];

assert.strictEqual(findSkillById(skills, "RSF-IRC-001"), skills[0]);
assert.strictEqual(findSkillById(skills, "RSF-IRC-999"), undefined);
assert.deepStrictEqual(buildSkillReferences(skills), {
  "RSF-IRC-001": {
    skill_id: "RSF-IRC-001",
    label_ko: "로봇 구조 및 운동학",
    domain: "industrial-robot-control",
  },
  "RSF-MVS-001": {
    skill_id: "RSF-MVS-001",
    label_ko: "디지털 이미지 처리",
    domain: "machine-vision-sensor",
  },
});

console.log("스킬 상세 조회 테스트 통과: ID 조회와 참조 사전");
